import { NextRequest, NextResponse } from 'next/server';
import { Content, GenerateContentParameters, ThinkingLevel } from '@google/genai';
import { buildSalesAgentSystemInstruction, getAgentFunctionDeclarations } from '@/lib/agent-persona';
import { crmStore } from '@/lib/crm-store';
import {
  detectLanguageHeuristic,
  detectSentimentHeuristic,
  executeAgentTool,
  getGeminiClient,
} from '@/lib/gemini-client';
import { semanticCache } from '@/lib/semantic-cache';
import { RagSearchResult, ToolExecutionLog } from '@/lib/types';

interface SimulatorTurnRequest {
  utterance: string;
  history?: Array<{ speaker: 'prospect' | 'agent' | 'system'; text: string }>;
  voiceName?: string;
  enableTts?: boolean;
  ragThreshold?: number;
  topK?: number;
}

const PRIMARY_MODEL = process.env.GEMINI_MODEL || 'gemini-4-hydrogen';
const FALLBACK_MODEL = process.env.GEMINI_FALLBACK_MODEL || 'gemini-3.8-flash';
const TTS_MODEL = process.env.GEMINI_TTS_MODEL || 'gemini-3.8-flash-lite-tts';
const CANDIDATE_MODELS = Array.from(new Set([PRIMARY_MODEL, FALLBACK_MODEL, 'gemini-3.1-flash-lite']));

async function generateWithFallback(params: Omit<GenerateContentParameters, 'model'>) {
  const ai = getGeminiClient();
  let lastError: unknown;
  for (const model of CANDIDATE_MODELS) {
    try {
      const config =
        model === 'gemini-4-hydrogen'
          ? params.config
          : {
              ...params.config,
              thinkingConfig: undefined,
            };
      return await ai.models.generateContent({
        ...params,
        model,
        config,
      });
    } catch (err) {
      lastError = err;
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('503') || msg.includes('UNAVAILABLE') || msg.includes('429') || msg.includes('not found')) {
        continue;
      }
      throw err;
    }
  }
  throw lastError;
}

async function synthesizeSpeechWavBase64(
  text: string,
  voiceName: string,
  style: string
): Promise<string | undefined> {
  const ai = getGeminiClient();
  const ttsInteraction = await ai.interactions.create({
    model: TTS_MODEL,
    input: [
      {
        type: 'text',
        text,
        annotations: [
          {
            type: 'speech_metadata',
            style,
          },
        ],
      },
    ],
    response_format: { type: 'audio' },
    generation_config: {
      speech_config: [
        {
          language: 'en-US',
          voice: voiceName,
        },
      ],
    },
  });
  return ttsInteraction.output_audio?.data ?? undefined;
}

export async function POST(req: NextRequest) {
  const turnStart = performance.now();

  try {
    const body = (await req.json()) as SimulatorTurnRequest;
    const utterance = (body.utterance ?? '').trim();
    if (!utterance) {
      return NextResponse.json({ error: 'Prospect utterance is required.' }, { status: 400 });
    }

    const voiceName =
      body.voiceName && ['Puck', 'Charon', 'Kore', 'Fenrir', 'Zephyr'].includes(body.voiceName)
        ? body.voiceName
        : 'Zephyr';
    const enableTts = body.enableTts !== false;
    const ragThreshold = typeof body.ragThreshold === 'number' ? body.ragThreshold : 0.72;
    const topK = typeof body.topK === 'number' ? body.topK : 3;

    const detectedLanguage = detectLanguageHeuristic(utterance);
    const detectedSentiment = detectSentimentHeuristic(utterance);

    // 1. Check L1 Semantic Fast-Path Cache (< 35 ms)
    const cacheLookup = semanticCache.lookup(utterance);
    if (cacheLookup.hit && cacheLookup.entry) {
      let audioWavBase64: string | undefined;
      if (enableTts) {
        try {
          audioWavBase64 = await synthesizeSpeechWavBase64(
            cacheLookup.entry.response,
            voiceName,
            'Warm, confident, natural enterprise SaaS advisor'
          );
        } catch (ttsErr) {
          console.warn('[Simulator] TTS skipped on cache hit:', ttsErr);
        }
      }

      return NextResponse.json({
        agentText: cacheLookup.entry.response,
        language: detectedLanguage,
        sentiment: detectedSentiment.label,
        sentimentScore: detectedSentiment.score,
        latencyMs: cacheLookup.latencyMs,
        cacheHit: true,
        audioWavBase64,
        toolLogs: [],
        ragResult: null,
        activeLead: crmStore.getActiveLead(),
        calendarSlots: crmStore.getCalendarSlots(false),
        semanticCache: semanticCache.getStats(),
      });
    }

    // 2. Full Server-Side Gemini Orchestration with Real Function Calling
    const activeLead = crmStore.getActiveLead();
    const systemInstruction = buildSalesAgentSystemInstruction(activeLead);
    const functionDeclarations = getAgentFunctionDeclarations(false);

    const contents: Content[] = [];
    for (const h of (body.history ?? []).slice(-8)) {
      if (h.speaker === 'prospect' || h.speaker === 'agent') {
        contents.push({
          role: h.speaker === 'prospect' ? 'user' : 'model',
          parts: [{ text: h.text }],
        });
      }
    }
    contents.push({
      role: 'user',
      parts: [{ text: utterance }],
    });

    const toolLogs: ToolExecutionLog[] = [];
    let latestRagResult: RagSearchResult | null = null;
    let finalSentiment = detectedSentiment.label;
    let finalLanguage = detectedLanguage;
    let finalText = '';

    try {
      // Up to 3 tool-call rounds for multi-step flows (e.g. check_calendar -> book -> upsert_crm)
      for (let round = 0; round < 3; round++) {
        const response = await generateWithFallback({
          contents,
          config: {
            systemInstruction,
            thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
            tools: [{ functionDeclarations }],
          },
        });

        const modelContent = response.candidates?.[0]?.content;
        const calls = response.functionCalls;

        if (calls && calls.length > 0 && modelContent) {
          contents.push(modelContent);
          const toolResponseParts = calls.map((call) => {
            const dispatch = executeAgentTool(
              call.name ?? 'unknown',
              call.args as Record<string, unknown> | undefined,
              true,
              { ragThreshold, topK }
            );
            toolLogs.push(dispatch.log);
            if (dispatch.ragResult) {
              latestRagResult = dispatch.ragResult;
            }
            if (dispatch.sentimentUpdate) {
              finalSentiment = dispatch.sentimentUpdate.sentiment;
              finalLanguage = dispatch.sentimentUpdate.language;
            }

            return {
              functionResponse: {
                id: call.id,
                name: call.name ?? 'unknown',
                response: dispatch.responsePayload,
              },
            };
          });

          contents.push({
            role: 'user',
            parts: toolResponseParts,
          });
          continue;
        }

        finalText = (response.text ?? '').trim();
        break;
      }
    } catch {
      // Execute grounded local tool pipeline if all cloud models hit a temporary 503 spike
      const sentDispatch = executeAgentTool(
        'log_turn_sentiment',
        {
          sentiment: detectedSentiment.label,
          language: detectedLanguage,
          reason: 'Detected from live turn utterance',
        },
        true
      );
      toolLogs.push(sentDispatch.log);

      const ragDispatch = executeAgentTool(
        'search_knowledge_base',
        { query: utterance },
        true,
        { ragThreshold, topK }
      );
      toolLogs.push(ragDispatch.log);
      if (ragDispatch.ragResult) {
        latestRagResult = ragDispatch.ragResult;
      }

      if (/\b(book|demo|slot|calendar|schedule|appointment|kal|morning)\b/i.test(utterance)) {
        const calCheck = executeAgentTool('check_calendar_availability', {}, true);
        toolLogs.push(calCheck.log);
        const bookDispatch = executeAgentTool(
          'book_sales_appointment',
          {
            slotId: 'SLOT-01',
            leadName: activeLead.name,
            company: activeLead.company,
            email: activeLead.email,
            agenda: 'AetherCloud Enterprise Architecture & PoV Deep-Dive',
          },
          true
        );
        toolLogs.push(bookDispatch.log);
      }

      if (latestRagResult && !latestRagResult.passedGuardrail) {
        finalText =
          latestRagResult.fallbackMessage ??
          'I do not have a verified specification for that in my knowledge base, so I will escalate this to our Solutions Architect during your technical review.';
      } else if (detectedLanguage === 'hinglish' || detectedLanguage === 'hi') {
        finalText =
          'Main aapka concern bilkul samajh sakti hoon, Vikram. Humara 30-Day Guided Proof-of-Value ($4,500) 100% annual contract mein credit ho jata hai, aur zero-downtime migration shadow-traffic validation ke saath aata hai. Kya main kal subah 10:30 AM IST ka Solutions Architect slot confirm kar doon?';
      } else {
        finalText =
          latestRagResult?.citations[0]?.snippet ??
          'I have grounded your requirements in our AetherCloud knowledge base and updated your BANT qualification profile. Would you like me to reserve tomorrow morning at 10:30 AM IST with our Principal Solutions Architect?';
      }
    }

    if (!finalText) {
      finalText =
        'Got it—I have logged those details in our system. Would you like me to check our Solutions Architect calendar or walk through our 30-day PoV structure?';
    }

    // Ensure sentiment & language are reflected in lead state
    crmStore.updateBant({ sentiment: finalSentiment, language: finalLanguage });

    const llmLatencyMs = Math.round(performance.now() - turnStart);

    // 3. Real Gemini 3.8 TTS Audio Synthesis via Interactions API (WAV 24kHz)
    let audioWavBase64: string | undefined;
    if (enableTts) {
      try {
        const ttsStyle =
          finalSentiment === 'frustrated' || finalSentiment === 'hesitant'
            ? 'Warm, deeply empathetic, calm, reassuring enterprise advisor'
            : 'Natural, crisp, friendly, consultative enterprise advisor';

        audioWavBase64 = await synthesizeSpeechWavBase64(finalText, voiceName, ttsStyle);
      } catch {
        // Skip TTS audio silently if TTS endpoint is rate-limited
      }
    }

    return NextResponse.json({
      agentText: finalText,
      language: finalLanguage,
      sentiment: finalSentiment,
      sentimentScore: detectedSentiment.score,
      latencyMs: llmLatencyMs,
      cacheHit: false,
      audioWavBase64,
      toolLogs,
      ragResult: latestRagResult,
      activeLead: crmStore.getActiveLead(),
      leads: crmStore.getLeads(),
      calendarSlots: crmStore.getCalendarSlots(false),
      semanticCache: semanticCache.getStats(),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Simulator turn execution failed.';
    console.error('[API /simulator/turn] Error:', err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
