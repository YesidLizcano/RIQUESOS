'use client';

import { ColumnDef } from '@tanstack/react-table';
import type { VentaResponse, VentaItemResponse, AbonoMetodoPagoBreakdown } from '@/presentation/dtos';
import { isDobleCrema, formatDobleCremaGranel } from '@/domain/constants';
import { metodoPagoLabel } from '@/domain/labels';
import { formatCurrency } from '@/domain/formatters';
import { ProductoBadge } from '@/components/producto-badge';
import { Button } from '@/components/ui/button';
import { CreditCard } from 'lucide-react';
import { decimalSub } from '@/lib/utils';

/** Format a single item for display */
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
    const origen = variedad === 'tajado' ? (item.origenTajadoGranel as 'INTERNO' | 'FABRICA' | undefined) : undefined;
    return formatDobleCremaGranel(Number(item.cantidadKg), variedad, origen);
  }
  return `${Number(item.cantidadKg).toLocaleString('es-AR')} kg`;
}

export function createVentaColumns(
  clienteMap?: Map<string, string>,
  loteProductoMap?: Map<string, string>,
  loteProveedorNombreMap?: Map<string, string>,
  onVerDetalle?: (venta: VentaResponse) => void,
  onAbonar?: (venta: VentaResponse) => void,
): ColumnDef<VentaResponse & { producto?: string }, unknown>[] {
  const columns: ColumnDef<VentaResponse & { producto?: string }, unknown>[] = [
    {
      accessorKey: 'fecha',
      header: 'Fecha',
      enableGlobalFilter: false,
      cell: ({ row }) => new Date(row.getValue('fecha') as string).toLocaleDateString('es-AR'),
    },
    {
      id: 'clienteNombre',
      header: 'Cliente',
      accessorFn: (row) => {
        if (clienteMap) {
          return clienteMap.get((row as VentaResponse).clienteId) ?? '—';
        }
        return '—';
      },
      filterFn: (row, _columnId, filterValue) => {
        return (row.original as VentaResponse).clienteId === filterValue;
      },
    },
    {
      id: 'sedeNombre',
      header: 'Sede',
      enableGlobalFilter: false,
      accessorFn: (row) => (row as VentaResponse).sedeNombre ?? '—',
    },
    {
      id: 'metodoPago',
      header: '',
      enableGlobalFilter: false,
      enableHiding: false,
      meta: { hidden: true },
      accessorFn: (row) => (row as VentaResponse).metodoPago ?? 'EFECTIVO',
      filterFn: (row, _columnId, filterValue) => {
        const venta = row.original as VentaResponse;
        const mp = venta.metodoPago ?? 'EFECTIVO';

        // Support comma-separated multi-values (e.g., "NEQUI,BRE_B")
        const filterMethods = String(filterValue).split(',');

        // Direct match: venta's metodoPago is in the filter
        if (filterMethods.includes(mp)) return true;

        // Cross-match: CREDITO venta with abonos matching the filter
        if (mp === 'CREDITO' && venta.abonoMetodoPagoBreakdown) {
          return venta.abonoMetodoPagoBreakdown.some(b => filterMethods.includes(b.metodoPago));
        }

        return false;
      },
    },
    {
      accessorKey: 'domiciliario',
      header: 'Domiciliario',
    },
    {
      id: 'productos',
      header: 'Productos',
      enableGlobalFilter: false,
      accessorFn: (row) => {
        const venta = row as VentaResponse;
        const items = venta.items ?? [];
        const products = new Set<string>();
        for (const item of items) {
          const producto = loteProductoMap?.get(item.loteId) ?? '';
          if (producto) products.add(producto);
        }
        return Array.from(products).join(',');
      },
      filterFn: (row, _columnId, filterValue) => {
        const venta = row.original as VentaResponse;
        const items = venta.items ?? [];
        for (const item of items) {
          const producto = loteProductoMap?.get(item.loteId) ?? '';
          if (producto === filterValue) return true;
        }
        return false;
      },
      cell: ({ row }) => {
        const venta = row.original as VentaResponse;
        const items = venta.items ?? [];
        if (items.length === 0) return '—';

        return (
          <div className="flex flex-col gap-0.5 py-0.5">
            {items.map((item, i) => {
              const producto = loteProductoMap?.get(item.loteId) ?? '';
              const proveedor = loteProveedorNombreMap?.get(item.loteId);
              const summary = formatItemSummary(item, producto);
              return (
                <span key={item.id || i} className="whitespace-nowrap">
                  {producto && <ProductoBadge producto={producto} compact className="mr-1" />}
                  {proveedor && <span className="text-muted-foreground">({proveedor}) </span>}
                  {summary}
                </span>
              );
            })}
          </div>
        );
      },
    },
    {
      id: 'cantidadTotalKg',
      header: 'Cantidad Total',
      enableGlobalFilter: false,
      cell: ({ row }) => {
        const venta = row.original as VentaResponse;
        return `${Number(venta.cantidadTotalKg).toLocaleString('es-AR')} kg`;
      },
    },
    {
      accessorKey: 'valorDomicilio',
      header: 'Domicilio',
      enableGlobalFilter: false,
      cell: ({ row }) => {
        const rawValue = String(row.getValue('valorDomicilio'));
        if (rawValue === '0' || rawValue === '0.00' || rawValue === '') return '—';
        const valor = Number(rawValue);
        return `$${Math.round(valor).toLocaleString('es-AR')}`;
      },
    },
    {
      accessorKey: 'ingresoTotal',
      header: 'Ingreso Total',
      enableGlobalFilter: false,
      cell: ({ row }) => `$${Math.round(Number(row.getValue('ingresoTotal'))).toLocaleString('es-AR')}`,
    },
    {
      accessorKey: 'gananciaBruta',
      header: 'Ganancia Bruta',
      enableGlobalFilter: false,
      cell: ({ row }) => {
        const rawValue = String(row.getValue('gananciaBruta'));
        const isNegative = rawValue.startsWith('-');
        const value = Number(rawValue);
        return (
          <span className={isNegative ? 'text-red-600 font-medium' : 'text-green-600 font-medium'}>
            ${Math.round(value).toLocaleString('es-AR')}
          </span>
        );
      },
    },
    {
      id: 'pago',
      header: 'Pago',
      enableGlobalFilter: false,
      cell: ({ row, table }) => {
        const venta = row.original as VentaResponse;
        const mp = venta.metodoPago ?? 'EFECTIVO';
        const saldo = venta.saldo ?? '0';
        const saldoPositivo = !saldo.startsWith('-') && saldo !== '0' && saldo !== '0.00';
        const label = metodoPagoLabel[mp] ?? mp;
        const colorClass = mp === 'EFECTIVO' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : mp === 'CREDITO' ? 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200' : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
        const isSaldado = mp === 'CREDITO' && !saldoPositivo;

        // Check if there's an active metodoPago filter for CREDITO proportion badge
        const metodoPagoFilter = table.getColumn('metodoPago')?.getFilterValue() as string | undefined;
        const breakdown = venta.abonoMetodoPagoBreakdown;

        // Build proportion badges for CREDITO ventas
        let badges: Array<{ label: string; detail?: string }> = [];

        if (mp === 'CREDITO' && breakdown && breakdown.length > 0) {
          if (metodoPagoFilter) {
            const filterMethods = String(metodoPagoFilter).split(',');
            const matchingBreakdown = breakdown.filter(b => filterMethods.includes(b.metodoPago));
            badges = matchingBreakdown.map(b => ({
              label: `${metodoPagoLabel[b.metodoPago] ?? b.metodoPago} ${b.porcentaje}%`,
              detail: `${formatCurrency(b.monto)}`,
            }));
          } else {
            badges = breakdown.map(b => ({
              label: `${metodoPagoLabel[b.metodoPago] ?? b.metodoPago} ${b.porcentaje}%`,
            }));
          }
        }

        return (
          <div className="flex flex-col gap-0.5">
            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${colorClass}`}>{label}</span>
            {mp === 'CREDITO' && badges.length > 0 && (
              <div className="flex flex-wrap gap-0.5">
                {badges.map((b, i) => (
                  <span key={i} className="inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                    {b.label}
                  </span>
                ))}
              </div>
            )}
            {isSaldado && (
              <span className="inline-flex items-center gap-0.5 text-xs font-medium text-green-600">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="size-3.5">
                  <path fillRule="evenodd" d="M8 15A7 7 0 1 0 8 1a7 7 0 0 0 0 14Zm3.844-8.791a.75.75 0 0 0-1.188-.918l-3.7 4.79-1.649-1.833a.75.75 0 1 0-1.114 1.004l2.25 2.5a.75.75 0 0 0 1.15-.043l4.25-5.5Z" clipRule="evenodd" />
                </svg>
                Saldado
              </span>
            )}
            {mp === 'CREDITO' && saldoPositivo && (
              <div className="flex items-center gap-1">
                <span className="text-xs text-red-600 font-medium">Saldo: ${Math.round(Number(saldo)).toLocaleString('es-AR')}</span>
                {onAbonar && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-6 px-2 text-[10px]"
                    onClick={(e) => { e.stopPropagation(); onAbonar(venta); }}
                  >
                    <CreditCard className="size-3 mr-1" />
                    Abonar
                  </Button>
                )}
              </div>
            )}
          </div>
        );
      },
    },
  ];

  // Add actions column only if callback provided
  if (onVerDetalle) {
    columns.push({
      id: 'acciones',
      header: 'Acciones',
      enableGlobalFilter: false,
      enableSorting: false,
      cell: ({ row }) => {
        const venta = row.original as VentaResponse;
        return onVerDetalle(venta);
      },
    });
  }

  return columns;
}

// Keep backward-compatible export for pages that don't need FK resolution
export const ventaColumns = createVentaColumns();