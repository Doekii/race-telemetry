'use client';

import { useMemo } from 'react';
import * as d3 from 'd3';

interface CornerAnalysisProps {
    data: any[];
    keys: { speed: string, distance: string }; // e.g. Ground Speed_Ref
    keysComp?: { speed: string };
    colors: { main: string, comp?: string };
}

export default function CornerAnalysis({ data, keys, keysComp, colors }: CornerAnalysisProps) {

    const corners = useMemo(() => {
        if (!data.length) return [];

        // Algorithm: Find local minima in speed
        // Filter noise: Minimum must be < 150kmh (depends on car) and separated by distance
        // Simple sliding window

        const speed = data.map(d => Number(d[keys.speed]));
        const dist = data.map(d => Number(d[keys.distance]));
        const speedComp = keysComp ? data.map(d => Number(d[keysComp.speed])) : [];

        const localMinima: { idx: number, val: number }[] = [];
        const window = 20; // Check +/- 20 points

        for (let i = window; i < speed.length - window; i += 5) { // Skip 5 for speed
            let isMin = true;
            for (let j = 1; j <= window; j++) {
                if (speed[i - j] < speed[i] || speed[i + j] < speed[i]) {
                    isMin = false;
                    break;
                }
            }

            // Filter out tiny dips (e.g. gear shifts)
            // Only accept if speed dropped significantly from a recent max? 
            // Simplification: Just accept robust local minima below a threshold
            if (isMin && speed[i] < 200) { // Assuming < 200kmh is a corner for most tracks
                // De-duplicate: Ensure it's far from last found
                const last = localMinima[localMinima.length - 1];
                if (!last || (dist[i] - dist[last.idx] > 100)) { // 100m separation
                    localMinima.push({ idx: i, val: speed[i] });
                } else if (last && speed[i] < last.val) {
                    // Update if we found a deeper minimum in the same corner
                    last.idx = i;
                    last.val = speed[i];
                }
            }
        }

        return localMinima.map((m, i) => ({
            name: `T${i + 1}`,
            dist: dist[m.idx],
            minSpeed: m.val,
            minSpeedComp: keysComp ? speedComp[m.idx] : 0, // Simplified: Compare speed AT SAME DISTANCE
            delta: keysComp ? (speedComp[m.idx] - m.val) : 0
        }));

    }, [data, keys, keysComp]);

    if (!corners.length) return null;

    // Find max speed range for scaling
    const maxSpeed = Math.max(...corners.map(c => Math.max(c.minSpeed, c.minSpeedComp || 0))) * 1.1;

    return (
        <div className="bg-race-panel p-4 rounded-lg border border-gray-800">
            <h3 className="text-xs uppercase text-gray-500 font-bold mb-4">Minimum Corner Speeds</h3>
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-gray-700">
                {corners.map(c => (
                    <div key={c.name} className="flex flex-col items-center min-w-[40px] group relative">
                        {/* Bars */}
                        <div className="h-32 w-full flex items-end justify-center gap-1 relative bg-gray-900/50 rounded p-1">
                            {/* Main Bar */}
                            <div
                                className="w-3 rounded-t-sm transition-all group-hover:opacity-80"
                                style={{ height: `${(c.minSpeed / maxSpeed) * 100}%`, backgroundColor: colors.main }}
                                title={`Ref: ${c.minSpeed.toFixed(0)} km/h`}
                            />
                            {/* Comp Bar */}
                            {keysComp && (
                                <div
                                    className="w-3 rounded-t-sm transition-all group-hover:opacity-80"
                                    style={{ height: `${(c.minSpeedComp / maxSpeed) * 100}%`, backgroundColor: colors.comp }}
                                    title={`Comp: ${c.minSpeedComp.toFixed(0)} km/h`}
                                />
                            )}
                        </div>
                        {/* Label */}
                        <span className="text-[10px] font-mono text-gray-400 mt-1">{c.name}</span>
                        {/* Delta Badge */}
                        {keysComp && (
                            <span className={`text-[9px] font-bold ${c.delta > 0 ? 'text-green-400' : 'text-red-400'}`}>
                                {c.delta > 0 ? '+' : ''}{c.delta.toFixed(0)}
                            </span>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}