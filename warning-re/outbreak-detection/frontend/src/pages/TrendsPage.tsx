import { useState, useEffect, useRef, type ChangeEvent } from 'react';
import { Select } from '../components/ui';
import { DiseaseTrendsChart } from '../components/dashboard/DiseaseTrendsChart';
import { TemporalSignals } from '../components/dashboard/TemporalSignals';
import { fetchDiseaseTrends, fetchTemporalSignals } from '../api/intelligence';
import type { MapFilters, DiseaseTrends, TemporalSignal } from '../types';

const defaultFilters: MapFilters = {
  disease: '',
  date: '',
  district: '',
  taluk: '',
  visualization: 'risk',
};

const diseaseOptions = [
  { value: 'dengue', label: 'Dengue' },
  { value: 'malaria', label: 'Malaria' },
  { value: 'chikungunya', label: 'Chikungunya' },
  { value: 'leptospirosis', label: 'Leptospirosis' },
  { value: 'hepatitis', label: 'Hepatitis' },
  { value: 'typhoid', label: 'Typhoid' },
];

export function TrendsPage() {
  const [filters, setFilters] = useState<MapFilters>({ ...defaultFilters, disease: 'dengue' });
  const [trendPeriod, setTrendPeriod] = useState<'7d' | '30d' | '90d'>('30d');
  const [trends, setTrends] = useState<DiseaseTrends | null>(null);
  const [trendsLoading, setTrendsLoading] = useState(false);
  const [trendsError, setTrendsError] = useState<string | null>(null);
  const [signals, setSignals] = useState<TemporalSignal[] | null>(null);
  const [signalsLoading, setSignalsLoading] = useState(false);
  const [signalsError, setSignalsError] = useState<string | null>(null);
  const trendsRequestRef = useRef(0);
  const signalsRequestRef = useRef(0);

  useEffect(() => {
    const requestId = trendsRequestRef.current + 1;
    trendsRequestRef.current = requestId;
    let active = true;

    const disease = filters.disease || 'dengue';
    const district = filters.district || undefined;
    const taluk = filters.taluk || undefined;

    setTrendsLoading(true);
    setTrendsError(null);

    void fetchDiseaseTrends({
      disease,
      district,
      taluk,
      period: trendPeriod,
    })
      .then((data) => {
        if (!active || requestId !== trendsRequestRef.current) return;
        setTrends(data);
        setTrendsLoading(false);
      })
      .catch(() => {
        if (!active || requestId !== trendsRequestRef.current) return;
        setTrends(null);
        setTrendsError('Unable to load disease trends.');
        setTrendsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [filters.disease, filters.district, filters.taluk, trendPeriod]);

  useEffect(() => {
    const requestId = signalsRequestRef.current + 1;
    signalsRequestRef.current = requestId;
    let active = true;

    const disease = filters.disease || undefined;
    const district = filters.district || undefined;

    setSignalsLoading(true);
    setSignalsError(null);

    void fetchTemporalSignals({ disease, district })
      .then((data) => {
        if (!active || requestId !== signalsRequestRef.current) return;
        setSignals(data);
        setSignalsLoading(false);
      })
      .catch(() => {
        if (!active || requestId !== signalsRequestRef.current) return;
        setSignals(null);
        setSignalsError('Unable to load temporal signals.');
        setSignalsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [filters.disease, filters.district]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-neutral-900">Disease Trends</h2>
          <p className="text-neutral-500 mt-1">Analyze disease activity over time</p>
        </div>
      </div>

      <section aria-labelledby="trends-heading" className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h3 id="trends-heading" className="text-lg font-semibold text-neutral-900 sr-only">Disease Activity</h3>
          <div className="flex items-center gap-2">
            <label htmlFor="trends-disease" className="sr-only">Disease for trends</label>
            <Select
              id="trends-disease"
              options={diseaseOptions}
              value={filters.disease || 'dengue'}
              onChange={(e: ChangeEvent<HTMLSelectElement>) => setFilters((prev: MapFilters) => ({ ...prev, disease: e.target.value }))}
              className="w-auto min-w-[160px]"
            />
            <label htmlFor="trends-period" className="sr-only">Period</label>
            <Select
              id="trends-period"
              options={[
                { value: '7d', label: '7 Days' },
                { value: '30d', label: '30 Days' },
                { value: '90d', label: '90 Days' },
              ]}
              value={trendPeriod}
              onChange={(e: ChangeEvent<HTMLSelectElement>) => setTrendPeriod(e.target.value as '7d' | '30d' | '90d')}
              className="w-auto min-w-[120px]"
            />
          </div>
        </div>
        <DiseaseTrendsChart data={trends} loading={trendsLoading} error={trendsError} />
      </section>

      <section aria-labelledby="signals-heading" className="space-y-4">
        <h3 id="signals-heading" className="text-lg font-semibold text-neutral-900">Temporal Signals</h3>
        <TemporalSignals signals={signals} loading={signalsLoading} error={signalsError} />
      </section>
    </div>
  );
}
