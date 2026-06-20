import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '../../../../../lib/supabase/server';
import { fetchUserPrimaryCompany } from '../../../../../lib/database/companies';
import { fetchOfferSelectionProtocolData } from '../../../../../lib/reports/fetch-offer-selection-protocol-data';
import {
  generateOfferSelectionProtocolPdf,
  offerSelectionProtocolFilename,
} from '../../../../../lib/reports/generate-offer-selection-protocol-pdf';

interface RouteContext {
  params: Promise<{ contestId: string }>;
}

export async function GET(
  _request: NextRequest,
  context: RouteContext,
): Promise<NextResponse> {
  try {
    const { contestId } = await context.params;
    if (!contestId?.trim()) {
      return NextResponse.json({ error: 'Nieprawidłowy identyfikator konkursu' }, { status: 400 });
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Wymagane logowanie' }, { status: 401 });
    }

    const { data: company, error: companyError } = await fetchUserPrimaryCompany(
      supabase,
      user.id,
    );

    if (companyError || !company) {
      return NextResponse.json({ error: 'Brak firmy zarządcy' }, { status: 403 });
    }

    const { data, error, status } = await fetchOfferSelectionProtocolData(
      supabase,
      contestId.trim(),
      user.id,
      company.id,
    );

    if (!data) {
      return NextResponse.json({ error: error ?? 'Nie udało się wygenerować protokołu' }, { status: status ?? 500 });
    }

    const pdfBuffer = await generateOfferSelectionProtocolPdf(data);
    const filename = offerSelectionProtocolFilename(data.contestId);

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'private, no-store',
      },
    });
  } catch (err) {
    console.error('GET /api/contests/[contestId]/protocol:', err);
    return NextResponse.json({ error: 'Nie udało się wygenerować protokołu' }, { status: 500 });
  }
}
