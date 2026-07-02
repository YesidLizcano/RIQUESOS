'use client';

import { useState } from 'react';
import { crearGasto } from '@/presentation/actions/gastos';
import { toast } from 'sonner';
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
import { PlusIcon } from 'lucide-react';

export function CrearGastoFijoDialog() {
  const [open, setOpen] = useState(false);

  async function action(formData: FormData) {
    const result = await crearGasto(formData);
    if (result.success) {
      toast.success('Gasto registrado exitosamente');
      setOpen(false);
    } else {
      toast.error(result.error || 'Error al registrar gasto');
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" size="sm" />}>
        <PlusIcon className="size-4" />
        Agregar Gasto
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nuevo Gasto Fijo</DialogTitle>
          <DialogDescription>
            Complete los datos para registrar un gasto fijo.
          </DialogDescription>
        </DialogHeader>
        <form action={action} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="concepto">Concepto</Label>
            <Input
              id="concepto"
              name="concepto"
              placeholder="Descripción del gasto"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="valor">Valor ($)</Label>
            <Input
              id="valor"
              name="valor"
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              required
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit">Registrar Gasto</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}