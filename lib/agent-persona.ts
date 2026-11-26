import { Behavior, FunctionDeclaration, Type } from '@google/genai';
import { LeadProfile } from './types';

export function buildSalesAgentSystemInstruction(activeLead: LeadProfile): string {
  const priorHistory =
    activeLead.priorCalls.length > 0
      ? activeLead.priorCalls
          .map(
            (c) =>
              `- [${c.date}] (${c.languageUsed.toUpperCase()}, sentiment: ${c.lastSentiment}): ${c.summary} | Pain points: ${c.keyPainPoints.join(', ')}`
          )
          .join('\n')
      : '- No prior calls on record. Treat as a fresh inbound discovery.';

  return `You are Aria, an elite Autonomous Enterprise AI Sales Voice Agent representing **AetherCloud AI** (Enterprise SaaS & AI Cloud Platform).

=== CROSS-CALL CUSTOMER MEMORY ===
Active Prospect: ${activeLead.name} (${activeLead.role} at ${activeLead.company})
Email: ${activeLead.email} | Team Size: ${activeLead.teamSize} | Preferred Language: ${activeLead.preferredLanguage}
Current Pipeline Stage: ${activeLead.stage} | Current BANT Score: ${activeLead.bant.totalScore}/100
Prior Call Memory:
${priorHistory}

=== 1. HUMAN-LIKE CONVERSATIONAL CADENCE ===
- Speak naturally in concise, spoken-friendly sentences (1 to 3 short sentences per turn).
- NEVER read out bullet points, markdown formatting, asterisks, or robotic monologues.
- Use natural spoken micro-acknowledgments ("Got it," "That makes complete sense," "Great question—let me pull up the exact details for you") when invoking tools so there is zero awkward silence.
- Mirror the prospect's pacing, formality, and emotional tone (affective dialog).

=== 2. CONSULTATIVE DISCOVERY (NEVER AN INTERROGATION) ===
- Weave BANT/MEDDIC qualification (Budget, Authority, Need, Timeline) organically into value-driven conversation—at most ONE gentle discovery question per turn.
- Always uncover the prospect's operational pain point before pitching pricing or proposing a demo slot.
- Whenever the prospect reveals new Budget, Authority, Need, or Timeline details, call \`update_bant_qualification\` silently in the background.

=== 3. EMPATHETIC OBJECTION HANDLING & SENTIMENT DE-ESCALATION ===
- Continuously assess prospect sentiment on every turn and call \`log_turn_sentiment\`.
- If the prospect sounds \`hesitant\` or \`frustrated\` (e.g., pricing pushback, migration fear, or past bad vendor experience), IMMEDIATELY soften your tone, validate their concern genuinely, stop pushing for a sale, and offer either a low-risk grounded option (such as the $1,500 30-day PoV credited 100% toward annual plans) or a direct human specialist callback.

=== 4. SEAMLESS MULTILINGUAL CODE-SWITCHING ===
- Automatically detect the prospect's language (English, Hindi, Hinglish, Spanish, or German) from their utterance and reply fluently in the EXACT SAME language and conversational register.
- Never ask "Press 1 for Hindi." If they switch mid-sentence to Hinglish ("Yaar price thoda zyada lag raha hai"), respond naturally in warm, respectful professional Hinglish.

=== 5. STRICT ANTI-HALLUCINATION & RAG GROUNDING POLICY ===
- You are STRICTLY FORBIDDEN from inventing pricing tiers, discount percentages, SLA numbers, security certifications, product features, or calendar availability.
- For ANY factual question about pricing, SLA, security, compliance, competitors, or migration, you MUST call \`search_knowledge_base\` first.
- CRITICAL GUARDRAIL: If \`search_knowledge_base\` returns \`passedGuardrail: false\` or \`topScore < 0.72\`, you MUST NOT guess or fabricate an answer. You MUST say:
  "I want to make sure I give you exact numbers on that—let me flag that for our solutions specialist to confirm right away, or I can include it in our demo agenda."
- For appointment booking, ALWAYS call \`check_calendar_availability\` before promising a time, and call \`book_sales_appointment\` + \`upsert_crm_lead\` when the prospect confirms a slot.`;
}

export function getAgentFunctionDeclarations(nonBlocking: boolean): FunctionDeclaration[] {
  const behaviorProp = nonBlocking ? { behavior: Behavior.NON_BLOCKING } : {};

  return [
    {
      name: 'search_knowledge_base',
      description:
        'Hybrid dense + keyword RAG search over the verified AetherCloud AI Enterprise Knowledge Base and SaaS Sales Playbook. MUST be called before answering any factual question about pricing, SLA, security, DPDP/GDPR, migration, or competitors.',
      ...behaviorProp,
      parameters: {
        type: Type.OBJECT,
        properties: {
          query: {
            type: Type.STRING,
            description: 'The prospect question or topic to retrieve verified enterprise facts for.',
          },
        },
        required: ['query'],
      },
    },
    {
      name: 'update_bant_qualification',
      description:
        'Updates the live BANT/MEDDIC lead qualification scorecard in the CRM whenever the prospect mentions Budget, Authority, Need, or Timeline.',
      ...behaviorProp,
      parameters: {
        type: Type.OBJECT,
        properties: {
          budgetScore: { type: Type.NUMBER, description: 'Score 0-25 for budget clarity and fit.' },
          budgetEvidence: { type: Type.STRING, description: 'Short factual note on prospect budget.' },
          authorityScore: { type: Type.NUMBER, description: 'Score 0-25 for decision-making authority.' },
          authorityEvidence: { type: Type.STRING, description: 'Short note on role/decision power.' },
          needScore: { type: Type.NUMBER, description: 'Score 0-25 for urgency and clarity of pain point.' },
          needEvidence: { type: Type.STRING, description: 'Short note on identified business need.' },
          timelineScore: { type: Type.NUMBER, description: 'Score 0-25 for implementation timeline.' },
          timelineEvidence: { type: Type.STRING, description: 'Short note on target launch timeline.' },
        },
      },
    },
    {
      name: 'log_turn_sentiment',
      description:
        'Records detected prospect emotional sentiment and language for the current turn to drive empathetic de-escalation and telemetry.',
      ...behaviorProp,
      parameters: {
        type: Type.OBJECT,
        properties: {
          sentiment: {
            type: Type.STRING,
            description: 'One of: positive, neutral, hesitant, frustrated',
          },
          language: {
            type: Type.STRING,
            description: 'Detected language code: en, hi, hinglish, es, or de',
          },
          reason: {
            type: Type.STRING,
            description: 'Brief explanation of the detected emotional cue.',
          },
        },
        required: ['sentiment', 'language'],
      },
    },
    {
      name: 'check_calendar_availability',
      description:
        'Retrieves currently available live demo time slots with AetherCloud Solutions Architects. Always call before offering times to prevent double-booking.',
      ...behaviorProp,
      parameters: {
        type: Type.OBJECT,
        properties: {
          preferredDay: {
            type: Type.STRING,
            description: 'Optional preferred day or date filter.',
          },
        },
      },
    },
    {
      name: 'book_sales_appointment',
      description:
        'Books a conflict-free demo slot with an AetherCloud Solutions Architect and prevents double-booking. Only call after verifying availability.',
      ...behaviorProp,
      parameters: {
        type: Type.OBJECT,
        properties: {
          slotId: {
            type: Type.STRING,
            description: 'Exact slot ID returned from check_calendar_availability (e.g. SLOT-01).',
          },
          leadName: { type: Type.STRING, description: 'Prospect full name.' },
          company: { type: Type.STRING, description: 'Prospect company name.' },
          email: { type: Type.STRING, description: 'Prospect email address.' },
          agenda: { type: Type.STRING, description: 'Concise demo agenda tailored to prospect pain points.' },
        },
        required: ['slotId', 'leadName', 'company'],
      },
    },
    {
      name: 'upsert_crm_lead',
      description:
        'Creates or updates a structured lead record and cross-call memory summary in the AetherCloud CRM database.',
      ...behaviorProp,
      parameters: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING, description: 'Prospect full name.' },
          company: { type: Type.STRING, description: 'Company name.' },
          email: { type: Type.STRING, description: 'Email address.' },
          role: { type: Type.STRING, description: 'Job title or role.' },
          stage: {
            type: Type.STRING,
            description: 'Pipeline stage: New Inquiry, Discovery, Qualified, Demo Booked, or Escalated',
          },
          notes: { type: Type.STRING, description: 'Structured cross-call memory note.' },
        },
        required: ['name', 'company'],
      },
    },
  ];
}
