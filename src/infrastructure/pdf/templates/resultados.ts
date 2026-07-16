// Estado de Resultados PDF report template

import type { TDocumentDefinitions, Content, TableCell } from 'pdfmake/interfaces';
import { createPdfBuffer, pdfCurrency, pdfDate } from '../pdfmake-config';
import { createHeader, createFooter, createStyles, reportTableLayout, summaryRow } from './shared';
import type { DashboardMetricasResponse, DesglosePorProductoResponse, DesglosePorProveedorResponse } from '@/presentation/dtos/dashboard.dto';
import { isDobleCrema, formatDobleCremaDetalle } from '@/domain/constants';
import { formatProductName } from '@/domain/formatters';

/** Format DC quantity with variety separation, or just kg for non-DC products */
function formatCantidad(args: {
  producto?: string;
  kgVendidos: string;
  dcEnteros: number;
  dcTajados: number;
  dcKgGranelEntero: string;
  dcKgGranelTajado: string;
}): string {
  const hasDC = (args.dcEnteros + args.dcTajados) > 0
    || Number(args.dcKgGranelEntero ?? 0) > 0
    || Number(args.dcKgGranelTajado ?? 0) > 0
    || (args.producto ? isDobleCrema(args.producto) : false);

  if (!hasDC) {
    // Non-DC: just show kg
    return `${Number(args.kgVendidos).toLocaleString('es-AR')} kg`;
  }
  // DC: use formatDobleCremaDetalle with 4 accumulators
  return formatDobleCremaDetalle(
    args.dcEnteros ?? 0,
    args.dcTajados ?? 0,
    Number(args.dcKgGranelEntero ?? 0),
    Number(args.dcKgGranelTajado ?? 0),
  );
}

function safePct(value: string): string {
  if (value === 'N/A' || value === undefined || value === null) return 'N/A';
  const num = parseFloat(value);
  if (isNaN(num)) return 'N/A';
  return `${num.toFixed(2)}%`;
}

function safeCurrency(value: string | undefined): string {
  if (!value) return '$0';
  return pdfCurrency(value);
}

export async function generateResultadosPdf(
  metricas: DashboardMetricasResponse,
  inicio: string,
  fin: string,
): Promise<Buffer> {
  const periodRange = `${pdfDate(inicio)} - ${pdfDate(fin)}`;
  const header = createHeader('Estado de Resultados', periodRange);
  const footer = createFooter();
  const styles = createStyles();
  const p = metricas.periodo;

  const content: Content[] = [];

  // ─── 1. Resumen Financiero ───
  content.push({ text: 'Resumen Financiero', style: 'sectionTitle' });

  const resumenBody: TableCell[][] = [
    [
      { text: 'Concepto', style: 'tableHeader' },
      { text: 'Monto', style: 'tableHeader', alignment: 'right' },
    ],
    [
      { text: 'Ingresos' },
      { text: safeCurrency(p.ingresoTotal), alignment: 'right' },
    ],
    [
      { text: 'Costo de Mercancía' },
      { text: safeCurrency(p.costoMercancia), alignment: 'right' },
    ],
    [
      { text: 'Ganancia Bruta', bold: true },
      { text: safeCurrency(p.gananciaBruta), alignment: 'right', bold: true },
    ],
  ];

  content.push({
    layout: reportTableLayout,
    table: { headerRows: 1, widths: ['*', 'auto'], body: resumenBody },
    margin: [0, 0, 0, 16],
  });

  // ─── 2. Márgenes ───
  content.push({ text: 'Márgenes', style: 'sectionTitle' });

  const margenesBody: TableCell[][] = [
    [
      { text: 'Margen', style: 'tableHeader' },
      { text: 'Porcentaje', style: 'tableHeader', alignment: 'right' },
    ],
    [
      { text: 'Margen Bruto' },
      { text: safePct(p.margenBrutoPct), alignment: 'right' },
    ],
  ];

  content.push({
    layout: reportTableLayout,
    table: { headerRows: 1, widths: ['*', 'auto'], body: margenesBody },
    margin: [0, 0, 0, 16],
  });

  // ─── 3. Desglose por Producto ───
  if (metricas.desglosePorProducto && metricas.desglosePorProducto.length > 0) {
    content.push({ text: 'Desglose por Producto', style: 'sectionTitle' });

    const productoBody: TableCell[][] = [
      [
        { text: 'Producto', style: 'tableHeader' },
        { text: 'Ingreso', style: 'tableHeader', alignment: 'right' },
        { text: 'Costo', style: 'tableHeader', alignment: 'right' },
        { text: 'Ganancia', style: 'tableHeader', alignment: 'right' },
        { text: 'Cantidad', style: 'tableHeader', alignment: 'right' },
        { text: 'Ventas', style: 'tableHeader', alignment: 'right' },
      ],
      ...metricas.desglosePorProducto.map((dp): TableCell[] => [
        { text: formatProductName(dp.producto), style: 'tableCell' },
        { text: safeCurrency(dp.ingreso), style: 'currency' },
        { text: safeCurrency(dp.costoAplicado), style: 'currency' },
        { text: safeCurrency(dp.gananciaBruta), style: 'currency' },
        { text: formatCantidad(dp), style: 'currency' },
        { text: String(dp.ventasCount), style: 'currency' },
      ]),
    ];

    content.push({
      layout: reportTableLayout,
      table: {
        headerRows: 1,
        widths: ['*', 'auto', 'auto', 'auto', 'auto', 'auto'],
        body: productoBody,
      },
      margin: [0, 0, 0, 16],
    });
  }

  // ─── 4. Desglose por Proveedor ───
  if (metricas.desglosePorProveedor && metricas.desglosePorProveedor.length > 0) {
    content.push({ text: 'Desglose por Proveedor', style: 'sectionTitle' });

    const proveedorBody: TableCell[][] = [
      [
        { text: 'Proveedor', style: 'tableHeader' },
        { text: 'Ingreso', style: 'tableHeader', alignment: 'right' },
        { text: 'Costo', style: 'tableHeader', alignment: 'right' },
        { text: 'Ganancia', style: 'tableHeader', alignment: 'right' },
        { text: 'Cantidad', style: 'tableHeader', alignment: 'right' },
        { text: 'Ventas', style: 'tableHeader', alignment: 'right' },
      ],
      ...metricas.desglosePorProveedor.map((dp): TableCell[] => [
        { text: dp.proveedorNombre, style: 'tableCell' },
        { text: safeCurrency(dp.ingreso), style: 'currency' },
        { text: safeCurrency(dp.costoAplicado), style: 'currency' },
        { text: safeCurrency(dp.gananciaBruta), style: 'currency' },
        { text: formatCantidad(dp), style: 'currency' },
        { text: String(dp.ventasCount), style: 'currency' },
      ]),
    ];

    content.push({
      layout: reportTableLayout,
      table: {
        headerRows: 1,
        widths: ['*', 'auto', 'auto', 'auto', 'auto', 'auto'],
        body: proveedorBody,
      },
      margin: [0, 0, 0, 16],
    });
  }

  // ─── 5. Flujo de Dinero ───
  content.push({ text: 'Flujo de Dinero', style: 'sectionTitle' });

  const flujoBody: TableCell[][] = [
    [
      { text: 'Concepto', style: 'tableHeader' },
      { text: 'Monto', style: 'tableHeader', alignment: 'right' },
    ],
    [
      { text: 'Efectivo' },
      { text: safeCurrency(metricas.flujoDinero.efectivo), alignment: 'right' },
    ],
    [
      { text: 'Bancos (Nequi/Bre-B)' },
      { text: safeCurrency(metricas.flujoDinero.bancos), alignment: 'right' },
    ],
    [
      { text: 'Cuentas por Cobrar' },
      { text: safeCurrency(metricas.flujoDinero.cuentasPorCobrar), alignment: 'right' },
    ],
    summaryRow([
      { text: 'Cuentas por Pagar', alignment: 'right' },
      `${safeCurrency(metricas.cuentasPorPagar.totalPendiente)} (${metricas.cuentasPorPagar.cantidadLotes} lotes)`,
    ]),
  ];

  content.push({
    layout: reportTableLayout,
    table: { headerRows: 1, widths: ['*', 'auto'], body: flujoBody },
  });

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