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
  trackEdge: number; // New field
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
  "Track Edge"?: number; // Optional in case older files miss it
}