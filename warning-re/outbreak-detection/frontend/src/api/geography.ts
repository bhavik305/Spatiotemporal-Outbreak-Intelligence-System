import apiClient from './client';
import type { District, Taluk } from '../types';
import type { Feature, FeatureCollection } from 'geojson';

export async function fetchDistricts(): Promise<District[]> {
  const response = await apiClient.get<District[]>('/geography/districts');
  return response.data;
}

export async function fetchTaluks(districtId: string): Promise<Taluk[]> {
  const response = await apiClient.get<Taluk[]>(`/geography/taluks`, {
    params: { district_id: districtId },
  });
  return response.data;
}

export async function fetchTalukGeometry(talukId: string): Promise<Feature> {
  const response = await apiClient.get<Feature>(`/geography/taluks/${talukId}/geometry`);
  return response.data;
}

export async function fetchDistrictGeometry(districtId: string): Promise<Feature> {
  const response = await apiClient.get<Feature>(`/geography/districts/${districtId}/geometry`);
  return response.data;
}

export async function fetchKeralaGeometry(): Promise<FeatureCollection> {
  const response = await apiClient.get<FeatureCollection>('/geography/kerala');
  return response.data;
}