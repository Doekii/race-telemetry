'use client';

import { useState, useEffect, useMemo } from 'react';
import SessionSelector from '@/components/SessionSelector';
import LapSelector from '@/components/LapSelector';
import TrackMap from '@/components/TrackMap';
import DeltaLineChart from '@/components/DeltaLineChart';
import TyreWearAnalysis from '@/components/analysis/TyreWearAnalysis';
import { useComparison } from '@/hooks/useComparison';
import { useSessions, useLaps } from '@/hooks/useTelemetry';
import { Settings2, ArrowLeft, ZoomOut, ArrowRightLeft } from 'lucide-react';
import Link from 'next/link';
import * as d3 from 'd3';
import { ZoomSynchronizer } from '@/utils/zoom';

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

  const tyreChannelRef = 'Tyres Wear_Ref';
  const tyreChannelComp = 'Tyres Wear_Comp';

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

        {/* Top Bar: Nav & Global Settings */}
        <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6 border-b border-gray-800/60 pb-6">
          <div className="flex items-center gap-4">
            <Link href="/" className="p-2.5 bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white rounded-xl border border-gray-700/50 hover:border-gray-600 transition-all shadow-sm group">
              <ArrowLeft className="w-5 h-5 group-hover:-translate-x-0.5 transition-transform" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                Compare Analysis
              </h1>
              <p className="text-gray-400 text-xs font-medium tracking-wide mt-0.5">Reference vs Comparison Overlay</p>
            </div>
          </div>

          <div className="flex items-center gap-4 bg-gray-900/40 p-1.5 rounded-xl border border-gray-800/60 backdrop-blur-sm">
            <button
              onClick={() => zoomSync.reset()}
              className="flex items-center gap-2 px-4 py-2 bg-gray-800/50 hover:bg-gray-700 text-gray-400 hover:text-white rounded-lg border border-transparent hover:border-gray-700 transition-all text-xs font-bold uppercase tracking-wider"
            >
              <ZoomOut className="w-3.5 h-3.5" />
              Reset Zoom
            </button>

            <div className="w-px h-6 bg-gray-800" />

            <div className="flex items-center gap-3 px-2">
              <input type="range" min={100} max={20000} step={100} value={resolution} onChange={e => setResolution(Number(e.target.value))} className="w-24 h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-telemetry-blue" />
              <span className="text-xs font-mono text-gray-400 w-12">{resolution} pts</span>
            </div>
          </div>
        </div>

        {/* Selection Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Reference Card */}
          <div className="bg-gray-900/40 rounded-2xl p-4 border border-y border-r border-gray-800 border-l-4 border-l-cyan-500/50 flex flex-col gap-4 relative">

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-cyan-500/10 flex items-center justify-center text-cyan-400 border border-cyan-500/20 shadow-[0_0_15px_rgba(6,182,212,0.1)]">
                  <span className="font-bold text-xs">REF</span>
                </div>
                <span className="text-sm font-medium text-gray-300">Reference Lap</span>
              </div>
              <input type="color" value={refColor} onChange={e => setRefColor(e.target.value)} className="w-6 h-6 bg-transparent border-none cursor-pointer rounded overflow-hidden" title="Change Color" />
            </div>

            <div className="flex flex-col md:flex-row gap-3">
              <div className="flex-grow z-20">
                <SessionSelector sessions={sessionData?.files || []} selected={refSession} onSelect={setRefSession} isLoading={sessionsLoading} isError={sessionsError} />
              </div>
              <div className="md:w-40 flex-shrink-0 z-10">
                <LapSelector laps={refLapData || []} selected={refLap} onSelect={setRefLap} isLoading={refLapsLoading} disabled={!refSession} />
              </div>
            </div>
          </div>

          {/* Comparison Card */}
          <div className="bg-gray-900/40 rounded-2xl p-4 border border-y border-r border-gray-800 border-l-4 border-l-rose-500/50 flex flex-col gap-4 relative">

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-rose-500/10 flex items-center justify-center text-rose-400 border border-rose-500/20 shadow-[0_0_15px_rgba(244,63,94,0.1)]">
                  <span className="font-bold text-xs">CMP</span>
                </div>
                <span className="text-sm font-medium text-gray-300">Comparison Lap</span>
              </div>
              <input type="color" value={compColor} onChange={e => setCompColor(e.target.value)} className="w-6 h-6 bg-transparent border-none cursor-pointer rounded overflow-hidden" title="Change Color" />
            </div>

            <div className="flex flex-col md:flex-row gap-3">
              <div className="flex-grow z-20">
                <SessionSelector sessions={sessionData?.files || []} selected={compSession} onSelect={setCompSession} isLoading={sessionsLoading} isError={sessionsError} />
              </div>
              <div className="md:w-40 flex-shrink-0 z-10">
                <LapSelector laps={compLapData || []} selected={compLap} onSelect={setCompLap} isLoading={compLapsLoading} disabled={!compSession} />
              </div>
            </div>
          </div>
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
            <div className="lg:col-span-2 space-y-6">

              {/* Primary Deltas */}
              <div className="bg-race-panel p-6 rounded-xl border border-gray-800 shadow-xl shadow-black/20">
                <DeltaLineChart
                  data={comparisonData} dataKeyRef="time_delta" label="Time Delta" unit="s"
                  height={220} hoverDistance={hoverDistance} onHover={setHoverDistance} isDelta={true}
                  targetPoints={resolution} colorRef={refColor} colorComp={compColor}
                  zoomSync={zoomSync} xDomain={xDomain}
                />
              </div>

              <div className="bg-race-panel p-6 rounded-xl border border-gray-800 shadow-lg">
                <DeltaLineChart
                  data={comparisonData} dataKeyRef="Ground Speed_Ref" dataKeyComp="Ground Speed_Comp" label="Speed" unit="km/h"
                  height={200} hoverDistance={hoverDistance} onHover={setHoverDistance}
                  targetPoints={resolution} colorRef={refColor} colorComp={compColor}
                  zoomSync={zoomSync} xDomain={xDomain}
                />
              </div>

              {/* Driver Inputs Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-race-panel p-5 rounded-lg border border-gray-800 shadow-md hover:border-gray-700 transition-colors">
                  <DeltaLineChart
                    data={comparisonData} dataKeyRef="Throttle Pos_Ref" dataKeyComp="Throttle Pos_Comp" label="Throttle" unit="%"
                    height={120} hoverDistance={hoverDistance} onHover={setHoverDistance}
                    targetPoints={resolution} colorRef={refColor} colorComp={compColor}
                    zoomSync={zoomSync} xDomain={xDomain}
                  />
                </div>
                <div className="bg-race-panel p-5 rounded-lg border border-gray-800 shadow-md hover:border-gray-700 transition-colors">
                  <DeltaLineChart
                    data={comparisonData} dataKeyRef="Brake Pos_Ref" dataKeyComp="Brake Pos_Comp" label="Brake" unit="%"
                    height={120} hoverDistance={hoverDistance} onHover={setHoverDistance}
                    targetPoints={resolution} colorRef={refColor} colorComp={compColor}
                    zoomSync={zoomSync} xDomain={xDomain}
                  />
                </div>
                <div className="bg-race-panel p-5 rounded-lg border border-gray-800 md:col-span-2 shadow-md hover:border-gray-700 transition-colors">
                  <DeltaLineChart
                    data={comparisonData} dataKeyRef="Steering Pos_Ref" dataKeyComp="Steering Pos_Comp" label="Steering" unit="rad"
                    height={150} hoverDistance={hoverDistance} onHover={setHoverDistance}
                    targetPoints={resolution} colorRef={refColor} colorComp={compColor}
                    zoomSync={zoomSync} xDomain={xDomain}
                  />
                </div>
              </div>

              {/* Secondary Telemetry */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  { keyRef: 'Gear_Ref', keyComp: 'Gear_Comp', label: 'Gear', unit: '#' },
                  { keyRef: 'Fuel Level_Ref', keyComp: 'Fuel Level_Comp', label: 'Fuel', unit: 'L' },
                  { keyRef: 'Virtual Energy_Ref', keyComp: 'Virtual Energy_Comp', label: 'Energy', unit: 'J' }
                ].map((chart, i) => (
                  <div key={i} className="bg-race-panel p-4 rounded-lg border border-gray-800 hover:border-gray-700 transition-colors">
                    <DeltaLineChart
                      data={comparisonData} dataKeyRef={chart.keyRef} dataKeyComp={chart.keyComp} label={chart.label} unit={chart.unit}
                      height={100} hoverDistance={hoverDistance} onHover={setHoverDistance}
                      targetPoints={resolution} colorRef={refColor} colorComp={compColor}
                      zoomSync={zoomSync} xDomain={xDomain}
                    />
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-race-panel p-4 rounded-lg border border-gray-800">
                  <DeltaLineChart
                    data={comparisonData} dataKeyRef="TC_Ref" dataKeyComp="TC_Comp" label="TC Active" unit="bool"
                    height={80} hoverDistance={hoverDistance} onHover={setHoverDistance}
                    targetPoints={resolution} colorRef={refColor} colorComp={compColor}
                    zoomSync={zoomSync} xDomain={xDomain}
                  />
                </div>
                <div className="bg-race-panel p-4 rounded-lg border border-gray-800">
                  <DeltaLineChart
                    data={comparisonData} dataKeyRef="ABS_Ref" dataKeyComp="ABS_Comp" label="ABS Active" unit="bool"
                    height={80} hoverDistance={hoverDistance} onHover={setHoverDistance}
                    targetPoints={resolution} colorRef={refColor} colorComp={compColor}
                    zoomSync={zoomSync} xDomain={xDomain}
                  />
                </div>
              </div>

              <TyreWearAnalysis
                hoverDistance={hoverDistance} onHover={setHoverDistance}
                data={comparisonData} channelRef={tyreChannelRef} channelComp={tyreChannelComp}
                colors={{ main: refColor, comp: compColor }}
                zoomSync={zoomSync} xDomain={xDomain}
              />
            </div>

            {/* Side Panel: Info & Map */}
            <div className="space-y-6">
              {/* Session Info Card */}
              <div className="bg-gradient-to-br from-gray-900 to-gray-950 border border-gray-800 rounded-xl p-6 relative overflow-hidden group shadow-lg">
                <div className="absolute top-0 right-0 w-40 h-40 bg-purple-500/5 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />

                <h3 className="text-gray-400 text-[10px] font-bold uppercase tracking-widest mb-6 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-gray-500"></span> Session Manifest
                </h3>

                <div className="space-y-6">
                  <div className="relative pl-4 border-l-2 transition-colors duration-300" style={{ borderColor: refColor }}>
                    <div className="absolute -left-[5px] top-0 w-2 h-2 rounded-full ring-4 ring-gray-900" style={{ backgroundColor: refColor }} />
                    <div className="text-[10px] uppercase font-bold mb-1 opacity-70" style={{ color: refColor }}>Reference Session</div>
                    <div className="text-white font-mono text-xs break-all leading-relaxed opacity-90 mb-2">{refSession || 'Not selected'}</div>
                    {refLap && <div className="inline-block px-2 py-0.5 rounded bg-gray-800 text-xs font-mono font-bold border border-gray-700">Lap {refLap}</div>}
                  </div>

                  <div className="relative pl-4 border-l-2 transition-colors duration-300" style={{ borderColor: compColor }}>
                    <div className="absolute -left-[5px] top-0 w-2 h-2 rounded-full ring-4 ring-gray-900" style={{ backgroundColor: compColor }} />
                    <div className="text-[10px] uppercase font-bold mb-1 opacity-70" style={{ color: compColor }}>Comparison Session</div>
                    <div className="text-white font-mono text-xs break-all leading-relaxed opacity-90 mb-2">{compSession || 'Not selected'}</div>
                    {compLap && <div className="inline-block px-2 py-0.5 rounded bg-gray-800 text-xs font-mono font-bold border border-gray-700">Lap {compLap}</div>}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 border-t border-gray-800/50 pt-4 mt-6">
                  <div>
                    <div className="text-[10px] uppercase text-gray-500 font-bold mb-1">Data Points</div>
                    <div className="text-xl text-gray-300 font-mono font-bold">{comparisonData.length.toLocaleString()}</div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase text-gray-500 font-bold mb-1">Sample Rate</div>
                    <div className="text-xl text-telemetry-blue font-mono font-bold">{resolution}</div>
                  </div>
                </div>
              </div>

              <div className="bg-race-panel border border-gray-800 rounded-xl p-4 relative min-h-[400px] sticky top-4 shadow-lg">
                <TrackMap
                  data={refTelemetry || []} height={400} color="#ffffff" hoverDistance={hoverDistance} targetPoints={resolution}
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