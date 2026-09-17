import { clsx } from 'clsx';
import { Card, Badge } from '../ui';
import { Activity, Clock } from 'lucide-react';
import type { SurveillanceCycle, CycleStatus } from '../../types';
import { format } from 'date-fns';

interface CycleStatusCardProps {
  cycle?: SurveillanceCycle | null;
  loading?: boolean;
  error?: string | null;
}

const statusLabels: Record<CycleStatus, string> = {
  OPEN_FOR_REPORTING: 'Open for Reporting',
  PROCESSING: 'Processing',
  ANALYSIS_READY: 'Analysis Ready',
  CYCLE_CLOSED: 'Cycle Closed',
};

const statusVariants: Record<CycleStatus, 'success' | 'warning' | 'info' | 'neutral'> = {
  OPEN_FOR_REPORTING: 'success',
  PROCESSING: 'warning',
  ANALYSIS_READY: 'info',
  CYCLE_CLOSED: 'neutral',
};

export function CycleStatusCard({ cycle, loading, error }: CycleStatusCardProps) {
  if (loading) {
    return (
      <Card padding="md">
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-neutral-200 animate-pulse" />
            <div className="h-5 w-40 bg-neutral-200 animate-pulse rounded" />
          </div>
          <div className="h-4 w-32 bg-neutral-200 animate-pulse rounded" />
          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-neutral-100">
            <div className="space-y-2">
              <div className="h-4 w-24 bg-neutral-200 animate-pulse rounded" />
              <div className="h-4 w-20 bg-neutral-200 animate-pulse rounded" />
            </div>
            <div className="space-y-2">
              <div className="h-4 w-24 bg-neutral-200 animate-pulse rounded" />
              <div className="h-4 w-20 bg-neutral-200 animate-pulse rounded" />
            </div>
          </div>
        </div>
      </Card>
    );
  }

  if (error || !cycle) {
    return (
      <Card padding="md" variant="outlined">
        <div className="flex items-center gap-3 text-neutral-500">
          <Activity className="w-5 h-5 text-neutral-400" aria-hidden="true" />
          <span>Cycle information unavailable</span>
        </div>
      </Card>
    );
  }

  const startTime = new Date(cycle.startTime);
  const endTime = new Date(cycle.endTime);
  const lastUpdate = cycle.lastUpdate ? new Date(cycle.lastUpdate) : null;

  const isActive = cycle.status === 'OPEN_FOR_REPORTING' || cycle.status === 'PROCESSING';

  return (
    <Card padding="md" className="border-l-4 border-primary-500">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-lg bg-primary-50 flex items-center justify-center">
          <Activity size={18} className="text-primary-600" aria-hidden="true" />
        </div>
        <h3 className="text-lg font-semibold text-neutral-900">Today's Surveillance Cycle</h3>
      </div>

      <div className="relative mb-6">
        <div className="flex items-center justify-between text-xs text-neutral-500 mb-2">
          <span className="flex items-center gap-1">
            <Clock size={12} aria-hidden="true" />
            {format(startTime, 'h:mm a')} IST
          </span>
          <span className="flex items-center gap-1">
            <Clock size={12} aria-hidden="true" />
            {format(endTime, 'h:mm a')} IST Next Day
          </span>
        </div>
        <div className="relative h-2 bg-neutral-200 rounded-full overflow-hidden">
          <div
            className={clsx(
              'h-full rounded-full transition-all duration-500',
              isActive ? 'bg-primary-500' : 'bg-neutral-400'
            )}
            style={{ width: isActive ? '60%' : '100%' }}
            role="progressbar"
            aria-valuenow={isActive ? 60 : 100}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Surveillance cycle progress"
          />
          {isActive && (
            <div className="absolute top-1/2 -translate-y-1/2 left-[60%] w-3 h-3 rounded-full bg-primary-500 border-2 border-white shadow-md" aria-hidden="true" />
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 mb-4">
        <Badge variant={statusVariants[cycle.status]} dot size="md">
          {statusLabels[cycle.status]}
        </Badge>
      </div>

      <div className="grid grid-cols-2 gap-4 pt-4 border-t border-neutral-100">
        <div>
          <p className="text-xs text-neutral-500">Cycle ID</p>
          <p className="text-sm font-medium text-neutral-900 font-mono">{cycle.id}</p>
        </div>
        <div>
          <p className="text-xs text-neutral-500">Reports Received</p>
          <p className="text-sm font-medium text-neutral-900">{cycle.reportsReceived}</p>
        </div>
        <div>
          <p className="text-xs text-neutral-500">Reporting Taluks</p>
          <p className="text-sm font-medium text-neutral-900">{cycle.taluksReporting}</p>
        </div>
        <div>
          <p className="text-xs text-neutral-500">Last Updated</p>
          <p className="text-sm font-medium text-neutral-900">
            {lastUpdate ? format(lastUpdate, 'dd MMM, h:mm a') : '—'}
          </p>
        </div>
      </div>
    </Card>
  );
}