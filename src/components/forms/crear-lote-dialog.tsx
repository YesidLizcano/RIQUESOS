'use client';

import { useState } from 'react';
import { useRefresh } from '@/components/refresh-context';
import { crearLote } from '@/presentation/actions/lotes';
import { toast } from 'sonner';
import { TipoProducto } from '@/domain/enums';
import type { ProveedorResponse } from '@/presentation/dtos';
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

interface CrearLoteDialogProps {
  proveedores: ProveedorResponse[];
}

export function CrearLoteDialog({ proveedores }: CrearLoteDialogProps) {
  const refreshData = useRefresh();
  const [open, setOpen] = useState(false);
  const [producto, setProducto] = useState<string>('');
  const [proveedorId, setProveedorId] = useState<string>('');
  const [cantidadCompradaKg, setCantidadCompradaKg] = useState<string>('');
  const [precioCompraBaseKg, setPrecioCompraBaseKg] = useState<string>('');
  const [costoFlete, setCostoFlete] = useState<string>('');
  const [costoTajado, setCostoTajado] = useState<string>('');
  const [costoEmpaques, setCostoEmpaques] = useState<string>('');

  // Compute costo real calculado preview
  const costoRealCalculadoKg = (() => {
    const cantidad = parseFloat(cantidadCompradaKg);
    const precioBase = parseFloat(precioCompraBaseKg);
    const flete = parseFloat(costoFlete) || 0;
    const tajado = parseFloat(costoTajado) || 0;
    const empaques = parseFloat(costoEmpaques) || 0;

    if (!cantidad || cantidad <= 0 || isNaN(precioBase)) return null;

    const costoTotal = (precioBase * cantidad) + flete + tajado + empaques;
    return costoTotal / cantidad;
  })();

  async function action(formData: FormData) {
    const result = await crearLote(formData);
    if (result.success) {
      toast.success('Lote creado exitosamente');
      refreshData();
      setOpen(false);
      setProducto('');
      setProveedorId('');
      setCantidadCompradaKg('');
      setPrecioCompraBaseKg('');
      setCostoFlete('');
      setCostoTajado('');
      setCostoEmpaques('');
    } else {
      toast.error(result.error || 'Error al crear lote');
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" size="sm" />}>
        <PlusIcon className="size-4" />
        Agregar Lote
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nuevo Lote</DialogTitle>
          <DialogDescription>
            Complete los datos para registrar un nuevo lote de queso.
          </DialogDescription>
        </DialogHeader>
        <form action={action} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="producto">Tipo de Producto</Label>
            <Select name="producto" value={producto} onValueChange={(v) => v !== null && setProducto(v)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Seleccione producto" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={TipoProducto.DOBLE_CREMA}>Doble Crema</SelectItem>
                <SelectItem value={TipoProducto.SEMISALADO}>Semisalado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="proveedorId">Proveedor</Label>
            <Select name="proveedorId" value={proveedorId} onValueChange={(v) => v !== null && setProveedorId(v)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Seleccione proveedor" />
              </SelectTrigger>
              <SelectContent>
                {proveedores.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="cantidadCompradaKg">Cantidad Comprada (Kg)</Label>
            <Input
              id="cantidadCompradaKg"
              name="cantidadCompradaKg"
              type="number"
              step="0.01"
              min="0.01"
              placeholder="0"
              value={cantidadCompradaKg}
              onChange={(e) => setCantidadCompradaKg(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="precioCompraBaseKg">Precio Compra Base ($/Kg)</Label>
            <Input
              id="precioCompraBaseKg"
              name="precioCompraBaseKg"
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              value={precioCompraBaseKg}
              onChange={(e) => setPrecioCompraBaseKg(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="costoFlete">Costo Flete ($)</Label>
            <Input
              id="costoFlete"
              name="costoFlete"
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              value={costoFlete}
              onChange={(e) => setCostoFlete(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="costoTajado">Costo Tajado ($)</Label>
            <Input
              id="costoTajado"
              name="costoTajado"
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              value={costoTajado}
              onChange={(e) => setCostoTajado(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="costoEmpaques">Costo Empaques ($)</Label>
            <Input
              id="costoEmpaques"
              name="costoEmpaques"
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              value={costoEmpaques}
              onChange={(e) => setCostoEmpaques(e.target.value)}
            />
          </div>

          {costoRealCalculadoKg !== null && !isNaN(costoRealCalculadoKg) && (
            <div className="rounded-lg bg-muted p-3">
              <p className="text-sm text-muted-foreground">Costo Real Calculado por Kg:</p>
              <p className="text-lg font-semibold">
                ${costoRealCalculadoKg.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit">Crear Lote</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}