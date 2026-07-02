'use client';

import { ColumnDef } from '@tanstack/react-table';
import type { VentaResponse } from '@/presentation/dtos';

export function createVentaColumns(
  clienteMap?: Map<string, string>
): ColumnDef<VentaResponse & { producto?: string }, unknown>[] {
  return [
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
          return clienteMap.get((row as VentaResponse).clienteId) ?? (row as VentaResponse).clienteId;
        }
        return (row as VentaResponse).clienteId;
      },
      filterFn: (row, _columnId, filterValue) => {
        return (row.original as VentaResponse).clienteId === filterValue;
      },
    },
    {
      accessorKey: 'domiciliario',
      header: 'Domiciliario',
    },
    {
      accessorKey: 'producto',
      header: 'Producto',
      enableGlobalFilter: false,
      cell: ({ row }) => {
        const producto = row.getValue('producto') as string;
        return producto === 'DOBLE_CREMA' ? 'Doble Crema' : 'Semisalado';
      },
    },
    {
      accessorKey: 'cantidadVendidaKg',
      header: 'Cantidad (Kg)',
      enableGlobalFilter: false,
      cell: ({ row }) => Number(row.getValue('cantidadVendidaKg')).toLocaleString('es-AR'),
    },
    {
      accessorKey: 'precioVentaKg',
      header: 'Precio/Kg',
      enableGlobalFilter: false,
      cell: ({ row }) => `$${Number(row.getValue('precioVentaKg')).toLocaleString('es-AR')}`,
    },
    {
      accessorKey: 'ingresoTotal',
      header: 'Ingreso Total',
      enableGlobalFilter: false,
      cell: ({ row }) => `$${Number(row.getValue('ingresoTotal')).toLocaleString('es-AR')}`,
    },
    {
      accessorKey: 'gananciaBruta',
      header: 'Ganancia Bruta',
      enableGlobalFilter: false,
      cell: ({ row }) => {
        const value = Number(row.getValue('gananciaBruta'));
        return (
          <span className={value < 0 ? 'text-red-600 font-medium' : 'text-green-600 font-medium'}>
            ${value.toLocaleString('es-AR')}
          </span>
        );
      },
    },
  ];
}

// Keep backward-compatible export for pages that don't need FK resolution
export const ventaColumns = createVentaColumns();