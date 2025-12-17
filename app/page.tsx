'use client';

import { useState, useEffect, useMemo } from 'react';
import { useSessions, useLaps, useLapTelemetry } from '@/hooks/useTelemetry';
import SessionSelector from '@/components/SessionSelector';
import LapSelector from '@/components/LapSelector';
import D3LineChart from '@/components/D3LineChart';
import TrackMap from '@/components/TrackMap';
import { Settings2 } from 'lucide-react'; // Icon for resolution

export default function DashboardPage() {
  const [selectedSession, setSelectedSession] = useState<string | null>(null);
  const [selectedLap, setSelectedLap] = useState<number | null>(null);
  const [hoveredDistance, setHoveredDistance] = useState<number | null>(null);
  const [resolution, setResolution] = useState<number>(4000); // Global Resolution State

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
    let closest = telemetryData[0];
    let minDiff = Math.abs(closest.distance - hoveredDistance);
    for (let i = 1; i < telemetryData.length; i++) {
      const diff = Math.abs(telemetryData[i].distance - hoveredDistance);
      if (diff < minDiff) {
        minDiff = diff;
        closest = telemetryData[i];
      }
    }
    return closest;
  }, [telemetryData, hoveredDistance]);

  return (
    <main className="min-h-screen bg-race-dark text-white p-8">
      {/* Header & Controls */}
      <header className="border-b border-gray-800 pb-6 mb-8">
        <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Telemetry<span className="text-telemetry-blue">Hub</span></h1>
            <p className="text-gray-400 text-sm mt-1">Race Analysis Dashboard</p>
          </div>

          <div className="flex flex-col md:flex-row gap-6 w-full xl:w-auto items-end md:items-center">
            {/* Resolution Control */}
            <div className="flex flex-col items-end mr-4">
              <label className="flex items-center gap-2 text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                <Settings2 className="w-3 h-3" />
                Resolution:
              </label>
              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-600 font-mono">100</span>
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

                {/* Manual Number Input */}
                <input
                  type="number"
                  min={100}
                  max={telemetryData?.length || 20000}
                  value={resolution}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    if (!isNaN(val)) setResolution(val);
                  }}
                  disabled={!telemetryData}
                  className="w-20 bg-gray-800 text-white text-sm font-mono py-1 px-2 rounded border border-gray-700 focus:border-telemetry-blue focus:outline-none text-right disabled:opacity-50"
                />

                <span className="text-xs text-gray-600 font-mono">pts</span>
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

      {/* Main Content Area */}
      <div className="space-y-6">

        {telemetryError && (
          <div className="bg-red-900/20 border border-red-800 rounded-xl p-6 text-center text-red-200">
            <p className="font-bold">Error Loading Telemetry</p>
            <p className="text-sm mt-2 opacity-80">
              {(telemetryErrorObj as Error)?.message || "Unknown error occurred"}
            </p>
          </div>
        )}

        {(!selectedSession || (!selectedLap && selectedLap !== 0)) && (
          <div className="bg-race-panel border border-gray-800 rounded-xl min-h-[400px] flex items-center justify-center">
            <div className="text-center text-gray-500">
              <p className="text-lg">
                {!selectedSession ? "No session selected" : "Session Loaded"}
              </p>
              <p className="text-sm">
                {!selectedSession ? "Select a race file to view available laps." : "Please select a lap to analyze telemetry."}
              </p>
            </div>
          </div>
        )}

        {selectedSession && (selectedLap || selectedLap === 0) && telemetryLoading && (
          <div className="bg-race-panel border border-gray-800 rounded-xl min-h-[400px] flex items-center justify-center">
            <div className="flex items-center text-telemetry-blue">
              <div className="animate-spin mr-3 h-5 w-5 border-2 border-current border-t-transparent rounded-full" />
              Loading Trace Data...
            </div>
          </div>
        )}

        {telemetryData && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            <div className="lg:col-span-2 space-y-6">
              <div className="bg-race-panel p-6 rounded-lg border border-gray-800">
                <D3LineChart
                  title={activePoint
                    ? `Speed: ${activePoint.speed.toFixed(0)} km/h`
                    : "Speed Trace (km/h)"}
                  data={telemetryData}
                  dataKey="speed"
                  color="#3b82f6"
                  height={300}
                  hoverDistance={hoveredDistance}
                  onHover={setHoveredDistance}
                  targetPoints={resolution} // Pass Global Resolution
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-race-panel p-6 rounded-lg border border-gray-800">
                  <D3LineChart
                    title={activePoint
                      ? `RPM: ${activePoint.rpm.toFixed(0)}`
                      : "Engine RPM"}
                    data={telemetryData}
                    dataKey="rpm"
                    color="#ef4444"
                    height={200}
                    hoverDistance={hoveredDistance}
                    onHover={setHoveredDistance}
                    targetPoints={resolution} // Pass Global Resolution
                  />
                </div>
                <div className="bg-race-panel p-6 rounded-lg border border-gray-800">
                  <D3LineChart
                    title={activePoint
                      ? `Throttle: ${activePoint.throttle.toFixed(0)}%`
                      : "Throttle (%)"}
                    data={telemetryData}
                    dataKey="throttle"
                    color="#22c55e"
                    height={200}
                    hoverDistance={hoveredDistance}
                    onHover={setHoveredDistance}
                    targetPoints={resolution} // Pass Global Resolution
                  />
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="bg-race-panel border border-gray-800 rounded-lg p-6 flex flex-col justify-center space-y-6">
                <div>
                  <div className="text-xs uppercase text-gray-500 font-bold mb-1">Session</div>
                  <div className="text-green-400 font-mono text-sm break-all">{selectedSession}</div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-xs uppercase text-gray-500 font-bold mb-1">Lap</div>
                    <div className="text-3xl text-white font-mono font-bold">#{selectedLap}</div>
                  </div>
                  <div>
                    <div className="text-xs uppercase text-gray-500 font-bold mb-1">Points</div>
                    <div className="text-3xl text-gray-300 font-mono font-bold">{telemetryData.length}</div>
                  </div>
                </div>
              </div>

              <div className="bg-race-panel border border-gray-800 rounded-lg p-4 relative min-h-[500px] flex items-center justify-center">
                <div className="absolute top-4 left-4 text-xs uppercase text-gray-400 font-bold z-10">GPS Track Map</div>
                <TrackMap
                  data={telemetryData}
                  color="#ffffff"
                  height={500}
                  hoverDistance={hoveredDistance}
                  onHover={(point) => setHoveredDistance(point ? point.distance : null)}
                  targetPoints={resolution} // Pass Global Resolution
                />
              </div>
            </div>

          </div>
        )}
      </div>
    </main>
  );
}