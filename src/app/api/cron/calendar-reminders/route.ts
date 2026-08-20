import { NextRequest, NextResponse } from 'next/server';
import { createAdminClientOrNull } from '../../../../lib/supabase/admin';
import { sendDueCalendarReminders } from '../../../../lib/calendar/send-calendar-reminders';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function isAuthorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  const auth = request.headers.get('authorization');
  return auth === `Bearer ${secret}`;
}

async function runReminders(): Promise<NextResponse> {
  const supabase = createAdminClientOrNull();
  if (!supabase) {
    return NextResponse.json(
      { error: 'Admin client is not configured' },
      { status: 500 },
    );
  }

  const result = await sendDueCalendarReminders(supabase);
  return NextResponse.json({ ok: true, ...result });
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return runReminders();
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return runReminders();
}
