// pdfmake configuration for server-side PDF generation
// Uses absolute paths to Roboto font files bundled with pdfmake

import path from 'path';
import * as pdfmake from 'pdfmake';
import type { TDocumentDefinitions } from 'pdfmake/interfaces';

const fontsDir = path.join(
  process.cwd(),
  'node_modules',
  'pdfmake',
  'fonts',
  'Roboto',
);

pdfmake.addFonts({
  Roboto: {
    normal: path.join(fontsDir, 'Roboto-Regular.ttf'),
    bold: path.join(fontsDir, 'Roboto-Medium.ttf'),
    italics: path.join(fontsDir, 'Roboto-Italic.ttf'),
    bolditalics: path.join(fontsDir, 'Roboto-MediumItalic.ttf'),
  },
});

/** Format number as Argentine peso: $150.000 */
export function pdfCurrency(value: string | number): string {
  const num = typeof value === 'string' ? Number(value) : value;
  if (isNaN(num)) return '$0';
  return `$${Math.round(num).toLocaleString('es-AR')}`;
}

/** Format ISO date string as dd/MM/yyyy */
export function pdfDate(isoDate: string): string {
  const [y, m, d] = isoDate.split('-');
  return `${d}/${m}/${y}`;
}

/** Create a pdfmake document and return it as a Buffer */
export function createPdfBuffer(docDefinition: TDocumentDefinitions): Promise<Buffer> {
  const pdf = pdfmake.createPdf(docDefinition);
  return pdf.getBuffer();
}