import { useState, useEffect, useRef } from 'react';
import { Card } from '../components/ui';
import { AlertsList } from '../components/dashboard/AlertsList';
import { fetchAlerts } from '../api/intelligence';
import type { Alert } from '../types';

export function AlertsPage() {
  const [alerts, setAlerts] = useState<Alert[] | null>(null);
  const [alertsLoading, setAlertsLoading] = useState(true);
  const [alertsError, setAlertsError] = useState<string | null>(null);
  const alertsRequestRef = useRef(0);

  useEffect(() => {
    const requestId = alertsRequestRef.current + 1;
    alertsRequestRef.current = requestId;
    let active = true;

    setAlertsLoading(true);
    setAlertsError(null);

    void fetchAlerts({ limit: 50 })
      .then((data) => {
        if (!active || requestId !== alertsRequestRef.current) return;
        setAlerts(data);
        setAlertsLoading(false);
      })
      .catch(() => {
        if (!active || requestId !== alertsRequestRef.current) return;
        setAlerts(null);
        setAlertsError('Unable to load public health alerts.');
        setAlertsLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-neutral-900">Public Health Alerts</h2>
          <p className="text-neutral-500 mt-1">Active outbreak and surveillance alerts</p>
        </div>
      </div>

      <section aria-labelledby="alerts-heading" className="space-y-4">
        <h3 id="alerts-heading" className="text-lg font-semibold text-neutral-900 sr-only">Alerts</h3>
        <Card padding="md">
          <AlertsList alerts={alerts} loading={alertsLoading} error={alertsError} />
        </Card>
      </section>
    </div>
  );
}
