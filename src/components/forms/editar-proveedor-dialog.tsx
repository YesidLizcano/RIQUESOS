'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { actualizarProveedor } from '@/presentation/actions/proveedores';
import { toast } from 'sonner';
import type { ProveedorResponse } from '@/presentation/dtos';
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

interface EditarProveedorDialogProps {
  proveedor: ProveedorResponse;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditarProveedorDialog({ proveedor, open, onOpenChange }: EditarProveedorDialogProps) {
  const router = useRouter();
  const [nombre, setNombre] = useState(proveedor.nombre);
  const [telefono, setTelefono] = useState(proveedor.telefono ?? '');

  async function action(formData: FormData) {
    const result = await actualizarProveedor(formData);
    if (result.success) {
      toast.success('Proveedor actualizado exitosamente');
      router.refresh();
      onOpenChange(false);
    } else {
      toast.error(result.error || 'Error al actualizar proveedor');
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar Proveedor</DialogTitle>
          <DialogDescription>
            Modifique los datos del proveedor.
          </DialogDescription>
        </DialogHeader>
        <form action={action} className="space-y-4">
          <input type="hidden" name="id" value={proveedor.id} />
          <div className="space-y-2">
            <Label htmlFor="edit-proveedor-nombre">Nombre</Label>
            <Input
              id="edit-proveedor-nombre"
              name="nombre"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-proveedor-telefono">Teléfono</Label>
            <Input
              id="edit-proveedor-telefono"
              name="telefono"
              placeholder="Teléfono (opcional)"
              value={telefono}
              onChange={(e) => setTelefono(e.target.value)}
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