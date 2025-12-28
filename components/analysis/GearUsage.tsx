'use client';

import React, { useMemo } from 'react';
import * as d3 from 'd3';

interface GearUsageProps {
    data: any[];
    keys: { gear: string };
    keysComp?: { gear: string };
    colors: { main: string, comp?: string };
}

function GearUsage({ data, keys, keysComp, colors }: GearUsageProps) {

    const stats = useMemo(() => {
        if (!data.length) return [];

        const gearTimes: Record<string, number> = {};
        const gearTimesComp: Record<string, number> = {};

        for (let i = 1; i < data.length; i++) {
            const dt = (data[i].time || i) - (data[i - 1].time || i - 1);
            const dtVal = dt > 0 ? dt : 0.01;

            const g = Math.round(data[i][keys.gear]);
            if (g > 0) gearTimes[g] = (gearTimes[g] || 0) + dtVal;

            if (keysComp) {
                const gC = Math.round(data[i][keysComp.gear]);
                if (gC > 0) gearTimesComp[gC] = (gearTimesComp[gC] || 0) + dtVal;
            }
        }

        const allGears = new Set([...Object.keys(gearTimes), ...Object.keys(gearTimesComp)]);
        return Array.from(allGears).map(g => ({
            gear: g,
            time: gearTimes[g] || 0,
            timeComp: gearTimesComp[g] || 0
        })).sort((a, b) => Number(a.gear) - Number(b.gear));

    }, [data, keys, keysComp]);

    if (!stats.length) return null;

    const maxTime = Math.max(...stats.map(s => Math.max(s.time, s.timeComp)));

    return (
        <div className="bg-race-panel p-4 rounded-lg border border-gray-800">
            <h3 className="text-xs uppercase text-gray-500 font-bold mb-4">Gear Usage (Seconds)</h3>
            <div className="flex flex-col gap-2">
                {stats.map(s => (
                    <div key={s.gear} className="grid grid-cols-12 items-center gap-2 text-xs">
                        <div className="col-span-1 font-mono text-gray-400 text-center">{s.gear}</div>
                        <div className="col-span-11 flex flex-col gap-1">
                            <div className="h-2 rounded-sm relative bg-gray-800 w-full">
                                <div
                                    className="absolute top-0 left-0 h-full rounded-sm"
                                    style={{ width: `${(s.time / maxTime) * 100}%`, backgroundColor: colors.main }}
                                />
                            </div>
                            {keysComp && (
                                <div className="h-2 rounded-sm relative bg-gray-800 w-full">
                                    <div
                                        className="absolute top-0 left-0 h-full rounded-sm opacity-60"
                                        style={{ width: `${(s.timeComp / maxTime) * 100}%`, backgroundColor: colors.comp }}
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default React.memo(GearUsage);