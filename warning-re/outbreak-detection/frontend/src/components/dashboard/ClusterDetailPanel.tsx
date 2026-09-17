import { X, MapPin } from 'lucide-react';
import type { Cluster } from '../../types';

interface ClusterDetailPanelProps {
  cluster: Cluster | null;
  onClose: () => void;
}

export function ClusterDetailPanel({ cluster, onClose }: ClusterDetailPanelProps) {
  if (!cluster) return null;

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:justify-end p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="cluster-detail-title"
    >
      <div className="absolute inset-0 bg-black/30" onClick={onClose} aria-hidden="true" />
      <div className="relative w-full sm:w-[480px] lg:w-[520px] max-h-[90vh] bg-white rounded-t-2xl sm:rounded-xl shadow-xl overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-neutral-100">
          <h2 id="cluster-detail-title" className="text-lg font-semibold text-neutral-900">
            Cluster Details
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 transition-colors"
            aria-label="Close cluster details"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full bg-primary-100 text-primary-700 text-sm font-medium">
                Cluster #{cluster.id}
              </span>
              <span className="px-3 py-1 rounded-full bg-neutral-100 text-neutral-700 text-sm font-medium capitalize">
                {cluster.disease}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-neutral-500 uppercase tracking-wide">Total Cases</p>
                <p className="text-2xl font-bold text-neutral-900">{cluster.totalCases}</p>
              </div>
              <div>
                <p className="text-xs text-neutral-500 uppercase tracking-wide">Time Window</p>
                <p className="text-sm font-medium text-neutral-900">
                  {formatDate(cluster.timeWindow.start)} - {formatDate(cluster.timeWindow.end)}
                </p>
              </div>
              <div>
                <p className="text-xs text-neutral-500 uppercase tracking-wide">Spatial Concentration</p>
                <p className="text-sm font-medium text-neutral-900">
                  {(cluster.spatialConcentration * 100).toFixed(1)}%
                </p>
              </div>
              <div>
                <p className="text-xs text-neutral-500 uppercase tracking-wide">Temporal Signal</p>
                <p className="text-sm font-medium text-neutral-900">
                  {cluster.temporalSignal.toFixed(2)}
                </p>
              </div>
            </div>

            <div className="pt-2 border-t border-neutral-100">
              <p className="text-xs text-neutral-500 uppercase tracking-wide">Affected Taluks</p>
              <div className="flex flex-wrap gap-2 mt-2">
                {cluster.taluks.map((taluk) => (
                  <span key={taluk} className="px-3 py-1.5 rounded-lg bg-neutral-50 text-neutral-700 text-sm border border-neutral-200">
                    {taluk}
                  </span>
                ))}
              </div>
            </div>

            {cluster.hotspot && (
              <div className="pt-2 border-t border-neutral-100">
                <p className="text-xs text-neutral-500 uppercase tracking-wide">Hotspot</p>
                <p className="text-sm font-medium text-neutral-900 flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-neutral-400" aria-hidden="true" />
                  {cluster.hotspot}
                </p>
              </div>
            )}

            {cluster.epicentre && (
              <div className="pt-2 border-t border-neutral-100">
                <p className="text-xs text-neutral-500 uppercase tracking-wide">Estimated Epicentre</p>
                <div className="flex items-center gap-1.5 mt-1 text-sm text-neutral-700 font-mono">
                  <MapPin className="w-4 h-4 text-primary-600" aria-hidden="true" />
                  <span>Lat: {cluster.epicentre.latitude.toFixed(4)}</span>
                  <span>Lng: {cluster.epicentre.longitude.toFixed(4)}</span>
                </div>
              </div>
            )}

            <div className="pt-2 border-t border-neutral-100">
              <p className="text-xs text-neutral-500 uppercase tracking-wide">Technical Details</p>
              <div className="mt-2 space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-neutral-500">Spatial Concentration</span>
                  <span className="font-medium text-neutral-900">{(cluster.spatialConcentration * 100).toFixed(1)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500">Temporal Signal Strength</span>
                  <span className="font-medium text-neutral-900">{cluster.temporalSignal.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-neutral-100 bg-neutral-50 rounded-lg p-4">
            <p className="text-xs text-neutral-600">
              <strong className="text-neutral-900">Note:</strong> This cluster represents a spatiotemporal concentration
              of cases requiring epidemiological interpretation. It does not independently confirm an outbreak.
            </p>
          </div>
        </div>

        <div className="p-4 border-t border-neutral-100 bg-neutral-50">
          <button
            onClick={onClose}
            className="w-full py-2.5 px-4 rounded-lg bg-primary-600 text-white font-medium hover:bg-primary-700 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}