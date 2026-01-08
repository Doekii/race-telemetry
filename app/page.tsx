'use client';

import { useState, useEffect, useMemo } from 'react';
import { useSessions, useLaps, useLapTelemetry } from '@/hooks/useTelemetry';
import TrackMap from '@/components/TrackMap';
import D3LineChart from '@/components/D3LineChart';
import { Settings2 } from 'lucide-react';
import * as d3 from 'd3';
import { ZoomSynchronizer } from '@/utils/zoom';

import DashboardHeader from '@/components/dashboard/DashboardHeader';
import DashboardSelection from '@/components/dashboard/DashboardSelection';
import DashboardCharts from '@/components/dashboard/DashboardCharts';
import DashboardActiveSession from '@/components/dashboard/DashboardActiveSession';

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
        <DashboardHeader
          zoomSync={zoomSync}
          resolution={resolution} setResolution={setResolution}
          maxResolution={telemetryData?.length || 20000} hasData={!!telemetryData}
        />

        <DashboardSelection
          sessions={sessionData?.files || []} sessionsLoading={sessionsLoading} sessionsError={sessionsError}
          selectedSession={selectedSession} setSelectedSession={setSelectedSession}
          laps={lapData || []} lapsLoading={lapsLoading}
          selectedLap={selectedLap} setSelectedLap={setSelectedLap}
        />
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

            <DashboardCharts
              telemetryData={telemetryData}
              hoveredDistance={hoveredDistance}
              setHoveredDistance={setHoveredDistance}
              resolution={resolution}
              zoomSync={zoomSync}
              xDomain={xDomain}
            />

            {/* Right Column: Info & Map */}
            <div className="space-y-6">
              <DashboardActiveSession sessionName={selectedSession} lapNumber={selectedLap} />

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