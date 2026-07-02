'use client';

import { useState } from 'react';
import { actualizarGasto } from '@/presentation/actions/gastos';
import { toast } from 'sonner';
import type { GastoResponse } from '@/presentation/dtos';
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

interface EditarGastoFijoDialogProps {
  gasto: GastoResponse;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditarGastoFijoDialog({ gasto, open, onOpenChange }: EditarGastoFijoDialogProps) {
  const [concepto, setConcepto] = useState(gasto.concepto);
  const [valor, setValor] = useState(gasto.valor);

  async function action(formData: FormData) {
    const result = await actualizarGasto(formData);
    if (result.success) {
      toast.success('Gasto actualizado exitosamente');
      onOpenChange(false);
    } else {
      toast.error(result.error || 'Error al actualizar gasto');
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar Gasto Fijo</DialogTitle>
          <DialogDescription>
            Modifique los datos del gasto fijo.
          </DialogDescription>
        </DialogHeader>
        <form action={action} className="space-y-4">
          <input type="hidden" name="id" value={gasto.id} />
          <div className="space-y-2">
            <Label htmlFor="edit-concepto">Concepto</Label>
            <Input
              id="edit-concepto"
              name="concepto"
              value={concepto}
              onChange={(e) => setConcepto(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-valor">Valor ($)</Label>
            <Input
              id="edit-valor"
              name="valor"
              type="number"
              step="0.01"
              min="0"
              value={valor}
              onChange={(e) => setValor(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label>Fecha</Label>
            <Input
              value={new Date(gasto.fecha).toLocaleDateString('es-AR')}
              disabled
              className="bg-muted"
            />
          </div>
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