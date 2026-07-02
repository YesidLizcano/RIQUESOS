import { ColumnDef } from '@tanstack/react-table';
import type { VentaResponse } from '@/presentation/dtos';

export const ventaColumns: ColumnDef<VentaResponse, unknown>[] = [
  {
    accessorKey: 'fecha',
    header: 'Fecha',
    cell: ({ row }) => new Date(row.getValue('fecha') as string).toLocaleDateString('es-AR'),
  },
  {
    accessorKey: 'clienteId',
    header: 'Cliente',
  },
  {
    accessorKey: 'loteId',
    header: 'Lote',
  },
  {
    accessorKey: 'cantidadVendidaKg',
    header: 'Cantidad (Kg)',
    cell: ({ row }) => Number(row.getValue('cantidadVendidaKg')).toLocaleString('es-AR'),
  },
  {
    accessorKey: 'precioVentaKg',
    header: 'Precio/Kg',
    cell: ({ row }) => `$${Number(row.getValue('precioVentaKg')).toLocaleString('es-AR')}`,
  },
  {
    accessorKey: 'ingresoTotal',
    header: 'Ingreso Total',
    cell: ({ row }) => `$${Number(row.getValue('ingresoTotal')).toLocaleString('es-AR')}`,
  },
  {
    accessorKey: 'gananciaBruta',
    header: 'Ganancia Bruta',
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