'use client';

import { useState } from 'react';
import { useRefresh } from '@/components/refresh-context';
import { crearCliente } from '@/presentation/actions/clientes';
import { toast } from 'sonner';
import { TipoCliente } from '@/domain/enums';
import type { ClienteResponse } from '@/presentation/dtos';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PlusIcon } from 'lucide-react';

interface CrearClienteDialogProps {
  clientes?: ClienteResponse[];
}

export function CrearClienteDialog({}: CrearClienteDialogProps) {
  const refreshData = useRefresh();
  const [open, setOpen] = useState(false);
  const [tipo, setTipo] = useState<string>('');

  const isMayorista = tipo === TipoCliente.MAYORISTA;

  async function action(formData: FormData) {
    const result = await crearCliente(formData);
    if (result.success) {
      toast.success('Cliente creado exitosamente');
      refreshData();
      setOpen(false);
      setTipo('');
    } else {
      toast.error(result.error || 'Error al crear cliente');
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setTipo(''); }}>
      <DialogTrigger render={<Button variant="outline" size="sm" />}>
        <PlusIcon className="size-4" />
        Agregar Cliente
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nuevo Cliente</DialogTitle>
          <DialogDescription>
            Complete los datos para registrar un nuevo cliente.
          </DialogDescription>
        </DialogHeader>
        <form action={action} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nombre">Nombre</Label>
            <Input
              id="nombre"
              name="nombre"
              placeholder="Nombre del cliente"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="tipo">Tipo de Cliente</Label>
            <Select name="tipo" value={tipo} onValueChange={(v) => v !== null && setTipo(v)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Seleccione tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={TipoCliente.MAYORISTA}>Mayorista</SelectItem>
                <SelectItem value={TipoCliente.MINORISTA}>Minorista</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {isMayorista && (
            <>
              <div className="space-y-2">
                <Label htmlFor="precioDobleCrema">Precio Doble Crema ($/Kg)</Label>
                <Input
                  id="precioDobleCrema"
                  name="precioDobleCrema"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="precioSemisalado">Precio Semisalado ($/Kg)</Label>
                <Input
                  id="precioSemisalado"
                  name="precioSemisalado"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                />
              </div>
            </>
          )}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => { setOpen(false); setTipo(''); }}>
              Cancelar
            </Button>
            <Button type="submit">Crear Cliente</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}