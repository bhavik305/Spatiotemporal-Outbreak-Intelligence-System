import { useState, useEffect } from 'react';
import { ErrorState, EmptyState } from '../components/ui';
import { MapPin, AlertCircle, Hexagon, Activity, RefreshCw } from 'lucide-react';
import { KpiCard, KpiCardSkeleton } from '../components/dashboard/KpiCard';
import { CycleStatusCard } from '../components/dashboard/CycleStatusCard';
import { fetchDashboardSummary, fetchCurrentCycle } from '../api';
import type { DashboardSummary, SurveillanceCycle } from '../types';

export function Dashboard() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [cycle, setCycle] = useState<SurveillanceCycle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [summaryData, cycleData] = await Promise.all([
        fetchDashboardSummary(),
        fetchCurrentCycle(),
      ]);
      setSummary(summaryData);
      setCycle(cycleData);
    } catch (err) {
      setError('Unable to load dashboard data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRefresh = () => {
    loadData();
  };

  if (loading) {
    return (
      <div className="space-y-6" role="status" aria-label="Loading dashboard">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-neutral-900">Overview</h2>
            <p className="text-neutral-500 mt-1">Surveillance summary for the current cycle</p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCardSkeleton />
          <KpiCardSkeleton />
          <KpiCardSkeleton />
          <KpiCardSkeleton />
        </div>
        <CycleStatusCard loading={true} />
      </div>
    );
  }

  if (error) {
    return (
      <ErrorState
        title="Unable to load dashboard"
        message={error}
        onRetry={handleRefresh}
      />
    );
  }

  if (!summary) {
    return (
      <EmptyState
        title="No data available"
        description="No surveillance data available for the current period."
        action={{ label: 'Retry', onClick: handleRefresh }}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-neutral-900">Overview</h2>
          <p className="text-neutral-500 mt-1">Surveillance summary for the current cycle</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleRefresh}
            className="inline-flex items-center gap-2 px-4 py-2 border border-neutral-300 text-neutral-700 rounded-lg hover:bg-neutral-50 transition-colors"
            aria-label="Refresh data"
          >
            <RefreshCw size={16} aria-hidden="true" />
            Refresh
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" role="region" aria-label="Key performance indicators">
        <KpiCard
          title="Active Surveillance"
          value={`${summary.activeSurveillance.districts} Districts`}
          subtitle={`${summary.activeSurveillance.taluks} Taluks`}
          icon={Activity}
          status="normal"
        />
        <KpiCard
          title="Reporting Taluks"
          value={summary.reportingTaluks}
          icon={MapPin}
          status="normal"
        />
        <KpiCard
          title="Active Signals"
          value={summary.activeSignals}
          icon={AlertCircle}
          status={summary.activeSignals > 10 ? 'warning' : summary.activeSignals > 0 ? 'normal' : 'normal'}
        />
        <KpiCard
          title="Candidate Clusters"
          value={summary.candidateClusters}
          icon={Hexagon}
          status={summary.candidateClusters > 5 ? 'critical' : summary.candidateClusters > 0 ? 'warning' : 'normal'}
        />
      </div>

      <CycleStatusCard cycle={cycle} />
    </div>
  );
}