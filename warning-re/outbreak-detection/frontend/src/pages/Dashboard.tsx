import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Card,
  CardTitle,
  CardDescription,
  CardContent,
  Select,
  Button,
  Badge,
  LoadingState,
} from '../components/ui';
import {
  AlertCircle,
  Hexagon,
  Activity,
  FileText,
  RefreshCw,
  Filter,
  AlertTriangle,
  Shield,
  Radio,
  Maximize2,
  Map as MapIcon,
} from 'lucide-react';
import { KeralaMap } from '../components/dashboard/KeralaMap';
import { DiseaseTrendsChart } from '../components/dashboard/DiseaseTrendsChart';
import { AlertsList } from '../components/dashboard/AlertsList';
import { KpiCard, KpiCardSkeleton } from '../components/dashboard/KpiCard';
import {
  fetchDashboardSummary,
  fetchCurrentCycle,
  fetchDiseaseTrends,
  fetchAlerts,
  fetchAdvisory,
  fetchDistricts,
  fetchTaluks,
  fetchClusters,
} from '../api';
import type {
  DashboardSummary,
  SurveillanceCycle,
  District,
  Cluster,
  Alert,
  Advisory,
  DiseaseTrends,
  MapFilters,
  VisualizationMode,
} from '../types';
import type { SelectOption } from '../components/ui';

const diseaseOptions: SelectOption[] = [
  { value: '', label: 'All Diseases' },
  { value: 'dengue', label: 'Dengue' },
  { value: 'malaria', label: 'Malaria' },
  { value: 'chikungunya', label: 'Chikungunya' },
  { value: 'leptospirosis', label: 'Leptospirosis' },
  { value: 'hepatitis', label: 'Hepatitis' },
  { value: 'typhoid', label: 'Typhoid' },
];

const dateRangeOptions: SelectOption[] = [
  { value: '', label: 'All Dates' },
  { value: '7d', label: 'Last 7 Days' },
  { value: '30d', label: 'Last 30 Days' },
  { value: '90d', label: 'Last 90 Days' },
];

const visualizationOptions: { value: VisualizationMode; label: string }[] = [
  { value: 'risk', label: 'Risk Level' },
  { value: 'intensity', label: 'Case Intensity' },
  { value: 'heatmap', label: 'Heatmap' },
  { value: 'clusters', label: 'Clusters' },
  { value: 'epicentre', label: 'Estimated Potential Epicentre' },
];

function formatCoords(lat: number, lon: number): string {
  const latDir = lat >= 0 ? 'N' : 'S';
  const lonDir = lon >= 0 ? 'E' : 'W';
  return `${Math.abs(lat).toFixed(4)}° ${latDir}, ${Math.abs(lon).toFixed(4)}° ${lonDir}`;
}

export function Dashboard() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [cycle, setCycle] = useState<SurveillanceCycle | null>(null);
  const [districts, setDistricts] = useState<District[]>([]);
  const [clusters, setClusters] = useState<Cluster[]>([]);
  const [trends, setTrends] = useState<DiseaseTrends | null>(null);
  const [alerts, setAlerts] = useState<Alert[] | null>(null);
  const [advisory, setAdvisory] = useState<Advisory | null>(null);

  const [filters, setFilters] = useState<MapFilters>({
    disease: '',
    date: '',
    district: '',
    taluk: '',
    visualization: 'intensity',
  });

  const [talukOptions, setTalukOptions] = useState<SelectOption[]>([]);
  const [talukLoading, setTalukLoading] = useState(false);

  const [loadingSummary, setLoadingSummary] = useState(true);
  const [loadingDistricts, setLoadingDistricts] = useState(true);
  const [loadingMap, setLoadingMap] = useState(false);
  const [loadingTrends, setLoadingTrends] = useState(false);
  const [loadingAlerts, setLoadingAlerts] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reqRef = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const loadInitial = useCallback(async () => {
    const requestId = ++reqRef.current;
    setLoadingSummary(true);
    setLoadingDistricts(true);
    setError(null);

    try {
      const [summaryData, cycleData, districtsData] = await Promise.all([
        fetchDashboardSummary(),
        fetchCurrentCycle(),
        fetchDistricts(),
      ]);
      if (requestId !== reqRef.current) return;
      setSummary(summaryData);
      setCycle(cycleData);
      setDistricts(districtsData);
    } catch {
      if (requestId !== reqRef.current) return;
      setError('Unable to load dashboard data. Please try again.');
    } finally {
      if (requestId === reqRef.current) {
        setLoadingSummary(false);
        setLoadingDistricts(false);
      }
    }
  }, []);

  useEffect(() => {
    loadInitial();
  }, [loadInitial]);

  useEffect(() => {
    if (!filters.district) {
      setTalukOptions([]);
      return;
    }

    let active = true;
    setTalukLoading(true);

    fetchTaluks(filters.district).then((data) => {
      if (!active) return;
        const opts: SelectOption[] = data
        .filter((t) => t.districtId === filters.district)
        .map((t) => ({ value: t.id, label: t.name }));
      setTalukOptions(opts);
      setTalukLoading(false);
    });

    return () => {
      active = false;
    };
  }, [filters.district]);

  const loadTrends = useCallback(async () => {
    let active = true;
    setLoadingTrends(true);
    try {
      const disease = filters.disease || 'dengue';
      const data = await fetchDiseaseTrends({
        disease,
        district: filters.district || undefined,
        taluk: filters.taluk || undefined,
        period: '30d',
      });
      if (active) setTrends(data);
    } catch {
      if (active) setTrends(null);
    } finally {
      if (active) setLoadingTrends(false);
    }
  }, [filters.disease, filters.district, filters.taluk]);

  const loadAlerts = useCallback(async () => {
    let active = true;
    setLoadingAlerts(true);
    try {
      const data = await fetchAlerts({ limit: 20 });
      if (active) setAlerts(data);
    } catch {
      if (active) setAlerts(null);
    } finally {
      if (active) setLoadingAlerts(false);
    }
  }, []);

  const loadAdvisory = useCallback(async () => {
    try {
      const data = await fetchAdvisory();
      setAdvisory(data);
    } catch {
      setAdvisory(null);
    }
  }, []);

  const loadClusters = useCallback(async () => {
    try {
      const data = await fetchClusters({});
      setClusters(data);
    } catch {
      setClusters([]);
    }
  }, []);

  useEffect(() => {
    loadTrends();
    loadAlerts();
    loadAdvisory();
    loadClusters();
  }, [loadTrends, loadAlerts, loadAdvisory, loadClusters]);

  const handleApplyFilters = () => {
    setLoadingMap(true);
    setTimeout(() => setLoadingMap(false), 300);
  };

  const handleReset = () => {
    setFilters({
      disease: '',
      date: '',
      district: '',
      taluk: '',
      visualization: 'risk',
    });
  };

  const handleDistrictSelect = useCallback(
    (districtId: string) => {
      setFilters((prev) => ({ ...prev, district: districtId, taluk: '' }));
    },
    []
  );

  const handleTalukSelect = useCallback((talukId: string) => {
    setFilters((prev) => ({ ...prev, taluk: talukId }));
  }, []);

  const handleRefresh = useCallback(async () => {
    await loadInitial();
    loadTrends();
    loadAlerts();
    loadAdvisory();
    loadClusters();
  }, [loadInitial, loadTrends, loadAlerts, loadAdvisory, loadClusters]);

  const reportsReceived = cycle?.reportsReceived ?? summary?.reportingTaluks ?? 0;

  const highestCluster = clusters.length > 0
    ? clusters.reduce((max, c) => (c.totalCases > max.totalCases ? c : max), clusters[0])
    : null;

  const epicentre = highestCluster?.epicentre ?? null;

  const overallRisk = filters.visualization === 'risk' && summary
    ? summary.activeSignals > 10
      ? 'High'
      : summary.activeSignals > 0
        ? 'Moderate'
        : 'Low'
    : '—';

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-neutral-900">Overview</h2>
          <p className="text-neutral-500 mt-1">
            Real-time surveillance summary for the current cycle
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {cycle && (
            <div className="flex items-center gap-3 px-3 py-2 bg-neutral-50 rounded-lg border border-neutral-200">
              <div>
                <p className="text-xs text-neutral-500">Cycle</p>
                <p className="text-sm font-mono font-medium text-neutral-900">{cycle.id}</p>
              </div>
              <Badge variant={cycle.status === 'REPORTING_OPEN' ? 'success' : cycle.status === 'PROCESSING' ? 'warning' : cycle.status === 'PUBLISHED' ? 'info' : 'neutral'} dot size="sm">
                {cycle.status.replace(/_/g, ' ')}
              </Badge>
              <div className="text-xs text-neutral-500">
                <p>Updated: {cycle.lastUpdate ? new Date(cycle.lastUpdate).toLocaleString('en-IN') : '—'}</p>
              </div>
            </div>
          )}
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
        {loadingSummary ? (
          <>
            <KpiCardSkeleton />
            <KpiCardSkeleton />
            <KpiCardSkeleton />
            <KpiCardSkeleton />
          </>
        ) : error ? null : summary ? (
          <>
            <KpiCard
              title="Active Surveillance"
              value={`${summary.activeSurveillance.districts} Districts`}
              subtitle={`${summary.activeSurveillance.taluks} Taluks`}
              icon={Activity}
              status="normal"
            />
            <KpiCard
              title="Reports Received"
              value={reportsReceived}
              icon={FileText}
              status="normal"
            />
            <KpiCard
              title="Active Signals"
              value={summary.activeSignals}
              icon={AlertCircle}
              status={summary.activeSignals > 10 ? 'warning' : 'normal'}
            />
            <KpiCard
              title="Candidate Clusters"
              value={summary.candidateClusters}
              icon={Hexagon}
              status={summary.candidateClusters > 5 ? 'critical' : summary.candidateClusters > 0 ? 'warning' : 'normal'}
            />
          </>
        ) : null}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[18rem_1fr_22rem] gap-4">
        <section aria-label="Filters" className="space-y-4">
          <Card padding="md">
            <div className="flex items-center gap-2 mb-4">
              <Filter size={16} className="text-primary-600" aria-hidden="true" />
              <CardTitle className="!text-sm">Filters</CardTitle>
            </div>
            <CardContent className="space-y-3">
              <Select
                label="Disease"
                id="dash-disease"
                options={diseaseOptions}
                value={filters.disease}
                onChange={(e) =>
                  setFilters((prev) => ({ ...prev, disease: e.target.value }))
                }
              />
              <Select
                label="District"
                id="dash-district"
                options={[{ value: '', label: 'All Districts' }, ...districts.map((d) => ({ value: d.id, label: d.name }))]}
                value={filters.district}
                onChange={(e) =>
                  setFilters((prev) => ({ ...prev, district: e.target.value, taluk: '' }))
                }
                disabled={loadingDistricts}
              />
              {loadingDistricts && (
                <p className="text-xs text-neutral-500">Loading districts...</p>
              )}
              <Select
                label="Taluk"
                id="dash-taluk"
                options={[{ value: '', label: filters.district ? 'All Taluks' : 'Select district first' }, ...talukOptions]}
                value={filters.taluk}
                onChange={(e) => handleTalukSelect(e.target.value)}
                disabled={!filters.district || talukLoading}
              />
              {talukLoading && (
                <p className="text-xs text-neutral-500">Loading taluks...</p>
              )}
              <Select
                label="Date Range"
                id="dash-date"
                options={dateRangeOptions}
                value={filters.date}
                onChange={(e) =>
                  setFilters((prev) => ({ ...prev, date: e.target.value }))
                }
              />
              <Select
                label="Visualization"
                id="dash-viz"
                options={visualizationOptions}
                value={filters.visualization}
                onChange={(e) =>
                  setFilters((prev) => ({
                    ...prev,
                    visualization: e.target.value as VisualizationMode,
                  }))
                }
              />
              <div className="flex gap-2 pt-2">
                <Button variant="primary" size="sm" className="flex-1" onClick={handleApplyFilters}>
                  Apply Filters
                </Button>
                <Button variant="secondary" size="sm" className="flex-1" onClick={handleReset}>
                  Reset
                </Button>
              </div>
            </CardContent>
          </Card>
        </section>

        <section aria-label="Kerala map" className="space-y-4">
          <Card padding="none" className="overflow-hidden border border-neutral-200 shadow-sm">
            <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-200 bg-white">
              <div className="flex items-center gap-2">
                <MapIcon size={16} className="text-primary-600" aria-hidden="true" />
                <div>
                  <CardTitle className="!text-sm">Kerala Map</CardTitle>
                  <CardDescription>Geographic distribution and outbreak intelligence</CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {visualizationOptions.map((opt) => (
                  <Button
                    key={opt.value}
                    variant={filters.visualization === opt.value ? 'primary' : 'ghost'}
                    size="sm"
                    onClick={() => setFilters((prev) => ({ ...prev, visualization: opt.value }))}
                    className={filters.visualization === opt.value ? '' : 'bg-primary-50 text-primary-700 hover:bg-primary-100'}
                  >
                    {opt.label}
                  </Button>
                ))}
                <Button
                  variant="secondary"
                  size="sm"
                  className="!text-xs"
                  aria-label="Toggle fullscreen"
                  onClick={() => {
                    const el = containerRef.current;
                    if (el) {
                      if (!document.fullscreenElement) {
                        el.requestFullscreen?.().catch(() => {});
                      } else {
                        document.exitFullscreen?.();
                      }
                    }
                  }}
                >
                  <Maximize2 size={14} aria-hidden="true" />
                </Button>
              </div>
            </div>
            <div className="relative min-h-[500px] bg-neutral-100 kerala-map-shell" ref={containerRef}>
              <KeralaMap
                selectedDistrictId={filters.district}
                selectedTalukId={filters.taluk}
                selectedDisease={filters.disease || undefined}
                selectedDate={filters.date || undefined}
                visualizationMode={filters.visualization}
                onDistrictSelect={handleDistrictSelect}
                onTalukSelect={handleTalukSelect}
              />
              {loadingMap && (
                <div className="absolute inset-0 flex items-center justify-center bg-white/60 z-10">
                  <LoadingState message="Updating map..." size="md" />
                </div>
              )}
            </div>
          </Card>
        </section>

        <section aria-label="Disease trends and alerts" className="space-y-4">
          <Card padding="md">
            <div className="mb-3">
              <CardTitle className="!text-sm">Disease Trends</CardTitle>
              <CardDescription>Last 30 Days</CardDescription>
            </div>
            <DiseaseTrendsChart
              data={trends}
              loading={loadingTrends}
              error={null}
            />
          </Card>
          <Card padding="md">
            <div className="mb-3">
              <CardTitle className="!text-sm">Recent Alerts</CardTitle>
            </div>
            <AlertsList alerts={alerts} loading={loadingAlerts} error={null} />
          </Card>
        </section>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card padding="md">
          <div className="flex items-center gap-2 mb-3">
            <Radio size={16} className="text-primary-600" aria-hidden="true" />
            <CardTitle className="!text-sm">Hotspot</CardTitle>
          </div>
          {highestCluster ? (
            <div className="space-y-2">
              <p className="text-base font-semibold text-neutral-900">{highestCluster.hotspot || highestCluster.taluks[0]}</p>
              <p className="text-sm text-neutral-500">
                {highestCluster.disease} — {highestCluster.totalCases} cases
              </p>
              <p className="text-xs text-neutral-400">
                Spatial concentration: {(highestCluster.spatialConcentration * 100).toFixed(1)}%
              </p>
            </div>
          ) : (
            <div className="text-sm text-neutral-400">No hotspot identified</div>
          )}
        </Card>

        <Card padding="md">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle size={16} className="text-warning-600" aria-hidden="true" />
            <CardTitle className="!text-sm">Estimated Potential Epicentre</CardTitle>
          </div>
          {epicentre ? (
            <div className="space-y-2">
              <p className="text-base font-mono font-semibold text-neutral-900">
                {formatCoords(epicentre.latitude, epicentre.longitude)}
              </p>
              <p className="text-xs text-neutral-500">
                Based on spatiotemporal cluster analysis
              </p>
            </div>
          ) : (
            <div className="text-sm text-neutral-400">Estimated potential epicentre unavailable</div>
          )}
        </Card>

        <Card padding="md">
          <div className="flex items-center gap-2 mb-3">
            <Shield size={16} className="text-info-600" aria-hidden="true" />
            <CardTitle className="!text-sm">Risk Level</CardTitle>
          </div>
          <p className="text-base font-semibold text-neutral-900">{overallRisk}</p>
          <p className="text-xs text-neutral-500 mt-1">
            Based on active signals and surveillance data
          </p>
        </Card>

        <Card padding="md">
          <div className="flex items-center gap-2 mb-3">
            <Activity size={16} className="text-success-600" aria-hidden="true" />
            <CardTitle className="!text-sm">Advisory</CardTitle>
          </div>
          {advisory ? (
            <div className="space-y-2">
              <p className="text-sm font-semibold text-neutral-900 line-clamp-2">{advisory.title}</p>
              <p className="text-xs text-neutral-500 line-clamp-3">{advisory.whatIsHappening}</p>
            </div>
          ) : (
            <div className="text-sm text-neutral-400">No current advisory</div>
          )}
        </Card>
      </div>
    </div>
  );
}
