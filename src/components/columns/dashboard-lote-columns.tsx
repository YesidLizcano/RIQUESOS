'use client';

import { ColumnDef } from '@tanstack/react-table';
import type { LoteResponse } from '@/presentation/dtos';
import { Badge } from '@/components/ui/badge';

export const lotesColumns: ColumnDef<LoteResponse, unknown>[] = [
  {
    accessorKey: 'producto',
    header: 'Producto',
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
          {estado}
        </Badge>
      );
    },
  },
];