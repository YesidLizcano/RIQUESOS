'use client';

import { useState } from 'react';
import { useRefresh } from '@/components/refresh-context';
import { crearCliente } from '@/presentation/actions/clientes';
import { crearClienteSchema } from '@/presentation/validations/cliente.schema';
import { toast } from 'sonner';
import { TipoCliente } from '@/domain/enums';
import { tipoClienteLabel } from '@/domain/labels';
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
  const [nombre, setNombre] = useState('');
  const [valorDomicilio, setValorDomicilio] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const result = crearClienteSchema.safeParse({
      nombre,
      tipo: tipo || undefined,
      valorDomicilio: valorDomicilio || undefined,
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
    formData.set('tipo', tipo);
    if (valorDomicilio) formData.set('valorDomicilio', valorDomicilio);
    const actionResult = await crearCliente(formData);
    if (actionResult.success) {
      toast.success('Cliente creado exitosamente');
      refreshData();
      setOpen(false);
      setTipo('');
      setNombre('');
      setValorDomicilio('');
    } else {
      toast.error(actionResult.error || 'Error al crear cliente');
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setTipo(''); setErrors({}); } }}>
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
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nombre">Nombre</Label>
            <Input
              id="nombre"
              name="nombre"
              placeholder="Nombre del cliente"
              value={nombre}
              onChange={(e) => {
                setNombre(e.target.value);
                if (errors.nombre) setErrors(prev => { const next = {...prev}; delete next.nombre; return next; });
              }}
            />
            {errors.nombre && <p className="text-sm text-destructive">{errors.nombre}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="tipo">Tipo de Cliente</Label>
            <Select name="tipo" value={tipo} onValueChange={(v) => {
              if (v !== null) setTipo(v);
              if (errors.tipo) setErrors(prev => { const next = {...prev}; delete next.tipo; return next; });
            }}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Seleccione tipo">{tipo ? (tipoClienteLabel[tipo as TipoCliente] ?? tipo) : 'Seleccione tipo'}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={TipoCliente.MAYORISTA}>Mayorista</SelectItem>
                <SelectItem value={TipoCliente.MINORISTA}>Minorista</SelectItem>
              </SelectContent>
            </Select>
            {errors.tipo && <p className="text-sm text-destructive">{errors.tipo}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="valorDomicilio">Valor Domicilio ($)</Label>
            <Input
              id="valorDomicilio"
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