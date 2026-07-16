'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
import { registrarAbonoPago, getAbonosByVenta } from '@/presentation/actions/abono-pago';
import { useRefresh } from '@/components/refresh-context';
import { MetodoPago } from '@/domain/enums';
import { metodoPagoLabel } from '@/domain/labels';
import { toast } from 'sonner';

/**
 * Subtract two decimal strings without floating-point errors.
 * Returns a decimal string (e.g. "12345.67").
 */
function subtractDecimals(a: string, b: string): string {
  const aParts = a.split('.');
  const bParts = b.split('.');
  const aWhole = aParts[0] ?? '0';
  const aFrac = (aParts[1] ?? '').padEnd(2, '0').slice(0, 2);
  const bWhole = bParts[0] ?? '0';
  const bFrac = (bParts[1] ?? '').padEnd(2, '0').slice(0, 2);
  const aCents = BigInt(aWhole + aFrac);
  const bCents = BigInt(bWhole + bFrac);
  const diffCents = aCents - bCents;
  const neg = diffCents < BigInt(0);
  const abs = neg ? -diffCents : diffCents;
  const absStr = abs.toString().padStart(3, '0');
  const whole = absStr.slice(0, -2) || '0';
  const frac = absStr.slice(-2);
  const result = frac === '00' ? whole : `${whole}.${frac}`;
  return neg ? `-${result}` : result;
}

/**
 * Compare two decimal strings. Returns negative if a < b, 0 if equal, positive if a > b.
 */
function compareDecimals(a: string, b: string): number {
  const diff = subtractDecimals(a, b);
  if (diff.startsWith('-')) return -1;
  if (diff === '0') return 0;
  return 1;
}

interface AbonoPagoDialogProps {
  ventaId: string;
  ingresoTotal: string;
  abonoActual: string;
  clienteNombre?: string;
  open?: boolean;
  onClose?: () => void;
  trigger?: React.ReactNode;
}

interface AbonoPagoResponse {
  id: string;
  ventaId: string;
  monto: string;
  metodoPago: string;
  observacion: string | null;
  fecha: string;
}

const metodoPagoLabels = metodoPagoLabel;

function formatCurrency(value: number): string {
  return `$${value.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function AbonoPagoDialog({ ventaId, ingresoTotal, abonoActual, clienteNombre, open: externalOpen, onClose, trigger }: AbonoPagoDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isOpen = externalOpen ?? internalOpen;
  const setIsOpen = onClose ? (v: boolean) => { if (!v) onClose(); } : setInternalOpen;
  const [abonos, setAbonos] = useState<AbonoPagoResponse[]>([]);
  const [monto, setMonto] = useState('');
  const [metodoPago, setMetodoPago] = useState<string>('EFECTIVO');
  const [observacion, setObservacion] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(false);
  const refreshData = useRefresh();

  const saldo = subtractDecimals(ingresoTotal, abonoActual);
  const saldoPositive = !saldo.startsWith('-') && saldo !== '0';

  const loadAbonos = useCallback(async () => {
    setLoading(true);
    const result = await getAbonosByVenta(ventaId);
    if (result.success) {
      setAbonos(result.abonos);
    }
    setLoading(false);
  }, [ventaId]);

  useEffect(() => {
    if (isOpen) {
      loadAbonos();
      setMonto('');
      setMetodoPago('EFECTIVO');
      setObservacion('');
    }
  }, [isOpen, loadAbonos]);

  async function handleSubmit() {
    const montoNum = Number(monto);
    if (!montoNum || montoNum <= 0) {
      toast.error('Ingrese un monto válido');
      return;
    }
    if (compareDecimals(monto, saldo) > 0) {
      toast.error(`El monto no puede exceder el saldo pendiente ($${Number(saldo).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})`);
      return;
    }

    setSubmitting(true);
    try {
      const result = await registrarAbonoPago({
        ventaId,
        monto: String(montoNum),
        metodoPago,
        observacion: observacion || undefined,
      });

      if (result.success) {
        toast.success('Abono registrado exitosamente');
        setMonto('');
        setObservacion('');
        await loadAbonos();
        refreshData();
        setIsOpen(false);
      } else {
        toast.error(result.error || 'Error al registrar abono');
      }
    } catch (error) {
      toast.error('Error al registrar abono');
    } finally {
      setSubmitting(false);
    }
  }

  function handlePayFull() {
    setMonto(saldo);
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            Abonos — {clienteNombre || 'Venta'}
          </DialogTitle>
        </DialogHeader>

        {/* Summary */}
        <div className="grid grid-cols-3 gap-3 text-center text-sm">
          <div className="rounded-lg border p-3">
            <div className="text-muted-foreground">Ingreso Total</div>
            <div className="font-semibold">{formatCurrency(Number(ingresoTotal))}</div>
          </div>
          <div className="rounded-lg border p-3">
            <div className="text-muted-foreground">Abonado</div>
            <div className="font-semibold text-blue-600">{formatCurrency(Number(abonoActual))}</div>
          </div>
          <div className={`rounded-lg border p-3 ${!saldoPositive ? 'bg-green-50 dark:bg-green-950' : 'bg-amber-50 dark:bg-amber-950'}`}>
            <div className="text-muted-foreground">Saldo</div>
            <div className={`font-semibold ${!saldoPositive ? 'text-green-600' : 'text-amber-600'}`}>
              {formatCurrency(Number(saldo))}
            </div>
          </div>
        </div>

        {/* Payment history */}
        {abonos.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Historial de Pagos</h4>
            <div className="max-h-40 overflow-y-auto space-y-1">
              {abonos.map((abono) => (
                <div key={abono.id} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{formatCurrency(Number(abono.monto))}</span>
                    <span className="text-xs text-muted-foreground">
                      {metodoPagoLabels[abono.metodoPago] || abono.metodoPago}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    {abono.observacion && <span>{abono.observacion}</span>}
                    <span>{new Date(abono.fecha).toLocaleDateString('es-AR')}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* New payment form */}
        {saldoPositive && (
          <div className="space-y-4 pt-2 border-t">
            <h4 className="text-sm font-medium">Nuevo Abono</h4>

            <div className="space-y-2">
              <Label htmlFor="monto">Monto</Label>
              <div className="flex gap-2">
                <Input
                  id="monto"
                  type="number"
                  min="0"
                  max={String(saldo)}
                  step="0.01"
                  placeholder={`Máx: ${formatCurrency(Number(saldo))}`}
                  value={monto}
                  onChange={(e) => setMonto(e.target.value)}
                />
                <Button variant="secondary" size="sm" onClick={handlePayFull} className="shrink-0">
                  Pagar todo
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Método de Pago</Label>
              <Select value={metodoPago} onValueChange={(v) => { if (v !== null) setMetodoPago(v); }}>
                <SelectTrigger>
                  <SelectValue>{metodoPagoLabels[metodoPago] ?? metodoPago}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(metodoPagoLabels)
                    .filter(([value]) => value !== 'CREDITO')
                    .map(([value, label]) => (
                      <SelectItem key={value} value={value}>{label}</SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="observacion">Observación (opcional)</Label>
              <Input
                id="observacion"
                placeholder="Ej: Segundo abono..."
                value={observacion}
                onChange={(e) => setObservacion(e.target.value)}
              />
            </div>

            <Button onClick={handleSubmit} disabled={submitting || !monto || Number(monto) <= 0} className="w-full">
              {submitting ? 'Registrando...' : 'Registrar Abono'}
            </Button>
          </div>
        )}

        {!saldoPositive && (
          <div className="text-center py-3 text-green-600 font-medium">
            ✓ Venta completamente pagada
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}