import path from 'node:path';
import { Font } from '@react-pdf/renderer';

let fontsRegistered = false;

/** Registers Roboto (full Latin / Polish diacritics) for server-side PDF generation. */
export function ensurePdfFontsRegistered(): void {
  if (fontsRegistered) return;

  const fontsDir = path.join(process.cwd(), 'src/lib/reports/fonts');

  Font.register({
    family: 'Roboto',
    fonts: [
      { src: path.join(fontsDir, 'Roboto-Regular.ttf'), fontWeight: 'normal' },
      { src: path.join(fontsDir, 'Roboto-Bold.ttf'), fontWeight: 'bold' },
    ],
  });

  fontsRegistered = true;
}

export const PDF_FONT_FAMILY = 'Roboto';
