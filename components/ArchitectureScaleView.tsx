'use client';

import React, { useState } from 'react';
import {
  Activity,
  Calculator,
  Cpu,
  Database,
  Globe,
  Layers,
  Lock,
  Server,
  ShieldCheck,
} from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Slider } from './ui/controls';

const MERMAID_ARCHITECTURE_SOURCE = `flowchart LR
  subgraph Client["Client Edge (Browser / Telephony WebRTC)"]
    MIC["AudioWorklet 16kHz PCM<br/>20ms Frames + Client VAD <20ms"]
    UI["2D Voice Assistant Card & Chatbot Split View<br/>60fps Live Audio Waveform"]
    RING["24kHz Jitter Ring Buffer<br/>Instant Barge-In Flush"]
  end

  subgraph Edge["Stateless Media & WS Gateway Cluster (Multi-Region)"]
    LB["Global Anycast WSS Load Balancer<br/>TLS 1.3 + Sticky Session Hash"]
    WS["Stateless Node/Rust Media Workers<br/>Auto-scale 100k Concurrent Streams"]
    CACHE["Redis Cluster L1 Semantic Cache<br/><35ms FAQ & Anchor Fast-Path"]
  end

  subgraph AI["Google Gemini Live & Intelligence Layer"]
    LIVE["Gemini Live API (gemini-3.8-live)<br/>BidiGenerateContent + Native Audio"]
    TOOLS["Non-Blocking Tool Dispatcher<br/>Behavior.NON_BLOCKING"]
    INSIGHTS["Post-Call Pipeline (gemini-4-hydrogen)<br/>Structured JSON Executive Report"]
  end

  subgraph Data["Enterprise Data & Persistence Plane"]
    RAG["Hybrid RAG Engine (pgvector + BM25)<br/>Configurable Confidence Guardrail"]
    PG["PostgreSQL + PgBouncer Pool<br/>Multi-Tenant RLS + Cross-Call Memory"]
    CRM["CRM & Calendar Sync<br/>Atomic Slot Lock + Double-Book Guard"]
  end

  MIC -->|Binary/JSON WSS| LB --> WS
  WS <-->|Bidi Audio| LIVE
  WS -->|Fast-Path Check| CACHE
  LIVE -->|24kHz PCM + Transcripts| WS --> RING
  WS -->|Telemetry| UI
  LIVE -->|Async Function Calls| TOOLS
  TOOLS --> RAG
  TOOLS --> CRM
  CRM --> PG
  WS -->|On Call End| INSIGHTS --> PG`;

const ARCHITECTURE_LAYERS = [
  {
    id: 'client',
    title: '01. Browser Audio Pipeline and 2D Voice Equalizer',
    latency: '< 20 ms Barge-In',
    icon: Activity,
    summary:
      'Dedicated AudioWorklet thread emits 16 kHz Int16 PCM frames every 20 ms while running local RMS VAD to flush the 24 kHz jitter ring buffer in <20 ms upon user interruption.',
    specs: [
      '16 kHz mono PCM upstream and 24 kHz gapless AudioBufferSourceNode downstream',
      'Lightweight 2D SVG luminous voice ring and 9-bar live audio equalizer',
      'Responsive THINKING state with live tool step progress inside the voice card and chat stream',
    ],
  },
  {
    id: 'gateway',
    title: '02. Stateless Media Workers and Semantic Cache',
    latency: '< 35 ms Cache Hit',
    icon: Server,
    summary:
      'Horizontally autoscaled stateless WebSocket media relays behind Anycast L7 load balancers, backed by a sharded Redis Cluster serving L1 semantic FAQ/pricing cache and active session state.',
    specs: [
      'Supports 100,000 concurrent users (~10,000 peak simultaneous live audio streams)',
      '200 stateless media pods (50 concurrent full-duplex streams per pod @ 2 vCPU)',
      'Redis Cluster absorbs 35–42% of repetitive greetings, hours, and pricing anchors',
    ],
  },
  {
    id: 'ai',
    title: '03. Gemini Live API and Non-Blocking Orchestration',
    latency: '180–320 ms TTFT',
    icon: Cpu,
    summary:
      'Native speech-to-speech interaction via gemini-3.8-live with dual-stream input/output transcriptions, affective tone mirroring, multilingual EN/HI/Hinglish code-switching, and Behavior.NON_BLOCKING tool execution.',
    specs: [
      'Zero dead-air conversational micro-acknowledgments during async tool runs',
      'Automated turn-by-turn BANT/MEDDIC scoring and sentiment de-escalation hooks',
      'Post-call gemini-4-hydrogen structured JSON executive intelligence pipeline',
    ],
  },
  {
    id: 'data',
    title: '04. Hybrid RAG, PgBouncer, and Multi-Tenant Security',
    latency: '11–24 ms Query',
    icon: Database,
    summary:
      'Hybrid dense vector + BM25 lexical retrieval enforcing a configurable anti-hallucination guardrail (0.72 default), paired with PgBouncer transaction pooling, atomic calendar slot locks, and regional DPDP/GDPR data pinning.',
    specs: [
      'PgBouncer multiplexes 10,000+ worker connections into 200 PostgreSQL backends',
      'Row-Level Security (RLS) tenant isolation + AES-256 BYOK and PII redaction pipeline',
      'Active-active failover across Mumbai (ap-south-1), Frankfurt, and Virginia (RTO < 30s)',
    ],
  },
];

export default function ArchitectureScaleView() {
  const [selectedLayerId, setSelectedLayerId] = useState<string>('gateway');
  const [showMermaidCode, setShowMermaidCode] = useState(false);

  const [monthlyMinutes, setMonthlyMinutes] = useState<number>(25000);
  const [humanSdrMonthlyCost, setHumanSdrMonthlyCost] = useState<number>(3800);

  const aiCostPerMin = 0.068;
  const humanTalkMinsPerSdrMonth = 2400;
  const humanCostPerMin = humanSdrMonthlyCost / humanTalkMinsPerSdrMonth;
  const requiredHumanSdrs = Math.max(1, Math.ceil(monthlyMinutes / humanTalkMinsPerSdrMonth));
  const monthlyAiTotal = Math.round(monthlyMinutes * aiCostPerMin);
  const monthlyHumanTotal = requiredHumanSdrs * humanSdrMonthlyCost;
  const monthlySavings = Math.max(0, monthlyHumanTotal - monthlyAiTotal);
  const costReductionPct = monthlyHumanTotal > 0 ? Math.round((monthlySavings / monthlyHumanTotal) * 100) : 0;

  const selectedLayer = ARCHITECTURE_LAYERS.find((l) => l.id === selectedLayerId) ?? ARCHITECTURE_LAYERS[0];

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-6 border-b border-stone-200">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-stone-950">
            System Architecture, 100k-User Scale, and Unit Economics
          </h1>
          <p className="text-sm text-stone-600 mt-1.5">
            Production reference blueprint covering low-latency audio topology, commercial feasibility vs. human SDRs,
            100,000-user horizontal scaling, and DPDP/GDPR security governance.
          </p>
        </div>

        <Button variant="outline" onClick={() => setShowMermaidCode((v) => !v)}>
          {showMermaidCode ? 'Show Interactive Architecture' : 'View Mermaid Diagram Source'}
        </Button>
      </div>

      <Card className="p-6 space-y-6 rounded-3xl">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-stone-900 flex items-center gap-2">
            <Layers className="w-4 h-4 text-orange-600" />
            <span>End-to-End System Architecture Topology</span>
          </h2>
          <span className="text-xs text-stone-500">Select an architectural tier to inspect latency and scaling specs</span>
        </div>

        {showMermaidCode ? (
          <pre className="rounded-2xl bg-stone-900 text-amber-200 p-5 text-xs font-mono overflow-x-auto leading-relaxed">
            {MERMAID_ARCHITECTURE_SOURCE}
          </pre>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {ARCHITECTURE_LAYERS.map((layer) => {
                const Icon = layer.icon;
                const active = layer.id === selectedLayerId;
                return (
                  <button
                    key={layer.id}
                    type="button"
                    onClick={() => setSelectedLayerId(layer.id)}
                    className={`text-left p-5 rounded-2xl border transition-all cursor-pointer ${
                      active
                        ? 'bg-orange-50/90 border-orange-400 shadow-2xs'
                        : 'bg-stone-50/60 border-stone-200 hover:border-orange-300'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-2.5">
                      <Icon className={`w-4 h-4 ${active ? 'text-orange-600' : 'text-stone-500'}`} />
                      <span className="font-mono tabular-nums text-xs font-semibold text-emerald-700">
                        {layer.latency}
                      </span>
                    </div>
                    <div className="text-xs font-semibold text-stone-900">{layer.title}</div>
                    <p className="text-xs text-stone-600 mt-2 line-clamp-3 leading-relaxed">{layer.summary}</p>
                  </button>
                );
              })}
            </div>

            <div className="rounded-2xl bg-stone-50 border border-stone-200 p-5 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-sm font-semibold text-stone-900">{selectedLayer.title}</h3>
                <span className="font-mono tabular-nums text-xs font-semibold text-orange-700">
                  Target Budget: {selectedLayer.latency}
                </span>
              </div>
              <p className="text-xs text-stone-700 leading-relaxed">{selectedLayer.summary}</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-3 border-t border-stone-200">
                {selectedLayer.specs.map((spec, idx) => (
                  <div key={idx} className="text-xs text-stone-600 leading-relaxed">
                    <span className="font-mono font-semibold text-orange-600 mr-1.5">0{idx + 1}.</span>
                    {spec}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <Card className="lg:col-span-7 p-6 space-y-6 rounded-3xl">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-stone-900 flex items-center gap-2">
              <Calculator className="w-4 h-4 text-orange-600" />
              <span>Commercial Feasibility and Unit Economics (AI Agent vs. Human SDR)</span>
            </h2>
            <span className="font-mono tabular-nums text-xs font-bold text-emerald-700">
              {costReductionPct}% TCO Reduction
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <div className="flex items-center justify-between text-xs mb-2">
                <span className="text-stone-600">Monthly Active Voice Minutes</span>
                <span className="font-mono tabular-nums text-orange-700 font-semibold">
                  {monthlyMinutes.toLocaleString()} min
                </span>
              </div>
              <Slider
                ariaLabel="Monthly Active Voice Minutes"
                min={2000}
                max={250000}
                step={1000}
                value={monthlyMinutes}
                onChange={setMonthlyMinutes}
              />
            </div>

            <div>
              <div className="flex items-center justify-between text-xs mb-2">
                <span className="text-stone-600">Fully-Loaded Human SDR Cost / Mo</span>
                <span className="font-mono tabular-nums text-stone-900 font-semibold">
                  ${humanSdrMonthlyCost.toLocaleString()}
                </span>
              </div>
              <Slider
                ariaLabel="Human SDR Cost per Month"
                min={1500}
                max={8500}
                step={250}
                value={humanSdrMonthlyCost}
                onChange={setHumanSdrMonthlyCost}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-stone-200">
            <div>
              <div className="text-xs text-stone-500">AI Voice Cost / Min</div>
              <div className="text-lg font-mono tabular-nums font-bold text-orange-600 mt-1">
                ${aiCostPerMin.toFixed(3)}
              </div>
              <div className="text-xs text-stone-500">Gemini Live + Infra</div>
            </div>
            <div>
              <div className="text-xs text-stone-500">Human SDR / Talk Min</div>
              <div className="text-lg font-mono tabular-nums font-bold text-stone-800 mt-1">
                ${humanCostPerMin.toFixed(2)}
              </div>
              <div className="text-xs text-stone-500">{requiredHumanSdrs} FTEs equivalent</div>
            </div>
            <div>
              <div className="text-xs text-stone-500">AI Monthly Total</div>
              <div className="text-lg font-mono tabular-nums font-bold text-emerald-700 mt-1">
                ${monthlyAiTotal.toLocaleString()}
              </div>
              <div className="text-xs text-stone-500">24/7 multilingual</div>
            </div>
            <div>
              <div className="text-xs text-stone-500">Monthly Savings</div>
              <div className="text-lg font-mono tabular-nums font-bold text-emerald-600 mt-1">
                ${monthlySavings.toLocaleString()}
              </div>
              <div className="text-xs text-stone-500">vs ${monthlyHumanTotal.toLocaleString()} human</div>
            </div>
          </div>
        </Card>

        <Card className="lg:col-span-5 p-6 space-y-5 rounded-3xl">
          <h2 className="text-base font-semibold text-stone-900 flex items-center gap-2">
            <Globe className="w-4 h-4 text-orange-600" />
            <span>Infrastructure Cost: MVP vs. 100,000 Users</span>
          </h2>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-stone-200 text-stone-500">
                  <th className="py-2.5 font-medium">Component</th>
                  <th className="py-2.5 font-medium text-right">MVP (1k Users)</th>
                  <th className="py-2.5 font-medium text-right">Scale (100k Users)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200 font-mono tabular-nums">
                <tr>
                  <td className="py-3 font-sans text-stone-800">Gemini Live + TTS/RAG API</td>
                  <td className="py-3 text-right text-stone-600">$190/mo</td>
                  <td className="py-3 text-right text-orange-700 font-semibold">$14,800/mo</td>
                </tr>
                <tr>
                  <td className="py-3 font-sans text-stone-800">Stateless WS Media Pods</td>
                  <td className="py-3 text-right text-stone-600">$45/mo</td>
                  <td className="py-3 text-right text-orange-700 font-semibold">$3,200/mo</td>
                </tr>
                <tr>
                  <td className="py-3 font-sans text-stone-800">Redis Semantic Cache Cluster</td>
                  <td className="py-3 text-right text-stone-600">$20/mo</td>
                  <td className="py-3 text-right text-orange-700 font-semibold">$950/mo</td>
                </tr>
                <tr>
                  <td className="py-3 font-sans text-stone-800">PostgreSQL + PgBouncer + pgvector</td>
                  <td className="py-3 text-right text-stone-600">$35/mo</td>
                  <td className="py-3 text-right text-orange-700 font-semibold">$1,450/mo</td>
                </tr>
                <tr>
                  <td className="py-3 font-sans text-stone-800">Multi-Region Observability & WAF</td>
                  <td className="py-3 text-right text-stone-600">$15/mo</td>
                  <td className="py-3 text-right text-orange-700 font-semibold">$680/mo</td>
                </tr>
                <tr className="font-bold text-stone-950">
                  <td className="py-3 font-sans">Total Monthly Infra</td>
                  <td className="py-3 text-right text-emerald-700">$305/mo</td>
                  <td className="py-3 text-right text-emerald-700">$21,080/mo</td>
                </tr>
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      <Card className="p-6 space-y-5 rounded-3xl">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-stone-900 flex items-center gap-2">
            <Lock className="w-4 h-4 text-emerald-600" />
            <span>Security Architecture, PII Redaction, and DPDP / GDPR Governance</span>
          </h2>
          <span className="text-xs text-stone-500">Zero Foundation Model Training Guarantee</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs">
          <div className="space-y-2 pb-2 md:pb-0 md:pr-5 md:border-r border-stone-200">
            <div className="font-semibold text-stone-900 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Encryption and Server-Only Secrets</span>
            </div>
            <p className="text-stone-600 leading-relaxed">
              All WebSocket audio frames traverse TLS 1.3 / WSS. Gemini API keys stay strictly inside server-side
              containers—never exposed to browser bundles. Stored transcripts and CRM records use AES-256 with BYOK KMS
              rotation.
            </p>
          </div>

          <div className="space-y-2 pb-2 md:pb-0 md:pr-5 md:border-r border-stone-200">
            <div className="font-semibold text-stone-900 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>PII Redaction and DPDP / GDPR</span>
            </div>
            <p className="text-stone-600 leading-relaxed">
              Automated NER/regex PII scrubber masks PAN, Aadhaar, credit cards, and phone tokens before analytics
              logging. Supports one-click Right-to-Erasure and regional pinning in Mumbai (ap-south-1) and Frankfurt
              (eu-central-1).
            </p>
          </div>

          <div className="space-y-2">
            <div className="font-semibold text-stone-900 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Multi-Tenant Isolation and Failover</span>
            </div>
            <p className="text-stone-600 leading-relaxed">
              PostgreSQL Row-Level Security (RLS) enforces strict tenant boundaries on RAG vectors and CRM leads.
              Active-active multi-AZ failover with Redis Sentinel and PgBouncer guarantees 99.99% SLA with RTO &lt; 30s.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
