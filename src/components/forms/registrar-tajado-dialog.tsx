'use client';

import { useState, useMemo } from 'react';
import { useRefresh } from '@/components/refresh-context';
import { registrarTajado } from '@/presentation/actions/tajados';
import { toast } from 'sonner';
import type { LoteResponse } from '@/presentation/dtos';
import { DOBLE_CREMA_BLOCK_KG } from '@/domain/constants';
import { TipoProducto } from '@/domain/enums';
import { tipoProductoLabel } from '@/domain/labels';
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
import { ScissorsIcon } from 'lucide-react';

interface RegistrarTajadoDialogProps {
  lotes: LoteResponse[];
}

export function RegistrarTajadoDialog({ lotes }: RegistrarTajadoDialogProps) {
  const refreshData = useRefresh();
  const [open, setOpen] = useState(false);
  const [loteId, setLoteId] = useState<string>('');
  const [cantidadBloques, setCantidadBloques] = useState<string>('');
  const [precioPorBloque, setPrecioPorBloque] = useState<string>('1500');
  const [tajador, setTajador] = useState<string>('');

  // Filter DC lotes with bloquesEnteros > 0 and ACTIVO
  const availableLotes = lotes.filter(
    (l) => l.producto === 'DOBLE_CREMA' && l.bloquesEnteros > 0 && l.estado === 'ACTIVO'
  );

  // Map lote IDs to labels for Select display
  const loteLabels = useMemo(() => {
    const map = new Map<string, string>();
    for (const l of availableLotes) {
      map.set(l.id, `${tipoProductoLabel[l.producto as TipoProducto] ?? l.producto} — ${l.bloquesEnteros} bloques enteros (${Number(l.cantidadCompradaKg).toLocaleString('es-AR')} kg)`);
    }
    return map;
  }, [availableLotes]);

  const selectedLote = lotes.find((l) => l.id === loteId);
  const maxBloques = selectedLote?.bloquesEnteros ?? 0;

  const cantidad = parseInt(cantidadBloques) || 0;
  const precio = parseFloat(precioPorBloque) || 0;
  const costoTotal = cantidad * precio;

  const isValid = loteId && cantidad > 0 && cantidad <= maxBloques && precio > 0 && tajador.trim() !== '';

  async function handleSubmit(formData: FormData) {
    const result = await registrarTajado(formData);
    if (result.success) {
      toast.success('Tajado registrado exitosamente');
      refreshData();
      setOpen(false);
      setLoteId('');
      setCantidadBloques('');
      setPrecioPorBloque('1500');
      setTajador('');
    } else {
      toast.error(result.error || 'Error al registrar tajado');
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
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
        <form action={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="loteId">Lote (Doble Crema)</Label>
            <Select name="loteId" value={loteId} onValueChange={(v) => { if (v !== null) { setLoteId(v); setCantidadBloques(''); } }}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Seleccione un lote">{loteId ? (loteLabels.get(loteId) ?? 'Seleccione un lote') : 'Seleccione un lote'}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {availableLotes.map((l) => (
                  <SelectItem key={l.id} value={l.id}>
                    {tipoProductoLabel[l.producto as TipoProducto] ?? l.producto} — {l.bloquesEnteros} bloques enteros ({Number(l.cantidadCompradaKg).toLocaleString('es-AR')} kg)
                  </SelectItem>
                ))}
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

          {cantidad > 0 && precio > 0 && (
            <div className="rounded-lg bg-muted p-3">
              <p className="text-sm text-muted-foreground">Resumen:</p>
              <p className="text-sm">
                {cantidad} bloques × ${precio.toLocaleString('es-AR')} = ${costoTotal.toLocaleString('es-AR')}
              </p>
              <p className="text-xs text-muted-foreground">
                ({cantidad} × {DOBLE_CREMA_BLOCK_KG} kg = {(cantidad * DOBLE_CREMA_BLOCK_KG).toFixed(1)} kg tajados)
              </p>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={!isValid}>
              Registrar Tajado
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}