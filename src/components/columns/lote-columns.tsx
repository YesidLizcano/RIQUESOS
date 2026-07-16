'use client';

import { ColumnDef } from '@tanstack/react-table';
import type { LoteResponse } from '@/presentation/dtos';
import { EditarLoteDialog } from '@/components/forms/editar-lote-dialog';
import { EntityActions } from '@/components/entity-actions';
import { eliminarLote, restaurarLote } from '@/presentation/actions/lotes';
import { ProductoBadge } from '@/components/producto-badge';
import { bloquesCompletos, isDobleCrema, DOBLE_CREMA_BLOCK_KG } from '@/domain/constants';
import { TipoProducto, EstadoLote, EstadoPagoLote } from '@/domain/enums';
import { tipoProductoLabel, estadoLoteLabel, metodoPagoLabel } from '@/domain/labels';
import { ArchiveIcon } from 'lucide-react';

export function createLoteColumns(
  proveedorMap?: Map<string, string>,
  showDeleted?: boolean,
  onPagar?: (lote: LoteResponse) => void,
  onCerrar?: (lote: LoteResponse) => void,
): ColumnDef<LoteResponse, unknown>[] {
  return [
    {
      accessorKey: 'producto',
      header: 'Prod.',
      size: 60,
      cell: ({ row }) => {
        const producto = row.getValue('producto') as string;
        const isDeleted = row.original.deletedAt !== null;
        return (
          <span className={isDeleted ? 'line-through opacity-50' : ''}>
            <ProductoBadge producto={producto} compact />
          </span>
        );
      },
    },
    {
      id: 'proveedorNombre',
      header: 'Proveedor',
      size: 100,
      accessorFn: (row) => {
        if (proveedorMap) {
          return proveedorMap.get(row.proveedorId) ?? '—';
        }
        return '—';
      },
      filterFn: (row, _columnId, filterValue) => {
        return row.original.proveedorId === filterValue;
      },
    },
    {
      accessorKey: 'fechaIngreso',
      header: 'Fecha',
      size: 80,
      cell: ({ row }) => {
        const fecha = new Date(row.original.fechaIngreso);
        return <span className="whitespace-nowrap">{fecha.toLocaleDateString('es-AR')}</span>;
      },
    },
    {
      accessorKey: 'cantidadCompradaKg',
      header: 'Cant.',
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
      accessorKey: 'precioCompraBaseKg',
      header: 'Precio',
      size: 90,
      enableGlobalFilter: false,
      cell: ({ row }) => {
        const producto = row.original.producto;
        const precioBase = Number(row.getValue('precioCompraBaseKg'));
        const precioBloqueEntero = Number(row.original.precioPorBloqueEntero);
        const precioBloqueTajado = Number(row.original.precioPorBloqueTajado);
        if (isDobleCrema(producto) && precioBloqueEntero > 0) {
          const tieneTajadosFabrica = row.original.bloquesTajadosDeFabrica > 0;
          if (tieneTajadosFabrica && precioBloqueTajado > 0 && precioBloqueTajado !== precioBloqueEntero) {
            return (
              <span className="whitespace-nowrap text-xs leading-tight">
                ${precioBloqueEntero.toLocaleString('es-AR')}/E<br />
                ${precioBloqueTajado.toLocaleString('es-AR')}/TF
              </span>
            );
          }
          return <span className="whitespace-nowrap">${precioBloqueEntero.toLocaleString('es-AR')}/bl</span>;
        }
        return <span className="whitespace-nowrap">${precioBase.toLocaleString('es-AR')}/kg</span>;
      },
    },
    {
      accessorKey: 'costoRealCalculadoKg',
      header: 'Costo Real',
      size: 95,
      enableGlobalFilter: false,
      cell: ({ row }) => {
        const costoKg = Number(row.getValue('costoRealCalculadoKg'));
        const producto = row.original.producto;
        if (isDobleCrema(producto)) {
          const costoBloqueEntero = Math.round(costoKg * DOBLE_CREMA_BLOCK_KG);
          // Tajado: use the higher of costoTajadoKg or costoTajadoFabricaKg, fallback to entero cost
          const costoTajadoKg = Number(row.original.costoTajadoKg) || costoKg;
          const costoTajadoFabricaKg = Number(row.original.costoTajadoFabricaKg) || costoKg;
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
      id: 'costoLote',
      header: 'Costo Lote',
      size: 80,
      enableGlobalFilter: false,
      accessorFn: (row) => {
        const kg = Number(row.cantidadCompradaKg);
        const precioBase = Number(row.precioCompraBaseKg);
        const flete = Number(row.costoFlete);
        return kg * precioBase + flete;
      },
      cell: ({ row }) => {
        const kg = Number(row.original.cantidadCompradaKg);
        const precioBase = Number(row.original.precioCompraBaseKg);
        const flete = Number(row.original.costoFlete);
        const costoQueso = kg * precioBase;
        const costoLote = costoQueso + flete;
        const hasFlete = flete > 0;
        return (
          <span className="whitespace-nowrap">
            <span className="font-medium">${Math.round(costoLote).toLocaleString('es-AR')}</span>
            {hasFlete && (
              <span className="block text-[10px] text-muted-foreground">
                (${Math.round(costoQueso).toLocaleString('es-AR')} prod. + ${Math.round(flete).toLocaleString('es-AR')} flete)
              </span>
            )}
          </span>
        );
      },
    },
    {
      accessorKey: 'stockDisponibleKg',
      header: 'Stock',
      size: 110,
      enableGlobalFilter: false,
      cell: ({ row }) => {
        const stockValue = Number(row.getValue('stockDisponibleKg'));
        const producto = row.original.producto;

        if (isDobleCrema(producto)) {
          const enteros = row.original.bloquesEnteros;
          const tajadosFabrica = row.original.bloquesTajadosDeFabrica;
          const tajadosInternos = row.original.bloquesTajados;
          const sueltosEntero = Number(row.original.sueltosEntero);
          const sueltosTajado = Number(row.original.sueltosTajado);

          const parts: string[] = [];
          if (enteros > 0) parts.push(`${enteros}E`);
          if (tajadosFabrica > 0) parts.push(`${tajadosFabrica}TF`);
          if (tajadosInternos > 0) parts.push(`${tajadosInternos}TI`);
          if (sueltosEntero > 0) parts.push(`${sueltosEntero}kg(E)`);
          if (sueltosTajado > 0) parts.push(`${sueltosTajado}kg(T)`);

          if (parts.length === 0) {
            return <span className="whitespace-nowrap">{stockValue.toLocaleString('es-AR')} kg</span>;
          }
          return <span className="whitespace-nowrap text-xs leading-tight">{parts.join(' + ')} <span className="text-muted-foreground">({stockValue.toLocaleString('es-AR')}kg)</span></span>;
        }
        if (producto === 'RECORTES_DOBLE_CREMA') {
          return <span className="whitespace-nowrap">{stockValue.toLocaleString('es-AR')} kg <span className="text-muted-foreground">Recortes</span></span>;
        }
        return <span className="whitespace-nowrap">{stockValue.toLocaleString('es-AR')} kg</span>;
      },
    },
    {
      id: 'diasEnInventario',
      header: 'Días',
      size: 45,
      enableGlobalFilter: false,
      accessorFn: (row) => {
        const ingreso = new Date(row.fechaIngreso);
        const hoy = new Date();
        const msPerDay = 1000 * 60 * 60 * 24;
        const laterDay = Date.UTC(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
        const earlierDay = Date.UTC(ingreso.getFullYear(), ingreso.getMonth(), ingreso.getDate());
        return Math.floor((laterDay - earlierDay) / msPerDay);
      },
      cell: ({ row }) => {
        const ingreso = new Date(row.original.fechaIngreso);
        const hoy = new Date();
        const msPerDay = 1000 * 60 * 60 * 24;
        const laterDay = Date.UTC(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
        const earlierDay = Date.UTC(ingreso.getFullYear(), ingreso.getMonth(), ingreso.getDate());
        const dias = Math.floor((laterDay - earlierDay) / msPerDay);
        return <span>{dias}</span>;
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
          <div className="flex items-center gap-1.5">
            <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 whitespace-nowrap">
              Pend.
            </span>
            {onPagar && !row.original.deletedAt && (
              <button
                onClick={() => onPagar(row.original)}
                className="text-xs text-blue-600 hover:underline font-medium"
              >
                Pagar
              </button>
            )}
          </div>
        );
      },
    },
    {
      id: 'actions',
      header: '',
      size: 60,
      enableGlobalFilter: false,
      cell: ({ row }) => {
        const canCerrar = row.original.estado === 'ACTIVO' && row.original.deletedAt === null;
        return (
          <div className="flex items-center gap-1">
            {canCerrar && onCerrar && (
              <button
                onClick={() => onCerrar(row.original)}
                className="inline-flex items-center justify-center rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                title="Cerrar lote"
                aria-label="Cerrar lote"
              >
                <ArchiveIcon className="size-4" />
              </button>
            )}
            <EntityActions
              entityId={row.original.id}
              entityName={`el lote de ${tipoProductoLabel[row.original.producto as TipoProducto] ?? row.original.producto}`}
              isDeleted={row.original.deletedAt !== null}
              editLabel="Editar costos"
              editAriaLabel="Editar costos"
              deleteAction={eliminarLote}
              restoreAction={restaurarLote}
              deleteToastLabel="Lote"
              renderEditDialog={(open, onOpenChange) => (
                <EditarLoteDialog lote={row.original} open={open} onOpenChange={onOpenChange} proveedorNombre={proveedorMap?.get(row.original.proveedorId)} />
              )}
            />
          </div>
        );
      },
    },
  ];
}

// Keep backward-compatible export for pages that don't need FK resolution
export const loteColumns = createLoteColumns();