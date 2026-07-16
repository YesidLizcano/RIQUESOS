'use client';

import type { DashboardMetricasResponse, VentaResponse } from '@/presentation/dtos';
import type { Workbook, Worksheet } from 'exceljs';
import {
  formatDobleCremaDetalle,
  formatDobleCremaGranel,
  isDobleCrema,
} from '@/domain/constants';
import { formatCurrency, formatProductName, formatSSKg } from '@/domain/formatters';

// ── Style constants (shared with use-export-excel) ──────────────────────────

const HEADER_FILL: Partial<import('exceljs').FillPattern> = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FF1F4E79' },
};

const RESUMEN_HEADER_FILL: Partial<import('exceljs').FillPattern> = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FF4472C4' },
};

const ALT_ROW_FILL: Partial<import('exceljs').FillPattern> = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FFF2F2F2' },
};

const THIN_BORDER: Partial<import('exceljs').Borders> = {
  top: { style: 'thin', color: { argb: 'FF000000' } },
  left: { style: 'thin', color: { argb: 'FF000000' } },
  bottom: { style: 'thin', color: { argb: 'FF000000' } },
  right: { style: 'thin', color: { argb: 'FF000000' } },
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function styleHeaderRow(ws: Worksheet, colCount: number, fill?: Partial<import('exceljs').FillPattern>) {
  const headerRow = ws.getRow(1);
  headerRow.height = 24;
  for (let c = 1; c <= colCount; c++) {
    const cell = headerRow.getCell(c);
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
    cell.fill = (fill ?? HEADER_FILL) as import('exceljs').FillPattern;
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.border = THIN_BORDER as import('exceljs').Borders;
  }
}

function styleDataRows(ws: Worksheet, startRow: number, endRow: number) {
  for (let r = startRow; r <= endRow; r++) {
    const row = ws.getRow(r);
    const isEven = (r - startRow) % 2 === 1;
    for (let c = 1; c <= (row.cellCount as number); c++) {
      const cell = row.getCell(c);
      cell.border = THIN_BORDER as import('exceljs').Borders;
      if (isEven) {
        cell.fill = ALT_ROW_FILL as import('exceljs').FillPattern;
      }
      cell.alignment = { vertical: 'middle' };
    }
  }
}

function autoFitColumns(ws: Worksheet) {
  ws.columns.forEach((col) => {
    let maxLen = 0;
    for (let r = 2; r <= ws.rowCount; r++) {
      const cell = ws.getRow(r).getCell(col.number!);
      const len = String(cell.value ?? '').length;
      if (len > maxLen) maxLen = len;
    }
    const headerLen = String(col.header ?? '').length;
    if (headerLen > maxLen) maxLen = headerLen;
    col.width = Math.min(40, Math.max(12, maxLen + 2));
  });
}

async function downloadWorkbook(wb: Workbook, filename: string) {
  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  window.URL.revokeObjectURL(url);
}

// ── Sheet builders ───────────────────────────────────────────────────────────

function buildResumenSheet(wb: Workbook, metricas: DashboardMetricasResponse) {
  const p = metricas.periodo;
  const ws = wb.addWorksheet('Resumen', { views: [{ state: 'frozen', ySplit: 1 }] });

  ws.columns = [
    { header: 'Métrica', key: 'metrica', width: 30 },
    { header: 'Valor', key: 'valor', width: 35 },
  ];

  // DC block notation volume
  const dcVolume = formatDobleCremaDetalle(
    p.volumenDobleCremaEnteros,
    p.volumenDobleCremaTajados,
    Number(p.volumenDobleCremaKgGranelEntero),
    Number(p.volumenDobleCremaKgGranelTajado),
  );

  const ssVolume = formatSSKg(Number(p.volumenSemisaladoKg));

  const rows: Array<{ metrica: string; valor: string | number }> = [
    { metrica: 'Ingresos', valor: Number(p.ingresoTotal) },
    { metrica: 'Costo Mercancía', valor: Number(p.costoMercancia) },
    { metrica: 'Ganancia Bruta', valor: Number(p.gananciaBruta) },
    { metrica: 'Margen Bruto (%)', valor: p.margenBrutoPct === 'N/A' ? 'N/A' : Number(p.margenBrutoPct) / 100 },
    { metrica: 'Ventas', valor: p.ventasCount },
    { metrica: 'Clientes Activos', valor: p.clientesActivos },
    { metrica: 'Volumen Doble Crema', valor: dcVolume },
    { metrica: 'Volumen Semisalado', valor: ssVolume },
    { metrica: 'Efectivo', valor: Number(metricas.flujoDinero.efectivo) },
    { metrica: 'Bancos / Nequi / Bre-B', valor: Number(metricas.flujoDinero.bancos) },
    { metrica: 'Cuentas por Cobrar', valor: Number(metricas.flujoDinero.cuentasPorCobrar) },
    { metrica: 'Cuentas por Pagar (Tajados)', valor: Number(metricas.cuentasPorPagar.tajadosPendientesPago) },
  ];

  rows.forEach((r) => ws.addRow(r));

  styleHeaderRow(ws, 2, RESUMEN_HEADER_FILL);

  const dataStart = 2;
  const dataEnd = 1 + rows.length;
  for (let r = dataStart; r <= dataEnd; r++) {
    const row = ws.getRow(r);
    const isEven = (r - dataStart) % 2 === 1;
    const metricaCell = row.getCell(1);
    const valorCell = row.getCell(2);

    metricaCell.font = { bold: true, size: 11 };
    metricaCell.border = THIN_BORDER as import('exceljs').Borders;
    metricaCell.alignment = { horizontal: 'left', vertical: 'middle' };
    if (isEven) {
      metricaCell.fill = ALT_ROW_FILL as import('exceljs').FillPattern;
    }

    valorCell.border = THIN_BORDER as import('exceljs').Borders;
    valorCell.alignment = { horizontal: 'right', vertical: 'middle' };
    if (isEven) {
      valorCell.fill = ALT_ROW_FILL as import('exceljs').FillPattern;
    }

    const rowIdx = r - dataStart;
    if (rowIdx < 3) {
      // Ingresos, Costo, Ganancia → currency
      valorCell.numFmt = '"$"#,##0';
    } else if (rowIdx === 3) {
      // Margen → percentage or N/A
      if (valorCell.value !== 'N/A') {
        valorCell.numFmt = '0.0%';
      }
    } else if (rowIdx === 4 || rowIdx === 5) {
      // Ventas, Clientes → integer
      valorCell.numFmt = '#,##0';
    } else if (rowIdx === 6 || rowIdx === 7) {
      // DC volume, SS volume → text (already formatted string)
      valorCell.numFmt = '@';
      valorCell.alignment = { horizontal: 'left', vertical: 'middle' };
    } else if (rowIdx === 8 || rowIdx === 9) {
      // Efectivo, Bancos → currency
      valorCell.numFmt = '"$"#,##0';
    } else {
      // CxC, CxP Tajados → currency
      valorCell.numFmt = '"$"#,##0';
    }
  }

  ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: dataEnd, column: 2 } };
}

function buildVentasDiariasSheet(wb: Workbook, metricas: DashboardMetricasResponse) {
  const ws = wb.addWorksheet('Ventas Diarias', { views: [{ state: 'frozen', ySplit: 1 }] });

  ws.columns = [
    { header: 'Fecha', key: 'fecha', width: 14 },
    { header: 'Total', key: 'total', width: 18 },
  ];

  const data = metricas.ventasDiarias.map((vd) => {
    const [y, m, d] = vd.fecha.slice(0, 10).split('-');
    return {
      fecha: `${d}/${m}/${y}`,
      total: Number(vd.total),
    };
  });

  data.forEach((r) => ws.addRow(r));

  styleHeaderRow(ws, 2);

  const dataStart = 2;
  const dataEnd = 1 + data.length;
  for (let r = dataStart; r <= dataEnd; r++) {
    const row = ws.getRow(r);
    const isEven = (r - dataStart) % 2 === 1;

        const fechaCell = row.getCell(1);
        // Date is already a DD/MM/YYYY string — no numFmt needed
        fechaCell.border = THIN_BORDER as import('exceljs').Borders;
        fechaCell.alignment = { horizontal: 'left', vertical: 'middle' };
        if (isEven) fechaCell.fill = ALT_ROW_FILL as import('exceljs').FillPattern;

    const totalCell = row.getCell(2);
    totalCell.numFmt = '"$"#,##0';
    totalCell.border = THIN_BORDER as import('exceljs').Borders;
    totalCell.alignment = { horizontal: 'right', vertical: 'middle' };
    if (isEven) totalCell.fill = ALT_ROW_FILL as import('exceljs').FillPattern;
  }

  ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: dataEnd, column: 2 } };
}

function buildTopClientesSheet(wb: Workbook, metricas: DashboardMetricasResponse) {
  const ws = wb.addWorksheet('Top Clientes', { views: [{ state: 'frozen', ySplit: 1 }] });

  ws.columns = [
    { header: 'Cliente', key: 'cliente', width: 30 },
    { header: 'Ingreso Total', key: 'ingresoTotal', width: 20 },
  ];

  const data = metricas.topClientes.map((tc) => ({
    cliente: tc.nombre,
    ingresoTotal: Number(tc.ingresoTotal),
  }));

  data.forEach((r) => ws.addRow(r));

  styleHeaderRow(ws, 2);
  styleDataRows(ws, 2, 1 + data.length);

  for (let r = 2; r <= 1 + data.length; r++) {
    ws.getRow(r).getCell(2).numFmt = '"$"#,##0';
    ws.getRow(r).getCell(2).alignment = { horizontal: 'right', vertical: 'middle' };
    ws.getRow(r).getCell(1).alignment = { horizontal: 'left', vertical: 'middle' };
  }

  ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1 + data.length, column: 2 } };
}

function buildInventarioSheet(wb: Workbook, metricas: DashboardMetricasResponse) {
  const ws = wb.addWorksheet('Inventario', { views: [{ state: 'frozen', ySplit: 1 }] });

  ws.columns = [
    { header: 'Producto', key: 'producto', width: 20 },
    { header: 'Detalle', key: 'detalle', width: 40 },
    { header: 'Stock Disponible', key: 'stockDisponible', width: 18 },
    { header: 'Lotes Activos', key: 'lotesActivos', width: 14 },
  ];

  const data = metricas.inventarioPorTipo.map((item) => {
    const isDC = item.tipo === 'DOBLE_CREMA';
    const producto = formatProductName(item.tipo);

    let detalle: string;
    let stockDisponible: string;

    if (isDC) {
      const bloquesTajados = item.bloquesTajados + item.bloquesTajadosDeFabrica;
      detalle = formatDobleCremaDetalle(
        item.bloquesEnteros,
        bloquesTajados,
        Number(item.sueltosEntero),
        Number(item.sueltosTajado),
      );
      stockDisponible = `${Number(item.stockKg).toFixed(1)} kg`;
    } else {
      detalle = formatSSKg(Number(item.stockKg));
      stockDisponible = `${Number(item.stockKg).toFixed(1)} kg`;
    }

    return {
      producto,
      detalle,
      stockDisponible,
      lotesActivos: item.lotes,
    };
  });

  data.forEach((r) => ws.addRow(r));

  styleHeaderRow(ws, 4);
  styleDataRows(ws, 2, 1 + data.length);

  for (let r = 2; r <= 1 + data.length; r++) {
    ws.getRow(r).getCell(1).alignment = { horizontal: 'left', vertical: 'middle' };
    ws.getRow(r).getCell(2).alignment = { horizontal: 'left', vertical: 'middle' };
    ws.getRow(r).getCell(3).alignment = { horizontal: 'right', vertical: 'middle' };
    ws.getRow(r).getCell(4).alignment = { horizontal: 'right', vertical: 'middle' };
  }

  ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1 + data.length, column: 4 } };
}

function buildDetalleVentasSheet(wb: Workbook, ventas: VentaResponse[]) {
  const ws = wb.addWorksheet('Detalle de Ventas', { views: [{ state: 'frozen', ySplit: 1 }] });

  ws.columns = [
    { header: 'Fecha', key: 'fecha', width: 14 },
    { header: 'Cliente', key: 'cliente', width: 30 },
    { header: 'Sede', key: 'sede', width: 20 },
    { header: 'Producto', key: 'producto', width: 35 },
    { header: 'Cantidad', key: 'cantidad', width: 30 },
    { header: 'Ingreso ($)', key: 'ingreso', width: 18 },
    { header: 'Costo ($)', key: 'costo', width: 18 },
    { header: 'Ganancia Bruta ($)', key: 'ganancia', width: 20 },
  ];

  styleHeaderRow(ws, 8);

  let totalIngreso = 0;
  let totalCosto = 0;
  let totalGanancia = 0;

  for (const venta of ventas) {
    const fechaStr = venta.fecha.slice(0, 10); // YYYY-MM-DD
    const [year, month, day] = fechaStr.split('-');
    const fechaDisplay = `${day}/${month}/${year}`;
    const cliente = venta.clienteNombre ?? 'Desconocido';

    for (const item of venta.items) {
      const isDC = isDobleCrema(item.loteProducto ?? '');

      // Product name with optional supplier
      const productName = formatProductName(item.loteProducto ?? '');
      const proveedor = (item as any).loteProveedorNombre;
      const producto = proveedor ? `${productName} — ${proveedor}` : productName;

      // Quantity — format depends on product type
      let cantidad: string;
      if (isDC) {
        if (item.ventaTipo === 'BLOQUES') {
          cantidad = formatDobleCremaDetalle(
            item.bloquesEnterosVendidos ?? 0,
            item.bloquesTajadosVendidos ?? 0,
            0,
            0,
          );
        } else {
          // GRANEL
          const variedad = item.origenCorte === 'TAJADO' ? 'tajado' : 'entero';
          cantidad = formatDobleCremaGranel(Number(item.cantidadKg), variedad);
        }
      } else {
        // Semisalado
        cantidad = `${Number(item.cantidadKg).toFixed(1)} kg`;
      }

      const ingreso = Number(item.ingreso);
      const costo = Number(item.costoAplicado);
      const ganancia = ingreso - costo;

      totalIngreso += ingreso;
      totalCosto += costo;
      totalGanancia += ganancia;

      ws.addRow({
        fecha: fechaDisplay,
        cliente,
        sede: venta.sedeNombre ?? '',
        producto,
        cantidad,
        ingreso,
        costo,
        ganancia,
      });
    }
  }

  const dataStart = 2;
  const dataEnd = ws.rowCount;

  // Style data rows
  for (let r = dataStart; r <= dataEnd; r++) {
    const row = ws.getRow(r);
    const isEven = (r - dataStart) % 2 === 1;

    // Fecha (col 1) — text
    row.getCell(1).alignment = { horizontal: 'left', vertical: 'middle' };
    row.getCell(1).border = THIN_BORDER as import('exceljs').Borders;
    if (isEven) row.getCell(1).fill = ALT_ROW_FILL as import('exceljs').FillPattern;

    // Cliente (col 2) — text
    row.getCell(2).alignment = { horizontal: 'left', vertical: 'middle' };
    row.getCell(2).border = THIN_BORDER as import('exceljs').Borders;
    if (isEven) row.getCell(2).fill = ALT_ROW_FILL as import('exceljs').FillPattern;

    // Sede (col 3) — text
    row.getCell(3).alignment = { horizontal: 'left', vertical: 'middle' };
    row.getCell(3).border = THIN_BORDER as import('exceljs').Borders;
    if (isEven) row.getCell(3).fill = ALT_ROW_FILL as import('exceljs').FillPattern;

    // Producto (col 4) — text
    row.getCell(4).alignment = { horizontal: 'left', vertical: 'middle' };
    row.getCell(4).border = THIN_BORDER as import('exceljs').Borders;
    if (isEven) row.getCell(4).fill = ALT_ROW_FILL as import('exceljs').FillPattern;

    // Cantidad (col 5) — text (block notation)
    row.getCell(5).alignment = { horizontal: 'left', vertical: 'middle' };
    row.getCell(5).border = THIN_BORDER as import('exceljs').Borders;
    if (isEven) row.getCell(5).fill = ALT_ROW_FILL as import('exceljs').FillPattern;

    // Ingreso (col 6) — currency
    row.getCell(6).numFmt = '"$"#,##0';
    row.getCell(6).alignment = { horizontal: 'right', vertical: 'middle' };
    row.getCell(6).border = THIN_BORDER as import('exceljs').Borders;
    if (isEven) row.getCell(6).fill = ALT_ROW_FILL as import('exceljs').FillPattern;

    // Costo (col 7) — currency
    row.getCell(7).numFmt = '"$"#,##0';
    row.getCell(7).alignment = { horizontal: 'right', vertical: 'middle' };
    row.getCell(7).border = THIN_BORDER as import('exceljs').Borders;
    if (isEven) row.getCell(7).fill = ALT_ROW_FILL as import('exceljs').FillPattern;

    // Ganancia (col 8) — currency
    row.getCell(8).numFmt = '"$"#,##0';
    row.getCell(8).alignment = { horizontal: 'right', vertical: 'middle' };
    row.getCell(8).border = THIN_BORDER as import('exceljs').Borders;
    if (isEven) row.getCell(8).fill = ALT_ROW_FILL as import('exceljs').FillPattern;
  }

  // Totals row
  if (totalIngreso > 0 || totalCosto > 0) {
    const totalsRowNum = dataEnd + 1;
    const totalsRow = ws.getRow(totalsRowNum);

    totalsRow.getCell(1).value = '';
    totalsRow.getCell(2).value = '';
    totalsRow.getCell(3).value = '';
    totalsRow.getCell(4).value = '';
    totalsRow.getCell(5).value = 'TOTAL';
    totalsRow.getCell(5).font = { bold: true, size: 11 };
    totalsRow.getCell(5).alignment = { horizontal: 'right', vertical: 'middle' };
    totalsRow.getCell(5).border = THIN_BORDER as import('exceljs').Borders;

    totalsRow.getCell(6).value = totalIngreso;
    totalsRow.getCell(6).numFmt = '"$"#,##0';
    totalsRow.getCell(6).font = { bold: true, size: 11 };
    totalsRow.getCell(6).alignment = { horizontal: 'right', vertical: 'middle' };
    totalsRow.getCell(6).border = THIN_BORDER as import('exceljs').Borders;

    totalsRow.getCell(7).value = totalCosto;
    totalsRow.getCell(7).numFmt = '"$"#,##0';
    totalsRow.getCell(7).font = { bold: true, size: 11 };
    totalsRow.getCell(7).alignment = { horizontal: 'right', vertical: 'middle' };
    totalsRow.getCell(7).border = THIN_BORDER as import('exceljs').Borders;

    totalsRow.getCell(8).value = totalGanancia;
    totalsRow.getCell(8).numFmt = '"$"#,##0';
    totalsRow.getCell(8).font = { bold: true, size: 11 };
    totalsRow.getCell(8).alignment = { horizontal: 'right', vertical: 'middle' };
    totalsRow.getCell(8).border = THIN_BORDER as import('exceljs').Borders;
  }

  if (dataEnd > 1) {
    ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: dataEnd, column: 8 } };
  }
}

// ── Preview data function ────────────────────────────────────────────────────

export interface DashboardPreviewData {
  sheets: Array<{
    name: string;
    columns: string[];
    rows: string[][];
  }>;
}

/**
 * Build preview data for the dashboard export dialog.
 * Returns pre-formatted string values matching exactly what goes into the Excel file.
 * No Excel dependency — pure data formatting.
 */
export function getDashboardPreviewData(
  metricas: DashboardMetricasResponse,
  ventas?: VentaResponse[],
): DashboardPreviewData {
  const sheets: DashboardPreviewData['sheets'] = [];
  const p = metricas.periodo;

  // ── Sheet 1: Resumen ────────────────────────────────────────────────────
  const dcVolume = formatDobleCremaDetalle(
    p.volumenDobleCremaEnteros,
    p.volumenDobleCremaTajados,
    Number(p.volumenDobleCremaKgGranelEntero),
    Number(p.volumenDobleCremaKgGranelTajado),
  );
  const ssVolume = formatSSKg(Number(p.volumenSemisaladoKg));

  const resumenRows: string[][] = [
    ['Ingresos', formatCurrency(p.ingresoTotal)],
    ['Costo Mercancía', formatCurrency(p.costoMercancia)],
    ['Ganancia Bruta', formatCurrency(p.gananciaBruta)],
    ['Margen Bruto (%)', p.margenBrutoPct === 'N/A' ? 'N/A' : `${Number(p.margenBrutoPct).toFixed(1)}%`],
    ['Ventas', String(p.ventasCount)],
    ['Clientes Activos', String(p.clientesActivos)],
    ['Volumen Doble Crema', dcVolume],
    ['Volumen Semisalado', ssVolume],
    ['Efectivo', formatCurrency(metricas.flujoDinero.efectivo)],
    ['Bancos / Nequi / Bre-B', formatCurrency(metricas.flujoDinero.bancos)],
    ['Cuentas por Cobrar', formatCurrency(metricas.flujoDinero.cuentasPorCobrar)],
    ['Cuentas por Pagar (Tajados)', formatCurrency(metricas.cuentasPorPagar.tajadosPendientesPago)],
  ];

  sheets.push({
    name: 'Resumen',
    columns: ['Métrica', 'Valor'],
    rows: resumenRows,
  });

  // ── Sheet 2: Ventas Diarias ──────────────────────────────────────────────
  const ventasDiariasRows = metricas.ventasDiarias.map((vd) => {
    const [year, month, day] = vd.fecha.slice(0, 10).split('-');
    return [`${day}/${month}/${year}`, formatCurrency(vd.total)];
  });

  sheets.push({
    name: 'Ventas Diarias',
    columns: ['Fecha', 'Total'],
    rows: ventasDiariasRows,
  });

  // ── Sheet 3: Top Clientes ───────────────────────────────────────────────
  const topClientesRows = metricas.topClientes.map((tc) => [
    tc.nombre,
    formatCurrency(tc.ingresoTotal),
  ]);

  sheets.push({
    name: 'Top Clientes',
    columns: ['Cliente', 'Ingreso Total'],
    rows: topClientesRows,
  });

  // ── Sheet 4: Inventario ─────────────────────────────────────────────────
  const inventarioRows = metricas.inventarioPorTipo.map((item) => {
    const isDC = item.tipo === 'DOBLE_CREMA';
    const producto = formatProductName(item.tipo);

    let detalle: string;
    let stockDisponible: string;

    if (isDC) {
      const bloquesTajados = item.bloquesTajados + item.bloquesTajadosDeFabrica;
      detalle = formatDobleCremaDetalle(
        item.bloquesEnteros,
        bloquesTajados,
        Number(item.sueltosEntero),
        Number(item.sueltosTajado),
      );
      stockDisponible = `${Number(item.stockKg).toFixed(1)} kg`;
    } else {
      detalle = formatSSKg(Number(item.stockKg));
      stockDisponible = `${Number(item.stockKg).toFixed(1)} kg`;
    }

    return [producto, detalle, stockDisponible, String(item.lotes)];
  });

  sheets.push({
    name: 'Inventario',
    columns: ['Producto', 'Detalle', 'Stock Disponible', 'Lotes Activos'],
    rows: inventarioRows,
  });

  // ── Sheet 5: Detalle de Ventas (optional) ───────────────────────────────
  if (ventas && ventas.length > 0) {
    const detalleRows: string[][] = [];
    let totalIngreso = 0;
    let totalCosto = 0;
    let totalGanancia = 0;

    for (const venta of ventas) {
      const fechaStr = venta.fecha.slice(0, 10);
      const [year, month, day] = fechaStr.split('-');
      const fechaDisplay = `${day}/${month}/${year}`;
      const cliente = venta.clienteNombre ?? 'Desconocido';

      for (const item of venta.items) {
        const isDC = isDobleCrema(item.loteProducto ?? '');

        const productName = formatProductName(item.loteProducto ?? '');
        const proveedor = (item as any).loteProveedorNombre;
        const producto = proveedor ? `${productName} — ${proveedor}` : productName;

        let cantidad: string;
        if (isDC) {
          if (item.ventaTipo === 'BLOQUES') {
            cantidad = formatDobleCremaDetalle(
              item.bloquesEnterosVendidos ?? 0,
              item.bloquesTajadosVendidos ?? 0,
              0,
              0,
            );
          } else {
            const variedad = item.origenCorte === 'TAJADO' ? 'tajado' : 'entero';
            cantidad = formatDobleCremaGranel(Number(item.cantidadKg), variedad);
          }
        } else {
          cantidad = `${Number(item.cantidadKg).toFixed(1)} kg`;
        }

        const ingreso = Number(item.ingreso);
        const costo = Number(item.costoAplicado);
        const ganancia = ingreso - costo;

        totalIngreso += ingreso;
        totalCosto += costo;
        totalGanancia += ganancia;

        detalleRows.push([
          fechaDisplay,
          cliente,
          venta.sedeNombre ?? '',
          producto,
          cantidad,
          formatCurrency(ingreso),
          formatCurrency(costo),
          formatCurrency(ganancia),
        ]);
      }
    }

    // Totals row
    if (totalIngreso > 0 || totalCosto > 0) {
      detalleRows.push([
        '',
        '',
        '',
        '',
        'TOTAL',
        formatCurrency(totalIngreso),
        formatCurrency(totalCosto),
        formatCurrency(totalGanancia),
      ]);
    }

    sheets.push({
      name: 'Detalle de Ventas',
      columns: ['Fecha', 'Cliente', 'Sede', 'Producto', 'Cantidad', 'Ingreso ($)', 'Costo ($)', 'Ganancia Bruta ($)'],
      rows: detalleRows,
    });
  }

  return { sheets };
}

// ── Main export function ────────────────────────────────────────────────────

/**
 * Export dashboard metrics to a multi-sheet Excel workbook with professional styling.
 *
 * Creates 4-5 sheets:
 * - "Resumen" — KPI values with DC block notation and Flujo de Dinero
 * - "Ventas Diarias" — fecha + total (as number)
 * - "Top Clientes" — nombre + ingresoTotal (as number)
 * - "Inventario" — producto + detalle (block notation for DC) + stock + lotes
 * - "Detalle de Ventas" — per-venta-item detail (only if ventas data is provided)
 */
export async function exportDashboardExcel(
  metricas: DashboardMetricasResponse,
  filename: string,
  ventas?: VentaResponse[],
): Promise<void> {
  const ExcelJS = await import('exceljs');

  const wb = new ExcelJS.Workbook();
  wb.creator = 'Riquesos';
  wb.created = new Date();

  buildResumenSheet(wb as Workbook, metricas);
  buildVentasDiariasSheet(wb as Workbook, metricas);
  buildTopClientesSheet(wb as Workbook, metricas);
  buildInventarioSheet(wb as Workbook, metricas);

  if (ventas && ventas.length > 0) {
    buildDetalleVentasSheet(wb as Workbook, ventas);
  }

  // Auto-fit all sheets
  wb.eachSheet((ws) => autoFitColumns(ws as Worksheet));

  await downloadWorkbook(wb as Workbook, filename);
}