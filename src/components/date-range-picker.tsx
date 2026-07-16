'use client';

import { useState, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import { ChevronDown } from 'lucide-react';

function formatDateToYYYYMMDD(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

interface DateRangePickerProps {
  inicio: string;
  fin: string;
  onDateRangeChange: (inicio: string, fin: string) => void;
}

const QUICK_RANGES = [
  { label: 'Hoy', key: 'today' },
  { label: 'Esta Semana', key: 'thisWeek' },
  { label: 'Últimos 7 días', key: 'last7Days' },
  { label: 'Este Mes', key: 'thisMonth' },
  { label: 'Este Año', key: 'thisYear' },
] as const;

type QuickRangeKey = typeof QUICK_RANGES[number]['key'];

function getQuickRangeDates(key: QuickRangeKey): { inicio: string; fin: string } {
  const now = new Date();
  switch (key) {
    case 'today': {
      const today = formatDateToYYYYMMDD(now);
      return { inicio: today, fin: today };
    }
    case 'thisWeek': {
      const dayOfWeek = now.getDay();
      const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      const monday = new Date(now);
      monday.setDate(now.getDate() + diffToMonday);
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      return { inicio: formatDateToYYYYMMDD(monday), fin: formatDateToYYYYMMDD(sunday) };
    }
    case 'last7Days': {
      const start = new Date(now);
      start.setDate(now.getDate() - 6);
      return { inicio: formatDateToYYYYMMDD(start), fin: formatDateToYYYYMMDD(now) };
    }
    case 'thisMonth': {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      return { inicio: formatDateToYYYYMMDD(firstDay), fin: formatDateToYYYYMMDD(lastDay) };
    }
    case 'thisYear': {
      const firstDay = new Date(now.getFullYear(), 0, 1);
      const lastDay = new Date(now.getFullYear(), 11, 31);
      return { inicio: formatDateToYYYYMMDD(firstDay), fin: formatDateToYYYYMMDD(lastDay) };
    }
  }
}

export function DateRangePicker({ inicio, fin, onDateRangeChange }: DateRangePickerProps) {
  const [localInicio, setLocalInicio] = useState(inicio);
  const [localFin, setLocalFin] = useState(fin);

  const handleApply = useCallback(() => {
    if (localInicio && localFin) {
      onDateRangeChange(localInicio, localFin);
    }
  }, [localInicio, localFin, onDateRangeChange]);

  const handleQuickRange = useCallback((key: QuickRangeKey) => {
    const { inicio: rangeInicio, fin: rangeFin } = getQuickRangeDates(key);
    setLocalInicio(rangeInicio);
    setLocalFin(rangeFin);
    onDateRangeChange(rangeInicio, rangeFin);
  }, [onDateRangeChange]);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex items-center gap-2">
        <Input
          type="date"
          value={localInicio}
          onChange={(e) => setLocalInicio(e.target.value)}
          className="w-full sm:w-[140px]"
          aria-label="Fecha inicio"
        />
        <span className="text-muted-foreground text-sm">—</span>
        <Input
          type="date"
          value={localFin}
          onChange={(e) => setLocalFin(e.target.value)}
          className="w-full sm:w-[140px]"
          aria-label="Fecha fin"
        />
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={handleApply}
        disabled={!localInicio || !localFin}
      >
        Aplicar
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger className="inline-flex items-center justify-center gap-1 rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm whitespace-nowrap transition-colors outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 hover:bg-accent dark:bg-input/30 dark:hover:bg-input/50">
          Filtros rápidos
          <ChevronDown className="size-3" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {QUICK_RANGES.map((range) => (
            <DropdownMenuItem key={range.key} onClick={() => handleQuickRange(range.key)}>
              {range.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}