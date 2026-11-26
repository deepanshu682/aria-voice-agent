import { NextRequest, NextResponse } from 'next/server';
import { crmStore } from '@/lib/crm-store';

export async function GET() {
  return NextResponse.json({
    slots: crmStore.getCalendarSlots(false),
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      action?: 'book' | 'release';
      slotId?: string;
      leadName?: string;
      company?: string;
      email?: string;
      agenda?: string;
    };

    if (body.action === 'release' && body.slotId) {
      const ok = crmStore.releaseSlot(body.slotId);
      return NextResponse.json({
        success: ok,
        slots: crmStore.getCalendarSlots(false),
      });
    }

    const activeLead = crmStore.getActiveLead();
    const result = crmStore.bookSlot({
      slotId: body.slotId,
      leadName: body.leadName || activeLead.name,
      company: body.company || activeLead.company,
      email: body.email || activeLead.email,
      agenda: body.agenda,
    });

    return NextResponse.json(
      {
        ...result,
        slots: crmStore.getCalendarSlots(false),
        leads: crmStore.getLeads(),
        activeLead: crmStore.getActiveLead(),
      },
      { status: result.success ? 200 : 409 }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Calendar operation failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
