// Cuentas por Cobrar PDF report template

import type { TDocumentDefinitions, TableCell } from 'pdfmake/interfaces';
import { createPdfBuffer, pdfCurrency, pdfDate } from '../pdfmake-config';
import { createHeader, createFooter, createStyles, reportTableLayout } from './shared';
import { Prisma } from '@prisma/client';
import type { CuentaPorCobrar } from '@/application/use-cases/ObtenerCuentasPorCobrar';

function formatDate(dateStr: string): string {
  if (dateStr.includes('T')) {
    const [datePart] = dateStr.split('T');
    const [y, m, d] = datePart.split('-');
    return `${d}/${m}/${y}`;
  }
  return pdfDate(dateStr);
}

export async function generateCuentasCobrarPdf(
  cuentas: CuentaPorCobrar[],
  inicio: string,
  fin: string,
): Promise<Buffer> {
  const periodRange = `${pdfDate(inicio)} - ${pdfDate(fin)}`;
  const header = createHeader('Cuentas por Cobrar', periodRange);
  const footer = createFooter();
  const styles = createStyles();

  const totalSaldo = cuentas.reduce(
    (sum, c) => sum.add(new Prisma.Decimal(c.saldo)),
    new Prisma.Decimal(0),
  ).toString();

  const tableBody: TableCell[][] = [];

  // Header row
  tableBody.push([
    { text: 'Cliente', style: 'tableHeader' },
    { text: 'Sede', style: 'tableHeader' },
    { text: 'Fecha', style: 'tableHeader' },
    { text: 'Ingreso Total', style: 'tableHeader', alignment: 'right' as const },
    { text: 'Abonado', style: 'tableHeader', alignment: 'right' as const },
    { text: 'Saldo Pendiente', style: 'tableHeader', alignment: 'right' as const },
  ]);

  if (cuentas.length === 0) {
    tableBody.push([
      { text: 'No hay cuentas por cobrar en este período', colSpan: 6, alignment: 'center' as const, fontSize: 10, margin: [0, 8, 0, 8] },
      {} as TableCell,
      {} as TableCell,
      {} as TableCell,
      {} as TableCell,
      {} as TableCell,
    ]);
  } else {
    for (const c of cuentas) {
      tableBody.push([
        { text: c.clienteNombre, style: 'tableCell' },
        { text: c.sedeNombre ?? '—', style: 'tableCell' },
        { text: formatDate(c.fecha), style: 'tableCell' },
        { text: pdfCurrency(c.ingresoTotal), style: 'currency' },
        { text: pdfCurrency(c.abono), style: 'currency' },
        { text: pdfCurrency(c.saldo), style: 'currency' },
      ]);
    }

    // Total row
    tableBody.push([
      { text: 'TOTAL', bold: true, fontSize: 9, fillColor: '#f0f0f0' },
      { text: '', fillColor: '#f0f0f0' },
      { text: '', fillColor: '#f0f0f0' },
      { text: '', fillColor: '#f0f0f0' },
      { text: '', fillColor: '#f0f0f0' },
      { text: pdfCurrency(totalSaldo), bold: true, style: 'currency', fillColor: '#f0f0f0' },
    ]);
  }

  const docDefinition: TDocumentDefinitions = {
    pageSize: 'A4',
    pageMargins: [40, 60, 40, 60],
    header: header,
    footer: footer,
    content: [
      {
        layout: reportTableLayout,
        table: {
          headerRows: 1,
          widths: ['*', 'auto', 'auto', 'auto', 'auto', 'auto'],
          body: tableBody,
        },
      },
    ],
    defaultStyle: {
      font: 'Roboto',
      fontSize: 10,
    },
    styles: styles,
  };

  return createPdfBuffer(docDefinition);
}