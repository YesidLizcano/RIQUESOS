'use client';

import { useState } from 'react';
import { useRefresh } from '@/components/refresh-context';
import { modificarLote } from '@/presentation/actions/lotes';
import { toast } from 'sonner';
import { DOBLE_CREMA_BLOCK_KG } from '@/domain/constants';
import { TipoProducto, EstadoPagoLote, MetodoPago } from '@/domain/enums';
import { tipoProductoLabel, metodoPagoLabel } from '@/domain/labels';
import { useLoteCostCalculator } from '@/hooks/use-lote-cost-calculator';
import type { LoteResponse } from '@/presentation/dtos';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
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

interface EditarLoteDialogProps {
  lote: LoteResponse;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  proveedorNombre?: string;
}

export function EditarLoteDialog({ lote, open, onOpenChange, proveedorNombre }: EditarLoteDialogProps) {
  const refreshData = useRefresh();

  const [precioPorBloqueEntero, setPrecioPorBloqueEntero] = useState(lote.precioPorBloqueEntero);
  const [precioPorBloqueTajado, setPrecioPorBloqueTajado] = useState(lote.precioPorBloqueTajado);
  const [precioCompraBaseKg, setPrecioCompraBaseKg] = useState(lote.precioCompraBaseKg);
  const [costoFlete, setCostoFlete] = useState(lote.costoFlete);
  const [estadoPago, setEstadoPago] = useState(lote.estadoPago);
  const [metodoPagoLote, setMetodoPagoLote] = useState(lote.metodoPagoLote ?? MetodoPago.EFECTIVO);

  const {
    isDobleCremaSelected: isDobleCremaLote,
    effectivePrecioBaseKg,
    costoRealCalculadoKg,
    costoRealPorBloqueEntero: costoRealPorBloque,
    costoRealCalculadoTajadoFabricaKg,
    costoRealPorBloqueTajado,
    showTajadoPrice,
    costoMercancia,
    costoFleteNum,
    inversionTotal,
    hasInversion,
  } = useLoteCostCalculator({
    producto: lote.producto,
    bloquesEnteros: lote.bloquesEnteros,
    bloquesTajadosDeFabrica: lote.bloquesTajadosDeFabrica,
    cantidadCompradaKg: parseFloat(lote.cantidadCompradaKg) || 0,
    precioPorBloqueEntero: parseFloat(precioPorBloqueEntero) || 0,
    precioPorBloqueTajado: parseFloat(precioPorBloqueTajado) || 0,
    precioCompraBaseKg: parseFloat(precioCompraBaseKg) || 0,
    costoFlete: parseFloat(costoFlete) || 0,
  });

  async function action(formData: FormData) {
    const result = await modificarLote(formData);
    if (result.success) {
      toast.success('Lote actualizado exitosamente');
      refreshData();
      onOpenChange(false);
    } else {
      toast.error(result.error || 'Error al actualizar lote');
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Editar Costos del Lote</DialogTitle>
          <DialogDescription>
            Modifique los costos del lote. El producto y proveedor no se pueden cambiar.
          </DialogDescription>
        </DialogHeader>
        <form action={action} className="space-y-4">
          <input type="hidden" name="id" value={lote.id} />
          <input type="hidden" name="version" value={lote.version} />

          <div className="space-y-2">
            <Label>Producto</Label>
            <Input
              value={tipoProductoLabel[lote.producto as TipoProducto] ?? lote.producto}
              disabled
              className="bg-muted"
            />
          </div>

          <div className="space-y-2">
            <Label>Proveedor</Label>
            <Input
              value={proveedorNombre ?? (lote.proveedorId ? 'Cargando...' : 'Operación Interna')}
              disabled
              className="bg-muted"
            />
          </div>

          {isDobleCremaLote && (
            <div className="rounded-lg bg-muted/50 p-3 space-y-1">
              <p className="text-sm font-medium">Bloques</p>
              <p className="text-xs text-muted-foreground">
                Enteros: {lote.bloquesEnteros} | Tajados: {lote.bloquesTajadosDisponibles} | De Fábrica: {lote.bloquesTajadosDeFabrica}
              </p>
              <p className="text-xs text-muted-foreground">
                Gestión de bloques vía módulo de Tajado
              </p>
            </div>
          )}

          {!isDobleCremaLote && (
            <div className="space-y-2">
              <Label>Cantidad Comprada (Kg)</Label>
              <Input
                value={lote.cantidadCompradaKg}
                disabled
                className="bg-muted"
              />
            </div>
          )}

          {isDobleCremaLote && (
            <div className="space-y-2">
              <Label>Cantidad Comprada</Label>
              <Input
                value={`${Number(lote.cantidadCompradaKg).toLocaleString('es-AR')} kg`}
                disabled
                className="bg-muted"
              />
            </div>
          )}

          {isDobleCremaLote ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="edit-precioPorBloqueEntero">Precio Bloque Entero ($)</Label>
                <Input
                  id="edit-precioPorBloqueEntero"
                  name="precioPorBloqueEntero"
                  type="number"
                  step="0.01"
                  min="0"
                  value={precioPorBloqueEntero}
                  onChange={(e) => setPrecioPorBloqueEntero(e.target.value)}
                  required
                />
                {precioPorBloqueEntero && !isNaN(parseFloat(precioPorBloqueEntero)) && parseFloat(precioPorBloqueEntero) > 0 && (
                  <p className="text-xs text-muted-foreground">
                    Equivale a ${(effectivePrecioBaseKg).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/kg
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-precioPorBloqueTajado">Precio Bloque Tajado ($)</Label>
                <Input
                  id="edit-precioPorBloqueTajado"
                  name="precioPorBloqueTajado"
                  type="number"
                  step="0.01"
                  min="0"
                  value={precioPorBloqueTajado}
                  onChange={(e) => setPrecioPorBloqueTajado(e.target.value)}
                  disabled={lote.bloquesTajadosDeFabrica === 0}
                  placeholder={lote.bloquesTajadosDeFabrica > 0 ? '0.00' : 'Sin tajados de fábrica'}
                />
              </div>
              <input type="hidden" name="precioCompraBaseKg" value={String(effectivePrecioBaseKg)} />
            </>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="edit-precioCompraBaseKg">Precio Compra Base ($/Kg)</Label>
              <Input
                id="edit-precioCompraBaseKg"
                name="precioCompraBaseKg"
                type="number"
                step="0.01"
                min="0"
                value={precioCompraBaseKg}
                onChange={(e) => setPrecioCompraBaseKg(e.target.value)}
                required
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="edit-costoFlete">Costo Flete ($)</Label>
            <Input
              id="edit-costoFlete"
              name="costoFlete"
              type="number"
              step="0.01"
              min="0"
              value={costoFlete}
              onChange={(e) => setCostoFlete(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Costo Tajado ($)</Label>
            <Input
              value={Number(lote.costoTajado).toLocaleString('es-AR')}
              disabled
              className="bg-muted"
            />
            <p className="text-xs text-muted-foreground">
              Se gestiona vía módulo de Tajado
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-estadoPago">Estado de pago</Label>
              <Select name="estadoPago" value={estadoPago} onValueChange={(v) => { if (v) { setEstadoPago(v); if (v !== 'PAGADO') setMetodoPagoLote(MetodoPago.EFECTIVO); } }}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Seleccione estado de pago">{estadoPago === EstadoPagoLote.PAGADO ? 'Pagado' : 'Pendiente'}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={EstadoPagoLote.PENDIENTE}>Pendiente</SelectItem>
                  <SelectItem value={EstadoPagoLote.PAGADO}>Pagado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {estadoPago === 'PAGADO' && (
              <div className="space-y-2">
                 <Label htmlFor="edit-metodoPagoLote">Método de pago</Label>
                 <Select name="metodoPagoLote" value={metodoPagoLote} onValueChange={(v) => v && setMetodoPagoLote(v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar método">{metodoPagoLabel[metodoPagoLote] ?? metodoPagoLote}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                       <SelectItem value={MetodoPago.EFECTIVO}>Efectivo</SelectItem>
                       <SelectItem value={MetodoPago.NEQUI}>Nequi</SelectItem>
                       <SelectItem value={MetodoPago.BRE_B}>Bre-B</SelectItem>
                    </SelectContent>
                 </Select>
              </div>
            )}
          </div>
          <input type="hidden" name="metodoPagoLote" value={metodoPagoLote} />

          {isDobleCremaLote && costoRealPorBloque !== null ? (
            <div className="rounded-lg bg-muted p-3 space-y-1">
              <p className="text-sm text-muted-foreground">Costo Real Calculado:</p>
              <p className="text-sm">
                <span className="font-medium text-green-700 dark:text-green-400">Entero:</span> ${costoRealPorBloque.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/bloque
                {' '}(${costoRealCalculadoKg!.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/kg)
              </p>
              {showTajadoPrice && costoRealPorBloqueTajado !== null && (
                <p className="text-sm">
                  <span className="font-medium text-blue-700 dark:text-blue-400">Taj. fábrica:</span> ${costoRealPorBloqueTajado.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/bloque
                  {' '}(${costoRealCalculadoTajadoFabricaKg!.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/kg)
                </p>
              )}
              {hasInversion && (
                <p className="text-sm border-t border-border/50 pt-1 mt-1">
                  <span className="font-medium">Inversión Total:</span>{' '}
                  <span className="font-semibold">${Math.round(inversionTotal).toLocaleString('es-AR')}</span>
                  {costoFleteNum > 0 && (
                    <span className="text-muted-foreground">
                      {' '}(${Math.round(costoMercancia).toLocaleString('es-AR')} prod. + ${Math.round(costoFleteNum).toLocaleString('es-AR')} flete)
                    </span>
                  )}
                </p>
              )}
            </div>
          ) : !isDobleCremaLote && costoRealCalculadoKg !== null && !isNaN(costoRealCalculadoKg) ? (
            <div className="rounded-lg bg-muted p-3">
              <p className="text-sm text-muted-foreground">Costo Real Calculado por Kg:</p>
              <p className="text-lg font-semibold">
                ${costoRealCalculadoKg.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              {hasInversion && (
                <p className="text-sm border-t border-border/50 pt-1 mt-1">
                  <span className="font-medium">Inversión Total:</span>{' '}
                  <span className="font-semibold">${Math.round(inversionTotal).toLocaleString('es-AR')}</span>
                  {costoFleteNum > 0 && (
                    <span className="text-muted-foreground">
                      {' '}(${Math.round(costoMercancia).toLocaleString('es-AR')} prod. + ${Math.round(costoFleteNum).toLocaleString('es-AR')} flete)
                    </span>
                  )}
                </p>
              )}
            </div>
          ) : null}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit">Guardar Cambios</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}