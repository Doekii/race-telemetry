'use client';

import { useState, useEffect, useMemo } from 'react';
import { useSessions, useLaps, useLapTelemetry } from '@/hooks/useTelemetry';
import SessionSelector from '@/components/SessionSelector';
import LapSelector from '@/components/LapSelector';
import D3LineChart from '@/components/D3LineChart';
import TrackMap from '@/components/TrackMap';
import { Settings2, ArrowRightLeft, ZoomOut } from 'lucide-react';
import Link from 'next/link';
import * as d3 from 'd3';
import { ZoomSynchronizer } from '@/utils/zoom';

export default function DashboardPage() {
  const [selectedSession, setSelectedSession] = useState<string | null>(null);
  const [selectedLap, setSelectedLap] = useState<number | null>(null);
  const [hoveredDistance, setHoveredDistance] = useState<number | null>(null);
  const [resolution, setResolution] = useState<number>(4000);

  const { data: sessionData, isLoading: sessionsLoading, isError: sessionsError } = useSessions();
  const { data: lapData, isLoading: lapsLoading } = useLaps(selectedSession);

  const {
    data: telemetryData,
    isLoading: telemetryLoading,
    isError: telemetryError,
    error: telemetryErrorObj
  } = useLapTelemetry(selectedSession, selectedLap);

  useEffect(() => {
    if (selectedLap !== null && telemetryError) {
      console.error(telemetryErrorObj);
    }
  }, [telemetryError, selectedLap, telemetryErrorObj]);

  useEffect(() => {
    setSelectedLap(null);
    setHoveredDistance(null);
  }, [selectedSession]);

  const zoomSync = useMemo(() => new ZoomSynchronizer(), []);

  const xDomain: [number, number] | undefined = useMemo(() => {
    if (!telemetryData || telemetryData.length === 0) return undefined;
    const maxDist = d3.max(telemetryData, d => d.distance) || 5000;
    return [0, maxDist];
  }, [telemetryData]);

  useEffect(() => { zoomSync.reset(); }, [selectedSession, selectedLap, zoomSync]);

  return (
    <main className="min-h-screen bg-race-dark text-white p-6 md:p-8 font-sans selection:bg-telemetry-blue/30">

      {/* Header & Controls */}
      <header className="mb-8 space-y-6">
        <div className="flex flex-col xl:flex-row justify-between items-start xl:items-end gap-6 border-b border-gray-800/60 pb-6">

          {/* Logo & Title */}
          <div className="flex-shrink-0">
            <div className="flex items-center gap-3 mb-1">
              <div className="w-2 h-8 bg-gradient-to-b from-telemetry-blue to-purple-600 rounded-full" />
              <h1 className="text-3xl font-bold tracking-tight text-white">
                Telemetry<span className="text-transparent bg-clip-text bg-gradient-to-r from-telemetry-blue to-purple-500">Hub</span>
              </h1>
            </div>
            <p className="text-gray-400 text-sm font-medium tracking-wide">Professional Race Analysis Dashboard</p>
          </div>

          {/* Action Area */}
          <div className="flex flex-col xl:flex-row gap-6 w-full xl:w-auto items-end xl:items-center">

            {/* Toolbar */}
            <div className="flex items-center gap-3 bg-gray-900/40 p-1.5 rounded-xl border border-gray-800/60 backdrop-blur-sm">
              <Link
                href="/compare"
                className="flex items-center gap-2 px-4 py-2.5 bg-gray-800 hover:bg-gray-700 hover:text-white text-gray-300 rounded-lg border border-gray-700/50 transition-all text-xs font-bold uppercase tracking-wider shadow-sm"
              >
                <ArrowRightLeft className="w-3.5 h-3.5" />
                Compare Laps
              </Link>

              <div className="w-px h-8 bg-gray-800 mx-1" />

              <button
                onClick={() => zoomSync.reset()}
                className="flex items-center gap-2 px-4 py-2.5 bg-gray-800/50 hover:bg-gray-700 text-gray-400 hover:text-white rounded-lg border border-transparent hover:border-gray-700 transition-all text-xs font-bold uppercase tracking-wider"
              >
                <ZoomOut className="w-3.5 h-3.5" />
                Reset Zoom
              </button>
            </div>

            {/* Resolution Slider */}
            <div className="hidden md:flex flex-col items-end mr-2 group">
              <div className="flex items-center gap-2 text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5 opacity-70 group-hover:opacity-100 transition-opacity">
                <Settings2 className="w-3 h-3" />
                Data Resolution
              </div>
              <div className="flex items-center gap-3 bg-gray-900/30 px-3 py-1.5 rounded-lg border border-gray-800/30">
                <input
                  type="range" min={100} max={telemetryData?.length || 20000} step={100}
                  value={resolution} onChange={(e) => setResolution(Number(e.target.value))}
                  disabled={!telemetryData}
                  className="w-32 h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-telemetry-blue hover:accent-purple-500 transition-colors"
                />
                <span className="text-xs text-gray-400 font-mono w-14 text-right">{resolution} pts</span>
              </div>
            </div>

          </div>
        </div>

        {/* Selection Row */}
        <div className="flex flex-col md:flex-row gap-4 w-full">
          <div className="flex-grow max-w-2xl">
            <SessionSelector
              sessions={sessionData?.files || []} isLoading={sessionsLoading} isError={sessionsError}
              selected={selectedSession} onSelect={setSelectedSession}
            />
          </div>
          <div className="w-full md:w-auto min-w-[180px]">
            <LapSelector
              laps={lapData || []} selected={selectedLap} onSelect={setSelectedLap}
              isLoading={lapsLoading} disabled={!selectedSession}
            />
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="space-y-6 animate-in fade-in duration-500 slide-in-from-bottom-4">

        {telemetryError && (
          <div className="bg-red-950/20 border border-red-900/50 rounded-xl p-6 text-center text-red-400 backdrop-blur-sm shadow-xl">
            <p className="font-semibold mb-1">Unable to load telemetry</p>
            <p className="text-sm opacity-70">{(telemetryErrorObj as Error)?.message}</p>
          </div>
        )}

        {(!selectedSession || (!selectedLap && selectedLap !== 0)) && (
          <div className="bg-race-panel/50 border border-gray-800/50 border-dashed rounded-xl min-h-[400px] flex flex-col items-center justify-center gap-4 text-gray-500">
            <div className="p-4 bg-gray-900/50 rounded-full border border-gray-800">
              <Settings2 className="w-8 h-8 opacity-50" />
            </div>
            <div className="text-sm font-medium tracking-wide">Select a race session and lap to begin analysis</div>
          </div>
        )}

        {telemetryData && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* Left Column: Charts */}
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-race-panel p-6 rounded-xl border border-gray-800 shadow-xl shadow-black/20">
                <D3LineChart
                  title="Speed Trace (km/h)" data={telemetryData} dataKey="speed" color="#3b82f6"
                  height={300} hoverDistance={hoveredDistance} onHover={setHoveredDistance}
                  targetPoints={resolution} zoomSync={zoomSync} xDomain={xDomain}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-race-panel p-5 rounded-xl border border-gray-800 shadow-lg">
                  <D3LineChart
                    title="Engine RPM" data={telemetryData} dataKey="rpm" color="#ef4444"
                    height={180} hoverDistance={hoveredDistance} onHover={setHoveredDistance}
                    targetPoints={resolution} zoomSync={zoomSync} xDomain={xDomain}
                  />
                </div>
                <div className="bg-race-panel p-5 rounded-xl border border-gray-800 shadow-lg">
                  <D3LineChart
                    title="Throttle (%)" data={telemetryData} dataKey="throttle" color="#22c55e"
                    height={180} hoverDistance={hoveredDistance} onHover={setHoveredDistance}
                    targetPoints={resolution} zoomSync={zoomSync} xDomain={xDomain}
                  />
                </div>
              </div>
            </div>

            {/* Right Column: Info & Map */}
            <div className="space-y-6">
              <div className="bg-gradient-to-br from-gray-900 to-gray-950 border border-gray-800 rounded-xl p-6 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-telemetry-blue/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />

                <div className="text-[10px] uppercase text-gray-400 font-bold mb-2 tracking-widest">Active Session</div>
                <div className="text-white font-mono text-sm break-all leading-relaxed opacity-90 mb-6 border-l-2 border-telemetry-blue pl-3 py-1">
                  {selectedSession}
                </div>

                <div className="flex items-center justify-between border-t border-gray-800/50 pt-4 mt-2">
                  <span className="text-xs text-gray-500 uppercase font-bold tracking-wider">Current Lap</span>
                  <span className="text-4xl text-white font-mono font-bold tracking-tighter shadow-telemetry-glow">
                    #{selectedLap}
                  </span>
                </div>
              </div>

              <div className="bg-race-panel border border-gray-800 rounded-xl p-4 relative min-h-[300px] flex items-center justify-center shadow-lg">
                <TrackMap
                  data={telemetryData} color="#ffffff" height={300}
                  hoverDistance={hoveredDistance} targetPoints={resolution}
                  onHover={(point) => setHoveredDistance(point ? point.distance : null)}
                />
              </div>

              <div className="bg-race-panel border border-gray-800 rounded-xl p-4 shadow-lg">
                <D3LineChart
                  title="Track Edge (m)" data={telemetryData} dataKey="trackEdge" color="#f59e0b"
                  height={150} hoverDistance={hoveredDistance} onHover={setHoveredDistance}
                  targetPoints={resolution} zoomSync={zoomSync} xDomain={xDomain}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}