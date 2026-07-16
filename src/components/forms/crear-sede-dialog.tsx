'use client';

import { useState } from 'react';
import { useRefresh } from '@/components/refresh-context';
import { crearSede } from '@/presentation/actions/sedes';
import { toast } from 'sonner';
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

interface CrearSedeDialogProps {
  clienteId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CrearSedeDialog({ clienteId, open, onOpenChange }: CrearSedeDialogProps) {
  const refreshData = useRefresh();
  const [nombre, setNombre] = useState('');
  const [direccion, setDireccion] = useState('');
  const [telefono, setTelefono] = useState('');
  const [esPrincipal, setEsPrincipal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!nombre.trim()) {
      toast.error('El nombre es obligatorio');
      return;
    }

    setSubmitting(true);
    try {
      const result = await crearSede({
        nombre: nombre.trim(),
        direccion: direccion.trim() || undefined,
        telefono: telefono.trim() || undefined,
        esPrincipal,
        clienteId,
      });

      if (result.success) {
        toast.success('Sede creada exitosamente');
        refreshData();
        onOpenChange(false);
        setNombre('');
        setDireccion('');
        setTelefono('');
        setEsPrincipal(false);
      } else {
        toast.error(result.error || 'Error al crear sede');
      }
    } catch (error) {
      toast.error('Error al crear sede');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nueva Sede</DialogTitle>
          <DialogDescription>
            Agregue una nueva sede/sucursal para este cliente.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="sede-nombre">Nombre *</Label>
            <Input
              id="sede-nombre"
              placeholder="Ej: Sucursal Centro"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="sede-direccion">Dirección</Label>
            <Input
              id="sede-direccion"
              placeholder="Dirección (opcional)"
              value={direccion}
              onChange={(e) => setDireccion(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="sede-telefono">Teléfono</Label>
            <Input
              id="sede-telefono"
              placeholder="Teléfono (opcional)"
              value={telefono}
              onChange={(e) => setTelefono(e.target.value)}
            />
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="sede-principal"
              checked={esPrincipal}
              onCheckedChange={(checked) => setEsPrincipal(checked === true)}
            />
            <Label htmlFor="sede-principal" className="text-sm font-normal">
              Marcar como sede principal
            </Label>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Creando...' : 'Crear Sede'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}