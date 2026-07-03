'use client';

import { useState } from 'react';
import { useRefresh } from '@/components/refresh-context';
import { actualizarEmpaque } from '@/presentation/actions/empaques';
import { toast } from 'sonner';
import type { EmpaqueResponse } from '@/presentation/dtos';
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

interface EditarEmpaqueDialogProps {
  empaque: EmpaqueResponse;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditarEmpaqueDialog({ empaque, open, onOpenChange }: EditarEmpaqueDialogProps) {
  const refreshData = useRefresh();
  const [tipo, setTipo] = useState(empaque.tipo);
  const [stock, setStock] = useState(String(empaque.stock));
  const [precio, setPrecio] = useState(empaque.precio);

  async function action(formData: FormData) {
    const result = await actualizarEmpaque(formData);
    if (result.success) {
      toast.success('Empaque actualizado exitosamente');
      refreshData();
      onOpenChange(false);
    } else {
      toast.error(result.error || 'Error al actualizar empaque');
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Editar Empaque</DialogTitle>
          <DialogDescription>
            Modifique el tipo, stock o precio del empaque.
          </DialogDescription>
        </DialogHeader>
        <form action={action} className="space-y-4">
          <input type="hidden" name="id" value={empaque.id} />

          <div className="space-y-2">
            <Label htmlFor="edit-tipo">Tipo de Empaque</Label>
            <Input
              id="edit-tipo"
              name="tipo"
              value={tipo}
              onChange={(e) => setTipo(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-stock">Stock</Label>
            <Input
              id="edit-stock"
              name="stock"
              type="number"
              step="1"
              min="0"
              value={stock}
              onChange={(e) => setStock(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-precio">Precio ($)</Label>
            <Input
              id="edit-precio"
              name="precio"
              type="number"
              step="0.01"
              min="0"
              value={precio}
              onChange={(e) => setPrecio(e.target.value)}
              required
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