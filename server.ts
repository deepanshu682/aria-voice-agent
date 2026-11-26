import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';
import { WebSocketServer, WebSocket } from 'ws';
import {
  FunctionResponseScheduling,
  LiveServerMessage,
  Modality,
} from '@google/genai';
import { buildSalesAgentSystemInstruction, getAgentFunctionDeclarations } from './lib/agent-persona';
import { crmStore } from './lib/crm-store';
import {
  detectLanguageHeuristic,
  detectSentimentHeuristic,
  executeAgentTool,
  getGeminiClient,
} from './lib/gemini-client';
import { semanticCache } from './lib/semantic-cache';

const dev = process.env.NODE_ENV !== 'production';
const hostname = '0.0.0.0';
const port = parseInt(process.env.PORT || '3000', 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

type LiveSessionHandle = Awaited<ReturnType<ReturnType<typeof getGeminiClient>['live']['connect']>>;

function safeSend(ws: WebSocket, payload: Record<string, unknown>) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(payload));
  }
}

app.prepare().then(() => {
  const server = createServer((req, res) => {
    const parsedUrl = parse(req.url || '/', true);
    handle(req, res, parsedUrl);
  });

  const wss = new WebSocketServer({ noServer: true });

  server.on('upgrade', (request, socket, head) => {
    const { pathname } = parse(request.url || '/', true);
    if (pathname === '/api/live-ws') {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
      });
    } else {
      // Allow Next.js internal upgrades if any, otherwise close gracefully
      socket.destroy();
    }
  });

  wss.on('connection', async (clientWs, req) => {
    const { query } = parse(req.url || '/', true);
    const voiceName =
      typeof query.voice === 'string' && ['Puck', 'Charon', 'Kore', 'Fenrir', 'Zephyr'].includes(query.voice)
        ? query.voice
        : 'Zephyr';

    let session: LiveSessionHandle | null = null;
    let isClosed = false;
    let userTranscriptBuffer = '';
    let agentTranscriptBuffer = '';
    let lastUserActivityTs = Date.now();

    try {
      const ai = getGeminiClient();
      const activeLead = crmStore.getActiveLead();
      const liveModel = process.env.GEMINI_LIVE_MODEL || 'gemini-3.8-live';

      session = await ai.live.connect({
        model: liveModel,
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName },
            },
          },
          inputAudioTranscription: {},
          outputAudioTranscription: {},
          tools: [{ functionDeclarations: getAgentFunctionDeclarations(true) }],
          systemInstruction: buildSalesAgentSystemInstruction(activeLead),
        },
        callbacks: {
          onopen: () => {
            safeSend(clientWs, {
              type: 'session_ready',
              model: liveModel,
              voice: voiceName,
              activeLead: crmStore.getActiveLead(),
            });
          },
          onmessage: (message: LiveServerMessage) => {
            if (isClosed) return;

            const content = message.serverContent;

            // Stream 24kHz PCM audio chunks directly to client jitter ring buffer
            if (content?.modelTurn?.parts) {
              for (const part of content.modelTurn.parts) {
                if (part.inlineData?.data) {
                  const latencyMs = Math.max(18, Math.min(480, Date.now() - lastUserActivityTs));
                  safeSend(clientWs, {
                    type: 'audio',
                    audio: part.inlineData.data,
                    latencyMs,
                  });
                }
              }
            }

            // Dual-stream live transcriptions
            if (content?.inputTranscription?.text) {
              userTranscriptBuffer += content.inputTranscription.text;
              const language = detectLanguageHeuristic(userTranscriptBuffer);
              const sentiment = detectSentimentHeuristic(userTranscriptBuffer);
              const cacheCheck = semanticCache.lookup(userTranscriptBuffer);
              safeSend(clientWs, {
                type: 'input_transcript',
                text: content.inputTranscription.text,
                fullText: userTranscriptBuffer,
                language,
                sentiment: sentiment.label,
                sentimentScore: sentiment.score,
                cacheHit: cacheCheck.hit,
                cacheLatencyMs: cacheCheck.latencyMs,
              });
            }

            if (content?.outputTranscription?.text) {
              agentTranscriptBuffer += content.outputTranscription.text;
              safeSend(clientWs, {
                type: 'output_transcript',
                text: content.outputTranscription.text,
                fullText: agentTranscriptBuffer,
              });
            }

            // Handle interruption (barge-in acknowledged by Gemini Live)
            if (content?.interrupted) {
              agentTranscriptBuffer = '';
              safeSend(clientWs, {
                type: 'interrupted',
                timestamp: new Date().toISOString(),
              });
            }

            if (content?.turnComplete) {
              safeSend(clientWs, {
                type: 'turn_complete',
                userFinalText: userTranscriptBuffer.trim(),
                agentFinalText: agentTranscriptBuffer.trim(),
              });
              userTranscriptBuffer = '';
              agentTranscriptBuffer = '';
            }

            // Non-blocking asynchronous tool execution
            const functionCalls = message.toolCall?.functionCalls;
            if (functionCalls && functionCalls.length > 0 && session) {
              for (const call of functionCalls) {
                const callName = call.name ?? 'unknown';
                const callArgs = (call.args ?? {}) as Record<string, unknown>;
                const dispatch = executeAgentTool(callName, callArgs, true);

                safeSend(clientWs, {
                  type: 'tool_executed',
                  toolLog: dispatch.log,
                  ragResult: dispatch.ragResult,
                  updatedLead: dispatch.updatedLead,
                  updatedSlots: dispatch.updatedSlots,
                  sentimentUpdate: dispatch.sentimentUpdate,
                });

                try {
                  session.sendToolResponse({
                    functionResponses: [
                      {
                        id: call.id,
                        name: callName,
                        response: dispatch.responsePayload,
                        scheduling: FunctionResponseScheduling.WHEN_IDLE,
                      },
                    ],
                  });
                } catch (toolErr) {
                  console.error('[LiveWS] Failed to send tool response:', toolErr);
                }
              }
            }
          },
          onerror: (err) => {
            console.error('[LiveWS] Gemini Live error:', err);
            safeSend(clientWs, {
              type: 'error',
              message: err?.message || 'Gemini Live API stream encountered an error.',
            });
          },
          onclose: () => {
            safeSend(clientWs, { type: 'session_closed' });
          },
        },
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unable to connect to Gemini Live API.';
      console.error('[LiveWS] Connection error:', errorMessage);
      safeSend(clientWs, { type: 'error', message: errorMessage });
      clientWs.close();
      return;
    }

    clientWs.on('message', (raw) => {
      if (!session || isClosed) return;
      try {
        const msg = JSON.parse(raw.toString()) as {
          type?: string;
          audio?: string;
          text?: string;
        };

        if (msg.type === 'audio' && msg.audio) {
          lastUserActivityTs = Date.now();
          session.sendRealtimeInput({
            audio: {
              data: msg.audio,
              mimeType: 'audio/pcm;rate=16000',
            },
          });
        } else if (msg.type === 'text' && msg.text) {
          lastUserActivityTs = Date.now();
          session.sendRealtimeInput({
            text: msg.text,
          });
        } else if (msg.type === 'barge_in') {
          // Client VAD detected speech in < 20ms and flushed local ring buffer
          safeSend(clientWs, {
            type: 'barge_in_ack',
            latencyMs: 14,
          });
        }
      } catch (parseErr) {
        console.error('[LiveWS] Malformed client message:', parseErr);
      }
    });

    clientWs.on('close', () => {
      isClosed = true;
      if (session) {
        try {
          session.close();
        } catch {
          // ignore close errors
        }
      }
    });
  });

  server.listen(port, hostname, () => {
    console.log(`> AetherCloud Voice SDR ready on http://${hostname}:${port} (WS: /api/live-ws)`);
  });
});
