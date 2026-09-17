import { clsx } from 'clsx';
import type { ComponentType, SVGProps } from 'react';
import { Card } from '../ui';

interface LucideIconProps extends SVGProps<SVGSVGElement> {
  size?: number | string;
}

interface KpiCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: {
    value: number;
    label: string;
  };
  icon?: ComponentType<LucideIconProps>;
  status?: 'normal' | 'warning' | 'critical';
  loading?: boolean;
}

export function KpiCard({
  title,
  value,
  subtitle,
  trend,
  icon: IconComponent,
  status = 'normal',
  loading = false,
}: KpiCardProps) {
  const statusColors = {
    normal: 'text-neutral-900',
    warning: 'text-warning-600',
    critical: 'text-error-600',
  };

  const statusBgColors = {
    normal: 'bg-neutral-100',
    warning: 'bg-warning-50',
    critical: 'bg-error-50',
  };

  if (loading) {
    return (
      <Card padding="md">
        <div className="space-y-3">
          <div className="h-4 w-3/4 bg-neutral-200 animate-pulse rounded" />
          <div className="h-8 w-1/2 bg-neutral-200 animate-pulse rounded" />
          <div className="h-4 w-1/3 bg-neutral-200 animate-pulse rounded" />
        </div>
      </Card>
    );
  }

  return (
    <Card padding="md" className="hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-neutral-500 truncate">{title}</p>
          <p className={clsx('mt-1 text-2xl font-bold truncate', statusColors[status])}>
            {value}
          </p>
          {subtitle && (
            <p className="mt-1 text-sm text-neutral-500 truncate">{subtitle}</p>
          )}
          {trend && (
            <div className="mt-2 flex items-center gap-1.5">
              <span className={clsx('text-sm font-medium', trend.value >= 0 ? 'text-success-600' : 'text-error-600')}>
                {trend.value >= 0 ? '+' : ''}{trend.value}%
              </span>
              <span className="text-sm text-neutral-500">{trend.label}</span>
            </div>
          )}
        </div>
        {IconComponent && (
          <div className={clsx('flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center', statusBgColors[status])}>
            <IconComponent size={20} className={clsx(statusColors[status])} aria-hidden="true" />
          </div>
        )}
      </div>
    </Card>
  );
}

export function KpiCardSkeleton() {
  return (
    <Card padding="md">
      <div className="space-y-3">
        <div className="h-4 w-3/4 bg-neutral-200 animate-pulse rounded" />
        <div className="h-8 w-1/2 bg-neutral-200 animate-pulse rounded" />
        <div className="h-4 w-1/3 bg-neutral-200 animate-pulse rounded" />
      </div>
    </Card>
  );
}