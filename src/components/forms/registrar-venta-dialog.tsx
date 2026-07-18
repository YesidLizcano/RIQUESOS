'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useRefresh } from '@/components/refresh-context';
import { registrarVenta, eliminarVenta, editarVenta } from '@/presentation/actions/ventas';
import { obtenerSedesPorCliente } from '@/presentation/actions/sedes';
import { decimalSub } from '@/lib/utils';
import { getPreciosByCliente } from '@/presentation/actions/precios-cliente-proveedor';
import { toast } from 'sonner';
import { TipoProducto, TipoCliente } from '@/domain/enums';
import { MetodoPago, OrigenCorte } from '@/domain/enums';
import { MetodoPagoAbono } from '@/domain/enums';
import { METODOS_PAGO_ABONO } from '@/domain/constants';
import { metodoPagoLabel, origenCorteLabel } from '@/domain/labels';
import { tipoProductoLabel, tipoClienteLabel } from '@/domain/labels';
import { DOBLE_CREMA_BLOCK_KG, isDobleCrema } from '@/domain/constants';
import type { ClienteResponse, LoteResponse, VentaResponse, VentaTipo } from '@/presentation/dtos';
import type { SedeResponse } from '@/presentation/dtos';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PlusIcon, TrashIcon, Pencil, CheckIcon, ArrowLeftIcon, Loader2, AlertTriangleIcon } from 'lucide-react';
import { EditarClienteDialog } from '@/components/forms/editar-cliente-dialog';
import { Badge } from '@/components/ui/badge';
import { ProductoBadge } from '@/components/producto-badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface VentaItemForm {
  loteId: string;
  ventaTipo: VentaTipo;
  bloquesEnteros: string;
  bloquesTajados: string;
  bloquesTajadosDeFabrica: string;
  bloquesTajadosInternos: string;
  cantidadKg: string;
  cantidadKgEntero: string;  // DC GRANEL: kg from enteros variety
  cantidadKgTajado: string;   // DC GRANEL: kg from tajados variety
  precioVentaKg: string;
  precioVentaKgEntero: string;  // DC GRANEL: price per kg for enteros variety
  precioVentaKgTajado: string;  // DC GRANEL: price per kg for tajados variety
  bloquesReempacados: string;
  precioEnteroBloque: string;
  precioTajadoBloque: string;
  origenCorte: string;
  origenTajadoGranel: string;
}

import { formatCurrency, formatProductName } from '@/domain/formatters';
import { formatDobleCremaDetalle, formatDobleCremaGranel } from '@/domain/constants';

function formatBloquesDC(summary: SummaryData): string {
  // Block-equivalent normalization: convert granel kg to blocks + residuo per variety
  const totalEnteros = summary.totalBloquesEnteros + Math.floor(summary.kgGranelEntero / DOBLE_CREMA_BLOCK_KG);
  const residuoEntero = Math.round((summary.kgGranelEntero % DOBLE_CREMA_BLOCK_KG) * 100) / 100;
  const totalTajados = summary.totalBloquesTajados + Math.floor(summary.kgGranelTajado / DOBLE_CREMA_BLOCK_KG);
  const residuoTajado = Math.round((summary.kgGranelTajado % DOBLE_CREMA_BLOCK_KG) * 100) / 100;

  const parts: string[] = [];

  // Enteros — only show if blocks or residuo > 0
  if (totalEnteros > 0 || residuoEntero > 0) {
    if (residuoEntero > 0) {
      parts.push(`${totalEnteros} enteros (y ${residuoEntero} kg sueltos)`);
    } else {
      parts.push(`${totalEnteros} enteros`);
    }
  }

  // Tajados — only show if blocks or residuo > 0
  if (totalTajados > 0 || residuoTajado > 0) {
    if (residuoTajado > 0) {
      parts.push(`${totalTajados} tajados (y ${residuoTajado} kg sueltos)`);
    } else {
      parts.push(`${totalTajados} tajados`);
    }
  }

  return parts.length > 0 ? parts.join(' + ') : '0 bloques';
}

interface SummaryItem {
  lote: LoteResponse | undefined;
  ventaTipo: VentaTipo;
  cantidadKg: number;
  precioVentaKg: number;
  precioVentaKgEntero: number;
  precioVentaKgTajado: number;
  precioEnteroBloque: number | null;
  precioTajadoBloque: number | null;
  costoAplicadoKg: number;
  costoEnteroBloque: number | null;
  costoTajadoFabricaBloque: number | null;
  costoTajadoInternoBloque: number | null;
  costoEnteroKg: number | null;
  costoTajadoFabricaKg: number | null;
  ingreso: number;
  ingresoEnteros: number;
  ingresoTajados: number;
  costoItem: number;
  costoEmpaques: number;
  enteros: number;
  tajados: number;
  tajadosDeFabrica: number;
  tajadosInternos: number;
  reempacados: number;
  origenCorte?: string;
  cantidadKgEntero: number;
  cantidadKgTajado: number;
}

interface BreakdownItem {
  name: string;
  quantity: string;
}

interface SummaryData {
  items: SummaryItem[];
  totalKg: number;
  totalBloquesEnteros: number;
  totalBloquesTajados: number;
  kgGranelEntero: number;
  kgGranelTajado: number;
  kgDobleCrema: number;
  kgSemisalado: number;
  ingresoTotal: number;
  costoTotal: number;
  costoEmpaquesTotal: number;
  gananciaBruta: number;
  domicilio: number;
  costoDomiciliario: number;
}

interface SummaryStepProps {
  summary: SummaryData | null;
  clienteLabel: string;
  domiciliario: string;
  valorDomicilio: string;
  costoDomiciliario: string;
  metodoPago: string;
  metodoPagoAbono: string;
  abono: string;
  observaciones: string;
  proveedorMap: Map<string, string>;
  onBack: () => void;
  onConfirm: () => void;
  submitting: boolean;
  isEditMode?: boolean;
}

function SummaryStep({ summary, clienteLabel, domiciliario, valorDomicilio, costoDomiciliario, metodoPago, metodoPagoAbono, abono, observaciones, proveedorMap, onBack, onConfirm, submitting, isEditMode }: SummaryStepProps) {
  if (!summary) return null;
  return (
    <div className="space-y-3">
      {/* Header info — compact horizontal layout */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
        <p><span className="font-medium">Cliente:</span> {clienteLabel}</p>
        {domiciliario && <p><span className="font-medium">Domiciliario:</span> {domiciliario}</p>}
        {Number(valorDomicilio) > 0 && <p><span className="font-medium">Domicilio:</span> {formatCurrency(Number(valorDomicilio))}</p>}
        {Number(costoDomiciliario) > 0 && <p><span className="font-medium">Costo domiciliario:</span> {formatCurrency(Number(costoDomiciliario))}</p>}
        <p>
          <span className="font-medium">Pago:</span>{' '}
          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
            metodoPago === 'EFECTIVO' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
            metodoPago === 'CREDITO' ? 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200' :
            'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
          }`}>
            {metodoPagoLabel[metodoPago] ?? metodoPago}{metodoPago === 'CREDITO' ? ' (Fiado)' : ''}
          </span>
        </p>
        {metodoPago === 'CREDITO' && (
          <p>
            <span className="font-medium">Total:</span> {formatCurrency(summary.ingresoTotal)}
            {' | '}
            <span className="font-medium">Abono:</span> {formatCurrency(Number(abono) || 0)}
            {metodoPagoAbono && (
              <>
                {' '}
                <span className="text-xs text-muted-foreground">({metodoPagoLabel[metodoPagoAbono]})</span>
              </>
            )}
            {' | '}
            <span className="font-medium">Saldo:</span> {formatCurrency(decimalSub(String(summary.ingresoTotal), abono || '0'))}
          </p>
        )}
        {observaciones && <p><span className="font-medium">Obs:</span> {observaciones}</p>}
      </div>

        <div className="rounded-md border">
           <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Lote</TableHead>
                  <TableHead className="text-xs">Tipo</TableHead>
                  <TableHead className="text-xs">Cantidad</TableHead>
                  <TableHead className="text-right text-xs">Precio</TableHead>
                  <TableHead className="text-right text-xs">Ingreso</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {summary.items.map((s, i) => {
                  const producto = s.lote ? s.lote.producto : '';
                  const proveedor = s.lote ? (proveedorMap.get(s.lote.proveedorId) ?? '') : '';
                  const loteLabel = [proveedor].filter(Boolean).join(' — ');
                  const isDcBloques = s.ventaTipo === 'BLOQUES' && s.lote && isDobleCrema(s.lote.producto);

                  // For DC BLOQUES, split into separate rows for enteros and tajados
                  if (isDcBloques) {
                    const rows: React.ReactElement[] = [];
                    // Shared lote cell for first row, empty for subsequent rows
                    const loteCell = (
                      <div className="flex items-center gap-1.5">
                        {producto && <ProductoBadge producto={producto} compact />}
                        <span className="text-muted-foreground">{loteLabel || '—'}</span>
                      </div>
                    );

                    if (s.enteros > 0) {
                      rows.push(
                        <TableRow key={`${i}-ent`}>
                          <TableCell className="py-1.5 text-xs">{loteCell}</TableCell>
                          <TableCell className="py-1.5 text-xs"><Badge variant="default" className="text-[10px] px-1 py-0">Enteros</Badge></TableCell>
                             <TableCell className="py-1.5 text-xs">{s.enteros} enteros</TableCell>
                             <TableCell className="py-1.5 text-right text-xs">{s.precioEnteroBloque !== null ? `${formatCurrency(s.precioEnteroBloque)}/entero` : '—'}</TableCell>
                          <TableCell className="py-1.5 text-right text-xs font-medium">{formatCurrency(s.ingresoEnteros)}</TableCell>
                        </TableRow>
                      );
                    }

                    if (s.tajados > 0) {
                       const cantidadText = s.reempacados > 0
                         ? `${s.tajados} tajados (${s.reempacados} reempacados)`
                         : `${s.tajados} tajados`;
                      rows.push(
                        <TableRow key={`${i}-taj`}>
                          <TableCell className="py-1.5 text-xs">{s.enteros > 0 ? '' : loteCell}</TableCell>
                          <TableCell className="py-1.5 text-xs"><Badge variant="outline" className="text-[10px] px-1 py-0">Tajados</Badge></TableCell>
                          <TableCell className="py-1.5 text-xs">{cantidadText}</TableCell>
                             <TableCell className="py-1.5 text-right text-xs">{s.precioTajadoBloque !== null ? `${formatCurrency(s.precioTajadoBloque)}/tajado` : '—'}</TableCell>
                          <TableCell className="py-1.5 text-right text-xs font-medium">{formatCurrency(s.ingresoTajados)}</TableCell>
                        </TableRow>
                      );
                    }

                    return rows;
                   }

                    // Granel / Semisalado — may be dual-variety for DC
                    const isDcGranel = s.lote && isDobleCrema(s.lote.producto);
                    const isDualVariety = isDcGranel && s.cantidadKgEntero > 0 && s.cantidadKgTajado > 0;

                    if (isDualVariety) {
                      // DC GRANEL dual-variety: two rows
                      const loteCell = (
                        <div className="flex items-center gap-1.5">
                          {producto && <ProductoBadge producto={producto} compact />}
                          <span className="text-muted-foreground">{loteLabel || '—'}</span>
                        </div>
                      );
                      const rows: React.ReactElement[] = [];
                      if (s.cantidadKgEntero > 0) {
                        rows.push(
                          <TableRow key={`${i}-ent`}>
                            <TableCell className="py-1.5 text-xs">{loteCell}</TableCell>
                            <TableCell className="py-1.5 text-xs"><Badge variant="secondary" className="text-[10px] px-1 py-0">Granel (ent.)</Badge></TableCell>
                            <TableCell className="py-1.5 text-xs">{s.cantidadKgEntero.toLocaleString('es-AR')} kg</TableCell>
                            <TableCell className="py-1.5 text-right text-xs">{formatCurrency(s.precioVentaKgEntero)}/kg</TableCell>
                            <TableCell className="py-1.5 text-right text-xs font-medium">{formatCurrency(s.cantidadKgEntero * s.precioVentaKgEntero)}</TableCell>
                          </TableRow>
                        );
                      }
                      if (s.cantidadKgTajado > 0) {
                        rows.push(
                          <TableRow key={`${i}-taj`}>
                            <TableCell className="py-1.5 text-xs">{s.cantidadKgEntero > 0 ? '' : loteCell}</TableCell>
                            <TableCell className="py-1.5 text-xs"><Badge variant="outline" className="text-[10px] px-1 py-0">Granel (taj.)</Badge></TableCell>
                            <TableCell className="py-1.5 text-xs">{s.cantidadKgTajado.toLocaleString('es-AR')} kg</TableCell>
                            <TableCell className="py-1.5 text-right text-xs">{formatCurrency(s.precioVentaKgTajado)}/kg</TableCell>
                            <TableCell className="py-1.5 text-right text-xs font-medium">{formatCurrency(s.cantidadKgTajado * s.precioVentaKgTajado)}</TableCell>
                          </TableRow>
                        );
                      }
                      return rows;
                    }

                    const origenCorte = s.origenCorte ?? 'ENTERO';
                    const granelLabel = isDcGranel && origenCorte === 'ENTERO'
                      ? 'Granel (ent.)'
                      : isDcGranel && origenCorte === 'TAJADO'
                      ? 'Granel (taj.)'
                      : 'Granel';
                    return (
                      <TableRow key={i}>
                        <TableCell className="py-1.5 text-xs">
                          <div className="flex items-center gap-1.5">
                            {producto && <ProductoBadge producto={producto} compact />}
                            <span className="text-muted-foreground">{loteLabel || '—'}</span>
                          </div>
                        </TableCell>
                        <TableCell className="py-1.5 text-xs"><Badge variant="secondary" className="text-[10px] px-1 py-0">{granelLabel}</Badge></TableCell>
                        <TableCell className="py-1.5 text-xs">{s.cantidadKg.toLocaleString('es-AR')} kg</TableCell>
                        <TableCell className="py-1.5 text-right text-xs">{formatCurrency(s.precioVentaKg)}/kg</TableCell>
                        <TableCell className="py-1.5 text-right text-xs font-medium">{formatCurrency(s.ingreso)}</TableCell>
                      </TableRow>
                    );
                })}
             </TableBody>
           </Table>
         </div>

          {/* Cost breakdown + Totals side by side */}
          <div className="grid grid-cols-2 gap-3">
            {/* Cost breakdown */}
            <div className="rounded-md border p-2">
              <p className="text-xs font-medium mb-1">Detalle de Costos</p>
              <div className="space-y-1">
                {summary.items.map((s, i) => {
                  const producto = s.lote ? s.lote.producto : '';
                  const proveedor = s.lote ? (proveedorMap.get(s.lote.proveedorId) ?? '') : '';
                  const isDcBloques = s.ventaTipo === 'BLOQUES' && s.lote && isDobleCrema(s.lote.producto);
                  return (
                    <div key={i} className="space-y-0.5">
                      <p className="text-xs text-muted-foreground">
                        {producto && <ProductoBadge producto={producto} compact />} {proveedor}
                      </p>
                       {isDcBloques ? (
                         <div className="pl-2 space-y-0.5 text-xs">
                           {s.enteros > 0 && s.costoEnteroBloque !== null && (
                             <div className="flex justify-between">
                                <span className="text-muted-foreground">{s.enteros} enteros × {formatCurrency(s.costoEnteroBloque)}/bloque</span>
                               <span>{formatCurrency(s.enteros * s.costoEnteroBloque)}</span>
                             </div>
                           )}
                           {s.tajadosDeFabrica > 0 && s.costoTajadoFabricaBloque !== null && (
                             <div className="flex justify-between">
                                <span className="text-muted-foreground">{s.tajadosDeFabrica} tajados fábrica × {formatCurrency(s.costoTajadoFabricaBloque)}/bloque</span>
                               <span>{formatCurrency(s.tajadosDeFabrica * s.costoTajadoFabricaBloque)}</span>
                             </div>
                           )}
                           {s.tajadosInternos > 0 && s.costoTajadoInternoBloque !== null && (
                             <div className="flex justify-between">
                                <span className="text-muted-foreground">{s.tajadosInternos} tajados internos × {formatCurrency(s.costoTajadoInternoBloque)}/bloque</span>
                               <span>{formatCurrency(s.tajadosInternos * s.costoTajadoInternoBloque)}</span>
                             </div>
                           )}
                         </div>
                      ) : (
                        <div className="pl-2 flex justify-between text-xs">
                          <span className="text-muted-foreground">{s.cantidadKg.toLocaleString('es-AR')} kg × {formatCurrency(s.costoAplicadoKg)}/kg</span>
                          <span>{formatCurrency(s.costoItem)}</span>
                        </div>
                      )}
                      {s.costoEmpaques > 0 && (
                        <div className="pl-2 flex justify-between text-xs">
                           <span className="text-muted-foreground">{s.reempacados} reempacados × {formatCurrency(s.costoEmpaques / s.reempacados)}/bolsa</span>
                          <span>{formatCurrency(s.costoEmpaques)}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

           {/* Totals */}
           <div className="grid grid-cols-1 gap-y-2 rounded-lg border p-3 self-start">
             {summary.kgDobleCrema > 0 && (
               <div>
                 <p className="text-xs text-muted-foreground">Total Bloques DC</p>
                 <p className="font-medium text-sm">{formatBloquesDC(summary)}</p>
               </div>
             )}
             {summary.kgSemisalado > 0 && (
               <div>
                 <p className="text-xs text-muted-foreground">Total Kg Semisalado</p>
                 <p className="font-medium text-sm">{summary.kgSemisalado.toLocaleString('es-AR')} kg</p>
               </div>
             )}
             {summary.kgDobleCrema === 0 && summary.kgSemisalado === 0 && (
               <div>
                 <p className="text-xs text-muted-foreground">Total Kg</p>
                 <p className="font-medium text-sm">{summary.totalKg.toLocaleString('es-AR')} kg</p>
               </div>
             )}
             <div>
               <p className="text-xs text-muted-foreground">Ingreso Total</p>
               <p className="font-medium text-sm">{formatCurrency(summary.ingresoTotal)}</p>
             </div>
             <div>
               <p className="text-xs text-muted-foreground">Costo Mercadería</p>
               <p className="font-medium text-sm">{formatCurrency(summary.costoTotal - summary.costoEmpaquesTotal)}</p>
             </div>
             {summary.costoEmpaquesTotal > 0 && (
               <div>
                 <p className="text-xs text-muted-foreground">Costo Empaques</p>
                 <p className="font-medium text-sm">{formatCurrency(summary.costoEmpaquesTotal)}</p>
               </div>
             )}
             {summary.costoDomiciliario > 0 && (
               <div>
                 <p className="text-xs text-muted-foreground">Costo Domiciliario</p>
                 <p className="font-medium text-sm">{formatCurrency(summary.costoDomiciliario)}</p>
               </div>
             )}
             <div>
               <p className="text-xs text-muted-foreground">Costo Total</p>
               <p className="font-medium text-sm">{formatCurrency(summary.costoTotal + summary.costoDomiciliario)}</p>
             </div>
             <div>
               <p className="text-xs text-muted-foreground">Ganancia Bruta</p>
               <p className={`font-medium text-sm ${summary.gananciaBruta < 0 ? 'text-red-600' : 'text-green-600'}`}>
                 {formatCurrency(summary.gananciaBruta)}
               </p>
             </div>
           </div>
         </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onBack} disabled={submitting}>
          <ArrowLeftIcon className="size-4 mr-1" />
          Volver
        </Button>
        <Button type="button" onClick={onConfirm} disabled={submitting}>
          {submitting ? <Loader2 className="size-4 mr-1 animate-spin" /> : <CheckIcon className="size-4 mr-1" />}
          {isEditMode ? 'Guardar Cambios' : 'Confirmar Venta'}
        </Button>
      </div>
    </div>
  );
}

function createEmptyItem(): VentaItemForm {
  return {
    loteId: '',
    ventaTipo: 'BLOQUES',
    bloquesEnteros: '',
    bloquesTajados: '',
    bloquesTajadosDeFabrica: '',
    bloquesTajadosInternos: '',
    cantidadKg: '',
    cantidadKgEntero: '',
    cantidadKgTajado: '',
    precioVentaKg: '',
    precioVentaKgEntero: '',
    precioVentaKgTajado: '',
    bloquesReempacados: '',
    precioEnteroBloque: '',
    precioTajadoBloque: '',
    origenCorte: 'ENTERO',
    origenTajadoGranel: 'INTERNO',
  };
}

interface RegistrarVentaDialogProps {
  clientes: ClienteResponse[];
  lotes: LoteResponse[];
  proveedorMap: Map<string, string>;
  ventaToEdit?: VentaResponse | null;
  onEditComplete?: () => void;
  precioBolsa?: number;
}

export function RegistrarVentaDialog({ clientes, lotes, proveedorMap, ventaToEdit, onEditComplete, precioBolsa }: RegistrarVentaDialogProps) {
  const refreshData = useRefresh();
  const isEditMode = !!ventaToEdit;
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<'form' | 'summary'>('form');
  const [submitting, setSubmitting] = useState(false);
  const [clienteId, setClienteId] = useState<string>('');
  const [sedeId, setSedeId] = useState<string>('');
  const [sedes, setSedes] = useState<SedeResponse[]>([]);
  const [items, setItems] = useState<VentaItemForm[]>([createEmptyItem()]);
  const [valorDomicilio, setValorDomicilio] = useState<string>('');
  const [costoDomiciliario, setCostoDomiciliario] = useState<string>('');
  const [domiciliario, setDomiciliario] = useState<string>('');
  const [metodoPago, setMetodoPago] = useState<string>('EFECTIVO');
  const [abono, setAbono] = useState<string>('');
  const [metodoPagoAbono, setMetodoPagoAbono] = useState<string>('');
  const [observaciones, setObservaciones] = useState<string>('');
  const [editClienteOpen, setEditClienteOpen] = useState(false);
  const [preciosMemoria, setPreciosMemoria] = useState<Map<string, { precioEntero: string; precioTajado: string; valorDomicilio: string; costoDomiciliario: string }>>(new Map());

  // Pre-fill form when editing a venta
  useEffect(() => {
    if (ventaToEdit) {
      setClienteId(ventaToEdit.clienteId);
      setSedeId(ventaToEdit.sedeId ?? '');
      setValorDomicilio(ventaToEdit.valorDomicilio);
      setCostoDomiciliario(ventaToEdit.costoDomiciliario ?? '');
      setDomiciliario(ventaToEdit.domiciliario ?? '');
      setMetodoPago(ventaToEdit.metodoPago ?? 'EFECTIVO');
      setAbono(ventaToEdit.abono ?? '');
      setMetodoPagoAbono(ventaToEdit.metodoPagoAbono ?? '');
      setObservaciones(ventaToEdit.observaciones ?? '');
      setItems(
        ventaToEdit.items.map((item) => ({
          loteId: item.loteId,
          ventaTipo: item.ventaTipo,
          bloquesEnteros: String(item.bloquesEnterosVendidos),
          bloquesTajados: String(item.bloquesTajadosVendidos),
          bloquesTajadosDeFabrica: String(item.bloquesTajadosDeFabricaVendidos ?? 0),
          bloquesTajadosInternos: String(item.bloquesTajadosInternosVendidos ?? 0),
          cantidadKg: item.cantidadKg,
          cantidadKgEntero: item.origenCorte === 'ENTERO' ? item.cantidadKg : '',
          cantidadKgTajado: item.origenCorte === 'TAJADO' ? item.cantidadKg : '',
          precioVentaKg: item.precioVentaKg,
          precioVentaKgEntero: item.origenCorte === 'ENTERO' ? item.precioVentaKg : '',
          precioVentaKgTajado: item.origenCorte === 'TAJADO' ? item.precioVentaKg : '',
          bloquesReempacados: String(item.bloquesReempacados),
          precioEnteroBloque: item.precioEnteroBloque ?? '',
          precioTajadoBloque: item.precioTajadoBloque ?? '',
          origenCorte: item.origenCorte ?? 'ENTERO',
          origenTajadoGranel: item.origenTajadoGranel ?? 'INTERNO',
        }))
      );
      setStep('form');
      setOpen(true);
    }
  }, [ventaToEdit]);

  // Fetch sedes for the selected client
  useEffect(() => {
    if (clienteId) {
      obtenerSedesPorCliente(clienteId).then((result) => {
        if (result.success && result.sedes) {
          setSedes(result.sedes);
          // Auto-select principal sede or first sede
          const principal = result.sedes.find((s) => s.esPrincipal);
          if (principal) {
            setSedeId(principal.id);
          } else if (result.sedes.length > 0) {
            setSedeId(result.sedes[0].id);
          } else {
            setSedeId('');
          }
        } else {
          setSedes([]);
          setSedeId('');
        }
      });
    } else {
      setSedes([]);
      setSedeId('');
    }
  }, [clienteId]);

  // Filter only active clientes and lotes
  const activeClientes = useMemo(() => clientes.filter((c) => !c.deletedAt), [clientes]);
  const lotesConStock = useMemo(
    () => lotes.filter((l) => l.estado === 'ACTIVO' && Number(l.stockDisponibleKg) > 0 && !l.deletedAt),
    [lotes]
  );

  const clienteLabels = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of activeClientes) {
      map.set(c.id, `${c.nombre} (${tipoClienteLabel[c.tipo as TipoCliente] ?? c.tipo})`);
    }
    return map;
  }, [activeClientes]);

  const selectedCliente = activeClientes.find((c) => c.id === clienteId);
  const isMayorista = selectedCliente?.tipo === TipoCliente.MAYORISTA;

  // Fetch proveedor-specific prices for MAYORISTA clients
  useEffect(() => {
    if (clienteId && isMayorista) {
      getPreciosByCliente(clienteId).then((precios) => {
        const map = new Map<string, { precioEntero: string; precioTajado: string; valorDomicilio: string; costoDomiciliario: string }>();
        for (const p of precios) {
          map.set(p.proveedorId, { precioEntero: p.precioEntero, precioTajado: p.precioTajado, valorDomicilio: p.valorDomicilio, costoDomiciliario: p.costoDomiciliario });
        }
        setPreciosMemoria(map);
      });
    } else {
      setPreciosMemoria(new Map());
    }
  }, [clienteId, isMayorista]);

  // Auto-fill per-block prices for DC BLOQUES items from proveedor-specific memory
  useEffect(() => {
    setItems((prev) => prev.map((item) => {
      const lote = getLoteForItem(item);
      if (!lote || !isDobleCrema(lote.producto)) return item;
      if (getEffectiveVentaTipo(item) !== 'BLOQUES') return item;
      const proveedorPrecio = preciosMemoria.get(lote.proveedorId);
      if (!proveedorPrecio) return item;
      // Only auto-fill if empty and memorized price is > 0 — don't overwrite manual entry
      const updates: Partial<VentaItemForm> = {};
      if (!item.precioEnteroBloque && proveedorPrecio.precioEntero && Number(proveedorPrecio.precioEntero) > 0) {
        updates.precioEnteroBloque = proveedorPrecio.precioEntero;
      }
      if (!item.precioTajadoBloque && proveedorPrecio.precioTajado && Number(proveedorPrecio.precioTajado) > 0) {
        updates.precioTajadoBloque = proveedorPrecio.precioTajado;
      }
      if (Object.keys(updates).length === 0) return item;
      return { ...item, ...updates };
    }));
  }, [preciosMemoria]);

  // Auto-fill domicilio memory from PrecioClienteProveedor (per proveedor), fallback to cliente default
  useEffect(() => {
    if (ventaToEdit) return; // Don't override values when editing
    // Try proveedor-specific domicilio memory first (from first item's lote)
    const firstItemWithLote = items.find((item) => item.loteId);
    if (firstItemWithLote) {
      const lote = getLoteForItem(firstItemWithLote);
      if (lote) {
        const proveedorPrecio = preciosMemoria.get(lote.proveedorId);
        if (proveedorPrecio) {
          if (Number(proveedorPrecio.valorDomicilio) > 0) {
            setValorDomicilio(proveedorPrecio.valorDomicilio);
          } else if (selectedCliente?.valorDomicilio && Number(selectedCliente.valorDomicilio) > 0) {
            setValorDomicilio(selectedCliente.valorDomicilio);
          } else {
            setValorDomicilio('');
          }
          if (Number(proveedorPrecio.costoDomiciliario) > 0) {
            setCostoDomiciliario(proveedorPrecio.costoDomiciliario);
          } else {
            setCostoDomiciliario('');
          }
          return;
        }
      }
    }
    // Fallback: no lote selected yet or no proveedor memory — use cliente default
    if (selectedCliente?.valorDomicilio && Number(selectedCliente.valorDomicilio) > 0) {
      setValorDomicilio(selectedCliente.valorDomicilio);
    } else {
      setValorDomicilio('');
    }
    setCostoDomiciliario('');
  }, [clienteId, preciosMemoria, items]); // eslint-disable-line react-hooks/exhaustive-deps

  function getLoteForItem(item: VentaItemForm) {
    return lotesConStock.find((l) => l.id === item.loteId);
  }

  function getEffectiveVentaTipo(item: VentaItemForm): VentaTipo {
    const lote = getLoteForItem(item);
    if (!lote || !isDobleCrema(lote.producto)) return 'GRANEL';
    return item.ventaTipo;
  }

  function updateItem(index: number, updates: Partial<VentaItemForm>) {
    setItems((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], ...updates };
      return next;
    });
  }

  function addItem() {
    setItems((prev) => [...prev, createEmptyItem()]);
  }

  function removeItem(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  // Auto-resolve price for an item
  function getResolvedPrice(item: VentaItemForm): { entero: number | null; tajado: number | null } {
    if (!selectedCliente) return { entero: null, tajado: null };
    const lote = getLoteForItem(item);
    if (!lote) return { entero: null, tajado: null };

    if (selectedCliente.tipo === TipoCliente.MAYORISTA) {
      if (lote.producto === TipoProducto.DOBLE_CREMA) {
        // Check proveedor-specific prices first
        const proveedorPrecio = preciosMemoria.get(lote.proveedorId);
        const memEntero = proveedorPrecio?.precioEntero && Number(proveedorPrecio.precioEntero) > 0
          ? Number(proveedorPrecio.precioEntero)
          : null;
        const memTajado = proveedorPrecio?.precioTajado && Number(proveedorPrecio.precioTajado) > 0
          ? Number(proveedorPrecio.precioTajado)
          : null;
        const entero = memEntero
          ?? (selectedCliente.precioDobleCremaEntero ? Number(selectedCliente.precioDobleCremaEntero) : null);
        const tajado = memTajado
          ?? (selectedCliente.precioDobleCremaTajado ? Number(selectedCliente.precioDobleCremaTajado) : null)
          ?? entero;
        return { entero, tajado };
      }
      if (lote.producto === TipoProducto.SEMISALADO) {
        const price = selectedCliente.precioSemisalado ? Number(selectedCliente.precioSemisalado) : null;
        return { entero: price, tajado: price };
      }
    }
    return { entero: null, tajado: null };
  }

  // Compute effective cantidadKg for an item based on mode
  function getCantidadKg(item: VentaItemForm): string {
    const ventaTipo = getEffectiveVentaTipo(item);
    if (ventaTipo === 'BLOQUES') {
      const enteros = parseInt(item.bloquesEnteros) || 0;
      const tajados = parseInt(item.bloquesTajados) || 0;
      return String((enteros + tajados) * DOBLE_CREMA_BLOCK_KG || 0);
    }
    // For DC GRANEL with dual-variety fields, sum both
    const lote = getLoteForItem(item);
    if (lote && isDobleCrema(lote.producto) && ventaTipo === 'GRANEL') {
      const kgEntero = Number(item.cantidadKgEntero) || 0;
      const kgTajado = Number(item.cantidadKgTajado) || 0;
      if (kgEntero > 0 || kgTajado > 0) {
        return String(kgEntero + kgTajado);
      }
    }
    return item.cantidadKg || '0';
  }

  // Real-time summary for the form step
  const realtimeSummary = useMemo(() => {
    let subtotalProductos = 0;
    let totalKg = 0;
    let itemCount = 0;
    let hasZeroPrice = false;
    const breakdownItems: BreakdownItem[] = [];

    for (const item of items) {
      if (!item.loteId) continue;
      const cantidadKg = Number(getCantidadKg(item));
      if (cantidadKg <= 0) continue;

      itemCount++;
      const lote = getLoteForItem(item);
      const ventaTipo = getEffectiveVentaTipo(item);
      const isDcBloques = ventaTipo === 'BLOQUES' && lote && isDobleCrema(lote.producto);
      const prices = getResolvedPrice(item);

      let itemIngreso = 0;

      if (isDcBloques) {
        const enteros = parseInt(item.bloquesEnteros) || 0;
        const tajados = parseInt(item.bloquesTajados) || 0;
        const formPrecioEntero = Number(item.precioEnteroBloque);
        const formPrecioTajado = Number(item.precioTajadoBloque) || formPrecioEntero;
        const resolvedPrecioEntero = formPrecioEntero || prices.entero;
        const resolvedPrecioTajado = formPrecioTajado || formPrecioEntero || (prices.tajado ?? prices.entero);

        if (enteros > 0 && !resolvedPrecioEntero) hasZeroPrice = true;
        if (tajados > 0 && !resolvedPrecioTajado) hasZeroPrice = true;

        const ingresoEnteros = enteros > 0 && resolvedPrecioEntero !== null ? enteros * resolvedPrecioEntero : 0;
        const ingresoTajados = tajados > 0 && resolvedPrecioTajado !== null ? tajados * resolvedPrecioTajado : 0;
        itemIngreso = ingresoEnteros + ingresoTajados;

        if ((enteros > 0 && resolvedPrecioEntero !== null && resolvedPrecioEntero <= 0) || (tajados > 0 && resolvedPrecioTajado !== null && resolvedPrecioTajado <= 0)) hasZeroPrice = true;

        // Build breakdown item for DC BLOQUES
        if (lote) {
          const reempacados = parseInt(item.bloquesReempacados) || 0;
          const quantity = reempacados > 0
            ? formatDobleCremaDetalle(enteros, tajados, 0, 0) + ` (${reempacados} reempacados)`
            : formatDobleCremaDetalle(enteros, tajados, 0, 0);
          breakdownItems.push({
            name: formatProductName(lote.producto) + ' — ' + (proveedorMap.get(lote.proveedorId) ?? 'Sin proveedor'),
            quantity,
          });
        }
      } else {
        const isDcGranel = lote && isDobleCrema(lote.producto) && ventaTipo === 'GRANEL';
        const kgEntero = Number(item.cantidadKgEntero) || 0;
        const kgTajado = Number(item.cantidadKgTajado) || 0;
        const isDualVariety = isDcGranel && kgEntero > 0 && kgTajado > 0;

        if (isDualVariety) {
          // DC GRANEL dual-variety: only check price for varieties with quantity > 0
          const precioEntero = Number(item.precioVentaKgEntero) || Number(item.precioVentaKg) || 0;
          const precioTajado = Number(item.precioVentaKgTajado) || Number(item.precioVentaKg) || 0;
          itemIngreso = kgEntero * precioEntero + kgTajado * precioTajado;
          if (kgEntero > 0 && precioEntero <= 0) hasZeroPrice = true;
          if (kgTajado > 0 && precioTajado <= 0) hasZeroPrice = true;
        } else if (isDcGranel) {
          const hasEnteroStock = lote!.bloquesEnteros > 0 || Number(lote!.sueltosEntero) > 0;
          const hasTajadoStock = lote!.bloquesTajados > 0 || lote!.bloquesTajadosDeFabrica > 0 || Number(lote!.sueltosTajado) > 0;
          let precio: number;
          if (hasEnteroStock && !hasTajadoStock) {
            precio = Number(item.precioVentaKgEntero) || Number(item.precioVentaKg) || 0;
          } else if (!hasEnteroStock && hasTajadoStock) {
            precio = Number(item.precioVentaKgTajado) || Number(item.precioVentaKg) || 0;
          } else {
            precio = Number(item.precioVentaKg) || 0;
          }
          itemIngreso = cantidadKg * precio;
          if (cantidadKg > 0 && precio <= 0) hasZeroPrice = true;
        } else {
          const precio = Number(item.precioVentaKg) || 0;
          itemIngreso = cantidadKg * precio;
          if (cantidadKg > 0 && precio <= 0) hasZeroPrice = true;
        }

        // Build breakdown item for GRANEL / Semisalado
        if (lote) {
          let quantity: string;
          if (isDualVariety) {
            // Show both varieties in breakdown
            const enteroPart = formatDobleCremaGranel(kgEntero, 'entero');
            const tajadoPart = formatDobleCremaGranel(kgTajado, 'tajado', item.origenTajadoGranel === 'FABRICA' ? 'FABRICA' : 'INTERNO');
            quantity = `${enteroPart} + ${tajadoPart}`;
          } else if (isDcGranel) {
            const variedad = kgEntero > 0 ? 'entero' : 'tajado';
            const origenTajado = variedad === 'tajado' ? (item.origenTajadoGranel === 'FABRICA' ? 'FABRICA' : 'INTERNO') : undefined;
            quantity = formatDobleCremaGranel(cantidadKg, variedad, origenTajado as 'INTERNO' | 'FABRICA' | undefined);
          } else {
            quantity = `${cantidadKg.toLocaleString('es-AR')} kg`;
          }
          breakdownItems.push({
            name: formatProductName(lote.producto) + ' — ' + (proveedorMap.get(lote.proveedorId) ?? 'Sin proveedor'),
            quantity,
          });
        }
      }

      subtotalProductos += itemIngreso;
      totalKg += cantidadKg;
    }

    const valorDomicilioNum = Number(valorDomicilio) || 0;
    const totalGeneral = subtotalProductos + valorDomicilioNum;

    return { subtotalProductos, valorDomicilio: valorDomicilioNum, totalGeneral, totalKg, itemCount, hasZeroPrice, breakdownItems };
  }, [items, valorDomicilio, lotesConStock, selectedCliente, preciosMemoria]);

  async function handleSubmit() {
    if (!clienteId) {
      toast.error('Seleccione un cliente');
      return;
    }

    const validItems = items.filter((item) => item.loteId && Number(getCantidadKg(item)) > 0);
    if (validItems.length === 0) {
      toast.error('Agregue al menos un item con cantidad');
      return;
    }

    // Client-side validation for each item
    for (const item of validItems) {
      const ventaTipo = getEffectiveVentaTipo(item);
      const lote = getLoteForItem(item);
      if (!lote) {
        toast.error('Seleccione un lote válido');
        return;
      }

      if (ventaTipo === 'BLOQUES' && isDobleCrema(lote.producto)) {
        const enteros = parseInt(item.bloquesEnteros) || 0;
        const tajados = parseInt(item.bloquesTajados) || 0;
        const fabrica = parseInt(item.bloquesTajadosDeFabrica) || 0;
        const internos = parseInt(item.bloquesTajadosInternos) || 0;
        if (enteros + tajados <= 0) {
          toast.error('Ingrese al menos un bloque');
          return;
        }
        if (enteros > lote.bloquesEnteros) {
          toast.error(`Solo hay ${lote.bloquesEnteros} bloques enteros disponibles en el lote seleccionado`);
          return;
        }
        if (tajados > lote.bloquesTajadosDisponibles) {
          toast.error(`Solo hay ${lote.bloquesTajadosDisponibles} bloques tajados disponibles en el lote seleccionado`);
          return;
        }
        if (fabrica + internos !== tajados) {
          toast.error(`La suma de tajados de fábrica (${fabrica}) e internos (${internos}) debe igualar el total de tajados (${tajados})`);
          return;
        }
        if (fabrica > lote.bloquesTajadosDeFabrica) {
          toast.error(`Solo hay ${lote.bloquesTajadosDeFabrica} tajados de fábrica disponibles`);
          return;
        }
        if (internos > lote.bloquesTajados) {
          toast.error(`Solo hay ${lote.bloquesTajados} tajados internos disponibles`);
          return;
        }
        const reempacados = parseInt(item.bloquesReempacados) || 0;
        if (reempacados > enteros + tajados) {
          toast.error('Los reempacados no pueden superar los bloques vendidos');
          return;
        }
      }

      if (ventaTipo === 'GRANEL') {
        const kg = Number(getCantidadKg(item));
        if (kg > Number(lote.stockDisponibleKg)) {
          toast.error(`Stock insuficiente: disponible ${Number(lote.stockDisponibleKg).toLocaleString('es-AR')} kg`);
          return;
        }
        // DC GRANEL dual-variety stock validation
        if (isDobleCrema(lote.producto)) {
          const kgEntero = Number(item.cantidadKgEntero) || 0;
          const kgTajado = Number(item.cantidadKgTajado) || 0;
          const stockEnteroKg = lote.bloquesEnteros * DOBLE_CREMA_BLOCK_KG + Number(lote.sueltosEntero);
          const stockTajadoKg = (lote.bloquesTajados + lote.bloquesTajadosDeFabrica) * DOBLE_CREMA_BLOCK_KG + Number(lote.sueltosTajado);
          if (kgEntero > 0 && kgEntero > stockEnteroKg) {
            toast.error(`Stock entero insuficiente: disponible ${stockEnteroKg.toLocaleString('es-AR')} kg de entero`);
            return;
          }
          if (kgTajado > 0 && kgTajado > stockTajadoKg) {
            toast.error(`Stock tajado insuficiente: disponible ${stockTajadoKg.toLocaleString('es-AR')} kg de tajado`);
            return;
          }
          // If using single-field mode, validate against the corresponding variety stock
          if (kgEntero === 0 && kgTajado === 0) {
            const corte = item.origenCorte || 'ENTERO';
            if (corte === 'ENTERO' && kg > stockEnteroKg) {
              toast.error(`Stock entero insuficiente: disponible ${stockEnteroKg.toLocaleString('es-AR')} kg de entero`);
              return;
            }
            if (corte === 'TAJADO' && kg > stockTajadoKg) {
              toast.error(`Stock tajado insuficiente: disponible ${stockTajadoKg.toLocaleString('es-AR')} kg de tajado`);
              return;
            }
          }
        }
      }
    }

    // Resolve price for each item; DC GRANEL dual-variety produces TWO request items
    const requestItems = validItems.flatMap((item) => {
      const ventaTipo = getEffectiveVentaTipo(item);
      const lote = getLoteForItem(item)!;
      const prices = getResolvedPrice(item);
      const isDcBloques = ventaTipo === 'BLOQUES' && isDobleCrema(lote.producto);
      const isDcGranel = ventaTipo === 'GRANEL' && isDobleCrema(lote.producto);

      // For DC BLOQUES, use the per-block price inputs from the form
      let effectivePrice = item.precioVentaKg;
      let resolvedPrecioEntero: number | null = null;
      let resolvedPrecioTajado: number | null = null;

      if (isDcBloques) {
        // Use form fields for per-block prices
        const formPrecioEntero = Number(item.precioEnteroBloque);
        const formPrecioTajado = Number(item.precioTajadoBloque) || formPrecioEntero; // fallback to entero if empty

        resolvedPrecioEntero = formPrecioEntero || prices.entero;
        resolvedPrecioTajado = formPrecioTajado || formPrecioEntero || (prices.tajado ?? prices.entero);

        const enteros = parseInt(item.bloquesEnteros) || 0;
        const tajados = parseInt(item.bloquesTajados) || 0;
        const cantidadKg = Number(getCantidadKg(item)) || 0;

        if (enteros > 0 && tajados === 0) {
          const ingreso = enteros * resolvedPrecioEntero!;
          effectivePrice = String(cantidadKg > 0 ? ingreso / cantidadKg : resolvedPrecioEntero! / DOBLE_CREMA_BLOCK_KG);
        } else if (tajados > 0 && enteros === 0) {
          const ingreso = tajados * resolvedPrecioTajado!;
          effectivePrice = String(cantidadKg > 0 ? ingreso / cantidadKg : resolvedPrecioTajado! / DOBLE_CREMA_BLOCK_KG);
        } else if (enteros > 0 && tajados > 0) {
          const ingEnteros = enteros * resolvedPrecioEntero!;
          const ingTajados = tajados * resolvedPrecioTajado!;
          const ingreso = ingEnteros + ingTajados;
          effectivePrice = String(cantidadKg > 0 ? ingreso / cantidadKg : resolvedPrecioEntero! / DOBLE_CREMA_BLOCK_KG);
        }
      }

      // DC GRANEL dual-variety: produce two request items
      if (isDcGranel) {
        const kgEntero = Number(item.cantidadKgEntero) || 0;
        const kgTajado = Number(item.cantidadKgTajado) || 0;

        // Validate prices per variety
        const hasEnteroStock = lote.bloquesEnteros > 0 || Number(lote.sueltosEntero) > 0;
        const hasTajadoStock = lote.bloquesTajados > 0 || lote.bloquesTajadosDeFabrica > 0 || Number(lote.sueltosTajado) > 0;

        if (kgEntero > 0 && kgTajado > 0) {
          // Dual variety: both prices required
          const precioEntero = Number(item.precioVentaKgEntero) || Number(item.precioVentaKg);
          const precioTajado = Number(item.precioVentaKgTajado) || Number(item.precioVentaKg);
          if (!precioEntero || precioEntero <= 0) {
            toast.error('Ingrese un precio de venta válido para enteros');
            return [undefined] as undefined[];
          }
          if (!precioTajado || precioTajado <= 0) {
            toast.error('Ingrese un precio de venta válido para tajados');
            return [undefined] as undefined[];
          }
        } else if (kgEntero > 0) {
          // Only entero: validate entero price
          const precioEntero = Number(item.precioVentaKgEntero) || Number(item.precioVentaKg);
          if (!precioEntero || precioEntero <= 0) {
            toast.error('Ingrese un precio de venta válido');
            return [undefined] as undefined[];
          }
        } else if (kgTajado > 0) {
          // Only tajado: validate tajado price
          const precioTajado = Number(item.precioVentaKgTajado) || Number(item.precioVentaKg);
          if (!precioTajado || precioTajado <= 0) {
            toast.error('Ingrese un precio de venta válido');
            return [undefined] as undefined[];
          }
        } else if (hasEnteroStock && !hasTajadoStock) {
          // Single variety mode (entero only)
          const precioEntero = Number(item.precioVentaKgEntero) || Number(item.precioVentaKg);
          if (!precioEntero || precioEntero <= 0) {
            toast.error('Ingrese un precio de venta válido');
            return [undefined] as undefined[];
          }
        } else if (!hasEnteroStock && hasTajadoStock) {
          // Single variety mode (tajado only)
          const precioTajado = Number(item.precioVentaKgTajado) || Number(item.precioVentaKg);
          if (!precioTajado || precioTajado <= 0) {
            toast.error('Ingrese un precio de venta válido');
            return [undefined] as undefined[];
          }
        } else {
          // Fallback: single field mode
          if (!effectivePrice || Number(effectivePrice) <= 0) {
            toast.error('Ingrese un precio de venta válido para todos los items');
            return [undefined] as undefined[];
          }
        }

        const results: Array<{
          loteId: string;
          ventaTipo: VentaTipo;
          cantidadKg: string;
          precioVentaKg: string;
          bloquesEnterosVendidos: number;
          bloquesTajadosVendidos: number;
          bloquesTajadosDeFabricaVendidos?: number;
          bloquesTajadosInternosVendidos?: number;
          bloquesReempacados: number;
          precioEnteroBloque?: string;
          precioTajadoBloque?: string;
          origenCorte?: string;
          origenTajadoGranel?: string;
        } | undefined> = [];

        if (kgEntero > 0 && kgTajado > 0) {
          // Dual variety: two separate request items with separate prices
          const precioEntero = Number(item.precioVentaKgEntero) || Number(item.precioVentaKg);
          const precioTajado = Number(item.precioVentaKgTajado) || Number(item.precioVentaKg);
          results.push({
            loteId: item.loteId,
            ventaTipo,
            cantidadKg: String(kgEntero),
            precioVentaKg: String(precioEntero),
            bloquesEnterosVendidos: 0,
            bloquesTajadosVendidos: 0,
            bloquesTajadosDeFabricaVendidos: undefined,
            bloquesTajadosInternosVendidos: undefined,
            bloquesReempacados: 0,
            precioEnteroBloque: undefined,
            precioTajadoBloque: undefined,
            origenCorte: 'ENTERO',
            origenTajadoGranel: undefined,
          });
          results.push({
            loteId: item.loteId,
            ventaTipo,
            cantidadKg: String(kgTajado),
            precioVentaKg: String(precioTajado),
            bloquesEnterosVendidos: 0,
            bloquesTajadosVendidos: 0,
            bloquesTajadosDeFabricaVendidos: undefined,
            bloquesTajadosInternosVendidos: undefined,
            bloquesReempacados: 0,
            precioEnteroBloque: undefined,
            precioTajadoBloque: undefined,
            origenCorte: 'TAJADO',
            origenTajadoGranel: item.origenTajadoGranel || 'INTERNO',
          });
        } else if (kgEntero > 0) {
          // Only entero
          const precioEntero = Number(item.precioVentaKgEntero) || Number(item.precioVentaKg);
          results.push({
            loteId: item.loteId,
            ventaTipo,
            cantidadKg: String(kgEntero),
            precioVentaKg: String(precioEntero),
            bloquesEnterosVendidos: 0,
            bloquesTajadosVendidos: 0,
            bloquesTajadosDeFabricaVendidos: undefined,
            bloquesTajadosInternosVendidos: undefined,
            bloquesReempacados: 0,
            precioEnteroBloque: undefined,
            precioTajadoBloque: undefined,
            origenCorte: 'ENTERO',
            origenTajadoGranel: undefined,
          });
        } else if (kgTajado > 0) {
          // Only tajado
          const precioTajado = Number(item.precioVentaKgTajado) || Number(item.precioVentaKg);
          results.push({
            loteId: item.loteId,
            ventaTipo,
            cantidadKg: String(kgTajado),
            precioVentaKg: String(precioTajado),
            bloquesEnterosVendidos: 0,
            bloquesTajadosVendidos: 0,
            bloquesTajadosDeFabricaVendidos: undefined,
            bloquesTajadosInternosVendidos: undefined,
            bloquesReempacados: 0,
            precioEnteroBloque: undefined,
            precioTajadoBloque: undefined,
            origenCorte: 'TAJADO',
            origenTajadoGranel: item.origenTajadoGranel || 'INTERNO',
          });
        } else {
          // Single-field mode (legacy): use variety-specific price if available
          const hasEnteroStock = lote.bloquesEnteros > 0 || Number(lote.sueltosEntero) > 0;
          const hasTajadoStock = lote.bloquesTajados > 0 || lote.bloquesTajadosDeFabrica > 0 || Number(lote.sueltosTajado) > 0;
          let precio = effectivePrice;
          if (hasEnteroStock && !hasTajadoStock) {
            precio = String(Number(item.precioVentaKgEntero) || Number(item.precioVentaKg));
          } else if (!hasEnteroStock && hasTajadoStock) {
            precio = String(Number(item.precioVentaKgTajado) || Number(item.precioVentaKg));
          }
          results.push({
            loteId: item.loteId,
            ventaTipo,
            cantidadKg: getCantidadKg(item),
            precioVentaKg: precio,
            bloquesEnterosVendidos: 0,
            bloquesTajadosVendidos: 0,
            bloquesTajadosDeFabricaVendidos: undefined,
            bloquesTajadosInternosVendidos: undefined,
            bloquesReempacados: 0,
            precioEnteroBloque: undefined,
            precioTajadoBloque: undefined,
            origenCorte: item.origenCorte || 'ENTERO',
            origenTajadoGranel: item.origenCorte === 'TAJADO' ? (item.origenTajadoGranel || 'INTERNO') : undefined,
          });
        }

        return results;
      }

      if (!effectivePrice || Number(effectivePrice) <= 0) {
        toast.error('Ingrese un precio de venta válido para todos los items');
        return [undefined] as undefined[];
      }

      const baseRequestItem = {
        loteId: item.loteId,
        ventaTipo,
        cantidadKg: getCantidadKg(item),
        precioVentaKg: effectivePrice,
        bloquesEnterosVendidos: ventaTipo === 'BLOQUES' ? (parseInt(item.bloquesEnteros) || 0) : 0,
        bloquesTajadosVendidos: ventaTipo === 'BLOQUES' ? (parseInt(item.bloquesTajados) || 0) : 0,
        bloquesTajadosDeFabricaVendidos: isDcBloques ? (parseInt(item.bloquesTajadosDeFabrica) || 0) : undefined,
        bloquesTajadosInternosVendidos: isDcBloques ? (parseInt(item.bloquesTajadosInternos) || 0) : undefined,
        bloquesReempacados: ventaTipo === 'BLOQUES' ? (parseInt(item.bloquesReempacados) || 0) : 0,
        precioEnteroBloque: isDcBloques && resolvedPrecioEntero !== null ? String(resolvedPrecioEntero) : undefined,
        precioTajadoBloque: isDcBloques && resolvedPrecioTajado !== null ? String(resolvedPrecioTajado) : undefined,
        origenCorte: ventaTipo === 'GRANEL' && lote && isDobleCrema(lote.producto) ? (item.origenCorte || 'ENTERO') : undefined,
        origenTajadoGranel: ventaTipo === 'GRANEL' && lote && isDobleCrema(lote.producto) && item.origenCorte === 'TAJADO' ? (item.origenTajadoGranel || 'INTERNO') : undefined,
      };

      return [baseRequestItem];
    });

    if (requestItems.some((i) => i === undefined)) {
      return;
    }

    const typedRequestItems = requestItems as Array<{
      loteId: string;
      ventaTipo: VentaTipo;
      cantidadKg: string;
      precioVentaKg: string;
      bloquesEnterosVendidos: number;
      bloquesTajadosVendidos: number;
      bloquesTajadosDeFabricaVendidos?: number;
      bloquesTajadosInternosVendidos?: number;
      bloquesReempacados: number;
      precioEnteroBloque?: string;
      precioTajadoBloque?: string;
      origenCorte?: string;
      origenTajadoGranel?: string;
    }>;

    // Validate metodoPagoAbono when CREDITO with abono > 0
    if (metodoPago === 'CREDITO' && abono && Number(abono) > 0 && !metodoPagoAbono) {
      toast.error('Seleccione el método de pago del abono');
      return;
    }

    try {
      setSubmitting(true);

      let result: { success: boolean; venta?: VentaResponse; error?: string };

      if (ventaToEdit) {
        // Atomic edit: reverse old sale + create new sale in one transaction
        result = await editarVenta({
          ventaId: ventaToEdit.id,
          clienteId,
          sedeId: sedeId || undefined,
          items: typedRequestItems,
          valorDomicilio: valorDomicilio || '0',
          costoDomiciliario: costoDomiciliario || '0',
          domiciliario: domiciliario || undefined,
          metodoPago,
          metodoPagoAbono: metodoPago === 'CREDITO' && abono && Number(abono) > 0 ? metodoPagoAbono : undefined,
          abono: metodoPago === 'CREDITO' ? (abono || '0') : undefined,
          observaciones: observaciones || undefined,
        });
      } else {
        result = await registrarVenta({
          clienteId,
          sedeId: sedeId || undefined,
          items: typedRequestItems,
          valorDomicilio: valorDomicilio || '0',
          costoDomiciliario: costoDomiciliario || '0',
          domiciliario: domiciliario || undefined,
          metodoPago,
          metodoPagoAbono: metodoPago === 'CREDITO' && abono && Number(abono) > 0 ? metodoPagoAbono : undefined,
          abono: metodoPago === 'CREDITO' ? (abono || '0') : undefined,
          observaciones: observaciones || undefined,
        });
      }

      if (result.success) {
        toast.success(isEditMode ? 'Venta actualizada exitosamente' : 'Venta registrada exitosamente');
        refreshData();
        setOpen(false);
        resetForm();
        if (isEditMode && onEditComplete) {
          onEditComplete();
        }
      } else {
        toast.error(result.error || (isEditMode ? 'Error al actualizar venta' : 'Error al registrar venta'));
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : (isEditMode ? 'Error al actualizar venta' : 'Error al registrar venta'));
    } finally {
      setSubmitting(false);
    }
  }

  // Compute the summary data for review before submission
  function computeSummary(): SummaryData | null {
    const validItems = items.filter((item) => item.loteId && Number(getCantidadKg(item)) > 0);
    if (validItems.length === 0) return null;

    let totalKg = 0;
    let ingresoTotal = 0;
    let costoTotal = 0;
    let totalBloquesEnteros = 0;
    let totalBloquesTajados = 0;
    let kgGranelEntero = 0;
    let kgGranelTajado = 0;
    let kgDobleCrema = 0;
    let kgSemisalado = 0;

    const summaryItems = validItems.map((item) => {
      const lote = getLoteForItem(item);
      const ventaTipo = getEffectiveVentaTipo(item);
      const prices = getResolvedPrice(item);
      const cantidadKg = Number(getCantidadKg(item));
      const enteros = parseInt(item.bloquesEnteros) || 0;
      const tajados = parseInt(item.bloquesTajados) || 0;
      const reempacados = parseInt(item.bloquesReempacados) || 0;
      const tajadosDeFabrica = parseInt(item.bloquesTajadosDeFabrica) || 0;
      const tajadosInternos = parseInt(item.bloquesTajadosInternos) || 0;
      const isDcBloques = ventaTipo === 'BLOQUES' && lote && isDobleCrema(lote.producto);

      // Resolve per-block prices: prefer form inputs, fall back to memorized prices
      const formPrecioEntero = Number(item.precioEnteroBloque);
      const formPrecioTajado = Number(item.precioTajadoBloque) || formPrecioEntero;
      const resolvedPrecioEntero = isDcBloques
        ? (formPrecioEntero || prices.entero)
        : prices.entero;
      const resolvedPrecioTajado = isDcBloques
        ? (formPrecioTajado || formPrecioEntero || (prices.tajado ?? prices.entero))
        : (prices.tajado ?? prices.entero);

      let precioVentaKg = Number(item.precioVentaKg) || 0;
      if (isDcBloques && resolvedPrecioEntero !== null) {
        if (enteros > 0 && tajados === 0) {
          const ingreso = enteros * resolvedPrecioEntero!;
          precioVentaKg = cantidadKg > 0 ? ingreso / cantidadKg : resolvedPrecioEntero! / DOBLE_CREMA_BLOCK_KG;
        } else if (tajados > 0 && enteros === 0) {
          const ingreso = tajados * resolvedPrecioTajado!;
          precioVentaKg = cantidadKg > 0 ? ingreso / cantidadKg : resolvedPrecioTajado! / DOBLE_CREMA_BLOCK_KG;
        } else if (enteros > 0 && tajados > 0) {
          const ingEnteros = enteros * resolvedPrecioEntero!;
          const ingTajados = tajados * resolvedPrecioTajado!;
          const ingreso = ingEnteros + ingTajados;
          precioVentaKg = cantidadKg > 0 ? ingreso / cantidadKg : resolvedPrecioEntero! / DOBLE_CREMA_BLOCK_KG;
        }
      }

      // Calculate income split by block type for DC BLOQUES
      let ingresoEnteros = 0;
      let ingresoTajados = 0;
      const isDcGranel = ventaTipo === 'GRANEL' && lote && isDobleCrema(lote.producto);
      const kgEnteroForm = Number(item.cantidadKgEntero) || 0;
      const kgTajadoForm = Number(item.cantidadKgTajado) || 0;
      const isDualVariety = isDcGranel && kgEnteroForm > 0 && kgTajadoForm > 0;
      let precioVentaKgEntero = 0;
      let precioVentaKgTajado = 0;

      if (isDcBloques) {
        if (enteros > 0 && resolvedPrecioEntero !== null) {
          ingresoEnteros = enteros * resolvedPrecioEntero;
        }
        if (tajados > 0) {
          ingresoTajados = tajados * (resolvedPrecioTajado ?? resolvedPrecioEntero ?? 0);
        }
      }

      // Compute ingreso and per-variety prices
      let ingreso: number;
      if (isDcBloques) {
        ingreso = ingresoEnteros + ingresoTajados;
      } else if (isDualVariety) {
        precioVentaKgEntero = Number(item.precioVentaKgEntero) || Number(item.precioVentaKg) || 0;
        precioVentaKgTajado = Number(item.precioVentaKgTajado) || Number(item.precioVentaKg) || 0;
        ingreso = kgEnteroForm * precioVentaKgEntero + kgTajadoForm * precioVentaKgTajado;
        ingresoEnteros = kgEnteroForm * precioVentaKgEntero;
        ingresoTajados = kgTajadoForm * precioVentaKgTajado;
        precioVentaKg = cantidadKg > 0 ? ingreso / cantidadKg : 0;
      } else if (isDcGranel) {
        // DC GRANEL single variety
        const hasEnteroStock = lote!.bloquesEnteros > 0 || Number(lote!.sueltosEntero) > 0;
        const hasTajadoStock = lote!.bloquesTajados > 0 || lote!.bloquesTajadosDeFabrica > 0 || Number(lote!.sueltosTajado) > 0;
        if (hasEnteroStock && !hasTajadoStock) {
          precioVentaKgEntero = Number(item.precioVentaKgEntero) || precioVentaKg;
          precioVentaKg = precioVentaKgEntero;
        } else if (!hasEnteroStock && hasTajadoStock) {
          precioVentaKgTajado = Number(item.precioVentaKgTajado) || precioVentaKg;
          precioVentaKg = precioVentaKgTajado;
        } else {
          // Both varieties available but only one chosen
          const corte = item.origenCorte || 'ENTERO';
          if (corte === 'ENTERO') {
            precioVentaKgEntero = precioVentaKg;
          } else {
            precioVentaKgTajado = precioVentaKg;
          }
        }
        ingreso = cantidadKg * precioVentaKg;
      } else {
        ingreso = cantidadKg * precioVentaKg;
      }
      let costoAplicadoKg = 0;
      if (lote) {
        if (ventaTipo === 'GRANEL') {
          costoAplicadoKg = Number(lote.costoRealCalculadoKg);
        } else if (isDobleCrema(lote.producto)) {
          const kgEnteros = enteros * DOBLE_CREMA_BLOCK_KG;
          const kgTajadosFabrica = tajadosDeFabrica * DOBLE_CREMA_BLOCK_KG;
          const kgTajadosInternos = tajadosInternos * DOBLE_CREMA_BLOCK_KG;
          const costoEntero = Number(lote.costoRealCalculadoKg);
          const costoTajadoFabrica = Number(lote.costoTajadoFabricaKg);
          const costoTajadoInterno = Number(lote.costoTajadoKg);
          const costoTotalBlock = costoEntero * kgEnteros + costoTajadoFabrica * kgTajadosFabrica + costoTajadoInterno * kgTajadosInternos;
          costoAplicadoKg = cantidadKg > 0 ? costoTotalBlock / cantidadKg : costoEntero;
        } else {
          costoAplicadoKg = Number(lote.costoRealCalculadoKg);
        }
      }
      const costoItem = cantidadKg * costoAplicadoKg;
      const costoEmpaques = (isDcBloques && reempacados > 0 && precioBolsa) ? reempacados * precioBolsa : 0;

      // Cost breakdown per block type for DC display
      let costoEnteroBloque: number | null = null;
      let costoTajadoFabricaBloque: number | null = null;
      let costoTajadoInternoBloque: number | null = null;
      let costoEnteroKg: number | null = null;
      let costoTajadoFabricaKg: number | null = null;
      let precioEnteroBloque: number | null = null;
      let precioTajadoBloque: number | null = null;
      if (isDcBloques) {
        costoEnteroKg = Number(lote.costoRealCalculadoKg);
        costoEnteroBloque = costoEnteroKg * DOBLE_CREMA_BLOCK_KG;
        if (tajadosDeFabrica > 0) {
          costoTajadoFabricaKg = Number(lote.costoTajadoFabricaKg);
          costoTajadoFabricaBloque = costoTajadoFabricaKg * DOBLE_CREMA_BLOCK_KG;
        }
        if (tajadosInternos > 0) {
          const costoTajadoInternoKg = Number(lote.costoTajadoKg);
          costoTajadoInternoBloque = costoTajadoInternoKg * DOBLE_CREMA_BLOCK_KG;
        }
        if (enteros > 0) {
          precioEnteroBloque = resolvedPrecioEntero;
        }
        if (tajados > 0) {
          precioTajadoBloque = resolvedPrecioTajado ?? resolvedPrecioEntero ?? null;
        }
      }

      totalKg += cantidadKg;
      ingresoTotal += ingreso;
      costoTotal += costoItem + costoEmpaques;
      if (lote) {
        if (isDobleCrema(lote.producto)) {
          kgDobleCrema += cantidadKg;
          totalBloquesEnteros += enteros;
          totalBloquesTajados += tajados;
          // Accumulate granel kg by variedad for block-equivalent normalization
          if (ventaTipo === 'GRANEL') {
            const kgEntero = Number(item.cantidadKgEntero) || 0;
            const kgTajado = Number(item.cantidadKgTajado) || 0;
            if (kgEntero > 0 || kgTajado > 0) {
              // Dual-variety or single-variety fields
              kgGranelEntero += kgEntero;
              kgGranelTajado += kgTajado;
            } else {
              // Fallback to single-field mode
              const corte = item.origenCorte || 'ENTERO';
              if (corte === 'ENTERO') {
                kgGranelEntero += cantidadKg;
              } else {
                kgGranelTajado += cantidadKg;
              }
            }
          }
        } else {
          kgSemisalado += cantidadKg;
        }
      }

      return {
        lote,
        ventaTipo,
        cantidadKg,
        precioVentaKg,
        precioVentaKgEntero,
        precioVentaKgTajado,
        precioEnteroBloque,
        precioTajadoBloque,
        costoAplicadoKg,
        costoEnteroBloque,
        costoTajadoFabricaBloque,
        costoTajadoInternoBloque,
        costoEnteroKg,
        costoTajadoFabricaKg,
        ingreso,
        ingresoEnteros,
        ingresoTajados,
        costoItem,
        costoEmpaques,
        enteros,
        tajados,
        reempacados,
        tajadosDeFabrica,
        tajadosInternos,
        origenCorte: ventaTipo === 'GRANEL' && lote && isDobleCrema(lote.producto) ? (item.origenCorte || 'ENTERO') : undefined,
        origenTajadoGranel: ventaTipo === 'GRANEL' && lote && isDobleCrema(lote.producto) && item.origenCorte === 'TAJADO' ? (item.origenTajadoGranel || 'INTERNO') : undefined,
        cantidadKgEntero: Number(item.cantidadKgEntero) || 0,
        cantidadKgTajado: Number(item.cantidadKgTajado) || 0,
      };
    });

    const domicilio = Number(valorDomicilio) || 0;
    const costoDomic = Number(costoDomiciliario) || 0;
    ingresoTotal += domicilio;

    const costoEmpaquesTotal = summaryItems.reduce((sum, s) => sum + s.costoEmpaques, 0);

    return {
      items: summaryItems,
      totalKg,
      totalBloquesEnteros,
      totalBloquesTajados,
      kgGranelEntero,
      kgGranelTajado,
      kgDobleCrema,
      kgSemisalado,
      ingresoTotal,
      costoTotal,
      costoEmpaquesTotal,
      gananciaBruta: ingresoTotal - costoTotal - costoDomic,
      domicilio,
      costoDomiciliario: costoDomic,
    };
  }

  function handleGoToSummary() {
    if (!clienteId) {
      toast.error('Seleccione un cliente');
      return;
    }

    const validItems = items.filter((item) => item.loteId && Number(getCantidadKg(item)) > 0);
    if (validItems.length === 0) {
      toast.error('Agregue al menos un item con cantidad');
      return;
    }

    for (const item of validItems) {
      const ventaTipo = getEffectiveVentaTipo(item);
      const lote = getLoteForItem(item);
      if (!lote) {
        toast.error('Seleccione un lote válido');
        return;
      }

      if (ventaTipo === 'BLOQUES' && isDobleCrema(lote.producto)) {
        const enteros = parseInt(item.bloquesEnteros) || 0;
        const tajados = parseInt(item.bloquesTajados) || 0;
        const fabrica = parseInt(item.bloquesTajadosDeFabrica) || 0;
        const internos = parseInt(item.bloquesTajadosInternos) || 0;
        if (enteros + tajados <= 0) {
          toast.error('Ingrese al menos un bloque');
          return;
        }
        if (enteros > lote.bloquesEnteros) {
          toast.error(`Solo hay ${lote.bloquesEnteros} bloques enteros disponibles en el lote seleccionado`);
          return;
        }
        if (tajados > lote.bloquesTajadosDisponibles) {
          toast.error(`Solo hay ${lote.bloquesTajadosDisponibles} bloques tajados disponibles en el lote seleccionado`);
          return;
        }
        if (fabrica + internos !== tajados) {
          toast.error(`La suma de tajados de fábrica (${fabrica}) e internos (${internos}) debe igualar el total de tajados (${tajados})`);
          return;
        }
        if (fabrica > lote.bloquesTajadosDeFabrica) {
          toast.error(`Solo hay ${lote.bloquesTajadosDeFabrica} tajados de fábrica disponibles`);
          return;
        }
        if (internos > lote.bloquesTajados) {
          toast.error(`Solo hay ${lote.bloquesTajados} tajados internos disponibles`);
          return;
        }
        const reempacados = parseInt(item.bloquesReempacados) || 0;
        if (reempacados > enteros + tajados) {
          toast.error('Los reempacados no pueden superar los bloques vendidos');
          return;
        }
      }

      if (ventaTipo === 'GRANEL') {
        const kg = Number(getCantidadKg(item));
        if (kg > Number(lote.stockDisponibleKg)) {
          toast.error(`Stock insuficiente: disponible ${Number(lote.stockDisponibleKg).toLocaleString('es-AR')} kg`);
          return;
        }
        // DC GRANEL dual-variety stock validation
        if (isDobleCrema(lote.producto)) {
          const kgEntero = Number(item.cantidadKgEntero) || 0;
          const kgTajado = Number(item.cantidadKgTajado) || 0;
          const stockEnteroKg = lote.bloquesEnteros * DOBLE_CREMA_BLOCK_KG + Number(lote.sueltosEntero);
          const stockTajadoKg = (lote.bloquesTajados + lote.bloquesTajadosDeFabrica) * DOBLE_CREMA_BLOCK_KG + Number(lote.sueltosTajado);
          if (kgEntero > 0 && kgEntero > stockEnteroKg) {
            toast.error(`Stock entero insuficiente: disponible ${stockEnteroKg.toLocaleString('es-AR')} kg de entero`);
            return;
          }
          if (kgTajado > 0 && kgTajado > stockTajadoKg) {
            toast.error(`Stock tajado insuficiente: disponible ${stockTajadoKg.toLocaleString('es-AR')} kg de tajado`);
            return;
          }
          if (kgEntero === 0 && kgTajado === 0) {
            const corte = item.origenCorte || 'ENTERO';
            if (corte === 'ENTERO' && kg > stockEnteroKg) {
              toast.error(`Stock entero insuficiente: disponible ${stockEnteroKg.toLocaleString('es-AR')} kg de entero`);
              return;
            }
            if (corte === 'TAJADO' && kg > stockTajadoKg) {
              toast.error(`Stock tajado insuficiente: disponible ${stockTajadoKg.toLocaleString('es-AR')} kg de tajado`);
              return;
            }
          }
        }
      }

      // Price validation
      if (ventaTipo === 'BLOQUES' && isDobleCrema(lote.producto)) {
        // DC BLOQUES — per-block price required
        const precioEntero = Number(item.precioEnteroBloque);
        if (!precioEntero || precioEntero <= 0) {
          toast.error('Ingrese el precio por bloque entero para todos los items de Doble Crema');
          return;
        }
      } else if (isDobleCrema(lote.producto)) {
        // DC GRANEL — validate separate prices per variety
        const kgEntero = Number(item.cantidadKgEntero) || 0;
        const kgTajado = Number(item.cantidadKgTajado) || 0;
        const hasEnteroStock = lote.bloquesEnteros > 0 || Number(lote.sueltosEntero) > 0;
        const hasTajadoStock = lote.bloquesTajados > 0 || lote.bloquesTajadosDeFabrica > 0 || Number(lote.sueltosTajado) > 0;

        if (kgEntero > 0 && kgTajado > 0) {
          // Dual variety: both prices required
          const precioEntero = Number(item.precioVentaKgEntero) || Number(item.precioVentaKg);
          const precioTajado = Number(item.precioVentaKgTajado) || Number(item.precioVentaKg);
          if (!precioEntero || precioEntero <= 0) {
            toast.error('Ingrese un precio de venta válido para enteros');
            return;
          }
          if (!precioTajado || precioTajado <= 0) {
            toast.error('Ingrese un precio de venta válido para tajados');
            return;
          }
        } else if (kgEntero > 0) {
          // Only enteros
          const precio = Number(item.precioVentaKgEntero) || Number(item.precioVentaKg);
          if (!precio || precio <= 0) {
            toast.error('Ingrese un precio de venta válido');
            return;
          }
        } else if (kgTajado > 0) {
          // Only tajados
          const precio = Number(item.precioVentaKgTajado) || Number(item.precioVentaKg);
          if (!precio || precio <= 0) {
            toast.error('Ingrese un precio de venta válido');
            return;
          }
        } else if (hasEnteroStock && !hasTajadoStock) {
          // Single variety mode (entero only)
          const precio = Number(item.precioVentaKgEntero) || Number(item.precioVentaKg);
          if (!precio || precio <= 0) {
            toast.error('Ingrese un precio de venta válido');
            return;
          }
        } else if (!hasEnteroStock && hasTajadoStock) {
          // Single variety mode (tajado only)
          const precio = Number(item.precioVentaKgTajado) || Number(item.precioVentaKg);
          if (!precio || precio <= 0) {
            toast.error('Ingrese un precio de venta válido');
            return;
          }
        } else {
          // Fallback
          const precio = Number(item.precioVentaKg);
          if (!precio || precio <= 0) {
            toast.error('Ingrese un precio de venta válido para todos los items');
            return;
          }
        }
      } else {
        // Non-DC — price per kg required
        const precio = Number(item.precioVentaKg);
        if (!precio || precio <= 0) {
          toast.error('Ingrese un precio de venta válido para todos los items');
          return;
        }
      }
    }

    setStep('summary');
  }

  function resetForm() {
    setClienteId('');
    setSedeId('');
    setItems([createEmptyItem()]);
    setValorDomicilio('');
    setCostoDomiciliario('');
    setDomiciliario('');
    setMetodoPago('EFECTIVO');
    setAbono('');
    setMetodoPagoAbono('');
    setObservaciones('');
    setStep('form');
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
      {!isEditMode && (
        <DialogTrigger render={<Button variant="outline" size="sm" />}>
          <PlusIcon className="size-4" />
          Registrar Venta
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-5xl max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{step === 'form' ? (isEditMode ? 'Editar Venta' : 'Registrar Venta') : (isEditMode ? 'Confirmar Cambios' : 'Confirmar Venta')}</DialogTitle>
          <DialogDescription>
            {step === 'form'
              ? (isEditMode ? 'Modifique los datos de la venta. Se eliminará la venta anterior y se registrará la nueva.' : 'Complete los datos para registrar una nueva venta. Puede agregar múltiples lotes.')
              : (isEditMode ? 'Revise los cambios antes de confirmar. La venta anterior será eliminada y se creará una nueva.' : 'Revise los datos antes de confirmar la venta.')}
          </DialogDescription>
        </DialogHeader>

        {step === 'form' ? (
          <div className="grid lg:grid-cols-[1fr_320px] gap-4">
          <div className="space-y-4">
          {/* Cliente */}
          <div className="space-y-2">
            <Label htmlFor="clienteId">Cliente</Label>
            <div className="flex gap-2">
              <Select name="clienteId" value={clienteId} onValueChange={(v) => { setClienteId(v ?? ''); }}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Seleccione cliente">{clienteId ? (clienteLabels.get(clienteId) ?? 'Seleccione cliente') : 'Seleccione cliente'}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {activeClientes.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.nombre} ({tipoClienteLabel[c.tipo as TipoCliente] ?? c.tipo})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedCliente && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="shrink-0"
                  onClick={() => setEditClienteOpen(true)}
                >
                  <Pencil className="size-3 mr-1" />
                  Precios
                </Button>
              )}
            </div>
          </div>

          {/* Sede selector */}
          {sedes.length > 1 && (
            <div className="space-y-2">
              <Label htmlFor="sedeId">Sede</Label>
              <Select value={sedeId} onValueChange={(v) => setSedeId(v ?? '')}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Seleccione sede">{sedes.find((s) => s.id === sedeId)?.nombre ?? 'Seleccione sede'}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {sedes.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.nombre}{s.esPrincipal ? ' (Principal)' : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Items */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-base font-semibold">Items</Label>
              <Button type="button" variant="outline" size="sm" onClick={addItem}>
                <PlusIcon className="size-4 mr-1" />
                Agregar lote
              </Button>
            </div>

            {items.map((item, index) => {
              const lote = getLoteForItem(item);
              const ventaTipo = getEffectiveVentaTipo(item);
              const isBlockMode = ventaTipo === 'BLOQUES';
              const isDC = lote ? isDobleCrema(lote.producto) : false;
              const prices = getResolvedPrice(item);

              return (
                <div key={index} className="rounded-lg border p-3 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Lote {index + 1}</span>
                    {items.length > 1 && (
                      <Button type="button" variant="ghost" size="sm" onClick={() => removeItem(index)}>
                        <TrashIcon className="size-4 text-destructive" />
                      </Button>
                    )}
                  </div>

                  {/* Lote selector */}
                  <div className="space-y-2">
                    <Label>Lote</Label>
                    <Select
                      value={item.loteId}
                      onValueChange={(v: string | null) => {
                        const newLoteId = v ?? '';
                        const newLote = lotesConStock.find((l) => l.id === newLoteId);
                        // Auto-fill per-block prices from proveedor-specific memory for DC lots
                        let precioEnteroBloque = '';
                        let precioTajadoBloque = '';
                        if (newLote && isDobleCrema(newLote.producto)) {
                          const proveedorPrecio = preciosMemoria.get(newLote.proveedorId);
                          if (proveedorPrecio) {
                            if (proveedorPrecio.precioEntero && Number(proveedorPrecio.precioEntero) > 0) {
                              precioEnteroBloque = proveedorPrecio.precioEntero;
                            }
                            if (proveedorPrecio.precioTajado && Number(proveedorPrecio.precioTajado) > 0) {
                              precioTajadoBloque = proveedorPrecio.precioTajado;
                            }
                          }
                        }
                        // Auto-select variedad: default ENTERO, but switch to TAJADO if no enteros stock
                        const hasEntero = newLote ? (newLote.bloquesEnteros > 0 || Number(newLote.sueltosEntero) > 0) : true;
                        const hasTajado = newLote ? (newLote.bloquesTajados > 0 || newLote.bloquesTajadosDeFabrica > 0 || Number(newLote.sueltosTajado) > 0) : true;
                        const autoOrigenCorte = !hasEntero && hasTajado ? 'TAJADO' : 'ENTERO';
                        updateItem(index, {
                           loteId: newLoteId,
                           bloquesEnteros: '',
                           bloquesTajados: '',
                           bloquesTajadosDeFabrica: '',
                           bloquesTajadosInternos: '',
                           cantidadKg: '',
                           cantidadKgEntero: '',
                           cantidadKgTajado: '',
                           precioVentaKg: '',
                           precioVentaKgEntero: '',
                           precioVentaKgTajado: '',
                           bloquesReempacados: '',
                           precioEnteroBloque,
                           precioTajadoBloque,
                           origenCorte: autoOrigenCorte,
                        });
                      }}
                    >
                       <SelectTrigger className="w-full">
                          <SelectValue placeholder="Seleccione lote">
                             {lote ? (
                               isDobleCrema(lote.producto)
                                  ? `${tipoProductoLabel[lote.producto as TipoProducto] ?? lote.producto} — ${proveedorMap.get(lote.proveedorId) ?? 'Sin proveedor'} — ${formatDobleCremaDetalle(lote.bloquesEnteros, lote.bloquesTajadosDisponibles, Number(lote.sueltosEntero), Number(lote.sueltosTajado))} (${Number(lote.stockDisponibleKg).toLocaleString('es-AR')} kg)`
                                  : `${tipoProductoLabel[lote.producto as TipoProducto] ?? lote.producto} — ${proveedorMap.get(lote.proveedorId) ?? 'Sin proveedor'} — ${Number(lote.stockDisponibleKg).toLocaleString('es-AR')} kg disp.`
                             ) : 'Seleccione lote'}
                           </SelectValue>
                        </SelectTrigger>
                       <SelectContent>
                          {lotesConStock
                             .filter((l) => !items.some((it, i) => i !== index && it.loteId === l.id))
                             .map((l) => (
                            <SelectItem key={l.id} value={l.id}>
                               {isDobleCrema(l.producto)
                                 ? `${tipoProductoLabel[l.producto as TipoProducto] ?? l.producto} — ${proveedorMap.get(l.proveedorId) ?? 'Sin proveedor'} — ${formatDobleCremaDetalle(l.bloquesEnteros, l.bloquesTajadosDisponibles, Number(l.sueltosEntero), Number(l.sueltosTajado))} (${Number(l.stockDisponibleKg).toLocaleString('es-AR')} kg)`
                                 : `${tipoProductoLabel[l.producto as TipoProducto] ?? l.producto} — ${proveedorMap.get(l.proveedorId) ?? 'Sin proveedor'} — ${Number(l.stockDisponibleKg).toLocaleString('es-AR')} kg disp.`
                               }
                            </SelectItem>
                         ))}
                       </SelectContent>
                    </Select>
                  </div>

                   {/* Tipo de Venta — show for all DC lots */}
                   {isDC && lote && (
                     <div className="space-y-2">
                       <Label>Tipo de Venta</Label>
                       <div className="flex gap-2">
                         <Button
                           type="button"
                           variant={item.ventaTipo === 'BLOQUES' ? 'default' : 'outline'}
                           size="sm"
                           onClick={() => {
                             const hasEntero = lote.bloquesEnteros > 0;
                              updateItem(index, { ventaTipo: 'BLOQUES', bloquesEnteros: '', bloquesTajados: '', bloquesTajadosDeFabrica: '', bloquesTajadosInternos: '', cantidadKg: '', cantidadKgEntero: '', cantidadKgTajado: '', precioVentaKg: '', precioVentaKgEntero: '', precioVentaKgTajado: '', origenCorte: hasEntero ? 'ENTERO' : 'TAJADO' });
                           }}
                         >
                           Por Bloques
                         </Button>
                         <Button
                           type="button"
                           variant={item.ventaTipo === 'GRANEL' ? 'default' : 'outline'}
                           size="sm"
                           onClick={() => {
                             const hasEntero = lote.bloquesEnteros > 0 || Number(lote.sueltosEntero) > 0;
                             const hasTajado = lote.bloquesTajados > 0 || lote.bloquesTajadosDeFabrica > 0 || Number(lote.sueltosTajado) > 0;
                              updateItem(index, { ventaTipo: 'GRANEL', bloquesEnteros: '', bloquesTajados: '', bloquesTajadosDeFabrica: '', bloquesTajadosInternos: '', cantidadKg: '', cantidadKgEntero: '', cantidadKgTajado: '', precioVentaKg: '', precioVentaKgEntero: '', precioVentaKgTajado: '', origenCorte: !hasEntero && hasTajado ? 'TAJADO' : 'ENTERO' });
                           }}
                         >
                           Al Granel (Kg)
                         </Button>
                       </div>
                     </div>
                   )}

                  {/* Block mode: enteros + tajados inputs */}
                  {isBlockMode && lote && (
                    <>
                      <div className="rounded-lg bg-muted/50 p-3 space-y-1">
                         <p className="text-sm font-medium">Stock del lote</p>
                         <p className="text-xs text-muted-foreground">
                           {formatDobleCremaDetalle(lote.bloquesEnteros, lote.bloquesTajadosDisponibles, Number(lote.sueltosEntero), Number(lote.sueltosTajado))} — Total: {Number(lote.stockDisponibleKg).toLocaleString('es-AR')} kg
                         </p>
                       </div>
                      <div className={`grid gap-3 ${
                        lote.bloquesTajados > 0 && lote.bloquesTajadosDeFabrica > 0
                          ? 'grid-cols-3'
                          : lote.bloquesTajados > 0 || lote.bloquesTajadosDeFabrica > 0
                            ? 'grid-cols-2'
                            : 'grid-cols-1'
                      }`}>
                        {lote.bloquesEnteros > 0 && (
                          <div className="space-y-2">
                            <Label>Bloques Enteros</Label>
                            <Input
                              type="number"
                              step="1"
                              min="0"
                              max={String(lote.bloquesEnteros)}
                              placeholder="0"
                              value={item.bloquesEnteros}
                              onChange={(e) => updateItem(index, { bloquesEnteros: e.target.value })}
                            />
                            <p className="text-xs text-muted-foreground">Disponibles: {lote.bloquesEnteros}</p>
                          </div>
                        )}
                        {lote.bloquesTajadosDeFabrica > 0 && (
                          <div className="space-y-2">
                            <Label>Tajados de fábrica</Label>
                            <Input
                              type="number"
                              step="1"
                              min="0"
                              max={String(lote.bloquesTajadosDeFabrica)}
                              placeholder="0"
                              value={item.bloquesTajadosDeFabrica}
                              onChange={(e) => {
                                const fabrica = parseInt(e.target.value) || 0;
                                const internos = parseInt(item.bloquesTajadosInternos) || 0;
                                const total = fabrica + internos;
                                updateItem(index, {
                                  bloquesTajadosDeFabrica: e.target.value,
                                  bloquesTajados: total > 0 ? String(total) : '',
                                });
                              }}
                            />
                            <p className="text-xs text-muted-foreground">Disp.: {lote.bloquesTajadosDeFabrica}</p>
                          </div>
                        )}
                        {lote.bloquesTajados > 0 && (
                          <div className="space-y-2">
                            <Label>Tajados internos</Label>
                            <Input
                              type="number"
                              step="1"
                              min="0"
                              max={String(lote.bloquesTajados)}
                              placeholder="0"
                              value={item.bloquesTajadosInternos}
                              onChange={(e) => {
                                const internos = parseInt(e.target.value) || 0;
                                const fabrica = parseInt(item.bloquesTajadosDeFabrica) || 0;
                                const total = fabrica + internos;
                                updateItem(index, {
                                  bloquesTajadosInternos: e.target.value,
                                  bloquesTajados: total > 0 ? String(total) : '',
                                });
                              }}
                            />
                            <p className="text-xs text-muted-foreground">Disp.: {lote.bloquesTajados}</p>
                          </div>
                        )}
                      </div>
                      {lote.bloquesEnteros === 0 && lote.bloquesTajados === 0 && lote.bloquesTajadosDeFabrica === 0 && (
                        <p className="text-sm text-muted-foreground italic">Este lote no tiene bloques enteros ni tajados disponibles.</p>
                      )}
                      {(parseInt(item.bloquesEnteros) || 0) + (parseInt(item.bloquesTajados) || 0) > 0 && (
                        <p className="text-xs text-muted-foreground">
                          Total: {(parseInt(item.bloquesEnteros) || 0) + (parseInt(item.bloquesTajados) || 0)} bloques = {Number(getCantidadKg(item)).toLocaleString('es-AR')} kg
                        </p>
                      )}
                      <div className="space-y-2">
                        <Label>Bloques Reempacados</Label>
                        <Input
                          type="number"
                          step="1"
                          min="0"
                          max={String((parseInt(item.bloquesEnteros) || 0) + (parseInt(item.bloquesTajados) || 0) || '0')}
                          placeholder="0"
                          value={item.bloquesReempacados}
                          onChange={(e) => updateItem(index, { bloquesReempacados: e.target.value })}
                        />
                        <p className="text-xs text-muted-foreground">
                          Cada bloque reempacado descuenta 1 insumo del inventario
                        </p>
                      </div>
                    </>
                  )}

                  {/* Granel mode: kg input */}
                  {!isBlockMode && (() => {
                    if (!isDC || !lote) {
                      // Non-DC or no lote selected: simple kg input
                      return (
                        <div className="space-y-2">
                          <Label>Cantidad (Kg)</Label>
                          <Input
                            type="number"
                            step="0.01"
                            min="0.01"
                            placeholder="0"
                            value={item.cantidadKg}
                            onChange={(e) => updateItem(index, { cantidadKg: e.target.value })}
                          />
                          {lote && (
                            <p className="text-xs text-muted-foreground">
                              Stock disponible: {Number(lote.stockDisponibleKg).toLocaleString('es-AR')} kg
                            </p>
                          )}
                        </div>
                      );
                    }

                    // DC GRANEL: determine which varieties have stock
                    const hasEnteroStock = lote.bloquesEnteros > 0 || Number(lote.sueltosEntero) > 0;
                    const hasTajadoStock = lote.bloquesTajados > 0 || lote.bloquesTajadosDeFabrica > 0 || Number(lote.sueltosTajado) > 0;
                    const stockEnteroKg = lote.bloquesEnteros * DOBLE_CREMA_BLOCK_KG + Number(lote.sueltosEntero);
                    const stockTajadoKg = (lote.bloquesTajados + lote.bloquesTajadosDeFabrica) * DOBLE_CREMA_BLOCK_KG + Number(lote.sueltosTajado);
                    const showDualVariety = hasEnteroStock && hasTajadoStock;
                    const kgEntero = Number(item.cantidadKgEntero) || 0;
                    const kgTajado = Number(item.cantidadKgTajado) || 0;

                    if (showDualVariety) {
                      // BOTH varieties have stock: show two kg fields
                      return (
                        <div className="space-y-3">
                          <div className="rounded-lg bg-muted/50 p-2">
                            <p className="text-xs text-muted-foreground">
                              Stock entero: {stockEnteroKg.toLocaleString('es-AR')} kg — Stock tajado: {stockTajadoKg.toLocaleString('es-AR')} kg
                            </p>
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-2">
                              <Label>Kg Enteros</Label>
                              <Input
                                type="number"
                                step="0.01"
                                min="0"
                                placeholder="0"
                                value={item.cantidadKgEntero}
                                onChange={(e) => updateItem(index, { cantidadKgEntero: e.target.value, cantidadKg: '' })}
                              />
                              <p className="text-xs text-muted-foreground">Stock: {stockEnteroKg.toLocaleString('es-AR')} kg</p>
                            </div>
                            <div className="space-y-2">
                              <Label>Kg Tajados</Label>
                              <Input
                                type="number"
                                step="0.01"
                                min="0"
                                placeholder="0"
                                value={item.cantidadKgTajado}
                                onChange={(e) => updateItem(index, { cantidadKgTajado: e.target.value, cantidadKg: '' })}
                              />
                              <p className="text-xs text-muted-foreground">Stock: {stockTajadoKg.toLocaleString('es-AR')} kg</p>
                            </div>
                          </div>
                          {(kgEntero + kgTajado > 0) && (
                            <p className="text-xs text-muted-foreground">
                              Total: {(kgEntero + kgTajado).toLocaleString('es-AR')} kg
                            </p>
                          )}
                          {/* Tipo de tajado — only when tajado kg is filled */}
                          {kgTajado > 0 && (() => {
                            const hasInternos = lote.bloquesTajados > 0;
                            const hasFabrica = lote.bloquesTajadosDeFabrica > 0;
                            const both = hasInternos && hasFabrica;
                            const autoOrigen = !hasInternos && hasFabrica ? 'FABRICA' : 'INTERNO';
                            if (item.origenTajadoGranel !== autoOrigen && !both) {
                              updateItem(index, { origenTajadoGranel: autoOrigen });
                            }
                            return both ? (
                              <div className="space-y-2">
                                <Label>Tipo de tajado</Label>
                                <Select
                                  value={item.origenTajadoGranel || 'INTERNO'}
                                  onValueChange={(v) => updateItem(index, { origenTajadoGranel: v ?? 'INTERNO' })}
                                >
                                  <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Seleccione tipo">
                                      {item.origenTajadoGranel === 'FABRICA' ? 'Tajado de Fábrica (TF)' : 'Tajado Interno (TI)'}
                                    </SelectValue>
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="INTERNO">Tajado Interno (TI) — {lote.bloquesTajados} bloques</SelectItem>
                                    <SelectItem value="FABRICA">Tajado de Fábrica (TF) — {lote.bloquesTajadosDeFabrica} bloques</SelectItem>
                                  </SelectContent>
                                </Select>
                                <p className="text-xs text-muted-foreground">
                                  {item.origenTajadoGranel === 'FABRICA'
                                    ? 'Se descontarán bloques de tajados de fábrica. Costo por kg incluye precio de compra de fábrica.'
                                    : 'Se descontarán bloques de tajados internos. Costo por kg incluye separadores y mano de obra.'}
                                </p>
                              </div>
                            ) : (
                              <p className="text-xs text-muted-foreground">
                                Origen: {autoOrigen === 'FABRICA' ? 'Tajado de Fábrica (TF)' : 'Tajado Interno (TI)'}
                              </p>
                            );
                          })()}
                        </div>
                      );
                    }

                    // Only ONE variety has stock: show single kg field
                    if (hasEnteroStock && !hasTajadoStock) {
                      // Only enteros: single field, auto-set origenCorte to ENTERO
                      if (item.origenCorte !== 'ENTERO') {
                        updateItem(index, { origenCorte: 'ENTERO' });
                      }
                      return (
                        <div className="space-y-2">
                          <Label>Cantidad (Kg Enteros)</Label>
                          <Input
                            type="number"
                            step="0.01"
                            min="0.01"
                            placeholder="0"
                            value={item.cantidadKgEntero || item.cantidadKg}
                            onChange={(e) => updateItem(index, { cantidadKgEntero: e.target.value, cantidadKg: e.target.value, cantidadKgTajado: '', origenCorte: 'ENTERO' })}
                          />
                          <p className="text-xs text-muted-foreground">
                            Stock entero: {stockEnteroKg.toLocaleString('es-AR')} kg — Solo quedan enteros disponibles.
                          </p>
                        </div>
                      );
                    }

                    if (!hasEnteroStock && hasTajadoStock) {
                      // Only tajados: single field, auto-set origenCorte to TAJADO
                      if (item.origenCorte !== 'TAJADO') {
                        updateItem(index, { origenCorte: 'TAJADO' });
                      }
                      const hasInternos = lote.bloquesTajados > 0;
                      const hasFabrica = lote.bloquesTajadosDeFabrica > 0;
                      const both = hasInternos && hasFabrica;
                      const autoOrigen = !hasInternos && hasFabrica ? 'FABRICA' : 'INTERNO';
                      if (item.origenTajadoGranel !== autoOrigen && !both) {
                        updateItem(index, { origenTajadoGranel: autoOrigen });
                      }
                      return (
                        <div className="space-y-2">
                          <Label>Cantidad (Kg Tajados)</Label>
                          <Input
                            type="number"
                            step="0.01"
                            min="0.01"
                            placeholder="0"
                            value={item.cantidadKgTajado || item.cantidadKg}
                            onChange={(e) => updateItem(index, { cantidadKgTajado: e.target.value, cantidadKg: e.target.value, cantidadKgEntero: '', origenCorte: 'TAJADO' })}
                          />
                          <p className="text-xs text-muted-foreground">
                            Stock tajado: {stockTajadoKg.toLocaleString('es-AR')} kg — Solo quedan tajados disponibles.
                          </p>
                          {/* Tipo de tajado — show if both TI & TF available */}
                          {both ? (
                            <div className="space-y-2">
                              <Label>Tipo de tajado</Label>
                              <Select
                                value={item.origenTajadoGranel || 'INTERNO'}
                                onValueChange={(v) => updateItem(index, { origenTajadoGranel: v ?? 'INTERNO' })}
                              >
                                <SelectTrigger className="w-full">
                                  <SelectValue placeholder="Seleccione tipo">
                                    {item.origenTajadoGranel === 'FABRICA' ? 'Tajado de Fábrica (TF)' : 'Tajado Interno (TI)'}
                                  </SelectValue>
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="INTERNO">Tajado Interno (TI) — {lote.bloquesTajados} bloques</SelectItem>
                                  <SelectItem value="FABRICA">Tajado de Fábrica (TF) — {lote.bloquesTajadosDeFabrica} bloques</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          ) : (
                            <p className="text-xs text-muted-foreground">
                              Origen: {autoOrigen === 'FABRICA' ? 'Tajado de Fábrica (TF)' : 'Tajado Interno (TI)'}
                            </p>
                          )}
                        </div>
                      );
                    }

                    // Fallback: neither variety has stock (shouldn't happen with valid lote)
                    return (
                      <div className="space-y-2">
                        <Label>Cantidad (Kg)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          min="0.01"
                          placeholder="0"
                          value={item.cantidadKg}
                          onChange={(e) => updateItem(index, { cantidadKg: e.target.value })}
                        />
                        <p className="text-xs text-muted-foreground text-destructive">No hay stock disponible.</p>
                      </div>
                    );
                  })()}

                    {/* Precio */}
                   {isBlockMode && isDC ? (
                     <div className="space-y-2">
                       <Label>Precio por Bloque</Label>
                       <div className="space-y-2">
                         {(!lote || lote.bloquesEnteros > 0) && (
                           <div className="space-y-1">
                             <Label htmlFor={`precioEntero-${index}`} className="text-xs text-muted-foreground">Entero ($/bloque)</Label>
                             <Input
                               id={`precioEntero-${index}`}
                               type="number"
                               step="0.01"
                               min="0"
                               placeholder="0.00"
                               value={item.precioEnteroBloque}
                               onChange={(e) => updateItem(index, { precioEnteroBloque: e.target.value })}
                             />
                           </div>
                         )}
                         {(!lote || lote.bloquesTajados > 0 || lote.bloquesTajadosDeFabrica > 0) && (
                           <div className="space-y-1">
                             <Label htmlFor={`precioTajado-${index}`} className="text-xs text-muted-foreground">Tajado ($/bloque)</Label>
                             <Input
                               id={`precioTajado-${index}`}
                               type="number"
                               step="0.01"
                               min="0"
                               placeholder="Igual al entero si vacío"
                               value={item.precioTajadoBloque}
                               onChange={(e) => updateItem(index, { precioTajadoBloque: e.target.value })}
                             />
                           </div>
                         )}
                       </div>
                     </div>
                    ) : !isBlockMode && isDC && lote && lote.bloquesEnteros > 0 && (lote.bloquesTajados > 0 || lote.bloquesTajadosDeFabrica > 0 || Number(lote.sueltosTajado) > 0) && (Number(lote.sueltosEntero) > 0 || lote.bloquesEnteros > 0) && (lote.bloquesTajados > 0 || lote.bloquesTajadosDeFabrica > 0 || Number(lote.sueltosTajado) > 0) ? (
                      /* DC GRANEL dual-variety price: both varieties have stock */
                      <div className="space-y-2">
                        <Label>Precio por Variedad ($/Kg)</Label>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <Label htmlFor={`precioKgEntero-${index}`} className="text-xs text-muted-foreground">Entero ($/kg)</Label>
                            <Input
                              id={`precioKgEntero-${index}`}
                              type="number"
                              step="0.01"
                              min="0"
                              placeholder="0.00"
                              value={item.precioVentaKgEntero}
                              onChange={(e) => updateItem(index, { precioVentaKgEntero: e.target.value })}
                            />
                            {prices.entero !== null && (
                              <p className="text-xs text-muted-foreground">
                                Sugerido: ${Math.round(prices.entero).toLocaleString('es-AR')}/kg
                              </p>
                            )}
                          </div>
                          <div className="space-y-1">
                            <Label htmlFor={`precioKgTajado-${index}`} className="text-xs text-muted-foreground">Tajado ($/kg)</Label>
                            <Input
                              id={`precioKgTajado-${index}`}
                              type="number"
                              step="0.01"
                              min="0"
                              placeholder="0.00"
                              value={item.precioVentaKgTajado}
                              onChange={(e) => updateItem(index, { precioVentaKgTajado: e.target.value })}
                            />
                            {prices.tajado !== null && (
                              <p className="text-xs text-muted-foreground">
                                Sugerido: ${Math.round(prices.tajado).toLocaleString('es-AR')}/kg
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ) : !isBlockMode && isDC && lote && (lote.bloquesEnteros > 0 || Number(lote.sueltosEntero) > 0) && !(lote.bloquesTajados > 0 || lote.bloquesTajadosDeFabrica > 0 || Number(lote.sueltosTajado) > 0) ? (
                      /* DC GRANEL entero-only: single price field */
                      <div className="space-y-2">
                        <Label>Precio Entero ($/Kg)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="0.00"
                          value={item.precioVentaKgEntero || item.precioVentaKg}
                          onChange={(e) => updateItem(index, { precioVentaKgEntero: e.target.value, precioVentaKg: e.target.value })}
                        />
                        {prices.entero !== null && (
                          <p className="text-xs text-muted-foreground">
                            Precio sugerido: ${Math.round(prices.entero).toLocaleString('es-AR')}/kg
                          </p>
                        )}
                      </div>
                    ) : !isBlockMode && isDC && lote && !(lote.bloquesEnteros > 0 || Number(lote.sueltosEntero) > 0) && (lote.bloquesTajados > 0 || lote.bloquesTajadosDeFabrica > 0 || Number(lote.sueltosTajado) > 0) ? (
                      /* DC GRANEL tajado-only: single price field */
                      <div className="space-y-2">
                        <Label>Precio Tajado ($/Kg)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="0.00"
                          value={item.precioVentaKgTajado || item.precioVentaKg}
                          onChange={(e) => updateItem(index, { precioVentaKgTajado: e.target.value, precioVentaKg: e.target.value })}
                        />
                        {(prices.tajado ?? prices.entero) !== null && (
                          <p className="text-xs text-muted-foreground">
                            Precio sugerido: ${Math.round(prices.tajado ?? prices.entero!).toLocaleString('es-AR')}/kg
                          </p>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <Label>Precio de Venta ($/Kg)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="0.00"
                          value={item.precioVentaKg}
                          onChange={(e) => updateItem(index, { precioVentaKg: e.target.value })}
                        />
                        {prices.entero !== null && (
                          <p className="text-xs text-muted-foreground">
                            Precio sugerido: ${Math.round(prices.entero).toLocaleString('es-AR')}/kg
                          </p>
                        )}
                      </div>
                    )}
                </div>
              );
            })}
          </div>

          {/* Mobile summary — appears below items, above domicilio fields */}
          <div className="lg:hidden">
            <Card className="bg-muted/50">
              <CardContent className="space-y-2">
                 <p className="font-medium text-sm">Resumen de Venta</p>
                 <div className="text-xs space-y-1">
                   <div className="flex justify-between"><span className="text-muted-foreground">Items</span><span>{realtimeSummary.itemCount}</span></div>
                 </div>
                 {realtimeSummary.breakdownItems.length > 0 && (
                   <div className="text-xs space-y-1">
                     {realtimeSummary.breakdownItems.map((bi, i) => (
                       <div key={i} className="flex justify-between">
                         <span className="text-muted-foreground">{bi.name}</span>
                         <span className="font-medium">{bi.quantity}</span>
                       </div>
                     ))}
                   </div>
                 )}
                <div className="border-t my-1" />
                <div className="text-xs space-y-1">
                  <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{formatCurrency(realtimeSummary.subtotalProductos)}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Domicilio</span><span>{formatCurrency(realtimeSummary.valorDomicilio)}</span></div>
                </div>
                <div className="border-t my-1" />
                <div className="flex justify-between items-baseline">
                  <span className="font-bold text-sm">Total</span>
                  <span className="font-bold text-lg text-green-600 dark:text-green-400">{formatCurrency(realtimeSummary.totalGeneral)}</span>
                </div>
                {realtimeSummary.hasZeroPrice && (
                  <div className="flex items-start gap-1.5 text-orange-600 dark:text-orange-400 text-xs mt-1">
                    <AlertTriangleIcon className="size-3.5 shrink-0 mt-0.5" />
                    <span>Hay productos con precio en $0</span>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Domicilio */}
          <div className="space-y-2">
            <Label htmlFor="valorDomicilio">Valor Domicilio ($)</Label>
            <Input
              id="valorDomicilio"
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00 (opcional)"
              value={valorDomicilio}
              onChange={(e) => setValorDomicilio(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="costoDomiciliario">Costo Domiciliario ($)</Label>
            <Input
              id="costoDomiciliario"
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00 (lo que se le paga al domiciliario)"
              value={costoDomiciliario}
              onChange={(e) => setCostoDomiciliario(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="domiciliario">Domiciliario</Label>
            <Input
              id="domiciliario"
              placeholder="Nombre del domiciliario (opcional)"
              value={domiciliario}
              onChange={(e) => setDomiciliario(e.target.value)}
            />
          </div>

          {/* Método de Pago */}
          <div className="space-y-2">
            <Label>Método de Pago</Label>
            <div className="flex flex-wrap gap-2">
              {[
                { value: 'EFECTIVO', label: 'Efectivo', color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' },
                { value: 'NEQUI', label: 'Nequi', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' },
                { value: 'BRE_B', label: 'Bre-B', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' },
                { value: 'CREDITO', label: 'Crédito (Fiado)', color: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200' },
              ].map((option) => (
                <Button
                  key={option.value}
                  type="button"
                  variant={metodoPago === option.value ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => {
                    setMetodoPago(option.value);
                    if (option.value !== 'CREDITO') {
                      setAbono('');
                      setMetodoPagoAbono('');
                    }
                  }}
                >
                  {option.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Abono — only shown when metodoPago is CREDITO */}
          {metodoPago === 'CREDITO' && (
            <div className="space-y-2">
              <Label htmlFor="abono">Abono ($)</Label>
              <Input
                id="abono"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={abono}
                onChange={(e) => {
                  setAbono(e.target.value);
                  if (!e.target.value || Number(e.target.value) <= 0) {
                    setMetodoPagoAbono('');
                  }
                }}
              />
              <p className="text-xs text-muted-foreground">
                Deje vacío para abono $0. El saldo pendiente se calcula automáticamente.
              </p>
            </div>
          )}

          {/* Método de pago del Abono — only shown when metodoPago is CREDITO and abono > 0 */}
          {metodoPago === 'CREDITO' && abono && Number(abono) > 0 && (
            <div className="space-y-2">
              <Label>Método de pago del Abono</Label>
              <div className="flex flex-wrap gap-2">
                {METODOS_PAGO_ABONO.map((mpa) => (
                  <Button
                    key={mpa}
                    type="button"
                    variant={metodoPagoAbono === mpa ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setMetodoPagoAbono(mpa)}
                  >
                    {metodoPagoLabel[mpa]}
                  </Button>
                ))}
              </div>
              {!metodoPagoAbono && (
                <p className="text-xs text-destructive">Seleccione un método de pago para el abono</p>
              )}
            </div>
          )}

          {/* Observaciones */}
          <div className="space-y-2">
            <Label htmlFor="observaciones">Observaciones</Label>
            <Textarea
              id="observaciones"
              placeholder="Notas adicionales..."
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => { setOpen(false); resetForm(); }}>
              Cancelar
            </Button>
            <Button type="button" onClick={handleGoToSummary}>
              Revisar
            </Button>
          </div>
        </div>

        {/* Desktop summary panel — sticky sidebar */}
        <div className="hidden lg:block">
          <div className="sticky top-4">
            <Card className="bg-muted/50">
              <CardContent className="space-y-3 pt-(--card-spacing)">
                 <p className="font-medium">Resumen de Venta</p>
                 <div className="text-sm space-y-1.5">
                   <div className="flex justify-between"><span className="text-muted-foreground">Items</span><span className="font-medium">{realtimeSummary.itemCount}</span></div>
                 </div>
                 {realtimeSummary.breakdownItems.length > 0 && (
                   <div className="text-sm space-y-1.5">
                     {realtimeSummary.breakdownItems.map((bi, i) => (
                       <div key={i} className="flex justify-between">
                         <span className="text-muted-foreground">{bi.name}</span>
                         <span className="font-medium">{bi.quantity}</span>
                       </div>
                     ))}
                   </div>
                 )}
                <div className="border-t" />
                <div className="text-sm space-y-1.5">
                  <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{formatCurrency(realtimeSummary.subtotalProductos)}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Domicilio</span><span>{formatCurrency(realtimeSummary.valorDomicilio)}</span></div>
                </div>
                <div className="border-t" />
                <div className="flex justify-between items-baseline">
                  <span className="font-bold">Total</span>
                  <span className="font-bold text-xl text-green-600 dark:text-green-400">{formatCurrency(realtimeSummary.totalGeneral)}</span>
                </div>
                {realtimeSummary.hasZeroPrice && (
                  <div className="flex items-start gap-1.5 text-orange-600 dark:text-orange-400 text-sm mt-1">
                    <AlertTriangleIcon className="size-4 shrink-0 mt-0.5" />
                    <span>Hay productos con precio en $0</span>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
        </div>
        ) : (
          // === SUMMARY STEP ===
          <SummaryStep
             summary={computeSummary()}
             clienteLabel={clienteLabels.get(clienteId) ?? '—'}
              domiciliario={domiciliario}
              valorDomicilio={valorDomicilio}
              costoDomiciliario={costoDomiciliario}
              metodoPago={metodoPago}
              metodoPagoAbono={metodoPagoAbono}
              abono={abono}
              observaciones={observaciones}
              proveedorMap={proveedorMap}
              onBack={() => setStep('form')}
              onConfirm={handleSubmit}
              submitting={submitting}
              isEditMode={isEditMode}
            />
        )}
      </DialogContent>
      {selectedCliente && (
        <EditarClienteDialog
          cliente={selectedCliente}
          open={editClienteOpen}
          onOpenChange={(open) => {
            setEditClienteOpen(open);
            if (!open) refreshData();
          }}
        />
      )}
    </Dialog>
  );
}