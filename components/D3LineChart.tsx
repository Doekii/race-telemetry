'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import * as d3 from 'd3';
import { TelemetryPoint } from '@/types/api';

interface D3LineChartProps {
    data: TelemetryPoint[];
    dataKey: keyof TelemetryPoint;
    color?: string;
    height?: number;
    hoverDistance?: number | null;
    onHover?: (distance: number | null) => void;
    title?: string;
    targetPoints?: number; // New Prop
}

export default function D3LineChart({
    data,
    dataKey,
    color = "#3b82f6",
    height = 300,
    hoverDistance = null,
    onHover,
    title,
    targetPoints = 4000 // Default if not provided
}: D3LineChartProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [width, setWidth] = useState(0);

    const marginTop = 20;
    const marginRight = 30;
    const marginBottom = 30;
    const marginLeft = 50;

    useEffect(() => {
        if (!containerRef.current) return;
        const resizeObserver = new ResizeObserver((entries) => {
            setWidth(entries[0].contentRect.width);
        });
        resizeObserver.observe(containerRef.current);
        return () => resizeObserver.disconnect();
    }, []);

    // Downsample Data based on Prop
    const downsampledData = useMemo(() => {
        if (targetPoints <= 0) return [];
        if (!data || data.length <= targetPoints) return data;

        const step = Math.ceil(data.length / targetPoints);
        return data.filter((_, i) => i % step === 0);
    }, [data, targetPoints]);

    const { pathD, xScale, yScale, activePoint } = useMemo(() => {
        if (width === 0 || !data || data.length === 0) {
            return { pathD: '', xScale: null, yScale: null, activePoint: null };
        }

        const x = d3.scaleLinear()
            .domain(d3.extent(data, (d) => d.distance) as [number, number])
            .range([marginLeft, width - marginRight]);

        const y = d3.scaleLinear()
            .domain([0, d3.max(data, (d) => Number(d[dataKey])) || 0])
            .range([height - marginBottom, marginTop]);

        const lineGenerator = d3.line<TelemetryPoint>()
            .x((d) => x(d.distance))
            .y((d) => y(Number(d[dataKey])))
            .curve(d3.curveMonotoneX);

        // Use DOWNSAMPLED data for the visual path
        const path = lineGenerator(downsampledData);

        let foundPoint = null;
        if (hoverDistance !== null && hoverDistance !== undefined) {
            foundPoint = d3.least(data, (d) => Math.abs(d.distance - hoverDistance));
        }

        return {
            pathD: path || '',
            xScale: x,
            yScale: y,
            activePoint: foundPoint
        };
    }, [width, height, data, downsampledData, dataKey, hoverDistance]);

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!xScale || !onHover || !data.length) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const distance = Math.max(xScale.domain()[0], Math.min(xScale.domain()[1], xScale.invert(mouseX)));
        onHover(distance);
    };

    const handleMouseLeave = () => {
        if (onHover) onHover(null);
    };

    return (
        <div className="w-full flex flex-col relative group">
            {/* Title & Live Value Header */}
            {title && (
                <div className="flex items-baseline gap-3 mb-2 px-1 h-8">
                    <h3 className="text-sm uppercase text-gray-400 font-semibold tracking-wider">
                        {title}
                    </h3>
                    {activePoint ? (
                        <span className="font-mono text-xl font-bold transition-all duration-75" style={{ color }}>
                            {Number(activePoint[dataKey]).toFixed(2)}
                        </span>
                    ) : (
                        <span className="text-gray-600 text-xs self-center">--</span>
                    )}
                </div>
            )}

            {/* Chart Area */}
            <div
                ref={containerRef}
                className="w-full relative cursor-crosshair"
                style={{ height }}
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
            >
                {width > 0 && xScale && yScale && (
                    <svg width={width} height={height} className="overflow-visible pointer-events-none">
                        <g className="opacity-10">
                            {yScale.ticks(5).map((tick) => (
                                <line key={tick} x1={marginLeft} x2={width - marginRight} y1={yScale(tick)} y2={yScale(tick)} stroke="white" />
                            ))}
                        </g>
                        <path d={pathD} fill="none" stroke={color} strokeWidth={2} />
                        {activePoint && (
                            <g>
                                <line x1={xScale(activePoint.distance)} x2={xScale(activePoint.distance)} y1={marginTop} y2={height - marginBottom} stroke="white" strokeWidth={1} strokeDasharray="3 3" opacity={0.6} />
                                <line x1={marginLeft} x2={xScale(activePoint.distance)} y1={yScale(Number(activePoint[dataKey]))} y2={yScale(Number(activePoint[dataKey]))} stroke="white" strokeWidth={1} strokeDasharray="3 3" opacity={0.6} />
                                <circle cx={xScale(activePoint.distance)} cy={yScale(Number(activePoint[dataKey]))} r={5} fill="#1a1c23" stroke="white" strokeWidth={2} />
                                <circle cx={xScale(activePoint.distance)} cy={yScale(Number(activePoint[dataKey]))} r={2.5} fill={color} stroke="none" />
                            </g>
                        )}
                        <g transform={`translate(0, ${height - 20})`}>
                            {xScale.ticks(6).map((tick) => (
                                <text key={tick} x={xScale(tick)} y={0} fill="gray" fontSize={10} textAnchor="middle">{tick}m</text>
                            ))}
                        </g>
                        <g>
                            {yScale.ticks(5).map((tick) => (
                                <text key={tick} x={40} y={yScale(tick) + 4} fill="gray" fontSize={10} textAnchor="end">{tick}</text>
                            ))}
                        </g>
                    </svg>
                )}
            </div>
        </div>
    );
}