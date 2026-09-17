import { AlertCircle, MapPin, Shield, Stethoscope, Calendar, CheckCircle } from 'lucide-react';
import { Card } from '../ui';
import type { Advisory } from '../../types';

interface AdvisoryPanelProps {
  advisory: Advisory | null;
  loading?: boolean;
  error?: string | null;
}

export function AdvisoryPanel({ advisory, loading, error }: AdvisoryPanelProps) {
  if (loading) {
    return (
      <Card padding="md">
        <div className="space-y-4" role="status" aria-label="Loading advisory">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="animate-pulse space-y-3">
              <div className="h-4 w-1/2 bg-neutral-200 rounded" />
              <div className="h-3 w-full bg-neutral-200 rounded" />
              <div className="h-3 w-3/4 bg-neutral-200 rounded" />
            </div>
          ))}
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card padding="md" variant="outlined">
        <div className="flex items-center gap-3 p-4 bg-neutral-50 rounded-lg text-neutral-500" role="alert">
          <AlertCircle className="w-5 h-5 text-neutral-400 flex-shrink-0" aria-hidden="true" />
          Failed to load advisory: {error}
        </div>
      </Card>
    );
  }

  if (!advisory) {
    return (
      <Card padding="md">
        <div className="flex items-center gap-3 p-4 bg-neutral-50 rounded-lg border border-neutral-100">
          <div className="w-10 h-10 rounded-lg bg-neutral-100 flex items-center justify-center flex-shrink-0">
            <Shield className="w-5 h-5 text-neutral-400" aria-hidden="true" />
          </div>
          <div>
            <p className="font-medium text-neutral-900">No advisory available</p>
            <p className="text-sm text-neutral-500">No public health advisory has been issued for the current period.</p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card padding="md">
      <div className="space-y-4">
        <div className="p-4 bg-primary-50 rounded-lg border border-primary-100">
          <h4 className="font-medium text-primary-800 mb-3">{advisory.title}</h4>
          <div className="space-y-2 text-sm text-primary-700">
            <div className="flex items-start gap-2">
              <span className="flex-shrink-0 w-5 h-5 text-primary-600 flex items-center justify-center" aria-hidden="true">
                <AlertCircle className="w-4 h-4" />
              </span>
              <span>{advisory.whatIsHappening}</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="flex-shrink-0 w-5 h-5 text-primary-600 flex items-center justify-center" aria-hidden="true">
                <MapPin className="w-4 h-4" />
              </span>
              <span>{advisory.where}</span>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <h5 className="font-medium text-neutral-900 mb-2 flex items-center gap-2">
              <Shield className="w-4 h-4 text-primary-600" aria-hidden="true" />
              What Should Residents Do
            </h5>
            <ul className="space-y-2 text-sm text-neutral-700">
              {advisory.whatShouldResidentsDo.map((action, index) => (
                <li key={index} className="flex items-start gap-2 p-3 bg-neutral-50 rounded-lg">
                  <span className="flex-shrink-0 w-5 h-5 text-primary-600 flex items-center justify-center" aria-hidden="true">
                    <CheckCircle className="w-3.5 h-3.5" />
                  </span>
                  <span>{action}</span>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h5 className="font-medium text-neutral-900 mb-2 flex items-center gap-2">
              <Stethoscope className="w-4 h-4 text-primary-600" aria-hidden="true" />
              When to Seek Medical Attention
            </h5>
            <p className="text-sm text-neutral-700 p-3 bg-neutral-50 rounded-lg">{advisory.whenMedicalAttention}</p>
          </div>
        </div>

        <div className="pt-4 border-t border-neutral-100 flex items-center justify-between text-xs text-neutral-500">
          <div className="flex items-center gap-1">
            <Calendar className="w-3 h-3" aria-hidden="true" />
            <span>Updated: {new Date(advisory.updateDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
          </div>
          <span className="flex items-center gap-1">
            <Shield className="w-3 h-3" aria-hidden="true" />
            <span>Source: {advisory.source}</span>
          </span>
        </div>
      </div>
    </Card>
  );
}