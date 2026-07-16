'use client';

import { useState } from 'react';
import { cerrarLote } from '@/presentation/actions/lotes';
import { useRefresh } from '@/components/refresh-context';
import { toast } from 'sonner';
import type { LoteResponse } from '@/presentation/dtos';
import { isDobleCrema, formatDobleCremaDetalle } from '@/domain/constants';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Loader2, ArchiveIcon } from 'lucide-react';

interface CerrarLoteDialogProps {
  lote: LoteResponse;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CerrarLoteDialog({ lote, open, onOpenChange }: CerrarLoteDialogProps) {
  const refreshData = useRefresh();
  const [loading, setLoading] = useState(false);

  const isDC = isDobleCrema(lote.producto);
  const stockKg = Number(lote.stockDisponibleKg);

  // Build stock description
  let stockDescription: string;
  if (isDC) {
    const bloquesTajadosDisponibles = lote.bloquesTajados + lote.bloquesTajadosDeFabrica;
    stockDescription = formatDobleCremaDetalle(
      lote.bloquesEnteros,
      bloquesTajadosDisponibles,
      Number(lote.sueltosEntero),
      Number(lote.sueltosTajado),
    ) + ` — ${stockKg.toLocaleString('es-AR')} kg`;
  } else {
    stockDescription = `${stockKg.toLocaleString('es-AR')} kg`;
  }

  async function handleConfirm() {
    setLoading(true);
    const formData = new FormData();
    formData.set('id', lote.id);
    const result = await cerrarLote(formData);
    setLoading(false);

    if (result.success) {
      toast.success('Lote cerrado exitosamente');
      refreshData();
      onOpenChange(false);
    } else {
      toast.error(result.error || 'Error al cerrar el lote');
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Cerrar Lote</DialogTitle>
          <DialogDescription>
            Marcar este lote como agotado y poner todo el inventario en cero.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="flex items-start gap-3 rounded-lg border border-yellow-500/50 bg-yellow-50 dark:bg-yellow-950/20 p-4">
            <AlertTriangle className="size-5 text-yellow-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-sm font-medium">Stock actual del lote</p>
              <p className="text-sm text-muted-foreground">{stockDescription}</p>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            Al cerrar el lote, el stock se pondrá en <strong>cero</strong> y el estado cambiará a <strong>Agotado</strong>. Esta acción se usa para merma o consumo interno cuando el stock físico ya no existe.
          </p>
          <p className="text-xs text-muted-foreground">
            No se generará ninguna venta ni se afectarán los ingresos. El costo del inventario ya fue asumido al comprar el lote.
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancelar
          </Button>
          <Button variant="destructive" onClick={handleConfirm} disabled={loading}>
            {loading && <Loader2 className="size-4 animate-spin mr-2" />}
            Sí, Cerrar Lote
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}