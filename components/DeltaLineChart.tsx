'use client';

import { useEffect, useRef, useMemo, useState, useLayoutEffect } from 'react';
import * as d3 from 'd3';
import { DeltaPoint } from '@/types/api';
import { ZoomSynchronizer } from '@/utils/zoom';

interface DeltaLineChartProps {
  data: DeltaPoint[];
  dataKeyRef: string;
  dataKeyComp?: string;
  label: string;
  unit: string;
  colorRef?: string;
  colorComp?: string;
  height?: number;
  hoverDistance: number | null;
  onHover: (distance: number | null) => void;
  isDelta?: boolean;
  targetPoints?: number;
  zoomSync?: ZoomSynchronizer;
  xDomain?: [number, number];
}

export default function DeltaLineChart({
  data,
  dataKeyRef,
  dataKeyComp,
  label,
  unit,
  colorRef = "#06b6d4",
  colorComp = "#f43f5e",
  height = 200,
  hoverDistance,
  onHover,
  isDelta = false,
  targetPoints = 4000,
  zoomSync,
  xDomain: globalXDomain
}: DeltaLineChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const pathGroupRef = useRef<SVGGElement>(null);
  const xAxisRef = useRef<SVGGElement>(null);
  const yAxisRef = useRef<SVGGElement>(null);

  const [width, setWidth] = useState(0);
  // Deterministic ID for gradient to prevent hydration mismatch
  const gradientId = useMemo(() => `grad-${label.replace(/[^a-zA-Z0-9]/g, '-')}`, [label]);

  const marginTop = 20;
  const marginRight = 30;
  const marginBottom = 30;
  const marginLeft = 50;

  useEffect(() => {
    if (!containerRef.current) return;
    const resizeObserver = new ResizeObserver((entries) => {
      setWidth(Math.floor(entries[0].contentRect.width));
    });
    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  const downsampledData = useMemo(() => {
    if (targetPoints <= 0) return [];
    if (!data || data.length <= targetPoints) return data;
    const step = Math.ceil(data.length / targetPoints);
    return data.filter((_, i) => i % step === 0);
  }, [data, targetPoints]);

  const getDist = (d: any): number => {
    if (d.dist !== undefined) return d.dist;
    if (d.distance !== undefined) return d.distance;
    if (d["Lap Dist"] !== undefined) return d["Lap Dist"];
    return 0;
  };

  const { pathRef, pathComp, xBase, y, zeroOffset } = useMemo(() => {
    if (width === 0 || !data || data.length === 0) {
      return { pathRef: '', pathComp: '', xBase: null, y: null, zeroOffset: 0.5 };
    }

    const xExtent = globalXDomain || d3.extent(data, getDist) as [number, number];
    const x = d3.scaleLinear()
      .domain(xExtent)
      .range([marginLeft, width - marginRight]);

    const minRef = d3.min(data, d => d[dataKeyRef]) ?? 0;
    const maxRef = d3.max(data, d => d[dataKeyRef]) ?? 0;
    let min = minRef;
    let max = maxRef;

    if (dataKeyComp) {
      const minComp = d3.min(data, d => d[dataKeyComp]);
      const maxComp = d3.max(data, d => d[dataKeyComp]);
      if (minComp !== undefined && maxComp !== undefined) {
        min = Math.min(min, minComp);
        max = Math.max(max, maxComp);
      }
    }

    if (isDelta) {
      const maxAbs = Math.max(Math.abs(min), Math.abs(max));
      min = -maxAbs;
      max = maxAbs;
    } else {
      min = min < 0 ? min : 0;
    }

    const padding = (max - min) * 0.05;
    if (min === max) { min -= 1; max += 1; }

    const y = d3.scaleLinear()
      .domain([min - padding, max + padding])
      .range([height - marginBottom, marginTop]);

    const zeroY = y(0);
    const zeroOffset = Math.max(0, Math.min(1, zeroY / height));

    const lineGenerator = d3.line<DeltaPoint>()
      .defined(d => !isNaN(Number(d[dataKeyRef])))
      .x((d) => x(getDist(d)))
      .y((d) => y(d[dataKeyRef]))
      .curve(d3.curveMonotoneX);

    const pathR = lineGenerator(downsampledData);
    let pathC = '';

    if (dataKeyComp) {
      const lineGeneratorComp = d3.line<DeltaPoint>()
        .defined(d => !isNaN(Number(d[dataKeyComp!])))
        .x((d) => x(getDist(d)))
        .y((d) => y(d[dataKeyComp!]))
        .curve(d3.curveMonotoneX);
      pathC = lineGeneratorComp(downsampledData) || '';
    }

    return { pathRef: pathR || '', pathComp: pathC, xBase: x, y, zeroOffset };
  }, [width, height, data, downsampledData, dataKeyRef, dataKeyComp, isDelta, globalXDomain]);

  const { xBaseLocalized, pathRefLoc, pathCompLoc } = useMemo(() => {
    if (!xBase || !pathRef) return { xBaseLocalized: null, pathRefLoc: '', pathCompLoc: '' };

    const plotWidth = width - marginLeft - marginRight;
    const xLoc = d3.scaleLinear().domain(xBase.domain()).range([0, plotWidth]);

    const lineGen = d3.line<DeltaPoint>()
      .defined(d => !isNaN(Number(d[dataKeyRef])))
      .x(d => xLoc(getDist(d)))
      .y(d => y!(d[dataKeyRef]))
      .curve(d3.curveMonotoneX);

    const pR = lineGen(downsampledData) || '';
    let pC = '';
    if (dataKeyComp && y) {
      const lineGenC = d3.line<DeltaPoint>()
        .defined(d => !isNaN(Number(d[dataKeyComp!])))
        .x(d => xLoc(getDist(d)))
        .y(d => y(d[dataKeyComp!]))
        .curve(d3.curveMonotoneX);
      pC = lineGenC(downsampledData) || '';
    }

    return { xBaseLocalized: xLoc, pathRefLoc: pR, pathCompLoc: pC };
  }, [xBase, y, downsampledData, dataKeyRef, dataKeyComp, width, marginLeft, marginRight]);


  useLayoutEffect(() => {
    if (!zoomSync || !xBaseLocalized || !pathGroupRef.current) return;

    const svg = d3.select(svgRef.current);
    const xAxisG = d3.select(xAxisRef.current);
    const yAxisG = d3.select(yAxisRef.current);
    const pathGroup = d3.select(pathGroupRef.current);

    const xAxis = d3.axisBottom(xBaseLocalized).ticks(width / 80).tickSizeOuter(0).tickFormat(d => Math.round(Number(d)) + "m");
    const yAxis = d3.axisLeft(y!).ticks(5).tickSizeOuter(0);

    xAxisG.call(xAxis).selectAll("text").style("fill", "#9ca3af");
    xAxisG.selectAll("line").style("stroke", "#374151");
    yAxisG.call(yAxis).selectAll("text").style("fill", "#9ca3af");
    yAxisG.selectAll("line").style("stroke", "#374151");
    yAxisG.selectAll("path").style("display", "none");

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

      // Always Update Visualization (Important for Initiator Chart)
      const newXScale = transform.rescaleX(xBaseLocalized);
      xAxisG.call(xAxis.scale(newXScale)).selectAll("text").style("fill", "#9ca3af");
      xAxisG.selectAll("line").style("stroke", "#374151");

      pathGroup.attr("transform", `translate(${marginLeft + transform.x}, 0) scale(${transform.k}, 1)`);
      pathGroup.selectAll(".cursor-dot").attr("transform", `scale(${1 / transform.k}, 1)`);

      // Sync internal D3 state only if different to avoid loops
      const currentT = d3.zoomTransform(svg.node()!);
      if (Math.abs(currentT.k - transform.k) > 0.001 || Math.abs(currentT.x - transform.x) > 1) {
        svg.property("__zoom", transform);
      }
    });

    return () => {
      unsubscribe();
      svg.on(".zoom", null);
    };
  }, [zoomSync, xBaseLocalized, width, marginLeft, marginRight, height, y]);


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
    const clamped = Math.max(Math.min(dist, d1), d0);
    onHover(clamped);
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

  const cursorX = activePoint && xBaseLocalized ? xBaseLocalized(getDist(activePoint)) : 0;

  let currentK = 1;
  if (zoomSync && zoomSync.getDomain() && xBaseLocalized) {
    const [G0, G1] = xBaseLocalized.domain();
    const [d0, d1] = zoomSync.getDomain()!;
    currentK = (G1 - G0) / (d1 - d0);
  }
  const cursorTransform = `scale(${1 / currentK}, 1)`;

  const fmt = (val: any) => (val !== undefined && val !== null && !isNaN(val)) ? val.toFixed(2) : '--';

  return (
    <div className="w-full flex flex-col relative group">
      <div className="flex items-center justify-between mb-2 px-1 h-8">
        <div className="flex items-baseline gap-3">
          <h3 className="text-sm uppercase text-gray-400 font-semibold tracking-wider">
            {label} <span className="text-[10px] text-zinc-600 normal-case">[{unit}]</span>
          </h3>
        </div>
        <div className="flex items-center gap-4 font-mono text-sm">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: colorRef }} />
            <span className={activePoint ? "font-bold text-white" : "text-gray-500"}>
              {activePoint ? fmt(activePoint[dataKeyRef]) : '--'}
            </span>
          </div>
          {dataKeyComp && (
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: colorComp }} />
              <span className={activePoint ? "font-bold text-white" : "text-gray-500"}>
                {activePoint ? fmt(activePoint[dataKeyComp]) : '--'}
              </span>
            </div>
          )}
          {isDelta && activePoint && (
            <span className="text-xs font-bold" style={{ color: activePoint[dataKeyRef] > 0 ? colorRef : colorComp }}>
              {activePoint[dataKeyRef] > 0 ? '+' : ''}{fmt(activePoint[dataKeyRef])}
            </span>
          )}
        </div>
      </div>

      <div
        ref={containerRef}
        className="w-full relative cursor-crosshair overflow-hidden"
        style={{ height }}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => onHover(null)}
      >
        <svg ref={svgRef} width={width} height={height} className="block">
          <defs>
            <linearGradient id={gradientId} gradientUnits="userSpaceOnUse" x1="0" x2="0" y1="0" y2={height}>
              <stop offset="0%" stopColor={colorRef} />
              <stop offset={`${zeroOffset * 100}%`} stopColor={colorRef} />
              <stop offset={`${zeroOffset * 100}%`} stopColor={colorComp} />
              <stop offset="100%" stopColor={colorComp} />
            </linearGradient>
            <clipPath id={`clip-${gradientId}`}>
              <rect x={marginLeft} y={0} width={Math.max(0, width - marginLeft - marginRight)} height={height} />
            </clipPath>
          </defs>

          <g ref={xAxisRef} transform={`translate(${marginLeft}, ${height - marginBottom})`} />
          <g ref={yAxisRef} transform={`translate(${marginLeft}, 0)`} />

          <g clipPath={`url(#clip-${gradientId})`}>
            <g ref={pathGroupRef} transform={`translate(${marginLeft},0)`}>
              <path d={pathRefLoc} fill="none" stroke={isDelta ? `url(#${gradientId})` : colorRef} strokeWidth={2} vectorEffect="non-scaling-stroke" />
              {pathCompLoc && <path d={pathCompLoc} fill="none" stroke={colorComp} strokeWidth={2} strokeDasharray="4 2" vectorEffect="non-scaling-stroke" />}

              {activePoint && (
                <g transform={`translate(${cursorX}, 0)`}>
                  <line y1={marginTop} y2={height - marginBottom} stroke="white" strokeWidth={1} strokeDasharray="3 3" opacity={0.6} vectorEffect="non-scaling-stroke" />
                  <circle
                    className="cursor-dot"
                    cy={y!(activePoint[dataKeyRef])}
                    r={4}
                    fill="#1a1c23"
                    stroke={isDelta ? (activePoint[dataKeyRef] > 0 ? colorRef : colorComp) : colorRef}
                    strokeWidth={2}
                    vectorEffect="non-scaling-stroke"
                    transform={cursorTransform}
                  />
                  {dataKeyComp && y && (
                    <circle
                      className="cursor-dot"
                      cy={y(activePoint[dataKeyComp!])}
                      r={4}
                      fill="#1a1c23"
                      stroke={colorComp}
                      strokeWidth={2}
                      vectorEffect="non-scaling-stroke"
                      transform={cursorTransform}
                    />
                  )}
                </g>
              )}
            </g>
          </g>
        </svg>
      </div>
    </div>
  );
}