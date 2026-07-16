'use client';

import { useState } from 'react';
import { useRefresh } from '@/components/refresh-context';
import { actualizarSede, eliminarSede } from '@/presentation/actions/sedes';
import { toast } from 'sonner';
import type { SedeResponse } from '@/presentation/dtos';
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
import { Checkbox } from '@/components/ui/checkbox';
import { Trash2 } from 'lucide-react';

interface EditarSedeDialogProps {
  sede: SedeResponse;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditarSedeDialog({ sede, open, onOpenChange }: EditarSedeDialogProps) {
  const refreshData = useRefresh();
  const [nombre, setNombre] = useState(sede.nombre);
  const [direccion, setDireccion] = useState(sede.direccion ?? '');
  const [telefono, setTelefono] = useState(sede.telefono ?? '');
  const [esPrincipal, setEsPrincipal] = useState(sede.esPrincipal);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!nombre.trim()) {
      toast.error('El nombre es obligatorio');
      return;
    }

    setSubmitting(true);
    try {
      const result = await actualizarSede({
        id: sede.id,
        nombre: nombre.trim(),
        direccion: direccion.trim() || undefined,
        telefono: telefono.trim() || undefined,
        esPrincipal,
      });

      if (result.success) {
        toast.success('Sede actualizada exitosamente');
        refreshData();
        onOpenChange(false);
      } else {
        toast.error(result.error || 'Error al actualizar sede');
      }
    } catch (error) {
      toast.error('Error al actualizar sede');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!confirm(`¿Eliminar la sede "${sede.nombre}"?`)) return;

    setSubmitting(true);
    try {
      const result = await eliminarSede(sede.id);
      if (result.success) {
        toast.success('Sede eliminada exitosamente');
        refreshData();
        onOpenChange(false);
      } else {
        toast.error(result.error || 'Error al eliminar sede');
      }
    } catch (error) {
      toast.error('Error al eliminar sede');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar Sede</DialogTitle>
          <DialogDescription>
            Modifique los datos de la sede.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-sede-nombre">Nombre *</Label>
            <Input
              id="edit-sede-nombre"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-sede-direccion">Dirección</Label>
            <Input
              id="edit-sede-direccion"
              value={direccion}
              onChange={(e) => setDireccion(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-sede-telefono">Teléfono</Label>
            <Input
              id="edit-sede-telefono"
              value={telefono}
              onChange={(e) => setTelefono(e.target.value)}
            />
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="edit-sede-principal"
              checked={esPrincipal}
              onCheckedChange={(checked) => setEsPrincipal(checked === true)}
            />
            <Label htmlFor="edit-sede-principal" className="text-sm font-normal">
              Sede principal
            </Label>
          </div>
          <div className="flex justify-between">
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={handleDelete}
              disabled={submitting}
            >
              <Trash2 className="size-4 mr-1" />
              Eliminar
            </Button>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Guardando...' : 'Guardar Cambios'}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}