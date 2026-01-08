'use client';

import React, { useRef, useEffect, useState, useMemo, useLayoutEffect } from 'react';
import * as d3 from 'd3';
import { ZoomSynchronizer } from '@/utils/zoom';

interface TyreSubChartProps {
    title: string;
    index: number;
    data: any[];
    channelRef: string;
    channelComp?: string;
    colors: { main: string; comp?: string };
    height: number;
    globalYDomain: [number, number];
    hoverDistance: number | null;
    onHover: (distance: number | null) => void;
    zoomSync?: ZoomSynchronizer;
    xDomain?: [number, number];
}

export default function TyreSubChart({
    title, index, data, channelRef, channelComp, colors, height, globalYDomain,
    hoverDistance, onHover, zoomSync, xDomain: globalXDomain
}: TyreSubChartProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const svgRef = useRef<SVGSVGElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const xAxisRef = useRef<SVGGElement>(null);
    const yAxisRef = useRef<SVGGElement>(null);

    const [width, setWidth] = useState(0);

    const marginTop = 10;
    const marginRight = 20;
    const marginBottom = 25;
    const marginLeft = 40;

    useEffect(() => {
        if (!containerRef.current) return;
        const observer = new ResizeObserver(entries => setWidth(Math.floor(entries[0].contentRect.width)));
        observer.observe(containerRef.current);
        return () => observer.disconnect();
    }, []);

    const getVal = (d: any, key: string) => {
        const val = d[key];
        if (val === undefined || val === null) return NaN;
        if (Array.isArray(val)) return Number(val[index]);
        if (typeof val === 'object') return Number(val[`value${index + 1}`] ?? Object.values(val)[index]);
        return Number(val);
    };
    const getDist = (d: any): number => Number(d.dist ?? d['Lap Dist'] ?? 0);

    // 1. Scales
    const { xBase, y } = useMemo(() => {
        if (width === 0 || !data.length) return { xBase: null, y: null };

        const plotWidth = width - marginLeft - marginRight;
        const xExt = globalXDomain || d3.extent(data, getDist) as [number, number];

        const x = d3.scaleLinear().domain(xExt).range([marginLeft, width - marginRight]);
        const yScale = d3.scaleLinear().domain(globalYDomain).range([height - marginBottom, marginTop]);

        return { xBase: x, y: yScale };
    }, [width, data, globalYDomain, globalXDomain, marginLeft, marginRight, marginTop, marginBottom, height]);

    // 2. Localized X (0..PlotWidth)
    const xBaseLocalized = useMemo(() => {
        if (!xBase) return null;
        const plotWidth = width - marginLeft - marginRight;
        return d3.scaleLinear().domain(xBase.domain()).range([0, plotWidth]);
    }, [xBase, width, marginLeft, marginRight]);


    // 3. Drawing
    useLayoutEffect(() => {
        if (!width || !xBaseLocalized || !y || !zoomSync || !svgRef.current || !xAxisRef.current || !yAxisRef.current || !canvasRef.current) return;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const svg = d3.select(svgRef.current);
        const xAxisG = d3.select(xAxisRef.current);
        const yAxisG = d3.select(yAxisRef.current);

        // High DPI
        const dpr = window.devicePixelRatio || 1;
        canvas.width = width * dpr;
        canvas.height = height * dpr;
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;
        ctx.scale(dpr, dpr);

        // Axis
        const xAxis = d3.axisBottom(xBaseLocalized).ticks(5).tickFormat(d => Math.round(Number(d)) + "m");
        const yAxis = d3.axisLeft(y).ticks(3).tickFormat(d => d + "%");

        xAxisG.call(xAxis).selectAll("text").style("fill", "#6b7280").style("font-size", "9px");
        yAxisG.call(yAxis).selectAll("text").style("fill", "#6b7280").style("font-size", "9px");
        yAxisG.selectAll("path, line").style("display", "none");

        const bisect = d3.bisector((d: any) => getDist(d)).left;

        const drawer = (transform: d3.ZoomTransform) => {
            ctx.clearRect(0, 0, width, height);

            const newXScale = transform.rescaleX(xBaseLocalized);
            const plotWidth = width - marginLeft - marginRight;
            const plotHeight = height - marginBottom - marginTop;

            // Culling & LOD
            const [minDist, maxDist] = newXScale.domain();
            let startIndex = bisect(data, minDist);
            let endIndex = bisect(data, maxDist);
            startIndex = Math.max(0, startIndex - 2);
            endIndex = Math.min(data.length, endIndex + 2);

            const visibleCount = endIndex - startIndex;
            const stride = Math.ceil(visibleCount / 4000);

            ctx.save();
            ctx.beginPath();
            ctx.rect(marginLeft, marginTop, plotWidth, plotHeight);
            ctx.clip();

            const drawLine = (key: string, dash: boolean, color: string) => {
                ctx.beginPath();
                if (visibleCount > 0) {
                    const d0 = data[startIndex];
                    const v0 = getVal(d0, key);
                    if (!isNaN(v0)) {
                        ctx.moveTo(newXScale(getDist(d0)) + marginLeft, y(v0));
                    }
                    for (let i = startIndex + stride; i < endIndex; i += stride) {
                        const d = data[i];
                        const v = getVal(d, key);
                        if (!isNaN(v)) {
                            ctx.lineTo(newXScale(getDist(d)) + marginLeft, y(v));
                        }
                    }
                }
                ctx.strokeStyle = color;
                ctx.lineWidth = 1.5;
                if (dash) ctx.setLineDash([3, 2]);
                ctx.stroke();
                if (dash) ctx.setLineDash([]);
            };

            // Draw Ref
            drawLine(channelRef, false, colors.main);

            // Draw Comp
            if (channelComp) {
                drawLine(channelComp, true, colors.comp || '#ccc');
            }
            ctx.restore();

            // Axis Update
            xAxisG.call(xAxis.scale(newXScale)).selectAll("text").style("fill", "#6b7280");
            xAxisG.selectAll("line").style("stroke", "#374151");

            // Sync
            const currentT = d3.zoomTransform(svg.node()!);
            if (Math.abs(currentT.k - transform.k) > 0.001 || Math.abs(currentT.x - transform.x) > 1) {
                svg.property("__zoom", transform);
            }
        };

        const plotWidth = width - marginLeft - marginRight;
        const zoomExt = d3.zoom<SVGSVGElement, unknown>()
            .scaleExtent([1, 50])
            .translateExtent([[0, 0], [plotWidth, height]])
            .extent([[0, 0], [plotWidth, height]])
            .filter((event) => !event.ctrlKey && !event.button)
            .on("zoom", (event) => {
                const t = event.transform;
                const newDomain = t.rescaleX(xBaseLocalized).domain() as [number, number];
                zoomSync.dispatch(newDomain);
            });

        svg.call(zoomExt).on("dblclick.zoom", null);

        const unsubscribe = zoomSync.subscribe((domain) => {
            let transform = d3.zoomIdentity;
            if (domain) {
                const [G0, G1] = xBaseLocalized.domain();
                const [d0, d1] = domain;
                const k = (G1 - G0) / (d1 - d0);
                const tx = -xBaseLocalized(d0) * k;
                transform = d3.zoomIdentity.translate(tx, 0).scale(k);
            }

            const currentT = d3.zoomTransform(svg.node()!);
            if (Math.abs(currentT.k - transform.k) > 0.001 || Math.abs(currentT.x - transform.x) > 1) {
                svg.property("__zoom", transform);
            }
            drawer(transform);
        });

        return () => { unsubscribe(); svg.on(".zoom", null); };
    }, [width, height, xBaseLocalized, y, zoomSync, marginLeft, marginRight, data, channelRef, channelComp, colors]);


    const handleMouseMove = (e: React.MouseEvent) => {
        if (!xBaseLocalized || !onHover || !zoomSync || !svgRef.current) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const mouseX = e.clientX - rect.left - marginLeft;

        const t = d3.zoomTransform(svgRef.current);
        const newScale = t.rescaleX(xBaseLocalized);
        const dist = newScale.invert(mouseX);
        onHover(dist);
    };

    const activePoint = useMemo(() => {
        if (hoverDistance === null || !data.length) return null;
        const bisector = d3.bisector(getDist).left;
        const idx = bisector(data, hoverDistance);
        if (idx === 0) return data[0];
        if (idx >= data.length) return data[data.length - 1];
        const d0 = data[idx - 1], d1 = data[idx];
        return Math.abs(getDist(d0) - hoverDistance) < Math.abs(getDist(d1) - hoverDistance) ? d0 : d1;
    }, [hoverDistance, data]);

    const refVal = activePoint ? getVal(activePoint, channelRef) : null;
    const compVal = activePoint && channelComp ? getVal(activePoint, channelComp) : null;
    const fmt = (v: number | null) => (v !== null && !isNaN(v)) ? v.toFixed(2) : '--';

    // Cursor Pos
    const currentDomain = zoomSync?.getDomain() || xBaseLocalized?.domain();
    let cursorX = 0;
    let transformK = 1;
    if (activePoint && xBaseLocalized && currentDomain) {
        const [G0, G1] = xBaseLocalized.domain();
        const [d0, d1] = currentDomain;
        transformK = (G1 - G0) / (d1 - d0);
        const tx = -xBaseLocalized(d0) * transformK;
        cursorX = xBaseLocalized(getDist(activePoint)) * transformK + tx;
    }

    return (
        <div className="w-full flex flex-col relative group">
            <div className="flex items-center justify-between mb-2 px-1 h-6">
                <div className="flex items-baseline gap-2">
                    <h3 className="text-[10px] uppercase text-gray-500 font-bold tracking-wider">{title}</h3>
                </div>
                <div className="flex items-center gap-3 font-mono text-[11px]">
                    <div className="flex items-center gap-1.5">
                        <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: colors.main }} />
                        <span className={activePoint ? "text-white font-bold" : "text-gray-600"}>{fmt(refVal)}</span>
                    </div>
                    {channelComp && (
                        <div className="flex items-center gap-1.5">
                            <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: colors.comp }} />
                            <span className={activePoint ? "text-white font-bold" : "text-gray-600"}>{fmt(compVal)}</span>
                        </div>
                    )}
                </div>
            </div>

            <div ref={containerRef} className="w-full relative cursor-crosshair bg-gray-900/20 rounded-md border border-gray-800/40 overflow-hidden"
                style={{ height }} onMouseMove={handleMouseMove} onMouseLeave={() => onHover(null)}>

                {/* CANVAS */}
                <canvas ref={canvasRef} className="absolute top-0 left-0 pointer-events-none" />

                {/* SVG */}
                <svg ref={svgRef} width={width} height={height} className="absolute top-0 left-0 block">
                    {width > 0 && xBaseLocalized && y && (
                        <>
                            <defs>
                                <clipPath id={`clip-${index}`}>
                                    <rect x={marginLeft} y={marginTop} width={Math.max(0, width - marginLeft - marginRight)} height={Math.max(0, height - marginBottom - marginTop)} />
                                </clipPath>
                            </defs>
                            <g ref={xAxisRef} transform={`translate(${marginLeft}, ${height - marginBottom})`} />
                            <g ref={yAxisRef} transform={`translate(${marginLeft}, 0)`} />

                            {activePoint && (
                                <g clipPath={`url(#clip-${index})`}>
                                    <g className="cursor-group" transform={`translate(${marginLeft + cursorX}, 0)`}>
                                        <line y1={marginTop} y2={height - marginBottom} stroke="white" strokeWidth={1} strokeDasharray="3 3" opacity={0.4} />
                                        {refVal !== null && !isNaN(refVal) && (
                                            <circle cy={y(refVal!)} r={3.5} fill="#1a1c23" stroke={colors.main} strokeWidth={2} />
                                        )}
                                        {compVal !== null && !isNaN(compVal) && (
                                            <circle cy={y(compVal!)} r={3.5} fill="#1a1c23" stroke={colors.comp} strokeWidth={2} />
                                        )}
                                    </g>
                                </g>
                            )}
                        </>
                    )}
                </svg>
            </div>
        </div>
    );
}
