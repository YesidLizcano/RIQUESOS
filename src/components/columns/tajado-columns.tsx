'use client';

import { ColumnDef } from '@tanstack/react-table';
import type { TajadoResponse } from '@/presentation/dtos';
import { ESTADO_PAGO_TAJADO } from '@/domain/enums';
import { formatProductName } from '@/domain/formatters';

interface TajadoColumnsOptions {
  onMarcarPagado?: (id: string) => Promise<void>;
}

export function createTajadoColumns(
  options?: TajadoColumnsOptions
): ColumnDef<TajadoResponse, unknown>[] {
  return [
    {
      accessorKey: 'fecha',
      header: 'Fecha',
      size: 100,
      cell: ({ row }) => {
        const fecha = new Date(row.original.fecha);
        return <span className="whitespace-nowrap">{fecha.toLocaleDateString('es-AR')}</span>;
      },
    },
    {
      id: 'lote',
      header: 'Lote',
      size: 160,
      accessorFn: (row) => {
        if (row.loteInfo) {
          const producto = formatProductName(row.loteInfo.producto);
          return `${producto} — ${row.loteInfo.proveedor}`;
        }
        return '—';
      },
    },
    {
      accessorKey: 'tajador',
      header: 'Tajador',
      size: 120,
    },
    {
      accessorKey: 'cantidadBloques',
      header: 'Bloques',
      size: 80,
    },
    {
      accessorKey: 'precioPorBloque',
      header: 'Tarifa',
      size: 90,
      cell: ({ row }) => {
        const precio = Number(row.getValue('precioPorBloque'));
        return <span className="whitespace-nowrap">${precio.toLocaleString('es-AR')}/bl</span>;
      },
    },
    {
      accessorKey: 'costoTotal',
      header: 'Total',
      size: 100,
      cell: ({ row }) => {
        const total = Number(row.getValue('costoTotal'));
        return <span className="whitespace-nowrap font-medium">${total.toLocaleString('es-AR')}</span>;
      },
    },
    {
      accessorKey: 'estadoPago',
      header: 'Estado',
      size: 110,
      cell: ({ row }) => {
        const estado = row.getValue('estadoPago') as string;
        if (estado === ESTADO_PAGO_TAJADO.PAGADO) {
          return (
            <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 whitespace-nowrap">
              Pagado
            </span>
          );
        }
        return (
          <div className="flex items-center gap-1.5">
            <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 whitespace-nowrap">
              Pendiente
            </span>
          </div>
        );
      },
    },
    {
      id: 'acciones',
      header: '',
      size: 100,
      cell: ({ row }) => {
        const estado = row.original.estadoPago;
        if (estado === ESTADO_PAGO_TAJADO.PAGADO) return null;
        return (
          <button
            onClick={() => options?.onMarcarPagado?.(row.original.id)}
            className="text-xs text-blue-600 hover:underline font-medium"
          >
            Marcar Pagado
          </button>
        );
      },
    },
  ];
}