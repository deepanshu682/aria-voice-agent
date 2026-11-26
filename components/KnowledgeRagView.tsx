'use client';

import React, { useState } from 'react';
import { Database, Plus, Search, ShieldAlert, ShieldCheck, Zap } from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Slider } from './ui/controls';
import { KnowledgeCategory, KnowledgeChunk, RagSearchResult, SemanticCacheEntry } from '@/lib/types';

interface KnowledgeRagViewProps {
  chunks: KnowledgeChunk[];
  ragThreshold: number;
  topK: number;
  onUpdateThreshold: (threshold: number) => void;
  onUpdateTopK: (k: number) => void;
  cacheStats: {
    totalHits: number;
    totalMisses: number;
    hitRatePercent: number;
    avgLatencyMs: number;
    entries: SemanticCacheEntry[];
  };
  onAddChunk: (chunk: {
    title: string;
    category: KnowledgeCategory;
    content: string;
    keywords: string[];
  }) => Promise<void>;
}

const SAMPLE_QUERIES = [
  {
    label: 'Enterprise Pricing and Discounts (Grounded)',
    query: 'What are the Enterprise Sovereign pricing tiers and multi-year discounts?',
  },
  {
    label: 'Mumbai DPDP and SOC2 Security (Grounded)',
    query: 'Are you SOC2 certified with India Mumbai DPDP data residency?',
  },
  {
    label: 'AWS Bedrock TCO Comparison (Grounded)',
    query: 'How does AetherCloud AI compare against AWS Bedrock DIY TCO?',
  },
  {
    label: 'Out-of-Scope Quantum Hardware (Guardrail Block)',
    query: 'Do you manufacture submarine quantum FPGA nuclear cooling firmware?',
  },
];

export default function KnowledgeRagView({
  chunks,
  ragThreshold,
  topK,
  onUpdateThreshold,
  onUpdateTopK,
  cacheStats,
  onAddChunk,
}: KnowledgeRagViewProps) {
  const [query, setQuery] = useState(SAMPLE_QUERIES[0].query);
  const [searchResult, setSearchResult] = useState<RagSearchResult | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<string>('All');

  const [showAddForm, setShowAddForm] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState<KnowledgeCategory>('Pricing & Plans');
  const [newContent, setNewContent] = useState('');
  const [newKeywords, setNewKeywords] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const runSearch = async (targetQuery: string, customThreshold = ragThreshold, customTopK = topK) => {
    const q = targetQuery.trim();
    if (!q) return;
    setIsSearching(true);
    try {
      const res = await fetch('/api/rag/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: q, topK: customTopK, threshold: customThreshold }),
      });
      const data = (await res.json()) as RagSearchResult;
      setSearchResult(data);
    } finally {
      setIsSearching(false);
    }
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newContent.trim()) return;
    setIsAdding(true);
    try {
      await onAddChunk({
        title: newTitle.trim(),
        category: newCategory,
        content: newContent.trim(),
        keywords: newKeywords
          .split(',')
          .map((k) => k.trim())
          .filter(Boolean),
      });
      setNewTitle('');
      setNewContent('');
      setNewKeywords('');
      setShowAddForm(false);
    } finally {
      setIsAdding(false);
    }
  };

  const filteredChunks =
    categoryFilter === 'All' ? chunks : chunks.filter((c) => c.category === categoryFilter);

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-6 border-b border-stone-200">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-stone-950">
            Hybrid RAG Knowledge Base and Guardrails
          </h1>
          <p className="text-sm text-stone-600 mt-1.5">
            58% Dense Semantic and 42% BM25 Lexical retrieval over the AetherCloud Enterprise Corpus (Active Cutoff:{' '}
            <span className="font-mono font-semibold text-orange-700">{ragThreshold.toFixed(2)}</span>)
          </p>
        </div>

        <Button variant="gradient" onClick={() => setShowAddForm((v) => !v)}>
          <Plus className="w-3.5 h-3.5" />
          <span>{showAddForm ? 'Cancel Document' : 'Add Knowledge Document'}</span>
        </Button>
      </div>

      {showAddForm && (
        <form
          onSubmit={handleAddSubmit}
          className="border border-orange-200 rounded-2xl bg-white p-6 grid grid-cols-1 md:grid-cols-2 gap-5 shadow-xs"
        >
          <div>
            <label className="block text-xs font-medium text-stone-700 mb-1.5">Document Title</label>
            <input
              type="text"
              required
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Custom Healthcare HIPAA BAA Addendum"
              className="w-full rounded-xl bg-stone-50 border border-stone-200 px-3.5 py-2.5 text-xs text-stone-900 focus:outline-none focus:border-orange-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-stone-700 mb-1.5">Category</label>
            <select
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value as KnowledgeCategory)}
              className="w-full rounded-xl bg-stone-50 border border-stone-200 px-3.5 py-2.5 text-xs text-stone-900 focus:outline-none focus:border-orange-500"
            >
              <option value="Pricing & Plans">Pricing & Plans</option>
              <option value="Security & Compliance">Security & Compliance</option>
              <option value="Architecture & SLA">Architecture & SLA</option>
              <option value="Competitor Battlecard">Competitor Battlecard</option>
              <option value="Implementation & Migration">Implementation & Migration</option>
              <option value="Sales Playbook & Objections">Sales Playbook & Objections</option>
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-stone-700 mb-1.5">Verified Ground-Truth Content</label>
            <textarea
              rows={3}
              required
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              placeholder="Enter verified enterprise facts that Aria is permitted to cite..."
              className="w-full rounded-xl bg-stone-50 border border-stone-200 px-3.5 py-2.5 text-xs text-stone-900 focus:outline-none focus:border-orange-500"
            />
          </div>
          <div className="md:col-span-2 flex flex-col sm:flex-row items-stretch sm:items-end gap-4">
            <div className="flex-1">
              <label className="block text-xs font-medium text-stone-700 mb-1.5">Keywords (comma-separated)</label>
              <input
                type="text"
                value={newKeywords}
                onChange={(e) => setNewKeywords(e.target.value)}
                placeholder="hipaa, baa, healthcare, compliance, audit"
                className="w-full rounded-xl bg-stone-50 border border-stone-200 px-3.5 py-2.5 text-xs text-stone-900 focus:outline-none focus:border-orange-500"
              />
            </div>
            <Button type="submit" variant="gradient" disabled={isAdding}>
              {isAdding ? 'Indexing...' : 'Index into Live RAG'}
            </Button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <Card className="lg:col-span-7 p-6 space-y-5 rounded-3xl">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h2 className="text-base font-semibold text-stone-900">Live Hybrid Retrieval and Guardrail Tester</h2>
            <div className="flex items-center gap-6 text-xs">
              <div className="flex items-center gap-2.5 w-40">
                <span className="text-stone-500 shrink-0">Cutoff: {ragThreshold.toFixed(2)}</span>
                <Slider
                  ariaLabel="RAG Cutoff"
                  min={0.5}
                  max={0.95}
                  step={0.02}
                  value={ragThreshold}
                  onChange={onUpdateThreshold}
                />
              </div>
              <div className="flex items-center gap-2.5 w-32">
                <span className="text-stone-500 shrink-0">Top-K: {topK}</span>
                <Slider
                  ariaLabel="Top-K"
                  min={1}
                  max={5}
                  step={1}
                  value={topK}
                  onChange={onUpdateTopK}
                />
              </div>
            </div>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              void runSearch(query);
            }}
            className="flex gap-3"
          >
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Test any grounded or out-of-scope sales query..."
              className="flex-1 rounded-xl bg-stone-50 border border-stone-200 px-3.5 py-2.5 text-xs text-stone-900 focus:outline-none focus:border-orange-500"
            />
            <Button type="submit" variant="gradient" disabled={isSearching}>
              <Search className="w-3.5 h-3.5" />
              <span>{isSearching ? 'Scoring...' : 'Test Retrieval'}</span>
            </Button>
          </form>

          <div className="flex flex-wrap gap-2">
            {SAMPLE_QUERIES.map((sq) => (
              <button
                key={sq.label}
                type="button"
                onClick={() => {
                  setQuery(sq.query);
                  void runSearch(sq.query);
                }}
                className="px-3 py-1.5 rounded-lg bg-stone-100 border border-stone-200 hover:border-orange-300 hover:bg-orange-50/60 text-xs text-stone-700 transition-colors cursor-pointer"
              >
                {sq.label}
              </button>
            ))}
          </div>

          {searchResult && (
            <div className="pt-4 border-t border-stone-200 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
                <div
                  className={`font-semibold flex items-center gap-2 ${
                    searchResult.passedGuardrail ? 'text-emerald-700' : 'text-rose-700'
                  }`}
                >
                  {searchResult.passedGuardrail ? (
                    <ShieldCheck className="w-4 h-4" />
                  ) : (
                    <ShieldAlert className="w-4 h-4" />
                  )}
                  <span>
                    {searchResult.passedGuardrail
                      ? `Passed Anti-Hallucination Gate (${searchResult.topScore.toFixed(2)} >= ${(searchResult.thresholdUsed ?? ragThreshold).toFixed(2)})`
                      : `Guardrail Triggered (${searchResult.topScore.toFixed(2)} < ${(searchResult.thresholdUsed ?? ragThreshold).toFixed(2)})`}
                  </span>
                </div>
                <span className="font-mono tabular-nums text-stone-500">
                  {searchResult.latencyMs}ms ({searchResult.cacheHit ? 'Query Cache Hit' : 'Live Index Scan'})
                </span>
              </div>

              {!searchResult.passedGuardrail && searchResult.fallbackMessage && (
                <div className="rounded-2xl border border-rose-300 bg-rose-50 p-4 text-xs text-rose-900">
                  {searchResult.fallbackMessage}
                </div>
              )}

              <div className="divide-y divide-stone-200">
                {searchResult.citations.map((c) => (
                  <div key={c.docId} className="py-3 space-y-1.5">
                    <div className="flex items-center justify-between gap-3 text-xs">
                      <span className="font-semibold text-stone-900">
                        {c.docId} ({c.title})
                      </span>
                      <span
                        className={`font-mono tabular-nums font-bold ${
                          c.passedGuardrail ? 'text-emerald-700' : 'text-stone-400'
                        }`}
                      >
                        {c.hybridScore.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-4 text-xs font-mono tabular-nums text-stone-500">
                      <span>Dense: {c.denseScore.toFixed(2)}</span>
                      <span>Lexical BM25: {c.lexicalScore.toFixed(2)}</span>
                      <span>Category: {c.category}</span>
                    </div>
                    <p className="text-xs text-stone-700 leading-relaxed">{c.snippet}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>

        <Card className="lg:col-span-5 p-6 space-y-5 rounded-3xl">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-stone-900 flex items-center gap-2">
              <Zap className="w-4 h-4 text-orange-600" />
              <span>Semantic Fast-Path Cache (&lt; 35 ms)</span>
            </h2>
            <span className="font-mono tabular-nums text-xs font-semibold text-emerald-700">
              {cacheStats.hitRatePercent}% Hit Rate
            </span>
          </div>

          <div className="grid grid-cols-3 gap-4 pb-4 border-b border-stone-200 text-xs">
            <div>
              <div className="text-stone-500">Avg Cache Latency</div>
              <div className="font-mono tabular-nums text-base font-bold text-orange-600 mt-1">
                {cacheStats.avgLatencyMs} ms
              </div>
            </div>
            <div>
              <div className="text-stone-500">Total Hits</div>
              <div className="font-mono tabular-nums text-base font-bold text-stone-900 mt-1">
                {cacheStats.totalHits}
              </div>
            </div>
            <div>
              <div className="text-stone-500">Warm Anchors</div>
              <div className="font-mono tabular-nums text-base font-bold text-stone-900 mt-1">
                {cacheStats.entries.length}
              </div>
            </div>
          </div>

          <div className="divide-y divide-stone-200 max-h-[340px] overflow-y-auto">
            {cacheStats.entries.map((entry) => (
              <div key={entry.key} className="py-3 space-y-1 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-stone-800">{entry.category}</span>
                  <span className="font-mono tabular-nums text-stone-500">
                    {entry.avgLatencyMs}ms ({entry.hitCount} hits)
                  </span>
                </div>
                <p className="text-stone-600 line-clamp-2 leading-relaxed">{entry.response}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card className="p-6 space-y-5 rounded-3xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <Database className="w-4 h-4 text-orange-600" />
            <h2 className="text-base font-semibold text-stone-900">
              Verified Enterprise Knowledge Base ({filteredChunks.length} documents)
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 bg-stone-100 p-1 rounded-xl border border-stone-200">
            {[
              'All',
              'Pricing & Plans',
              'Security & Compliance',
              'Architecture & SLA',
              'Competitor Battlecard',
              'Implementation & Migration',
              'Sales Playbook & Objections',
            ].map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategoryFilter(cat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
                  categoryFilter === cat
                    ? 'bg-white text-stone-950 shadow-2xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                {cat === 'All' ? 'All' : cat.split(' ')[0]}
              </button>
            ))}
          </div>
        </div>

        <div className="divide-y divide-stone-200 border-t border-stone-200">
          {filteredChunks.map((doc) => (
            <div key={doc.id} className="py-4 space-y-1.5">
              <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="font-semibold text-stone-900">
                  <span className="font-mono text-orange-600 mr-2.5">{doc.id}</span>
                  {doc.title}
                </div>
                <div className="flex flex-wrap items-center gap-4 text-xs text-stone-500">
                  <span>{doc.source}</span>
                  <span>{doc.category}</span>
                  <span>Verified {doc.verifiedDate}</span>
                </div>
              </div>
              <p className="text-sm text-stone-700 leading-relaxed">{doc.content}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
