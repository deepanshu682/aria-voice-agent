import { NextRequest, NextResponse } from 'next/server';
import { ragEngine } from '@/lib/rag-engine';

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { query?: string; topK?: number; threshold?: number };
    const query = (body.query ?? '').trim();

    if (!query) {
      return NextResponse.json({ error: 'Query string is required.' }, { status: 400 });
    }

    const result = ragEngine.search(query, body.topK ?? 3, body.threshold ?? 0.72);
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'RAG search error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
