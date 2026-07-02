'use client';

import { Table } from '@tanstack/react-table';
import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export interface FilterConfig {
  columnId: string;
  label: string;
  options: { label: string; value: string }[];
}

interface DataTableToolbarProps<TData> {
  table: Table<TData>;
  searchPlaceholder?: string;
  filters?: FilterConfig[];
}

export function DataTableToolbar<TData>({
  table,
  searchPlaceholder = 'Buscar...',
  filters = [],
}: DataTableToolbarProps<TData>) {
  const globalFilter = table.getState().globalFilter as string | undefined;

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="relative flex-1 min-w-[200px] max-w-sm">
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
        return (
          <Select
            key={filter.columnId}
            value={currentValue ?? ''}
            onValueChange={(v) => {
              if (v === null) return;
              column.setFilterValue(v === '__all__' ? undefined : v);
            }}
          >
            <SelectTrigger size="sm" className="w-[160px]">
              <SelectValue placeholder={filter.label} />
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
    </div>
  );
}