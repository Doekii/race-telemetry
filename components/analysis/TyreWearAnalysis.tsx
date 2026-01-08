'use client';

import React, { useRef, useEffect, useState, useMemo, useLayoutEffect } from 'react';
import * as d3 from 'd3';
import { ZoomSynchronizer } from '@/utils/zoom';

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

const TyreSubChart = React.memo(({
    title, index, data, channelRef, channelComp, colors, height, globalYDomain,
    hoverDistance, onHover, zoomSync, xDomain: globalXDomain
}: any) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const svgRef = useRef<SVGSVGElement>(null);
    const pathGroupRef = useRef<SVGGElement>(null);
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

    // 1. Scales & Localized Paths
    const { xBaseLocalized, y, pathRefLoc, pathCompLoc } = useMemo(() => {
        if (width === 0 || !data.length) return { xBaseLocalized: null, y: null, pathRefLoc: '', pathCompLoc: '' };

        const plotWidth = width - marginLeft - marginRight;
        const xExt = globalXDomain || d3.extent(data, getDist) as [number, number];
        const xLoc = d3.scaleLinear().domain(xExt).range([0, plotWidth]);
        const yScale = d3.scaleLinear().domain(globalYDomain).range([height - marginBottom, marginTop]);

        const line = d3.line<any>()
            .defined(d => !isNaN(getVal(d, channelRef)))
            .x(d => xLoc(getDist(d)))
            .y(d => yScale(getVal(d, channelRef)))
            .curve(d3.curveMonotoneX);

        const lineC = channelComp ? d3.line<any>()
            .defined(d => !isNaN(getVal(d, channelComp)))
            .x(d => xLoc(getDist(d)))
            .y(d => yScale(getVal(d, channelComp)))
            .curve(d3.curveMonotoneX) : null;

        return { xBaseLocalized: xLoc, y: yScale, pathRefLoc: line(data) || '', pathCompLoc: lineC ? lineC(data) || '' : '' };
    }, [width, data, channelRef, channelComp, index, height, globalYDomain, globalXDomain, marginLeft, marginRight]);

    // 2. Initial Setup & Zoom Sub
    useLayoutEffect(() => {
        if (!width || !xBaseLocalized || !y || !zoomSync || !pathGroupRef.current) return;
        const svg = d3.select(svgRef.current);
        const xAxisG = d3.select(xAxisRef.current);
        const pathGroup = d3.select(pathGroupRef.current);
        const yAxisG = d3.select(yAxisRef.current);

        const xAxis = d3.axisBottom(xBaseLocalized).ticks(5).tickFormat(d => Math.round(Number(d)) + "m");
        const yAxis = d3.axisLeft(y).ticks(3).tickFormat(d => d + "%");

        yAxisG.call(yAxis).selectAll("text").style("fill", "#6b7280").style("font-size", "9px");
        yAxisG.selectAll("path, line").style("display", "none");

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

            // Always Apply Updates
            xAxisG.call(xAxis.scale(transform.rescaleX(xBaseLocalized)))
                .selectAll("text").style("fill", "#6b7280").style("font-size", "9px");
            xAxisG.selectAll("line").style("stroke", "#374151");

            pathGroup.attr("transform", `translate(${marginLeft + transform.x}, 0) scale(${transform.k}, 1)`);
            pathGroup.selectAll(".cursor-dot").attr("transform", `scale(${1 / transform.k}, 1)`);

            // Check if D3 state needs update
            const currentT = d3.zoomTransform(svg.node()!);
            if (Math.abs(currentT.k - transform.k) > 0.001 || Math.abs(currentT.x - transform.x) > 1) {
                svg.property("__zoom", transform);
            }
        });

        return () => { unsubscribe(); svg.on(".zoom", null); };
    }, [width, height, xBaseLocalized, y, zoomSync, marginLeft, marginRight]);

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!xBaseLocalized || !onHover || !zoomSync) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const mouseX = e.clientX - rect.left - marginLeft;

        const domain = zoomSync.getDomain() || xBaseLocalized.domain();
        const [d0, d1] = domain;
        const [G0, G1] = xBaseLocalized.domain();
        const k = (G1 - G0) / (d1 - d0);
        const tx = -xBaseLocalized(d0) * k;
        const t = d3.zoomIdentity.translate(tx, 0).scale(k);

        const dist = t.rescaleX(xBaseLocalized).invert(mouseX);
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
    const cursorX = activePoint && xBaseLocalized ? xBaseLocalized(getDist(activePoint)) : 0;

    let currentK = 1;
    if (zoomSync && zoomSync.getDomain() && xBaseLocalized) {
        const [G0, G1] = xBaseLocalized.domain();
        const [d0, d1] = zoomSync.getDomain()!;
        currentK = (G1 - G0) / (d1 - d0);
    }
    const cursorTransform = `scale(${1 / currentK}, 1)`;
    const fmt = (v: number | null) => (v !== null && !isNaN(v)) ? v.toFixed(2) : '--';

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
                <svg ref={svgRef} width={width} height={height} className="block">
                    <defs>
                        <clipPath id={`clip-${index}`}>
                            <rect x={marginLeft} y={marginTop} width={Math.max(0, width - marginLeft - marginRight)} height={Math.max(0, height - marginBottom - marginTop)} />
                        </clipPath>
                    </defs>
                    <g ref={xAxisRef} transform={`translate(${marginLeft}, ${height - marginBottom})`} />
                    <g ref={yAxisRef} transform={`translate(${marginLeft}, 0)`} />

                    <g clipPath={`url(#clip-${index})`}>
                        <g ref={pathGroupRef} transform={`translate(${marginLeft},0)`}>
                            <path d={pathRefLoc} fill="none" stroke={colors.main} strokeWidth={1.5} vectorEffect="non-scaling-stroke" />
                            {pathCompLoc && <path d={pathCompLoc} fill="none" stroke={colors.comp} strokeWidth={1.5} strokeDasharray="3 2" vectorEffect="non-scaling-stroke" />}

                            {activePoint && (
                                <g transform={`translate(${cursorX}, 0)`}>
                                    <line y1={marginTop} y2={height - marginBottom} stroke="white" strokeWidth={1} strokeDasharray="3 3" opacity={0.4} vectorEffect="non-scaling-stroke" />
                                    {refVal !== null && !isNaN(refVal) && (
                                        <circle className="cursor-dot" cy={y!(refVal)} r={3.5} fill="#1a1c23" stroke={colors.main} strokeWidth={2} vectorEffect="non-scaling-stroke" transform={cursorTransform} />
                                    )}
                                    {compVal !== null && !isNaN(compVal) && (
                                        <circle className="cursor-dot" cy={y!(compVal)} r={3.5} fill="#1a1c23" stroke={colors.comp} strokeWidth={2} vectorEffect="non-scaling-stroke" transform={cursorTransform} />
                                    )}
                                </g>
                            )}
                        </g>
                    </g>
                </svg>
            </div>
        </div>
    );
});

export default React.memo(TyreWearAnalysis);