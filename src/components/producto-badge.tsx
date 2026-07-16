'use client';

import { TipoProducto } from '@/domain/enums';
import { tipoProductoLabel } from '@/domain/labels';
import { Badge } from '@/components/ui/badge';

const PRODUCTO_STYLES: Record<string, string> = {
  DOBLE_CREMA: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
  SEMISALADO: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
  RECORTES_DOBLE_CREMA: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
};

interface ProductoBadgeProps {
  producto: string;
  className?: string;
  compact?: boolean;
}

export function ProductoBadge({ producto, className, compact }: ProductoBadgeProps) {
  const label = tipoProductoLabel[producto as TipoProducto] ?? producto;
  const style = PRODUCTO_STYLES[producto] ?? '';

  return (
    <Badge
      variant="outline"
      className={`${style} border-transparent ${compact ? 'text-[10px] px-1 py-0 h-4' : ''} ${className ?? ''}`}
    >
      {label}
    </Badge>
  );
}