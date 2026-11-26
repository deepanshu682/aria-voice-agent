'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Code2, Mic, PhoneOff, Sparkles } from 'lucide-react';
import VoiceStudioView from './VoiceStudioView';
import KnowledgeRagView from './KnowledgeRagView';
import CrmCalendarView from './CrmCalendarView';
import ArchitectureScaleView from './ArchitectureScaleView';
import { useLiveVoiceSession } from './useLiveVoiceSession';
import { Button } from './ui/button';
import { Switch } from './ui/controls';
import {
  CalendarSlot,
  CallInsightReport,
  DeveloperConfig,
  KnowledgeCategory,
  KnowledgeChunk,
  LanguageCode,
  LeadProfile,
  RagSearchResult,
  SemanticCacheEntry,
  SentimentLabel,
  ToolExecutionLog,
  TranscriptTurn,
} from '@/lib/types';
import { END_TO_END_WORKFLOW_STAGES } from '@/lib/workflow-scenarios';

type WorkspaceTab = 'studio' | 'rag' | 'crm' | 'architecture';

interface AppShellProps {
  initialLead: LeadProfile;
  initialLeads: LeadProfile[];
  initialSlots: CalendarSlot[];
  initialChunks: KnowledgeChunk[];
  initialCacheStats: {
    totalHits: number;
    totalMisses: number;
    hitRatePercent: number;
    avgLatencyMs: number;
    entries: SemanticCacheEntry[];
  };
}

export default function AppShell({
  initialLead,
  initialLeads,
  initialSlots,
  initialChunks,
  initialCacheStats,
}: AppShellProps) {
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('studio');
  const [developerMode, setDeveloperMode] = useState<boolean>(false);
  const [devConfig, setDevConfig] = useState<DeveloperConfig>({
    ragThreshold: 0.72,
    topK: 3,
    vadThreshold: 0.022,
    voiceName: 'Zephyr',
    ttsEnabled: true,
  });

  const [activeLead, setActiveLead] = useState<LeadProfile>(initialLead);
  const [leads, setLeads] = useState<LeadProfile[]>(initialLeads);
  const [calendarSlots, setCalendarSlots] = useState<CalendarSlot[]>(initialSlots);
  const [knowledgeChunks, setKnowledgeChunks] = useState<KnowledgeChunk[]>(initialChunks);
  const [cacheStats, setCacheStats] = useState(initialCacheStats);

  const [transcript, setTranscript] = useState<TranscriptTurn[]>([]);
  const [toolLogs, setToolLogs] = useState<ToolExecutionLog[]>([]);
  const [latestRag, setLatestRag] = useState<RagSearchResult | null>(null);
  const [sentiment, setSentiment] = useState<SentimentLabel>(initialLead.lastSentiment);
  const [language, setLanguage] = useState<LanguageCode>(initialLead.preferredLanguage);

  const [isSimulating, setIsSimulating] = useState(false);
  const [thinkingStep, setThinkingStep] = useState<string | null>(null);
  const [isRunningFullWorkflow, setIsRunningFullWorkflow] = useState(false);
  const [activeWorkflowStep, setActiveWorkflowStep] = useState<number | null>(null);
  const [insightReport, setInsightReport] = useState<CallInsightReport | null>(null);
  const [isGeneratingInsights, setIsGeneratingInsights] = useState(false);

  const transcriptRef = useRef<TranscriptTurn[]>(transcript);
  useEffect(() => {
    transcriptRef.current = transcript;
  }, [transcript]);

  const refreshServerState = useCallback(async () => {
    const res = await fetch('/api/state');
    if (!res.ok) return;
    const data = await res.json();
    if (data.activeLead) setActiveLead(data.activeLead);
    if (data.leads) setLeads(data.leads);
    if (data.calendarSlots) setCalendarSlots(data.calendarSlots);
    if (data.knowledgeChunks) setKnowledgeChunks(data.knowledgeChunks);
    if (data.semanticCache) setCacheStats(data.semanticCache);
  }, []);

  const live = useLiveVoiceSession({
    onTranscriptUpdate: (turn) => {
      setTranscript((prev) => [...prev, turn]);
    },
    onToolExecuted: (log) => {
      setThinkingStep(`Executing ${log.name}...`);
      setToolLogs((prev) => [log, ...prev]);
    },
    onRagResult: (rag) => {
      setLatestRag(rag);
    },
    onLeadUpdated: (updated) => {
      setActiveLead(updated);
      setLeads((prev) => prev.map((l) => (l.id === updated.id ? updated : l)));
    },
    onCalendarUpdated: (slots) => {
      setCalendarSlots(slots);
    },
    onSentimentChanged: (nextSent, nextLang) => {
      setSentiment(nextSent);
      setLanguage(nextLang);
    },
    onBargeIn: () => {
      setThinkingStep(null);
    },
  });

  const handleUpdateDevConfig = useCallback(
    (patch: Partial<DeveloperConfig>) => {
      setDevConfig((prev) => {
        const next = { ...prev, ...patch };
        if (patch.vadThreshold !== undefined) {
          live.updateVadThreshold(patch.vadThreshold);
        }
        return next;
      });
    },
    [live]
  );

  const handleSendSimulatedUtterance = useCallback(
    async (utterance: string, stageStep?: number) => {
      setIsSimulating(true);
      if (stageStep !== undefined) setActiveWorkflowStep(stageStep);
      live.setLiveError(null);
      live.setAgentState('THINKING');
      setThinkingStep('Analyzing intent & checking L1 Semantic Fast-Path Cache...');

      const stepTimer = window.setTimeout(() => {
        setThinkingStep('Searching Hybrid RAG Knowledge Base & scoring BANT...');
      }, 650);

      const prospectTurnId = `SIM-U-${Date.now()}`;
      const optimisticProspectTurn: TranscriptTurn = {
        id: prospectTurnId,
        speaker: 'prospect',
        text: utterance,
        language,
        sentiment,
        sentimentScore: 0.1,
        latencyMs: 12,
        cacheHit: false,
        timestamp: new Date().toISOString(),
      };

      const historySnapshot = [...transcriptRef.current];
      setTranscript((prev) => [...prev, optimisticProspectTurn]);

      try {
        const res = await fetch('/api/simulator/turn', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            utterance,
            history: historySnapshot.map((h) => ({ speaker: h.speaker, text: h.text })),
            voiceName: devConfig.voiceName,
            enableTts: devConfig.ttsEnabled,
            ragThreshold: devConfig.ragThreshold,
            topK: devConfig.topK,
          }),
        });

        window.clearTimeout(stepTimer);
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Simulator request failed.');
        }

        const detectedLang = (data.language as LanguageCode) ?? 'en';
        const detectedSent = (data.sentiment as SentimentLabel) ?? 'neutral';
        setLanguage(detectedLang);
        setSentiment(detectedSent);

        setTranscript((prev) =>
          prev.map((t) =>
            t.id === prospectTurnId
              ? {
                  ...t,
                  language: detectedLang,
                  sentiment: detectedSent,
                  sentimentScore: typeof data.sentimentScore === 'number' ? data.sentimentScore : 0.1,
                }
              : t
          )
        );

        const executedLogs = (data.toolLogs as ToolExecutionLog[]) ?? [];
        if (executedLogs.length > 0) {
          setToolLogs((prev) => [...executedLogs, ...prev]);
        }
        if (data.ragResult) {
          setLatestRag(data.ragResult as RagSearchResult);
        }
        if (data.activeLead) setActiveLead(data.activeLead as LeadProfile);
        if (data.leads) setLeads(data.leads as LeadProfile[]);
        if (data.calendarSlots) setCalendarSlots(data.calendarSlots as CalendarSlot[]);
        if (data.semanticCache) setCacheStats(data.semanticCache);

        const agentTurn: TranscriptTurn = {
          id: `SIM-A-${Date.now() + 1}`,
          speaker: 'agent',
          text: String(data.agentText ?? ''),
          language: detectedLang,
          sentiment: detectedSent === 'frustrated' ? 'neutral' : 'positive',
          sentimentScore: 0.55,
          latencyMs: typeof data.latencyMs === 'number' ? data.latencyMs : 180,
          cacheHit: Boolean(data.cacheHit),
          timestamp: new Date().toISOString(),
          toolCalls: executedLogs,
          ragCitations: data.ragResult?.citations,
        };

        setTranscript((prev) => [...prev, agentTurn]);
        setThinkingStep(null);

        if (devConfig.ttsEnabled && typeof data.audioWavBase64 === 'string' && data.audioWavBase64.length > 0) {
          live.playWavBase64(data.audioWavBase64, detectedSent);
        } else {
          live.setAgentState(detectedSent === 'frustrated' || detectedSent === 'hesitant' ? 'DEESCALATING' : 'IDLE');
        }
      } catch (err) {
        window.clearTimeout(stepTimer);
        const message = err instanceof Error ? err.message : 'Unable to process turn.';
        live.setLiveError(message);
        live.setAgentState('IDLE');
        setThinkingStep(null);
      } finally {
        setIsSimulating(false);
      }
    },
    [devConfig, language, live, sentiment]
  );

  const handleGenerateInsights = useCallback(async () => {
    if (transcriptRef.current.length === 0) return;
    setIsGeneratingInsights(true);
    setThinkingStep('Synthesizing Post-Call Executive Summary & Follow-Up Email...');
    live.setAgentState('THINKING');
    live.setLiveError(null);
    try {
      const res = await fetch('/api/insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcript: transcriptRef.current,
          callDurationSec: Math.max(60, transcriptRef.current.length * 26),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Insights generation failed.');
      setInsightReport(data as CallInsightReport);
      await refreshServerState();
    } catch (err) {
      live.setLiveError(err instanceof Error ? err.message : 'Failed to generate insights.');
    } finally {
      setIsGeneratingInsights(false);
      setThinkingStep(null);
      live.setAgentState('IDLE');
    }
  }, [live, refreshServerState]);

  const handleRunFullWorkflow = useCallback(async () => {
    setIsRunningFullWorkflow(true);
    setInsightReport(null);
    try {
      for (const stage of END_TO_END_WORKFLOW_STAGES) {
        await handleSendSimulatedUtterance(stage.prospectUtterance, stage.stepNumber);
        await new Promise((r) => setTimeout(r, 850));
      }
      await handleGenerateInsights();
    } finally {
      setIsRunningFullWorkflow(false);
      setActiveWorkflowStep(null);
    }
  }, [handleGenerateInsights, handleSendSimulatedUtterance]);

  const handleResetSession = useCallback(async () => {
    live.stopLiveSession();
    setTranscript([]);
    setToolLogs([]);
    setLatestRag(null);
    setInsightReport(null);
    setActiveWorkflowStep(null);
    setThinkingStep(null);
    setSentiment('neutral');
    setLanguage('hinglish');
    await fetch('/api/state', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'reset' }),
    });
    await refreshServerState();
  }, [live, refreshServerState]);

  const handleAddChunk = useCallback(
    async (chunk: { title: string; category: KnowledgeCategory; content: string; keywords: string[] }) => {
      const res = await fetch('/api/state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'add_kb_chunk', chunk }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.knowledgeChunks) setKnowledgeChunks(data.knowledgeChunks);
      }
    },
    []
  );

  const handleSelectLead = useCallback(async (leadId: string) => {
    const res = await fetch('/api/state', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'select_lead', leadId }),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.activeLead) {
        setActiveLead(data.activeLead);
        setSentiment(data.activeLead.lastSentiment);
        setLanguage(data.activeLead.preferredLanguage);
      }
    }
  }, []);

  const handleBookSlot = useCallback(
    async (slotId: string) => {
      const res = await fetch('/api/calendar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'book',
          slotId,
          leadName: activeLead.name,
          company: activeLead.company,
          email: activeLead.email,
        }),
      });
      const data = await res.json();
      if (data.slots) setCalendarSlots(data.slots);
      if (data.leads) setLeads(data.leads);
      if (data.activeLead) setActiveLead(data.activeLead);
      return { success: Boolean(data.success), error: data.error as string | undefined };
    },
    [activeLead]
  );

  const handleReleaseSlot = useCallback(async (slotId: string) => {
    const res = await fetch('/api/calendar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'release', slotId }),
    });
    const data = await res.json();
    if (data.slots) setCalendarSlots(data.slots);
  }, []);

  const handleCreateLead = useCallback(
    async (lead: { name: string; company: string; email: string; role: string; preferredLanguage: LanguageCode }) => {
      const res = await fetch('/api/crm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(lead),
      });
      const data = await res.json();
      if (data.activeLead) setActiveLead(data.activeLead);
      if (data.leads) setLeads(data.leads);
    },
    []
  );

  return (
    <div className="min-h-screen flex flex-col bg-[#FAF8F5] text-stone-900">
      {/* 3-Zone Top Navigation Bar with Simple vs. Developer Mode Toggle */}
      <header className="sticky top-0 z-30 border-b border-stone-200/90 bg-white/95">
        <div className="max-w-[1440px] mx-auto px-5 sm:px-8 h-16 flex items-center justify-between gap-8">
          {/* Zone 1: Single-line Brand Wordmark */}
          <button
            type="button"
            onClick={() => setActiveTab('studio')}
            className="font-display text-lg font-bold tracking-tight text-stone-950 whitespace-nowrap shrink-0 cursor-pointer"
          >
            AetherCloud Aria
          </button>

          {/* Zone 2: Concise Navigation Links */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium">
            {(
              [
                { id: 'studio', label: 'Voice & Chat' },
                { id: 'crm', label: 'Meetings & Customers' },
                { id: 'rag', label: 'Knowledge Base' },
                { id: 'architecture', label: 'Architecture & Scale' },
              ] as const
            ).map((nav) => {
              const active = activeTab === nav.id;
              return (
                <button
                  key={nav.id}
                  type="button"
                  onClick={() => setActiveTab(nav.id)}
                  className={`py-1 border-b-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    active
                      ? 'border-orange-600 text-stone-950 font-semibold'
                      : 'border-transparent text-stone-500 hover:text-stone-900'
                  }`}
                >
                  {nav.label}
                </button>
              );
            })}
          </nav>

          {/* Zone 3: Top Header Mode Switch (Simple Mode vs Developer Mode) + Primary Call Action */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="flex items-center gap-2 rounded-xl border border-stone-200 bg-stone-50 px-3 py-1.5">
              {developerMode ? (
                <Code2 className="w-3.5 h-3.5 text-orange-600" />
              ) : (
                <Sparkles className="w-3.5 h-3.5 text-orange-600" />
              )}
              <span className="text-xs font-medium text-stone-700 whitespace-nowrap">
                {developerMode ? 'Developer Mode' : 'Simple Mode'}
              </span>
              <Switch
                checked={developerMode}
                onCheckedChange={setDeveloperMode}
                label="Toggle Developer Mode"
              />
            </div>

            {!live.isConnected ? (
              <Button
                variant="gradient"
                onClick={() => {
                  setActiveTab('studio');
                  void live.startLiveSession(devConfig.voiceName);
                }}
                disabled={live.isConnecting}
              >
                <Mic className="w-3.5 h-3.5" />
                <span>{live.isConnecting ? 'Connecting...' : 'Start Voice Call'}</span>
              </Button>
            ) : (
              <Button variant="destructive" onClick={live.stopLiveSession}>
                <PhoneOff className="w-3.5 h-3.5" />
                <span>End Call</span>
              </Button>
            )}
          </div>
        </div>

        {/* Mobile Compact Nav Row */}
        <div className="md:hidden border-t border-stone-200 px-4 py-2.5 flex items-center gap-5 overflow-x-auto text-xs font-medium bg-white">
          {(
            [
              { id: 'studio', label: 'Voice & Chat' },
              { id: 'crm', label: 'Meetings & Customers' },
              { id: 'rag', label: 'Knowledge Base' },
              { id: 'architecture', label: 'Architecture & Scale' },
            ] as const
          ).map((nav) => (
            <button
              key={nav.id}
              type="button"
              onClick={() => setActiveTab(nav.id)}
              className={`whitespace-nowrap shrink-0 ${
                activeTab === nav.id ? 'text-orange-600 font-semibold' : 'text-stone-500'
              }`}
            >
              {nav.label}
            </button>
          ))}
        </div>
      </header>

      {/* Main Content Workspace */}
      <main className="flex-1 max-w-[1440px] w-full mx-auto px-6 sm:px-10 py-8 sm:py-10">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
          >
            {activeTab === 'studio' && (
              <VoiceStudioView
                developerMode={developerMode}
                devConfig={devConfig}
                thinkingStep={thinkingStep}
                agentState={live.agentState}
                audioLevel={live.audioLevel}
                sentiment={sentiment}
                language={language}
                isConnected={live.isConnected}
                isConnecting={live.isConnecting}
                isMuted={live.isMuted}
                bargeInCount={live.bargeInCount}
                lastBargeInMs={live.lastBargeInMs}
                liveError={live.liveError}
                streamingDraft={live.streamingDraft}
                transcript={transcript}
                toolLogs={toolLogs}
                latestRag={latestRag}
                activeLead={activeLead}
                calendarSlots={calendarSlots}
                isSimulating={isSimulating}
                isRunningFullWorkflow={isRunningFullWorkflow}
                activeWorkflowStep={activeWorkflowStep}
                insightReport={insightReport}
                isGeneratingInsights={isGeneratingInsights}
                onUpdateDevConfig={handleUpdateDevConfig}
                onStartLive={() => void live.startLiveSession(devConfig.voiceName)}
                onStopLive={live.stopLiveSession}
                onToggleMute={live.toggleMute}
                onTriggerBargeIn={live.triggerManualBargeIn}
                onSendSimulatedUtterance={handleSendSimulatedUtterance}
                onRunFullWorkflow={handleRunFullWorkflow}
                onGenerateInsights={handleGenerateInsights}
                onResetSession={handleResetSession}
              />
            )}

            {activeTab === 'rag' && (
              <KnowledgeRagView
                chunks={knowledgeChunks}
                ragThreshold={devConfig.ragThreshold}
                topK={devConfig.topK}
                onUpdateThreshold={(v) => handleUpdateDevConfig({ ragThreshold: v })}
                onUpdateTopK={(k) => handleUpdateDevConfig({ topK: k })}
                cacheStats={cacheStats}
                onAddChunk={handleAddChunk}
              />
            )}

            {activeTab === 'crm' && (
              <CrmCalendarView
                leads={leads}
                activeLead={activeLead}
                slots={calendarSlots}
                onSelectLead={handleSelectLead}
                onBookSlot={handleBookSlot}
                onReleaseSlot={handleReleaseSlot}
                onCreateLead={handleCreateLead}
              />
            )}

            {activeTab === 'architecture' && <ArchitectureScaleView />}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}
