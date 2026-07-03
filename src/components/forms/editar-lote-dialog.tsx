'use client';

import { useState, useMemo } from 'react';
import { useRefresh } from '@/components/refresh-context';
import { modificarLote } from '@/presentation/actions/lotes';
import { toast } from 'sonner';
import { isDobleCrema, DOBLE_CREMA_BLOCK_KG } from '@/domain/constants';
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

interface EditarLoteDialogProps {
  lote: LoteResponse;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditarLoteDialog({ lote, open, onOpenChange }: EditarLoteDialogProps) {
  const refreshData = useRefresh();
  const isDobleCremaLote = isDobleCrema(lote.producto);

  const [precioPorBloque, setPrecioPorBloque] = useState(lote.precioPorBloque);
  const [precioCompraBaseKg, setPrecioCompraBaseKg] = useState(lote.precioCompraBaseKg);
  const [costoFlete, setCostoFlete] = useState(lote.costoFlete);
  const [costoEmpaques, setCostoEmpaques] = useState(lote.costoEmpaques);

  // For DC: derive precioCompraBaseKg from precioPorBloque
  const effectivePrecioBaseKg = isDobleCremaLote
    ? (parseFloat(precioPorBloque) || 0) / DOBLE_CREMA_BLOCK_KG
    : parseFloat(precioCompraBaseKg) || 0;

  const costoRealCalculadoKg = useMemo(() => {
    const cantidad = parseFloat(lote.cantidadCompradaKg);
    const precioBase = effectivePrecioBaseKg;
    const flete = parseFloat(costoFlete) || 0;
    const tajado = parseFloat(lote.costoTajado) || 0;
    const empaques = parseFloat(costoEmpaques) || 0;

    if (!cantidad || cantidad <= 0 || isNaN(precioBase)) return null;

    const costoTotal = (precioBase * cantidad) + flete + tajado + empaques;
    return costoTotal / cantidad;
  }, [lote.cantidadCompradaKg, lote.costoTajado, effectivePrecioBaseKg, costoFlete, costoEmpaques, isDobleCremaLote, precioPorBloque, precioCompraBaseKg]);

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
              value={lote.producto === 'DOBLE_CREMA' ? 'Doble Crema' : 'Semisalado'}
              disabled
              className="bg-muted"
            />
          </div>

          <div className="space-y-2">
            <Label>Proveedor</Label>
            <Input
              value={lote.proveedorId}
              disabled
              className="bg-muted"
            />
          </div>

          {isDobleCremaLote && (
            <div className="rounded-lg bg-muted/50 p-3 space-y-1">
              <p className="text-sm font-medium">Bloques</p>
              <p className="text-xs text-muted-foreground">
                Enteros: {lote.bloquesEnteros} | Tajados: {lote.bloquesTajados} | De Fábrica: {lote.bloquesTajadosDeFabrica}
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
            <div className="space-y-2">
              <Label htmlFor="edit-precioPorBloque">Precio por Bloque ($)</Label>
              <Input
                id="edit-precioPorBloque"
                name="precioPorBloque"
                type="number"
                step="0.01"
                min="0"
                value={precioPorBloque}
                onChange={(e) => setPrecioPorBloque(e.target.value)}
                required
              />
              {precioPorBloque && !isNaN(parseFloat(precioPorBloque)) && parseFloat(precioPorBloque) > 0 && (
                <p className="text-xs text-muted-foreground">
                  Equivale a ${(effectivePrecioBaseKg).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/kg
                </p>
              )}
              <input type="hidden" name="precioCompraBaseKg" value={String(effectivePrecioBaseKg)} />
            </div>
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

          <div className="space-y-2">
            <Label htmlFor="edit-costoEmpaques">Costo Empaques ($)</Label>
            <Input
              id="edit-costoEmpaques"
              name="costoEmpaques"
              type="number"
              step="0.01"
              min="0"
              value={costoEmpaques}
              onChange={(e) => setCostoEmpaques(e.target.value)}
            />
          </div>

          {costoRealCalculadoKg !== null && !isNaN(costoRealCalculadoKg) && (
            <div className="rounded-lg bg-muted p-3">
              <p className="text-sm text-muted-foreground">Costo Real Calculado por Kg:</p>
              <p className="text-lg font-semibold">
                ${costoRealCalculadoKg.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
          )}

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