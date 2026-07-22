'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRefresh } from '@/components/refresh-context';
import { registrarTajado } from '@/presentation/actions/tajados';
import { getEmpaques } from '@/presentation/actions/empaques';
import { toast } from 'sonner';
import type { LoteResponse, ProveedorResponse } from '@/presentation/dtos';
import { DOBLE_CREMA_BLOCK_KG } from '@/domain/constants';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
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
import { ScissorsIcon, Loader2, AlertTriangle } from 'lucide-react';

interface RegistrarTajadoDialogProps {
  lotes: LoteResponse[];
  proveedores: ProveedorResponse[];
}

type Step = 'form' | 'confirm';

export function RegistrarTajadoDialog({ lotes, proveedores }: RegistrarTajadoDialogProps) {
  const refreshData = useRefresh();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>('form');
  const [loading, setLoading] = useState(false);
  const [loteId, setLoteId] = useState<string>('');
  const [cantidadBloques, setCantidadBloques] = useState<string>('');
  const [precioPorBloque, setPrecioPorBloque] = useState<string>('1500');
  const [tajador, setTajador] = useState<string>('');
  const [separadoresKg, setSeparadoresKg] = useState<string>('0');
  const [separadorStock, setSeparadorStock] = useState<number>(0);
  const [recortesKg, setRecortesKg] = useState<string>('');

  // Fetch separador stock on mount
  useEffect(() => {
    async function loadSeparadorStock() {
      try {
        const result = await getEmpaques();
        if (result.success && result.empaques) {
          const separadorEmpaque = result.empaques.find(
            (e) => e.categoria === 'SEPARADOR' && Number(e.stock) > 0
          );
          setSeparadorStock(separadorEmpaque ? Number(separadorEmpaque.stock) : 0);
        }
      } catch {
        // Silently ignore — separadores field is optional
      }
    }
    loadSeparadorStock();
  }, [open]);

  // Filter DC lotes with bloquesEnteros > 0, ACTIVO, and not deleted
  const availableLotes = lotes.filter(
    (l) => l.producto === 'DOBLE_CREMA' && l.bloquesEnteros > 0 && l.estado === 'ACTIVO' && !l.deletedAt
  );

  const proveedorMap = useMemo(
    () => new Map(proveedores.map((p) => [p.id, p.nombre])),
    [proveedores]
  );

  // Map lote IDs to labels for Select display
  const loteLabels = useMemo(() => {
    const map = new Map<string, string>();
    for (const l of availableLotes) {
      const proveedor = l.proveedorId ? (proveedorMap.get(l.proveedorId) ?? 'S/Proveedor') : 'Operación Interna';
      map.set(l.id, `${proveedor} — ${l.bloquesEnteros} bloques enteros (${Number(l.cantidadCompradaKg).toLocaleString('es-AR')} kg)`);
    }
    return map;
  }, [availableLotes, proveedorMap]);

  const selectedLote = lotes.find((l) => l.id === loteId);
  const maxBloques = selectedLote?.bloquesEnteros ?? 0;

  const cantidad = parseInt(cantidadBloques) || 0;
  const precio = parseFloat(precioPorBloque) || 0;
  const costoTotal = cantidad * precio;
  const separadores = parseFloat(separadoresKg) || 0;
  const recortes = parseFloat(recortesKg) || 0;
  const showSeparadores = separadorStock > 0;

  const isValid = loteId && cantidad > 0 && cantidad <= maxBloques && precio > 0 && tajador.trim() !== ''
    && (!showSeparadores || separadores >= 0) && separadores <= separadorStock;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (step === 'form') {
      setStep('confirm');
      return;
    }
  }

  async function handleConfirm() {
    setLoading(true);
    const formData = new FormData();
    formData.set('loteId', loteId);
    formData.set('cantidadBloques', cantidadBloques);
    formData.set('precioPorBloque', precioPorBloque);
    formData.set('tajador', tajador);
    formData.set('separadoresKg', separadoresKg);
    formData.set('recortesKg', recortesKg || '0');
    const result = await registrarTajado(formData);
    setLoading(false);

    if (result.success) {
      toast.success('Tajado registrado exitosamente');
      refreshData();
      setOpen(false);
      resetForm();
    } else {
      toast.error(result.error || 'Error al registrar tajado');
      setStep('form');
    }
  }

  function resetForm() {
    setStep('form');
    setLoteId('');
    setCantidadBloques('');
    setPrecioPorBloque('1500');
    setTajador('');
    setSeparadoresKg('0');
    setRecortesKg('');
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen) resetForm();
      setOpen(isOpen);
    }}>
      <DialogTrigger render={<Button variant="outline" size="sm" />}>
        <ScissorsIcon className="size-4" />
        Registrar Tajado
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Registrar Tajado</DialogTitle>
          <DialogDescription>
            Registra bloques enviados a tajado para un lote de Doble Crema.
          </DialogDescription>
        </DialogHeader>
        {step === 'form' ? (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="loteId">Lote (Doble Crema)</Label>
            <Select name="loteId" value={loteId} onValueChange={(v) => { if (v !== null) { setLoteId(v); setCantidadBloques(''); } }}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Seleccione un lote">{loteId ? (loteLabels.get(loteId) ?? 'Seleccione un lote') : 'Seleccione un lote'}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {availableLotes.map((l) => {
      const proveedor = l.proveedorId ? (proveedorMap.get(l.proveedorId) ?? 'S/Proveedor') : 'Operación Interna';
                  return (
                    <SelectItem key={l.id} value={l.id}>
                      {proveedor} — {l.bloquesEnteros} bloques enteros ({Number(l.cantidadCompradaKg).toLocaleString('es-AR')} kg)
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="cantidadBloques">Bloques a Tajar</Label>
            <Input
              id="cantidadBloques"
              name="cantidadBloques"
              type="number"
              step="1"
              min="1"
              max={maxBloques || undefined}
              placeholder="Ej: 5"
              value={cantidadBloques}
              onChange={(e) => setCantidadBloques(e.target.value)}
              required
            />
            {selectedLote && (
              <p className="text-xs text-muted-foreground">
                Máximo disponible: {maxBloques} bloques enteros
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="precioPorBloque">Precio por Bloque ($)</Label>
            <Input
              id="precioPorBloque"
              name="precioPorBloque"
              type="number"
              step="0.01"
              min="0.01"
              placeholder="1500"
              value={precioPorBloque}
              onChange={(e) => setPrecioPorBloque(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="tajador">Tajador</Label>
            <Input
              id="tajador"
              name="tajador"
              type="text"
              placeholder="Nombre del tajador"
              value={tajador}
              onChange={(e) => setTajador(e.target.value)}
              required
            />
          </div>

          {showSeparadores && (
            <div className="space-y-2">
              <Label htmlFor="separadoresKg">Separadores gastados (kg)</Label>
              <Input
                id="separadoresKg"
                name="separadoresKg"
                type="number"
                step="0.001"
                min="0"
                max={separadorStock || undefined}
                placeholder="Ej: 0.150"
                value={separadoresKg}
                onChange={(e) => setSeparadoresKg(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Stock disponible: {separadorStock.toLocaleString('es-AR', { minimumFractionDigits: 3 })} kg — podés cargar gramos (Ej: 0.150)
              </p>
            </div>
          )}

          {(!showSeparadores) && (
            <input type="hidden" name="separadoresKg" value="0" />
          )}

          <div className="space-y-2">
            <Label htmlFor="recortesKg">Recortes generados (kg)</Label>
            <Input
              id="recortesKg"
              name="recortesKg"
              type="number"
              step="0.001"
              min="0"
              placeholder="Ej: 0.500"
              value={recortesKg}
              onChange={(e) => setRecortesKg(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Kg de recortes generados. Se acumularán al lote permanente de recortes.
            </p>
          </div>

          {cantidad > 0 && precio > 0 && (
            <div className="rounded-lg bg-muted p-3">
              <p className="text-sm text-muted-foreground">Resumen:</p>
              <p className="text-sm">
                {cantidad} bloques × ${precio.toLocaleString('es-AR')} = ${costoTotal.toLocaleString('es-AR')}
              </p>
              <p className="text-xs text-muted-foreground">
                ({cantidad} × {DOBLE_CREMA_BLOCK_KG} kg = {(cantidad * DOBLE_CREMA_BLOCK_KG).toFixed(1)} kg tajados)
              </p>
              {separadores > 0 && (
                <p className="text-xs text-muted-foreground">
                  Separadores: {separadores.toLocaleString('es-AR', { minimumFractionDigits: 3 })} kg
                </p>
              )}
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={!isValid}>
              Registrar Tajado
            </Button>
          </DialogFooter>
        </form>
        ) : (
        <div className="space-y-4 py-2">
          <div className="flex items-start gap-3 rounded-lg border border-yellow-500/50 bg-yellow-50 dark:bg-yellow-950/20 p-4">
            <AlertTriangle className="size-5 text-yellow-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-sm font-medium">¿Confirmar registro de tajado?</p>
              <p className="text-sm text-muted-foreground">
                Esta acción no se puede deshacer.
              </p>
            </div>
          </div>
          <div className="rounded-lg bg-muted p-4 space-y-2">
            <p className="text-sm font-medium">Resumen del tajado</p>
            {selectedLote && (
              <p className="text-sm">
                Se descontarán <strong>{cantidad} bloques tajados</strong> del lote de <strong>{selectedLote.proveedorId ? (proveedorMap.get(selectedLote.proveedorId) ?? 'S/Proveedor') : 'Operación Interna'}</strong>
              </p>
            )}
            <p className="text-sm">
              Costo total: <strong>${costoTotal.toLocaleString('es-AR')}</strong>
              <span className="text-muted-foreground"> ({cantidad} × ${precio.toLocaleString('es-AR')})</span>
            </p>
            <p className="text-xs text-muted-foreground">
              {cantidad} × {DOBLE_CREMA_BLOCK_KG} kg = {(cantidad * DOBLE_CREMA_BLOCK_KG).toFixed(1)} kg tajados
            </p>
            {separadores > 0 && (
              <p className="text-sm">
                Separadores: <strong>{separadores.toLocaleString('es-AR', { minimumFractionDigits: 3 })} kg</strong>
              </p>
            )}
            {recortes > 0 && (
              <p className="text-sm">
                Recortes: <strong>{recortes.toLocaleString('es-AR', { minimumFractionDigits: 3 })} kg</strong>
              </p>
            )}
            <p className="text-sm">
              Tajador: <strong>{tajador}</strong>
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStep('form')} disabled={loading}>
              Volver
            </Button>
            <Button onClick={handleConfirm} disabled={loading}>
              {loading && <Loader2 className="size-4 animate-spin mr-2" />}
              Sí, Registrar Tajado
            </Button>
          </DialogFooter>
        </div>
        )}
      </DialogContent>
    </Dialog>
  );
}