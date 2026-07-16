'use client';

import { Table } from '@tanstack/react-table';
import { Download, FileText, Loader2, Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';

export interface FilterConfig {
  columnId: string;
  label: string;
  options: { label: string; value: string }[];
}

export interface PdfButtonConfig {
  label: string;
  onClick: () => void;
  loading?: boolean;
}

interface DataTableToolbarProps<TData> {
  table: Table<TData>;
  searchPlaceholder?: string;
  filters?: FilterConfig[];
  showDeleted?: boolean;
  onShowDeletedChange?: (show: boolean) => void;
  saldoPendiente?: boolean;
  onSaldoPendienteChange?: (checked: boolean) => void;
  pdfButtons?: PdfButtonConfig[];
  onExportExcel?: () => Promise<void>;
  isExporting?: boolean;
}

export function DataTableToolbar<TData>({
  table,
  searchPlaceholder = 'Buscar...',
  filters = [],
  showDeleted,
  onShowDeletedChange,
  saldoPendiente,
  onSaldoPendienteChange,
  pdfButtons,
  onExportExcel,
  isExporting,
}: DataTableToolbarProps<TData>) {
  const globalFilter = table.getState().globalFilter as string | undefined;

  // Check if metodoPago filter includes CREDITO for conditional saldoPendiente display
  // Only relevant for tables that have a metodoPago column (Ventas)
  const hasMetodoPagoFilter = filters.some(f => f.columnId === 'metodoPago');
  const metodoPagoValue = hasMetodoPagoFilter
    ? (table.getColumn('metodoPago')?.getFilterValue() as string | undefined)
    : undefined;
  const isCredito = metodoPagoValue === 'CREDITO' || metodoPagoValue?.includes('CREDITO');

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="relative flex-1 min-w-[200px] max-w-full sm:max-w-sm">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input
          placeholder={searchPlaceholder}
          value={globalFilter ?? ''}
          onChange={(e) => table.setGlobalFilter(e.target.value || undefined)}
          className="pl-8 pr-8"
        />
        {globalFilter && (
          <button
            onClick={() => table.setGlobalFilter(undefined)}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        )}
      </div>
      {filters.map((filter) => {
        const column = table.getColumn(filter.columnId);
        if (!column) return null;
        const currentValue = column.getFilterValue() as string | undefined;
        const isMultiValue = typeof currentValue === 'string' && currentValue.includes(',');
        const currentLabel = isMultiValue
          ? currentValue!.split(',').map(v => filter.options.find(o => o.value === v)?.label).filter(Boolean).join(' / ')
          : currentValue
            ? filter.options.find(o => o.value === currentValue)?.label
            : undefined;
        return (
          <Select
            key={filter.columnId}
            value={isMultiValue ? '__multi__' : (currentValue ?? '')}
            onValueChange={(v) => {
              if (v === null) return;
              if (v === '__all__') {
                column.setFilterValue(undefined);
              } else if (v === '__multi__') {
                // Keep current multi-value, don't change
                return;
              } else {
                column.setFilterValue(v);
              }
            }}
          >
            <SelectTrigger size="sm" className="w-full sm:w-[160px]">
              <SelectValue placeholder={filter.label}>{currentLabel ?? (currentValue ? filter.label : undefined)}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Todos</SelectItem>
              {filter.options.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      })}
      {onShowDeletedChange && (
        <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer select-none">
          <Checkbox
            checked={showDeleted ?? false}
            onCheckedChange={(checked) => onShowDeletedChange(checked === true)}
          />
          Mostrar eliminados
        </label>
      )}
      {onSaldoPendienteChange && isCredito && (
        <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer select-none">
          <Checkbox
            checked={saldoPendiente ?? false}
            onCheckedChange={(checked) => onSaldoPendienteChange(checked === true)}
          />
          Solo deudas pendientes
        </label>
      )}
      {pdfButtons && pdfButtons.length > 0 && pdfButtons.map((btn) => (
        <Button
          key={btn.label}
          variant="outline"
          size="sm"
          onClick={btn.onClick}
          disabled={btn.loading}
        >
          {btn.loading ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <FileText className="size-4" />
          )}
          {btn.label}
        </Button>
      ))}
      {onExportExcel && (
        <Button
          variant="outline"
          size="sm"
          onClick={onExportExcel}
          disabled={isExporting}
          className="ml-auto"
        >
          {isExporting ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Download className="size-4" />
          )}
          Exportar Excel
        </Button>
      )}
    </div>
  );
}