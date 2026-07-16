'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { getCuentasPorPagarDetalle } from '@/presentation/actions/dashboard';
import { PagarLoteDialog } from '@/components/forms/pagar-lote-dialog';
import { ProductoBadge } from '@/components/producto-badge';
import { Loader2, Wallet } from 'lucide-react';
import { formatCurrency } from '@/domain/formatters';
import { tipoProductoLabel } from '@/domain/labels';
import { TipoProducto, EstadoPagoLote } from '@/domain/enums';
import type { CuentasPorPagarDetalleListResponse } from '@/presentation/dtos';

interface CuentasPorPagarDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ESTADO_PAGO_LABELS: Record<string, string> = {
  PENDIENTE: 'Pendiente',
  PAGADO: 'Pagado',
};

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

export function CuentasPorPagarDialog({ open, onOpenChange }: CuentasPorPagarDialogProps) {
  const [data, setData] = useState<CuentasPorPagarDetalleListResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [pagarDialogOpen, setPagarDialogOpen] = useState(false);
  const [selectedLote, setSelectedLote] = useState<{
    loteId: string;
    producto: string;
    proveedorNombre: string;
    estadoPago: string;
  } | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const result = await getCuentasPorPagarDetalle();
    if (result.success && result.data) {
      setData(result.data);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (open) {
      fetchData();
    }
  }, [open, fetchData]);

  const handlePagarClick = (
    loteId: string,
    producto: string,
    proveedorNombre: string,
    estadoPago: string
  ) => {
    setSelectedLote({ loteId, producto, proveedorNombre, estadoPago });
    setPagarDialogOpen(true);
  };

  const handlePagarSuccess = () => {
    // Refresh data after successful payment
    fetchData();
  };

  const totalLotes = data?.grupos.reduce((sum, g) => sum + g.lotes.length, 0) ?? 0;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[800px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wallet className="size-5 text-amber-600" />
              Cuentas por Pagar
            </DialogTitle>
            <DialogDescription>
              Lotes pendientes de pago a proveedores
            </DialogDescription>
          </DialogHeader>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
            </div>
          ) : !data || data.grupos.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No hay lotes pendientes de pago
            </p>
          ) : (
            <div className="space-y-6">
              {data.grupos.map((grupo) => (
                <div key={grupo.proveedorId} className="space-y-2">
                  <div className="flex items-center justify-between border-b pb-1">
                    <h3 className="font-semibold text-sm">{grupo.proveedorNombre}</h3>
                    <span className="font-semibold text-sm text-amber-600 dark:text-amber-400">
                      {formatCurrency(grupo.totalPendiente)}
                    </span>
                  </div>
                  <div className="rounded-md border">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-muted/50">
                          <th className="px-3 py-2 text-left font-medium">Producto</th>
                          <th className="px-3 py-2 text-left font-medium">Fecha Ingreso</th>
                          <th className="px-3 py-2 text-right font-medium">Cantidad (kg)</th>
                          <th className="px-3 py-2 text-right font-medium">Costo Real/Kg</th>
                          <th className="px-3 py-2 text-right font-medium">Costo Total</th>
                          <th className="px-3 py-2 text-center font-medium">Estado</th>
                          <th className="px-3 py-2 text-center font-medium">Acción</th>
                        </tr>
                      </thead>
                      <tbody>
                        {grupo.lotes.map((lote) => (
                          <tr key={lote.loteId} className="border-b last:border-0">
                            <td className="px-3 py-2">
                              <ProductoBadge producto={lote.producto} compact />
                            </td>
                            <td className="px-3 py-2">{formatDate(lote.fechaIngreso)}</td>
                            <td className="px-3 py-2 text-right">
                              {Number(lote.cantidadCompradaKg).toLocaleString('es-AR')}
                            </td>
                            <td className="px-3 py-2 text-right">
                              {formatCurrency(lote.costoRealCalculadoKg)}
                            </td>
                            <td className="px-3 py-2 text-right font-semibold">
                              {formatCurrency(lote.costoTotal)}
                            </td>
                            <td className="px-3 py-2 text-center">
                              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                                lote.estadoPago === EstadoPagoLote.PENDIENTE
                                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'
                                  : 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300'
                              }`}>
                                {ESTADO_PAGO_LABELS[lote.estadoPago] ?? lote.estadoPago}
                              </span>
                            </td>
                            <td className="px-3 py-2 text-center">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handlePagarClick(
                                  lote.loteId,
                                  lote.producto,
                                  grupo.proveedorNombre,
                                  lote.estadoPago
                                )}
                              >
                                Pagar
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}

              {/* Totals footer */}
              <div className="rounded-md border-2 bg-muted/30 p-3">
                <div className="flex items-center justify-between font-semibold">
                  <span>Total General ({totalLotes} {totalLotes === 1 ? 'lote' : 'lotes'})</span>
                  <span className="text-amber-600 dark:text-amber-400">
                    {formatCurrency(data.totalGeneral)}
                  </span>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {selectedLote && (
        <PagarLoteDialog
          loteId={selectedLote.loteId}
          producto={selectedLote.producto}
          proveedorNombre={selectedLote.proveedorNombre}
          estadoPago={selectedLote.estadoPago}
          open={pagarDialogOpen}
          onOpenChange={setPagarDialogOpen}
          onSuccess={handlePagarSuccess}
        />
      )}
    </>
  );
}