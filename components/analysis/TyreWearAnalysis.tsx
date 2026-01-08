'use client';

import React, { useRef, useEffect, useState, useMemo, useLayoutEffect } from 'react';
import * as d3 from 'd3';
import { ZoomSynchronizer } from '@/utils/zoom';
import TyreSubChart from '@/components/analysis/TyreSubChart';

interface TyreWearAnalysisProps {
    data: any[];
    channelRef: string;
    channelComp?: string;
    colors: { main: string; comp?: string; };
    height?: number;
    hoverDistance: number | null;
    onHover: (distance: number | null) => void;
    zoomSync?: ZoomSynchronizer;
    xDomain?: [number, number];
}

function TyreWearAnalysis({
    data, channelRef, channelComp, colors, height = 250, hoverDistance, onHover, zoomSync, xDomain
}: TyreWearAnalysisProps) {
    const yDomain = useMemo(() => {
        if (!data || data.length === 0) return [0, 100] as [number, number];
        const allWearValues: number[] = [];
        data.forEach((d) => {
            const refVal = d[channelRef];
            if (refVal !== undefined && refVal !== null) {
                if (Array.isArray(refVal)) allWearValues.push(...refVal.map(v => Number(v)));
                else if (typeof refVal === 'object') Object.values(refVal).forEach(v => allWearValues.push(Number(v)));
                else allWearValues.push(Number(refVal));
            }
            if (channelComp) {
                const compVal = d[channelComp];
                if (compVal !== undefined && compVal !== null) {
                    if (Array.isArray(compVal)) allWearValues.push(...compVal.map(v => Number(v)));
                    else if (typeof compVal === 'object') Object.values(compVal).forEach(v => allWearValues.push(Number(v)));
                    else allWearValues.push(Number(compVal));
                }
            }
        });
        const valid = allWearValues.filter(v => !isNaN(v));
        if (valid.length === 0) return [0, 100] as [number, number];
        const min = d3.min(valid) ?? 0;
        const max = d3.max(valid) ?? 100;
        const diff = max - min;
        const padding = diff > 0.1 ? diff * 0.1 : 5;
        return [(diff > 0.1 ? min - padding : 0), (diff > 0.1 ? max + padding : 100)] as [number, number];
    }, [data, channelRef, channelComp]);

    return (
        <div className="bg-race-panel p-4 rounded-lg border border-gray-800">
            <h3 className="text-xs uppercase text-gray-500 font-bold mb-4">Tyre Wear (%)</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {['Front Left', 'Front Right', 'Rear Left', 'Rear Right'].map((title, i) => (
                    <TyreSubChart
                        key={i} title={title} index={i} data={data}
                        channelRef={channelRef} channelComp={channelComp}
                        colors={colors} height={160} globalYDomain={yDomain}
                        hoverDistance={hoverDistance} onHover={onHover}
                        zoomSync={zoomSync} xDomain={xDomain}
                    />
                ))}
            </div>
        </div>
    );
}


export default React.memo(TyreWearAnalysis);
