'use client';

import React, { useEffect, useRef, useMemo, useState } from 'react';
import * as d3 from 'd3';

interface GGDiagramProps {
    data: any[]; // Accepts TelemetryPoint[] or DeltaPoint[]
    keys: {
        lat: string;
        long: string;
        latComp?: string;
        longComp?: string;
    };
    colors: {
        main: string;
        comp?: string;
    };
    height?: number;
    title?: string;
}

function GGDiagram({
    data,
    keys,
    colors,
    height = 300,
    title = "G-G Friction Circle"
}: GGDiagramProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [width, setWidth] = useState(0);

    useEffect(() => {
        if (!containerRef.current) return;
        const resizeObserver = new ResizeObserver((entries) => {
            setWidth(Math.floor(entries[0].contentRect.width));
        });
        resizeObserver.observe(containerRef.current);
        return () => resizeObserver.disconnect();
    }, []);

    const { pointsMain, pointsComp, xScale, yScale } = useMemo(() => {
        if (width === 0 || !data.length) return { pointsMain: [], pointsComp: [], xScale: null, yScale: null };

        // Standard G-Force range is usually -3g to +3g for GT/F1 cars
        const range = 2.5;
        const margin = 30;
        const size = Math.min(width, height) - margin * 2;
        const xOffset = (width - size) / 2;
        const yOffset = (height - size) / 2;

        const xScale = d3.scaleLinear().domain([-range, range]).range([xOffset, xOffset + size]);
        const yScale = d3.scaleLinear().domain([-range, range]).range([height - yOffset, yOffset]); // Inverted Y

        // FIX: Ensure values exist and are numbers before mapping
        const pointsMain = data
            .filter(d => typeof d[keys.lat] === 'number' && typeof d[keys.long] === 'number')
            .map(d => ({ x: xScale(d[keys.lat]), y: yScale(d[keys.long]) }));

        let pointsComp: { x: number, y: number }[] = [];
        if (keys.latComp && keys.longComp) {
            pointsComp = data
                .filter(d => typeof d[keys.latComp!] === 'number' && typeof d[keys.longComp!] === 'number')
                .map(d => ({ x: xScale(d[keys.latComp!]), y: yScale(d[keys.longComp!]) }));
        }

        return { pointsMain, pointsComp, xScale, yScale };
    }, [width, height, data, keys]);

    return (
        <div className="bg-race-panel p-4 rounded-lg border border-gray-800 flex flex-col items-center">
            <h3 className="text-xs uppercase text-gray-500 font-bold mb-4 self-start">{title}</h3>
            <div ref={containerRef} className="w-full relative" style={{ height }}>
                {xScale && yScale && (
                    <svg width={width} height={height} className="overflow-visible">
                        {/* Background Circles */}
                        <circle cx={xScale(0)} cy={yScale(0)} r={xScale(1) - xScale(0)} fill="none" stroke="gray" strokeOpacity={0.2} />
                        <circle cx={xScale(0)} cy={yScale(0)} r={xScale(2) - xScale(0)} fill="none" stroke="gray" strokeOpacity={0.2} />

                        {/* Crosshairs */}
                        <line x1={xScale(0)} y1={yScale(-2.5)} x2={xScale(0)} y2={yScale(2.5)} stroke="gray" strokeOpacity={0.2} />
                        <line x1={xScale(-2.5)} y1={yScale(0)} x2={xScale(2.5)} y2={yScale(0)} stroke="gray" strokeOpacity={0.2} />

                        {/* Comparison Points (Background layer) */}
                        {pointsComp.map((p, i) => (
                            // Downsample rendering: only render every 5th point to avoid DOM overload
                            (i % 5 === 0) && <circle key={`c-${i}`} cx={p.x} cy={p.y} r={1.5} fill={colors.comp} opacity={0.3} />
                        ))}

                        {/* Main Points */}
                        {pointsMain.map((p, i) => (
                            (i % 5 === 0) && <circle key={`m-${i}`} cx={p.x} cy={p.y} r={1.5} fill={colors.main} opacity={0.4} />
                        ))}

                        {/* Labels */}
                        <text x={xScale(2.2)} y={yScale(0) - 5} fill="gray" fontSize={10} textAnchor="end">Lat G</text>
                        <text x={xScale(0) + 5} y={yScale(2.2)} fill="gray" fontSize={10} textAnchor="start">Long G</text>
                    </svg>
                )}
            </div>
        </div>
    );
}

// Export memoized component to prevent re-renders on parent state changes (like hoverDistance)
export default React.memo(GGDiagram);