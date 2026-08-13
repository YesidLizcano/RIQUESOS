// PDF receipt templates for Ventas — Interno (full detail) and Cliente (stripped)

import type { TDocumentDefinitions, Content, TableCell } from 'pdfmake/interfaces';
import { Prisma } from '@prisma/client';
import { createPdfBuffer, pdfCurrency, pdfDate } from '../pdfmake-config';
import { createFooter, createStyles, reportTableLayout } from './shared';
import { isDobleCrema, formatDobleCremaGranel } from '@/domain/constants';
import { formatProductName } from '@/domain/formatters';
import type { VentaResponse, VentaItemResponse } from '@/presentation/dtos/venta.dto';

function metodoPagoLabel(metodo: string): string {
  const labels: Record<string, string> = {
    EFECTIVO: 'Efectivo',
    NEQUI: 'Nequi',
    BRE_B: 'Bre-B',
    CREDITO: 'Crédito',
  };
  return labels[metodo] ?? metodo;
}

function extractDate(isoDateTime: string): string {
  return isoDateTime.slice(0, 10);
}

function formatItemQuantity(item: VentaItemResponse, producto: string): string {
  if (item.ventaTipo === 'BLOQUES' && isDobleCrema(producto)) {
    const parts: string[] = [];
    if (item.bloquesEnterosVendidos > 0) parts.push(`${item.bloquesEnterosVendidos} enteros`);
    if (item.bloquesTajadosVendidos > 0) parts.push(`${item.bloquesTajadosVendidos} tajados`);
    let result = parts.length > 0 ? parts.join(' + ') : formatDobleCremaGranel(Number(item.cantidadKg));
    if (item.bloquesReempacados > 0) result += ` (${item.bloquesReempacados} reempacados)`;
    return result;
  }
  if (item.ventaTipo === 'GRANEL' && isDobleCrema(producto)) {
    const variedad = item.origenCorte === 'TAJADO' ? 'tajado' as const : 'entero' as const;
    const origen = variedad === 'tajado' ? (item.origenTajadoGranel as 'INTERNO' | 'FABRICA' | undefined) : undefined;
    return formatDobleCremaGranel(Number(item.cantidadKg), variedad, origen);
  }
  return `${Number(item.cantidadKg).toLocaleString('es-AR')} kg`;
}

type ReciboTipo = 'interno' | 'cliente';

interface ReciboRow {
  loteLabel: string;
  producto: string;
  tipoLabel: string;
  cantidad: string;
  precio: string;
  subtotal: string;
  costo: string;
  ganancia: string;
}

function buildItemRows(item: VentaItemResponse, loteProducto: string, loteProveedor: string, tipo: ReciboTipo): ReciboRow[] {
  const producto = loteProducto ?? '';
  const isDcBloques = item.ventaTipo === 'BLOQUES' && isDobleCrema(producto);
  const showLote = tipo === 'interno';

  if (isDcBloques) {
    const enteros = item.bloquesEnterosVendidos ?? 0;
    const tajados = item.bloquesTajadosVendidos ?? 0;
    const precioEntero = Number(item.precioEnteroBloque ?? '0');
    const precioTajado = Number(item.precioTajadoBloque ?? '0');
    const costoKg = Number(item.costoAplicadoKg);
    const costoEntero = costoKg * 2.5;
    const rows: ReciboRow[] = [];

    const baseLote = showLote
      ? [producto ? formatProductName(producto) : '', loteProveedor].filter(Boolean).join(' — ')
      : (producto ? formatProductName(producto) : '');

    if (enteros > 0) {
      const ingresoEnteros = enteros * precioEntero;
      const costoEnteros = enteros * costoEntero;
      rows.push({
        loteLabel: baseLote || '—',
        producto: baseLote || '—',
        tipoLabel: 'Enteros',
        cantidad: `${enteros} enteros`,
        precio: precioEntero > 0 ? `${pdfCurrency(precioEntero)}/entero` : '—',
        subtotal: pdfCurrency(ingresoEnteros.toString()),
        costo: pdfCurrency(costoEnteros.toString()),
        ganancia: pdfCurrency((ingresoEnteros - costoEnteros).toString()),
      });
    }
    if (tajados > 0) {
      const ingresoTajados = tajados * precioTajado;
      const costoTajados = tajados * costoEntero;
      rows.push({
        loteLabel: enteros > 0 ? '' : (baseLote || '—'),
        producto: enteros > 0 ? '' : (baseLote || '—'),
        tipoLabel: 'Tajados',
        cantidad: `${tajados} tajados`,
        precio: precioTajado > 0 ? `${pdfCurrency(precioTajado)}/tajado` : '—',
        subtotal: pdfCurrency(ingresoTajados.toString()),
        costo: pdfCurrency(costoTajados.toString()),
        ganancia: pdfCurrency((ingresoTajados - costoTajados).toString()),
      });
    }

    if (rows.length === 0) {
      rows.push({
        loteLabel: baseLote || '—',
        producto: baseLote || '—',
        tipoLabel: 'DC Bloques',
        cantidad: formatItemQuantity(item, producto),
        precio: '—',
        subtotal: pdfCurrency(item.ingreso),
        costo: pdfCurrency(item.costoAplicado),
        ganancia: pdfCurrency(item.ingreso !== '0' ? new Prisma.Decimal(item.ingreso).minus(new Prisma.Decimal(item.costoAplicado)).toString() : '0'),
      });
    }

    return rows;
  }

  // Granel or Semisalado — single row
  const origenCorte = item.origenCorte ?? 'ENTERO';
  const tipoLabel = isDobleCrema(producto) && origenCorte === 'ENTERO'
    ? 'Granel (de entero)'
    : isDobleCrema(producto) && origenCorte === 'TAJADO'
      ? 'Granel (de tajado)'
      : 'Granel';

  const baseLote = showLote
    ? [producto ? formatProductName(producto) : '', loteProveedor].filter(Boolean).join(' — ')
    : (producto ? formatProductName(producto) : '');

  return [{
    loteLabel: baseLote || '—',
    producto: baseLote || '—',
    tipoLabel,
    cantidad: formatItemQuantity(item, producto),
    precio: `${pdfCurrency(item.precioVentaKg)}/kg`,
    subtotal: pdfCurrency(item.ingreso),
    costo: pdfCurrency(item.costoAplicado),
    ganancia: pdfCurrency(item.ingreso !== '0' ? new Prisma.Decimal(item.ingreso).minus(new Prisma.Decimal(item.costoAplicado)).toString() : '0'),
  }];
}

function generateReciboPdf(venta: VentaResponse, tipo: ReciboTipo, sedeNombre?: string): Promise<Buffer> {
  const isInterno = tipo === 'interno';
  const title = isInterno ? 'Recibo Interno' : 'Recibo Cliente';
  const header: Content = {
    columns: [
      { text: 'Distribuidora de Quesos Riquesos', style: 'companyName' },
      { text: title, alignment: 'right', style: 'headerRight' },
    ],
    margin: [40, 20, 40, 10],
  };
  const footer = createFooter();
  const styles = createStyles();

  const content: Content[] = [];

  // ─── Info section ───
  const clienteNombre = venta.clienteNombre ?? (venta.clienteId ? '—' : 'Ocasional');
  const fechaStr = pdfDate(extractDate(venta.fecha));
  const metodoStr = metodoPagoLabel(venta.metodoPago) + (venta.metodoPago === 'CREDITO' ? ' (Fiado)' : '');

  const infoRows: TableCell[][] = [
    [
      { text: 'Cliente:', bold: true, fontSize: 9, color: '#555' },
      { text: clienteNombre, fontSize: 9 },
      { text: 'Fecha:', bold: true, fontSize: 9, color: '#555' },
      { text: fechaStr, fontSize: 9 },
    ],
  ];

  const sedeValue = venta.sedeNombre ?? sedeNombre ?? '—';
  infoRows.push([
    { text: 'Sede:', bold: true, fontSize: 9, color: '#555' },
    { text: sedeValue, fontSize: 9 },
    { text: 'Método de Pago:', bold: true, fontSize: 9, color: '#555' },
    { text: metodoStr, fontSize: 9 },
  ]);

  if (venta.domiciliario) {
    infoRows.push([
      { text: 'Domiciliario:', bold: true, fontSize: 9, color: '#555' },
      { text: venta.domiciliario, fontSize: 9 },
      { text: '', fontSize: 9 },
      { text: '', fontSize: 9 },
    ]);
  }

  if (venta.observaciones) {
    infoRows.push([
      { text: 'Observaciones:', bold: true, fontSize: 9, color: '#555' },
      { text: venta.observaciones, fontSize: 9, colSpan: 3 },
      {} as TableCell,
      {} as TableCell,
    ] as TableCell[]);
  }

  content.push({
    layout: {
      ...reportTableLayout,
      hLineColor: () => '#e5e7eb',
      vLineColor: () => '#e5e7eb',
    },
    table: {
      widths: ['auto', '*', 'auto', '*'],
      body: infoRows,
    },
    margin: [0, 0, 0, 12],
  });

  const allRows: ReciboRow[] = [];
  for (const item of venta.items) {
    const producto = item.loteProducto ?? '';
    const proveedor = item.loteProveedorNombre ?? '';
    const rows = buildItemRows(item, producto, proveedor, tipo);
    allRows.push(...rows);
  }

  const tableHeader: TableCell[] = isInterno
    ? [
        { text: 'Lote', style: 'tableHeader' },
        { text: 'Tipo', style: 'tableHeader', alignment: 'center' as const },
        { text: 'Cantidad', style: 'tableHeader' },
        { text: 'Precio', style: 'tableHeader', alignment: 'right' as const },
        { text: 'Subtotal', style: 'tableHeader', alignment: 'right' as const },
        { text: 'Costo', style: 'tableHeader', alignment: 'right' as const },
        { text: 'Ganancia', style: 'tableHeader', alignment: 'right' as const },
      ]
    : [
        { text: 'Producto', style: 'tableHeader' },
        { text: 'Tipo', style: 'tableHeader', alignment: 'center' as const },
        { text: 'Cantidad', style: 'tableHeader' },
        { text: 'Precio', style: 'tableHeader', alignment: 'right' as const },
        { text: 'Subtotal', style: 'tableHeader', alignment: 'right' as const },
      ];

  const tableBody: TableCell[][] = [tableHeader];

  if (allRows.length === 0) {
    const colSpan = isInterno ? 7 : 5;
    tableBody.push([
      { text: 'Sin items', colSpan, alignment: 'center' as const, fontSize: 10, margin: [0, 8, 0, 8] },
      ...(Array(colSpan - 1).fill({}) as TableCell[]),
    ]);
  } else {
    for (const row of allRows) {
      if (isInterno) {
        tableBody.push([
          { text: row.loteLabel, style: 'tableCell', fontSize: 8 },
          { text: row.tipoLabel, style: 'tableCell', alignment: 'center', fontSize: 8 },
          { text: row.cantidad, style: 'tableCell', fontSize: 8 },
          { text: row.precio, style: 'tableCell', alignment: 'right', fontSize: 8 },
          { text: row.subtotal, style: 'currency' },
          { text: row.costo, style: 'currency' },
          { text: row.ganancia, style: 'currency' },
        ]);
      } else {
        tableBody.push([
          { text: row.producto, style: 'tableCell', fontSize: 8 },
          { text: row.tipoLabel, style: 'tableCell', alignment: 'center', fontSize: 8 },
          { text: row.cantidad, style: 'tableCell', fontSize: 8 },
          { text: row.precio, style: 'tableCell', alignment: 'right', fontSize: 8 },
          { text: row.subtotal, style: 'currency' },
        ]);
      }
    }
  }

  const colWidths = isInterno
    ? ['*', 'auto', 'auto', 'auto', 'auto', 'auto', 'auto'] as (string | number)[]
    : ['*', 'auto', 'auto', 'auto', 'auto'] as (string | number)[];

  content.push({
    layout: reportTableLayout,
    table: {
      headerRows: 1,
      widths: colWidths,
      body: tableBody,
    },
  });

  // ─── Totals section ───
  const totalKg = Number(venta.cantidadTotalKg).toLocaleString('es-AR');
  const ingresoTotal = pdfCurrency(venta.ingresoTotal);
  const costoTotal = pdfCurrency(venta.costoAplicado);
  const gananciaBruta = pdfCurrency(venta.gananciaBruta);

  const totalsBody: TableCell[][] = [
    [
      { text: 'Total Kg', bold: true, fontSize: 9 },
      { text: `${totalKg} kg`, alignment: 'right', fontSize: 9 },
      { text: 'Ingreso Total', bold: true, fontSize: 9 },
      { text: ingresoTotal, alignment: 'right', bold: true, fontSize: 9 },
    ],
  ];

  if (isInterno) {
    totalsBody.push([
      { text: 'Costo Total', bold: true, fontSize: 9 },
      { text: costoTotal, alignment: 'right', fontSize: 9 },
      { text: 'Ganancia Bruta', bold: true, fontSize: 9 },
      {
        text: gananciaBruta,
        alignment: 'right',
        bold: true,
        fontSize: 9,
        color: Number(venta.gananciaBruta) < 0 ? '#dc2626' : '#16a34a',
      },
    ] as TableCell[]);
  }

  content.push({
    layout: {
      ...reportTableLayout,
      hLineColor: () => '#ccc',
      vLineColor: () => '#ccc',
      fillColor: (rowIndex: number) => rowIndex === 0 ? '#f9fafb' : null,
    },
    table: {
      widths: ['*', 'auto', '*', 'auto'],
      body: totalsBody,
    },
    margin: [0, 12, 0, 0],
  });

  // ─── Disclaimer ───
  content.push({
    text: 'Documento no válido como factura',
    alignment: 'center',
    fontSize: 8,
    color: '#999',
    margin: [0, 20, 0, 0],
  });

  const docDefinition: TDocumentDefinitions = {
    pageSize: 'A4',
    pageMargins: [40, 60, 40, 60],
    header,
    footer,
    content,
    defaultStyle: {
      font: 'Roboto',
      fontSize: 10,
    },
    styles,
  };

  return createPdfBuffer(docDefinition);
}

export function generateReciboInternoPdf(venta: VentaResponse, sedeNombre?: string): Promise<Buffer> {
  return generateReciboPdf(venta, 'interno', sedeNombre);
}

export function generateReciboClientePdf(venta: VentaResponse, sedeNombre?: string): Promise<Buffer> {
  return generateReciboPdf(venta, 'cliente', sedeNombre);
}