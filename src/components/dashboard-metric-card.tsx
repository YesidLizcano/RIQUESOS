import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

interface MetricCardProps {
  title: string;
  value: ReactNode;
  description?: string;
  variant?: 'default' | 'success' | 'warning' | 'destructive';
  icon?: ReactNode;
  onClick?: () => void;
}

const variantStyles: Record<string, string> = {
  default: '',
  success: 'text-green-600 dark:text-green-400',
  warning: 'text-amber-600 dark:text-amber-400',
  destructive: 'text-red-600 dark:text-red-400',
};

export function MetricCard({
  title,
  value,
  description,
  variant = 'default',
  icon,
  onClick,
}: MetricCardProps) {
  return (
    <Card onClick={onClick} className={cn(onClick && 'cursor-pointer hover:bg-muted/50 transition-colors')}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
          {icon}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className={cn('text-2xl font-bold', variantStyles[variant])}>
          {value}
        </div>
        {description && (
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        )}
      </CardContent>
    </Card>
  );
}