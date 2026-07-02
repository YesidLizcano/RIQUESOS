'use client';

import type { DashboardMetricasResponse } from '@/presentation/dtos';

/**
 * Export dashboard metrics to a multi-sheet Excel workbook.
 *
 * Creates 4 sheets:
 * - "Resumen" — KPI values as key-value pairs
 * - "Ventas Diarias" — fecha + total (as number)
 * - "Top Clientes" — nombre + ingresoTotal (as number)
 * - "Inventario" — producto + stockDisponibleKg (as number) + lotesActivos
 */
export async function exportDashboardExcel(
  metricas: DashboardMetricasResponse,
  filename: string,
): Promise<void> {
  const XLSX = await import('xlsx');

  const p = metricas.periodo;

  // Sheet 1: Resumen (key-value pairs)
  const resumenData = [
    { Métrica: 'Ingresos', Valor: Number(p.ingresoTotal) },
    { Métrica: 'Costo Mercancía', Valor: Number(p.costoMercancia) },
    { Métrica: 'Ganancia Bruta', Valor: Number(p.gananciaBruta) },
    { Métrica: 'Gastos Fijos', Valor: Number(p.gastosFijos) },
    { Métrica: 'Ganancia Neta', Valor: Number(p.gananciaNeta) },
    { Métrica: 'Margen Bruto (%)', Valor: p.margenBrutoPct === 'N/A' ? 'N/A' : Number(p.margenBrutoPct) },
    { Métrica: 'Margen Neto (%)', Valor: p.margenNetoPct === 'N/A' ? 'N/A' : Number(p.margenNetoPct) },
    { Métrica: 'Ventas', Valor: p.ventasCount },
    { Métrica: 'Clientes Activos', Valor: p.clientesActivos },
    { Métrica: 'Kg Vendidos', Valor: Number(p.kgVendidos) },
  ];

  // Sheet 2: Ventas Diarias
  const ventasDiariasData = metricas.ventasDiarias.map((vd) => ({
    Fecha: vd.fecha,
    Total: Number(vd.total),
  }));

  // Sheet 3: Top Clientes
  const topClientesData = metricas.topClientes.map((tc) => ({
    Cliente: tc.nombre,
    'Ingreso Total': Number(tc.ingresoTotal),
  }));

  // Sheet 4: Inventario
  const inventarioData = metricas.inventario.map((item) => ({
    Producto: item.producto === 'DOBLE_CREMA' ? 'Doble Crema' : 'Semisalado',
    'Stock (Kg)': Number(item.stockDisponibleKg),
    'Lotes Activos': item.lotesActivos,
  }));

  const workbook = XLSX.utils.book_new();

  const wsResumen = XLSX.utils.json_to_sheet(resumenData);
  XLSX.utils.book_append_sheet(workbook, wsResumen, 'Resumen');

  const wsVentas = XLSX.utils.json_to_sheet(ventasDiariasData);
  XLSX.utils.book_append_sheet(workbook, wsVentas, 'Ventas Diarias');

  const wsClientes = XLSX.utils.json_to_sheet(topClientesData);
  XLSX.utils.book_append_sheet(workbook, wsClientes, 'Top Clientes');

  const wsInventario = XLSX.utils.json_to_sheet(inventarioData);
  XLSX.utils.book_append_sheet(workbook, wsInventario, 'Inventario');

  XLSX.writeFile(workbook, filename);
}