'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { pagarLote } from '@/presentation/actions/lotes';
import { toast } from 'sonner';
import { Loader2, AlertTriangle } from 'lucide-react';
import { tipoProductoLabel } from '@/domain/labels';
import { TipoProducto } from '@/domain/enums';

const METODO_PAGO_OPTIONS = [
  { value: 'EFECTIVO', label: 'Efectivo' },
  { value: 'NEQUI', label: 'Nequi' },
  { value: 'BRE_B', label: 'Bre-B' },
  { value: 'CREDITO', label: 'Crédito' },
];

type Step = 'form' | 'confirm';

interface PagarLoteDialogProps {
  loteId: string;
  producto: string;
  proveedorNombre?: string;
  estadoPago: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function PagarLoteDialog({ loteId, producto, proveedorNombre, estadoPago, open, onOpenChange, onSuccess }: PagarLoteDialogProps) {
  const [metodoPago, setMetodoPago] = useState('EFECTIVO');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<Step>('form');

  const yaPagado = estadoPago === 'PAGADO';

  const metodoLabel = METODO_PAGO_OPTIONS.find(o => o.value === metodoPago)?.label ?? metodoPago;

  async function handlePagar() {
    setLoading(true);
    const formData = new FormData();
    formData.set('id', loteId);
    formData.set('metodoPago', metodoPago);
    const result = await pagarLote(formData);
    setLoading(false);

    if (result.success) {
      const productoLabel = tipoProductoLabel[producto as TipoProducto] ?? producto;
      toast.success(`Lote de ${productoLabel} marcado como pagado`);
      onOpenChange(false);
      onSuccess?.();
    } else {
      toast.error(result.error || 'Error al pagar lote');
      setStep('form');
    }
  }

  const productoLabel = tipoProductoLabel[producto as TipoProducto] ?? producto;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen) {
        setStep('form');
      }
      onOpenChange(isOpen);
    }}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Pagar Lote</DialogTitle>
          <DialogDescription>
            Marcar como pagado el lote de {productoLabel}{proveedorNombre ? ` (${proveedorNombre})` : ''}.
          </DialogDescription>
        </DialogHeader>
        {yaPagado ? (
          <div className="py-4 text-center text-muted-foreground">
            Este lote ya está pagado.
          </div>
        ) : step === 'form' ? (
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Método de pago al proveedor</label>
              <Select value={metodoPago} onValueChange={(v) => v && setMetodoPago(v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar método">{metodoLabel}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {METODO_PAGO_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        ) : (
          <div className="space-y-4 py-4">
            <div className="flex items-start gap-3 rounded-lg border border-yellow-500/50 bg-yellow-50 dark:bg-yellow-950/20 p-4">
              <AlertTriangle className="size-5 text-yellow-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-sm font-medium">¿Está seguro de marcar este lote como pagado?</p>
                <p className="text-sm text-muted-foreground">
                  Esta acción no se puede deshacer. Se registrará el pago del lote de {productoLabel} vía {metodoLabel}.
                </p>
              </div>
            </div>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => {
            if (step === 'confirm') {
              setStep('form');
            } else {
              onOpenChange(false);
            }
          }} disabled={loading}>
            {step === 'confirm' ? 'Volver' : 'Cancelar'}
          </Button>
          {yaPagado ? null : step === 'form' ? (
            <Button onClick={() => setStep('confirm')} disabled={yaPagado}>
              Confirmar Pago
            </Button>
          ) : (
            <Button onClick={handlePagar} disabled={loading}>
              {loading && <Loader2 className="size-4 animate-spin mr-2" />}
              Sí, Marcar como Pagado
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}