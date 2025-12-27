'use client';

import { useState, useEffect } from 'react';
import SessionSelector from '@/components/SessionSelector';
import LapSelector from '@/components/LapSelector';
import TrackMap from '@/components/TrackMap';
import DeltaLineChart from '@/components/DeltaLineChart';
import { useComparison } from '@/hooks/useComparison';
import { useSessions, useLaps } from '@/hooks/useTelemetry';
import { Settings2, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function ComparePage() {
  // --- State: Selection ---
  const [refSession, setRefSession] = useState<string | null>(null);
  const [refLap, setRefLap] = useState<number | null>(null);
  const [refColor, setRefColor] = useState<string>("#06b6d4"); // Default Cyan

  const [compSession, setCompSession] = useState<string | null>(null);
  const [compLap, setCompLap] = useState<number | null>(null);
  const [compColor, setCompColor] = useState<string>("#f43f5e"); // Default Rose

  // --- State: Interaction ---
  const [hoverDistance, setHoverDistance] = useState<number | null>(null);
  const [resolution, setResolution] = useState<number>(4000); 

  // --- Data Fetching ---
  const { data: sessionData, isLoading: sessionsLoading, isError: sessionsError } = useSessions();
  const { data: refLapData, isLoading: refLapsLoading } = useLaps(refSession);
  const { data: compLapData, isLoading: compLapsLoading } = useLaps(compSession);

  const { refTelemetry, comparisonData, isLoading: comparisonLoading } = useComparison({
    refSession, refLap, compSession, compLap
  });

  // --- Effects ---
  useEffect(() => { setRefLap(null); }, [refSession]);
  useEffect(() => { setCompLap(null); }, [compSession]);

  return (
    <main className="min-h-screen bg-race-dark text-white p-8">
      <header className="border-b border-gray-800 pb-6 mb-8">
        <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6">
            {/* Title & Back Button */}
            <div className="flex items-center gap-4">
                <Link 
                    href="/" 
                    className="p-2 bg-gray-800 hover:bg-gray-700 rounded-lg border border-gray-700 transition-colors"
                    title="Back to Single Analysis"
                >
                    <ArrowLeft className="w-5 h-5 text-gray-300" />
                </Link>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Telemetry<span className="text-telemetry-blue">Hub</span></h1>
                    <p className="text-gray-400 text-sm mt-1">Lap Comparison Analysis</p>
                </div>
            </div>

            {/* Controls */}
            <div className="flex flex-col gap-4 w-full xl:w-auto items-end">
                {/* Resolution Control */}
                <div className="flex flex-col items-end mr-1">
                    <label className="flex items-center gap-2 text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                        <Settings2 className="w-3 h-3" />
                        Resolution:
                    </label>
                    <div className="flex items-center gap-3">
                        <input
                            type="range"
                            min={100}
                            max={20000}
                            step={100}
                            value={resolution}
                            onChange={(e) => setResolution(Number(e.target.value))}
                            className="w-32 md:w-48 h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-telemetry-blue"
                        />
                        <span className="text-xs text-gray-600 font-mono w-16 text-right">{resolution} pts</span>
                    </div>
                </div>

                {/* Selectors Row */}
                <div className="flex flex-col md:flex-row gap-4">
                    {/* Reference Group */}
                    <div className="flex gap-2 p-1.5 rounded-lg bg-gray-900/50 border border-cyan-900/30">
                        <div className="px-2 flex flex-col items-center justify-center min-w-[3rem] border-r border-gray-700/50 gap-1">
                             <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: refColor }}>REF</span>
                             <input 
                                type="color" 
                                value={refColor}
                                onChange={(e) => setRefColor(e.target.value)}
                                className="w-5 h-5 bg-transparent border-none cursor-pointer p-0"
                                title="Change Reference Color"
                             />
                        </div>
                        <SessionSelector 
                            sessions={sessionData?.files || []}
                            isLoading={sessionsLoading}
                            isError={sessionsError}
                            selected={refSession} 
                            onSelect={setRefSession} 
                        />
                        <LapSelector 
                            laps={refLapData || []}
                            selected={refLap} 
                            onSelect={setRefLap}
                            isLoading={refLapsLoading}
                            disabled={!refSession}
                        />
                    </div>

                    {/* Comparison Group */}
                    <div className="flex gap-2 p-1.5 rounded-lg bg-gray-900/50 border border-rose-900/30">
                         <div className="px-2 flex flex-col items-center justify-center min-w-[3rem] border-r border-gray-700/50 gap-1">
                             <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: compColor }}>COMP</span>
                             <input 
                                type="color" 
                                value={compColor}
                                onChange={(e) => setCompColor(e.target.value)}
                                className="w-5 h-5 bg-transparent border-none cursor-pointer p-0"
                                title="Change Comparison Color"
                             />
                        </div>
                        <SessionSelector 
                            sessions={sessionData?.files || []}
                            isLoading={sessionsLoading}
                            isError={sessionsError}
                            selected={compSession} 
                            onSelect={setCompSession} 
                        />
                        <LapSelector 
                            laps={compLapData || []}
                            selected={compLap} 
                            onSelect={setCompLap}
                            isLoading={compLapsLoading}
                            disabled={!compSession}
                        />
                    </div>
                </div>
            </div>
        </div>
      </header>

      <div className="space-y-6">
        
        {/* Empty State */}
        {!comparisonData && (
          <div className="bg-race-panel border border-gray-800 rounded-xl min-h-[400px] flex items-center justify-center">
             <div className="text-center text-gray-500">
              <p className="text-lg">
                {comparisonLoading ? "Calculating Delta..." : "Comparison Ready"}
              </p>
              <p className="text-sm">
                {comparisonLoading 
                    ? "Processing telemetry streams..." 
                    : "Select both a Reference and Comparison lap to begin."}
              </p>
            </div>
          </div>
        )}

        {/* Main Content */}
        {comparisonData && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Left Column: Charts */}
            <div className="lg:col-span-2 space-y-6">
              
              {/* 1. Time Delta (Main Comparison Metric) */}
              <div className="bg-race-panel p-6 rounded-lg border border-gray-800">
                <DeltaLineChart 
                    data={comparisonData}
                    dataKeyRef="time_delta"
                    label="Time Delta (Ref vs Comp)"
                    unit="s"
                    height={250}
                    hoverDistance={hoverDistance}
                    onHover={setHoverDistance}
                    isDelta={true}
                    targetPoints={resolution}
                    colorRef={refColor}
                    colorComp={compColor}
                />
              </div>

              {/* 2. Speed Comparison */}
              <div className="bg-race-panel p-6 rounded-lg border border-gray-800">
                <DeltaLineChart 
                    data={comparisonData}
                    dataKeyRef="Ground Speed_Ref"
                    dataKeyComp="Ground Speed_Comp"
                    label="Speed Trace"
                    unit="km/h"
                    height={200}
                    hoverDistance={hoverDistance}
                    onHover={setHoverDistance}
                    targetPoints={resolution}
                    colorRef={refColor}
                    colorComp={compColor}
                />
              </div>

              {/* 3. Small Charts Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                <div className="bg-race-panel p-6 rounded-lg border border-gray-800">
                    <DeltaLineChart 
                        data={comparisonData}
                        dataKeyRef="Brake Pos_Ref"
                        dataKeyComp="Brake Pos_Comp"
                        label="Brake"
                        unit="bar/%"
                        height={150}
                        hoverDistance={hoverDistance}
                        onHover={setHoverDistance}
                        targetPoints={resolution}
                        colorRef={refColor}
                        colorComp={compColor}
                    />
                </div>
              </div>

              {/* 4. RPM */}
              <div className="bg-race-panel p-6 rounded-lg border border-gray-800">
                <DeltaLineChart 
                    data={comparisonData}
                    dataKeyRef="Engine RPM_Ref" 
                    dataKeyComp="Engine RPM_Comp"
                    label="Engine RPM"
                    unit="rpm"
                    height={150}
                    hoverDistance={hoverDistance}
                    onHover={setHoverDistance}
                    targetPoints={resolution}
                    colorRef={refColor}
                    colorComp={compColor}
                />
              </div>
            </div>

            {/* Right Column: Info & Map */}
            <div className="space-y-6">
              
              {/* Info Card */}
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

              {/* Track Map */}
              <div className="bg-race-panel border border-gray-800 rounded-lg p-4 relative min-h-[400px] flex items-center justify-center">
                <div className="absolute top-4 left-4 text-xs uppercase text-gray-400 font-bold z-10">GPS Track Map (Ref)</div>
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