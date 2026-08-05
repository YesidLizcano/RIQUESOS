'use client';

import { useState } from 'react';
import { cerrarLote } from '@/presentation/actions/lotes';
import { useRefresh } from '@/components/refresh-context';
import { toast } from 'sonner';
import type { LoteResponse } from '@/presentation/dtos';
import { isDobleCrema, formatDobleCremaStockLabel } from '@/domain/constants';
import { formatCurrency } from '@/domain/formatters';
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
  const [confirmLoss, setConfirmLoss] = useState(false);

  const isDC = isDobleCrema(lote.producto);
  const stockKg = Number(lote.stockDisponibleKg);
  const lossValue = Number(lote.costoRealCalculadoKg) * stockKg;

  // Build stock description
  let stockDescription: string;
  if (isDC) {
    stockDescription = formatDobleCremaStockLabel(
      lote.bloquesEnteros,
      lote.bloquesTajados,
      lote.bloquesTajadosDeFabrica,
      Number(lote.sueltosEntero),
      Number(lote.sueltosTajado),
      stockKg,
    ) + ` — ${stockKg.toLocaleString('es-AR')} kg`;
  } else {
    stockDescription = `${stockKg.toLocaleString('es-AR')} kg`;
  }

  const hasStock = stockKg > 0;

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
      if (result.concurrencyError) {
        toast.error('Los datos del lote cambiaron. Cerrando formulario — intente nuevamente.');
        await refreshData();
        onOpenChange(false);
      } else {
        toast.error(result.error || 'Error al cerrar el lote');
      }
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
          {hasStock && (
            <div className="flex items-start gap-3 rounded-lg border border-red-500/50 bg-red-50 dark:bg-red-950/20 p-4">
              <AlertTriangle className="size-5 text-red-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-sm font-medium text-red-700 dark:text-red-400">Se perderá el siguiente inventario</p>
                <p className="text-sm text-red-600 dark:text-red-300">{stockDescription}</p>
                <p className="text-sm font-semibold text-red-700 dark:text-red-400">Valor estimado: {formatCurrency(lossValue)}</p>
              </div>
            </div>
          )}
          {!hasStock && (
            <div className="flex items-start gap-3 rounded-lg border border-yellow-500/50 bg-yellow-50 dark:bg-yellow-950/20 p-4">
              <AlertTriangle className="size-5 text-yellow-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-sm font-medium">Stock actual del lote</p>
                <p className="text-sm text-muted-foreground">0 kg — lote sin stock</p>
              </div>
            </div>
          )}
          <p className="text-sm text-muted-foreground">
            Al cerrar el lote, el stock se pondrá en <strong>cero</strong> y el estado cambiará a <strong>Agotado</strong>. Esta acción se usa para merma o consumo interno cuando el stock físico ya no existe.
          </p>
          <p className="text-xs text-muted-foreground">
            No se generará ninguna venta ni se afectarán los ingresos. El costo del inventario ya fue asumido al comprar el lote.
          </p>
          {hasStock && (
            <label className="flex items-start gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={confirmLoss}
                onChange={(e) => setConfirmLoss(e.target.checked)}
                className="mt-1 accent-red-600"
              />
              <span className="text-sm text-red-700 dark:text-red-400">
                Entiendo que se perderá {stockKg.toLocaleString('es-AR')} kg de inventario valorado en {formatCurrency(lossValue)}
              </span>
            </label>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancelar
          </Button>
          <Button variant="destructive" onClick={handleConfirm} disabled={loading || (hasStock && !confirmLoss)}>
            {loading && <Loader2 className="size-4 animate-spin mr-2" />}
            Sí, Cerrar Lote
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}