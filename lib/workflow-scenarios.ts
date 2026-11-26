import { WorkflowStagePreset } from './types';

export const END_TO_END_WORKFLOW_STAGES: WorkflowStagePreset[] = [
  {
    id: 'stage-1-inbound',
    stepNumber: 1,
    title: 'Inbound Inquiry & Cross-Call Memory',
    subtitle: 'Prospect returns from last week’s intro call asking about Mumbai DPDP security & SLA.',
    language: 'en',
    prospectUtterance:
      "Hi Aria, Vikram Malhotra here again from FinEdge Bengaluru. Before I bring our CFO into the loop, can you confirm your Mumbai DPDP data residency, SOC2 certification, and enterprise uptime SLA?",
    expectedTools: ['search_knowledge_base', 'log_turn_sentiment', 'update_bant_qualification'],
    expectedSentiment: 'neutral',
  },
  {
    id: 'stage-2-rag-pricing',
    stepNumber: 2,
    title: 'Grounded RAG Pricing & Competitor TCO',
    subtitle: 'Verifies exact Growth vs. Enterprise Sovereign tiers & AWS Bedrock TCO comparison.',
    language: 'en',
    prospectUtterance:
      "We have 60 engineers and 45 ops staff currently burning roughly $2,400 a month on AWS Bedrock with terrible latency. What are your exact Growth Scale and Enterprise Sovereign pricing tiers?",
    expectedTools: ['search_knowledge_base', 'update_bant_qualification'],
    expectedSentiment: 'neutral',
  },
  {
    id: 'stage-3-hinglish-objection',
    stepNumber: 3,
    title: 'Hinglish Price Objection & Sentiment De-escalation',
    subtitle: 'Mid-call switch to frustrated Hinglish triggers affective softening + 30-day PoV pivot.',
    language: 'hinglish',
    prospectUtterance:
      'Yaar honestly, $4,900 per month thoda zyada mehenga lag raha hai aur main honestly frustrated hoon purane vendors ke hidden fees aur slow migration se. Hum Q1 mein launch karna chahte hain par CFO ko kaise convince karoon?',
    expectedTools: ['log_turn_sentiment', 'search_knowledge_base', 'update_bant_qualification'],
    expectedSentiment: 'frustrated',
  },
  {
    id: 'stage-4-guardrail-test',
    stepNumber: 4,
    title: 'Anti-Hallucination Guardrail (< 0.72 Test)',
    subtitle: 'Out-of-scope question forces deterministic low-confidence specialist fallback.',
    language: 'en',
    prospectUtterance:
      'Quick question—do you support custom bare-metal quantum FPGA firmware deployment for submarine telemetry satellites?',
    expectedTools: ['search_knowledge_base'],
    expectedSentiment: 'neutral',
  },
  {
    id: 'stage-5-booking-crm',
    stepNumber: 5,
    title: 'Live Calendar Booking & CRM Sync',
    subtitle: 'Checks open Solutions Architect slots, prevents double-booking, books demo & upserts CRM.',
    language: 'hinglish',
    prospectUtterance:
      'That $1,500 30-day PoV credited to the annual plan actually makes total sense—theek hai, main aur hamare CFO dono ready hain. Please check your calendar and book Thursday 11:00 AM IST with your Principal Solutions Architect and sync our CRM record.',
    expectedTools: ['check_calendar_availability', 'book_sales_appointment', 'upsert_crm_lead', 'update_bant_qualification'],
    expectedSentiment: 'positive',
  },
];
