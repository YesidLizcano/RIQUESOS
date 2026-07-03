'use client';

import { useState, useEffect } from 'react';
import { useRefresh } from '@/components/refresh-context';
import { registrarVenta } from '@/presentation/actions/ventas';
import { toast } from 'sonner';
import { TipoProducto, TipoCliente } from '@/domain/enums';
import { DOBLE_CREMA_BLOCK_KG, bloquesCompletos, isDobleCrema } from '@/domain/constants';
import type { ClienteResponse, LoteResponse, VentaTipo } from '@/presentation/dtos';
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
  const [bloquesEnteros, setBloquesEnteros] = useState<string>('');
  const [bloquesTajados, setBloquesTajados] = useState<string>('');
  const [cantidadInput, setCantidadInput] = useState<string>('');
  const [ventaTipo, setVentaTipo] = useState<VentaTipo>('GRANEL');
  const [bloquesReempacados, setBloquesReempacados] = useState<string>('');
  const [precioVenta, setPrecioVenta] = useState<string>('');

  // Filter only active lotes WITH stock
  const lotesConStock = lotes.filter((l) => l.estado === 'ACTIVO' && Number(l.stockDisponibleKg) > 0);

  // Find selected client and lote for price resolution
  const selectedCliente = clientes.find((c) => c.id === clienteId);
  const selectedLote = lotesConStock.find((l) => l.id === loteId);

  const isMayorista = selectedCliente?.tipo === TipoCliente.MAYORISTA;
  const isDobleCremaLote = selectedLote ? isDobleCrema(selectedLote.producto) : false;

  // Auto-determine venta tipo based on client and product
  // Mayorista + DC → force BLOQUES (hide selector)
  // Minorista + DC → show selector (BLOQUES or GRANEL)
  // Semisalado → force GRANEL (hide selector)
  const showTipoSelector = !isMayorista && isDobleCremaLote && !!selectedCliente && !!selectedLote;
  const effectiveVentaTipo: VentaTipo = (() => {
    if (!selectedCliente || !selectedLote) return 'GRANEL';
    if (isMayorista && isDobleCremaLote) return 'BLOQUES';
    if (!isDobleCremaLote) return 'GRANEL';
    return ventaTipo; // Minorista + DC: user choice
  })();

  const isBlockMode = effectiveVentaTipo === 'BLOQUES';

  // Convert UI input to kg for submission
  const totalBloques = (parseInt(bloquesEnteros) || 0) + (parseInt(bloquesTajados) || 0);
  const cantidadVendidaKg = isBlockMode
    ? String(totalBloques * DOBLE_CREMA_BLOCK_KG || 0)
    : cantidadInput;

  // Resolve the selling price based on client type and product
  const resolvedPrice = (() => {
    if (!selectedCliente || !selectedLote) return null;

    if (selectedCliente.tipo === TipoCliente.MAYORISTA) {
      if (selectedLote.producto === TipoProducto.DOBLE_CREMA && selectedCliente.precioDobleCrema) {
        return Number(selectedCliente.precioDobleCrema);
      }
      if (selectedLote.producto === TipoProducto.SEMISALADO && selectedCliente.precioSemisalado) {
        return Number(selectedCliente.precioSemisalado);
      }
    }
    return null;
  })();

  // Auto-fill price when client/lote selection resolves a price
  useEffect(() => {
    if (resolvedPrice !== null) {
      setPrecioVenta(String(resolvedPrice));
    }
  }, [resolvedPrice]);

  // Lote filter: Mayorista should only see DC lotes
  const filteredLotes = isMayorista
    ? lotesConStock.filter((l) => isDobleCrema(l.producto))
    : lotesConStock;

  // Clear quantity when changing type
  function handleClienteChange(v: string) {
    setClienteId(v);
    setCantidadInput('');
    setBloquesEnteros('');
    setBloquesTajados('');
    setBloquesReempacados('');
    setPrecioVenta('');
  }

  function handleLoteChange(v: string) {
    setLoteId(v);
    setCantidadInput('');
    setBloquesEnteros('');
    setBloquesTajados('');
    setBloquesReempacados('');
    setPrecioVenta('');
  }

  function handleVentaTipoChange(tipo: VentaTipo) {
    setVentaTipo(tipo);
    setCantidadInput('');
    setBloquesEnteros('');
    setBloquesTajados('');
    setBloquesReempacados('');
  }

  async function action(formData: FormData) {
    // Client-side validation for block mode
    if (isBlockMode) {
      const enteros = parseInt(bloquesEnteros) || 0;
      const tajados = parseInt(bloquesTajados) || 0;
      if (enteros + tajados <= 0) {
        toast.error('Ingrese al menos un bloque');
        return;
      }
      if (selectedLote) {
        if (enteros > selectedLote.bloquesEnteros) {
          toast.error(`Solo hay ${selectedLote.bloquesEnteros} bloques enteros disponibles`);
          return;
        }
        if (tajados > selectedLote.bloquesTajadosDisponibles) {
          toast.error(`Solo hay ${selectedLote.bloquesTajadosDisponibles} bloques tajados disponibles`);
          return;
        }
      }
      const reempacados = parseInt(bloquesReempacados) || 0;
      if (reempacados > enteros + tajados) {
        toast.error('Los reempacados no pueden superar los bloques vendidos');
        return;
      }
    }

    formData.set('cantidadVendidaKg', cantidadVendidaKg);
    formData.set('ventaTipo', effectiveVentaTipo);
    formData.set('bloquesReempacados', bloquesReempacados || '0');
    const result = await registrarVenta(formData);
    if (result.success) {
      toast.success('Venta registrada exitosamente');
      refreshData();
      setOpen(false);
      setClienteId('');
      setLoteId('');
      setCantidadInput('');
      setVentaTipo('GRANEL');
      setBloquesEnteros('');
      setBloquesTajados('');
      setBloquesReempacados('');
      setPrecioVenta('');
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
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Registrar Venta</DialogTitle>
          <DialogDescription>
            Complete los datos para registrar una nueva venta.
          </DialogDescription>
        </DialogHeader>
        <form action={action} className="space-y-4">

          {/* Cliente */}
          <div className="space-y-2">
            <Label htmlFor="clienteId">Cliente</Label>
            <Select name="clienteId" value={clienteId} onValueChange={(v) => v !== null && handleClienteChange(v)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Seleccione cliente" />
              </SelectTrigger>
              <SelectContent>
                {clientes.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.nombre} ({c.tipo === 'MAYORISTA' ? 'Mayorista' : 'Minorista'})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {isMayorista && (
              <p className="text-xs text-blue-600 dark:text-blue-400">
                Cliente mayorista — venta por bloques
              </p>
            )}
          </div>

          {/* Lote — filtered by client type and stock */}
          <div className="space-y-2">
            <Label htmlFor="loteId">Lote</Label>
            <Select name="loteId" value={loteId} onValueChange={(v) => v !== null && handleLoteChange(v)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Seleccione lote" />
              </SelectTrigger>
              <SelectContent>
                {filteredLotes.map((l) => (
                  <SelectItem key={l.id} value={l.id}>
                    {isDobleCrema(l.producto)
                      ? `${l.producto === 'DOBLE_CREMA' ? 'Doble Crema' : 'Semisalado'} — ${l.bloquesEnteros} ent. / ${l.bloquesTajadosDisponibles} taj. (${Number(l.stockDisponibleKg).toLocaleString('es-AR')} kg)`
                      : `${l.producto === 'DOBLE_CREMA' ? 'Doble Crema' : 'Semisalado'} — ${Number(l.stockDisponibleKg).toLocaleString('es-AR')} kg disp.`
                    }
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Tipo de Venta — only for Minorista + Doble Crema */}
          {showTipoSelector && (
            <div className="space-y-2">
              <Label>Tipo de Venta</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={ventaTipo === 'BLOQUES' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleVentaTipoChange('BLOQUES')}
                >
                  Por Bloques
                </Button>
                <Button
                  type="button"
                  variant={ventaTipo === 'GRANEL' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleVentaTipoChange('GRANEL')}
                >
                  Al Granel (Kg)
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                {ventaTipo === 'BLOQUES' ? 'Venta por bloques enteros de 2.5 kg' : 'Venta por peso, cualquier cantidad'}
              </p>
            </div>
          )}

          {/* Block mode: enteros + tajados inputs */}
          {isBlockMode && selectedLote && (
            <>
              <div className="rounded-lg bg-muted/50 p-3 space-y-1">
                <p className="text-sm font-medium">Stock del lote</p>
                <p className="text-xs text-muted-foreground">
                  Bloques enteros: {selectedLote.bloquesEnteros} | Bloques tajados: {selectedLote.bloquesTajadosDisponibles} | Total: {Number(selectedLote.stockDisponibleKg).toLocaleString('es-AR')} kg
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="bloquesEnteros">Bloques Enteros</Label>
                  <Input
                    id="bloquesEnteros"
                    type="number"
                    step="1"
                    min="0"
                    max={String(selectedLote.bloquesEnteros)}
                    placeholder="0"
                    value={bloquesEnteros}
                    onChange={(e) => setBloquesEnteros(e.target.value)}
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Disp.: {selectedLote.bloquesEnteros}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bloquesTajados">Bloques Tajados</Label>
                  <Input
                    id="bloquesTajados"
                    type="number"
                    step="1"
                    min="0"
                    max={String(selectedLote.bloquesTajadosDisponibles)}
                    placeholder="0"
                    value={bloquesTajados}
                    onChange={(e) => setBloquesTajados(e.target.value)}
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Disp.: {selectedLote.bloquesTajadosDisponibles}
                  </p>
                </div>
              </div>
              {totalBloques > 0 && (
                <p className="text-xs text-muted-foreground">
                  Total: {totalBloques} bloques = {(totalBloques * DOBLE_CREMA_BLOCK_KG).toLocaleString('es-AR')} kg
                </p>
              )}
              <div className="space-y-2">
                <Label htmlFor="bloquesReempacados">Bloques Reempacados</Label>
                <Input
                  id="bloquesReempacados"
                  name="bloquesReempacados"
                  type="number"
                  step="1"
                  min="0"
                  max={String(totalBloques || '0')}
                  placeholder="0"
                  value={bloquesReempacados}
                  onChange={(e) => setBloquesReempacados(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Cada bloque reempacado descuenta 1 empaque del inventario
                </p>
              </div>
              <input type="hidden" name="cantidadVendidaKg" value={cantidadVendidaKg} />
              <input type="hidden" name="ventaTipo" value={effectiveVentaTipo} />
            </>
          )}

          {/* Granel mode: kg input */}
          {!isBlockMode && (
            <div className="space-y-2">
              <Label htmlFor="cantidadVendidaKg">Cantidad (Kg)</Label>
              <Input
                id="cantidadVendidaKg"
                name="cantidadVendidaKg"
                type="number"
                step="0.01"
                min="0.01"
                placeholder="0"
                value={cantidadInput}
                onChange={(e) => setCantidadInput(e.target.value)}
                required
              />
              {selectedLote && isDobleCremaLote && (
                <p className="text-xs text-muted-foreground">
                  Stock disponible: {Number(selectedLote.stockDisponibleKg).toLocaleString('es-AR')} kg ({bloquesCompletos(Number(selectedLote.stockDisponibleKg))} bloques completos)
                </p>
              )}
              {selectedLote && !isDobleCremaLote && (
                <p className="text-xs text-muted-foreground">
                  Stock disponible: {Number(selectedLote.stockDisponibleKg).toLocaleString('es-AR')} kg
                </p>
              )}
              <input type="hidden" name="ventaTipo" value={effectiveVentaTipo} />
              <input type="hidden" name="bloquesReempacados" value="0" />
            </div>
          )}

          {/* Precio */}
          <div className="space-y-2">
            <Label htmlFor="standardPricePerKg">Precio de Venta ($/Kg)</Label>
            <Input
              id="standardPricePerKg"
              name="standardPricePerKg"
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              value={precioVenta}
              onChange={(e) => setPrecioVenta(e.target.value)}
              required
            />
            {resolvedPrice !== null && (
              <p className="text-xs text-muted-foreground">
                Precio sugerido según tipo de cliente: ${resolvedPrice.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
              </p>
            )}
            {isBlockMode && (
              <p className="text-xs text-muted-foreground">
                El precio es por kilogramo — el total se calcula automáticamente
              </p>
            )}
          </div>

          {/* Domicilio */}
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