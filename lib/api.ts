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
  // ... existing implementation ...
  const channels = [
    "Ground Speed",
    "Throttle Pos",
    "Brake Pos",
    "Gear",
    "Engine RPM",
    "GPS Latitude",
    "GPS Longitude",
    "Lap Dist",
    "Track Edge",
    "G Force Lat",
    "G Force Long"
  ].join(",");

  const response = await apiClient.get<any>(
    `/laps/${encodeURIComponent(filename)}/${lapNumber}`,
    { params: { channels } }
  );

  let rawData = response.data;

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
      trackEdge: Number(trackEdgeVal),
      gLat: point["G Force Lat"] || 0,
      gLong: point["G Force Long"] || 0
    };
  });
};

export const getLapComparison = async (
  file1: string,
  lap1: number,
  file2: string,
  lap2: number,
  channels: string[] = [
    'Ground Speed',
    'Throttle Pos',
    'Brake Pos',
    'Engine RPM',
    'Gear',
    'G Force Lat',
    'G Force Long',
    'Tyres Wear'
  ]
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

  return rawData.map((d: any) => {
    const point: DeltaPoint = {
      dist: d['Lap Dist'],
      time_delta: d['Time_Delta']
    };

    // Improved Mapping: Don't destroy arrays
    Object.keys(d).forEach(key => {
      if (key !== 'Lap Dist' && key !== 'Time_Delta') {
        const val = d[key];
        // If array or object, keep it. If primitive, cast to number safely.
        if (typeof val === 'object' && val !== null) {
          point[key] = val; // Keep array/object structure (e.g. [99, 99, 98, 98])
        } else {
          const num = Number(val);
          point[key] = isNaN(num) ? 0 : num;
        }
      }
    });

    return point;
  });
};