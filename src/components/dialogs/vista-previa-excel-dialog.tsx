'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, Download, X } from 'lucide-react';
import type { ColumnMapItem } from '@/hooks/use-export-excel';

interface VistaPreviaExcelDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  columnMap: ColumnMapItem[];
  data: unknown[][]; // The formatted data matrix (rows × columns)
  entityName: string;
  onDownload: () => Promise<void>; // The actual download function
}

const MAX_PREVIEW_ROWS = 100;

function isNumericColumn(col: ColumnMapItem): boolean {
  const t = col.type ?? 'text';
  return t === 'currency' || t === 'decimal' || t === 'percentage';
}

function formatCellValue(value: unknown, col: ColumnMapItem): string {
  if (value === null || value === undefined || value === '') return '';
  // Dates — show as DD/MM/YYYY
  if (value instanceof Date) {
    const d = value as Date;
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    return `${day}/${month}/${d.getFullYear()}`;
  }
  // Currency
  if (col.type === 'currency' && typeof value === 'number') {
    return `$${value.toLocaleString('es-AR')}`;
  }
  // Decimal
  if (col.type === 'decimal' && typeof value === 'number') {
    return value.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  // Percentage
  if (col.type === 'percentage' && typeof value === 'number') {
    return `${(value * 100).toFixed(1)}%`;
  }
  return String(value);
}

export function VistaPreviaExcelDialog({
  open,
  onOpenChange,
  columnMap,
  data,
  entityName,
  onDownload,
}: VistaPreviaExcelDialogProps) {
  const [isDownloading, setIsDownloading] = useState(false);

  const truncated = data.length > MAX_PREVIEW_ROWS;
  const displayRows = truncated ? data.slice(0, MAX_PREVIEW_ROWS) : data;

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      await onDownload();
      onOpenChange(false);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[85vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-2">
          <DialogTitle>Vista Previa — {entityName}</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-x-auto overflow-y-auto px-6 max-h-[60vh]">
          {data.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No hay datos para exportar</p>
          ) : (
            <table className="w-full border-collapse text-sm">
              <thead className="sticky top-0 z-10">
                <tr className="bg-white dark:bg-popover border-b-2">
                  {columnMap.map((col) => (
                    <th
                      key={col.key}
                      className={`px-3 py-2 font-semibold text-left whitespace-nowrap ${
                        isNumericColumn(col) ? 'text-right' : 'text-left'
                      }`}
                    >
                      {col.header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {displayRows.map((row, rowIdx) => (
                  <tr
                    key={rowIdx}
                    className={rowIdx % 2 === 1 ? 'bg-muted/50' : 'bg-white dark:bg-popover'}
                  >
                    {columnMap.map((col, colIdx) => (
                      <td
                        key={col.key}
                        className={`px-3 py-1.5 whitespace-nowrap border-b border-border/50 ${
                          isNumericColumn(col) ? 'text-right tabular-nums' : 'text-left'
                        }`}
                      >
                        {formatCellValue(row[colIdx], col)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {truncated && (
          <p className="px-6 py-2 text-xs text-muted-foreground text-center">
            Mostrando {MAX_PREVIEW_ROWS} de {data.length} filas. El archivo completo se descargará al confirmar.
          </p>
        )}

        <DialogFooter className="px-6 pb-6 pt-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isDownloading}
          >
            <X className="size-4" />
            Cancelar
          </Button>
          <Button
            onClick={handleDownload}
            disabled={isDownloading || data.length === 0}
          >
            {isDownloading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Download className="size-4" />
            )}
            Descargar .xlsx
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}