import { useQuery } from '@tanstack/react-query';
import { getSessions, getLaps, getLapTelemetry } from '@/lib/api';

export const useSessions = () => {
    return useQuery({
        queryKey: ['sessions'],
        queryFn: getSessions
    });
};

export const useLaps = (filename: string | null) => {
    return useQuery({
        queryKey: ['laps', filename],
        queryFn: () => getLaps(filename!),
        enabled: !!filename,
    });
};

// Updated Hook: Fetches telemetry when both session and lap are selected
export const useLapTelemetry = (filename: string | null, lapNumber: number | null) => {
    return useQuery({
        queryKey: ['lapTelemetry', filename, lapNumber],
        queryFn: () => getLapTelemetry(filename!, lapNumber!),
        // Only fetch if we have both a filename AND a valid lap number (0 is valid!)
        enabled: !!filename && (lapNumber !== null && lapNumber !== undefined),
    });
};