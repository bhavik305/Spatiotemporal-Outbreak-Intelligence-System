import { Card, Badge } from '../ui';
import { Activity, AlertTriangle, CheckCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';
import type { TemporalSignal } from '../../types';

interface TemporalSignalsProps {
  signals: TemporalSignal[] | null;
  loading?: boolean;
  error?: string | null;
}

const severityColors: Record<string, { bg: string; text: string; border: string }> = {
  true: { bg: 'bg-error-50', text: 'text-error-700', border: 'border-error-200' },
  false: { bg: 'bg-success-50', text: 'text-success-700', border: 'border-success-200' },
};

export function TemporalSignals({ signals, loading, error }: TemporalSignalsProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  if (loading) {
    return (
      <Card padding="md">
        <div className="space-y-4" role="status" aria-label="Loading temporal signals">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="animate-pulse flex items-center gap-3 p-4 bg-neutral-50 rounded-lg">
              <div className="w-10 h-10 rounded-lg bg-neutral-200 flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-3/4 bg-neutral-200 rounded" />
                <div className="h-3 w-1/2 bg-neutral-200 rounded" />
              </div>
            </div>
          ))}
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card padding="md" variant="outlined">
        <div className="flex items-center gap-3 p-4 bg-neutral-50 rounded-lg text-neutral-500">
          <Activity className="w-5 h-5 text-neutral-400" aria-hidden="true" />
          Failed to load temporal signals: {error}
        </div>
      </Card>
    );
  }

  if (!signals || signals.length === 0) {
    return (
      <Card padding="md">
        <div className="flex items-center gap-3 p-4 bg-neutral-50 rounded-lg">
          <div className="w-10 h-10 rounded-lg bg-success-100 flex items-center justify-center flex-shrink-0">
            <CheckCircle className="w-5 h-5 text-success-600" aria-hidden="true" />
          </div>
          <div>
            <p className="font-medium text-neutral-900">No temporal signals detected</p>
            <p className="text-sm text-neutral-500">Surveillance data shows normal patterns across all monitored taluks.</p>
          </div>
        </div>
      </Card>
    );
  }

  const signalsWithDetected = signals.filter((s) => s.signalDetected);
  const signalsNormal = signals.filter((s) => !s.signalDetected);

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const renderSignalItem = (signal: TemporalSignal, index: number) => {
    const isExpanded = expandedIds.has(signal.taluk);
    const isDetected = signal.signalDetected;
    const colors = severityColors[isDetected.toString()];

    return (
      <div key={`${signal.taluk}-${index}`} className={`p-4 rounded-lg border ${colors.border} ${colors.bg}`}>
        <div className="flex items-start gap-3">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${isDetected ? 'bg-error-100' : 'bg-success-100'}`}>
            {isDetected ? (
              <AlertTriangle className="w-5 h-5 text-error-600" aria-hidden="true" />
            ) : (
              <CheckCircle className="w-5 h-5 text-success-600" aria-hidden="true" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h4 className="font-medium text-neutral-900">{signal.taluk}, {signal.district}</h4>
                <p className="text-sm text-neutral-500 capitalize">{signal.disease}</p>
              </div>
              <Badge variant={isDetected ? 'error' : 'success'} dot size="sm">
                {isDetected ? 'Signal Detected' : 'Normal'}
              </Badge>
            </div>
            <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-neutral-500">Observed</p>
                <p className="font-medium text-neutral-900">{signal.observedActivity}</p>
              </div>
              <div>
                <p className="text-neutral-500">Expected</p>
                <p className="font-medium text-neutral-900">{signal.expectedBaseline}</p>
              </div>
              <div>
                <p className="text-neutral-500">Period</p>
                <p className="font-medium text-neutral-900">
                  {new Date(signal.detectionPeriod.start).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })} -{' '}
                  {new Date(signal.detectionPeriod.end).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                </p>
              </div>
              <div className="flex items-center">
                <button
                  onClick={() => toggleExpand(signal.taluk)}
                  className="flex items-center gap-1 text-primary-600 hover:text-primary-700 text-sm font-medium"
                  aria-expanded={isExpanded}
                  aria-controls={`signal-details-${signal.taluk}`}
                >
                  {isExpanded ? (
                    <>
                      <ChevronUp className="w-4 h-4" aria-hidden="true" />
                      Less
                    </>
                  ) : (
                    <>
                      <ChevronDown className="w-4 h-4" aria-hidden="true" />
                      Details
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
        {isExpanded && (
          <div id={`signal-details-${signal.taluk}`} className="mt-4 pt-4 border-t border-current/20 space-y-3" role="region" aria-label="Technical details">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-neutral-500">Model</p>
                <p className="font-mono text-neutral-900">{signal.technicalDetails?.model || '—'}</p>
              </div>
              <div>
                <p className="text-neutral-500">Model Version</p>
                <p className="font-mono text-neutral-900">{signal.technicalDetails?.modelVersion || '—'}</p>
              </div>
              <div>
                <p className="text-neutral-500">Temporal Analysis</p>
                <p className="font-medium text-neutral-900">{signal.technicalDetails?.temporalAnalysis || '—'}</p>
              </div>
              <div>
                <p className="text-neutral-500">Spatial Analysis</p>
                <p className="font-medium text-neutral-900">{signal.technicalDetails?.spatialAnalysis || '—'}</p>
              </div>
              <div className="sm:col-span-2">
                <p className="text-neutral-500">Cluster Method</p>
                <p className="font-medium text-neutral-900">{signal.technicalDetails?.clusterMethod || '—'}</p>
              </div>
              <div className="sm:col-span-2">
                <p className="text-neutral-500">Input Period</p>
                <p className="font-medium text-neutral-900">{signal.technicalDetails?.inputPeriod || '—'}</p>
              </div>
              {signal.technicalDetails?.trainingValidation && (
                <div className="sm:col-span-2">
                  <p className="text-neutral-500">Training/Validation</p>
                  <p className="font-medium text-neutral-900">{signal.technicalDetails.trainingValidation}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <Card padding="md">
      <div className="mb-4">
        <h4 className="font-medium text-neutral-900">Temporal Intelligence Signals</h4>
        <p className="text-sm text-neutral-500">
          {signalsWithDetected.length} signal{signalsWithDetected.length !== 1 ? 's' : ''} detected out of {signals.length} monitored taluk{signals.length !== 1 ? 's' : ''}
        </p>
      </div>
      <div className="space-y-3">
        {signalsWithDetected.map(renderSignalItem)}
        {signalsNormal.length > 0 && (
          <details className="group">
            <summary className="flex items-center gap-2 cursor-pointer p-3 bg-neutral-50 rounded-lg">
              <ChevronDown className="w-4 h-4 text-neutral-400 group-open:rotate-180 transition-transform" aria-hidden="true" />
              <span className="text-sm font-medium text-neutral-700">
                {signalsNormal.length} taluk{signalsNormal.length !== 1 ? 's' : ''} with normal patterns
              </span>
            </summary>
            <div className="mt-2 space-y-2">
              {signalsNormal.map(renderSignalItem)}
            </div>
          </details>
        )}
      </div>
    </Card>
  );
}