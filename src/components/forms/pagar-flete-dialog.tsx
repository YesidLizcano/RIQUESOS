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
import { pagarFlete } from '@/presentation/actions/lotes';
import { toast } from 'sonner';
import { Loader2, AlertTriangle } from 'lucide-react';
import { tipoProductoLabel, metodoPagoLabel } from '@/domain/labels';
import { TipoProducto } from '@/domain/enums';
import { LOTE_METODOS_PAGO } from '@/presentation/validations/lote.schema';

type Step = 'form' | 'confirm';

interface PagarFleteDialogProps {
  loteId: string;
  producto: string;
  proveedorNombre?: string;
  estadoPagoFlete: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function PagarFleteDialog({ loteId, producto, proveedorNombre, estadoPagoFlete, open, onOpenChange, onSuccess }: PagarFleteDialogProps) {
  const [metodoPago, setMetodoPago] = useState('EFECTIVO');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<Step>('form');

  const yaPagado = estadoPagoFlete === 'PAGADO';

  const metodoLabel = metodoPagoLabel[metodoPago] ?? metodoPago;

  async function handlePagar() {
    setLoading(true);
    const formData = new FormData();
    formData.set('id', loteId);
    formData.set('metodoPago', metodoPago);
    const result = await pagarFlete(formData);
    setLoading(false);

    if (result.success) {
      const productoLabel = tipoProductoLabel[producto as TipoProducto] ?? producto;
      toast.success(`Flete del lote de ${productoLabel} marcado como pagado`);
      onOpenChange(false);
      onSuccess?.();
    } else {
      toast.error(result.error || 'Error al pagar flete');
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
          <DialogTitle>Pagar Flete</DialogTitle>
          <DialogDescription>
            Marcar como pagado el flete del lote de {productoLabel}{proveedorNombre ? ` (${proveedorNombre})` : ''}.
          </DialogDescription>
        </DialogHeader>
        {yaPagado ? (
          <div className="py-4 text-center text-muted-foreground">
            El flete de este lote ya está pagado.
          </div>
        ) : step === 'form' ? (
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Método de pago del flete</label>
              <Select value={metodoPago} onValueChange={(v) => v && setMetodoPago(v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar método">{metodoLabel}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {LOTE_METODOS_PAGO.map((opt) => (
                    <SelectItem key={opt} value={opt}>
                      {metodoPagoLabel[opt]}
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
                <p className="text-sm font-medium">¿Está seguro de marcar el flete como pagado?</p>
                <p className="text-sm text-muted-foreground">
                  Esta acción no se puede deshacer. Se registrará el pago del flete del lote de {productoLabel} vía {metodoLabel}.
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
              Sí, Marcar Flete como Pagado
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}