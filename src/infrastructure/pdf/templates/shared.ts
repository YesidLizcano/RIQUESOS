// Shared PDF template helpers for Riquesos reports

import type { CustomTableLayout, Content, Style, TableCell, TDocumentDefinitions } from 'pdfmake/interfaces';

export function createHeader(title: string, periodRange: string): Content {
  return {
    columns: [
      { text: 'Distribuidora de Quesos Riquesos', style: 'companyName' },
      { text: `${title}\n${periodRange}`, alignment: 'right', style: 'headerRight' },
    ],
    margin: [40, 20, 40, 10],
  };
}

export function createFooter(): TDocumentDefinitions['footer'] {
  return (currentPage: number, pageCount: number) => ({
    columns: [
      { text: `Generado: ${new Date().toLocaleDateString('es-AR')}`, style: 'footerText' },
      { text: `Página ${currentPage} de ${pageCount}`, alignment: 'right', style: 'footerText' },
    ],
    margin: [40, 10, 40, 20],
  });
}

export function createStyles(): Record<string, Style> {
  return {
    companyName: { fontSize: 14, bold: true, color: '#1a1a2e' },
    headerRight: { fontSize: 11, color: '#555' },
    sectionTitle: { fontSize: 12, bold: true, margin: [0, 12, 0, 4] as [number, number, number, number], color: '#1a1a2e' },
    tableHeader: { bold: true, fontSize: 9, color: '#fff', fillColor: '#1a1a2e' },
    tableCell: { fontSize: 9 },
    currency: { alignment: 'right', fontSize: 9 },
    footerText: { fontSize: 8, color: '#888' },
    totalRow: { bold: true, fontSize: 9, fillColor: '#f0f0f0' },
  };
}

export const reportTableLayout: CustomTableLayout = {
  hLineWidth: () => 0.5,
  vLineWidth: () => 0.5,
  hLineColor: () => '#ccc',
  vLineColor: () => '#ccc',
  paddingLeft: () => 6,
  paddingRight: () => 6,
  paddingTop: () => 4,
  paddingBottom: () => 4,
};

/** Create a summary row for a table (bold, with background) */
export function summaryRow(
  cells: (string | Record<string, unknown>)[],
  colSpanFirst?: number,
): TableCell[] {
  const row: TableCell[] = cells.map((c): TableCell =>
    typeof c === 'string'
      ? { text: c, bold: true, fillColor: '#f0f0f0' }
      : { ...c, bold: true, fillColor: '#f0f0f0' } as TableCell,
  );

  // If colSpanFirst is set, add empty cells for the spanned columns
  if (colSpanFirst && colSpanFirst > 1) {
    const first = row[0] as Record<string, unknown>;
    row[0] = { ...first, colSpan: colSpanFirst } as TableCell;
    for (let i = 1; i < colSpanFirst; i++) {
      row.splice(i, 0, { text: '', fillColor: '#f0f0f0' });
    }
  }

  return row;
}