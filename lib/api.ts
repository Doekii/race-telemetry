import axios from 'axios';
import { SessionListResponse, LapItem, TelemetryPoint, DeltaPoint } from '@/types/api';

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
    { params: { channels } }
  );

  let rawData = response.data;

  // Handle potential string response for NaN/Infinity safety
  if (typeof rawData === 'string') {
    try {
      rawData = JSON.parse(rawData);
    } catch (e) {
      console.error("Failed to parse telemetry JSON string:", e);
      return [];
    }
  }

  if (!Array.isArray(rawData)) return [];

  return rawData.map((point: any) => {
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
      trackEdge: Number(trackEdgeVal)
    };
  });
};

// --- NEW: Comparison Function ---

export const getLapComparison = async (
  file1: string,
  lap1: number,
  file2: string,
  lap2: number,
  channels: string[] = ['Ground Speed', 'Throttle Pos', 'Brake Pos', 'Engine RPM', 'Gear']
): Promise<DeltaPoint[]> => {
  const params = {
    file1,
    lap1,
    file2,
    lap2,
    channels: channels.join(',')
  };

  const response = await apiClient.get<any>('/laps/compare', { params });
  
  let rawData = response.data;

  if (typeof rawData === 'string') {
    try {
      rawData = JSON.parse(rawData);
    } catch (e) {
      console.error("Failed to parse comparison JSON:", e);
      return [];
    }
  }

  // Map backend response to DeltaPoint interface
  return rawData.map((d: any) => {
    const point: DeltaPoint = {
      dist: d['Lap Dist'],
      time_delta: d['Time_Delta']
    };
    
    // Copy dynamic channel keys (e.g., "Ground Speed_Ref")
    Object.keys(d).forEach(key => {
        if (key !== 'Lap Dist' && key !== 'Time_Delta') {
            point[key] = d[key];
        }
    });
    
    return point;
  });
};