'use client';

import { useState, useEffect, useCallback } from 'react';
import { useReactTable, getCoreRowModel, getSortedRowModel, getFilteredRowModel, getPaginationRowModel, ColumnDef } from '@tanstack/react-table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { DataTable } from '@/components/data-table';
import { DeferredMount } from '@/components/deferred-mount';
import { getLotesByProveedor } from '@/presentation/actions/proveedores';
import { formatCurrency } from '@/domain/formatters';
import { tipoProductoLabel, estadoLoteLabel, metodoPagoLabel } from '@/domain/labels';
import { TipoProducto, EstadoLote, EstadoPagoLote } from '@/domain/enums';
import { isDobleCrema, bloquesCompletos, DOBLE_CREMA_BLOCK_KG } from '@/domain/constants';
import type { ProveedorResponse, LoteResponse, LotesByProveedorResponse } from '@/presentation/dtos';

interface HistorialProveedorDialogProps {
  proveedor: ProveedorResponse | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function HistorialProveedorDialog({ proveedor, open, onOpenChange }: HistorialProveedorDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [data, setData] = useState<LotesByProveedorResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!proveedor) return;
    setIsLoading(true);
    setError(null);
    try {
      const result = await getLotesByProveedor(proveedor.id);
      if (result.success && result.data) {
        setData(result.data);
      } else {
        setError(result.error ?? 'Error al cargar lotes');
      }
    } catch {
      setError('Error al cargar lotes');
    } finally {
      setIsLoading(false);
    }
  }, [proveedor]);

  useEffect(() => {
    if (open && proveedor) {
      fetchData();
    }
    if (!open) {
      setData(null);
      setError(null);
    }
  }, [open, proveedor, fetchData]);

  const columns: ColumnDef<LoteResponse, unknown>[] = [
    {
      accessorKey: 'producto',
      header: 'Producto',
      size: 80,
      cell: ({ row }) => {
        const producto = row.getValue('producto') as string;
        return tipoProductoLabel[producto as TipoProducto] ?? producto;
      },
    },
    {
      accessorKey: 'fechaIngreso',
      header: 'Fecha',
      size: 90,
      cell: ({ row }) => {
        const fecha = new Date(row.original.fechaIngreso);
        return <span className="whitespace-nowrap">{fecha.toLocaleDateString('es-AR')}</span>;
      },
    },
    {
      accessorKey: 'cantidadCompradaKg',
      header: 'Cantidad',
      size: 80,
      enableGlobalFilter: false,
      cell: ({ row }) => {
        const kg = Number(row.getValue('cantidadCompradaKg'));
        const producto = row.original.producto;
        if (isDobleCrema(producto)) {
          const entOriginales = row.original.bloquesEnterosOriginal;
          const tajFabricaOriginal = row.original.bloquesTajadosFabricaOriginal;
          const parts: string[] = [];
          if (entOriginales > 0) parts.push(`${entOriginales}E`);
          if (tajFabricaOriginal > 0) parts.push(`${tajFabricaOriginal}TF`);
          const detail = parts.length > 0 ? parts.join('+') : `${bloquesCompletos(kg)}bl`;
          return <span className="whitespace-nowrap">{detail} <span className="text-muted-foreground">({kg.toLocaleString('es-AR')}kg)</span></span>;
        }
        return <span className="whitespace-nowrap">{kg.toLocaleString('es-AR')} kg</span>;
      },
    },
    {
      accessorKey: 'costoRealCalculadoKg',
      header: 'Costo/kg',
      size: 85,
      enableGlobalFilter: false,
      cell: ({ row }) => {
        const costoKg = Number(row.getValue('costoRealCalculadoKg'));
        const producto = row.original.producto;
        if (isDobleCrema(producto)) {
          const costoBloque = costoKg * DOBLE_CREMA_BLOCK_KG;
          return <span className="whitespace-nowrap">${Math.round(costoBloque).toLocaleString('es-AR')}/bl</span>;
        }
        return <span className="whitespace-nowrap">{formatCurrency(costoKg)}/kg</span>;
      },
    },
    {
      id: 'costoLote',
      header: 'Costo Lote',
      size: 90,
      enableGlobalFilter: false,
      accessorFn: (row) => Number(row.costoTotalLote),
      cell: ({ row }) => {
        const costoTotalLote = Number(row.original.costoTotalLote);
        return <span className="whitespace-nowrap font-medium">{formatCurrency(costoTotalLote)}</span>;
      },
    },
    {
      accessorKey: 'estado',
      header: 'Estado',
      size: 70,
      enableGlobalFilter: false,
      cell: ({ row }) => {
        const estado = row.getValue('estado') as string;
        return (
          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${estado === 'ACTIVO' ? 'bg-primary/10 text-primary' : 'bg-secondary/10 text-secondary-foreground'}`}>
            {estadoLoteLabel[estado as EstadoLote] ?? estado}
          </span>
        );
      },
    },
    {
      accessorKey: 'estadoPago',
      header: 'Pago',
      size: 85,
      enableGlobalFilter: false,
      cell: ({ row }) => {
        const estadoPago = row.getValue('estadoPago') as string;
        const metodoPagoLote = row.original.metodoPagoLote;
        if (estadoPago === EstadoPagoLote.PAGADO) {
          const label = metodoPagoLabel[metodoPagoLote] ?? metodoPagoLote;
          return (
            <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 whitespace-nowrap">
              Pagado ({label})
            </span>
          );
        }
        return (
          <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 whitespace-nowrap">
            Pendiente
          </span>
        );
      },
    },
  ];

  const table = useReactTable({
    data: data?.lotes ?? [],
    columns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    globalFilterFn: 'includesString',
  });

  if (!proveedor) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>Lotes de {proveedor.nombre}</DialogTitle>
          <DialogDescription>
            Historial de lotes del proveedor
          </DialogDescription>
        </DialogHeader>

        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent" />
          </div>
        )}

        {error && (
          <p className="text-sm text-destructive text-center py-4">{error}</p>
        )}

        {data && !isLoading && (
          <div className="space-y-4">
            {/* Stats cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="rounded-lg border bg-card p-3">
                <p className="text-xs text-muted-foreground">Total Lotes</p>
                <p className="text-lg font-semibold">{data.totalLotes}</p>
              </div>
              <div className="rounded-lg border bg-card p-3">
                <p className="text-xs text-muted-foreground">Costo Total</p>
                <p className="text-lg font-semibold">{formatCurrency(data.totalCosto)}</p>
              </div>
              <div className="rounded-lg border bg-card p-3">
                <p className="text-xs text-muted-foreground">Pagados</p>
                <p className="text-lg font-semibold text-green-600 dark:text-green-400">{data.lotesPagados}</p>
              </div>
              <div className="rounded-lg border bg-card p-3">
                <p className="text-xs text-muted-foreground">Pendientes</p>
                <p className="text-lg font-semibold text-amber-600 dark:text-amber-400">
                  {data.lotesPendientes} <span className="text-xs font-normal">({formatCurrency(data.montoPendienteTotal)})</span>
                </p>
              </div>
            </div>

            {/* Lotes table */}
            {data.lotes.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No hay lotes registrados para este proveedor</p>
            ) : (
              <DeferredMount>
                <DataTable table={table} isLoading={false} emptyMessage="No hay lotes registrados" />
              </DeferredMount>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}