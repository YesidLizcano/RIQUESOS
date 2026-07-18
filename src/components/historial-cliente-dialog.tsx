'use client';

import { useState, useEffect, useCallback } from 'react';
import { getHistorialCliente } from '@/presentation/actions/clientes';
import { obtenerSedesPorCliente } from '@/presentation/actions/sedes';
import type { HistorialClienteResponse } from '@/presentation/actions/clientes';
import type { ClienteResponse, VentaResponse, SedeResponse } from '@/presentation/dtos';
import { metodoPagoLabel } from '@/domain/labels';
import { formatCurrency, formatProductName, formatSSKg } from '@/domain/formatters';
import { formatDobleCremaDetalle, formatDobleCremaGranel, isDobleCrema } from '@/domain/constants';
import { decimalSub } from '@/lib/utils';
import { TipoCliente } from '@/domain/enums';
import { tipoClienteLabel } from '@/domain/labels';
import type { VentaItemResponse } from '@/presentation/dtos';

function formatItemDetail(item: VentaItemResponse): string {
  const producto = formatProductName(item.loteProducto ?? '');
  const proveedor = item.loteProveedorNombre ?? '';
  const label = proveedor ? `${producto} (${proveedor})` : producto;
  if (isDobleCrema(item.loteProducto ?? '')) {
    if (item.ventaTipo === 'BLOQUES') {
      const enteros = item.bloquesEnterosVendidos ?? 0;
      const tajados = item.bloquesTajadosVendidos ?? 0;
      const reempacados = item.bloquesReempacados ?? 0;
      const blocks = formatDobleCremaDetalle(enteros, tajados, 0, 0);
      const suffix = reempacados > 0 ? ` (${reempacados} reemp.)` : '';
      return `${label}: ${blocks}${suffix}`;
    } else {
      const variedad = item.origenCorte === 'TAJADO' ? 'tajado' : 'entero';
      const origen = variedad === 'tajado' ? (item.origenTajadoGranel as 'INTERNO' | 'FABRICA' | undefined) : undefined;
      return `${label}: ${formatDobleCremaGranel(Number(item.cantidadKg), variedad, origen)}`;
    }
  } else {
    return `${label}: ${Number(item.cantidadKg)} kg`;
  }
}
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { History, Loader2, Download, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { VentaDetalleDialog } from '@/components/venta-detalle-dialog';

interface HistorialClienteDialogProps {
  cliente: ClienteResponse | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function HistorialClienteDialog({
  cliente,
  open,
  onOpenChange,
}: HistorialClienteDialogProps) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<HistorialClienteResponse | null>(null);
  const [ventaToView, setVentaToView] = useState<VentaResponse | null>(null);
  const [sedes, setSedes] = useState<SedeResponse[]>([]);
  const [sedeFilter, setSedeFilter] = useState<string>('');
  const [clienteMap] = useState(() => cliente ? new Map([[cliente.id, cliente.nombre]]) : new Map<string, string>());
  const [loteProductoMap, setLoteProductoMap] = useState<Map<string, string>>(new Map());
  const [loteProveedorNombreMap, setLoteProveedorNombreMap] = useState<Map<string, string>>(new Map());

  const fetchData = useCallback(async () => {
    if (!cliente) return;
    setLoading(true);
    try {
      const result = await getHistorialCliente(cliente.id);
      if (result.success && result.data) {
        setData(result.data);
        // Build lote maps from items for VentaDetalleDialog
        const pMap = new Map<string, string>();
        const provMap = new Map<string, string>();
        for (const v of result.data.ventas) {
          for (const item of v.items) {
            if (item.loteProducto) pMap.set(item.loteId, item.loteProducto);
            if (item.loteProveedorNombre) provMap.set(item.loteId, item.loteProveedorNombre);
          }
        }
        setLoteProductoMap(pMap);
        setLoteProveedorNombreMap(provMap);
      } else {
        toast.error(result.error || 'Error al cargar historial');
      }
    } catch {
      toast.error('Error al cargar historial del cliente');
    } finally {
      setLoading(false);
    }
  }, [cliente]);

  // Fetch sedes for the client
  useEffect(() => {
    if (cliente) {
      obtenerSedesPorCliente(cliente.id).then((result) => {
        if (result.success && result.sedes) {
          setSedes(result.sedes);
        } else {
          setSedes([]);
        }
      });
    }
  }, [cliente]);

  useEffect(() => {
    if (open && cliente) {
      fetchData();
    }
    if (!open) {
      setData(null);
    }
  }, [open, cliente, fetchData]);

  async function handleExportExcel() {
    if (!data) return;
    try {
      const ExcelJS = await import('exceljs');
      const wb = new ExcelJS.Workbook();
      wb.creator = 'Riquesos';
      wb.created = new Date();

      const ws = wb.addWorksheet('Historial', { views: [{ state: 'frozen', ySplit: 1 }] });

      const colDefs = [
        { key: 'fecha', header: 'Fecha', type: 'text' as const },
        { key: 'sede', header: 'Sede', type: 'text' as const },
        { key: 'metodoPago', header: 'Método de Pago', type: 'text' as const },
        { key: 'detalle', header: 'Detalle de Productos', type: 'text' as const },
        { key: 'ingresoTotal', header: 'Ingreso Total', type: 'currency' as const },
        { key: 'gananciaBruta', header: 'Ganancia Bruta', type: 'currency' as const },
        { key: 'saldo', header: 'Saldo', type: 'currency' as const },
      ];

      const DETALLE_COL_IDX = 3; // 1-based column index for "Detalle de Productos"

      ws.columns = colDefs.map((c) => ({
        header: c.header,
        key: c.key,
        width: c.key === 'detalle' ? 50 : 14,
      }));

      const NUM_FMT: Record<string, string> = {
        text: '',
        currency: '"$"#,##0',
        decimal: '#,##0.00',
      };

      const HEADER_FILL = { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: 'FF1F4E79' } };
      const ALT_FILL = { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: 'FFF2F2F2' } };
      const THIN_BORDER = {
        top: { style: 'thin' as const, color: { argb: 'FF000000' } },
        left: { style: 'thin' as const, color: { argb: 'FF000000' } },
        bottom: { style: 'thin' as const, color: { argb: 'FF000000' } },
        right: { style: 'thin' as const, color: { argb: 'FF000000' } },
      };

      for (const v of data.ventas) {
        const fechaStr = v.fecha.slice(0, 10); // "YYYY-MM-DD"
        const [y, m, d] = fechaStr.split('-');

        // Build product detail string with block notation for DC
        const detalleParts: string[] = [];
        if (v.items && v.items.length > 0) {
          for (const item of v.items) {
            detalleParts.push(formatItemDetail(item));
          }
        } else {
          // Fallback: no items available
          detalleParts.push(`${Number(v.cantidadTotalKg).toFixed(1)} kg`);
        }
        const detalle = detalleParts.join('\n');

        ws.addRow({
          fecha: `${d}/${m}/${y}`,
          sede: v.sedeNombre ?? '',
          metodoPago: metodoPagoLabel[v.metodoPago] ?? v.metodoPago,
          detalle,
          ingresoTotal: Number(v.ingresoTotal),
          gananciaBruta: Number(v.gananciaBruta),
          saldo: Number(v.saldo),
        });
      }

      // Header styling
      const headerRow = ws.getRow(1);
      headerRow.height = 24;
      for (let c = 1; c <= colDefs.length; c++) {
        const cell = headerRow.getCell(c);
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
        cell.fill = HEADER_FILL;
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.border = THIN_BORDER;
      }

      // Data rows styling
      const dataEnd = 1 + data.ventas.length;
      for (let r = 2; r <= dataEnd; r++) {
        const row = ws.getRow(r);
        const isEven = (r - 2) % 2 === 1;
        // Height based on number of lines in detalle cell
        const detalleValue = row.getCell(DETALLE_COL_IDX).value ?? '';
        const lineCount = String(detalleValue).split('\n').length;
        row.height = Math.max(20, lineCount * 16);
        for (let c = 1; c <= colDefs.length; c++) {
          const cell = row.getCell(c);
          const t = colDefs[c - 1].type;
          cell.border = THIN_BORDER;
          if (isEven) cell.fill = ALT_FILL;
          cell.alignment = {
            horizontal: t === 'text' ? 'left' : 'right',
            vertical: 'middle',
            wrapText: c === DETALLE_COL_IDX,
          };
          if (t !== 'text') cell.numFmt = NUM_FMT[t];
        }
      }

      // Auto-fit: for detalle column, use the longest single line (not total length)
      ws.columns.forEach((col, idx) => {
        const colIdx = idx + 1;
        if (colIdx === DETALLE_COL_IDX) {
          // Use longest single line across all rows
          let maxLineLen = String(col.header ?? '').length;
          for (let r = 2; r <= ws.rowCount; r++) {
            const val = String(ws.getRow(r).getCell(colIdx).value ?? '');
            for (const line of val.split('\n')) {
              if (line.length > maxLineLen) maxLineLen = line.length;
            }
          }
          col.width = Math.max(50, Math.min(80, maxLineLen + 4));
        } else {
          let maxLen = String(col.header ?? '').length;
          for (let r = 2; r <= ws.rowCount; r++) {
            const len = String(ws.getRow(r).getCell(colIdx).value ?? '').length;
            if (len > maxLen) maxLen = len;
          }
          col.width = Math.min(20, Math.max(12, maxLen + 2));
        }
      });

      ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: dataEnd, column: colDefs.length } };

      const buffer = await wb.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const today = new Date().toISOString().slice(0, 10);
      a.download = `Historial_${data.cliente.nombre}_${today}.xlsx`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch {
      toast.error('Error al exportar Excel');
    }
  }

  if (!cliente) return null;

  const tipoLabel = tipoClienteLabel[cliente.tipo as TipoCliente] ?? cliente.tipo;
  const saldoPendiente = data ? Number(data.saldoPendiente) : 0;
  const totalGanancia = data ? Number(data.totalGanancia) : 0;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="size-5" />
              Historial de {cliente.nombre}
            </DialogTitle>
            <DialogDescription>
              {tipoLabel} — {data ? `${data.totalVentas} ventas` : 'Cargando...'}
            </DialogDescription>
          </DialogHeader>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
            </div>
          ) : data ? (
            <div className="space-y-4">
              {/* Stats summary */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">Total Ventas</p>
                  <p className="text-lg font-semibold">{data.totalVentas}</p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">Ingresos Totales</p>
                  <p className="text-lg font-semibold">{formatCurrency(data.totalIngresos)}</p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">Ganancia Bruta</p>
                  <p className={`text-lg font-semibold ${totalGanancia < 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {formatCurrency(data.totalGanancia)}
                  </p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">Saldo Pendiente</p>
                  <p className={`text-lg font-semibold ${saldoPendiente > 0 ? 'text-red-600' : ''}`}>
                    {formatCurrency(data.saldoPendiente)}
                  </p>
                </div>
              </div>

              {/* Sede filter */}
              {sedes.length > 1 && (
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">Sede:</span>
                  <Select value={sedeFilter} onValueChange={(v) => setSedeFilter(v ?? '')}>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Todas las sedes" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Todas las sedes</SelectItem>
                      {sedes.map((s) => (
                        <SelectItem key={s.id} value={s.id}>{s.nombre}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Ventas table */}
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                       <TableHead className="text-xs">Fecha</TableHead>
                       {sedes.length > 0 && <TableHead className="text-xs">Sede</TableHead>}
                       <TableHead className="text-xs">Método de Pago</TableHead>
                       <TableHead className="text-xs">Detalle de Productos</TableHead>
                       <TableHead className="text-right text-xs">Ingreso Total</TableHead>
                       <TableHead className="text-right text-xs">Ganancia Bruta</TableHead>
                       <TableHead className="text-right text-xs">Saldo</TableHead>
                       <TableHead className="text-xs"></TableHead>
                     </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.ventas.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={sedes.length > 0 ? 8 : 7} className="text-center text-muted-foreground py-8">
                          No hay ventas registradas
                        </TableCell>
                      </TableRow>
                    ) : (
                      data.ventas
                        .filter((venta) => !sedeFilter || venta.sedeId === sedeFilter)
                        .map((venta) => {
                        const isCredito = venta.metodoPago === 'CREDITO';
                        const saldoPositive = isCredito && !venta.saldo.startsWith('-') && venta.saldo !== '0' && venta.saldo !== '0.00';
                        return (
                          <TableRow key={venta.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setVentaToView(venta)}>
                            <TableCell className="py-1.5 text-xs">
                              {new Date(venta.fecha).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                            </TableCell>
                            {sedes.length > 0 && (
                              <TableCell className="py-1.5 text-xs">
                                {venta.sedeNombre ?? '—'}
                              </TableCell>
                            )}
                            <TableCell className="py-1.5 text-xs">
                              <Badge variant={isCredito ? 'default' : 'secondary'} className={`text-[10px] px-1.5 py-0 ${
                                venta.metodoPago === 'EFECTIVO' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                                venta.metodoPago === 'CREDITO' ? 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200' :
                                'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                              }`}>
                                {metodoPagoLabel[venta.metodoPago] ?? venta.metodoPago}
                              </Badge>
                            </TableCell>
                             <TableCell className="py-1.5 text-xs">
                               {venta.items && venta.items.length > 0
                                 ? venta.items.map((item, i) => (
                                     <span key={item.id ?? i}>
                                       {i > 0 && <br />}
                                       {formatItemDetail(item)}
                                     </span>
                                   ))
                                 : `${Number(venta.cantidadTotalKg).toFixed(1)} kg`}
                             </TableCell>
                            <TableCell className="py-1.5 text-right text-xs font-medium">{formatCurrency(venta.ingresoTotal)}</TableCell>
                            <TableCell className={`py-1.5 text-right text-xs font-medium ${Number(venta.gananciaBruta) < 0 ? 'text-red-600' : 'text-green-600'}`}>
                              {formatCurrency(venta.gananciaBruta)}
                            </TableCell>
                            <TableCell className={`py-1.5 text-right text-xs ${saldoPositive ? 'text-red-600 font-semibold' : ''}`}>
                              {saldoPositive ? formatCurrency(venta.saldo) : '—'}
                            </TableCell>
                            <TableCell className="py-1.5 text-xs">
                              <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={(e) => { e.stopPropagation(); setVentaToView(venta); }}>
                                <Eye className="size-3.5" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Export button */}
              <div className="flex justify-end">
                <Button variant="outline" size="sm" onClick={handleExportExcel} disabled={data.ventas.length === 0}>
                  <Download className="size-4 mr-2" />
                  Exportar Excel
                </Button>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* Venta detail dialog */}
      {ventaToView && (
         <VentaDetalleDialog
           venta={ventaToView}
           clienteMap={clienteMap}
           loteProductoMap={loteProductoMap}
           loteProveedorNombreMap={loteProveedorNombreMap}
         />
      )}
    </>
  );
}