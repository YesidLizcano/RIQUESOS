'use client';

import { useState } from 'react';
import { useRefresh } from '@/components/refresh-context';
import { actualizarProveedor } from '@/presentation/actions/proveedores';
import { actualizarProveedorSchema } from '@/presentation/validations/proveedor.schema';
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
  const refreshData = useRefresh();
  const [nombre, setNombre] = useState(proveedor.nombre);
  const [telefono, setTelefono] = useState(proveedor.telefono ?? '');
  const [errors, setErrors] = useState<Record<string, string>>({});

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const result = actualizarProveedorSchema.safeParse({
      id: proveedor.id,
      nombre,
      telefono: telefono || undefined,
    });

    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of result.error.issues) {
        const field = issue.path[0]?.toString();
        if (field && !fieldErrors[field]) {
          fieldErrors[field] = issue.message;
        }
      }
      setErrors(fieldErrors);
      toast.error(fieldErrors[Object.keys(fieldErrors)[0]] || 'Error de validación');
      return;
    }

    setErrors({});
    const formData = new FormData();
    formData.set('id', proveedor.id);
    formData.set('nombre', nombre);
    if (telefono) formData.set('telefono', telefono);
    const actionResult = await actualizarProveedor(formData);
    if (actionResult.success) {
      toast.success('Proveedor actualizado exitosamente');
      refreshData();
      onOpenChange(false);
    } else {
      toast.error(actionResult.error || 'Error al actualizar proveedor');
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
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-proveedor-nombre">Nombre</Label>
            <Input
              id="edit-proveedor-nombre"
              name="nombre"
              value={nombre}
              onChange={(e) => {
                setNombre(e.target.value);
                if (errors.nombre) setErrors(prev => { const next = {...prev}; delete next.nombre; return next; });
              }}
            />
            {errors.nombre && <p className="text-sm text-destructive">{errors.nombre}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-proveedor-telefono">Teléfono</Label>
            <Input
              id="edit-proveedor-telefono"
              name="telefono"
              placeholder="Teléfono (opcional)"
              value={telefono}
              onChange={(e) => {
                setTelefono(e.target.value);
                if (errors.telefono) setErrors(prev => { const next = {...prev}; delete next.telefono; return next; });
              }}
            />
            {errors.telefono && <p className="text-sm text-destructive">{errors.telefono}</p>}
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