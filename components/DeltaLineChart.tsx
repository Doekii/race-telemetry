'use client';

import React, { useEffect, useRef, useMemo, useState, useLayoutEffect } from 'react';
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
  zoomSync,
  xDomain: globalXDomain
}: DeltaLineChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const xAxisRef = useRef<SVGGElement>(null);
  const yAxisRef = useRef<SVGGElement>(null);

  const [width, setWidth] = useState(0);

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

  const getDist = (d: any): number => {
    const val = d.dist ?? d.distance ?? d["Lap Dist"];
    if (val === null || val === undefined || isNaN(Number(val))) return 0;
    return Number(val);
  };

  // 1. Base Scales
  const { xBase, y, zeroOffset } = useMemo(() => {
    if (width === 0 || !data || data.length === 0) {
      return { xBase: null, y: null, zeroOffset: 0.5 };
    }

    const xExtent = globalXDomain || d3.extent(data, getDist) as [number, number];
    const x = d3.scaleLinear().domain(xExtent).range([marginLeft, width - marginRight]);

    const minRef = d3.min(data, (d: any) => { const v = d[dataKeyRef]; return (v !== null && !isNaN(Number(v))) ? Number(v) : undefined; }) ?? 0;
    const maxRef = d3.max(data, (d: any) => { const v = d[dataKeyRef]; return (v !== null && !isNaN(Number(v))) ? Number(v) : undefined; }) ?? 0;
    let min = minRef;
    let max = maxRef;

    if (dataKeyComp) {
      const minComp = d3.min(data, (d: any) => { const v = d[dataKeyComp]; return (v !== null && !isNaN(Number(v))) ? Number(v) : undefined; });
      const maxComp = d3.max(data, (d: any) => { const v = d[dataKeyComp]; return (v !== null && !isNaN(Number(v))) ? Number(v) : undefined; });
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

    const yScale = d3.scaleLinear().domain([min - padding, max + padding]).range([height - marginBottom, marginTop]);
    const zeroY = yScale(0);
    const zeroOffset = Math.max(0, Math.min(1, zeroY / height));

    return { xBase: x, y: yScale, zeroOffset };
  }, [width, height, data, dataKeyRef, dataKeyComp, isDelta, globalXDomain, marginLeft, marginRight, marginTop, marginBottom]);

  // 2. Localized Scales for Zoom (0..Width)
  const xBaseLocalized = useMemo(() => {
    if (!xBase) return null;
    const plotWidth = width - marginLeft - marginRight;
    return d3.scaleLinear().domain(xBase.domain()).range([0, plotWidth]);
  }, [xBase, width, marginLeft, marginRight]);

  // 3. Drawing Logic
  useLayoutEffect(() => {
    if (!zoomSync || !xBaseLocalized || !y || !canvasRef.current || !svgRef.current || !xAxisRef.current || !yAxisRef.current) return;

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

    // Init Axes
    const xAxis = d3.axisBottom(xBaseLocalized).ticks(width / 80).tickSizeOuter(0).tickFormat(d => Math.round(Number(d)) + "m");
    const yAxis = d3.axisLeft(y).ticks(5).tickSizeOuter(0);

    xAxisG.call(xAxis).selectAll("text").style("fill", "#9ca3af");
    xAxisG.selectAll("line").style("stroke", "#374151");
    yAxisG.call(yAxis).selectAll("text").style("fill", "#9ca3af");
    yAxisG.selectAll("line").style("stroke", "#374151");
    yAxisG.selectAll("path").style("display", "none");

    const bisect = d3.bisector((d: DeltaPoint) => getDist(d)).left;

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


      // Prepare Gradient if Delta
      let strokeStyle: string | CanvasGradient = colorRef;
      if (isDelta) {
        const grad = ctx.createLinearGradient(0, 0, 0, height);
        grad.addColorStop(0, colorRef);
        grad.addColorStop(zeroOffset, colorRef);
        grad.addColorStop(zeroOffset, colorComp);
        grad.addColorStop(1, colorComp);
        strokeStyle = grad;
      }

      ctx.save();
      ctx.beginPath();
      ctx.rect(marginLeft, marginTop, plotWidth, plotHeight);
      ctx.clip();

      // Zero Line (IsDelta)
      if (isDelta) {
        const yZero = y(0);
        ctx.beginPath();
        ctx.moveTo(marginLeft, yZero);
        ctx.lineTo(width - marginRight, yZero);
        ctx.strokeStyle = "rgba(255, 255, 255, 0.2)";
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      const traceMinMax = (key: string, isFill: boolean) => {
        if (visibleCount <= 0) return;

        const yZero = y(0);
        let currentPixel = -1;
        let minY = Infinity;
        let maxY = -Infinity;
        let firstPoint = true;

        let startPixel = 0;
        let startY = 0;

        const emitBucket = (px: number, mn: number, mx: number) => {
          const xPos = px + marginLeft;
          if (firstPoint) {
            if (isFill) {
              ctx.moveTo(xPos, yZero);
              ctx.lineTo(xPos, mn);
            } else {
              ctx.moveTo(xPos, mn);
            }
            ctx.lineTo(xPos, mx);
            firstPoint = false;
            startPixel = px;
            startY = mn;
          } else {
            ctx.lineTo(xPos, mn);
            ctx.lineTo(xPos, mx);
          }
        };

        for (let i = startIndex; i < endIndex; i++) {
          const d = data[i];
          const val = Number(d[key]);
          if (isNaN(val)) continue;

          const xVal = newXScale(getDist(d));
          const px = Math.floor(xVal);
          const yVal = y(val);

          if (px !== currentPixel) {
            if (currentPixel !== -1 && minY !== Infinity) {
              emitBucket(currentPixel, minY, maxY);
            }
            currentPixel = px;
            minY = yVal;
            maxY = yVal;
          } else {
            minY = Math.min(minY, yVal);
            maxY = Math.max(maxY, yVal);
          }
        }
        if (currentPixel !== -1 && minY !== Infinity) {
          emitBucket(currentPixel, minY, maxY);
        }

        if (isFill && !firstPoint) {
          const finalX = currentPixel + marginLeft;
          ctx.lineTo(finalX, yZero);
          const initialX = startPixel + marginLeft;
          ctx.lineTo(initialX, yZero);
          ctx.closePath();
        }
      };

      const drawPath = (key: string, dash: boolean) => {
        // Area Fill (only for main line when isDelta is true)
        if (isDelta && !dash && visibleCount > 0) {
          ctx.beginPath();
          traceMinMax(key, true);
          ctx.fillStyle = strokeStyle;
          ctx.globalAlpha = 0.2;
          ctx.fill();
          ctx.globalAlpha = 1.0;
        }

        // Main Stroke
        ctx.beginPath();
        traceMinMax(key, false);

        ctx.strokeStyle = dash ? colorComp : strokeStyle;
        ctx.lineWidth = 1.5;
        ctx.lineJoin = 'round';
        if (dash) ctx.setLineDash([4, 2]);
        ctx.stroke();
        if (dash) ctx.setLineDash([]);
      };

      // Draw Lines
      drawPath(dataKeyRef, false);
      if (dataKeyComp) {
        drawPath(dataKeyComp, true);
      }

      ctx.restore();

      // Axes Update
      xAxisG.call(xAxis.scale(newXScale)).selectAll("text").style("fill", "#9ca3af");
      xAxisG.selectAll("line").style("stroke", "#374151");

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

  }, [zoomSync, xBaseLocalized, y, width, height, marginLeft, marginRight, data, isDelta, zeroOffset, colorRef, colorComp, dataKeyRef, dataKeyComp]);


  const handleMouseMove = (e: React.MouseEvent) => {
    if (!xBaseLocalized || !onHover || !zoomSync || !svgRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const mouseX = e.clientX - rect.left - marginLeft;

    const t = d3.zoomTransform(svgRef.current);
    const newScale = t.rescaleX(xBaseLocalized);
    const dist = newScale.invert(mouseX);

    const [d0, d1] = newScale.domain();
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

  const fmt = (val: any) => (val !== undefined && val !== null && !isNaN(val)) ? val.toFixed(2) : '--';

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
      {/* Header */}
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
        {/* CANVAS */}
        <canvas ref={canvasRef} className="absolute top-0 left-0 pointer-events-none" />

        {/* SVG */}
        <svg ref={svgRef} width={width} height={height} className="absolute top-0 left-0 block">
          {width > 0 && xBaseLocalized && y && (
            <>
              <defs>
                <clipPath id={`clip-${label}`}>
                  <rect x={marginLeft} y={0} width={Math.max(0, width - marginLeft - marginRight)} height={height} />
                </clipPath>
              </defs>

              <g ref={xAxisRef} transform={`translate(${marginLeft}, ${height - marginBottom})`} />
              <g ref={yAxisRef} transform={`translate(${marginLeft}, 0)`} />

              {activePoint && (
                <g clipPath={`url(#clip-${label})`}>
                  <g className="cursor-group" transform={`translate(${marginLeft + cursorX}, 0)`}>
                    <line y1={marginTop} y2={height - marginBottom} stroke="white" strokeWidth={1} strokeDasharray="3 3" opacity={0.6} />
                    <circle cy={y(activePoint[dataKeyRef])} r={4} fill="#1a1c23" stroke={isDelta ? (activePoint[dataKeyRef] > 0 ? colorRef : colorComp) : colorRef} strokeWidth={2} />
                    {dataKeyComp && (
                      <circle cy={y(activePoint[dataKeyComp])} r={4} fill="#1a1c23" stroke={colorComp} strokeWidth={2} />
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