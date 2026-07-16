'use client';

import { ColumnDef } from '@tanstack/react-table';
import { isDobleCrema, formatDobleCremaDetalle, DOBLE_CREMA_BLOCK_KG } from '@/domain/constants';
import type { LoteResponse } from '@/presentation/dtos';
import { Badge } from '@/components/ui/badge';
import { ProductoBadge } from '@/components/producto-badge';
import { EstadoLote } from '@/domain/enums';
import { estadoLoteLabel } from '@/domain/labels';

export const lotesColumns: ColumnDef<LoteResponse, unknown>[] = [
  {
    accessorKey: 'producto',
    header: 'Producto',
    cell: ({ row }) => {
      const producto = row.getValue('producto') as string;
      return <ProductoBadge producto={producto} />;
    },
  },
  {
    accessorKey: 'stockDisponibleKg',
    header: 'Stock',
    cell: ({ row }) => {
      const lote = row.original;
      const stockValue = Number(lote.stockDisponibleKg);
      if (lote.producto === 'RECORTES_DOBLE_CREMA') {
        return `${stockValue.toLocaleString('es-AR')} kg`;
      }
      if (!isDobleCrema(lote.producto)) {
        return `${stockValue.toLocaleString('es-AR')} kg`;
      }
      const text = formatDobleCremaDetalle(lote.bloquesEnteros, lote.bloquesTajadosDisponibles, Number(lote.sueltosEntero), Number(lote.sueltosTajado));
      return text === '0' ? `${stockValue.toLocaleString('es-AR')} kg` : `${text} • Total: ${stockValue.toLocaleString('es-AR')} kg`;
    },
  },
  {
    accessorKey: 'costoRealCalculadoKg',
    header: 'Costo Real',
    cell: ({ row }) => {
      const lote = row.original;
      const costoKg = Number(lote.costoRealCalculadoKg);
      if (isDobleCrema(lote.producto)) {
        const costoBloqueEntero = Math.round(costoKg * DOBLE_CREMA_BLOCK_KG);
        const costoTajadoKg = Number(lote.costoTajadoKg) || costoKg;
        const costoTajadoFabricaKg = Number(lote.costoTajadoFabricaKg) || costoKg;
        const maxCostoTajadoKg = Math.max(costoTajadoKg, costoTajadoFabricaKg);
        const costoBloqueTajado = Math.round(maxCostoTajadoKg * DOBLE_CREMA_BLOCK_KG);
        return (
          <span className="whitespace-nowrap text-xs leading-tight">
            <span className="text-green-700 dark:text-green-400">${costoBloqueEntero.toLocaleString('es-AR')}/E</span>
            <br />
            <span className="text-amber-700 dark:text-amber-400">${costoBloqueTajado.toLocaleString('es-AR')}/T</span>
          </span>
        );
      }
      return <span className="whitespace-nowrap">${Math.round(costoKg).toLocaleString('es-AR')}/kg</span>;
    },
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