'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRefresh } from '@/components/refresh-context';
import { actualizarCliente } from '@/presentation/actions/clientes';
import { obtenerSedesPorCliente } from '@/presentation/actions/sedes';
import { actualizarClienteSchema } from '@/presentation/validations/cliente.schema';
import { toast } from 'sonner';
import type { ClienteResponse, SedeResponse } from '@/presentation/dtos';
import { TipoCliente } from '@/domain/enums';
import { tipoClienteLabel } from '@/domain/labels';
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
import { CrearSedeDialog } from './crear-sede-dialog';
import { EditarSedeDialog } from './editar-sede-dialog';
import { Pencil, Plus } from 'lucide-react';

interface EditarClienteDialogProps {
  cliente: ClienteResponse;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditarClienteDialog({ cliente, open, onOpenChange }: EditarClienteDialogProps) {
  const refreshData = useRefresh();
  const [nombre, setNombre] = useState(cliente.nombre);
  const [valorDomicilio, setValorDomicilio] = useState(cliente.valorDomicilio ?? '');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [sedes, setSedes] = useState<SedeResponse[]>([]);
  const [crearSedeOpen, setCrearSedeOpen] = useState(false);
  const [editarSede, setEditarSede] = useState<SedeResponse | null>(null);

  const fetchSedes = useCallback(async () => {
    const result = await obtenerSedesPorCliente(cliente.id);
    if (result.success && result.sedes) {
      setSedes(result.sedes);
    }
  }, [cliente.id]);

  useEffect(() => {
    if (open) {
      fetchSedes();
    }
  }, [open, fetchSedes]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const result = actualizarClienteSchema.safeParse({
      id: cliente.id,
      nombre,
      valorDomicilio: valorDomicilio === '' ? undefined : valorDomicilio,
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
    formData.set('id', cliente.id);
    formData.set('nombre', nombre);
    formData.set('valorDomicilio', valorDomicilio || '0');
    const actionResult = await actualizarCliente(formData);
    if (actionResult.success) {
      toast.success('Cliente actualizado exitosamente');
      refreshData();
      onOpenChange(false);
    } else {
      toast.error(actionResult.error || 'Error al actualizar cliente');
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar Cliente</DialogTitle>
          <DialogDescription>
            Modifique los datos del cliente.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-nombre">Nombre</Label>
            <Input
              id="edit-nombre"
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
            <Label>Tipo</Label>
            <Input
              value={tipoClienteLabel[cliente.tipo as TipoCliente] ?? cliente.tipo}
              disabled
              className="bg-muted"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-valorDomicilio">Valor Domicilio ($)</Label>
            <Input
              id="edit-valorDomicilio"
              name="valorDomicilio"
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00 (opcional)"
              value={valorDomicilio}
              onChange={(e) => {
                setValorDomicilio(e.target.value);
                if (errors.valorDomicilio) setErrors(prev => { const next = {...prev}; delete next.valorDomicilio; return next; });
              }}
            />
            {errors.valorDomicilio && <p className="text-sm text-destructive">{errors.valorDomicilio}</p>}
          </div>

          {/* Sedes section */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Sedes</Label>
              <Button type="button" variant="outline" size="sm" onClick={() => setCrearSedeOpen(true)}>
                <Plus className="size-3.5 mr-1" />
                Agregar
              </Button>
            </div>
            {sedes.length === 0 ? (
              <p className="text-sm text-muted-foreground">No hay sedes registradas</p>
            ) : (
              <div className="space-y-1">
                {sedes.map((sede) => (
                  <div key={sede.id} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                    <div>
                      <span className="font-medium">{sede.nombre}</span>
                      {sede.esPrincipal && <span className="ml-1.5 text-xs text-muted-foreground">(Principal)</span>}
                      {sede.direccion && <span className="ml-2 text-muted-foreground">— {sede.direccion}</span>}
                    </div>
                    <Button type="button" variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setEditarSede(sede)}>
                      <Pencil className="size-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit">Guardar Cambios</Button>
          </div>
        </form>
      </DialogContent>

      {crearSedeOpen && (
        <CrearSedeDialog
          clienteId={cliente.id}
          open={crearSedeOpen}
          onOpenChange={(open) => {
            setCrearSedeOpen(open);
            if (!open) fetchSedes();
          }}
        />
      )}

      {editarSede && (
        <EditarSedeDialog
          sede={editarSede}
          open={editarSede !== null}
          onOpenChange={(open) => {
            if (!open) setEditarSede(null);
            fetchSedes();
          }}
        />
      )}
    </Dialog>
  );
}