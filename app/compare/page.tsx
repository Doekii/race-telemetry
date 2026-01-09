'use client';

import { useState, useEffect, useMemo } from 'react';
import TrackMap from '@/components/TrackMap';
import { useComparison } from '@/hooks/useComparison';
import { useSessions, useLaps } from '@/hooks/useTelemetry';
import { ArrowRightLeft } from 'lucide-react';
import * as d3 from 'd3';
import { ZoomSynchronizer } from '@/utils/zoom';

import CompareHeader from '@/components/compare/CompareHeader';
import CompareSelectionCard from '@/components/compare/CompareSelectionCard';
import CompareCharts from '@/components/compare/CompareCharts';
import CompareSessionManifest from '@/components/compare/CompareSessionManifest';

export default function ComparePage() {
  const [refSession, setRefSession] = useState<string | null>(null);
  const [refLap, setRefLap] = useState<number | null>(null);
  const [refColor, setRefColor] = useState<string>("#06b6d4");

  const [compSession, setCompSession] = useState<string | null>(null);
  const [compLap, setCompLap] = useState<number | null>(null);
  const [compColor, setCompColor] = useState<string>("#f43f5e");

  const [hoverDistance, setHoverDistance] = useState<number | null>(null);

  const { data: sessionData, isLoading: sessionsLoading, isError: sessionsError } = useSessions();
  const { data: refLapData, isLoading: refLapsLoading } = useLaps(refSession);
  const { data: compLapData, isLoading: compLapsLoading } = useLaps(compSession);

  const { refTelemetry, comparisonData, isLoading: comparisonLoading } = useComparison({
    refSession, refLap, compSession, compLap
  });

  useEffect(() => { setRefLap(null); }, [refSession]);
  useEffect(() => { setCompLap(null); }, [compSession]);

  const zoomSync = useMemo(() => new ZoomSynchronizer(), []);

  const xDomain: [number, number] | undefined = useMemo(() => {
    if (!comparisonData || comparisonData.length === 0) return undefined;
    const maxDist = d3.max(comparisonData, d => Number(d.dist || d["Lap Dist"] || 0)) || 5000;
    return [0, maxDist];
  }, [comparisonData]);

  useEffect(() => { zoomSync.reset(); }, [refSession, refLap, compSession, compLap, zoomSync]);

  return (
    <main className="min-h-screen bg-race-dark text-white p-6 md:p-8 font-sans selection:bg-telemetry-blue/30">

      {/* Header Container */}
      <header className="mb-8 space-y-6">
        <CompareHeader
          zoomSync={zoomSync}
        />

        {/* Selection Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <CompareSelectionCard
            type="REF" title="Reference Lap" color={refColor} setColor={setRefColor}
            sessions={sessionData?.files || []} selectedSession={refSession} setSession={setRefSession}
            sessionsLoading={sessionsLoading} sessionsError={sessionsError}
            laps={refLapData || []} selectedLap={refLap} setLap={setRefLap} lapsLoading={refLapsLoading}
          />

          <CompareSelectionCard
            type="CMP" title="Comparison Lap" color={compColor} setColor={setCompColor}
            sessions={sessionData?.files || []} selectedSession={compSession} setSession={setCompSession}
            sessionsLoading={sessionsLoading} sessionsError={sessionsError}
            laps={compLapData || []} selectedLap={compLap} setLap={setCompLap} lapsLoading={compLapsLoading}
          />
        </div>
      </header>

      <div className="space-y-6 animate-in fade-in duration-500 slide-in-from-bottom-4">
        {!comparisonData ? (
          <div className="bg-race-panel/50 border border-gray-800/50 border-dashed rounded-xl min-h-[400px] flex flex-col items-center justify-center gap-4 text-gray-500">
            {comparisonLoading ? (
              <div className="flex flex-col items-center gap-2">
                <div className="w-8 h-8 border-2 border-telemetry-blue border-t-transparent rounded-full animate-spin" />
                <span className="text-sm font-medium animate-pulse">Calculating Telemetry Delta...</span>
              </div>
            ) : (
              <>
                <div className="p-4 bg-gray-900/50 rounded-full border border-gray-800">
                  <ArrowRightLeft className="w-8 h-8 opacity-50" />
                </div>
                <div className="text-sm font-medium tracking-wide">Select both reference and comparison laps to begin</div>
              </>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            <CompareCharts
              comparisonData={comparisonData}
              hoverDistance={hoverDistance}
              setHoverDistance={setHoverDistance}
              setHoverDistance={setHoverDistance}
              refColor={refColor}
              compColor={compColor}
              zoomSync={zoomSync}
              xDomain={xDomain}
            />

            {/* Side Panel: Info & Map */}
            <div className="space-y-6">
              <CompareSessionManifest
                refColor={refColor} refSession={refSession} refLap={refLap}
                compColor={compColor} compSession={compSession} compLap={compLap}
                dataPoints={comparisonData.length}
              />

              <div className="bg-race-panel border border-gray-800 rounded-xl p-4 relative min-h-[400px] sticky top-4 shadow-lg">
                <TrackMap
                  data={refTelemetry || []} height={400} color="#ffffff" hoverDistance={hoverDistance}
                  onHover={(point) => setHoverDistance(point ? point.distance : null)}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}