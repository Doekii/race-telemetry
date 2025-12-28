'use client';

import { useState, useEffect, useMemo } from 'react';
import SessionSelector from '@/components/SessionSelector';
import LapSelector from '@/components/LapSelector';
import TrackMap from '@/components/TrackMap';
import DeltaLineChart from '@/components/DeltaLineChart';
import TyreWearAnalysis from '@/components/analysis/TyreWearAnalysis';
import { useComparison } from '@/hooks/useComparison';
import { useSessions, useLaps } from '@/hooks/useTelemetry';
import { Settings2, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function ComparePage() {
  const [refSession, setRefSession] = useState<string | null>(null);
  const [refLap, setRefLap] = useState<number | null>(null);
  const [refColor, setRefColor] = useState<string>("#06b6d4");

  const [compSession, setCompSession] = useState<string | null>(null);
  const [compLap, setCompLap] = useState<number | null>(null);
  const [compColor, setCompColor] = useState<string>("#f43f5e");

  const [hoverDistance, setHoverDistance] = useState<number | null>(null);
  const [resolution, setResolution] = useState<number>(4000);

  const { data: sessionData, isLoading: sessionsLoading, isError: sessionsError } = useSessions();
  const { data: refLapData, isLoading: refLapsLoading } = useLaps(refSession);
  const { data: compLapData, isLoading: compLapsLoading } = useLaps(compSession);

  const { refTelemetry, comparisonData, isLoading: comparisonLoading } = useComparison({
    refSession, refLap, compSession, compLap
  });

  useEffect(() => { setRefLap(null); }, [refSession]);
  useEffect(() => { setCompLap(null); }, [compSession]);

  // --- DEBUGGING: Log Data Keys ---
  useEffect(() => {
    if (comparisonData && comparisonData.length > 0) {
      console.log("DEBUG: Comparison Data Keys:", Object.keys(comparisonData[0]));
      // Specifically check for anything starting with 'Tyres'
      const tyreKeys = Object.keys(comparisonData[0]).filter(k => k.toLowerCase().includes('tyre'));
      console.log("DEBUG: Found Tyre Keys:", tyreKeys);
    }
  }, [comparisonData]);

  // Keys configuration
  // The backend returns keys like 'Tyres Wear_Ref' which contains an array/object of 4 values
  // We pass these root keys to the component which handles extraction
  const tyreChannelRef = 'Tyres Wear_Ref';
  const tyreChannelComp = 'Tyres Wear_Comp';

  return (
    <main className="min-h-screen bg-race-dark text-white p-8">
      <header className="border-b border-gray-800 pb-6 mb-8">
        <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6">
          <div className="flex items-center gap-4">
            <Link href="/" className="p-2 bg-gray-800 hover:bg-gray-700 rounded-lg border border-gray-700"><ArrowLeft className="w-5 h-5" /></Link>
            <h1 className="text-2xl font-bold">Compare Analysis</h1>
          </div>

          <div className="flex flex-col md:flex-row gap-4 items-end">
            <div className="flex items-center gap-3">
              <input type="range" min={100} max={20000} step={100} value={resolution} onChange={e => setResolution(Number(e.target.value))} className="accent-telemetry-blue" />
              <span className="text-xs font-mono">{resolution} pts</span>
            </div>
            <div className="flex gap-2">
              {/* Selectors */}
              <div className="flex gap-2 p-1.5 bg-gray-900 border border-cyan-900/30 rounded">
                <div className="flex flex-col justify-center px-2 border-r border-gray-700">
                  <span className="text-[10px] font-bold text-cyan-500">REF</span>
                  <input type="color" value={refColor} onChange={e => setRefColor(e.target.value)} className="w-4 h-4 bg-transparent border-none cursor-pointer" />
                </div>
                <SessionSelector sessions={sessionData?.files || []} selected={refSession} onSelect={setRefSession} isLoading={sessionsLoading} isError={sessionsError} />
                <LapSelector laps={refLapData || []} selected={refLap} onSelect={setRefLap} isLoading={refLapsLoading} disabled={!refSession} />
              </div>
              <div className="flex gap-2 p-1.5 bg-gray-900 border border-rose-900/30 rounded">
                <div className="flex flex-col justify-center px-2 border-r border-gray-700">
                  <span className="text-[10px] font-bold text-rose-500">COMP</span>
                  <input type="color" value={compColor} onChange={e => setCompColor(e.target.value)} className="w-4 h-4 bg-transparent border-none cursor-pointer" />
                </div>
                <SessionSelector sessions={sessionData?.files || []} selected={compSession} onSelect={setCompSession} isLoading={sessionsLoading} isError={sessionsError} />
                <LapSelector laps={compLapData || []} selected={compLap} onSelect={setCompLap} isLoading={compLapsLoading} disabled={!compSession} />
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="space-y-6">
        {!comparisonData ? (
          <div className="bg-race-panel border border-gray-800 rounded-xl min-h-[400px] flex items-center justify-center text-gray-500">
            {comparisonLoading ? "Calculating Delta..." : "Select laps to compare"}
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Charts Column */}
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-race-panel p-6 rounded-lg border border-gray-800">
                <DeltaLineChart
                  data={comparisonData}
                  dataKeyRef="time_delta"
                  label="Time Delta"
                  unit="s"
                  height={200}
                  hoverDistance={hoverDistance}
                  onHover={setHoverDistance}
                  isDelta={true}
                  targetPoints={resolution}
                  colorRef={refColor}
                  colorComp={compColor}
                />
              </div>
              <div className="bg-race-panel p-6 rounded-lg border border-gray-800">
                <DeltaLineChart
                  data={comparisonData}
                  dataKeyRef="Ground Speed_Ref"
                  dataKeyComp="Ground Speed_Comp"
                  label="Speed"
                  unit="km/h"
                  height={200}
                  hoverDistance={hoverDistance}
                  onHover={setHoverDistance}
                  targetPoints={resolution}
                  colorRef={refColor}
                  colorComp={compColor}
                />
              </div>

              {/* New Tyre Wear Analysis */}
              <TyreWearAnalysis
                data={comparisonData}
                channelRef={tyreChannelRef}
                channelComp={tyreChannelComp}
                colors={{ main: refColor, comp: compColor }}
              />

              <div className="bg-race-panel p-6 rounded-lg border border-gray-800">
                <DeltaLineChart
                  data={comparisonData}
                  dataKeyRef="Throttle Pos_Ref"
                  dataKeyComp="Throttle Pos_Comp"
                  label="Throttle"
                  unit="%"
                  height={150}
                  hoverDistance={hoverDistance}
                  onHover={setHoverDistance}
                  targetPoints={resolution}
                  colorRef={refColor}
                  colorComp={compColor}
                />
              </div>
            </div>

            {/* Map & Metadata Column */}
            <div className="space-y-6">

              {/* METADATA SECTION */}
              <div className="bg-race-panel border border-gray-800 rounded-lg p-6 space-y-6">
                <div>
                  <h3 className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-4 border-b border-gray-800 pb-2">Session Info</h3>
                  <div className="space-y-4">
                    {/* Reference Details */}
                    <div className="pl-3 border-l-2" style={{ borderColor: refColor }}>
                      <div className="text-[10px] uppercase font-bold mb-0.5" style={{ color: refColor }}>Reference</div>
                      <div className="text-white font-mono text-sm truncate" title={refSession || ''}>
                        {refSession || '-'}
                      </div>
                      <div className="flex justify-between items-baseline mt-1">
                        <span className="text-xl font-bold font-mono">Lap {refLap}</span>
                      </div>
                    </div>

                    {/* Comparison Details */}
                    <div className="pl-3 border-l-2" style={{ borderColor: compColor }}>
                      <div className="text-[10px] uppercase font-bold mb-0.5" style={{ color: compColor }}>Comparison</div>
                      <div className="text-white font-mono text-sm truncate" title={compSession || ''}>
                        {compSession || '-'}
                      </div>
                      <div className="flex justify-between items-baseline mt-1">
                        <span className="text-xl font-bold font-mono">Lap {compLap}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 border-t border-gray-800 pt-4">
                  <div>
                    <div className="text-xs uppercase text-gray-500 font-bold mb-1">Points</div>
                    <div className="text-2xl text-gray-300 font-mono font-bold">{comparisonData.length}</div>
                  </div>
                  <div>
                    <div className="text-xs uppercase text-gray-500 font-bold mb-1">Res</div>
                    <div className="text-2xl text-telemetry-blue font-mono font-bold">{resolution}</div>
                  </div>
                </div>
              </div>

              <div className="bg-race-panel border border-gray-800 rounded-lg p-4 relative min-h-[400px]">
                <TrackMap
                  data={refTelemetry || []}
                  height={400}
                  color="#ffffff"
                  hoverDistance={hoverDistance}
                  targetPoints={resolution}
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