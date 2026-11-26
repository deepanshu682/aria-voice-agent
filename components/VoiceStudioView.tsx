'use client';

import React, { useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  CalendarCheck,
  CheckCircle2,
  ChevronRight,
  Code2,
  DollarSign,
  FileText,
  Globe2,
  Loader2,
  Mic,
  MicOff,
  PhoneOff,
  RotateCcw,
  Send,
  ShieldAlert,
  ShieldCheck,
  Sliders,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Progress, Slider, Switch } from './ui/controls';
import {
  AgentVisualState,
  CalendarSlot,
  CallInsightReport,
  DeveloperConfig,
  LanguageCode,
  LeadProfile,
  RagSearchResult,
  SentimentLabel,
  ToolExecutionLog,
  TranscriptTurn,
} from '@/lib/types';
import { END_TO_END_WORKFLOW_STAGES } from '@/lib/workflow-scenarios';

interface VoiceStudioViewProps {
  developerMode: boolean;
  devConfig: DeveloperConfig;
  thinkingStep: string | null;
  agentState: AgentVisualState;
  audioLevel: number;
  sentiment: SentimentLabel;
  language: LanguageCode;
  isConnected: boolean;
  isConnecting: boolean;
  isMuted: boolean;
  bargeInCount: number;
  lastBargeInMs: number | null;
  liveError: string | null;
  streamingDraft: { prospect: string; agent: string };
  transcript: TranscriptTurn[];
  toolLogs: ToolExecutionLog[];
  latestRag: RagSearchResult | null;
  activeLead: LeadProfile;
  calendarSlots: CalendarSlot[];
  isSimulating: boolean;
  isRunningFullWorkflow: boolean;
  activeWorkflowStep: number | null;
  insightReport: CallInsightReport | null;
  isGeneratingInsights: boolean;
  onUpdateDevConfig: (patch: Partial<DeveloperConfig>) => void;
  onStartLive: () => void;
  onStopLive: () => void;
  onToggleMute: () => void;
  onTriggerBargeIn: () => void;
  onSendSimulatedUtterance: (utterance: string, stageStep?: number) => Promise<void>;
  onRunFullWorkflow: () => Promise<void>;
  onGenerateInsights: () => Promise<void>;
  onResetSession: () => Promise<void>;
}

const VOICE_PERSONAS: Array<{
  id: DeveloperConfig['voiceName'];
  label: string;
  tone: string;
}> = [
  { id: 'Zephyr', label: 'Zephyr', tone: 'Warm and Consultative' },
  { id: 'Kore', label: 'Kore', tone: 'Clear and Executive' },
  { id: 'Puck', label: 'Puck', tone: 'Cheerful and Friendly' },
  { id: 'Charon', label: 'Charon', tone: 'Calm and Analytical' },
  { id: 'Fenrir', label: 'Fenrir', tone: 'Direct and Confident' },
];

const SENTIMENT_STYLE: Record<SentimentLabel, { text: string; label: string }> = {
  positive: { text: 'text-emerald-700', label: 'Positive' },
  neutral: { text: 'text-stone-600', label: 'Neutral' },
  hesitant: { text: 'text-amber-700', label: 'Hesitant' },
  frustrated: { text: 'text-rose-700 font-semibold', label: 'Frustrated (Empathetic Mode)' },
};

const LANG_LABEL: Record<LanguageCode, string> = {
  en: 'English',
  hi: 'Hindi',
  hinglish: 'Hinglish',
  es: 'Spanish',
  de: 'German',
};

const SIMPLE_QUICK_ACTIONS = [
  {
    id: 'qa-pricing',
    label: 'Ask Pricing & Plans',
    desc: 'Starter, Growth, and Enterprise tiers',
    icon: DollarSign,
    step: 2,
    utterance: END_TO_END_WORKFLOW_STAGES[1].prospectUtterance,
  },
  {
    id: 'qa-security',
    label: 'Check Security & DPDP',
    desc: 'SOC2 Type II and Mumbai data residency',
    icon: ShieldCheck,
    step: 1,
    utterance: END_TO_END_WORKFLOW_STAGES[0].prospectUtterance,
  },
  {
    id: 'qa-hinglish',
    label: 'Try Hindi / Hinglish Objection',
    desc: 'Empathetic price and PoV handling',
    icon: Globe2,
    step: 3,
    utterance: END_TO_END_WORKFLOW_STAGES[2].prospectUtterance,
  },
  {
    id: 'qa-book',
    label: 'Book a Live Demo Slot',
    desc: 'Reserve Thursday 11:00 AM IST slot',
    icon: CalendarCheck,
    step: 5,
    utterance: END_TO_END_WORKFLOW_STAGES[4].prospectUtterance,
  },
];

export default function VoiceStudioView({
  developerMode,
  devConfig,
  thinkingStep,
  agentState,
  audioLevel,
  sentiment,
  language,
  isConnected,
  isConnecting,
  isMuted,
  bargeInCount,
  lastBargeInMs,
  liveError,
  streamingDraft,
  transcript,
  toolLogs,
  latestRag,
  activeLead,
  calendarSlots,
  isSimulating,
  isRunningFullWorkflow,
  activeWorkflowStep,
  insightReport,
  isGeneratingInsights,
  onUpdateDevConfig,
  onStartLive,
  onStopLive,
  onToggleMute,
  onTriggerBargeIn,
  onSendSimulatedUtterance,
  onRunFullWorkflow,
  onGenerateInsights,
  onResetSession,
}: VoiceStudioViewProps) {
  const [customUtterance, setCustomUtterance] = useState('');
  const [activeRightTab, setActiveRightTab] = useState<'conversation' | 'summary' | 'bant' | 'telemetry'>('conversation');
  const [showRawJson, setShowRawJson] = useState(false);

  const activePersona =
    VOICE_PERSONAS.find((p) => p.id === devConfig.voiceName) ?? VOICE_PERSONAS[0];

  const bookedSlot = activeLead.bookedSlotId
    ? calendarSlots.find((s) => s.id === activeLead.bookedSlotId)
    : undefined;

  const isThinking = isSimulating || agentState === 'THINKING';
  const isSpeaking = agentState === 'SPEAKING';
  const isListening = isConnected && agentState === 'LISTENING';

  const handleSubmitCustom = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = customUtterance.trim();
    if (!text || isSimulating) return;
    setCustomUtterance('');
    setActiveRightTab('conversation');
    await onSendSimulatedUtterance(text);
  };

  return (
    <div className="space-y-8">
      {/* Developer Mode Parameter Tuning Bar (Visible only when Developer Mode is enabled) */}
      {developerMode && (
        <Card className="border-orange-200 bg-white p-6 shadow-xs">
          <CardHeader className="p-0 pb-5">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-2.5">
                <Sliders className="w-4 h-4 text-orange-600" />
                <CardTitle className="text-base font-semibold text-stone-900">
                  Developer Configuration and Guardrail Controls
                </CardTitle>
              </div>
              <div className="flex flex-wrap items-center gap-6 text-xs text-stone-500 font-mono tabular-nums">
                <span>Models: gemini-3.8-live, gemini-4-hydrogen, and gemini-3.8-flash</span>
                <span>
                  Barge-In Interrupts: {bargeInCount} ({lastBargeInMs ? `${lastBargeInMs}ms` : '<20ms'})
                </span>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-0 grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-stone-700">RAG Confidence Cutoff</span>
                <span className="font-mono tabular-nums font-semibold text-orange-600">
                  {devConfig.ragThreshold.toFixed(2)}
                </span>
              </div>
              <Slider
                ariaLabel="RAG Confidence Cutoff"
                min={0.5}
                max={0.95}
                step={0.02}
                value={devConfig.ragThreshold}
                onChange={(v) => onUpdateDevConfig({ ragThreshold: v })}
              />
              <p className="text-xs text-stone-500">
                Scores below {devConfig.ragThreshold.toFixed(2)} trigger anti-hallucination escalation.
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-stone-700">Hybrid RAG Top-K Chunks</span>
                <span className="font-mono tabular-nums font-semibold text-orange-600">
                  {devConfig.topK} chunks
                </span>
              </div>
              <Slider
                ariaLabel="Hybrid RAG Top-K Chunks"
                min={1}
                max={5}
                step={1}
                value={devConfig.topK}
                onChange={(v) => onUpdateDevConfig({ topK: v })}
              />
              <p className="text-xs text-stone-500">58% Dense Semantic and 42% BM25 Lexical fusion.</p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-stone-700">VAD Barge-In Sensitivity</span>
                <span className="font-mono tabular-nums font-semibold text-orange-600">
                  {devConfig.vadThreshold.toFixed(3)} RMS
                </span>
              </div>
              <Slider
                ariaLabel="VAD Barge-In Sensitivity"
                min={0.01}
                max={0.06}
                step={0.002}
                value={devConfig.vadThreshold}
                onChange={(v) => onUpdateDevConfig({ vadThreshold: v })}
              />
              <p className="text-xs text-stone-500">Client AudioWorklet local interruption threshold.</p>
            </div>

            <div className="flex flex-col justify-between space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-stone-700">Inspect Raw JSON Payloads</span>
                <Switch
                  checked={showRawJson}
                  onCheckedChange={setShowRawJson}
                  label="Toggle Raw JSON Payloads"
                />
              </div>
              <Button
                variant="outline"
                size="sm"
                disabled={isSimulating}
                onClick={() => {
                  setActiveRightTab('conversation');
                  void onSendSimulatedUtterance(
                    END_TO_END_WORKFLOW_STAGES[3].prospectUtterance,
                    END_TO_END_WORKFLOW_STAGES[3].stepNumber
                  );
                }}
                className="w-full justify-between border-rose-200 text-rose-800 hover:bg-rose-50"
              >
                <span className="flex items-center gap-2">
                  <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
                  <span>Test Out-of-Scope Guardrail</span>
                </span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {liveError && (
        <div className="rounded-2xl border border-amber-300 bg-amber-50 px-5 py-3.5 text-xs text-amber-900 flex items-start gap-3">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold">Connection Notice: </span>
            {liveError}
          </div>
        </div>
      )}

      {/* Main Split View: Left 2D Voice Assistant Card (5 cols) + Right Chatbot & Quick Actions Panel (7 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
        {/* LEFT COLUMN: 2D Voice Assistant Card Modeled After Reference Image */}
        <div className="lg:col-span-5 flex flex-col">
          <div className="flex-1 rounded-3xl border border-stone-200/90 bg-white assistant-card-wash p-7 sm:p-8 shadow-xs flex flex-col justify-between min-h-[680px]">
            {/* Top Header Inside Voice Card: Choose Your Voice + Audio Toggle */}
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={onResetSession}
                  title="Reset session"
                  className="w-10 h-10 rounded-full bg-white border border-stone-200/90 flex items-center justify-center text-stone-600 hover:text-stone-950 hover:border-stone-300 transition-colors shadow-2xs cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>

                <span className="font-display text-base font-semibold text-stone-900">
                  Choose Your Voice
                </span>

                <button
                  type="button"
                  onClick={() => onUpdateDevConfig({ ttsEnabled: !devConfig.ttsEnabled })}
                  title={devConfig.ttsEnabled ? 'Mute voice output' : 'Unmute voice output'}
                  className="w-10 h-10 rounded-full bg-white border border-stone-200/90 flex items-center justify-center text-stone-600 hover:text-stone-950 hover:border-stone-300 transition-colors shadow-2xs cursor-pointer"
                >
                  {devConfig.ttsEnabled ? (
                    <Volume2 className="w-4 h-4 text-orange-600" />
                  ) : (
                    <VolumeX className="w-4 h-4 text-stone-400" />
                  )}
                </button>
              </div>

              {/* Clean Segmented Voice Persona Selector */}
              <div className="flex items-center justify-center gap-1.5 flex-wrap">
                {VOICE_PERSONAS.map((persona) => {
                  const selected = persona.id === devConfig.voiceName;
                  return (
                    <button
                      key={persona.id}
                      type="button"
                      onClick={() => onUpdateDevConfig({ voiceName: persona.id })}
                      className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer ${
                        selected
                          ? 'bg-stone-900 text-white shadow-2xs'
                          : 'bg-white/80 text-stone-600 border border-stone-200/80 hover:text-stone-950'
                      }`}
                    >
                      {persona.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Center Flowing Liquid-Glass Orb + Greeting + Flowing Wave Animation */}
            <div className="my-auto py-8 flex flex-col items-center text-center space-y-7">
              {/* Flowing Liquid-Glass Central Orb (Zero center lines) */}
              <div className="relative flex flex-col items-center">
                <div
                  className="relative w-48 h-48 rounded-full flex items-center justify-center transition-transform duration-500"
                  style={{
                    transform: `scale(${
                      isSpeaking || isListening
                        ? (1 + Math.min(0.1, audioLevel * 0.22)).toFixed(3)
                        : isThinking
                          ? '1.03'
                          : '1'
                    })`,
                  }}
                >
                  {/* Ambient outer caustic glow */}
                  <div
                    className={`absolute -inset-3 rounded-full blur-2xl transition-opacity duration-500 ${
                      isSpeaking
                        ? 'bg-gradient-to-tr from-orange-500/45 via-rose-500/40 to-amber-300/45 opacity-100'
                        : isThinking
                          ? 'bg-gradient-to-tr from-amber-500/40 via-orange-500/35 to-rose-500/40 opacity-95'
                          : isListening
                            ? 'bg-gradient-to-tr from-orange-500/35 via-rose-500/30 to-amber-300/35 opacity-90'
                            : 'bg-gradient-to-tr from-orange-400/25 via-rose-400/20 to-amber-300/25 opacity-80'
                    }`}
                  />

                  {/* Outer Translucent Liquid-Glass Ribbon Rings */}
                  <svg
                    viewBox="0 0 220 220"
                    className="absolute inset-0 w-full h-full z-20 pointer-events-none animate-spin"
                    style={{ animationDuration: isThinking ? '6.5s' : isSpeaking ? '10s' : '18s' }}
                  >
                    <defs>
                      <linearGradient id="glassRimPrimary" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#FFF7ED" stopOpacity="0.95" />
                        <stop offset="35%" stopColor="#FB923C" stopOpacity="0.88" />
                        <stop offset="70%" stopColor="#EA580C" stopOpacity="0.85" />
                        <stop offset="100%" stopColor="#E11D48" stopOpacity="0.92" />
                      </linearGradient>
                      <linearGradient id="glassRimSecondary" x1="100%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.9" />
                        <stop offset="45%" stopColor="#F43F5E" stopOpacity="0.65" />
                        <stop offset="100%" stopColor="#F59E0B" stopOpacity="0.8" />
                      </linearGradient>
                    </defs>

                    <ellipse
                      cx="110"
                      cy="110"
                      rx="92"
                      ry="84"
                      transform="rotate(24 110 110)"
                      fill="none"
                      stroke="url(#glassRimPrimary)"
                      strokeWidth="3.2"
                      strokeLinecap="round"
                    />
                    <ellipse
                      cx="110"
                      cy="110"
                      rx="84"
                      ry="93"
                      transform="rotate(-32 110 110)"
                      fill="none"
                      stroke="url(#glassRimSecondary)"
                      strokeWidth="2.4"
                      strokeLinecap="round"
                    />
                    <circle
                      cx="110"
                      cy="110"
                      r="88"
                      fill="none"
                      stroke="url(#glassRimPrimary)"
                      strokeWidth="4"
                      strokeLinecap="round"
                      strokeDasharray="170 36 115 32"
                    />
                  </svg>

                  {/* Core Liquid-Glass Sphere Interior (Flowing Caustics & Translucent Fluid Waves) */}
                  <div className="relative w-36 h-36 rounded-full overflow-hidden liquid-glass-shell z-10 border border-white/80">
                    {/* Morphing Liquid Caustic Blob A */}
                    <div
                      className={`absolute -inset-3 bg-gradient-to-tr from-orange-500/45 via-rose-500/35 to-amber-300/50 blur-md liquid-blob-a ${
                        isThinking || isSpeaking ? 'liquid-blob-fast' : ''
                      }`}
                    />

                    {/* Morphing Liquid Caustic Blob B */}
                    <div
                      className={`absolute inset-1 bg-gradient-to-bl from-white/85 via-orange-300/45 to-rose-400/45 blur-sm liquid-blob-b ${
                        isThinking || isSpeaking ? 'liquid-blob-fast' : ''
                      }`}
                    />

                    {/* Flowing Translucent Liquid-Glass Wave Layer 1 */}
                    <div
                      className="absolute inset-x-0 bottom-0 h-full flex items-end opacity-80"
                      style={{
                        transform: `translateY(${
                          isSpeaking || isListening
                            ? `${Math.max(-14, -4 - Math.round(audioLevel * 22))}px`
                            : '0px'
                        })`,
                        transition: 'transform 180ms ease-out',
                      }}
                    >
                      <svg
                        viewBox="0 0 400 160"
                        preserveAspectRatio="none"
                        className={`h-[72%] shrink-0 liquid-wave-track ${
                          isThinking || isSpeaking ? 'liquid-wave-track-fast' : ''
                        }`}
                      >
                        <defs>
                          <linearGradient id="liquidWaveFillA" x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.78" />
                            <stop offset="35%" stopColor="#FB923C" stopOpacity="0.52" />
                            <stop offset="100%" stopColor="#E11D48" stopOpacity="0.68" />
                          </linearGradient>
                        </defs>
                        <path
                          d="M 0 60 C 50 20, 100 100, 150 60 C 200 20, 250 100, 300 60 C 350 20, 375 80, 400 60 L 400 160 L 0 160 Z"
                          fill="url(#liquidWaveFillA)"
                        />
                      </svg>
                    </div>

                    {/* Flowing Translucent Liquid-Glass Wave Layer 2 (Counter-Flowing) */}
                    <div
                      className="absolute inset-x-0 bottom-0 h-full flex items-end opacity-75"
                      style={{
                        transform: `translateY(${
                          isSpeaking || isListening
                            ? `${Math.max(-18, -2 - Math.round(audioLevel * 28))}px`
                            : '4px'
                        })`,
                        transition: 'transform 200ms ease-out',
                      }}
                    >
                      <svg
                        viewBox="0 0 400 160"
                        preserveAspectRatio="none"
                        className={`h-[64%] shrink-0 liquid-wave-track-reverse ${
                          isThinking || isSpeaking ? 'liquid-wave-track-fast' : ''
                        }`}
                      >
                        <defs>
                          <linearGradient id="liquidWaveFillB" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#FFF7ED" stopOpacity="0.85" />
                            <stop offset="50%" stopColor="#F97316" stopOpacity="0.48" />
                            <stop offset="100%" stopColor="#F43F5E" stopOpacity="0.62" />
                          </linearGradient>
                        </defs>
                        <path
                          d="M 0 70 C 60 110, 120 30, 180 70 C 240 110, 300 30, 360 70 C 380 85, 390 75, 400 70 L 400 160 L 0 160 Z"
                          fill="url(#liquidWaveFillB)"
                        />
                      </svg>
                    </div>

                    {/* Top-Left Curved Specular Glass Reflection Lens Highlight */}
                    <div className="absolute top-2 left-3.5 w-20 h-11 rounded-full bg-gradient-to-b from-white/90 via-white/35 to-transparent -rotate-18 pointer-events-none blur-[0.5px]" />

                    {/* Bottom-Right Subtle Rim Caustic Refraction */}
                    <div className="absolute bottom-2 right-3 w-16 h-8 rounded-full bg-gradient-to-t from-white/65 to-transparent rotate-12 pointer-events-none blur-[1px]" />
                  </div>
                </div>

                {/* Soft Pedestal Reflection Shadow Beneath the Liquid-Glass Orb */}
                <div className="w-32 h-4 rounded-full bg-gradient-to-r from-orange-400/25 via-rose-400/35 to-orange-400/25 blur-md mt-2.5" />
              </div>

              {/* Active Persona Title & Tone Subtitle */}
              <div className="space-y-1">
                <div className="font-display text-lg font-bold text-stone-900">
                  Aria ({activePersona.label})
                </div>
                <div className="text-xs text-stone-500">
                  Tone: {activePersona.tone}
                </div>
              </div>

              {/* Conversational Greeting / Live Latency Status Copy */}
              <div className="max-w-xs mx-auto space-y-1">
                {isThinking ? (
                  <>
                    <p className="text-sm text-stone-500 leading-relaxed">
                      Got it, let me verify that for you right now.
                    </p>
                    <p className="font-display text-base font-semibold text-orange-700 leading-snug">
                      {thinkingStep || 'Searching verified knowledge base...'}
                    </p>
                  </>
                ) : isSpeaking ? (
                  <>
                    <p className="text-sm text-stone-500 leading-relaxed">
                      Aria is speaking in {LANG_LABEL[language]}.
                    </p>
                    <p className="font-display text-base font-semibold text-stone-950 leading-snug">
                      Speak anytime to interrupt immediately
                    </p>
                  </>
                ) : isListening ? (
                  <>
                    <p className="text-sm text-stone-500 leading-relaxed">
                      Listening to your microphone at 16kHz PCM.
                    </p>
                    <p className="font-display text-base font-semibold text-stone-950 leading-snug">
                      Ask about pricing, security, or demo slots
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-base text-stone-500 leading-relaxed">
                      Hi! I&apos;m Aria, your AI Sales Assistant.
                    </p>
                    <p className="font-display text-lg font-bold text-stone-950 leading-snug">
                      How can I help you?
                    </p>
                  </>
                )}
              </div>

              {/* Flowing Multi-Wave Ribbon Animation Below Greeting */}
              <div className="w-56 h-12 relative overflow-hidden flex items-center justify-center">
                <div
                  className="w-full h-full flex items-center"
                  style={{
                    transform: `scaleY(${
                      isSpeaking || isListening
                        ? (0.95 + Math.min(1.15, audioLevel * 2.2)).toFixed(2)
                        : isThinking
                          ? '1.25'
                          : '0.85'
                    })`,
                    transition: 'transform 150ms ease-out',
                  }}
                >
                  <svg
                    viewBox="0 0 400 60"
                    preserveAspectRatio="none"
                    className={`w-[200%] h-10 shrink-0 liquid-wave-track ${
                      isThinking || isSpeaking ? 'liquid-wave-track-fast' : ''
                    }`}
                  >
                    <defs>
                      <linearGradient id="waveRibbon1" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#FB923C" stopOpacity="0.2" />
                        <stop offset="25%" stopColor="#EA580C" stopOpacity="0.85" />
                        <stop offset="50%" stopColor="#E11D48" stopOpacity="0.9" />
                        <stop offset="75%" stopColor="#EA580C" stopOpacity="0.85" />
                        <stop offset="100%" stopColor="#FB923C" stopOpacity="0.2" />
                      </linearGradient>
                      <linearGradient id="waveRibbon2" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#F43F5E" stopOpacity="0.15" />
                        <stop offset="50%" stopColor="#F59E0B" stopOpacity="0.65" />
                        <stop offset="100%" stopColor="#F43F5E" stopOpacity="0.15" />
                      </linearGradient>
                    </defs>
                    <path
                      d="M 0 30 Q 25 8, 50 30 T 100 30 T 150 30 T 200 30 T 250 30 T 300 30 T 350 30 T 400 30"
                      fill="none"
                      stroke="url(#waveRibbon1)"
                      strokeWidth="2.6"
                      strokeLinecap="round"
                    />
                    <path
                      d="M 0 30 Q 25 48, 50 30 T 100 30 T 150 30 T 200 30 T 250 30 T 300 30 T 350 30 T 400 30"
                      fill="none"
                      stroke="url(#waveRibbon2)"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                    />
                  </svg>
                </div>
              </div>
            </div>

            {/* Bottom Controls Modeled After Reference Image */}
            <div className="space-y-5">
              {/* Dark Pill Container with Inner Gradient Pill Button & Triple Chevrons (Start A New Chat / Guided Demo) */}
              <div className="rounded-full bg-stone-950 p-1.5 flex items-center justify-between shadow-sm">
                <button
                  type="button"
                  disabled={isSimulating || isRunningFullWorkflow}
                  onClick={onRunFullWorkflow}
                  className="px-5 py-2.5 rounded-full bg-gradient-to-r from-orange-600 via-rose-600 to-fuchsia-600 text-white text-xs font-semibold tracking-tight hover:brightness-105 transition-all disabled:opacity-50 cursor-pointer"
                >
                  {isRunningFullWorkflow
                    ? `Running Demo Step ${activeWorkflowStep ?? 1} of 5...`
                    : 'Run 1-Click Guided Demo'}
                </button>

                <button
                  type="button"
                  disabled={isSimulating || isRunningFullWorkflow}
                  onClick={onRunFullWorkflow}
                  aria-label="Run Guided Demo"
                  className="pr-4 pl-2 py-2 flex items-center text-stone-400 hover:text-white transition-colors cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4 -mr-2 text-stone-500" />
                  <ChevronRight className="w-4 h-4 -mr-2 text-stone-300" />
                  <ChevronRight className="w-4 h-4 text-white" />
                </button>
              </div>

              {/* Bottom 3-Control Microphone Bar (Summary Button | Tap To Start Speaking | Mute Toggle) */}
              <div className="flex items-center justify-between gap-3 pt-1">
                <button
                  type="button"
                  disabled={isGeneratingInsights || transcript.length === 0}
                  onClick={async () => {
                    setActiveRightTab('summary');
                    await onGenerateInsights();
                  }}
                  title="Generate Call Summary"
                  className="w-12 h-12 rounded-full bg-stone-100 border border-stone-200/80 flex items-center justify-center text-stone-700 hover:bg-stone-200/70 transition-colors disabled:opacity-40 cursor-pointer"
                >
                  <FileText className="w-4 h-4" />
                </button>

                {!isConnected ? (
                  <button
                    type="button"
                    disabled={isConnecting}
                    onClick={onStartLive}
                    className="flex-1 py-3 px-4 rounded-full bg-stone-100/90 hover:bg-orange-50 border border-stone-200/90 hover:border-orange-300 flex items-center justify-center gap-2 text-xs font-semibold text-stone-700 hover:text-orange-800 transition-all cursor-pointer"
                  >
                    <Mic className="w-4 h-4 text-orange-600" />
                    <span>{isConnecting ? 'Connecting Microphone...' : 'Tap To Start Speaking'}</span>
                  </button>
                ) : (
                  <div className="flex-1 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={onStopLive}
                      className="flex-1 py-3 px-4 rounded-full bg-rose-600 hover:bg-rose-500 text-white flex items-center justify-center gap-2 text-xs font-semibold transition-all cursor-pointer"
                    >
                      <PhoneOff className="w-4 h-4" />
                      <span>Tap To End Voice Call</span>
                    </button>
                    {isSpeaking && (
                      <button
                        type="button"
                        onClick={onTriggerBargeIn}
                        className="py-3 px-3.5 rounded-full bg-amber-100 text-amber-900 text-xs font-semibold hover:bg-amber-200 transition-colors cursor-pointer"
                      >
                        Interrupt
                      </button>
                    )}
                  </div>
                )}

                <button
                  type="button"
                  onClick={isConnected ? onToggleMute : onStartLive}
                  title={isMuted ? 'Unmute microphone' : 'Mute microphone'}
                  className={`w-12 h-12 rounded-full border flex items-center justify-center transition-colors cursor-pointer ${
                    isMuted
                      ? 'bg-rose-50 border-rose-200 text-rose-600'
                      : 'bg-stone-100 border-stone-200/80 text-stone-700 hover:bg-stone-200/70'
                  }`}
                >
                  {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Spacious Chatbot Conversation & Quick Actions Panel */}
        <div className="lg:col-span-7 flex flex-col">
          <div className="flex-1 rounded-3xl border border-stone-200/90 bg-white p-7 sm:p-8 shadow-xs flex flex-col justify-between min-h-[680px]">
            {/* Top Bar Inside Chatbot Panel: Segmented View Switcher + Clean Language & Sentiment Status */}
            <div className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-4 pb-5 border-b border-stone-200/80">
                <div className="flex items-center gap-1.5 bg-stone-100 p-1 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setActiveRightTab('conversation')}
                    className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                      activeRightTab === 'conversation'
                        ? 'bg-white text-stone-950 shadow-2xs'
                        : 'text-stone-600 hover:text-stone-900'
                    }`}
                  >
                    Chatbot ({transcript.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveRightTab('summary')}
                    className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                      activeRightTab === 'summary'
                        ? 'bg-white text-stone-950 shadow-2xs'
                        : 'text-stone-600 hover:text-stone-900'
                    }`}
                  >
                    Call Summary
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveRightTab('bant')}
                    className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                      activeRightTab === 'bant'
                        ? 'bg-white text-stone-950 shadow-2xs'
                        : 'text-stone-600 hover:text-stone-900'
                    }`}
                  >
                    Qualification ({activeLead.bant.totalScore})
                  </button>
                  {developerMode && (
                    <button
                      type="button"
                      onClick={() => setActiveRightTab('telemetry')}
                      className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                        activeRightTab === 'telemetry'
                          ? 'bg-white text-orange-700 shadow-2xs'
                          : 'text-orange-700/80 hover:text-orange-900'
                      }`}
                    >
                      Developer Logs ({toolLogs.length})
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-5 text-xs text-stone-500">
                  <span>
                    Language: <strong className="text-stone-900">{LANG_LABEL[language]}</strong>
                  </span>
                  <span>
                    Sentiment:{' '}
                    <span className={SENTIMENT_STYLE[sentiment].text}>
                      {SENTIMENT_STYLE[sentiment].label}
                    </span>
                  </span>
                </div>
              </div>

              {/* 1-Click Quick Prompt Buttons */}
              {activeRightTab === 'conversation' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {SIMPLE_QUICK_ACTIONS.map((action) => {
                    const Icon = action.icon;
                    const active = activeWorkflowStep === action.step;
                    return (
                      <button
                        key={action.id}
                        type="button"
                        disabled={isSimulating}
                        onClick={() => onSendSimulatedUtterance(action.utterance, action.step)}
                        className={`text-left p-3.5 rounded-2xl border transition-all cursor-pointer disabled:opacity-50 ${
                          active
                            ? 'border-orange-400 bg-orange-50/70'
                            : 'border-stone-200/90 bg-[#FAF8F5] hover:bg-orange-50/40 hover:border-orange-300'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-semibold text-stone-900 flex items-center gap-2">
                            <Icon className="w-4 h-4 text-orange-600 shrink-0" />
                            <span>{action.label}</span>
                          </span>
                          <ArrowRight className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                        </div>
                        <p className="text-xs text-stone-500 mt-1 pl-6 line-clamp-1">{action.desc}</p>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* TAB 1: Chatbot Conversation Stream */}
            {activeRightTab === 'conversation' && (
              <div className="flex-1 flex flex-col justify-between overflow-hidden my-5">
                <div className="flex-1 overflow-y-auto pr-1 space-y-5 max-h-[380px]">
                  {transcript.length === 0 && !streamingDraft.prospect && !streamingDraft.agent ? (
                    <div className="h-full min-h-[260px] flex flex-col items-center justify-center text-center px-6">
                      <h3 className="font-display text-base font-semibold text-stone-900">
                        No messages yet
                      </h3>
                      <p className="text-sm text-stone-500 mt-2 max-w-md leading-relaxed">
                        Click any quick action above, tap the microphone button on the left card to talk live, or type your question below.
                      </p>
                    </div>
                  ) : (
                    <>
                      {transcript.map((turn) => {
                        const isAgent = turn.speaker === 'agent';
                        return (
                          <div
                            key={turn.id}
                            className={`flex flex-col ${isAgent ? 'items-start' : 'items-end'}`}
                          >
                            <div className="flex items-center gap-3 text-xs text-stone-400 mb-1.5 px-1">
                              <span className="font-semibold text-stone-700">
                                {isAgent ? 'Aria (AI Sales Assistant)' : activeLead.name}
                              </span>
                              <span>{LANG_LABEL[turn.language]}</span>
                              <span className={SENTIMENT_STYLE[turn.sentiment].text}>
                                {SENTIMENT_STYLE[turn.sentiment].label}
                              </span>
                              {developerMode && (
                                <span className="font-mono tabular-nums text-stone-400">
                                  {turn.cacheHit ? `Cache ${turn.latencyMs}ms` : `${turn.latencyMs}ms`}
                                </span>
                              )}
                            </div>

                            <div
                              className={`max-w-[90%] rounded-2xl px-5 py-4 text-sm leading-relaxed ${
                                isAgent
                                  ? 'bg-[#FAF8F5] border border-stone-200/90 text-stone-900 rounded-tl-sm'
                                  : 'bg-stone-900 text-white rounded-tr-sm'
                              }`}
                            >
                              <p>{turn.text}</p>

                              {turn.toolCalls && turn.toolCalls.length > 0 && (
                                <div
                                  className={`mt-3 pt-3 border-t space-y-1.5 ${
                                    isAgent ? 'border-stone-200/80' : 'border-stone-700'
                                  }`}
                                >
                                  {developerMode ? (
                                    turn.toolCalls.map((tool) => (
                                      <div
                                        key={tool.id}
                                        className="text-xs font-mono tabular-nums text-stone-600 flex items-center justify-between gap-4"
                                      >
                                        <span className="truncate">
                                          <strong className="text-orange-700">{tool.name}</strong> ({tool.resultSummary})
                                        </span>
                                        <span className="text-stone-400 shrink-0">{tool.latencyMs}ms</span>
                                      </div>
                                    ))
                                  ) : (
                                    <div className="text-xs text-stone-500 flex items-center gap-2">
                                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                      <span>
                                        Verified: {turn.toolCalls.map((t) => t.resultSummary).join(', ')}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}

                      {/* Thinking / Latency State Bubble Inside Chat */}
                      {isThinking && (
                        <div className="flex flex-col items-start">
                          <div className="text-xs font-semibold text-orange-700 mb-1.5 px-1">
                            Aria is thinking
                          </div>
                          <div className="rounded-2xl rounded-tl-sm border border-orange-200 bg-orange-50/70 px-5 py-3.5 flex items-center gap-3">
                            <Loader2 className="w-4 h-4 text-orange-600 animate-spin shrink-0" />
                            <div className="text-xs text-stone-700">
                              <div className="font-semibold text-stone-900">
                                {thinkingStep || 'Checking enterprise knowledge base...'}
                              </div>
                              <div className="text-stone-500 mt-0.5">
                                Retrieving verified pricing, compliance, and calendar availability
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {(streamingDraft.prospect || streamingDraft.agent) && (
                        <div className="rounded-2xl border border-orange-200 bg-orange-50/50 p-4 space-y-2">
                          {streamingDraft.prospect && (
                            <div className="text-xs text-stone-700">
                              <span className="font-semibold text-stone-900">Customer (live): </span>
                              {streamingDraft.prospect}
                            </div>
                          )}
                          {streamingDraft.agent && (
                            <div className="text-xs text-orange-950">
                              <span className="font-semibold text-orange-700">Aria (live): </span>
                              {streamingDraft.agent}
                            </div>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}

            {/* TAB 2: Post-Call Executive Summary */}
            {activeRightTab === 'summary' && (
              <div className="flex-1 overflow-y-auto my-5 pr-1 space-y-6 max-h-[450px]">
                {!insightReport ? (
                  <div className="h-full min-h-[300px] flex flex-col items-center justify-center text-center px-6">
                    <FileText className="w-8 h-8 text-orange-600 mb-3" />
                    <h3 className="font-display text-base font-semibold text-stone-900">
                      Generate Executive Call Summary
                    </h3>
                    <p className="text-sm text-stone-500 mt-1.5 max-w-sm leading-relaxed">
                      Summarize the conversation into a qualification verdict, conversion probability, objection breakdown, and follow-up email.
                    </p>
                    <Button
                      variant="gradient"
                      className="mt-5"
                      disabled={isGeneratingInsights || transcript.length === 0}
                      onClick={onGenerateInsights}
                    >
                      {isGeneratingInsights ? 'Generating Summary...' : 'Generate Call Summary'}
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="grid grid-cols-3 gap-4 pb-5 border-b border-stone-200">
                      <div>
                        <div className="text-xs text-stone-500">Qualification Verdict</div>
                        <div className="text-sm font-semibold text-stone-900 mt-1">
                          {insightReport.qualificationVerdict}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-stone-500">Conversion Probability</div>
                        <div className="text-xl font-mono tabular-nums font-bold text-emerald-600 mt-1">
                          {insightReport.conversionProbability}%
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-stone-500">BANT Lead Score</div>
                        <div className="text-xl font-mono tabular-nums font-bold text-orange-600 mt-1">
                          {insightReport.bantScorecard.totalScore}/100
                        </div>
                      </div>
                    </div>

                    <div>
                      <h4 className="text-xs font-semibold text-stone-700 mb-1.5">Executive Summary</h4>
                      <p className="text-sm text-stone-800 leading-relaxed">{insightReport.executiveSummary}</p>
                    </div>

                    <div>
                      <h4 className="text-xs font-semibold text-stone-700 mb-2">Objections and Resolution</h4>
                      {insightReport.objectionsBreakdown.length === 0 ? (
                        <p className="text-xs text-stone-500">No major objections raised during this session.</p>
                      ) : (
                        <div className="divide-y divide-stone-200 border-t border-stone-200">
                          {insightReport.objectionsBreakdown.map((obj, idx) => (
                            <div key={idx} className="py-3 space-y-1 text-xs">
                              <div className="flex items-center justify-between gap-3">
                                <span className="font-semibold text-stone-900">{obj.objection}</span>
                                <span className={obj.resolved ? 'text-emerald-700 font-medium' : 'text-amber-700'}>
                                  {obj.category} ({obj.resolved ? 'Resolved' : 'Follow-Up'})
                                </span>
                              </div>
                              <p className="text-stone-600 leading-relaxed">{obj.resolutionStrategy}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="pt-3 border-t border-stone-200">
                      <h4 className="text-xs font-semibold text-stone-700 mb-1.5">Recommended Next Step</h4>
                      <p className="text-xs text-orange-700 font-medium flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 shrink-0" />
                        <span>{insightReport.nextBestAction}</span>
                      </p>
                    </div>

                    <div className="pt-3 border-t border-stone-200 space-y-2">
                      <h4 className="text-xs font-semibold text-stone-700">Follow-Up Email Draft</h4>
                      <div className="rounded-2xl bg-[#FAF8F5] border border-stone-200 p-4 text-xs space-y-2">
                        <div className="font-semibold text-stone-900">
                          Subject: {insightReport.recommendedFollowUpEmail.subject}
                        </div>
                        <p className="text-stone-700 whitespace-pre-line leading-relaxed">
                          {insightReport.recommendedFollowUpEmail.body}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: Customer Qualification (BANT & Cross-Call Memory) */}
            {activeRightTab === 'bant' && (
              <div className="flex-1 overflow-y-auto my-5 pr-1 space-y-6 max-h-[450px]">
                <div>
                  <div className="flex items-baseline justify-between mb-4">
                    <h3 className="text-sm font-semibold text-stone-900">BANT Qualification Scorecard</h3>
                    <span className="font-mono tabular-nums text-sm font-bold text-orange-600">
                      {activeLead.bant.totalScore} / 100
                    </span>
                  </div>

                  <div className="space-y-4">
                    {(
                      [
                        { key: 'budget', label: 'Budget', data: activeLead.bant.budget },
                        { key: 'authority', label: 'Decision Authority', data: activeLead.bant.authority },
                        { key: 'need', label: 'Business Need', data: activeLead.bant.need },
                        { key: 'timeline', label: 'Target Timeline', data: activeLead.bant.timeline },
                      ] as const
                    ).map((item) => (
                      <div key={item.key} className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-stone-800">
                            {item.label}{' '}
                            <span className="text-stone-400 font-normal">({item.data.status})</span>
                          </span>
                          <span className="font-mono tabular-nums text-stone-700">{item.data.score} / 25</span>
                        </div>
                        <Progress value={(item.data.score / 25) * 100} />
                        <p className="text-xs text-stone-600 leading-relaxed">{item.data.evidence}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-4 border-t border-stone-200 space-y-3">
                  <h3 className="text-sm font-semibold text-stone-900">Cross-Call Customer Memory</h3>
                  {activeLead.priorCalls.length === 0 ? (
                    <p className="text-xs text-stone-500">No prior calls recorded.</p>
                  ) : (
                    <div className="space-y-3">
                      {activeLead.priorCalls.map((call) => (
                        <div key={call.callId} className="pb-3 border-b border-stone-200/70 last:border-b-0">
                          <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-stone-500">
                            <span>{call.date}</span>
                            <span>{call.callId}</span>
                            <span>{LANG_LABEL[call.languageUsed]}</span>
                            <span>Sentiment: {call.lastSentiment}</span>
                          </div>
                          <p className="text-xs text-stone-700 mt-1.5 leading-relaxed">{call.summary}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 4: Developer Telemetry */}
            {activeRightTab === 'telemetry' && developerMode && (
              <div className="flex-1 overflow-y-auto my-5 pr-1 space-y-6 max-h-[450px]">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-stone-900">
                      Hybrid RAG Grounding Verification (Cutoff {devConfig.ragThreshold.toFixed(2)})
                    </h3>
                    {latestRag && (
                      <span
                        className={`text-xs font-mono tabular-nums font-semibold flex items-center gap-1.5 ${
                          latestRag.passedGuardrail ? 'text-emerald-700' : 'text-rose-700'
                        }`}
                      >
                        {latestRag.passedGuardrail ? (
                          <ShieldCheck className="w-3.5 h-3.5" />
                        ) : (
                          <ShieldAlert className="w-3.5 h-3.5" />
                        )}
                        {latestRag.passedGuardrail
                          ? `PASS (${latestRag.topScore.toFixed(2)} >= ${(latestRag.thresholdUsed ?? devConfig.ragThreshold).toFixed(2)})`
                          : `BLOCKED (${latestRag.topScore.toFixed(2)} < ${(latestRag.thresholdUsed ?? devConfig.ragThreshold).toFixed(2)})`}
                      </span>
                    )}
                  </div>

                  {!latestRag ? (
                    <p className="text-xs text-stone-500">
                      Trigger any quick action or test query to inspect Dense and BM25 scores.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex flex-wrap items-center gap-4 text-xs text-stone-600">
                        <span>
                          Query: <strong className="text-stone-900">&ldquo;{latestRag.query}&rdquo;</strong>
                        </span>
                        <span>
                          Latency: <strong className="font-mono tabular-nums text-orange-700">{latestRag.latencyMs}ms</strong>
                        </span>
                      </div>

                      {!latestRag.passedGuardrail && latestRag.fallbackMessage && (
                        <div className="rounded-2xl border border-rose-300 bg-rose-50 p-3.5 text-xs text-rose-900">
                          <div className="font-semibold mb-1">Zero-Hallucination Guardrail Enforced</div>
                          {latestRag.fallbackMessage}
                        </div>
                      )}

                      <div className="divide-y divide-stone-200 border-t border-stone-200">
                        {latestRag.citations.map((c) => (
                          <div key={c.docId} className="py-3 space-y-1">
                            <div className="flex items-center justify-between gap-2 text-xs">
                              <span className="font-semibold text-stone-900">
                                {c.docId} ({c.title})
                              </span>
                              <span
                                className={`font-mono tabular-nums font-semibold shrink-0 ${
                                  c.passedGuardrail ? 'text-emerald-700' : 'text-stone-400'
                                }`}
                              >
                                Hybrid {c.hybridScore.toFixed(2)}
                              </span>
                            </div>
                            <div className="flex flex-wrap items-center gap-4 text-xs font-mono tabular-nums text-stone-500">
                              <span>Dense: {c.denseScore.toFixed(2)}</span>
                              <span>Lexical BM25: {c.lexicalScore.toFixed(2)}</span>
                              <span>Category: {c.category}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="pt-4 border-t border-stone-200 space-y-3">
                  <h3 className="text-sm font-semibold text-stone-900 flex items-center gap-2">
                    <Code2 className="w-4 h-4 text-orange-600" />
                    <span>Tool Execution Log ({toolLogs.length})</span>
                  </h3>

                  {toolLogs.length === 0 ? (
                    <p className="text-xs text-stone-500">No tool calls executed yet.</p>
                  ) : (
                    <div className="divide-y divide-stone-200">
                      {toolLogs.map((log) => (
                        <div key={log.id} className="py-3 space-y-1.5 text-xs">
                          <div className="flex items-center justify-between gap-3">
                            <span className="font-mono font-semibold text-orange-700">
                              {log.name} ({log.nonBlocking ? 'NON_BLOCKING' : 'SYNC'})
                            </span>
                            <span className="font-mono tabular-nums text-stone-500">{log.latencyMs}ms</span>
                          </div>
                          <div className="text-stone-700">{log.resultSummary}</div>
                          {showRawJson && (
                            <pre className="rounded-xl bg-stone-900 text-amber-200 p-3 text-xs font-mono overflow-x-auto">
                              {JSON.stringify({ args: log.args, status: log.status, timestamp: log.timestamp }, null, 2)}
                            </pre>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Bottom Dock Inside Chatbot Panel: Direct Message Input + Clean Qualification & Booking Strip */}
            <div className="space-y-4 pt-4 border-t border-stone-200/80">
              <form onSubmit={handleSubmitCustom} className="flex items-center gap-3">
                <input
                  type="text"
                  value={customUtterance}
                  onChange={(e) => setCustomUtterance(e.target.value)}
                  placeholder="Type a message to Aria in English, Hindi, or Hinglish..."
                  className="flex-1 rounded-2xl bg-[#FAF8F5] border border-stone-200/90 px-4 py-3 text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:border-orange-500 focus:bg-white transition-colors"
                />
                <Button
                  type="submit"
                  variant="gradient"
                  className="h-11 px-5 rounded-2xl"
                  disabled={isSimulating || !customUtterance.trim()}
                >
                  <Send className="w-4 h-4" />
                  <span>{isSimulating ? 'Sending...' : 'Send'}</span>
                </Button>
              </form>

              <div className="grid grid-cols-3 gap-4 pt-2 text-xs">
                <div>
                  <span className="text-stone-400 block">Customer Profile</span>
                  <span className="font-semibold text-stone-900 mt-0.5 block truncate">
                    {activeLead.name} ({activeLead.company})
                  </span>
                </div>
                <div>
                  <span className="text-stone-400 block">Qualification Readiness</span>
                  <span className="font-mono tabular-nums font-bold text-orange-600 mt-0.5 block">
                    {activeLead.bant.totalScore} / 100 ({activeLead.stage})
                  </span>
                </div>
                <div>
                  <span className="text-stone-400 block">Demo Appointment</span>
                  <span className="font-semibold text-stone-900 mt-0.5 block truncate">
                    {bookedSlot ? `${bookedSlot.dayLabel} at ${bookedSlot.timeSlot}` : '5 open slots available'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
