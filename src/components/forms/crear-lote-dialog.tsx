'use client';

import { useState, useMemo } from 'react';
import { useRefresh } from '@/components/refresh-context';
import { crearLotes } from '@/presentation/actions/lotes';
import { toast } from 'sonner';
import { TipoProducto, EstadoPagoLote, MetodoPago } from '@/domain/enums';
import { tipoProductoLabel, metodoPagoLabel } from '@/domain/labels';
import { DOBLE_CREMA_BLOCK_KG, isDobleCrema } from '@/domain/constants';
import type { ProveedorResponse } from '@/presentation/dtos';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PlusIcon, Trash2Icon } from 'lucide-react';

interface CrearLoteDialogProps {
  proveedores: ProveedorResponse[];
}

interface LoteItem {
  id: string;
  producto: string;
  // SS fields
  cantidadCompradaKg: string;
  precioCompraBaseKg: string;
  // DC fields
  bloquesEnteros: string;
  bloquesTajadosDeFabrica: string;
  precioPorBloqueEntero: string;
  precioPorBloqueTajado: string;
}

function createEmptyItem(): LoteItem {
  return {
    id: crypto.randomUUID(),
    producto: '',
    cantidadCompradaKg: '',
    precioCompraBaseKg: '',
    bloquesEnteros: '',
    bloquesTajadosDeFabrica: '',
    precioPorBloqueEntero: '',
    precioPorBloqueTajado: '',
  };
}

/** Calculate weight in kg for a single item */
function calcItemWeightKg(item: LoteItem): number {
  if (isDobleCrema(item.producto)) {
    const enteros = parseInt(item.bloquesEnteros) || 0;
    const tajados = parseInt(item.bloquesTajadosDeFabrica) || 0;
    return (enteros + tajados) * DOBLE_CREMA_BLOCK_KG;
  }
  return parseFloat(item.cantidadCompradaKg) || 0;
}

/** Calculate cost preview for a DC item */
function calcDCPreview(item: LoteItem, proratedFlete: number) {
  const enteros = parseInt(item.bloquesEnteros) || 0;
  const tajados = parseInt(item.bloquesTajadosDeFabrica) || 0;
  const totalBloques = enteros + tajados;
  const precioEntero = parseFloat(item.precioPorBloqueEntero) || 0;
  const precioTajado = parseFloat(item.precioPorBloqueTajado) || precioEntero;
  const cantidadKg = totalBloques * DOBLE_CREMA_BLOCK_KG;

  if (totalBloques === 0 || precioEntero === 0) return null;

  const fletePorBloque = proratedFlete / totalBloques;
  const costoEnteroPorBloque = precioEntero + fletePorBloque;
  const costoRealCalculadoKg = costoEnteroPorBloque / DOBLE_CREMA_BLOCK_KG;
  const costoRealPorBloqueEntero = costoRealCalculadoKg * DOBLE_CREMA_BLOCK_KG;
  const costoMercancia = enteros * precioEntero + tajados * precioTajado;

  let costoRealCalculadoTajadoFabricaKg: number | null = null;
  let costoRealPorBloqueTajado: number | null = null;
  if (tajados > 0 && precioTajado > 0) {
    const costoTajadoPorBloque = precioTajado + fletePorBloque;
    costoRealCalculadoTajadoFabricaKg = costoTajadoPorBloque / DOBLE_CREMA_BLOCK_KG;
    costoRealPorBloqueTajado = costoRealCalculadoTajadoFabricaKg * DOBLE_CREMA_BLOCK_KG;
  }

  const showTajadoPrice = precioTajado > 0 && precioTajado !== precioEntero && tajados > 0;

  return {
    costoRealCalculadoKg,
    costoRealPorBloqueEntero,
    costoRealCalculadoTajadoFabricaKg,
    costoRealPorBloqueTajado,
    showTajadoPrice,
    costoMercancia,
    inversionTotal: costoMercancia + proratedFlete,
  };
}

/** Calculate cost preview for an SS item */
function calcSSPreview(item: LoteItem, proratedFlete: number) {
  const cantidadKg = parseFloat(item.cantidadCompradaKg) || 0;
  const precioBase = parseFloat(item.precioCompraBaseKg) || 0;
  if (cantidadKg <= 0 || precioBase <= 0) return null;

  const costoMercancia = precioBase * cantidadKg;
  const costoRealCalculadoKg = (costoMercancia + proratedFlete) / cantidadKg;

  return {
    costoRealCalculadoKg,
    costoMercancia,
    inversionTotal: costoMercancia + proratedFlete,
  };
}

export function CrearLoteDialog({ proveedores }: CrearLoteDialogProps) {
  const refreshData = useRefresh();
  const [open, setOpen] = useState(false);
  const [proveedorId, setProveedorId] = useState<string>('');
  const [costoFlete, setCostoFlete] = useState<string>('');
  const [estadoPago, setEstadoPago] = useState<string>(EstadoPagoLote.PENDIENTE);
  const [metodoPagoLote, setMetodoPagoLote] = useState<string>(MetodoPago.EFECTIVO);
  const [items, setItems] = useState<LoteItem[]>([createEmptyItem()]);
  const [submitting, setSubmitting] = useState(false);

  // Only show active proveedores in the dropdown
  const activeProveedores = useMemo(() => proveedores.filter((p) => !p.deletedAt), [proveedores]);

  // Map proveedor IDs to names for Select display
  const proveedorLabels = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of activeProveedores) {
      map.set(p.id, p.nombre);
    }
    return map;
  }, [proveedores]);

  // Flete prorration: calculate total weight and prorated flete per item
  const costoFleteNum = parseFloat(costoFlete) || 0;
  const totalWeightKg = useMemo(() => items.reduce((sum, item) => sum + calcItemWeightKg(item), 0), [items]);

  const proratedFletes = useMemo(() => {
    return items.map((item) => {
      const weight = calcItemWeightKg(item);
      if (totalWeightKg === 0) return 0;
      return (weight / totalWeightKg) * costoFleteNum;
    });
  }, [items, totalWeightKg, costoFleteNum]);

  function updateItem(id: string, updates: Partial<LoteItem>) {
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, ...updates } : item)));
  }

  function addItem() {
    setItems((prev) => [...prev, createEmptyItem()]);
  }

  function removeItem(id: string) {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((item) => item.id !== id));
  }

  function resetForm() {
    setProveedorId('');
    setCostoFlete('');
    setEstadoPago(EstadoPagoLote.PENDIENTE);
    setMetodoPagoLote(MetodoPago.EFECTIVO);
    setItems([createEmptyItem()]);
  }

  async function handleSubmit() {
    // Validate all items have a product type
    const hasEmptyProduct = items.some((item) => !item.producto);
    if (hasEmptyProduct) {
      toast.error('Todos los productos deben tener un tipo seleccionado');
      return;
    }
    if (!proveedorId) {
      toast.error('Seleccione un proveedor');
      return;
    }

    // Validate DC items: if tajados de fábrica > 0, precio tajado is required
    for (const item of items) {
      if (isDobleCrema(item.producto)) {
        const enteros = parseInt(item.bloquesEnteros) || 0;
        const tajados = parseInt(item.bloquesTajadosDeFabrica) || 0;
        if (enteros + tajados === 0) {
          toast.error('Doble Crema: ingrese al menos un bloque');
          return;
        }
        if (enteros > 0 && !(parseFloat(item.precioPorBloqueEntero) > 0)) {
          toast.error('Doble Crema: si hay bloques enteros, el precio por bloque entero es obligatorio');
          return;
        }
        if (tajados > 0 && !(parseFloat(item.precioPorBloqueTajado) > 0)) {
          toast.error('Doble Crema: si hay tajados de fábrica, el precio por bloque tajado es obligatorio');
          return;
        }
      } else if (item.producto === TipoProducto.SEMISALADO) {
        if (!(parseFloat(item.cantidadCompradaKg) > 0)) {
          toast.error('Semisalado: la cantidad debe ser mayor a 0');
          return;
        }
        if (!(parseFloat(item.precioCompraBaseKg) > 0)) {
          toast.error('Semisalado: el precio base por kg es obligatorio');
          return;
        }
      }
    }

    setSubmitting(true);
    try {
      const payload = {
        proveedorId,
        costoFlete,
        estadoPago,
        metodoPagoLote,
        items: items.map((item) => ({
          producto: item.producto,
          ...(isDobleCrema(item.producto)
            ? {
                bloquesEnteros: parseInt(item.bloquesEnteros) || 0,
                bloquesTajadosDeFabrica: parseInt(item.bloquesTajadosDeFabrica) || 0,
                precioPorBloqueEntero: item.precioPorBloqueEntero,
                precioPorBloqueTajado: item.precioPorBloqueTajado || undefined,
                precioCompraBaseKg: '0', // Derived from bloque price in use case
                cantidadCompradaKg: '0', // Calculated by use case
              }
            : {
                cantidadCompradaKg: item.cantidadCompradaKg,
                precioCompraBaseKg: item.precioCompraBaseKg,
              }),
          costoFlete: '0', // Will be replaced by prorated value in action
        })),
      };

      const result = await crearLotes(payload);
      if (result.success) {
        toast.success(`${result.lotes!.length} lote(s) creado(s) exitosamente`);
        refreshData();
        setOpen(false);
        resetForm();
      } else {
        toast.error(result.error || 'Error al crear lotes');
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" size="sm" />}>
        <PlusIcon className="size-4" />
        Agregar Lote
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nuevo Lote</DialogTitle>
          <DialogDescription>
            Complete los datos para registrar uno o más lotes de queso.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {/* Global fields */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Proveedor</Label>
              <Select value={proveedorId} onValueChange={(v) => v !== null && setProveedorId(v)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Seleccione proveedor">{proveedorId ? (proveedorLabels.get(proveedorId) ?? proveedorId) : 'Seleccione proveedor'}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {activeProveedores.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="costoFlete">Costo Flete ($) <span className="text-muted-foreground font-normal">(opcional)</span></Label>
              <Input
                id="costoFlete"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={costoFlete}
                onChange={(e) => setCostoFlete(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="estadoPago">Estado de pago</Label>
            <Select value={estadoPago} onValueChange={(v) => { if (v) { setEstadoPago(v); if (v !== 'PAGADO') setMetodoPagoLote(MetodoPago.EFECTIVO); } }}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Seleccione estado de pago">{estadoPago === EstadoPagoLote.PAGADO ? 'Pagado' : 'Pendiente'}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={EstadoPagoLote.PENDIENTE}>Pendiente</SelectItem>
                <SelectItem value={EstadoPagoLote.PAGADO}>Pagado</SelectItem>
              </SelectContent>
            </Select>
            {estadoPago === 'PAGADO' && (
              <>
                <Label htmlFor="metodoPagoLote" className="mt-2">Método de pago</Label>
                <Select value={metodoPagoLote} onValueChange={(v) => v && setMetodoPagoLote(v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar método">{metodoPagoLabel[metodoPagoLote] ?? metodoPagoLote}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={MetodoPago.EFECTIVO}>Efectivo</SelectItem>
                    <SelectItem value={MetodoPago.NEQUI}>Nequi</SelectItem>
                    <SelectItem value={MetodoPago.BRE_B}>Bre-B</SelectItem>
                  </SelectContent>
                </Select>
              </>
            )}
          </div>

          {/* Product items */}
          {items.map((item, index) => {
            const isDC = isDobleCrema(item.producto);
            const proratedFlete = proratedFletes[index];
            const enteros = parseInt(item.bloquesEnteros) || 0;
            const tajados = parseInt(item.bloquesTajadosDeFabrica) || 0;
            const totalBloques = enteros + tajados;

            // Calculate cost preview
            const dcPreview = isDC ? calcDCPreview(item, proratedFlete) : null;
            const ssPreview = !isDC && item.producto === TipoProducto.SEMISALADO ? calcSSPreview(item, proratedFlete) : null;

            return (
              <div key={item.id} className="rounded-lg border p-4 space-y-3 relative">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium">Producto {index + 1}</h4>
                  {items.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-destructive"
                      onClick={() => removeItem(item.id)}
                    >
                      <Trash2Icon className="size-4" />
                    </Button>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Tipo de Producto</Label>
                  <Select
                    value={item.producto}
                    onValueChange={(v) => {
                      if (v !== null) {
                        updateItem(item.id, {
                          producto: v,
                          bloquesEnteros: '',
                          bloquesTajadosDeFabrica: '',
                          cantidadCompradaKg: '',
                          precioPorBloqueEntero: '',
                          precioPorBloqueTajado: '',
                          precioCompraBaseKg: '',
                        });
                      }
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Seleccione producto">{item.producto ? (tipoProductoLabel[item.producto as TipoProducto] ?? item.producto) : 'Seleccione producto'}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={TipoProducto.DOBLE_CREMA}>Doble Crema</SelectItem>
                      <SelectItem value={TipoProducto.SEMISALADO}>Semisalado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {isDC ? (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Bloques Enteros</Label>
                        <Input
                          type="number"
                          step="1"
                          min="0"
                          placeholder="Ej: 10"
                          value={item.bloquesEnteros}
                          onChange={(e) => {
                            const val = e.target.value;
                            const updates: Partial<LoteItem> = { bloquesEnteros: val };
                            if (parseInt(val) <= 0 || val === '') {
                              updates.precioPorBloqueEntero = '';
                            }
                            updateItem(item.id, updates);
                          }}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Bloques Tajados de Fábrica</Label>
                        <Input
                          type="number"
                          step="1"
                          min="0"
                          placeholder="Ej: 0"
                          value={item.bloquesTajadosDeFabrica}
                          onChange={(e) => {
                            const val = e.target.value;
                            const updates: Partial<LoteItem> = { bloquesTajadosDeFabrica: val };
                            if (parseInt(val) <= 0 || val === '') {
                              updates.precioPorBloqueTajado = '';
                            }
                            updateItem(item.id, updates);
                          }}
                        />
                        <p className="text-xs text-muted-foreground">
                          1 bloque = {DOBLE_CREMA_BLOCK_KG} kg
                        </p>
                        {totalBloques > 0 && (
                          <p className="text-xs text-muted-foreground">
                            Total: {(totalBloques * DOBLE_CREMA_BLOCK_KG).toLocaleString('es-AR')} kg ({totalBloques} bloques)
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Precio Bloque Entero ($)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder={enteros > 0 ? '0.00' : 'Sin bloques enteros'}
                          value={item.precioPorBloqueEntero}
                          onChange={(e) => {
                            const val = e.target.value;
                            const updates: Partial<LoteItem> = { precioPorBloqueEntero: val };
                            if (parseInt(val) <= 0 || val === '') {
                              // no-op, just update the field
                            }
                            updateItem(item.id, updates);
                          }}
                          disabled={enteros === 0}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Precio Bloque Tajado ($)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder={tajados > 0 ? '0.00' : 'Sin tajados de fábrica'}
                          value={item.precioPorBloqueTajado}
                          onChange={(e) => updateItem(item.id, { precioPorBloqueTajado: e.target.value })}
                          disabled={tajados === 0}
                        />
                      </div>
                    </div>
                  </>
                ) : item.producto === TipoProducto.SEMISALADO ? (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Cantidad Comprada (Kg)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0.01"
                        placeholder="0"
                        value={item.cantidadCompradaKg}
                        onChange={(e) => updateItem(item.id, { cantidadCompradaKg: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Precio Compra Base ($/Kg)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        value={item.precioCompraBaseKg}
                        onChange={(e) => updateItem(item.id, { precioCompraBaseKg: e.target.value })}
                      />
                    </div>
                  </div>
                ) : null}

                {/* Prorated flete display */}
                {proratedFlete > 0 && (
                  <div className="rounded-md bg-muted px-3 py-2 text-sm">
                    <span className="text-muted-foreground">Prorrateo flete:</span>{' '}
                    <span className="font-medium">${proratedFlete.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    {totalWeightKg > 0 && (
                      <span className="text-xs text-muted-foreground ml-2">
                        ({calcItemWeightKg(item).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kg de {totalWeightKg.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kg total)
                      </span>
                    )}
                  </div>
                )}

                {/* Per-item cost summary */}
                {dcPreview && (
                  <div className="rounded-md bg-muted/50 px-3 py-2 text-sm space-y-1">
                    <p className="text-xs text-muted-foreground">Costo Real Calculado:</p>
                    <p className="text-sm">
                      <span className="font-medium text-green-700 dark:text-green-400">Entero:</span> ${dcPreview.costoRealPorBloqueEntero!.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/bloque
                      {' '}(${dcPreview.costoRealCalculadoKg!.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/kg)
                    </p>
                    {dcPreview.showTajadoPrice && dcPreview.costoRealPorBloqueTajado !== null && (
                      <p className="text-sm">
                        <span className="font-medium text-blue-700 dark:text-blue-400">Taj. fábrica:</span> ${dcPreview.costoRealPorBloqueTajado.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/bloque
                        {' '}(${dcPreview.costoRealCalculadoTajadoFabricaKg!.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/kg)
                      </p>
                    )}
                    {dcPreview.inversionTotal > 0 && (
                      <p className="text-xs text-muted-foreground border-t border-border/50 pt-1">
                        Inversión: ${Math.round(dcPreview.inversionTotal).toLocaleString('es-AR')}
                        {proratedFlete > 0 && (
                          <span className="text-muted-foreground">
                            {' '}(${Math.round(dcPreview.costoMercancia).toLocaleString('es-AR')} prod. + ${Math.round(proratedFlete).toLocaleString('es-AR')} flete)
                          </span>
                        )}
                      </p>
                    )}
                  </div>
                )}
                {ssPreview && (
                  <div className="rounded-md bg-muted/50 px-3 py-2 text-sm space-y-1">
                    <p className="text-xs text-muted-foreground">Costo Real Calculado por Kg:</p>
                    <p className="text-lg font-semibold">
                      ${ssPreview.costoRealCalculadoKg.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                    {ssPreview.inversionTotal > 0 && (
                      <p className="text-xs text-muted-foreground border-t border-border/50 pt-1">
                        Inversión: ${Math.round(ssPreview.inversionTotal).toLocaleString('es-AR')}
                        {proratedFlete > 0 && (
                          <span className="text-muted-foreground">
                            {' '}(${Math.round(ssPreview.costoMercancia).toLocaleString('es-AR')} prod. + ${Math.round(proratedFlete).toLocaleString('es-AR')} flete)
                          </span>
                        )}
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          <Button type="button" variant="outline" size="sm" onClick={addItem} className="w-full">
            <PlusIcon className="size-4 mr-1" />
            Agregar producto
          </Button>

          {/* Summary */}
          {totalWeightKg > 0 && (
            <div className="rounded-lg bg-muted p-3 text-sm">
              <span className="font-medium">Resumen:</span>{' '}
              Peso total: {totalWeightKg.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kg
              {costoFleteNum > 0 && (
                <> | Flete total: ${costoFleteNum.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</>
              )}
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => { setOpen(false); resetForm(); }}>
              Cancelar
            </Button>
            <Button type="button" onClick={handleSubmit} disabled={submitting}>
              {submitting ? 'Creando...' : `Crear ${items.length > 1 ? `${items.length} Lotes` : 'Lote'}`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}