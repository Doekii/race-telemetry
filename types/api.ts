// The clean shape our UI components expect
export interface TelemetryPoint {
    time: number;
    distance: number;
    speed: number;
    rpm: number;
    throttle: number;
    brake: number;
    gear: number;
    // New GPS fields
    lat: number;
    long: number;
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

// The raw shape from the backend
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
}