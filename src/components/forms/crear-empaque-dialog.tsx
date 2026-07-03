'use client';

import { useState } from 'react';
import { useRefresh } from '@/components/refresh-context';
import { crearEmpaque } from '@/presentation/actions/empaques';
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

export function CrearEmpaqueDialog() {
  const refreshData = useRefresh();
  const [open, setOpen] = useState(false);
  const [tipo, setTipo] = useState('');
  const [stock, setStock] = useState('');
  const [precio, setPrecio] = useState('');

  async function action(formData: FormData) {
    const result = await crearEmpaque(formData);
    if (result.success) {
      toast.success('Empaque creado exitosamente');
      refreshData();
      setOpen(false);
      setTipo('');
      setStock('');
      setPrecio('');
    } else {
      toast.error(result.error || 'Error al crear empaque');
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" size="sm" />}>
        <PlusIcon className="size-4" />
        Agregar Empaque
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nuevo Empaque</DialogTitle>
          <DialogDescription>
            Registre un tipo de empaque para el inventario.
          </DialogDescription>
        </DialogHeader>
        <form action={action} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="tipo">Tipo de Empaque</Label>
            <Input
              id="tipo"
              name="tipo"
              placeholder="Ej: Bolsa, Caja, Balde"
              value={tipo}
              onChange={(e) => setTipo(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="stock">Stock Inicial</Label>
            <Input
              id="stock"
              name="stock"
              type="number"
              step="1"
              min="0"
              placeholder="0"
              value={stock}
              onChange={(e) => setStock(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="precio">Precio ($)</Label>
            <Input
              id="precio"
              name="precio"
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              value={precio}
              onChange={(e) => setPrecio(e.target.value)}
              required
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit">Crear Empaque</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}