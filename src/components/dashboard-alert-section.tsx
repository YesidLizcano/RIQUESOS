'use client';

import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, AlertOctagon } from 'lucide-react';
import type { AlertaLoteResponse, AlertasResultResponse } from '@/presentation/dtos';
import { AlertaTipo, AlertaSeveridad } from '@/presentation/dtos';

interface DashboardAlertSectionProps {
  alertas: AlertaLoteResponse[];
  resumen: AlertasResultResponse['resumen'];
}

const ALERT_CONFIG: Record<string, { title: string; variant: 'destructive' | 'warning' }> = {
  [AlertaTipo.STOCK_CRITICO]: {
    title: 'lotes con stock crítico (< 20 kg o < 20%)',
    variant: 'destructive',
  },
  [AlertaTipo.STOCK_BAJO]: {
    title: 'lotes con stock bajo (< 50 kg)',
    variant: 'warning',
  },
  [AlertaTipo.MUY_ANTIGUO]: {
    title: 'lotes con más de 60 días en inventario',
    variant: 'destructive',
  },
  [AlertaTipo.ANTIGUO]: {
    title: 'lotes con más de 30 días en inventario',
    variant: 'warning',
  },
};

// Sort order: critical first, then by type priority
const TYPE_ORDER: Record<string, number> = {
  [AlertaTipo.STOCK_CRITICO]: 0,
  [AlertaTipo.MUY_ANTIGUO]: 1,
  [AlertaTipo.STOCK_BAJO]: 2,
  [AlertaTipo.ANTIGUO]: 3,
};

export function DashboardAlertSection({ alertas, resumen }: DashboardAlertSectionProps) {
  if (resumen.total === 0) return null;

  // Group by alertaTipo
  const grouped = new Map<AlertaTipo, AlertaLoteResponse[]>();
  for (const alerta of alertas) {
    const existing = grouped.get(alerta.alertaTipo) ?? [];
    existing.push(alerta);
    grouped.set(alerta.alertaTipo, existing);
  }

  // Sort by type priority
  const sortedTypes = Array.from(grouped.keys()).sort(
    (a, b) => TYPE_ORDER[a] - TYPE_ORDER[b]
  );

  return (
    <div className="space-y-3">
      {sortedTypes.map((tipo) => {
        const items = grouped.get(tipo)!;
        const config = ALERT_CONFIG[tipo];
        const Icon = config.variant === 'destructive' ? AlertOctagon : AlertTriangle;

        return (
          <Alert key={tipo} variant={config.variant}>
            <Icon className="size-4" />
            <AlertTitle>
              {items.length} {config.title}
            </AlertTitle>
            <AlertDescription>
              {items.map((a) => `${a.tipoProducto} — ${a.proveedorNombre}`).join(' · ')}
            </AlertDescription>
          </Alert>
        );
      })}
    </div>
  );
}