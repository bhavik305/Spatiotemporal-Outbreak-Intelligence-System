import { AlertCircle, AlertTriangle, CheckCircle, MapPin, Calendar } from 'lucide-react';
import { Badge } from '../ui';
import type { Alert } from '../../types';

interface AlertsListProps {
  alerts: Alert[] | null;
  loading?: boolean;
  error?: string | null;
}

const severityStyles: Record<Alert['severity'], { bg: string; text: string; border: string; iconColor: string }> = {
  Critical: { bg: 'bg-error-50', text: 'text-error-700', border: 'border-error-200', iconColor: 'text-error-500' },
  High: { bg: 'bg-error-50', text: 'text-error-700', border: 'border-error-200', iconColor: 'text-error-500' },
  Moderate: { bg: 'bg-warning-50', text: 'text-warning-700', border: 'border-warning-200', iconColor: 'text-warning-500' },
  Low: { bg: 'bg-success-50', text: 'text-success-700', border: 'border-success-200', iconColor: 'text-success-500' },
};

export function AlertsList({ alerts, loading, error }: AlertsListProps) {
  if (loading) {
    return (
      <div className="space-y-4" role="status" aria-label="Loading alerts">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="animate-pulse p-4 bg-neutral-50 rounded-lg border border-neutral-100">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-neutral-200 flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-3/4 bg-neutral-200 rounded" />
                <div className="h-3 w-1/2 bg-neutral-200 rounded" />
                <div className="h-3 w-1/3 bg-neutral-200 rounded" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-3 p-4 bg-neutral-50 rounded-lg border border-neutral-200 text-neutral-500" role="alert">
        <AlertCircle className="w-5 h-5 text-neutral-400 flex-shrink-0" aria-hidden="true" />
        Failed to load alerts: {error}
      </div>
    );
  }

  if (!alerts || alerts.length === 0) {
    return (
      <div className="flex items-center gap-3 p-4 bg-neutral-50 rounded-lg border border-neutral-100">
        <div className="w-10 h-10 rounded-lg bg-success-100 flex items-center justify-center flex-shrink-0">
          <CheckCircle className="w-5 h-5 text-success-600" aria-hidden="true" />
        </div>
        <div>
          <p className="font-medium text-neutral-900">No active alerts</p>
          <p className="text-sm text-neutral-500">No public health alerts have been issued for the current surveillance cycle.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3" role="list" aria-label="Public health alerts">
      {alerts.map((alert, index) => {
        const styles = severityStyles[alert.severity];
        const isCritical = alert.severity === 'Critical';
        const isHigh = alert.severity === 'High';

        return (
          <div
            key={alert.id || index}
            className={`p-4 rounded-lg border ${styles.border} ${styles.bg}`}
            role="listitem"
          >
            <div className="flex items-start gap-3">
              <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${isCritical || isHigh ? 'bg-error-100' : 'bg-warning-100'}`}>
                {isCritical ? (
                  <AlertTriangle className={`w-4 h-4 ${styles.iconColor}`} aria-hidden="true" />
                ) : (
                  <AlertCircle className={`w-4 h-4 ${styles.iconColor}`} aria-hidden="true" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <Badge variant={isCritical || isHigh ? 'error' : alert.severity === 'Moderate' ? 'warning' : 'success'} size="sm">
                        {alert.severity}
                      </Badge>
                      <span className="font-medium text-neutral-900 capitalize">{alert.disease}</span>
                    </div>
                    <p className="text-sm text-neutral-600 mt-1">{alert.explanation}</p>
                    <div className="flex items-center gap-3 mt-2 text-xs text-neutral-500">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" aria-hidden="true" />
                        {alert.taluk}, {alert.district}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" aria-hidden="true" />
                        {new Date(alert.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </span>
                    </div>
                  </div>
                </div>
                {alert.recommendedActions && alert.recommendedActions.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-current/20">
                    <p className="text-xs font-medium text-neutral-700 mb-2">Recommended Actions:</p>
                    <ul className="space-y-1 text-sm text-neutral-600">
                      {alert.recommendedActions.map((action, actionIndex) => (
                        <li key={actionIndex} className="flex items-start gap-2">
                          <span className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-current mt-1.5" aria-hidden="true" />
                          <span>{action}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}