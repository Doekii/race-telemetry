'use client';

import React, { useRef, useEffect, useState, useMemo } from 'react';
import * as d3 from 'd3';

interface TyreWearAnalysisProps {
    data: any[];
    channelRef: string;  // e.g., "Tyres Wear_Ref"
    channelComp?: string; // e.g., "Tyres Wear_Comp"
    colors: {
        main: string;
        comp?: string;
    };
    height?: number;
}

function TyreWearAnalysis({ data, channelRef, channelComp, colors, height = 250 }: TyreWearAnalysisProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [width, setWidth] = useState(0);

    useEffect(() => {
        if (!containerRef.current) return;
        const observer = new ResizeObserver(entries => setWidth(Math.floor(entries[0].contentRect.width)));
        observer.observe(containerRef.current);
        return () => observer.disconnect();
    }, []);

    // Helper to extract value safely from either array or object structure
    const getVal = (d: any, key: string, index: number) => {
        const val = d[key];
        if (Array.isArray(val)) return val[index]; // List format [fl, fr, rl, rr]
        if (typeof val === 'object' && val !== null) {
            // Try value1..4 format
            return val[`value${index + 1}`];
        }
        return 0;
    };

    const { pathData, xScale, yScale, yDomain } = useMemo(() => {
        if (!width || !data.length) return { pathData: null, xScale: null, yScale: null, yDomain: [0, 100] };

        const getDist = (d: any) => d.dist ?? d['Lap Dist'] ?? 0;
        const xExtent = d3.extent(data, getDist) as [number, number];

        // Calculate global Y domain
        const allWearValues: number[] = [];
        data.forEach(d => {
            // Check Ref
            const refVal = d[channelRef];
            if (refVal) {
                if (Array.isArray(refVal)) allWearValues.push(...refVal.map(Number));
                else if (typeof refVal === 'object') Object.values(refVal).forEach(v => allWearValues.push(Number(v)));
            }

            // Check Comp
            if (channelComp) {
                const compVal = d[channelComp];
                if (compVal) {
                    if (Array.isArray(compVal)) allWearValues.push(...compVal.map(Number));
                    else if (typeof compVal === 'object') Object.values(compVal).forEach(v => allWearValues.push(Number(v)));
                }
            }
        });

        // Filter valid
        const valid = allWearValues.filter(v => !isNaN(v) && v > 0);

        if (valid.length === 0) return { pathData: null, xScale: null, yScale: null, yDomain: [0, 100] };

        const minWear = Math.min(...valid);
        const maxWear = Math.max(...valid);
        const padding = (maxWear - minWear) * 0.1 || 0.1;
        const yMin = minWear - padding;
        const yMax = maxWear + padding;

        return { pathData: true, xScale: null, yScale: null, yDomain: [yMin, yMax] };
    }, [width, data, channelRef, channelComp]);

    if (!pathData) return (
        <div className="bg-race-panel p-4 rounded-lg border border-gray-800 flex items-center justify-center h-[200px] text-gray-500 text-xs">
            No Tyre Data Available
        </div>
    );

    return (
        <div className="bg-race-panel p-4 rounded-lg border border-gray-800">
            <h3 className="text-xs uppercase text-gray-500 font-bold mb-4">Tyre Wear (%)</h3>
            <div className="grid grid-cols-2 gap-4">
                <TyreSubChart title="FL" index={0} data={data} channelRef={channelRef} channelComp={channelComp} colors={colors} height={100} globalYDomain={yDomain} />
                <TyreSubChart title="FR" index={1} data={data} channelRef={channelRef} channelComp={channelComp} colors={colors} height={100} globalYDomain={yDomain} />
                <TyreSubChart title="RL" index={2} data={data} channelRef={channelRef} channelComp={channelComp} colors={colors} height={100} globalYDomain={yDomain} />
                <TyreSubChart title="RR" index={3} data={data} channelRef={channelRef} channelComp={channelComp} colors={colors} height={100} globalYDomain={yDomain} />
            </div>
        </div>
    );
}

// Sub-component
const TyreSubChart = React.memo(({ title, index, data, channelRef, channelComp, colors, height, globalYDomain }: any) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [width, setWidth] = useState(0);

    useEffect(() => {
        if (!containerRef.current) return;
        const observer = new ResizeObserver(entries => setWidth(Math.floor(entries[0].contentRect.width)));
        observer.observe(containerRef.current);
        return () => observer.disconnect();
    }, []);

    // Helper to extract
    const getVal = (d: any, key: string) => {
        const val = d[key];
        if (Array.isArray(val)) return Number(val[index]);
        if (typeof val === 'object' && val !== null) return Number(val[`value${index + 1}`] || Object.values(val)[index]);
        return NaN;
    };

    const { pathMain, pathComp } = useMemo(() => {
        if (!width || !data.length) return { pathMain: '', pathComp: '' };

        const getDist = (d: any) => d.dist ?? d['Lap Dist'] ?? 0;
        const xExtent = d3.extent(data, getDist) as [number, number];

        const xScale = d3.scaleLinear().domain(xExtent).range([0, width]);
        const yScale = d3.scaleLinear().domain(globalYDomain).range([height, 0]);

        const line = d3.line<any>()
            .defined(d => !isNaN(getVal(d, channelRef)))
            .x(d => xScale(getDist(d)))
            .y(d => yScale(getVal(d, channelRef)))
            .curve(d3.curveMonotoneX);

        const lineC = channelComp ? d3.line<any>()
            .defined(d => !isNaN(getVal(d, channelComp)))
            .x(d => xScale(getDist(d)))
            .y(d => yScale(getVal(d, channelComp)))
            .curve(d3.curveMonotoneX) : null;

        return {
            pathMain: line(data) || '',
            pathComp: lineC ? lineC(data) || '' : ''
        };
    }, [width, data, channelRef, channelComp, index, height, globalYDomain]);

    return (
        <div ref={containerRef} className="w-full relative flex flex-col items-center bg-gray-900/30 rounded p-2 border border-gray-800/50">
            <div className="flex justify-between w-full mb-1">
                <span className="text-[10px] font-bold text-gray-500">{title}</span>
            </div>
            <div style={{ height, width: '100%' }}>
                {width > 0 && (
                    <svg width={width} height={height} className="overflow-visible">
                        <line x1={0} x2={width} y1={0} y2={0} stroke="gray" strokeOpacity={0.1} strokeDasharray="2 2" />
                        <line x1={0} x2={width} y1={height} y2={height} stroke="gray" strokeOpacity={0.1} strokeDasharray="2 2" />

                        <path d={pathMain} fill="none" stroke={colors.main} strokeWidth={2} />
                        {pathComp && <path d={pathComp} fill="none" stroke={colors.comp} strokeWidth={2} strokeDasharray="4 2" />}

                        <text x={width} y={10} fill="gray" fontSize={9} textAnchor="end">{globalYDomain[1].toFixed(1)}%</text>
                        <text x={width} y={height - 2} fill="gray" fontSize={9} textAnchor="end">{globalYDomain[0].toFixed(1)}%</text>
                    </svg>
                )}
            </div>
        </div>
    );
});

export default React.memo(TyreWearAnalysis);