'use client';

import { useState } from 'react';
import { useRefresh } from '@/components/refresh-context';
import { registrarVenta } from '@/presentation/actions/ventas';
import { toast } from 'sonner';
import { TipoProducto, TipoCliente } from '@/domain/enums';
import { DOBLE_CREMA_BLOCK_KG, bloquesCompletos, isDobleCrema } from '@/domain/constants';
import type { ClienteResponse, LoteResponse } from '@/presentation/dtos';
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

interface RegistrarVentaDialogProps {
  clientes: ClienteResponse[];
  lotes: LoteResponse[];
}

export function RegistrarVentaDialog({ clientes, lotes }: RegistrarVentaDialogProps) {
  const refreshData = useRefresh();
  const [open, setOpen] = useState(false);
  const [clienteId, setClienteId] = useState<string>('');
  const [loteId, setLoteId] = useState<string>('');
  const [cantidadInput, setCantidadInput] = useState<string>('');

  // Filter only active lotes
  const lotesActivos = lotes.filter((l) => l.estado === 'ACTIVO');

  // Find selected client and lote for price resolution
  const selectedCliente = clientes.find((c) => c.id === clienteId);
  const selectedLote = lotesActivos.find((l) => l.id === loteId);

  // Determine block mode: Doble Crema + Mayorista = bloques input
  const isDobleCremaLote = selectedLote ? isDobleCrema(selectedLote.producto) : false;
  const isMayorista = selectedCliente?.tipo === TipoCliente.MAYORISTA;
  const isBlockMode = isDobleCremaLote && isMayorista;

  // Convert UI input to kg value for submission
  const cantidadVendidaKg = isBlockMode
    ? String(parseFloat(cantidadInput || '0') * DOBLE_CREMA_BLOCK_KG || 0)
    : cantidadInput;

  // Resolve the selling price based on client type and product
  const resolvedPrice = (() => {
    if (!selectedCliente || !selectedLote) return null;

    if (selectedCliente.tipo === TipoCliente.MAYORISTA) {
      // Mayorista uses custom price if available
      if (selectedLote.producto === TipoProducto.DOBLE_CREMA && selectedCliente.precioDobleCrema) {
        return Number(selectedCliente.precioDobleCrema);
      }
      if (selectedLote.producto === TipoProducto.SEMISALADO && selectedCliente.precioSemisalado) {
        return Number(selectedCliente.precioSemisalado);
      }
    }
    // Minorista or Mayorista without custom price: use lote's base price as reference
    return null; // Must enter manually
  })();

  // Clear cantidad when switching between block/kg modes
  function handleClienteChange(v: string) {
    setClienteId(v);
    setCantidadInput('');
  }

  function handleLoteChange(v: string) {
    setLoteId(v);
    setCantidadInput('');
  }

  async function action(formData: FormData) {
    // Client-side validation: Doble Crema + Mayorista block constraint
    if (isBlockMode) {
      const bloques = parseFloat(cantidadInput);
      if (!isNaN(bloques) && !Number.isInteger(bloques)) {
        toast.error('Para Doble Crema mayorista, ingrese bloques enteros');
        return;
      }
    }
    // Set the kg value into the form data
    formData.set('cantidadVendidaKg', cantidadVendidaKg);
    const result = await registrarVenta(formData);
    if (result.success) {
      toast.success('Venta registrada exitosamente');
      refreshData();
      setOpen(false);
      setClienteId('');
      setLoteId('');
      setCantidadInput('');
    } else {
      toast.error(result.error || 'Error al registrar venta');
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" size="sm" />}>
        <PlusIcon className="size-4" />
        Registrar Venta
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Registrar Venta</DialogTitle>
          <DialogDescription>
            Complete los datos para registrar una nueva venta.
          </DialogDescription>
        </DialogHeader>
        <form action={action} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="clienteId">Cliente</Label>
            <Select name="clienteId" value={clienteId} onValueChange={(v) => v !== null && handleClienteChange(v)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Seleccione cliente" />
              </SelectTrigger>
              <SelectContent>
                {clientes.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.nombre} ({c.tipo})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="loteId">Lote</Label>
            <Select name="loteId" value={loteId} onValueChange={(v) => v !== null && handleLoteChange(v)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Seleccione lote" />
              </SelectTrigger>
              <SelectContent>
                {lotesActivos.map((l) => (
                  <SelectItem key={l.id} value={l.id}>
                    {isDobleCrema(l.producto)
                      ? `${l.producto === 'DOBLE_CREMA' ? 'Doble Crema' : 'Semisalado'} — ${bloquesCompletos(Number(l.stockDisponibleKg))} bloques disp.`
                      : `${l.producto === 'DOBLE_CREMA' ? 'Doble Crema' : 'Semisalado'} — ${Number(l.stockDisponibleKg).toLocaleString('es-AR')} Kg disp.`
                    }
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="cantidadVendidaKg">
              {isBlockMode ? 'Bloques' : 'Cantidad Vendida (Kg)'}
            </Label>
            <Input
              id="cantidadVendidaKg"
              name="cantidadVendidaKg"
              type="number"
              step={isBlockMode ? '1' : '0.01'}
              min={isBlockMode ? '1' : '0.01'}
              placeholder={isBlockMode ? 'Ej: 2' : '0'}
              value={cantidadInput}
              onChange={(e) => setCantidadInput(e.target.value)}
              required
            />
            {selectedLote && isBlockMode && (
              <>
                <p className="text-xs text-muted-foreground">
                  Bloques disponibles: {bloquesCompletos(Number(selectedLote.stockDisponibleKg))}
                </p>
                <p className="text-xs text-muted-foreground">
                  1 bloque = 2.5 kg
                </p>
              </>
            )}
            {selectedLote && isDobleCremaLote && !isBlockMode && (
              <p className="text-xs text-muted-foreground">
                Stock disponible: {Number(selectedLote.stockDisponibleKg).toLocaleString('es-AR')} kg ({bloquesCompletos(Number(selectedLote.stockDisponibleKg))} bloques completos)
              </p>
            )}
            {selectedLote && !isDobleCremaLote && (
              <p className="text-xs text-muted-foreground">
                Stock disponible: {Number(selectedLote.stockDisponibleKg).toLocaleString('es-AR')} Kg
              </p>
            )}
            {isBlockMode && cantidadInput && !isNaN(parseFloat(cantidadInput)) && (
              <p className="text-xs text-muted-foreground">
                Equivalente: {(parseFloat(cantidadInput) * DOBLE_CREMA_BLOCK_KG).toLocaleString('es-AR')} kg
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="standardPricePerKg">Precio de Venta ($/Kg)</Label>
            <Input
              id="standardPricePerKg"
              name="standardPricePerKg"
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              defaultValue={resolvedPrice !== null ? resolvedPrice : undefined}
              required
            />
            {resolvedPrice !== null && (
              <p className="text-xs text-muted-foreground">
                Precio sugerido según tipo de cliente: ${resolvedPrice.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
              </p>
            )}
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
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="domiciliario">Domiciliario</Label>
            <Input
              id="domiciliario"
              name="domiciliario"
              placeholder="Nombre del domiciliario (opcional)"
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit">Registrar Venta</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}