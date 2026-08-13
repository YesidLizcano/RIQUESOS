'use client';

import { useState } from 'react';
import { useRefresh } from '@/components/refresh-context';
import { crearCliente } from '@/presentation/actions/clientes';
import { crearSede } from '@/presentation/actions/sedes';
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
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PlusIcon, XIcon } from 'lucide-react';

interface PendingSede {
  nombre: string;
  direccion: string;
  telefono: string;
  esPrincipal: boolean;
}

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
  const [pendingSedes, setPendingSedes] = useState<PendingSede[]>([]);
  const [addingSede, setAddingSede] = useState(false);
  const [sedeNombre, setSedeNombre] = useState('');
  const [sedeDireccion, setSedeDireccion] = useState('');
  const [sedeTelefono, setSedeTelefono] = useState('');
  const [sedeEsPrincipal, setSedeEsPrincipal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  function resetSedeForm() {
    setSedeNombre('');
    setSedeDireccion('');
    setSedeTelefono('');
    setSedeEsPrincipal(false);
    setAddingSede(false);
  }

  function resetForm() {
    setTipo('');
    setNombre('');
    setValorDomicilio('');
    setErrors({});
    setPendingSedes([]);
    resetSedeForm();
  }

  function handleAddSede() {
    if (!sedeNombre.trim()) {
      toast.error('El nombre de la sede es obligatorio');
      return;
    }
    setPendingSedes(prev => [...prev, {
      nombre: sedeNombre.trim(),
      direccion: sedeDireccion.trim(),
      telefono: sedeTelefono.trim(),
      esPrincipal: sedeEsPrincipal,
    }]);
    resetSedeForm();
  }

  function handleRemoveSede(index: number) {
    setPendingSedes(prev => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const result = crearClienteSchema.safeParse({
      nombre,
      tipo: tipo || undefined,
      valorDomicilio: valorDomicilio !== '' ? valorDomicilio : undefined,
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
    setSubmitting(true);
    const formData = new FormData();
    formData.set('nombre', nombre);
    formData.set('tipo', tipo);
    formData.set('valorDomicilio', valorDomicilio || '0');
    const actionResult = await crearCliente(formData);
    if (actionResult.success && actionResult.cliente) {
      const clienteId = actionResult.cliente.id;
      if (pendingSedes.length > 0) {
        let sedeErrors = 0;
        for (const sede of pendingSedes) {
          const sedeResult = await crearSede({
            nombre: sede.nombre,
            direccion: sede.direccion || undefined,
            telefono: sede.telefono || undefined,
            esPrincipal: sede.esPrincipal,
            clienteId,
          });
          if (!sedeResult.success) {
            sedeErrors++;
          }
        }
        if (sedeErrors > 0) {
          toast.success(`Cliente creado. ${pendingSedes.length - sedeErrors} de ${pendingSedes.length} sedes creadas.`);
        } else {
          toast.success('Cliente y sedes creados exitosamente');
        }
      } else {
        toast.success('Cliente creado exitosamente');
      }
      refreshData();
      setOpen(false);
      resetForm();
    } else {
      toast.error(actionResult.error || 'Error al crear cliente');
    }
    setSubmitting(false);
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
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

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Sedes</Label>
              {!addingSede && (
                <Button type="button" variant="outline" size="sm" onClick={() => setAddingSede(true)}>
                  <PlusIcon className="size-3.5 mr-1" />
                  Agregar Sede
                </Button>
              )}
            </div>
            {addingSede && (
              <div className="space-y-3 rounded-md border p-3">
                <div className="space-y-2">
                  <Label htmlFor="sede-nombre">Nombre *</Label>
                  <Input
                    id="sede-nombre"
                    placeholder="Ej: Sucursal Centro"
                    value={sedeNombre}
                    onChange={(e) => setSedeNombre(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sede-direccion">Dirección</Label>
                  <Input
                    id="sede-direccion"
                    placeholder="Dirección (opcional)"
                    value={sedeDireccion}
                    onChange={(e) => setSedeDireccion(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sede-telefono">Teléfono</Label>
                  <Input
                    id="sede-telefono"
                    placeholder="Teléfono (opcional)"
                    value={sedeTelefono}
                    onChange={(e) => setSedeTelefono(e.target.value)}
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="sede-principal"
                    checked={sedeEsPrincipal}
                    onCheckedChange={(checked) => setSedeEsPrincipal(checked === true)}
                  />
                  <Label htmlFor="sede-principal" className="text-sm font-normal">
                    Marcar como sede principal
                  </Label>
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={resetSedeForm}>
                    Cancelar
                  </Button>
                  <Button type="button" size="sm" onClick={handleAddSede}>
                    Confirmar
                  </Button>
                </div>
              </div>
            )}
            {pendingSedes.length > 0 && (
              <div className="space-y-1">
                {pendingSedes.map((sede, index) => (
                  <div key={index} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                    <div>
                      <span className="font-medium">{sede.nombre}</span>
                      {sede.esPrincipal && <span className="ml-1.5 text-xs text-muted-foreground">(Principal)</span>}
                      {sede.direccion && <span className="ml-2 text-muted-foreground">— {sede.direccion}</span>}
                    </div>
                    <Button type="button" variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => handleRemoveSede(index)}>
                      <XIcon className="size-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
            {!addingSede && pendingSedes.length === 0 && (
              <p className="text-sm text-muted-foreground">No hay sedes agregadas</p>
            )}
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => { setOpen(false); resetForm(); }}>
              Cancelar
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Creando...' : 'Crear Cliente'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}