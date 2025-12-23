import axios from 'axios';
import { LapData, SessionListResponse, LapItem, TelemetryPoint, RawTelemetryPoint } from '@/types/api';

const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000',
  headers: {
    'Content-Type': 'application/json',
  },
});

export const getSessions = async (): Promise<SessionListResponse> => {
  const response = await apiClient.get<SessionListResponse>('/sessions/');
  return response.data;
};

export const getLaps = async (filename: string): Promise<LapItem[]> => {
  const response = await apiClient.get<LapItem[]>(`/laps/${encodeURIComponent(filename)}`);
  return response.data;
};

export const getLapTelemetry = async (filename: string, lapNumber: number): Promise<TelemetryPoint[]> => {
  // Explicitly request all channels needed for the dashboard
  const channels = [
    "Ground Speed",
    "Throttle Pos",
    "Brake Pos",
    "Gear",
    "Engine RPM",
    "GPS Latitude",
    "GPS Longitude",
    "Lap Dist",
    "Track Edge"
  ].join(",");

  const response = await apiClient.get<any>(
    `/laps/${encodeURIComponent(filename)}/${lapNumber}`,
    {
      params: { channels }
    }
  );

  let rawData = response.data;

  if (typeof rawData === 'string') {
    try {
      rawData = JSON.parse(rawData);
    } catch (e) {
      console.error("Failed to parse telemetry JSON string:", e);
      throw new Error("Invalid JSON response from backend");
    }
  }

  if (!Array.isArray(rawData)) {
    console.warn("Telemetry data is not an array:", rawData);
    return [];
  }

  return (rawData as any[]).map((point) => {
    // Robust check for Track Edge key variations
    const trackEdgeVal = point["Track Edge"] ?? point["track_edge"] ?? point["TrackEdge"] ?? 0;

    return {
      time: point.Time,
      distance: point["Lap Dist"],
      speed: point["Ground Speed"],
      rpm: point["Engine RPM"],
      throttle: point["Throttle Pos"],
      brake: point["Brake Pos"],
      gear: point.Gear ?? 0,
      lat: point["GPS Latitude"] || 0,
      long: point["GPS Longitude"] || 0,
      trackEdge: Number(trackEdgeVal) // Ensure it's a number
    };
  });
};