import { BantScorecard, CalendarSlot, LanguageCode, LeadProfile, SentimentLabel } from './types';

function createInitialCalendarSlots(): CalendarSlot[] {
  return [
    {
      id: 'SLOT-01',
      date: '2026-11-26',
      dayLabel: 'Thu, Nov 26',
      timeSlot: '11:00 AM IST',
      timezone: 'Asia/Kolkata',
      specialistName: 'Rohan Deshmukh',
      specialistRole: 'Principal Solutions Architect',
      status: 'available',
    },
    {
      id: 'SLOT-02',
      date: '2026-11-26',
      dayLabel: 'Thu, Nov 26',
      timeSlot: '03:30 PM IST',
      timezone: 'Asia/Kolkata',
      specialistName: 'Ananya Krishnan',
      specialistRole: 'Enterprise AI Architect',
      status: 'available',
    },
    {
      id: 'SLOT-03',
      date: '2026-11-26',
      dayLabel: 'Thu, Nov 26',
      timeSlot: '06:00 PM IST',
      timezone: 'Asia/Kolkata',
      specialistName: 'Marcus Vance',
      specialistRole: 'Global Security & VPC Lead',
      status: 'booked',
      bookedByLeadId: 'LEAD-102',
      bookedByName: 'Elena Rostova',
      bookedCompany: 'Vanguard FinTech GmbH',
      agenda: 'EU-Central Frankfurt GDPR VPC & BYOK Encryption Review',
      meetingLink: 'https://meet.aethercloud.ai/demo/eu-vpc-102',
    },
    {
      id: 'SLOT-04',
      date: '2026-11-27',
      dayLabel: 'Fri, Nov 27',
      timeSlot: '10:30 AM IST',
      timezone: 'Asia/Kolkata',
      specialistName: 'Rohan Deshmukh',
      specialistRole: 'Principal Solutions Architect',
      status: 'available',
    },
    {
      id: 'SLOT-05',
      date: '2026-11-27',
      dayLabel: 'Fri, Nov 27',
      timeSlot: '02:00 PM IST',
      timezone: 'Asia/Kolkata',
      specialistName: 'Ananya Krishnan',
      specialistRole: 'Enterprise AI Architect',
      status: 'available',
    },
    {
      id: 'SLOT-06',
      date: '2026-11-30',
      dayLabel: 'Mon, Nov 30',
      timeSlot: '11:30 AM IST',
      timezone: 'Asia/Kolkata',
      specialistName: 'Marcus Vance',
      specialistRole: 'Global Security & VPC Lead',
      status: 'available',
    },
  ];
}

function createInitialLeads(): LeadProfile[] {
  return [
    {
      id: 'LEAD-101',
      name: 'Vikram Malhotra',
      role: 'VP of Engineering',
      company: 'FinEdge Technologies (Bengaluru)',
      email: 'vikram.malhotra@finedge.in',
      phone: '+91-98450-11204',
      teamSize: '60 engineers + 45 support ops',
      preferredLanguage: 'hinglish',
      stage: 'Discovery',
      lastSentiment: 'neutral',
      updatedAt: '2026-11-25T06:40:00Z',
      bant: {
        budget: { score: 8, status: 'partial', evidence: 'Currently spending ~$2,400/mo on fragmented LLM APIs' },
        authority: { score: 20, status: 'confirmed', evidence: 'VP of Engineering — technical sign-off owner' },
        need: { score: 18, status: 'partial', evidence: 'Evaluating private Mumbai region AI cloud + CRM sync' },
        timeline: { score: 10, status: 'partial', evidence: 'Targeting Q1 production rollout' },
        totalScore: 56,
        meddicSummary: {
          metrics: 'Reduce inference latency < 50ms & unify 4 regional bots',
          economicBuyer: 'CFO & VP Engineering (Vikram)',
          decisionCriteria: 'India DPDP residency, 99.99% SLA, Salesforce connector',
          identifyPain: 'High AWS Bedrock engineering overhead & ungrounded hallucinations',
          champion: 'Vikram Malhotra',
        },
      },
      priorCalls: [
        {
          callId: 'CALL-882',
          date: '2026-11-18',
          summary:
            'Inbound intro call. Vikram asked about Mumbai data residency and Salesforce bi-directional sync. Requested pricing review before involving CFO.',
          languageUsed: 'hinglish',
          keyPainPoints: ['Mumbai DPDP compliance', 'Fragmented cloud LLM billing'],
          lastSentiment: 'positive',
        },
      ],
    },
    {
      id: 'LEAD-102',
      name: 'Elena Rostova',
      role: 'Chief Information Security Officer',
      company: 'Vanguard FinTech GmbH',
      email: 'e.rostova@vanguard-fintech.de',
      phone: '+49-30-901820',
      teamSize: '140 engineers',
      preferredLanguage: 'en',
      stage: 'Demo Booked',
      lastSentiment: 'positive',
      updatedAt: '2026-11-24T15:10:00Z',
      bookedSlotId: 'SLOT-03',
      bant: {
        budget: { score: 24, status: 'confirmed', evidence: '$60k annual AI infrastructure budget approved' },
        authority: { score: 25, status: 'confirmed', evidence: 'CISO & Executive Security Committee Chair' },
        need: { score: 24, status: 'confirmed', evidence: 'EU GDPR Frankfurt VPC with BYOK KMS encryption' },
        timeline: { score: 22, status: 'confirmed', evidence: 'Go-live mandated before Dec 31 audit' },
        totalScore: 95,
        meddicSummary: {
          metrics: 'Zero PII leakage & SOC2 Type II audit readiness',
          economicBuyer: 'Elena Rostova (CISO)',
          decisionCriteria: 'Frankfurt pinning, zero model training guarantee',
          identifyPain: 'Legacy vendor lacked BYOK key rotation',
          champion: 'Elena Rostova',
        },
      },
      priorCalls: [
        {
          callId: 'CALL-879',
          date: '2026-11-24',
          summary:
            'Verified ISO 27001, GDPR Frankfurt residency, and BYOK KMS support. Booked technical VPC architecture review with Marcus Vance.',
          languageUsed: 'en',
          keyPainPoints: ['BYOK encryption', 'Strict EU data pinning'],
          lastSentiment: 'positive',
        },
      ],
    },
  ];
}

class CrmCalendarStore {
  private leads: LeadProfile[] = createInitialLeads();
  private slots: CalendarSlot[] = createInitialCalendarSlots();
  private activeLeadId = 'LEAD-101';

  public getActiveLead(): LeadProfile {
    return this.leads.find((l) => l.id === this.activeLeadId) ?? this.leads[0];
  }

  public setActiveLead(leadId: string): LeadProfile | undefined {
    const found = this.leads.find((l) => l.id === leadId);
    if (found) {
      this.activeLeadId = found.id;
    }
    return found;
  }

  public getLeads(): LeadProfile[] {
    return this.leads;
  }

  public getCalendarSlots(onlyAvailable = false): CalendarSlot[] {
    return onlyAvailable ? this.slots.filter((s) => s.status === 'available') : this.slots;
  }

  public updateBant(params: {
    leadId?: string;
    budgetScore?: number;
    budgetEvidence?: string;
    authorityScore?: number;
    authorityEvidence?: string;
    needScore?: number;
    needEvidence?: string;
    timelineScore?: number;
    timelineEvidence?: string;
    sentiment?: SentimentLabel;
    language?: LanguageCode;
  }): LeadProfile {
    const lead = this.leads.find((l) => l.id === (params.leadId ?? this.activeLeadId)) ?? this.getActiveLead();
    const clamp25 = (n: number) => Math.max(0, Math.min(25, Math.round(n)));
    const statusFromScore = (s: number) => (s >= 18 ? 'confirmed' : s >= 8 ? 'partial' : 'unknown');

    const b: BantScorecard = {
      ...lead.bant,
      budget: {
        score: params.budgetScore !== undefined ? clamp25(params.budgetScore) : lead.bant.budget.score,
        status: statusFromScore(
          params.budgetScore !== undefined ? clamp25(params.budgetScore) : lead.bant.budget.score
        ),
        evidence: params.budgetEvidence ?? lead.bant.budget.evidence,
      },
      authority: {
        score: params.authorityScore !== undefined ? clamp25(params.authorityScore) : lead.bant.authority.score,
        status: statusFromScore(
          params.authorityScore !== undefined ? clamp25(params.authorityScore) : lead.bant.authority.score
        ),
        evidence: params.authorityEvidence ?? lead.bant.authority.evidence,
      },
      need: {
        score: params.needScore !== undefined ? clamp25(params.needScore) : lead.bant.need.score,
        status: statusFromScore(params.needScore !== undefined ? clamp25(params.needScore) : lead.bant.need.score),
        evidence: params.needEvidence ?? lead.bant.need.evidence,
      },
      timeline: {
        score: params.timelineScore !== undefined ? clamp25(params.timelineScore) : lead.bant.timeline.score,
        status: statusFromScore(
          params.timelineScore !== undefined ? clamp25(params.timelineScore) : lead.bant.timeline.score
        ),
        evidence: params.timelineEvidence ?? lead.bant.timeline.evidence,
      },
      totalScore: 0,
    };

    b.totalScore = b.budget.score + b.authority.score + b.need.score + b.timeline.score;
    lead.bant = b;
    if (params.sentiment) lead.lastSentiment = params.sentiment;
    if (params.language) lead.preferredLanguage = params.language;
    if (b.totalScore >= 75 && lead.stage !== 'Demo Booked') {
      lead.stage = 'Qualified';
    }
    lead.updatedAt = new Date().toISOString();
    return lead;
  }

  public upsertLead(input: {
    id?: string;
    name: string;
    company: string;
    email?: string;
    phone?: string;
    role?: string;
    teamSize?: string;
    preferredLanguage?: LanguageCode;
    stage?: LeadProfile['stage'];
    notes?: string;
  }): LeadProfile {
    const existing = this.leads.find(
      (l) =>
        (input.id && l.id === input.id) ||
        (input.email && l.email.toLowerCase() === input.email.toLowerCase()) ||
        l.name.toLowerCase() === input.name.toLowerCase()
    );

    if (existing) {
      existing.name = input.name || existing.name;
      existing.company = input.company || existing.company;
      if (input.email) existing.email = input.email;
      if (input.phone) existing.phone = input.phone;
      if (input.role) existing.role = input.role;
      if (input.teamSize) existing.teamSize = input.teamSize;
      if (input.preferredLanguage) existing.preferredLanguage = input.preferredLanguage;
      if (input.stage) existing.stage = input.stage;
      if (input.notes) {
        existing.priorCalls = [
          {
            callId: `CALL-${Math.floor(900 + Math.random() * 99)}`,
            date: new Date().toISOString().slice(0, 10),
            summary: input.notes,
            languageUsed: existing.preferredLanguage,
            keyPainPoints: [existing.bant.need.evidence],
            lastSentiment: existing.lastSentiment,
          },
          ...existing.priorCalls.slice(0, 4),
        ];
      }
      existing.updatedAt = new Date().toISOString();
      this.activeLeadId = existing.id;
      return existing;
    }

    const newLead: LeadProfile = {
      id: `LEAD-${100 + this.leads.length + 1}`,
      name: input.name,
      role: input.role ?? 'Decision Maker',
      company: input.company,
      email: input.email ?? `${input.name.toLowerCase().replace(/\s+/g, '.')}@company.com`,
      phone: input.phone ?? '+91-98000-00000',
      teamSize: input.teamSize ?? '25–50 seats',
      preferredLanguage: input.preferredLanguage ?? 'en',
      stage: input.stage ?? 'Discovery',
      lastSentiment: 'neutral',
      updatedAt: new Date().toISOString(),
      bant: {
        budget: { score: 10, status: 'partial', evidence: 'Initial discovery underway' },
        authority: { score: 12, status: 'partial', evidence: input.role ?? 'Stakeholder' },
        need: { score: 15, status: 'partial', evidence: input.notes ?? 'Evaluating AetherCloud AI' },
        timeline: { score: 10, status: 'partial', evidence: 'Near-term evaluation' },
        totalScore: 47,
        meddicSummary: {
          metrics: 'TBD during technical discovery',
          economicBuyer: input.name,
          decisionCriteria: 'Enterprise security & low latency',
          identifyPain: input.notes ?? 'Scaling autonomous workflows',
          champion: input.name,
        },
      },
      priorCalls: input.notes
        ? [
            {
              callId: `CALL-${Math.floor(900 + Math.random() * 99)}`,
              date: new Date().toISOString().slice(0, 10),
              summary: input.notes,
              languageUsed: input.preferredLanguage ?? 'en',
              keyPainPoints: ['Initial inbound inquiry'],
              lastSentiment: 'neutral',
            },
          ]
        : [],
    };
    this.leads.unshift(newLead);
    this.activeLeadId = newLead.id;
    return newLead;
  }

  public bookSlot(params: {
    slotId?: string;
    leadName: string;
    company: string;
    email?: string;
    agenda?: string;
  }): {
    success: boolean;
    error?: string;
    slot?: CalendarSlot;
    availableAlternatives?: CalendarSlot[];
  } {
    let targetSlot = params.slotId
      ? this.slots.find((s) => s.id === params.slotId)
      : this.slots.find((s) => s.status === 'available');

    if (!targetSlot) {
      return {
        success: false,
        error: 'Requested slot ID not found.',
        availableAlternatives: this.getCalendarSlots(true),
      };
    }

    // Strict double-booking prevention
    if (targetSlot.status === 'booked') {
      return {
        success: false,
        error: `Conflict prevented: ${targetSlot.dayLabel} at ${targetSlot.timeSlot} is already reserved by ${targetSlot.bookedCompany}.`,
        availableAlternatives: this.getCalendarSlots(true),
      };
    }

    const lead = this.upsertLead({
      name: params.leadName,
      company: params.company,
      email: params.email,
      stage: 'Demo Booked',
      notes: `Booked technical demo for ${targetSlot.dayLabel} ${targetSlot.timeSlot}. Agenda: ${params.agenda ?? 'AetherCloud AI Enterprise Architecture & PoV'}`,
    });

    targetSlot.status = 'booked';
    targetSlot.bookedByLeadId = lead.id;
    targetSlot.bookedByName = lead.name;
    targetSlot.bookedCompany = lead.company;
    targetSlot.agenda = params.agenda ?? 'AetherCloud AI Architecture, Security & 30-Day PoV';
    targetSlot.meetingLink = `https://meet.aethercloud.ai/demo/${targetSlot.id.toLowerCase()}-${lead.id.toLowerCase()}`;

    lead.bookedSlotId = targetSlot.id;
    lead.stage = 'Demo Booked';
    lead.updatedAt = new Date().toISOString();

    return {
      success: true,
      slot: { ...targetSlot },
    };
  }

  public releaseSlot(slotId: string): boolean {
    const slot = this.slots.find((s) => s.id === slotId);
    if (!slot) return false;
    slot.status = 'available';
    slot.bookedByLeadId = undefined;
    slot.bookedByName = undefined;
    slot.bookedCompany = undefined;
    slot.agenda = undefined;
    slot.meetingLink = undefined;
    return true;
  }

  public resetDemoState() {
    this.leads = createInitialLeads();
    this.slots = createInitialCalendarSlots();
    this.activeLeadId = 'LEAD-101';
  }
}

export const crmStore = new CrmCalendarStore();
