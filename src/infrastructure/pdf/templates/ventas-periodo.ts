// Ventas por Período PDF report template

import type { TDocumentDefinitions, Content, TableCell } from 'pdfmake/interfaces';
import { Prisma } from '@prisma/client';
import { createPdfBuffer, pdfCurrency, pdfDate } from '../pdfmake-config';
import { createHeader, createFooter, createStyles, reportTableLayout, summaryRow } from './shared';
import type { VentaResponse, VentaItemResponse } from '@/presentation/dtos/venta.dto';
import { isDobleCrema, formatDobleCremaGranel } from '@/domain/constants';
import { formatProductName } from '@/domain/formatters';

/** Map metodoPago enum to display label */
function metodoPagoLabel(metodo: string): string {
  const labels: Record<string, string> = {
    EFECTIVO: 'Efectivo',
    NEQUI: 'Nequi',
    BRE_B: 'Bre-B',
    CREDITO: 'Crédito',
  };
  return labels[metodo] ?? metodo;
}

/** Extract just the date portion from an ISO datetime */
function extractDate(isoDateTime: string): string {
  return isoDateTime.slice(0, 10);
}

/**
 * Format a single item for PDF display.
 * Mirrors the web UI's formatItemSummary logic from venta-columns.tsx,
 * but with DC granel always converted to block notation.
 */
function formatItemSummary(item: VentaItemResponse, producto: string): string {
  if (item.ventaTipo === 'BLOQUES' && isDobleCrema(producto)) {
    const parts: string[] = [];
    if (item.bloquesEnterosVendidos > 0) parts.push(`${item.bloquesEnterosVendidos} enteros`);
    if (item.bloquesTajadosVendidos > 0) parts.push(`${item.bloquesTajadosVendidos} tajados`);
    let result = parts.length > 0 ? parts.join(' + ') : formatDobleCremaGranel(Number(item.cantidadKg));
    if (item.bloquesReempacados > 0) result += ` (${item.bloquesReempacados} reempacados)`;
    return result;
  }
  // Granel DC: convert kg to blocks + remainder, variety determines suffix
  if (item.ventaTipo === 'GRANEL' && isDobleCrema(producto)) {
    const variedad = item.origenCorte === 'TAJADO' ? 'tajado' as const : 'entero' as const;
    return formatDobleCremaGranel(Number(item.cantidadKg), variedad);
  }
  return `${Number(item.cantidadKg).toLocaleString('es-AR')} kg`;
}

/**
 * Build the product detail string for a venta.
 * Each item gets "Producto: detail" format, multiple items joined by newlines.
 */
function formatVentaDetalle(venta: VentaResponse): string {
  const items = venta.items ?? [];
  if (items.length === 0) return `${Number(venta.cantidadTotalKg).toLocaleString('es-AR')} kg`;

  return items.map((item) => {
    const producto = item.loteProducto ?? '';
    const productoLabel = producto ? `${formatProductName(producto)}: ` : '';
    const detail = formatItemSummary(item, producto);
    return `${productoLabel}${detail}`;
  }).join('\n');
}

export async function generateVentasPeriodoPdf(
  ventas: VentaResponse[],
  inicio: string,
  fin: string,
): Promise<Buffer> {
  const periodRange = `${pdfDate(inicio)} - ${pdfDate(fin)}`;
  const header = createHeader('Ventas por Período', periodRange);
  const footer = createFooter();
  const styles = createStyles();

  const content: Content[] = [];

  // ─── Main sales table ───
  const tableBody: TableCell[][] = [
    [
      { text: 'Fecha', style: 'tableHeader' },
      { text: 'Cliente', style: 'tableHeader' },
      { text: 'Sede', style: 'tableHeader' },
      { text: 'Método Pago', style: 'tableHeader' },
      { text: 'Detalle', style: 'tableHeader' },
      { text: 'Ingreso Total', style: 'tableHeader', alignment: 'right' },
      { text: 'Ganancia Bruta', style: 'tableHeader', alignment: 'right' },
    ],
  ];

  if (ventas.length === 0) {
    tableBody.push([
      { text: 'No hay ventas en este período', colSpan: 7, alignment: 'center' as const, fontSize: 10, margin: [0, 8, 0, 8] },
      {} as TableCell,
      {} as TableCell,
      {} as TableCell,
      {} as TableCell,
      {} as TableCell,
      {} as TableCell,
    ]);
  } else {
    let totalIngreso = new Prisma.Decimal(0);
    let totalGanancia = new Prisma.Decimal(0);

    for (const v of ventas) {
      const ingreso = new Prisma.Decimal(v.ingresoTotal);
      const ganancia = new Prisma.Decimal(v.gananciaBruta);

      totalIngreso = totalIngreso.add(ingreso);
      totalGanancia = totalGanancia.add(ganancia);

      const detalle = formatVentaDetalle(v);

      tableBody.push([
        { text: pdfDate(extractDate(v.fecha)), style: 'tableCell' },
        { text: v.clienteNombre ?? v.clienteId, style: 'tableCell' },
        { text: v.sedeNombre ?? '—', style: 'tableCell' },
        { text: metodoPagoLabel(v.metodoPago), style: 'tableCell' },
        { text: detalle, style: 'tableCell', fontSize: 8 },
        { text: pdfCurrency(ingreso.toString()), style: 'currency' },
        { text: pdfCurrency(ganancia.toString()), style: 'currency' },
      ]);
    }

    // Total row
    tableBody.push(
      summaryRow([
        { text: 'TOTAL', alignment: 'right' },
        '',
        '',
        '',
        '',
        pdfCurrency(totalIngreso.toString()),
        pdfCurrency(totalGanancia.toString()),
      ]),
    );
  }

  content.push({
    layout: reportTableLayout,
    table: {
      headerRows: 1,
      widths: ['auto', '*', 'auto', 'auto', '*', 'auto', 'auto'],
      body: tableBody,
    },
  });

  // ─── Summary by payment method ───
  if (ventas.length > 0) {
    content.push({ text: 'Resumen por Método de Pago', style: 'sectionTitle' });

    // Group by metodoPago
    const byMetodo = new Map<string, { count: number; ingreso: Prisma.Decimal; ganancia: Prisma.Decimal }>();
    for (const v of ventas) {
      const label = metodoPagoLabel(v.metodoPago);
      const existing = byMetodo.get(label) ?? { count: 0, ingreso: new Prisma.Decimal(0), ganancia: new Prisma.Decimal(0) };
      existing.count += 1;
      existing.ingreso = existing.ingreso.add(new Prisma.Decimal(v.ingresoTotal));
      existing.ganancia = existing.ganancia.add(new Prisma.Decimal(v.gananciaBruta));
      byMetodo.set(label, existing);
    }

    const metodoBody: TableCell[][] = [
      [
        { text: 'Método de Pago', style: 'tableHeader' },
        { text: 'Ventas', style: 'tableHeader', alignment: 'right' },
        { text: 'Ingreso Total', style: 'tableHeader', alignment: 'right' },
        { text: 'Ganancia Bruta', style: 'tableHeader', alignment: 'right' },
      ],
      ...Array.from(byMetodo.entries()).map(([label, data]): TableCell[] => [
        { text: label, style: 'tableCell' },
        { text: String(data.count), alignment: 'right', fontSize: 9 },
        { text: pdfCurrency(data.ingreso.toString()), style: 'currency' },
        { text: pdfCurrency(data.ganancia.toString()), style: 'currency' },
      ]),
    ];

    content.push({
      layout: reportTableLayout,
      table: {
        headerRows: 1,
        widths: ['*', 'auto', 'auto', 'auto'],
        body: metodoBody,
      },
    });
  }

  const docDefinition: TDocumentDefinitions = {
    pageSize: 'A4',
    pageMargins: [40, 60, 40, 60],
    header: header,
    footer: footer,
    content: content,
    defaultStyle: {
      font: 'Roboto',
      fontSize: 10,
    },
    styles: styles,
  };

  return createPdfBuffer(docDefinition);
}