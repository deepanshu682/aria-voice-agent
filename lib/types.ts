export type AgentVisualState =
  | 'IDLE'
  | 'LISTENING'
  | 'THINKING'
  | 'SPEAKING'
  | 'DEESCALATING';

export type SentimentLabel = 'positive' | 'neutral' | 'hesitant' | 'frustrated';

export type LanguageCode = 'en' | 'hi' | 'hinglish' | 'es' | 'de';

export interface BantDimension {
  score: number; // 0 to 25
  status: 'unknown' | 'partial' | 'confirmed';
  evidence: string;
}

export interface BantScorecard {
  budget: BantDimension;
  authority: BantDimension;
  need: BantDimension;
  timeline: BantDimension;
  totalScore: number; // 0 to 100
  meddicSummary: {
    metrics: string;
    economicBuyer: string;
    decisionCriteria: string;
    identifyPain: string;
    champion: string;
  };
}

export interface RagCitation {
  docId: string;
  title: string;
  category: KnowledgeCategory;
  denseScore: number;
  lexicalScore: number;
  hybridScore: number;
  snippet: string;
  passedGuardrail: boolean;
}

export interface RagSearchResult {
  query: string;
  topScore: number;
  thresholdUsed?: number;
  passedGuardrail: boolean; // true if topScore >= threshold
  latencyMs: number;
  cacheHit: boolean;
  fallbackMessage?: string;
  citations: RagCitation[];
}

export interface DeveloperConfig {
  ragThreshold: number; // 0.50 to 0.95, default 0.72
  topK: number; // 1 to 5, default 3
  vadThreshold: number; // 0.010 to 0.060, default 0.022
  voiceName: string; // Zephyr, Kore, Puck, Charon
  ttsEnabled: boolean;
}

export interface ToolExecutionLog {
  id: string;
  name: string;
  args: Record<string, unknown>;
  resultSummary: string;
  latencyMs: number;
  timestamp: string;
  nonBlocking: boolean;
  status: 'completed' | 'fallback' | 'error';
}

export interface TranscriptTurn {
  id: string;
  speaker: 'prospect' | 'agent' | 'system';
  text: string;
  language: LanguageCode;
  sentiment: SentimentLabel;
  sentimentScore: number; // -1 to 1
  latencyMs: number;
  cacheHit: boolean;
  timestamp: string;
  ragCitations?: RagCitation[];
  toolCalls?: ToolExecutionLog[];
  bargeInTriggered?: boolean;
}

export type KnowledgeCategory =
  | 'Pricing & Plans'
  | 'Security & Compliance'
  | 'Architecture & SLA'
  | 'Competitor Battlecard'
  | 'Implementation & Migration'
  | 'Sales Playbook & Objections';

export interface KnowledgeChunk {
  id: string;
  source: 'AetherCloud Enterprise KB' | 'Open-Source SaaS Sales Corpus';
  category: KnowledgeCategory;
  title: string;
  content: string;
  keywords: string[];
  verifiedDate: string;
  semanticTags: string[];
}

export interface CalendarSlot {
  id: string;
  date: string; // YYYY-MM-DD
  dayLabel: string;
  timeSlot: string; // e.g., "10:00 AM IST"
  timezone: string;
  specialistName: string;
  specialistRole: string;
  status: 'available' | 'booked';
  bookedByLeadId?: string;
  bookedByName?: string;
  bookedCompany?: string;
  agenda?: string;
  meetingLink?: string;
}

export interface PriorCallMemory {
  callId: string;
  date: string;
  summary: string;
  languageUsed: LanguageCode;
  keyPainPoints: string[];
  lastSentiment: SentimentLabel;
}

export interface LeadProfile {
  id: string;
  name: string;
  role: string;
  company: string;
  email: string;
  phone: string;
  teamSize: string;
  preferredLanguage: LanguageCode;
  stage: 'New Inquiry' | 'Discovery' | 'Qualified' | 'Demo Booked' | 'Escalated';
  bant: BantScorecard;
  lastSentiment: SentimentLabel;
  updatedAt: string;
  priorCalls: PriorCallMemory[];
  bookedSlotId?: string;
}

export interface ObjectionBreakdownItem {
  objection: string;
  category: 'Pricing' | 'Security' | 'Migration' | 'Timeline' | 'Competitor' | 'Technical';
  sentimentAtTime: SentimentLabel;
  resolutionStrategy: string;
  resolved: boolean;
}

export interface CallInsightReport {
  generatedAt: string;
  callDurationSec: number;
  primaryLanguage: LanguageCode;
  executiveSummary: string;
  qualificationVerdict: 'High-Intent Enterprise' | 'Qualified Mid-Market' | 'Nurture Required' | 'Human Specialist Escalation';
  conversionProbability: number; // 0 to 100
  bantScorecard: BantScorecard;
  sentimentTrajectory: Array<{
    turnIndex: number;
    sentiment: SentimentLabel;
    score: number;
    note: string;
  }>;
  objectionsBreakdown: ObjectionBreakdownItem[];
  nextBestAction: string;
  recommendedFollowUpEmail: {
    subject: string;
    body: string;
  };
  crmSynced: boolean;
  appointmentBooked?: {
    slotId: string;
    date: string;
    timeSlot: string;
    specialistName: string;
    meetingLink: string;
  };
}

export interface SemanticCacheEntry {
  key: string;
  normalizedPattern: string;
  category: string;
  response: string;
  language: LanguageCode;
  ragDocIds: string[];
  hitCount: number;
  avgLatencyMs: number;
}

export interface WorkflowStagePreset {
  id: string;
  stepNumber: number;
  title: string;
  subtitle: string;
  language: LanguageCode;
  prospectUtterance: string;
  expectedTools: string[];
  expectedSentiment: SentimentLabel;
}
