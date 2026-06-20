import { renderToBuffer } from '@react-pdf/renderer';
import { OfferSelectionProtocolDocument } from './offer-selection-protocol-document';
import type { OfferSelectionProtocolData } from './fetch-offer-selection-protocol-data';
import { ensurePdfFontsRegistered } from './pdf-fonts';

export async function generateOfferSelectionProtocolPdf(
  data: OfferSelectionProtocolData,
): Promise<Buffer> {
  ensurePdfFontsRegistered();
  const buffer = await renderToBuffer(<OfferSelectionProtocolDocument data={data} />);
  return Buffer.from(buffer);
}

export function offerSelectionProtocolFilename(contestId: string): string {
  const shortId = contestId.replace(/-/g, '').slice(0, 8);
  return `protokol-wyboru-ofert-${shortId}.pdf`;
}
