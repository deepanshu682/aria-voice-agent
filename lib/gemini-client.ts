import { GoogleGenAI } from '@google/genai';
import { crmStore } from './crm-store';
import { ragEngine } from './rag-engine';
import {
  CalendarSlot,
  LanguageCode,
  LeadProfile,
  RagSearchResult,
  SentimentLabel,
  ToolExecutionLog,
} from './types';

let sharedClient: GoogleGenAI | null = null;

export function getGeminiClient(): GoogleGenAI {
  if (!sharedClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is not configured in the server environment.');
    }
    sharedClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        apiVersion: 'v1beta',
        timeout: 12_000,
        retryOptions: { attempts: 1 },
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return sharedClient;
}

export function detectLanguageHeuristic(text: string): LanguageCode {
  const lower = text.toLowerCase();
  if (/[\u0900-\u097f]/.test(text)) {
    return /[a-z]{3,}/i.test(text) ? 'hinglish' : 'hi';
  }
  const hinglishMarkers = [
    'yaar',
    'hai',
    'hain',
    'kya',
    'kitna',
    'thoda',
    'zyada',
    'mehenga',
    'mahanga',
    'karna',
    'chahiye',
    'samajh',
    'namaste',
    'aapka',
    'humara',
    'hamara',
    'theek',
    'bilkul',
    'batao',
    'baat',
    'kal',
  ];
  const hits = hinglishMarkers.filter((m) => new RegExp(`\\b${m}\\b`, 'i').test(lower)).length;
  if (hits >= 2) return 'hinglish';
  if (/\b(hola|gracias|precio|disponible)\b/i.test(lower)) return 'es';
  if (/\b(hallo|danke|preis|datenschutz)\b/i.test(lower)) return 'de';
  return 'en';
}

export function detectSentimentHeuristic(text: string): { label: SentimentLabel; score: number } {
  const lower = text.toLowerCase();
  if (
    /\b(frustrated|annoyed|terrible|waste|ridiculous|fed up|angry|burned|sick of|unacceptable|bakwas|pareshan)\b/i.test(
      lower
    )
  ) {
    return { label: 'frustrated', score: -0.78 };
  }
  if (
    /\b(expensive|costly|mehenga|zyada|worried|concern|not sure|hesitant|doubt|risky|tight budget|pushback|difficult|hard to justify)\b/i.test(
      lower
    )
  ) {
    return { label: 'hesitant', score: -0.32 };
  }
  if (
    /\b(great|awesome|love|perfect|sounds good|book it|let's do it|yes please|excited|impressive|helpful|thank you|theek hai|bilkul|confirm)\b/i.test(
      lower
    )
  ) {
    return { label: 'positive', score: 0.74 };
  }
  return { label: 'neutral', score: 0.12 };
}

export interface ToolDispatchOutput {
  responsePayload: Record<string, unknown>;
  log: ToolExecutionLog;
  ragResult?: RagSearchResult;
  updatedLead?: LeadProfile;
  updatedSlots?: CalendarSlot[];
  sentimentUpdate?: { sentiment: SentimentLabel; language: LanguageCode; reason?: string };
}

export function executeAgentTool(
  name: string,
  rawArgs: Record<string, unknown> | undefined,
  nonBlocking = true,
  options?: { ragThreshold?: number; topK?: number }
): ToolDispatchOutput {
  const start = performance.now();
  const args = rawArgs ?? {};
  const id = `TOOL-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const timestamp = new Date().toISOString();

  if (name === 'search_knowledge_base') {
    const query = String(args.query ?? '');
    const threshold = options?.ragThreshold ?? 0.72;
    const topK = options?.topK ?? 3;
    const ragResult = ragEngine.search(query, topK, threshold);
    const latencyMs = ragResult.latencyMs;

    const responsePayload = ragResult.passedGuardrail
      ? {
          status: 'VERIFIED_MATCH',
          topScore: ragResult.topScore,
          thresholdUsed: threshold,
          passedGuardrail: true,
          cacheHit: ragResult.cacheHit,
          facts: ragResult.citations
            .filter((c) => c.hybridScore >= 0.45)
            .map((c) => ({
              docId: c.docId,
              title: c.title,
              confidence: c.hybridScore,
              content: c.snippet,
            })),
        }
      : {
          status: 'NO_MATCH_LOW_CONFIDENCE',
          topScore: ragResult.topScore,
          thresholdUsed: threshold,
          passedGuardrail: false,
          mandatoryFallbackResponse: ragResult.fallbackMessage,
          instruction:
            `Confidence is below ${threshold.toFixed(2)}. You MUST NOT invent facts. Use the mandatoryFallbackResponse verbatim or closely paraphrased in the prospect language.`,
        };

    return {
      responsePayload,
      ragResult,
      log: {
        id,
        name,
        args,
        resultSummary: ragResult.passedGuardrail
          ? `Grounded (${ragResult.topScore.toFixed(2)} ≥ ${threshold.toFixed(2)}) via ${ragResult.citations[0]?.docId}`
          : `Guardrail triggered (${ragResult.topScore.toFixed(2)} < ${threshold.toFixed(2)}) — Fallback enforced`,
        latencyMs,
        timestamp,
        nonBlocking,
        status: ragResult.passedGuardrail ? 'completed' : 'fallback',
      },
    };
  }

  if (name === 'update_bant_qualification') {
    const updatedLead = crmStore.updateBant({
      budgetScore: typeof args.budgetScore === 'number' ? args.budgetScore : undefined,
      budgetEvidence: typeof args.budgetEvidence === 'string' ? args.budgetEvidence : undefined,
      authorityScore: typeof args.authorityScore === 'number' ? args.authorityScore : undefined,
      authorityEvidence: typeof args.authorityEvidence === 'string' ? args.authorityEvidence : undefined,
      needScore: typeof args.needScore === 'number' ? args.needScore : undefined,
      needEvidence: typeof args.needEvidence === 'string' ? args.needEvidence : undefined,
      timelineScore: typeof args.timelineScore === 'number' ? args.timelineScore : undefined,
      timelineEvidence: typeof args.timelineEvidence === 'string' ? args.timelineEvidence : undefined,
    });
    const latencyMs = Math.max(4, Math.round(performance.now() - start) + 5);

    return {
      responsePayload: {
        status: 'UPDATED',
        leadId: updatedLead.id,
        totalBantScore: updatedLead.bant.totalScore,
        stage: updatedLead.stage,
      },
      updatedLead,
      log: {
        id,
        name,
        args,
        resultSummary: `BANT updated → ${updatedLead.bant.totalScore}/100 (${updatedLead.stage})`,
        latencyMs,
        timestamp,
        nonBlocking,
        status: 'completed',
      },
    };
  }

  if (name === 'log_turn_sentiment') {
    const rawSent = String(args.sentiment ?? 'neutral').toLowerCase();
    const sentiment: SentimentLabel =
      rawSent === 'positive' || rawSent === 'hesitant' || rawSent === 'frustrated' ? rawSent : 'neutral';
    const rawLang = String(args.language ?? 'en').toLowerCase();
    const language: LanguageCode =
      rawLang === 'hi' || rawLang === 'hinglish' || rawLang === 'es' || rawLang === 'de' ? rawLang : 'en';
    const updatedLead = crmStore.updateBant({ sentiment, language });
    const latencyMs = Math.max(3, Math.round(performance.now() - start) + 3);

    return {
      responsePayload: { status: 'LOGGED', sentiment, language },
      updatedLead,
      sentimentUpdate: {
        sentiment,
        language,
        reason: typeof args.reason === 'string' ? args.reason : undefined,
      },
      log: {
        id,
        name,
        args,
        resultSummary: `Sentiment: ${sentiment}, Language: ${language.toUpperCase()}`,
        latencyMs,
        timestamp,
        nonBlocking,
        status: 'completed',
      },
    };
  }

  if (name === 'check_calendar_availability') {
    const available = crmStore.getCalendarSlots(true);
    const latencyMs = Math.max(5, Math.round(performance.now() - start) + 7);
    return {
      responsePayload: {
        status: 'AVAILABLE_SLOTS',
        count: available.length,
        slots: available.map((s) => ({
          slotId: s.id,
          day: s.dayLabel,
          time: s.timeSlot,
          specialist: `${s.specialistName} (${s.specialistRole})`,
        })),
      },
      updatedSlots: crmStore.getCalendarSlots(false),
      log: {
        id,
        name,
        args,
        resultSummary: `Found ${available.length} open Solutions Architect slots`,
        latencyMs,
        timestamp,
        nonBlocking,
        status: 'completed',
      },
    };
  }

  if (name === 'book_sales_appointment') {
    const activeLead = crmStore.getActiveLead();
    const booking = crmStore.bookSlot({
      slotId: typeof args.slotId === 'string' ? args.slotId : undefined,
      leadName: typeof args.leadName === 'string' ? args.leadName : activeLead.name,
      company: typeof args.company === 'string' ? args.company : activeLead.company,
      email: typeof args.email === 'string' ? args.email : activeLead.email,
      agenda: typeof args.agenda === 'string' ? args.agenda : undefined,
    });
    const latencyMs = Math.max(8, Math.round(performance.now() - start) + 12);

    return {
      responsePayload: booking.success
        ? {
            status: 'BOOKED',
            slot: booking.slot,
          }
        : {
            status: 'CONFLICT_PREVENTED',
            error: booking.error,
            availableAlternatives: booking.availableAlternatives?.slice(0, 3),
          },
      updatedLead: crmStore.getActiveLead(),
      updatedSlots: crmStore.getCalendarSlots(false),
      log: {
        id,
        name,
        args,
        resultSummary: booking.success
          ? `Reserved ${booking.slot?.dayLabel} ${booking.slot?.timeSlot} with ${booking.slot?.specialistName}`
          : booking.error ?? 'Slot unavailable',
        latencyMs,
        timestamp,
        nonBlocking,
        status: booking.success ? 'completed' : 'fallback',
      },
    };
  }

  if (name === 'upsert_crm_lead') {
    const activeLead = crmStore.getActiveLead();
    const validStages: LeadProfile['stage'][] = [
      'New Inquiry',
      'Discovery',
      'Qualified',
      'Demo Booked',
      'Escalated',
    ];
    const requestedStage = validStages.includes(args.stage as LeadProfile['stage'])
      ? (args.stage as LeadProfile['stage'])
      : undefined;

    const updatedLead = crmStore.upsertLead({
      name: typeof args.name === 'string' ? args.name : activeLead.name,
      company: typeof args.company === 'string' ? args.company : activeLead.company,
      email: typeof args.email === 'string' ? args.email : activeLead.email,
      role: typeof args.role === 'string' ? args.role : activeLead.role,
      stage: requestedStage,
      notes: typeof args.notes === 'string' ? args.notes : undefined,
    });
    const latencyMs = Math.max(6, Math.round(performance.now() - start) + 9);

    return {
      responsePayload: {
        status: 'CRM_SYNCED',
        leadId: updatedLead.id,
        stage: updatedLead.stage,
        bantScore: updatedLead.bant.totalScore,
      },
      updatedLead,
      log: {
        id,
        name,
        args,
        resultSummary: `CRM upserted: ${updatedLead.name} (${updatedLead.stage})`,
        latencyMs,
        timestamp,
        nonBlocking,
        status: 'completed',
      },
    };
  }

  return {
    responsePayload: { status: 'UNKNOWN_TOOL', name },
    log: {
      id,
      name,
      args,
      resultSummary: `Unknown tool requested: ${name}`,
      latencyMs: Math.round(performance.now() - start),
      timestamp,
      nonBlocking,
      status: 'error',
    },
  };
}
