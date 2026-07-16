'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { getCuentasPorCobrar } from '@/presentation/actions/dashboard';
import { Loader2 } from 'lucide-react';
import { decimalSum } from '@/lib/utils';

interface CuentaPorCobrar {
  ventaId: string;
  clienteNombre: string;
  sedeNombre?: string;
  fecha: string;
  ingresoTotal: string;
  abono: string;
  saldo: string;
}

interface CuentasPorCobrarDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  inicio: string;
  fin: string;
}

function formatCurrency(value: string | number): string {
  const num = typeof value === 'string' ? Number(value) : value;
  return `$${num.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split('-');
  return `${day}/${month}/${year}`;
}

export function CuentasPorCobrarDialog({ open, onOpenChange, inicio, fin }: CuentasPorCobrarDialogProps) {
  const [cuentas, setCuentas] = useState<CuentaPorCobrar[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchCuentas = useCallback(async () => {
    setLoading(true);
    const result = await getCuentasPorCobrar(inicio, fin);
    if (result.success) {
      setCuentas(result.cuentas);
    }
    setLoading(false);
  }, [inicio, fin]);

  useEffect(() => {
    if (open) {
      fetchCuentas();
    }
  }, [open, fetchCuentas]);

  const totalSaldo = decimalSum(cuentas.map((c) => c.saldo));
  const totalIngreso = decimalSum(cuentas.map((c) => c.ingresoTotal));
  const totalAbono = decimalSum(cuentas.map((c) => c.abono));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Cuentas por Cobrar</DialogTitle>
          <DialogDescription>
            Ventas a crédito con saldo pendiente del {formatDate(inicio)} al {formatDate(fin)}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        ) : cuentas.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">No hay cuentas por cobrar en este período</p>
        ) : (
          <div className="space-y-4">
            <div className="rounded-md border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-3 py-2 text-left font-medium">Cliente</th>
                    {cuentas.some((c) => c.sedeNombre) && <th className="px-3 py-2 text-left font-medium">Sede</th>}
                    <th className="px-3 py-2 text-left font-medium">Fecha</th>
                    <th className="px-3 py-2 text-right font-medium">Ingreso Total</th>
                    <th className="px-3 py-2 text-right font-medium">Abonado</th>
                    <th className="px-3 py-2 text-right font-medium">Saldo</th>
                  </tr>
                </thead>
                <tbody>
                  {cuentas.map((c) => (
                    <tr key={c.ventaId} className="border-b last:border-0">
                      <td className="px-3 py-2">{c.clienteNombre}</td>
                      {cuentas.some((c) => c.sedeNombre) && <td className="px-3 py-2">{c.sedeNombre ?? '—'}</td>}
                      <td className="px-3 py-2">{formatDate(c.fecha)}</td>
                      <td className="px-3 py-2 text-right">{formatCurrency(c.ingresoTotal)}</td>
                      <td className="px-3 py-2 text-right">{formatCurrency(c.abono)}</td>
                      <td className="px-3 py-2 text-right font-semibold text-amber-600 dark:text-amber-400">{formatCurrency(c.saldo)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 bg-muted/30 font-semibold">
                    <td className="px-3 py-2" colSpan={2}>Total ({cuentas.length} ventas)</td>
                    <td className="px-3 py-2 text-right">{formatCurrency(totalIngreso)}</td>
                    <td className="px-3 py-2 text-right">{formatCurrency(totalAbono)}</td>
                    <td className="px-3 py-2 text-right text-amber-600 dark:text-amber-400">{formatCurrency(totalSaldo)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}