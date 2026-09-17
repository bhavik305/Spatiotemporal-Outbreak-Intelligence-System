import type { Geometry } from 'geojson';

export interface District {
  id: string;
  name: string;
  talukCount: number;
}

export interface Taluk {
  id: string;
  name: string;
  districtId: string;
  districtName: string;
  latitude: number;
  longitude: number;
}

export interface TalukData extends Taluk {
  disease: string;
  cases: number;
  previousCases: number;
  changePercent: number;
  riskLevel: RiskLevel;
  temporalSignal: boolean;
  spatialSignal: boolean;
  clusterAssociation: boolean;
}

export type RiskLevel = 'Low' | 'Moderate' | 'High' | 'Unknown';

export interface SurveillanceCycle {
  id: string;
  startTime: string;
  endTime: string;
  status: CycleStatus;
  reportsReceived: number;
  taluksReporting: number;
  lastUpdate: string;
}

export type CycleStatus = 'OPEN_FOR_REPORTING' | 'PROCESSING' | 'ANALYSIS_READY' | 'CYCLE_CLOSED';

export interface DashboardSummary {
  activeSurveillance: {
    districts: number;
    taluks: number;
  };
  reportingTaluks: number;
  activeSignals: number;
  candidateClusters: number;
}

export interface MapData {
  taluks: TalukData[];
  districts: District[];
  bounds: [[number, number], [number, number]];
}

export interface DiseaseTrendPoint {
  date: string;
  cases: number;
}

export interface DiseaseTrends {
  disease: string;
  district?: string;
  taluk?: string;
  data: DiseaseTrendPoint[];
}

export interface TemporalSignal {
  disease: string;
  taluk: string;
  district: string;
  detectionPeriod: { start: string; end: string };
  observedActivity: number;
  expectedBaseline: number;
  signalDetected: boolean;
  technicalDetails?: TechnicalDetails;
}

export interface TechnicalDetails {
  model: string;
  temporalAnalysis: string;
  spatialAnalysis: string;
  clusterMethod: string;
  inputPeriod: string;
  trainingValidation?: string;
  modelVersion: string;
}

export interface Alert {
  id: string;
  severity: 'Low' | 'Moderate' | 'High' | 'Critical';
  disease: string;
  district: string;
  taluk: string;
  date: string;
  explanation: string;
  recommendedActions: string[];
}

export interface Advisory {
  title: string;
  whatIsHappening: string;
  where: string;
  whatShouldResidentsDo: string[];
  whenMedicalAttention: string;
  source: string;
  updateDate: string;
}

export interface Cluster {
  id: string;
  disease: string;
  taluks: string[];
  timeWindow: { start: string; end: string };
  totalCases: number;
  spatialConcentration: number;
  temporalSignal: number;
  hotspot: string;
  epicentre: { latitude: number; longitude: number } | null;
  geometry?: Geometry;
}

export interface HospitalReport {
  districtId: string;
  talukId: string;
  disease: string;
  reportDate: string;
  newCases: number;
  activeCases: number;
  remarks?: string;
}

export interface HospitalReportReview extends HospitalReport {
  districtName: string;
  talukName: string;
  cycleId: string;
}

export interface SubmissionProgress {
  step: 'submitted' | 'validated' | 'cycle' | 'analysis';
  status: 'pending' | 'complete' | 'active';
}

export interface SubmissionReceipt {
  reportId: string;
  district: string;
  taluk: string;
  disease: string;
  newCases: number;
  cycleId: string;
  status: 'Validated' | 'Accepted' | 'Pending';
}

export interface ApiResponse<T> {
  data: T | null;
  error: string | null;
  loading: boolean;
}

export interface MapFilters {
  disease: string;
  date: string;
  district: string;
  taluk: string;
  visualization: VisualizationMode;
}

export type VisualizationMode = 'risk' | 'intensity' | 'heatmap' | 'clusters' | 'hotspot' | 'epicentre';

export interface ViewMode {
  type: 'public' | 'detailed';
}