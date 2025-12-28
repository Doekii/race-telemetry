'use client';

import React, { useEffect, useRef, useMemo, useState } from 'react';
import * as d3 from 'd3';

interface PedalHistogramProps {
    data: any[];
    keys: { throttle: string, brake: string };
    keysComp?: { throttle: string, brake: string };
    colors: { main: string, comp?: string };
    height?: number;
}

function PedalHistogram({ data, keys, keysComp, colors, height = 200 }: PedalHistogramProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [width, setWidth] = useState(0);

    useEffect(() => {
        if (!containerRef.current) return;
        const resizeObserver = new ResizeObserver(entries => setWidth(Math.floor(entries[0].contentRect.width)));
        resizeObserver.observe(containerRef.current);
        return () => resizeObserver.disconnect();
    }, []);

    const { bins, xScale, yScale } = useMemo(() => {
        if (!width || !data.length) return { bins: [], xScale: null, yScale: null };

        const generator = d3.bin().domain([0, 100]).thresholds(d3.range(0, 101, 10));

        // Safely extract and filter
        const throttleVals = data.map(d => d[keys.throttle]).filter(v => typeof v === 'number' && v > 1);
        const brakeVals = data.map(d => d[keys.brake]).filter(v => typeof v === 'number' && v > 1);

        const tBins = generator(throttleVals);
        const bBins = generator(brakeVals);

        let tBinsComp: any[] = [];
        let bBinsComp: any[] = [];

        if (keysComp) {
            const tValsComp = data.map(d => d[keysComp!.throttle]).filter(v => typeof v === 'number' && v > 1);
            const bValsComp = data.map(d => d[keysComp!.brake]).filter(v => typeof v === 'number' && v > 1);
            tBinsComp = generator(tValsComp);
            bBinsComp = generator(bValsComp);
        }

        const totalMain = data.length || 1;

        const processed = tBins.map((bin, i) => ({
            range: `${bin.x0}-${bin.x1}`,
            t: (bin.length / totalMain) * 100,
            b: (bBins[i]?.length || 0) / totalMain * 100,
            tC: keysComp ? ((tBinsComp[i]?.length || 0) / totalMain * 100) : 0,
            bC: keysComp ? ((bBinsComp[i]?.length || 0) / totalMain * 100) : 0,
        }));

        const xScale = d3.scaleBand().domain(processed.map(d => d.range)).range([30, width - 10]).padding(0.2);
        const maxVal = d3.max(processed, d => Math.max(d.t, d.b, d.tC, d.bC)) || 50;
        const yScale = d3.scaleLinear().domain([0, maxVal]).range([height - 20, 20]);

        return { bins: processed, xScale, yScale };
    }, [width, height, data, keys, keysComp]);

    return (
        <div className="bg-race-panel p-4 rounded-lg border border-gray-800">
            <h3 className="text-xs uppercase text-gray-500 font-bold mb-4">Input Distribution (%)</h3>
            <div ref={containerRef} className="w-full relative" style={{ height }}>
                {xScale && yScale && (
                    <svg width={width} height={height}>
                        <g transform={`translate(0, ${height - 20})`}>
                            {xScale.domain().map((d, i) => (
                                (i % 2 === 0) && <text key={d} x={xScale(d)! + xScale.bandwidth() / 2} y={15} fill="gray" fontSize={9} textAnchor="middle">{d}%</text>
                            ))}
                        </g>

                        {bins.map((d, i) => {
                            const w = xScale.bandwidth() / (keysComp ? 2 : 1);
                            return (
                                <g key={i}>
                                    {/* Throttle Bar Main */}
                                    <rect x={xScale(d.range)!} y={yScale(d.t)} width={w} height={Math.max(0, yScale(0) - yScale(d.t))} fill="#22c55e" opacity={0.6} />
                                    {/* Throttle Bar Comp */}
                                    {keysComp && (
                                        <rect x={xScale(d.range)! + w} y={yScale(d.tC)} width={w} height={Math.max(0, yScale(0) - yScale(d.tC))} fill="#22c55e" stroke={colors.comp} strokeWidth={1} fillOpacity={0.1} />
                                    )}
                                </g>
                            );
                        })}
                    </svg>
                )}
                <div className="absolute top-0 right-0 text-[10px] text-gray-500">Throttle % Distribution</div>
            </div>
        </div>
    );
}

export default React.memo(PedalHistogram);