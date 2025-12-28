'use client';

import { useEffect, useRef, useMemo, useState } from 'react';
import * as d3 from 'd3';

interface InputMapProps {
    data: any[];
    keys: { throttle: string, brake: string };
    keysComp?: { throttle: string, brake: string };
    height?: number;
}

export default function InputMap({ data, keys, keysComp, height = 120 }: InputMapProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [width, setWidth] = useState(0);

    useEffect(() => {
        if (!containerRef.current) return;
        const observer = new ResizeObserver(entries => setWidth(Math.floor(entries[0].contentRect.width)));
        observer.observe(containerRef.current);
        return () => observer.disconnect();
    }, []);

    const { segmentsMain, segmentsComp, xScale } = useMemo(() => {
        if (!width || !data.length) return { segmentsMain: [], segmentsComp: [], xScale: null };

        // Helper to determine state
        const getState = (t: number, b: number) => {
            if (b > 1) return 'brake';
            if (t > 95) return 'full';
            if (t > 5) return 'part';
            return 'coast'; // The deadly sin of racing
        };

        // Helper to compress continuous points into segments
        const process = (tKey: string, bKey: string) => {
            const segs: { start: number, end: number, state: string }[] = [];
            let currentStart = 0;
            let currentState = getState(data[0][tKey], data[0][bKey]);

            // Use 'dist' or 'Lap Dist'
            const getDist = (d: any) => d.dist ?? d['Lap Dist'] ?? 0;

            for (let i = 1; i < data.length; i++) {
                const nextState = getState(data[i][tKey], data[i][bKey]);
                if (nextState !== currentState) {
                    segs.push({ start: getDist(data[currentStart]), end: getDist(data[i - 1]), state: currentState });
                    currentState = nextState;
                    currentStart = i;
                }
            }
            segs.push({ start: getDist(data[currentStart]), end: getDist(data[data.length - 1]), state: currentState });
            return segs;
        };

        const segmentsMain = process(keys.throttle, keys.brake);
        const segmentsComp = keysComp ? process(keysComp.throttle, keysComp.brake) : [];

        const maxDist = data[data.length - 1].dist ?? data[data.length - 1]['Lap Dist'] ?? 0;
        const xScale = d3.scaleLinear().domain([0, maxDist]).range([0, width]);

        return { segmentsMain, segmentsComp, xScale };
    }, [width, data, keys, keysComp]);

    const getColor = (state: string) => {
        switch (state) {
            case 'full': return '#22c55e'; // Green
            case 'part': return '#84cc16'; // Lime
            case 'brake': return '#ef4444'; // Red
            case 'coast': return '#eab308'; // Yellow (Warning!)
            default: return '#333';
        }
    };

    return (
        <div className="bg-race-panel p-4 rounded-lg border border-gray-800">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-xs uppercase text-gray-500 font-bold">Input State Map</h3>
                <div className="flex gap-3 text-[10px] uppercase font-bold text-gray-400">
                    <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-green-500" />Full Gas</div>
                    <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-lime-500" />Feathering</div>
                    <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-yellow-500" />Coasting</div>
                    <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-red-500" />Braking</div>
                </div>
            </div>

            <div ref={containerRef} className="w-full relative flex flex-col gap-1" style={{ height }}>
                {xScale && (
                    <>
                        {/* Main Driver Label */}
                        <div className="absolute left-2 top-2 text-[10px] font-bold text-white z-10 drop-shadow-md">REF</div>
                        <svg width={width} height="45%">
                            {segmentsMain.map((s, i) => (
                                <rect
                                    key={i}
                                    x={xScale(s.start)}
                                    width={Math.max(1, xScale(s.end) - xScale(s.start))}
                                    height="100%"
                                    fill={getColor(s.state)}
                                />
                            ))}
                        </svg>

                        {/* Gap / Divider */}
                        <div className="h-[10%] w-full bg-transparent" />

                        {/* Comp Driver Label */}
                        {keysComp && (
                            <>
                                <div className="absolute left-2 bottom-2 text-[10px] font-bold text-white z-10 drop-shadow-md">COMP</div>
                                <svg width={width} height="45%">
                                    {segmentsComp.map((s, i) => (
                                        <rect
                                            key={i}
                                            x={xScale(s.start)}
                                            width={Math.max(1, xScale(s.end) - xScale(s.start))}
                                            height="100%"
                                            fill={getColor(s.state)}
                                        />
                                    ))}
                                </svg>
                            </>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}