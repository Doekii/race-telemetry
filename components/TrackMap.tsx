'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import * as d3 from 'd3';
import { TelemetryPoint } from '@/types/api';

interface TrackMapProps {
    data: TelemetryPoint[];
    color?: string;
    height?: number;
    className?: string;
    onHover?: (point: TelemetryPoint | null) => void;
    hoverDistance?: number | null;
    targetPoints?: number; // New Prop
}

export default function TrackMap({
    data,
    color = "#3b82f6",
    height = 400,
    className,
    onHover,
    hoverDistance,
    targetPoints = 4000 // Default
}: TrackMapProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const svgRef = useRef<SVGSVGElement>(null);
    const [width, setWidth] = useState(0);
    const [zoomTransform, setZoomTransform] = useState<d3.ZoomTransform | null>(null);

    useEffect(() => {
        if (!containerRef.current) return;
        const resizeObserver = new ResizeObserver((entries) => {
            setWidth(entries[0].contentRect.width);
        });
        resizeObserver.observe(containerRef.current);
        return () => resizeObserver.disconnect();
    }, []);

    useEffect(() => {
        if (!svgRef.current || width === 0) return;
        const zoom = d3.zoom<SVGSVGElement, unknown>()
            .scaleExtent([1, 15])
            .extent([[0, 0], [width, height]])
            .on("zoom", (event) => setZoomTransform(event.transform));

        const selection = d3.select(svgRef.current);
        selection.call(zoom);
        selection.on("dblclick.zoom", () => {
            selection.transition().duration(750).call(zoom.transform, d3.zoomIdentity);
        });
        return () => { selection.on(".zoom", null); };
    }, [width, height]);

    // Downsample Data based on Prop
    const downsampledData = useMemo(() => {
        if (targetPoints <= 0) return [];
        if (!data || data.length <= targetPoints) return data;

        const step = Math.ceil(data.length / targetPoints);
        return data.filter((_, i) => i % step === 0);
    }, [data, targetPoints]);

    const { pathD, startPoint, projectedPoints } = useMemo(() => {
        if (width === 0 || !downsampledData || downsampledData.length === 0) {
            return { pathD: '', startPoint: null, projectedPoints: [] };
        }

        const padding = 20;
        const longExtent = d3.extent(downsampledData, d => d.long) as [number, number];
        const latExtent = d3.extent(downsampledData, d => d.lat) as [number, number];

        if (!longExtent[0] || !latExtent[0]) return { pathD: '', startPoint: null, projectedPoints: [] };

        const longRange = longExtent[1] - longExtent[0];
        const latRange = latExtent[1] - latExtent[0];
        const avgLatRad = (latExtent[0] + latExtent[1]) / 2 * (Math.PI / 180);
        const aspectCorrection = Math.cos(avgLatRad);
        const dataAspectRatio = (longRange * aspectCorrection) / latRange;
        const containerAspectRatio = (width - padding * 2) / (height - padding * 2);

        let xScale, yScale;

        if (dataAspectRatio > containerAspectRatio) {
            const scaleW = width - padding * 2;
            const scaleH = scaleW / dataAspectRatio;
            xScale = d3.scaleLinear().domain(longExtent).range([padding, width - padding]);
            yScale = d3.scaleLinear().domain(latExtent).range([(height - scaleH) / 2 + scaleH, (height - scaleH) / 2]);
        } else {
            const scaleH = height - padding * 2;
            const scaleW = scaleH * dataAspectRatio;
            xScale = d3.scaleLinear().domain(longExtent).range([(width - scaleW) / 2, (width - scaleW) / 2 + scaleW]);
            yScale = d3.scaleLinear().domain(latExtent).range([height - padding, padding]);
        }

        const projected = downsampledData.map(d => ({
            x: xScale(d.long), y: yScale(d.lat), data: d
        }));

        const lineGenerator = d3.line<TelemetryPoint>()
            .x(d => xScale(d.long))
            .y(d => yScale(d.lat))
            .curve(d3.curveLinear);

        return {
            pathD: lineGenerator(downsampledData) || '',
            startPoint: projected[0],
            projectedPoints: projected
        };
    }, [width, height, downsampledData]);

    const activeMarker = useMemo(() => {
        if (hoverDistance === null || hoverDistance === undefined || !projectedPoints.length) return null;
        return d3.least(projectedPoints, p => Math.abs(p.data.distance - hoverDistance));
    }, [hoverDistance, projectedPoints]);

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!projectedPoints.length || !containerRef.current || !onHover) return;
        const rect = containerRef.current.getBoundingClientRect();
        let mouseX = e.clientX - rect.left;
        let mouseY = e.clientY - rect.top;

        if (zoomTransform) {
            mouseX = (mouseX - zoomTransform.x) / zoomTransform.k;
            mouseY = (mouseY - zoomTransform.y) / zoomTransform.k;
        }

        const closest = d3.least(projectedPoints, p => {
            const dx = p.x - mouseX;
            const dy = p.y - mouseY;
            return dx * dx + dy * dy;
        });

        if (closest) onHover(closest.data);
    };

    const handleMouseLeave = () => { if (onHover) onHover(null); };
    const k = zoomTransform?.k || 1;

    return (
        <div ref={containerRef} className={`w-full relative ${className}`} style={{ height }} onMouseMove={handleMouseMove} onMouseLeave={handleMouseLeave}>
            {width > 0 && pathD && (
                <svg ref={svgRef} width={width} height={height} className="overflow-hidden cursor-crosshair touch-none">
                    <g transform={zoomTransform ? zoomTransform.toString() : ""}>
                        <path d={pathD} fill="none" stroke={color} strokeWidth={3} vectorEffect="non-scaling-stroke" strokeLinejoin="round" strokeLinecap="round" className="drop-shadow-lg" />
                        {startPoint && (<circle cx={startPoint.x} cy={startPoint.y} r={4 / k} fill="white" className="opacity-50" />)}
                        {activeMarker && (
                            <g transform={`translate(${activeMarker.x}, ${activeMarker.y})`}>
                                <circle r={8 / k} fill={color} fillOpacity={0.3} className="animate-pulse" />
                                <circle r={4 / k} fill="white" stroke={color} strokeWidth={2 / k} />
                            </g>
                        )}
                    </g>
                </svg>
            )}
            <div className="absolute bottom-2 right-2 text-[10px] text-gray-500 bg-black/50 px-2 py-1 rounded pointer-events-none select-none">
                Scroll to Zoom • Drag to Pan • DblClick Reset
            </div>
        </div>
    );
}