import { useQuery } from '@tanstack/react-query';
import { getLapComparison, getLapTelemetry } from '@/lib/api';
import { TelemetryPoint, DeltaPoint } from '@/types/api';

interface UseComparisonProps {
  refSession: string | null;
  refLap: number | null;
  compSession: string | null;
  compLap: number | null;
}

export function useComparison({ refSession, refLap, compSession, compLap }: UseComparisonProps) {

  const { data: refTelemetry, isLoading: isLoadingRef } = useQuery<TelemetryPoint[]>({
    queryKey: ['telemetry', refSession, refLap],
    queryFn: () => getLapTelemetry(refSession!, refLap!),
    enabled: !!refSession && !!refLap,
    staleTime: 1000 * 60 * 5,
  });

  const channelsToCompare = [
    'Ground Speed',
    'Throttle Pos',
    'Brake Pos',
    'Engine RPM',
    'Gear',
    'G Force Lat',
    'G Force Long',
    'Tyres Wear',
    'Steering Pos',
    'Fuel Level',
    'Virtual Energy',
    'TC',
    'ABS'
  ];

  const { data: comparisonData, isLoading: isLoadingComp } = useQuery<DeltaPoint[]>({
    queryKey: ['compare', refSession, refLap, compSession, compLap],
    queryFn: () => getLapComparison(refSession!, refLap!, compSession!, compLap!, channelsToCompare),
    enabled: !!refSession && !!refLap && !!compSession && !!compLap,
    staleTime: 1000 * 60 * 5,
  });

  return {
    refTelemetry,
    comparisonData,
    isLoading: isLoadingRef || isLoadingComp
  };
}