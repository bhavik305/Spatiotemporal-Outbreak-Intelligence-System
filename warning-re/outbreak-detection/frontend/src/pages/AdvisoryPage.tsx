import { useState, useEffect, useRef } from 'react';
import { AdvisoryPanel } from '../components/dashboard/AdvisoryPanel';
import { fetchAdvisory } from '../api/intelligence';
import type { Advisory } from '../types';

export function AdvisoryPage() {
  const [advisory, setAdvisory] = useState<Advisory | null>(null);
  const [advisoryLoading, setAdvisoryLoading] = useState(true);
  const [advisoryError, setAdvisoryError] = useState<string | null>(null);
  const advisoryRequestRef = useRef(0);

  useEffect(() => {
    const requestId = advisoryRequestRef.current + 1;
    advisoryRequestRef.current = requestId;
    let active = true;

    setAdvisoryLoading(true);
    setAdvisoryError(null);

    void fetchAdvisory()
      .then((data) => {
        if (!active || requestId !== advisoryRequestRef.current) return;
        setAdvisory(data);
        setAdvisoryLoading(false);
      })
      .catch(() => {
        if (!active || requestId !== advisoryRequestRef.current) return;
        setAdvisory(null);
        setAdvisoryError('Unable to load public health advisory.');
        setAdvisoryLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-neutral-900">Public Health Advisory</h2>
          <p className="text-neutral-500 mt-1">Latest guidance and preventive measures</p>
        </div>
      </div>

      <section aria-labelledby="advisory-heading" className="space-y-4">
        <h3 id="advisory-heading" className="text-lg font-semibold text-neutral-900 sr-only">Advisory Information</h3>
        <AdvisoryPanel advisory={advisory} loading={advisoryLoading} error={advisoryError} />
      </section>
    </div>
  );
}
