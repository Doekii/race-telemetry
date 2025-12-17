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
    // 1. Fetch the data
    const response = await apiClient.get<any>(
        `/laps/${encodeURIComponent(filename)}/${lapNumber}`
    );

    let rawData = response.data;

    // 2. ROBUSTNESS CHECK: Parse if string
    if (typeof rawData === 'string') {
        try {
            rawData = JSON.parse(rawData);
        } catch (e) {
            console.error("Failed to parse telemetry JSON string:", e);
            throw new Error("Invalid JSON response from backend");
        }
    }

    // 3. Validation
    if (!Array.isArray(rawData)) {
        console.warn("Telemetry data is not an array:", rawData);
        return [];
    }

    // 4. Map to clean frontend types
    return (rawData as RawTelemetryPoint[]).map((point) => ({
        time: point.Time,
        distance: point["Lap Dist"],
        speed: point["Ground Speed"],
        rpm: point["Engine RPM"],
        throttle: point["Throttle Pos"],
        brake: point["Brake Pos"],
        gear: point.Gear ?? 0,
        // Map the new GPS fields (defaulting to 0 if missing to prevent crashes)
        lat: point["GPS Latitude"] || 0,
        long: point["GPS Longitude"] || 0,
    }));
};