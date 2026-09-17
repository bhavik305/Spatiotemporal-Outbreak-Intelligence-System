import apiClient from './client';
import type { DashboardSummary, MapData, DiseaseTrends, TemporalSignal, Cluster, Alert, Advisory, SurveillanceCycle, HospitalReport, HospitalReportReview, SubmissionReceipt } from '../types';

export async function fetchDashboardSummary(): Promise<DashboardSummary> {
  const response = await apiClient.get<DashboardSummary>('/dashboard/summary');
  return response.data;
}

export async function fetchMapData(filters?: {
  disease?: string;
  date?: string;
  district?: string;
}): Promise<MapData> {
  const response = await apiClient.get<MapData>('/dashboard/map', { params: filters });
  return response.data;
}

export async function fetchDiseaseTrends(params: {
  disease: string;
  district?: string;
  taluk?: string;
  period: '7d' | '30d' | '90d' | 'custom';
  startDate?: string;
  endDate?: string;
}): Promise<DiseaseTrends> {
  const response = await apiClient.get<DiseaseTrends>('/intelligence/trends', { params });
  return response.data;
}

export async function fetchTemporalSignals(filters?: {
  disease?: string;
  district?: string;
}): Promise<TemporalSignal[]> {
  const response = await apiClient.get<TemporalSignal[]>('/intelligence/signals', { params: filters });
  return response.data;
}

export async function fetchClusters(filters?: {
  disease?: string;
  district?: string;
  date?: string;
}): Promise<Cluster[]> {
  const response = await apiClient.get<Cluster[]>('/clusters', { params: filters });
  return response.data;
}

export async function fetchClusterById(clusterId: string): Promise<Cluster> {
  const response = await apiClient.get<Cluster>(`/clusters/${clusterId}`);
  return response.data;
}

export async function fetchAlerts(filters?: {
  severity?: string;
  disease?: string;
  district?: string;
  limit?: number;
}): Promise<Alert[]> {
  const response = await apiClient.get<Alert[]>('/alerts', { params: filters });
  return response.data;
}

export async function fetchAdvisory(): Promise<Advisory> {
  const response = await apiClient.get<Advisory>('/advisory');
  return response.data;
}

export async function fetchCurrentCycle(): Promise<SurveillanceCycle> {
  const response = await apiClient.get<SurveillanceCycle>('/surveillance/cycle/current');
  return response.data;
}

export async function fetchCycleById(cycleId: string): Promise<SurveillanceCycle> {
  const response = await apiClient.get<SurveillanceCycle>(`/surveillance/cycle/${cycleId}`);
  return response.data;
}

export async function submitHospitalReport(report: HospitalReport): Promise<SubmissionReceipt> {
  const response = await apiClient.post<SubmissionReceipt>('/surveillance/reports', report);
  return response.data;
}

export async function fetchReportingStatus(cycleId: string): Promise<{
  totalReports: number;
  taluksReporting: number;
  diseasesReported: string[];
}> {
  const response = await apiClient.get<{
    totalReports: number;
    taluksReporting: number;
    diseasesReported: string[];
  }>(`/surveillance/cycle/${cycleId}/status`);
  return response.data;
}

export async function validateHospitalReport(report: HospitalReport): Promise<HospitalReportReview> {
  const response = await apiClient.post<HospitalReportReview>('/surveillance/reports/validate', report);
  return response.data;
}