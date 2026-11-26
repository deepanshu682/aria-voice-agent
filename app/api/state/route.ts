import { NextRequest, NextResponse } from 'next/server';
import { crmStore } from '@/lib/crm-store';
import { ragEngine } from '@/lib/rag-engine';
import { semanticCache } from '@/lib/semantic-cache';
import { KnowledgeCategory } from '@/lib/types';

export async function GET() {
  return NextResponse.json({
    activeLead: crmStore.getActiveLead(),
    leads: crmStore.getLeads(),
    calendarSlots: crmStore.getCalendarSlots(false),
    knowledgeChunks: ragEngine.getAllChunks(),
    semanticCache: semanticCache.getStats(),
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      action?: string;
      leadId?: string;
      chunk?: {
        title: string;
        category: KnowledgeCategory;
        content: string;
        keywords: string[];
      };
    };

    if (body.action === 'reset') {
      crmStore.resetDemoState();
      return NextResponse.json({
        status: 'reset',
        activeLead: crmStore.getActiveLead(),
        leads: crmStore.getLeads(),
        calendarSlots: crmStore.getCalendarSlots(false),
      });
    }

    if (body.action === 'select_lead' && body.leadId) {
      const selected = crmStore.setActiveLead(body.leadId);
      if (!selected) {
        return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
      }
      return NextResponse.json({ activeLead: selected });
    }

    if (body.action === 'add_kb_chunk' && body.chunk) {
      const created = ragEngine.addChunk(body.chunk);
      return NextResponse.json({
        created,
        knowledgeChunks: ragEngine.getAllChunks(),
      });
    }

    return NextResponse.json({ error: 'Unsupported action' }, { status: 400 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to update state';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
