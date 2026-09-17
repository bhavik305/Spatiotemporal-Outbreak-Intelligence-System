import { useEffect, useRef, useState } from 'react';
import * as L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { fetchDistrictGeometry, fetchDistricts, fetchKeralaGeometry, fetchTalukGeometry, fetchTaluks } from '../../api/geography';
import { fetchMapData, fetchClusters } from '../../api/intelligence';
import type { District, Taluk, MapData, VisualizationMode, RiskLevel, Cluster } from '../../types';
import type { Feature } from 'geojson';
import './KeralaMap.css';

interface KeralaMapProps {
  selectedDistrictId?: string;
  selectedTalukId?: string;
  selectedDisease?: string;
  selectedDate?: string;
  visualizationMode: VisualizationMode;
  onDistrictSelect: (districtId: string) => void;
  onTalukSelect: (talukId: string) => void;
  onClusterSelect?: (cluster: Cluster) => void;
  selectedClusterId?: string;
}

type MapStatus = 'loading' | 'ready' | 'empty' | 'error';
type TalukStatus = 'idle' | 'loading' | 'ready' | 'empty' | 'error';

type DistrictGeometry = {
  district: District;
  geometry: Feature;
};

type TalukGeometry = {
  taluk: Taluk;
  geometry: Feature;
};

const keralaStyle: L.PathOptions = {
  color: '#2d7d7d',
  weight: 1.5,
  opacity: 0.9,
  fillColor: '#dcf0f0',
  fillOpacity: 0.2,
};

const districtBaseStyle: L.PathOptions = {
  color: '#2d7d7d',
  weight: 1.25,
  opacity: 0.85,
  fillColor: '#e7f4f4',
  fillOpacity: 0.38,
};

const districtHoverStyle: L.PathOptions = {
  color: '#155e63',
  weight: 2.25,
  opacity: 1,
  fillColor: '#b7dede',
  fillOpacity: 0.72,
};

const districtSelectedStyle: L.PathOptions = {
  color: '#155e63',
  weight: 2.75,
  opacity: 1,
  fillColor: '#79b8bc',
  fillOpacity: 0.78,
};

const talukBaseStyle: L.PathOptions = {
  color: '#4b8f8f',
  weight: 0.85,
  opacity: 0.75,
  fillColor: '#eef8f7',
  fillOpacity: 0.28,
};

const talukHoverStyle: L.PathOptions = {
  color: '#155e63',
  weight: 1.75,
  opacity: 1,
  fillColor: '#c4e7e6',
  fillOpacity: 0.62,
};

const talukSelectedStyle: L.PathOptions = {
  color: '#0f766e',
  weight: 2.25,
  opacity: 1,
  fillColor: '#79b8bc',
  fillOpacity: 0.72,
};

const getDistrictStyle = (isSelected: boolean, isHovered = false): L.PathOptions => {
  if (isHovered) return districtHoverStyle;
  if (isSelected) return districtSelectedStyle;
  return districtBaseStyle;
};

const getTalukStyle = (isSelected: boolean, isHovered = false): L.PathOptions => {
  if (isHovered) return talukHoverStyle;
  if (isSelected) return talukSelectedStyle;
  return talukBaseStyle;
};

type IntensityStatus = 'idle' | 'loading' | 'ready' | 'empty' | 'error';

function getIntensityColor(cases: number, maxCases: number): string {
  if (maxCases <= 0) return '#2d7d7d';
  const ratio = cases / maxCases;
  if (ratio <= 0.33) return '#79b8bc';
  if (ratio <= 0.66) return '#4b8f8f';
  return '#155e63';
}

function getIntensityRadius(cases: number, maxCases: number): number {
  if (maxCases <= 0) return 6;
  const ratio = cases / maxCases;
  return Math.max(6, Math.min(20, 6 + ratio * 14));
}

type RiskStatus = 'idle' | 'loading' | 'ready' | 'empty' | 'error';

function getRiskColor(riskLevel: RiskLevel): string {
  switch (riskLevel) {
    case 'Low':
      return '#79b8bc';
    case 'Moderate':
      return '#4b8f8f';
    case 'High':
      return '#155e63';
    default:
      return '#9ca3af';
  }
}

type ClusterStatus = 'idle' | 'loading' | 'ready' | 'empty' | 'error' | 'insufficient-spatial-data';

function getClusterColor(): string {
  return '#155e63';
}

export function KeralaMap({
  selectedDistrictId,
  selectedTalukId,
  selectedDisease,
  selectedDate,
  visualizationMode,
  onDistrictSelect,
  onTalukSelect,
  onClusterSelect,
  selectedClusterId,
}: KeralaMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const keralaLayerRef = useRef<L.GeoJSON | null>(null);
  const districtLayersRef = useRef<Map<string, L.GeoJSON>>(new Map());
  const talukLayersRef = useRef<Map<string, L.GeoJSON>>(new Map());
  const intensityLayerRef = useRef<L.LayerGroup | null>(null);
  const riskLayerRef = useRef<L.LayerGroup | null>(null);
  const clusterLayerRef = useRef<L.LayerGroup | null>(null);
  const clusterLayersRef = useRef<Map<string, L.Layer>>(new Map());
  const hotspotLayerRef = useRef<L.LayerGroup | null>(null);
  const selectedDistrictIdRef = useRef(selectedDistrictId);
  const selectedTalukIdRef = useRef(selectedTalukId);
  const selectedDiseaseRef = useRef(selectedDisease);
  const selectedDateRef = useRef(selectedDate);
  const visualizationModeRef = useRef(visualizationMode);
  const onDistrictSelectRef = useRef(onDistrictSelect);
  const onTalukSelectRef = useRef(onTalukSelect);
  const onClusterSelectRef = useRef(onClusterSelect);
  const selectedClusterIdRef = useRef(selectedClusterId);
  const talukRequestRef = useRef(0);
  const intensityRequestRef = useRef(0);
  const riskRequestRef = useRef(0);
  const clusterRequestRef = useRef(0);
  const [status, setStatus] = useState<MapStatus>('loading');
  const [talukStatus, setTalukStatus] = useState<TalukStatus>('idle');
  const [intensityStatus, setIntensityStatus] = useState<IntensityStatus>('idle');
  const [riskStatus, setRiskStatus] = useState<RiskStatus>('idle');
  const [clusterStatus, setClusterStatus] = useState<ClusterStatus>('idle');
  const [hotspotStatus, setHotspotStatus] = useState<'idle' | 'empty'>('idle');

  useEffect(() => {
    selectedDistrictIdRef.current = selectedDistrictId;
    selectedTalukIdRef.current = selectedTalukId;
    selectedDiseaseRef.current = selectedDisease;
    selectedDateRef.current = selectedDate;
    visualizationModeRef.current = visualizationMode;
    onDistrictSelectRef.current = onDistrictSelect;
    onTalukSelectRef.current = onTalukSelect;
    onClusterSelectRef.current = onClusterSelect;
    selectedClusterIdRef.current = selectedClusterId;
  }, [selectedDistrictId, selectedTalukId, selectedDisease, selectedDate, visualizationMode, onDistrictSelect, onTalukSelect, onClusterSelect, selectedClusterId]);

  const clearIntensityLayer = () => {
    const map = mapRef.current;
    const layer = intensityLayerRef.current;
    if (layer && map?.hasLayer(layer)) {
      map.removeLayer(layer);
    }
    intensityLayerRef.current = null;
  };

  const clearRiskLayer = () => {
    const map = mapRef.current;
    const layer = riskLayerRef.current;
    if (layer && map?.hasLayer(layer)) {
      map.removeLayer(layer);
    }
    riskLayerRef.current = null;
  };

  const clearClusterLayer = () => {
    const map = mapRef.current;
    const layer = clusterLayerRef.current;
    if (layer && map?.hasLayer(layer)) {
      map.removeLayer(layer);
    }
    clusterLayerRef.current = null;
    clusterLayersRef.current.clear();
  };

  const clearHotspotLayer = () => {
    const map = mapRef.current;
    const layer = hotspotLayerRef.current;
    if (layer && map?.hasLayer(layer)) {
      map.removeLayer(layer);
    }
    hotspotLayerRef.current = null;
  };

  const clearTalukLayers = () => {
    const map = mapRef.current;
    talukLayersRef.current.forEach((layer) => {
      layer.eachLayer((childLayer) => childLayer.off());
      layer.off();
      if (map?.hasLayer(layer)) {
        map.removeLayer(layer);
      }
    });
    talukLayersRef.current.clear();
  };

  useEffect(() => {
    let map: L.Map | null = null;
    let keralaLayer: L.GeoJSON | null = null;
    const districtLayers = new Map<string, L.GeoJSON>();
    let active = true;

    const loadGeometry = async () => {
      try {
        const [keralaGeometry, districts] = await Promise.all([
          fetchKeralaGeometry(),
          fetchDistricts(),
        ]);

        if (!active) return;

        if (keralaGeometry.features.length === 0 || districts.length === 0) {
          setStatus('empty');
          return;
        }

        const districtGeometry = await Promise.all(
          districts.map(async (district): Promise<DistrictGeometry> => ({
            district,
            geometry: await fetchDistrictGeometry(district.id),
          })),
        );

        if (!active) return;

        const availableGeometry = districtGeometry.filter(({ geometry }) => geometry.geometry !== null);
        if (availableGeometry.length === 0) {
          setStatus('empty');
          return;
        }

        const container = containerRef.current;
        if (!container) return;

        const activeMap = L.map(container, {
          attributionControl: false,
          boxZoom: false,
          doubleClickZoom: true,
          keyboard: true,
          maxZoom: 12,
          minZoom: 6,
          scrollWheelZoom: true,
          touchZoom: true,
          zoomControl: true,
        });
        map = activeMap;
        mapRef.current = activeMap;

        keralaLayer = L.geoJSON(keralaGeometry, { interactive: false, style: keralaStyle });
        keralaLayer.addTo(activeMap);
        keralaLayerRef.current = keralaLayer;

        availableGeometry.forEach(({ district, geometry }) => {
          const districtLayer = L.geoJSON(geometry, {
            style: getDistrictStyle(district.id === selectedDistrictIdRef.current),
            onEachFeature: (_feature, layer) => {
              layer.bindTooltip(district.name, { sticky: true });
              layer.on('mouseover', () => {
                if (layer instanceof L.Path) {
                  layer.setStyle(getDistrictStyle(district.id === selectedDistrictIdRef.current, true));
                  layer.bringToFront();
                }
              });
              layer.on('mouseout', () => {
                if (layer instanceof L.Path) {
                  layer.setStyle(getDistrictStyle(district.id === selectedDistrictIdRef.current));
                }
              });
              layer.on('click', () => {
                onDistrictSelectRef.current(district.id);
              });
            },
          });
          districtLayer.addTo(activeMap);
          districtLayers.set(district.id, districtLayer);
        });
        districtLayersRef.current = districtLayers;

        const bounds = keralaLayer.getBounds();
        if (!bounds.isValid()) {
          setStatus('empty');
          return;
        }

        const selectedDistrictLayer = selectedDistrictIdRef.current
          ? districtLayers.get(selectedDistrictIdRef.current)
          : null;
        const selectedBounds = selectedDistrictLayer?.getBounds();
        map.fitBounds(selectedBounds?.isValid() ? selectedBounds : bounds, {
          padding: [24, 24],
          maxZoom: 11,
        });
        map.invalidateSize();
        setStatus('ready');
      } catch {
        if (active) {
          setStatus('error');
        }
      }
    };

    void loadGeometry();

    return () => {
      active = false;
      districtLayersRef.current.clear();
      keralaLayerRef.current = null;
      mapRef.current = null;
      if (map) {
        map.remove();
      }
    };
  }, []);

  useEffect(() => {
    if (status !== 'ready') return;

    const requestId = talukRequestRef.current + 1;
    talukRequestRef.current = requestId;
    let active = true;

    const loadTalukBoundaries = async () => {
      if (!selectedDistrictId) {
        clearTalukLayers();
        setTalukStatus('idle');
        return;
      }

      setTalukStatus('loading');

      try {
        const taluks = await fetchTaluks(selectedDistrictId);
        if (!active || requestId !== talukRequestRef.current) return;

        const districtTaluks = taluks.filter((taluk) => taluk.districtId === selectedDistrictId);
        if (districtTaluks.length === 0) {
          clearTalukLayers();
          setTalukStatus('empty');
          return;
        }

        const talukGeometry = await Promise.all(
          districtTaluks.map(async (taluk): Promise<TalukGeometry> => ({
            taluk,
            geometry: await fetchTalukGeometry(taluk.id),
          })),
        );

        if (!active || requestId !== talukRequestRef.current) return;

        const availableGeometry = talukGeometry.filter(({ geometry }) => geometry.geometry !== null);
        clearTalukLayers();

        if (availableGeometry.length === 0) {
          setTalukStatus('empty');
          return;
        }

        const map = mapRef.current;
        if (!map) return;

        const layers = new Map<string, L.GeoJSON>();
        availableGeometry.forEach(({ taluk, geometry }) => {
          const talukLayer = L.geoJSON(geometry, {
            style: getTalukStyle(taluk.id === selectedTalukIdRef.current),
            onEachFeature: (_feature, layer) => {
              layer.bindTooltip(taluk.name, { sticky: true });
              layer.on('mouseover', () => {
                if (layer instanceof L.Path) {
                  layer.setStyle(getTalukStyle(taluk.id === selectedTalukIdRef.current, true));
                  layer.bringToFront();
                }
              });
              layer.on('mouseout', () => {
                if (layer instanceof L.Path) {
                  layer.setStyle(getTalukStyle(taluk.id === selectedTalukIdRef.current));
                }
              });
              layer.on('click', () => {
                onTalukSelectRef.current(taluk.id);
              });
            },
          });
          talukLayer.addTo(map);
          layers.set(taluk.id, talukLayer);
        });
        talukLayersRef.current = layers;
        setTalukStatus('ready');
      } catch {
        if (active && requestId === talukRequestRef.current) {
          clearTalukLayers();
          setTalukStatus('error');
        }
      }
    };

    void loadTalukBoundaries();

    return () => {
      active = false;
      if (requestId === talukRequestRef.current) {
        clearTalukLayers();
      }
    };
  }, [selectedDistrictId, status]);

  useEffect(() => {
    const map = mapRef.current;
    const districtLayers = districtLayersRef.current;
    const talukLayers = talukLayersRef.current;
    if (!map) return;

    districtLayers.forEach((layer, districtId) => {
      const isSelected = districtId === selectedDistrictId;
      layer.setStyle(getDistrictStyle(isSelected));
      if (isSelected) {
        layer.bringToFront();
      }
    });

    talukLayers.forEach((layer, talukId) => {
      const isSelected = talukId === selectedTalukId;
      layer.setStyle(getTalukStyle(isSelected));
      if (isSelected) {
        layer.bringToFront();
      }
    });

    const selectedTalukLayer = selectedTalukId ? talukLayers.get(selectedTalukId) : null;
    const selectedDistrictLayer = selectedDistrictId ? districtLayers.get(selectedDistrictId) : null;
    const bounds = selectedTalukLayer?.getBounds()
      ?? selectedDistrictLayer?.getBounds()
      ?? keralaLayerRef.current?.getBounds();
    if (bounds?.isValid()) {
      map.fitBounds(bounds, { padding: [24, 24], maxZoom: 11 });
    }
  }, [selectedDistrictId, selectedTalukId, talukStatus]);

  useEffect(() => {
    const isIntensityMode = visualizationMode === 'intensity' || visualizationMode === 'heatmap';
    if (!isIntensityMode) {
      clearIntensityLayer();
      setIntensityStatus('idle');
      return;
    }

    if (status !== 'ready') return;

    const requestId = intensityRequestRef.current + 1;
    intensityRequestRef.current = requestId;
    let active = true;

    const loadIntensityData = async () => {
      clearIntensityLayer();
      setIntensityStatus('loading');

      try {
        const mapData: MapData = await fetchMapData({
          disease: selectedDiseaseRef.current || undefined,
          date: selectedDateRef.current || undefined,
          district: selectedDistrictIdRef.current || undefined,
        });

        if (!active || requestId !== intensityRequestRef.current) return;

        const map = mapRef.current;
        if (!map) {
          setIntensityStatus('error');
          return;
        }

        let talukData = mapData.taluks;

        if (selectedTalukIdRef.current) {
          talukData = talukData.filter((taluk) => taluk.id === selectedTalukIdRef.current);
        }

        const validRecords = talukData.filter(
          (taluk) =>
            typeof taluk.cases === 'number' &&
            taluk.cases > 0 &&
            typeof taluk.latitude === 'number' &&
            typeof taluk.longitude === 'number' &&
            !Number.isNaN(taluk.latitude) &&
            !Number.isNaN(taluk.longitude)
        );

        if (validRecords.length === 0) {
          setIntensityStatus('empty');
          return;
        }

        const maxCases = Math.max(...validRecords.map((t) => t.cases));

        const intensityLayer = L.layerGroup();
        validRecords.forEach((taluk) => {
          const color = getIntensityColor(taluk.cases, maxCases);
          const radius = getIntensityRadius(taluk.cases, maxCases);
          const circleMarker = L.circleMarker([taluk.latitude, taluk.longitude], {
            radius,
            fillColor: color,
            fillOpacity: 0.7,
            color: color,
            weight: 1,
            opacity: 0.9,
            interactive: false,
          });
          circleMarker.bindTooltip(
            `${taluk.name}: ${taluk.cases} case${taluk.cases !== 1 ? 's' : ''}`,
            { sticky: true }
          );
          intensityLayer.addLayer(circleMarker);
        });

        intensityLayer.addTo(map);
        intensityLayerRef.current = intensityLayer;
        setIntensityStatus('ready');
      } catch {
        if (active && requestId === intensityRequestRef.current) {
          clearIntensityLayer();
          setIntensityStatus('error');
        }
      }
    };

    void loadIntensityData();

    return () => {
      active = false;
      if (requestId === intensityRequestRef.current) {
        clearIntensityLayer();
      }
    };
  }, [visualizationMode, selectedDistrictId, selectedDisease, selectedDate, selectedTalukId, status]);

  useEffect(() => {
    const isRiskMode = visualizationMode === 'risk';
    if (!isRiskMode) {
      clearRiskLayer();
      setRiskStatus('idle');
      return;
    }

    if (status !== 'ready') return;

    const requestId = riskRequestRef.current + 1;
    riskRequestRef.current = requestId;
    let active = true;

    const loadRiskData = async () => {
      clearRiskLayer();
      setRiskStatus('loading');

      try {
        const mapData: MapData = await fetchMapData({
          disease: selectedDiseaseRef.current || undefined,
          date: selectedDateRef.current || undefined,
          district: selectedDistrictIdRef.current || undefined,
        });

        if (!active || requestId !== riskRequestRef.current) return;

        const map = mapRef.current;
        if (!map) {
          setRiskStatus('error');
          return;
        }

        let talukData = mapData.taluks;

        if (selectedTalukIdRef.current) {
          talukData = talukData.filter((taluk) => taluk.id === selectedTalukIdRef.current);
        }

        const validRecords = talukData.filter(
          (taluk) =>
            typeof taluk.latitude === 'number' &&
            typeof taluk.longitude === 'number' &&
            !Number.isNaN(taluk.latitude) &&
            !Number.isNaN(taluk.longitude) &&
            (taluk.riskLevel === 'Low' || taluk.riskLevel === 'Moderate' || taluk.riskLevel === 'High')
        );

        if (validRecords.length === 0) {
          setRiskStatus('empty');
          return;
        }

        const riskLayer = L.layerGroup();
        validRecords.forEach((taluk) => {
          const color = getRiskColor(taluk.riskLevel);
          const circleMarker = L.circleMarker([taluk.latitude, taluk.longitude], {
            radius: 12,
            fillColor: color,
            fillOpacity: 0.8,
            color: color,
            weight: 2,
            opacity: 1,
            interactive: false,
          });
          circleMarker.bindTooltip(
            `${taluk.name}: ${taluk.riskLevel} Risk`,
            { sticky: true }
          );
          riskLayer.addLayer(circleMarker);
        });

        riskLayer.addTo(map);
        riskLayerRef.current = riskLayer;
        setRiskStatus('ready');
      } catch {
        if (active && requestId === riskRequestRef.current) {
          clearRiskLayer();
          setRiskStatus('error');
        }
      }
    };

    void loadRiskData();

    return () => {
      active = false;
      if (requestId === riskRequestRef.current) {
        clearRiskLayer();
      }
    };
  }, [visualizationMode, selectedDistrictId, selectedDisease, selectedDate, selectedTalukId, status]);

  useEffect(() => {
    const isClusterMode = visualizationMode === 'clusters';
    if (!isClusterMode) {
      clearClusterLayer();
      setClusterStatus('idle');
      return;
    }

    if (status !== 'ready') return;

    const requestId = clusterRequestRef.current + 1;
    clusterRequestRef.current = requestId;
    let active = true;

    const loadClusterData = async () => {
      clearClusterLayer();
      setClusterStatus('loading');

      try {
        const clusters: Cluster[] = await fetchClusters({
          disease: selectedDiseaseRef.current || undefined,
          date: selectedDateRef.current || undefined,
          district: selectedDistrictIdRef.current || undefined,
        });

        if (!active || requestId !== clusterRequestRef.current) return;

        const map = mapRef.current;
        if (!map) {
          setClusterStatus('error');
          return;
        }

        let filteredClusters = clusters;

        if (selectedTalukIdRef.current) {
          filteredClusters = clusters.filter((cluster) =>
            cluster.taluks.includes(selectedTalukIdRef.current!)
          );
        }

        const clusterLayer = L.layerGroup();
        const clusterLayers = new Map<string, L.Layer>();

        let hasValidSpatialData = false;

        filteredClusters.forEach((cluster) => {
          // Try to render cluster geometry first
          if (cluster.geometry) {
            hasValidSpatialData = true;
            const geoLayer = L.geoJSON(cluster.geometry, {
              style: {
                color: getClusterColor(),
                weight: 2.5,
                opacity: 0.9,
                fillColor: getClusterColor(),
                fillOpacity: 0.15,
              },
              onEachFeature: (_feature, layer) => {
                layer.bindTooltip(
                  `Cluster ${cluster.id}: ${cluster.disease} — ${cluster.totalCases} cases`,
                  { sticky: true }
                );
                layer.on('click', () => {
                  onClusterSelectRef.current?.(cluster);
                });
                if (cluster.id === selectedClusterIdRef.current && 'setStyle' in layer && 'bringToFront' in layer) {
                  (layer as L.Path).setStyle({
                    weight: 4,
                    opacity: 1,
                    fillOpacity: 0.3,
                  });
                  (layer as L.Path).bringToFront();
                }
              },
            });
            geoLayer.addTo(clusterLayer);
            clusterLayers.set(cluster.id, geoLayer);
            return;
          }

          // Fallback to epicentre if available
          if (cluster.epicentre) {
            hasValidSpatialData = true;
            const isSelected = cluster.id === selectedClusterIdRef.current;
            const epicentreMarker = L.circleMarker([cluster.epicentre.latitude, cluster.epicentre.longitude], {
              radius: isSelected ? 18 : 14,
              fillColor: getClusterColor(),
              fillOpacity: isSelected ? 1 : 0.9,
              color: isSelected ? '#ffffff' : '#ffffff',
              weight: isSelected ? 3.5 : 2.5,
              opacity: 1,
              interactive: true,
            });
            epicentreMarker.bindTooltip(
              `Cluster ${cluster.id}: ${cluster.disease} — ${cluster.totalCases} cases (Epicentre)`,
              { sticky: true }
            );
            epicentreMarker.on('click', () => {
              onClusterSelectRef.current?.(cluster);
            });
            if (isSelected) {
              epicentreMarker.bringToFront();
            }
            clusterLayer.addLayer(epicentreMarker);
            clusterLayers.set(cluster.id, epicentreMarker);
            return;
          }

          // If no geometry and no epicentre, we can't visualize this cluster spatially
        });

        if (!hasValidSpatialData) {
          setClusterStatus('insufficient-spatial-data');
          return;
        }

        clusterLayer.addTo(map);
        clusterLayerRef.current = clusterLayer;
        clusterLayersRef.current = clusterLayers;
        setClusterStatus('ready');
      } catch {
        if (active && requestId === clusterRequestRef.current) {
          clearClusterLayer();
          setClusterStatus('error');
        }
      }
    };

    void loadClusterData();

    return () => {
      active = false;
      if (requestId === clusterRequestRef.current) {
        clearClusterLayer();
      }
    };
  }, [visualizationMode, selectedDistrictId, selectedDisease, selectedDate, selectedTalukId, status, selectedClusterId]);

  useEffect(() => {
    const isHotspotMode = visualizationMode === 'hotspot';
    if (!isHotspotMode) {
      clearHotspotLayer();
      setHotspotStatus('idle');
      return;
    }

    if (status !== 'ready') return;

    // No authoritative backend hotspot API exists.
    // Do NOT derive hotspot from clusters.
    // Show empty state per backend contract.
    setHotspotStatus('empty');

    return () => {
      clearHotspotLayer();
    };
  }, [visualizationMode, status]);

  useEffect(() => {
    const isEpicentreMode = visualizationMode === 'epicentre';
    if (!isEpicentreMode) {
      return;
    }

    // No authoritative backend Estimated Potential Epicentre API exists.
    // Do NOT select an epicentre from clusters in React.
    // Show empty state per backend contract.

    return () => {
    };
  }, [visualizationMode]);

  const showIntensityLegend = visualizationMode === 'intensity' || visualizationMode === 'heatmap';
  const showRiskLegend = visualizationMode === 'risk';
  const showClusterLegend = visualizationMode === 'clusters';

  return (
    <div
      className="kerala-map"
      role="region"
      aria-label="Kerala geographic map"
      aria-busy={status === 'loading' || talukStatus === 'loading' || intensityStatus === 'loading' || riskStatus === 'loading' || clusterStatus === 'loading'}
    >
      <div ref={containerRef} className="kerala-map__container" />
      {status === 'loading' && (
        <div className="kerala-map__state" role="status">
          <p>Loading map...</p>
        </div>
      )}
      {status === 'empty' && (
        <div className="kerala-map__state" role="status">
          <p>No geographic data available.</p>
        </div>
      )}
      {status === 'error' && (
        <div className="kerala-map__state" role="alert">
          <p>Unable to load map data. Please try again.</p>
        </div>
      )}
      {status === 'ready' && selectedDistrictId && talukStatus === 'loading' && (
        <div className="kerala-map__state" role="status">
          <p>Loading taluk boundaries...</p>
        </div>
      )}
      {status === 'ready' && selectedDistrictId && talukStatus === 'empty' && (
        <div className="kerala-map__state" role="status">
          <p>No taluk geographic data available.</p>
        </div>
      )}
      {status === 'ready' && selectedDistrictId && talukStatus === 'error' && (
        <div className="kerala-map__state" role="alert">
          <p>Unable to load taluk boundaries. Please try again.</p>
        </div>
      )}
      {status === 'ready' && intensityStatus === 'loading' && (
        <div className="kerala-map__state" role="status">
          <p>Loading case-intensity data...</p>
        </div>
      )}
      {status === 'ready' && intensityStatus === 'empty' && (
        <div className="kerala-map__state" role="status">
          <p>Data unavailable.</p>
        </div>
      )}
      {status === 'ready' && intensityStatus === 'error' && (
        <div className="kerala-map__state" role="alert">
          <p>Data unavailable.</p>
        </div>
      )}
      {status === 'ready' && riskStatus === 'loading' && (
        <div className="kerala-map__state" role="status">
          <p>Loading risk data...</p>
        </div>
      )}
      {status === 'ready' && riskStatus === 'empty' && (
        <div className="kerala-map__state" role="status">
          <p>Data unavailable.</p>
        </div>
      )}
      {status === 'ready' && riskStatus === 'error' && (
        <div className="kerala-map__state" role="alert">
          <p>Data unavailable.</p>
        </div>
      )}
      {status === 'ready' && clusterStatus === 'loading' && (
        <div className="kerala-map__state" role="status">
          <p>Loading spatiotemporal clusters...</p>
        </div>
      )}
      {status === 'ready' && clusterStatus === 'empty' && (
        <div className="kerala-map__state" role="status">
          <p>No spatiotemporal clusters detected.</p>
        </div>
      )}
      {status === 'ready' && clusterStatus === 'error' && (
        <div className="kerala-map__state" role="alert">
          <p>Data unavailable.</p>
        </div>
      )}
      {status === 'ready' && clusterStatus === 'insufficient-spatial-data' && (
        <div className="kerala-map__state" role="status">
          <p>Cluster data available, but spatial visualization is unavailable.</p>
        </div>
      )}
      {status === 'ready' && hotspotStatus === 'empty' && (
        <div className="kerala-map__state" role="status">
          <p>No hotspot identified.</p>
        </div>
      )}
      {showIntensityLegend && intensityStatus === 'ready' && (
        <div className="kerala-map__legend" role="region" aria-label="Case intensity legend">
          <div className="kerala-map__legend-header">Case Intensity</div>
          <div className="kerala-map__legend-gradient">
            <span className="kerala-map__legend-label">Low</span>
            <div className="kerala-map__legend-bar" />
            <span className="kerala-map__legend-label">High</span>
          </div>
          <p className="kerala-map__legend-note">Visualization scale only</p>
          <p className="kerala-map__legend-explanation">
            Heatmap represents reported case intensity. It does not independently confirm an outbreak.
          </p>
        </div>
      )}
      {showRiskLegend && riskStatus === 'ready' && (
        <div className="kerala-map__legend" role="region" aria-label="Risk legend">
          <div className="kerala-map__legend-header">Risk</div>
          <div className="kerala-map__legend-items">
            <div className="kerala-map__legend-item">
              <span className="kerala-map__legend-color" style={{ backgroundColor: '#79b8bc' }} />
              <span className="kerala-map__legend-label">Low</span>
            </div>
            <div className="kerala-map__legend-item">
              <span className="kerala-map__legend-color" style={{ backgroundColor: '#4b8f8f' }} />
              <span className="kerala-map__legend-label">Moderate</span>
            </div>
            <div className="kerala-map__legend-item">
              <span className="kerala-map__legend-color" style={{ backgroundColor: '#155e63' }} />
              <span className="kerala-map__legend-label">High</span>
            </div>
          </div>
        </div>
      )}
      {showClusterLegend && clusterStatus === 'ready' && (
        <div className="kerala-map__legend" role="region" aria-label="Cluster legend">
          <div className="kerala-map__legend-header">Spatiotemporal Clusters</div>
          <div className="kerala-map__legend-items">
            <div className="kerala-map__legend-item">
              <span className="kerala-map__legend-color" style={{ backgroundColor: '#155e63' }} />
              <span className="kerala-map__legend-label">Cluster</span>
            </div>
          </div>
          <p className="kerala-map__legend-note">A cluster is a spatial-temporal concentration requiring epidemiological interpretation.</p>
        </div>
      )}
    </div>
  );
}
