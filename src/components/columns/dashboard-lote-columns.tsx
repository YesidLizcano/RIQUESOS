'use client';

import { ColumnDef } from '@tanstack/react-table';
import type { LoteResponse } from '@/presentation/dtos';
import { Badge } from '@/components/ui/badge';
import { TipoProducto, EstadoLote } from '@/domain/enums';
import { tipoProductoLabel, estadoLoteLabel } from '@/domain/labels';

export const lotesColumns: ColumnDef<LoteResponse, unknown>[] = [
  {
    accessorKey: 'producto',
    header: 'Producto',
    cell: ({ row }) => {
      const producto = row.getValue('producto') as string;
      return tipoProductoLabel[producto as TipoProducto] ?? producto;
    },
  },
  {
    accessorKey: 'stockDisponibleKg',
    header: 'Stock (Kg)',
    cell: ({ row }) => Number(row.getValue('stockDisponibleKg')).toLocaleString('es-AR'),
  },
  {
    accessorKey: 'costoRealCalculadoKg',
    header: 'Costo Real/Kg',
    cell: ({ row }) => `$${Number(row.getValue('costoRealCalculadoKg')).toLocaleString('es-AR')}`,
  },
  {
    accessorKey: 'estado',
    header: 'Estado',
    cell: ({ row }) => {
      const estado = row.getValue('estado') as string;
      return (
        <Badge variant={estado === 'ACTIVO' ? 'default' : 'secondary'}>
          {estadoLoteLabel[estado as EstadoLote] ?? estado}
        </Badge>
      );
    },
  },
];