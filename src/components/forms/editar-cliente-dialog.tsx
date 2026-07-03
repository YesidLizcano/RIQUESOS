'use client';

import { useState } from 'react';
import { useRefresh } from '@/components/refresh-context';
import { actualizarCliente } from '@/presentation/actions/clientes';
import { toast } from 'sonner';
import type { ClienteResponse } from '@/presentation/dtos';
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

interface EditarClienteDialogProps {
  cliente: ClienteResponse;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditarClienteDialog({ cliente, open, onOpenChange }: EditarClienteDialogProps) {
  const refreshData = useRefresh();
  const [nombre, setNombre] = useState(cliente.nombre);
  const [precioDobleCrema, setPrecioDobleCrema] = useState(cliente.precioDobleCrema ?? '');
  const [precioSemisalado, setPrecioSemisalado] = useState(cliente.precioSemisalado ?? '');

  async function action(formData: FormData) {
    const result = await actualizarCliente(formData);
    if (result.success) {
      toast.success('Cliente actualizado exitosamente');
      refreshData();
      onOpenChange(false);
    } else {
      toast.error(result.error || 'Error al actualizar cliente');
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
        <form action={action} className="space-y-4">
          <input type="hidden" name="id" value={cliente.id} />
          <div className="space-y-2">
            <Label htmlFor="edit-nombre">Nombre</Label>
            <Input
              id="edit-nombre"
              name="nombre"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label>Tipo</Label>
            <Input
              value={tipoClienteLabel[cliente.tipo as TipoCliente] ?? cliente.tipo}
              disabled
              className="bg-muted"
            />
          </div>
          {cliente.tipo === 'MAYORISTA' && (
            <>
              <div className="space-y-2">
                <Label htmlFor="edit-precioDobleCrema">Precio Doble Crema ($/Kg)</Label>
                <Input
                  id="edit-precioDobleCrema"
                  name="precioDobleCrema"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={precioDobleCrema}
                  onChange={(e) => setPrecioDobleCrema(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-precioSemisalado">Precio Semisalado ($/Kg)</Label>
                <Input
                  id="edit-precioSemisalado"
                  name="precioSemisalado"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={precioSemisalado}
                  onChange={(e) => setPrecioSemisalado(e.target.value)}
                />
              </div>
            </>
          )}
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