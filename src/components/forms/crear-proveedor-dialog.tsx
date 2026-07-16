'use client';

import { useState } from 'react';
import { useRefresh } from '@/components/refresh-context';
import { crearProveedor } from '@/presentation/actions/proveedores';
import { crearProveedorSchema } from '@/presentation/validations/proveedor.schema';
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

export function CrearProveedorDialog() {
  const refreshData = useRefresh();
  const [open, setOpen] = useState(false);
  const [nombre, setNombre] = useState('');
  const [telefono, setTelefono] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const result = crearProveedorSchema.safeParse({
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
    formData.set('nombre', nombre);
    if (telefono) formData.set('telefono', telefono);
    const actionResult = await crearProveedor(formData);
    if (actionResult.success) {
      toast.success('Proveedor creado exitosamente');
      refreshData();
      setOpen(false);
      setNombre('');
      setTelefono('');
    } else {
      toast.error(actionResult.error || 'Error al crear proveedor');
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" size="sm" />}>
        <PlusIcon className="size-4" />
        Agregar Proveedor
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nuevo Proveedor</DialogTitle>
          <DialogDescription>
            Complete los datos para registrar un nuevo proveedor.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nombre">Nombre</Label>
            <Input
              id="nombre"
              name="nombre"
              placeholder="Nombre del proveedor"
              value={nombre}
              onChange={(e) => {
                setNombre(e.target.value);
                if (errors.nombre) setErrors(prev => { const next = {...prev}; delete next.nombre; return next; });
              }}
            />
            {errors.nombre && <p className="text-sm text-destructive">{errors.nombre}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="telefono">Teléfono</Label>
            <Input
              id="telefono"
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
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit">Crear Proveedor</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}