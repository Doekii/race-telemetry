// --- EXISTING TYPES (Do not modify to prevent breaking main dashboard) ---

export interface TelemetryPoint {
  time: number;
  distance: number;
  speed: number;
  rpm: number;
  throttle: number;
  brake: number;
  gear: number;
  lat: number;
  long: number;
  trackEdge: number;
  // New fields for advanced analysis
  gLat: number;
  gLong: number;
}

export interface LapData {
  lapId: string;
  driver: string;
  car: string;
  lapTime: number;
  telemetry: TelemetryPoint[];
}

export interface SessionListResponse {
  files: string[];
}

export interface LapItem {
  lap_number: number;
}

// Helper for Backend Mapping
export interface RawTelemetryPoint {
  "Time": number;
  "ts": number;
  "Lap Dist": number;
  "Ground Speed": number;
  "Throttle Pos": number;
  "Brake Pos": number;
  "Gear": number | null;
  "Engine RPM": number;
  "GPS Latitude": number;
  "GPS Longitude": number;
  "Track Edge"?: number;
  "track_edge"?: number;
  "TrackEdge"?: number;
}

// --- NEW TYPES FOR COMPARISON FEATURE ---

export interface DeltaPoint {
  dist: number;
  time_delta: number;
  [key: string]: number | number[] | any; // Allow arrays/objects
}

export interface DeltaResponse {
  data: DeltaPoint[];
  metric: string;
}
