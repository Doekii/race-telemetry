'use client';

import { useState, useEffect, useMemo } from 'react';
import { useSessions, useLaps, useLapTelemetry } from '@/hooks/useTelemetry';
import SessionSelector from '@/components/SessionSelector';
import LapSelector from '@/components/LapSelector';
import D3LineChart from '@/components/D3LineChart';
import TrackMap from '@/components/TrackMap';
import { Settings2, ArrowRightLeft } from 'lucide-react';
import Link from 'next/link';

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
      console.error("Telemetry Error Details:", telemetryErrorObj);
    }
  }, [telemetryError, selectedLap, telemetryErrorObj]);

  useEffect(() => {
    setSelectedLap(null);
    setHoveredDistance(null);
  }, [selectedSession]);

  const activePoint = useMemo(() => {
    if (!telemetryData || telemetryData.length === 0 || hoveredDistance === null) return null;
    return telemetryData.find(p => Math.abs(p.distance - hoveredDistance) < 5);
  }, [telemetryData, hoveredDistance]);

  return (
    <main className="min-h-screen bg-race-dark text-white p-8">
      <header className="border-b border-gray-800 pb-6 mb-8">
        <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Telemetry<span className="text-telemetry-blue">Hub</span></h1>
            <p className="text-gray-400 text-sm mt-1">Race Analysis Dashboard</p>
          </div>

          <div className="flex flex-col md:flex-row gap-6 w-full xl:w-auto items-end md:items-center">

            <Link
              href="/compare"
              className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg border border-gray-700 transition-colors text-xs font-bold uppercase tracking-wider"
            >
              <ArrowRightLeft className="w-4 h-4" />
              Compare Laps
            </Link>

            <div className="h-8 w-px bg-gray-800 hidden md:block" />

            <div className="flex flex-col items-end mr-4">
              <label className="flex items-center gap-2 text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                <Settings2 className="w-3 h-3" />
                Resolution:
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min={100}
                  max={telemetryData?.length || 20000}
                  step={100}
                  value={resolution}
                  onChange={(e) => setResolution(Number(e.target.value))}
                  disabled={!telemetryData}
                  className="w-32 md:w-48 h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-telemetry-blue disabled:opacity-50"
                />
                <span className="text-xs text-gray-600 font-mono">{resolution} pts</span>
              </div>
            </div>

            <div className="flex gap-4 w-full md:w-auto">
              <SessionSelector
                sessions={sessionData?.files || []}
                isLoading={sessionsLoading}
                isError={sessionsError}
                selected={selectedSession}
                onSelect={setSelectedSession}
              />

              <LapSelector
                laps={lapData || []}
                selected={selectedLap}
                onSelect={setSelectedLap}
                isLoading={lapsLoading}
                disabled={!selectedSession}
              />
            </div>
          </div>
        </div>
      </header>

      <div className="space-y-6">

        {telemetryError && (
          <div className="bg-red-900/20 border border-red-800 rounded-xl p-6 text-center text-red-200">
            <p>Error: {(telemetryErrorObj as Error)?.message}</p>
          </div>
        )}

        {(!selectedSession || (!selectedLap && selectedLap !== 0)) && (
          <div className="bg-race-panel border border-gray-800 rounded-xl min-h-[400px] flex items-center justify-center">
            <div className="text-gray-500">Select Session & Lap</div>
          </div>
        )}

        {telemetryData && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* Left Column: Charts */}
            <div className="lg:col-span-2 space-y-6">

              <div className="bg-race-panel p-6 rounded-lg border border-gray-800">
                <D3LineChart
                  title="Speed Trace (km/h)"
                  data={telemetryData}
                  dataKey="speed"
                  color="#3b82f6"
                  height={300}
                  hoverDistance={hoveredDistance}
                  onHover={setHoveredDistance}
                  targetPoints={resolution}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-race-panel p-6 rounded-lg border border-gray-800">
                  <D3LineChart
                    title="Engine RPM"
                    data={telemetryData}
                    dataKey="rpm"
                    color="#ef4444"
                    height={200}
                    hoverDistance={hoveredDistance}
                    onHover={setHoveredDistance}
                    targetPoints={resolution}
                  />
                </div>
                <div className="bg-race-panel p-6 rounded-lg border border-gray-800">
                  <D3LineChart
                    title="Throttle (%)"
                    data={telemetryData}
                    dataKey="throttle"
                    color="#22c55e"
                    height={200}
                    hoverDistance={hoveredDistance}
                    onHover={setHoveredDistance}
                    targetPoints={resolution}
                  />
                </div>
              </div>
            </div>

            {/* Right Column: Info & Map */}
            <div className="space-y-6">
              <div className="bg-race-panel border border-gray-800 rounded-lg p-6">
                <div className="text-xs uppercase text-gray-500 font-bold mb-1">Session</div>
                <div className="text-green-400 font-mono text-sm break-all mb-4">{selectedSession}</div>
                <div className="text-3xl text-white font-mono font-bold">Lap #{selectedLap}</div>
              </div>

              <div className="bg-race-panel border border-gray-800 rounded-lg p-4 relative min-h-[300px] flex items-center justify-center">
                <TrackMap
                  data={telemetryData}
                  color="#ffffff"
                  height={300}
                  hoverDistance={hoveredDistance}
                  onHover={(point) => setHoveredDistance(point ? point.distance : null)}
                  targetPoints={resolution}
                />
              </div>

              <div className="bg-race-panel border border-gray-800 rounded-lg p-4">
                <D3LineChart
                  title="Track Edge (m)"
                  data={telemetryData}
                  dataKey="trackEdge"
                  color="#f59e0b"
                  height={150}
                  hoverDistance={hoveredDistance}
                  onHover={setHoveredDistance}
                  targetPoints={resolution}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}