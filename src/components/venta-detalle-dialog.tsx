'use client';

import { useState, useEffect } from 'react';
import { useRefresh } from '@/components/refresh-context';
import { eliminarVenta, getVentaDetalle } from '@/presentation/actions/ventas';
import { isDobleCrema, DOBLE_CREMA_BLOCK_KG, formatDobleCremaGranel } from '@/domain/constants';
import { TipoProducto } from '@/domain/enums';
import { tipoProductoLabel, metodoPagoLabel } from '@/domain/labels';
import { ProductoBadge } from '@/components/producto-badge';
import type { VentaResponse, ClienteResponse, LoteResponse } from '@/presentation/dtos';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Eye, Trash2, Loader2, Pencil, Printer, CreditCard, Receipt } from 'lucide-react';
import { toast } from 'sonner';
import { decimalSub } from '@/lib/utils';

interface VentaDetalleDialogProps {
  venta: VentaResponse;
  clienteMap: Map<string, string>;
  loteProductoMap: Map<string, string>;
  loteProveedorNombreMap: Map<string, string>;
  loteMap?: Map<string, LoteResponse>;
  clienteObjMap?: Map<string, ClienteResponse>;
  onEdit?: (venta: VentaResponse) => void;
  onAbonar?: (venta: VentaResponse) => void;
}

function formatCurrency(value: string | number): string {
  return `$${Math.round(Number(value)).toLocaleString('es-AR')}`;
}

function formatKg(value: string | number): string {
  return `${Number(value).toLocaleString('es-AR')} kg`;
}

export function VentaDetalleDialog({
  venta,
  clienteMap,
  loteProductoMap,
  loteProveedorNombreMap,
  loteMap,
  clienteObjMap,
  onEdit,
  onAbonar,
}: VentaDetalleDialogProps) {
  const refreshData = useRefresh();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [detalle, setDetalle] = useState<VentaResponse | null>(null);

  // Refresh detail when venta prop changes (e.g. after an abono is registered)
  // while the dialog is open, so the saldo updates in real time.
  useEffect(() => {
    if (open && detalle) {
      getVentaDetalle({ ventaId: venta.id }).then((result) => {
        if (result.success && result.venta) {
          setDetalle(result.venta);
        }
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [venta.abono, venta.saldo]);

  async function handleOpen() {
    setLoading(true);
    try {
      const result = await getVentaDetalle({ ventaId: venta.id });
      if (result.success && result.venta) {
        setDetalle(result.venta);
        setOpen(true);
      } else {
        toast.error(result.error || 'Error al cargar detalle');
      }
    } catch {
      toast.error('Error al cargar detalle de la venta');
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      const result = await eliminarVenta({ ventaId: venta.id });
      if (result.success) {
        toast.success('Venta eliminada exitosamente');
        setOpen(false);
        refreshData();
      } else {
        toast.error(result.error || 'Error al eliminar venta');
      }
    } catch {
      toast.error('Error al eliminar venta');
    } finally {
      setDeleting(false);
    }
  }

  function handlePrint() {
    const d = displayData;
    const cNombre = d.clienteNombre ?? clienteMap.get(d.clienteId) ?? '—';
    const f = new Date(d.fecha).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });

    const itemRows = d.items.map((item) => {
      const prod = item.loteProducto ?? loteProductoMap.get(item.loteId) ?? '';
      const prov = item.loteProveedorNombre ?? loteProveedorNombreMap.get(item.loteId) ?? '';
      const loteLabel = [prod, prov].filter(Boolean).join(' — ');
      const lote = loteMap?.get(item.loteId);
      const isDcBloques = item.ventaTipo === 'BLOQUES' && isDobleCrema(prod);

                    if (isDcBloques) {
                      const enteros = item.bloquesEnterosVendidos ?? 0;
                      const tajados = item.bloquesTajadosVendidos ?? 0;
                      const reempacados = item.bloquesReempacados ?? 0;
                      const cliente = clienteObjMap?.get(d.clienteId);
                      const precioEntero = item.precioEnteroBloque ? Number(item.precioEnteroBloque) : (cliente ? Number(cliente.precioDobleCremaEntero ?? '0') : 0);
                      const precioTajado = item.precioTajadoBloque ? Number(item.precioTajadoBloque) : (cliente ? Number(cliente.precioDobleCremaTajado ?? cliente.precioDobleCremaEntero ?? '0') : 0);
        const ingresoEnteros = enteros * precioEntero;
        const ingresoTajados = tajados * precioTajado;
        let rows = '';

        if (enteros > 0) {
          rows += `<tr>
            <td style="padding:6px 10px;border-bottom:1px solid #e5e7eb;font-size:13px">${loteLabel || '—'}</td>
            <td style="padding:6px 10px;border-bottom:1px solid #e5e7eb;text-align:center;font-size:13px">Enteros</td>
            <td style="padding:6px 10px;border-bottom:1px solid #e5e7eb;font-size:13px">${enteros} enteros</td>
            <td style="padding:6px 10px;border-bottom:1px solid #e5e7eb;text-align:right;font-size:13px">${precioEntero > 0 ? formatCurrency(precioEntero) + '/entero' : '—'}</td>
            <td style="padding:6px 10px;border-bottom:1px solid #e5e7eb;text-align:right;font-size:13px;font-weight:500">${formatCurrency(ingresoEnteros)}</td>
          </tr>`;
        }
        if (tajados > 0) {
          const cantText = reempacados > 0 ? `${tajados} tajados (${reempacados} reempacados)` : `${tajados} tajados`;
          rows += `<tr>
            <td style="padding:6px 10px;border-bottom:1px solid #e5e7eb;font-size:13px">${enteros > 0 ? '' : (loteLabel || '—')}</td>
            <td style="padding:6px 10px;border-bottom:1px solid #e5e7eb;text-align:center;font-size:13px">Tajados</td>
            <td style="padding:6px 10px;border-bottom:1px solid #e5e7eb;font-size:13px">${cantText}</td>
            <td style="padding:6px 10px;border-bottom:1px solid #e5e7eb;text-align:right;font-size:13px">${precioTajado > 0 ? formatCurrency(precioTajado) + '/tajado' : '—'}</td>
            <td style="padding:6px 10px;border-bottom:1px solid #e5e7eb;text-align:right;font-size:13px;font-weight:500">${formatCurrency(ingresoTajados)}</td>
          </tr>`;
        }
        return rows;
      }

      const origenCorte = item.origenCorte ?? 'ENTERO';
      const granelLabel = isDobleCrema(prod) && origenCorte === 'ENTERO'
        ? 'Granel (de entero)'
        : isDobleCrema(prod) && origenCorte === 'TAJADO'
        ? 'Granel (de tajado)'
        : 'Granel';
      const variedad = origenCorte === 'TAJADO' ? 'tajado' as const : 'entero' as const;
      const origen = variedad === 'tajado' ? (item.origenTajadoGranel as 'INTERNO' | 'FABRICA' | undefined) : undefined;
      const cantidadLabel = isDobleCrema(prod)
        ? formatDobleCremaGranel(Number(item.cantidadKg), variedad, origen)
        : `${Number(item.cantidadKg).toLocaleString('es-AR')} kg`;

      return `<tr>
        <td style="padding:6px 10px;border-bottom:1px solid #e5e7eb;font-size:13px">${loteLabel || '—'}</td>
        <td style="padding:6px 10px;border-bottom:1px solid #e5e7eb;text-align:center;font-size:13px">${granelLabel}</td>
        <td style="padding:6px 10px;border-bottom:1px solid #e5e7eb;font-size:13px">${cantidadLabel}</td>
        <td style="padding:6px 10px;border-bottom:1px solid #e5e7eb;text-align:right;font-size:13px">${formatCurrency(item.precioVentaKg)}/kg</td>
        <td style="padding:6px 10px;border-bottom:1px solid #e5e7eb;text-align:right;font-size:13px;font-weight:500">${formatCurrency(item.ingreso)}</td>
      </tr>`;
    }).join('');

    const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Remito - Venta ${d.id.slice(0, 8)}</title>
  <style>
    @media print { @page { margin: 1cm; } }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #111; margin: 0; padding: 20px; }
    h1 { font-size: 20px; margin: 0 0 4px; }
    .subtitle { color: #6b7280; font-size: 13px; margin-bottom: 16px; }
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 16px; }
    .info-label { font-size: 11px; color: #6b7280; }
    .info-value { font-size: 14px; font-weight: 500; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
    th { background: #f9fafb; padding: 8px 10px; text-align: left; font-size: 12px; font-weight: 600; border-bottom: 2px solid #e5e7eb; }
    th.right { text-align: right; }
    th.center { text-align: center; }
    .totals { display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 8px; margin-top: 16px; padding: 12px; border: 1px solid #e5e7eb; border-radius: 6px; }
    .total-label { font-size: 11px; color: #6b7280; }
    .total-value { font-size: 16px; font-weight: 600; }
    .negative { color: #dc2626; }
    .positive { color: #16a34a; }
    .footer { margin-top: 40px; display: flex; justify-content: space-between; font-size: 12px; color: #9ca3af; }
  </style>
</head>
<body>
  <h1>Remito de Venta</h1>
  <p class="subtitle">Distribuidora de Quesos Riquesos</p>

  <div class="info-grid">
    <div><div class="info-label">Cliente</div><div class="info-value">${cNombre}</div></div>
    ${d.sedeNombre ? `<div><div class="info-label">Sede</div><div class="info-value">${d.sedeNombre}</div></div>` : ''}
    <div><div class="info-label">Fecha</div><div class="info-value">${f}</div></div>
    ${d.domiciliario ? `<div><div class="info-label">Domiciliario</div><div class="info-value">${d.domiciliario}</div></div>` : ''}
    ${Number(d.valorDomicilio) > 0 ? `<div><div class="info-label">Domicilio</div><div class="info-value">${formatCurrency(d.valorDomicilio)}</div></div>` : ''}
    <div><div class="info-label">Método de Pago</div><div class="info-value">${metodoPagoLabel[d.metodoPago] ?? d.metodoPago}${d.metodoPago === 'CREDITO' ? ' (Fiado)' : ''}</div></div>
    ${Number(d.saldo) > 0 ? `<div><div class="info-label">Saldo Pendiente</div><div class="info-value" style="color:#dc2626">${formatCurrency(d.saldo)}</div></div>` : ''}
    ${d.observaciones ? `<div style="grid-column:1/-1"><div class="info-label">Observaciones</div><div class="info-value">${d.observaciones}</div></div>` : ''}
  </div>

  <table>
    <thead>
      <tr>
        <th>Lote</th>
        <th class="center">Tipo</th>
        <th>Cantidad</th>
        <th class="right">Precio</th>
        <th class="right">Ingreso</th>
      </tr>
    </thead>
    <tbody>${itemRows}</tbody>
  </table>

  <div class="totals">
    <div><div class="total-label">Total Kg</div><div class="total-value">${Number(d.cantidadTotalKg).toLocaleString('es-AR')} kg</div></div>
    <div><div class="total-label">Ingreso Total</div><div class="total-value">${formatCurrency(d.ingresoTotal)}</div></div>
    <div><div class="total-label">Costo Total</div><div class="total-value">${formatCurrency(d.costoAplicado)}</div></div>
    <div><div class="total-label">Ganancia Bruta</div><div class="total-value ${Number(d.gananciaBruta) < 0 ? 'negative' : 'positive'}">${formatCurrency(d.gananciaBruta)}</div></div>
  </div>

  <div class="footer">
    <span>Documento no válido como factura</span>
    <span>Generado el ${new Date().toLocaleDateString('es-AR')}</span>
  </div>
</body>
</html>`;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();
      printWindow.onload = () => { printWindow.print(); };
    }
  }

  const displayData = detalle ?? venta;
  const clienteNombre = displayData.clienteNombre ?? clienteMap.get(displayData.clienteId) ?? '—';
  const fecha = new Date(displayData.fecha).toLocaleDateString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

  const totalKg = Number(displayData.cantidadTotalKg);
  const ingresoTotal = Number(displayData.ingresoTotal);
  const costoTotal = Number(displayData.costoAplicado);
  const gananciaBruta = Number(displayData.gananciaBruta);
  const domicilio = Number(displayData.valorDomicilio);
  // Use decimal comparison for sign/zero checks to avoid float64 precision loss
  const gananciaBrutaNegativa = decimalSub(displayData.gananciaBruta, '0').startsWith('-');
  const domicilioPositivo = !displayData.valorDomicilio.startsWith('-') && displayData.valorDomicilio !== '0' && displayData.valorDomicilio !== '0.00';
  const saldoPositivo = !displayData.saldo?.startsWith('-') && displayData.saldo !== '0' && displayData.saldo !== '0.00' && displayData.saldo !== undefined;

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        className="h-8 w-8 p-0"
        onClick={handleOpen}
        disabled={loading}
        title="Ver detalle"
      >
        {loading ? <Loader2 className="size-4 animate-spin" /> : <Eye className="size-4" />}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-5xl max-h-[95vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalle de Venta</DialogTitle>
            <DialogDescription>
              Información completa de la venta del {fecha}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            {/* Header info — compact horizontal */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
              <p><span className="font-medium">Cliente:</span> {clienteNombre}</p>
              {displayData.sedeNombre && <p><span className="font-medium">Sede:</span> {displayData.sedeNombre}</p>}
              <p><span className="font-medium">Fecha:</span> {fecha}</p>
              {displayData.domiciliario && <p><span className="font-medium">Domiciliario:</span> {displayData.domiciliario}</p>}
              {domicilioPositivo && <p><span className="font-medium">Domicilio:</span> {formatCurrency(domicilio)}</p>}
              <p>
                <span className="font-medium">Pago:</span>{' '}
                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                  displayData.metodoPago === 'EFECTIVO' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                  displayData.metodoPago === 'CREDITO' ? 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200' :
                  'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                }`}>
                  {metodoPagoLabel[displayData.metodoPago] ?? displayData.metodoPago}{displayData.metodoPago === 'CREDITO' ? ' (Fiado)' : ''}
                </span>
              </p>
              {saldoPositivo && (
                <p>
                  <span className="font-medium">Abono:</span> {formatCurrency(displayData.abono)}
                  {' | '}
                  <span className="font-medium text-red-600">Saldo:</span> {formatCurrency(displayData.saldo)}
                </p>
              )}
              {displayData.observaciones && <p><span className="font-medium">Obs:</span> {displayData.observaciones}</p>}
            </div>

            {/* Items table */}
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Lote</TableHead>
                    <TableHead className="text-xs">Tipo</TableHead>
                    <TableHead className="text-xs">Cantidad</TableHead>
                    <TableHead className="text-right text-xs">Precio</TableHead>
                    <TableHead className="text-right text-xs">Ingreso</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {displayData.items.map((item, i) => {
                    const producto = item.loteProducto ?? loteProductoMap.get(item.loteId) ?? '';
                    const proveedor = item.loteProveedorNombre ?? loteProveedorNombreMap.get(item.loteId) ?? '';
                    const loteLabel = [proveedor].filter(Boolean).join(' — ');
                    const lote = loteMap?.get(item.loteId);
                    const isDcBloques = item.ventaTipo === 'BLOQUES' && isDobleCrema(producto);

                    if (isDcBloques) {
                      const enteros = item.bloquesEnterosVendidos ?? 0;
                      const tajados = item.bloquesTajadosVendidos ?? 0;
                      const reempacados = item.bloquesReempacados ?? 0;
                      const cliente = clienteObjMap?.get(displayData.clienteId);
                      const precioEntero = item.precioEnteroBloque ? Number(item.precioEnteroBloque) : (cliente ? Number(cliente.precioDobleCremaEntero ?? '0') : 0);
                      const precioTajado = item.precioTajadoBloque ? Number(item.precioTajadoBloque) : (cliente ? Number(cliente.precioDobleCremaTajado ?? cliente.precioDobleCremaEntero ?? '0') : 0);
                      const ingresoEnteros = enteros * precioEntero;
                      const ingresoTajados = tajados * precioTajado;

                      const loteCell = (
                        <div className="flex items-center gap-1.5">
                          {producto && <ProductoBadge producto={producto} compact />}
                          <span className="text-muted-foreground">{loteLabel || '—'}</span>
                        </div>
                      );

                      const rows: React.ReactElement[] = [];

                      if (enteros > 0) {
                        rows.push(
                          <TableRow key={`${i}-ent`}>
                            <TableCell className="py-1.5 text-xs">{loteCell}</TableCell>
                            <TableCell className="py-1.5 text-xs"><Badge variant="default" className="text-[10px] px-1 py-0">Enteros</Badge></TableCell>
                            <TableCell className="py-1.5 text-xs">{enteros} enteros</TableCell>
                            <TableCell className="py-1.5 text-right text-xs">{precioEntero > 0 ? `${formatCurrency(precioEntero)}/entero` : '—'}</TableCell>
                            <TableCell className="py-1.5 text-right text-xs font-medium">{formatCurrency(ingresoEnteros)}</TableCell>
                          </TableRow>
                        );
                      }

                      if (tajados > 0) {
                        const cantidadText = reempacados > 0
                          ? `${tajados} tajados (${reempacados} reempacados)`
                          : `${tajados} tajados`;
                        rows.push(
                          <TableRow key={`${i}-taj`}>
                            <TableCell className="py-1.5 text-xs">{enteros > 0 ? '' : loteCell}</TableCell>
                            <TableCell className="py-1.5 text-xs"><Badge variant="outline" className="text-[10px] px-1 py-0">Tajados</Badge></TableCell>
                            <TableCell className="py-1.5 text-xs">{cantidadText}</TableCell>
                            <TableCell className="py-1.5 text-right text-xs">{precioTajado > 0 ? `${formatCurrency(precioTajado)}/tajado` : '—'}</TableCell>
                            <TableCell className="py-1.5 text-right text-xs font-medium">{formatCurrency(ingresoTajados)}</TableCell>
                          </TableRow>
                        );
                      }

                      return rows;
                    }

                    // Granel / Semisalado — single row
      const origenCorte = item.origenCorte ?? 'ENTERO';
                    const granelLabel = isDobleCrema(producto) && origenCorte === 'ENTERO'
                      ? 'Granel (de entero)'
                      : isDobleCrema(producto) && origenCorte === 'TAJADO'
                      ? 'Granel (de tajado)'
                      : 'Granel';
                    const variedad = origenCorte === 'TAJADO' ? 'tajado' as const : 'entero' as const;
                    const origen = variedad === 'tajado' ? (item.origenTajadoGranel as 'INTERNO' | 'FABRICA' | undefined) : undefined;
                    const cantidadLabel = isDobleCrema(producto)
                      ? formatDobleCremaGranel(Number(item.cantidadKg), variedad, origen)
                      : formatKg(item.cantidadKg);
                    return (
                      <TableRow key={i}>
                        <TableCell className="py-1.5 text-xs">
                          <div className="flex items-center gap-1.5">
                            {producto && <ProductoBadge producto={producto} compact />}
                            <span className="text-muted-foreground">{loteLabel || '—'}</span>
                          </div>
                        </TableCell>
                        <TableCell className="py-1.5 text-xs"><Badge variant="secondary" className="text-[10px] px-1 py-0">{granelLabel}</Badge></TableCell>
                        <TableCell className="py-1.5 text-xs">{cantidadLabel}</TableCell>
                        <TableCell className="py-1.5 text-right text-xs">{formatCurrency(item.precioVentaKg)}/kg</TableCell>
                        <TableCell className="py-1.5 text-right text-xs font-medium">{formatCurrency(item.ingreso)}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            {/* Totals — compact horizontal grid */}
            <div className="flex flex-wrap gap-x-6 gap-y-2 rounded-lg border p-3">
              <div>
                <p className="text-xs text-muted-foreground">Total Kg</p>
                <p className="font-medium text-sm">{formatKg(totalKg)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Ingreso Total</p>
                <p className="font-medium text-sm">{formatCurrency(ingresoTotal)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Costo Total</p>
                <p className="font-medium text-sm">{formatCurrency(costoTotal)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Ganancia Bruta</p>
                <p className={`font-medium text-sm ${gananciaBrutaNegativa ? 'text-red-600' : 'text-green-600'}`}>
                  {formatCurrency(gananciaBruta)}
                </p>
              </div>
              {domicilioPositivo && (
                <div>
                  <p className="text-xs text-muted-foreground">Domicilio</p>
                  <p className="font-medium text-sm">{formatCurrency(domicilio)}</p>
                </div>
              )}
            </div>

            {/* Payment history for credit sales */}
            {displayData.metodoPago === 'CREDITO' && displayData.abonos && displayData.abonos.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-1">Historial de Pagos</h4>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">Fecha</TableHead>
                        <TableHead className="text-right text-xs">Monto</TableHead>
                        <TableHead className="text-xs">Método</TableHead>
                        <TableHead className="text-xs">Observación</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {displayData.abonos.map((abono) => (
                        <TableRow key={abono.id}>
                          <TableCell className="py-1.5 text-xs">
                            {new Date(abono.fecha).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                          </TableCell>
                          <TableCell className="py-1.5 text-right text-xs font-medium text-green-600">
                            {formatCurrency(abono.monto)}
                          </TableCell>
                          <TableCell className="py-1.5 text-xs">
                            {metodoPagoLabel[abono.metodoPago] ?? abono.metodoPago}
                          </TableCell>
                          <TableCell className="py-1.5 text-xs text-muted-foreground">
                            {abono.observacion || '—'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex justify-end gap-2 pt-2">
              {onAbonar && (() => {
                const mp = displayData.metodoPago ?? 'EFECTIVO';
                const isCreditoWithSaldo = mp === 'CREDITO' && saldoPositivo;
                const isCreditoSaldado = mp === 'CREDITO' && !saldoPositivo;

                if (isCreditoWithSaldo) {
                  return (
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => onAbonar(displayData)}
                    >
                      <CreditCard className="size-4 mr-2" />
                      Abonar
                      <Badge variant="secondary" className="ml-2 text-[10px] px-1.5 py-0">
                        {formatCurrency(displayData.saldo)}
                      </Badge>
                    </Button>
                  );
                }
                if (isCreditoSaldado) {
                  return (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onAbonar(displayData)}
                    >
                      <Receipt className="size-4 mr-2" />
                      Ver Historial de Abonos
                    </Button>
                  );
                }
                return (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onAbonar(displayData)}
                  >
                    <Receipt className="size-4 mr-2" />
                    Ver Historial de Pagos
                  </Button>
                );
              })()}
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrint}
              >
                <Printer className="size-4 mr-2" />
                Imprimir Remito
              </Button>
              {onEdit && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    onEdit(displayData);
                    setOpen(false);
                  }}
                >
                  <Pencil className="size-4 mr-2" />
                  Editar
                </Button>
              )}
              <AlertDialog>
                <AlertDialogTrigger render={<Button variant="destructive" size="sm" />}>
                  <Trash2 className="size-4 mr-2" />
                  Eliminar Venta
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogMedia>
                      <Trash2 className="size-6 text-destructive" />
                    </AlertDialogMedia>
                    <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Esta acción revertirá el stock de los lotes y empaques afectados y no se puede deshacer.
                      La venta será eliminada permanentemente.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction
                      variant="destructive"
                      onClick={handleDelete}
                      disabled={deleting}
                    >
                      {deleting ? (
                        <>
                          <Loader2 className="size-4 mr-2 animate-spin" />
                          Eliminando...
                        </>
                      ) : (
                        'Eliminar'
                      )}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}