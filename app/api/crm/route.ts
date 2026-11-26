import { NextRequest, NextResponse } from 'next/server';
import { crmStore } from '@/lib/crm-store';
import { LanguageCode, LeadProfile } from '@/lib/types';

export async function GET() {
  return NextResponse.json({
    activeLead: crmStore.getActiveLead(),
    leads: crmStore.getLeads(),
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      name?: string;
      company?: string;
      email?: string;
      phone?: string;
      role?: string;
      teamSize?: string;
      preferredLanguage?: LanguageCode;
      stage?: LeadProfile['stage'];
      notes?: string;
    };

    if (!body.name || !body.company) {
      return NextResponse.json({ error: 'Name and company are required.' }, { status: 400 });
    }

    const updated = crmStore.upsertLead({
      name: body.name,
      company: body.company,
      email: body.email,
      phone: body.phone,
      role: body.role,
      teamSize: body.teamSize,
      preferredLanguage: body.preferredLanguage,
      stage: body.stage,
      notes: body.notes,
    });

    return NextResponse.json({
      lead: updated,
      activeLead: crmStore.getActiveLead(),
      leads: crmStore.getLeads(),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'CRM upsert failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
