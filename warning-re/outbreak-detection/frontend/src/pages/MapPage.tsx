import { useState, useEffect, useRef, type ChangeEvent } from 'react';
import { Card, Select } from '../components/ui';
import { Filter } from 'lucide-react';
import { KeralaMap } from '../components/dashboard/KeralaMap';
import { ClusterDetailPanel } from '../components/dashboard/ClusterDetailPanel';
import { fetchTaluks } from '../api/geography';
import type { SelectOption } from '../components/ui';
import type { MapFilters, VisualizationMode, Cluster } from '../types';

const defaultFilters: MapFilters = {
  disease: '',
  date: '',
  district: '',
  taluk: '',
  visualization: 'risk',
};

const diseaseOptions = [
  { value: '', label: 'All Diseases' },
  { value: 'dengue', label: 'Dengue' },
  { value: 'malaria', label: 'Malaria' },
  { value: 'chikungunya', label: 'Chikungunya' },
  { value: 'leptospirosis', label: 'Leptospirosis' },
  { value: 'hepatitis', label: 'Hepatitis' },
  { value: 'typhoid', label: 'Typhoid' },
];

const districtOptions = [
  { value: '', label: 'All Districts' },
  { value: 'thiruvananthapuram', label: 'Thiruvananthapuram' },
  { value: 'kollam', label: 'Kollam' },
  { value: 'pathanamthitta', label: 'Pathanamthitta' },
  { value: 'alappuzha', label: 'Alappuzha' },
  { value: 'kottayam', label: 'Kottayam' },
  { value: 'idukki', label: 'Idukki' },
  { value: 'ernakulam', label: 'Ernakulam' },
  { value: 'thrissur', label: 'Thrissur' },
  { value: 'palakkad', label: 'Palakkad' },
  { value: 'malappuram', label: 'Malappuram' },
  { value: 'kozhikode', label: 'Kozhikode' },
  { value: 'wayanad', label: 'Wayanad' },
  { value: 'kannur', label: 'Kannur' },
  { value: 'kasaragod', label: 'Kasaragod' },
];

const visualizationOptions: { value: VisualizationMode; label: string }[] = [
  { value: 'risk', label: 'Risk' },
  { value: 'intensity', label: 'Case Intensity' },
  { value: 'heatmap', label: 'Heatmap' },
  { value: 'clusters', label: 'Clusters' },
  { value: 'hotspot', label: 'Hotspot' },
  { value: 'epicentre', label: 'Estimated Potential Epicentre' },
];

export function MapPage() {
  const [filters, setFilters] = useState<MapFilters>(defaultFilters);
  const [selectedCluster, setSelectedCluster] = useState<Cluster | null>(null);

  const [talukOptions, setTalukOptions] = useState<SelectOption[]>([]);
  const [talukLoading, setTalukLoading] = useState(false);
  const [talukError, setTalukError] = useState<string | null>(null);
  const talukRequestRef = useRef(0);

  useEffect(() => {
    const requestId = talukRequestRef.current + 1;
    talukRequestRef.current = requestId;
    let active = true;

    if (!filters.district) {
      setTalukOptions([]);
      setTalukLoading(false);
      setTalukError(null);
      return;
    }

    setTalukLoading(true);
    setTalukError(null);

    void fetchTaluks(filters.district)
      .then((taluks) => {
        if (!active || requestId !== talukRequestRef.current) return;

        const districtTaluks = taluks.filter((taluk) => taluk.districtId === filters.district);
        setTalukOptions(
          districtTaluks.map((taluk): SelectOption => ({
            value: taluk.id,
            label: taluk.name,
          })),
        );
        setTalukLoading(false);
      })
      .catch(() => {
        if (!active || requestId !== talukRequestRef.current) return;

        setTalukOptions([]);
        setTalukError('Unable to load taluk options. Please select another district.');
        setTalukLoading(false);
      });

    return () => {
      active = false;
    };
  }, [filters.district]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-neutral-900">Map Intelligence</h2>
          <p className="text-neutral-500 mt-1">Interactive outbreak mapping and risk visualization</p>
        </div>
      </div>

      <section aria-labelledby="map-controls-heading">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
          <h3 id="map-controls-heading" className="text-lg font-semibold text-neutral-900 sr-only">Map Controls</h3>
          <div className="flex items-center gap-2 flex-wrap">
            <label htmlFor="disease-filter" className="sr-only">Disease</label>
            <Select
              id="disease-filter"
              options={diseaseOptions}
              value={filters.disease}
              onChange={(e: ChangeEvent<HTMLSelectElement>) => setFilters((prev: MapFilters) => ({ ...prev, disease: e.target.value }))}
              placeholder="All Diseases"
              className="w-auto min-w-[180px]"
            />
            <label htmlFor="district-filter" className="sr-only">District</label>
            <Select
              id="district-filter"
              options={districtOptions}
              value={filters.district}
              onChange={(e: ChangeEvent<HTMLSelectElement>) => setFilters((prev: MapFilters) => ({ ...prev, district: e.target.value, taluk: '' }))}
              placeholder="All Districts"
              className="w-auto min-w-[180px]"
            />
            <label htmlFor="taluk-filter" className="sr-only">Taluk</label>
            <Select
              id="taluk-filter"
              options={talukOptions}
              value={filters.taluk}
              onChange={(e: ChangeEvent<HTMLSelectElement>) => setFilters((prev: MapFilters) => ({ ...prev, taluk: e.target.value }))}
              placeholder={talukLoading ? 'Loading taluks...' : talukError ? 'Taluk options unavailable' : filters.district ? 'All Taluks' : 'Select a district first'}
              disabled={!filters.district || talukLoading || Boolean(talukError)}
              helperText={talukLoading ? 'Loading...' : !talukError && filters.district && talukOptions.length === 0 ? 'No taluks available.' : undefined}
              error={talukError ?? undefined}
              className="w-auto min-w-[180px]"
            />
            
            <label htmlFor="visualization-filter" className="sr-only">Visualization</label>
            <Select
              id="visualization-filter"
              options={visualizationOptions}
              value={filters.visualization}
              onChange={(e: ChangeEvent<HTMLSelectElement>) => setFilters((prev: MapFilters) => ({ ...prev, visualization: e.target.value as VisualizationMode }))}
              placeholder="Risk"
              className="w-auto min-w-[160px]"
            />
            <button
              className="inline-flex items-center gap-2 px-4 py-2 border border-neutral-300 text-neutral-700 rounded-lg hover:bg-neutral-50 transition-colors"
              onClick={() => setFilters({
                disease: '',
                date: '',
                district: '',
                taluk: '',
                visualization: 'risk',
              })}
            >
              <Filter size={16} aria-hidden="true" />
              Reset
            </button>
          </div>
        </div>

        <Card padding="none" className="overflow-hidden">
          <div className="aspect-video bg-neutral-100 relative kerala-map-shell">
            <KeralaMap
              selectedDistrictId={filters.district}
              selectedTalukId={filters.taluk}
              selectedDisease={filters.disease}
              selectedDate={filters.date}
              visualizationMode={filters.visualization}
              onDistrictSelect={(districtId) =>
                setFilters((prev: MapFilters) => ({ ...prev, district: districtId, taluk: '' }))
              }
              onTalukSelect={(talukId) =>
                setFilters((prev: MapFilters) => ({ ...prev, taluk: talukId }))
              }
              onClusterSelect={setSelectedCluster}
              selectedClusterId={selectedCluster?.id}
            />
          </div>
        </Card>
      </section>

      <ClusterDetailPanel cluster={selectedCluster} onClose={() => setSelectedCluster(null)} />
    </div>
  );
}
