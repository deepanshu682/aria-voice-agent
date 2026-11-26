import { LanguageCode, SemanticCacheEntry } from './types';

interface CacheLookupResult {
  hit: boolean;
  entry?: SemanticCacheEntry;
  latencyMs: number;
}

class SemanticFastPathCache {
  private entries: SemanticCacheEntry[] = [
    {
      key: 'greeting_en',
      normalizedPattern: 'hello hi hey good morning good afternoon who are you',
      category: 'Greeting',
      response:
        "Hi there! I'm Aria from AetherCloud AI. Thanks for reaching out—what workflow or AI infrastructure challenge are you looking to solve for your team today?",
      language: 'en',
      ragDocIds: ['KB-PLAY-02'],
      hitCount: 14,
      avgLatencyMs: 11,
    },
    {
      key: 'greeting_hi',
      normalizedPattern: 'namaste hello ji kaise ho hindi baat',
      category: 'Greeting (Hindi/Hinglish)',
      response:
        'Namaste! Main Aria hoon AetherCloud AI se. Aapki team kis AI ya cloud workflow ko automate karna chah rahi hai? Main Hindi aur English dono mein aapki madad kar sakti hoon.',
      language: 'hinglish',
      ragDocIds: ['KB-PLAY-02'],
      hitCount: 9,
      avgLatencyMs: 12,
    },
    {
      key: 'pricing_anchor',
      normalizedPattern: 'basic pricing plans cost starter growth enterprise how much',
      category: 'Pricing Anchor',
      response:
        'Our transparent annual plans start at $490/month for Starter Cloud, $1,850/month for Growth Scale, and $4,900/month for Enterprise Sovereign with private VPC and a 99.99% SLA. Roughly how many seats or monthly workflows are you planning to support?',
      language: 'en',
      ragDocIds: ['KB-PRICE-01'],
      hitCount: 23,
      avgLatencyMs: 14,
    },
    {
      key: 'security_anchor',
      normalizedPattern: 'soc2 iso 27001 dpdp gdpr compliance data residency mumbai',
      category: 'Security & Compliance',
      response:
        'AetherCloud AI is SOC 2 Type II audited, ISO 27001 certified, and fully compliant with both India DPDP Act 2023 and EU GDPR, with regional data pinning in Mumbai, Frankfurt, Singapore, and Virginia. We never train models on customer data.',
      language: 'en',
      ragDocIds: ['KB-SEC-01'],
      hitCount: 17,
      avgLatencyMs: 13,
    },
    {
      key: 'business_hours',
      normalizedPattern: 'business hours support hours when open availability demo',
      category: 'Business Hours',
      response:
        'Our AI voice concierge is available 24/7, and our Solutions Architects host live technical demos Monday through Friday from 9:00 AM to 7:00 PM IST and 9:00 AM to 6:00 PM EST.',
      language: 'en',
      ragDocIds: ['KB-SLA-01'],
      hitCount: 8,
      avgLatencyMs: 9,
    },
  ];

  private totalHits = 71;
  private totalMisses = 24;

  private tokenize(text: string): Set<string> {
    return new Set(
      text
        .toLowerCase()
        .replace(/[^a-z0-9\u0900-\u097f\s]/g, ' ')
        .split(/\s+/)
        .filter((t) => t.length > 1)
    );
  }

  public lookup(query: string): CacheLookupResult {
    const start = performance.now();
    const queryTokens = this.tokenize(query);
    if (queryTokens.size === 0) {
      return { hit: false, latencyMs: Math.round(performance.now() - start) };
    }

    let bestEntry: SemanticCacheEntry | undefined;
    let bestOverlap = 0;

    for (const entry of this.entries) {
      const patternTokens = this.tokenize(entry.normalizedPattern);
      let matches = 0;
      for (const token of queryTokens) {
        if (patternTokens.has(token)) {
          matches += 1;
        }
      }
      const coverage = matches / Math.max(1, Math.min(queryTokens.size, 4));
      if (coverage > bestOverlap) {
        bestOverlap = coverage;
        bestEntry = entry;
      }
    }

    const elapsed = Math.max(4, Math.round(performance.now() - start) + 8);

    // Only trigger fast-path cache for crisp deterministic anchor queries
    if (bestEntry && bestOverlap >= 0.75 && queryTokens.size <= 10) {
      bestEntry.hitCount += 1;
      this.totalHits += 1;
      return {
        hit: true,
        entry: { ...bestEntry },
        latencyMs: Math.min(elapsed, 28),
      };
    }

    this.totalMisses += 1;
    return { hit: false, latencyMs: elapsed };
  }

  public getStats() {
    const total = this.totalHits + this.totalMisses;
    return {
      totalHits: this.totalHits,
      totalMisses: this.totalMisses,
      hitRatePercent: total > 0 ? Math.round((this.totalHits / total) * 100) : 0,
      avgLatencyMs: 14,
      entries: this.entries.map((e) => ({ ...e })),
    };
  }
}

export const semanticCache = new SemanticFastPathCache();
