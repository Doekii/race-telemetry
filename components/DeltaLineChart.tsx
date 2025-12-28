'use client';

import { useEffect, useRef, useMemo, useState } from 'react';
import * as d3 from 'd3';
import { DeltaPoint } from '@/types/api';

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
}

export default function DeltaLineChart({
  data,
  dataKeyRef,
  dataKeyComp,
  label,
  unit,
  colorRef = "#06b6d4", // Cyan-500
  colorComp = "#f43f5e", // Rose-500
  height = 200,
  hoverDistance,
  onHover,
  isDelta = false,
  targetPoints = 4000
}: DeltaLineChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);

  // Secure ID for gradient
  const gradientId = useMemo(() => `grad-${Math.random().toString(36).substring(2, 9)}`, []);

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

  // 1. Downsample Data (Memoized)
  const downsampledData = useMemo(() => {
    if (targetPoints <= 0) return [];
    if (!data || data.length <= targetPoints) return data;

    const step = Math.ceil(data.length / targetPoints);
    return data.filter((_, i) => i % step === 0);
  }, [data, targetPoints]);

  // Helper to safely get Distance 
  const getDist = (d: any): number => {
    if (d.dist !== undefined) return d.dist;
    if (d.distance !== undefined) return d.distance;
    if (d["Lap Dist"] !== undefined) return d["Lap Dist"];
    return 0;
  };

  // --- OPTIMIZATION START ---

  // 2. Heavy Calculation: Scales & Paths 
  // ONLY recalculates when data or dimensions change. NOT on hover.
  const { pathRef, pathComp, xScale, yScale, zeroOffset } = useMemo(() => {
    if (width === 0 || !data || data.length === 0) {
      return { pathRef: '', pathComp: '', xScale: null, yScale: null, zeroOffset: 0.5 };
    }

    // A. Scales
    const xExtent = d3.extent(data, getDist) as [number, number];
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

    // B. Path Generation
    const isValid = (d: DeltaPoint, key: string) => {
      const val = d[key];
      return val !== undefined && val !== null && !isNaN(val);
    };

    const lineGenerator = d3.line<DeltaPoint>()
      .defined(d => isValid(d, dataKeyRef))
      .x((d) => x(getDist(d)))
      .y((d) => y(d[dataKeyRef]))
      .curve(d3.curveMonotoneX);

    const pathR = lineGenerator(downsampledData);
    let pathC = '';

    if (dataKeyComp) {
      const lineGeneratorComp = d3.line<DeltaPoint>()
        .defined(d => isValid(d, dataKeyComp!))
        .x((d) => x(getDist(d)))
        .y((d) => y(d[dataKeyComp!]))
        .curve(d3.curveMonotoneX);
      pathC = lineGeneratorComp(downsampledData) || '';
    }

    return { pathRef: pathR || '', pathComp: pathC, xScale: x, yScale: y, zeroOffset };
  }, [width, height, data, downsampledData, dataKeyRef, dataKeyComp, isDelta]);
  // ^ Note: hoverDistance is REMOVED from dependencies here

  // 3. Lightweight Calculation: Active Point (Binary Search)
  // Runs frequently on hover, but is extremely fast (O(log n))
  const activePoint = useMemo(() => {
    if (hoverDistance === null || hoverDistance === undefined || downsampledData.length === 0) return null;

    // Binary search for index
    const bisector = d3.bisector((d: DeltaPoint) => getDist(d)).left;
    const index = bisector(downsampledData, hoverDistance);

    // Snap to closest
    if (index === 0) return downsampledData[0];
    if (index >= downsampledData.length) return downsampledData[downsampledData.length - 1];

    const d0 = downsampledData[index - 1];
    const d1 = downsampledData[index];
    const dist0 = Math.abs(getDist(d0) - hoverDistance);
    const dist1 = Math.abs(getDist(d1) - hoverDistance);
    return dist0 < dist1 ? d0 : d1;

  }, [hoverDistance, downsampledData]); // Only re-runs when mouse moves

  // --- OPTIMIZATION END ---

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

  const fmt = (val: number | undefined | null) =>
    (val !== undefined && val !== null && !isNaN(val)) ? val.toFixed(2) : '--';

  return (
    <div className="w-full flex flex-col relative group">
      {/* Header */}
      <div className="flex items-center justify-between mb-2 px-1 h-8">
        <div className="flex items-baseline gap-3">
          <h3 className="text-sm uppercase text-gray-400 font-semibold tracking-wider">
            {label} <span className="text-[10px] text-zinc-600 normal-case">[{unit}]</span>
          </h3>
        </div>

        {/* Values */}
        <div className="flex items-center gap-4 font-mono text-sm">
          {/* Ref Value */}
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: colorRef }} />
            <span className={activePoint ? "font-bold text-white" : "text-gray-500"}>
              {activePoint ? fmt(activePoint[dataKeyRef]) : '--'}
            </span>
          </div>

          {/* Comp Value */}
          {dataKeyComp && (
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: colorComp }} />
              <span className={activePoint ? "font-bold text-white" : "text-gray-500"}>
                {activePoint ? fmt(activePoint[dataKeyComp]) : '--'}
              </span>
            </div>
          )}

          {/* Delta Indicator */}
          {isDelta && activePoint && (
            <span className="text-xs font-bold" style={{ color: activePoint[dataKeyRef] > 0 ? colorRef : colorComp }}>
              {activePoint[dataKeyRef] > 0 ? '+' : ''}{fmt(activePoint[dataKeyRef])}
            </span>
          )}
        </div>
      </div>

      <div
        ref={containerRef}
        className="w-full relative cursor-crosshair"
        style={{ height }}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        {width > 0 && xScale && yScale && (
          <svg width={width} height={height} className="overflow-visible pointer-events-none">

            <defs>
              <linearGradient id={gradientId} gradientUnits="userSpaceOnUse" x1="0" x2="0" y1="0" y2={height}>
                <stop offset="0%" stopColor={colorRef} />
                <stop offset={`${zeroOffset * 100}%`} stopColor={colorRef} />
                <stop offset={`${zeroOffset * 100}%`} stopColor={colorComp} />
                <stop offset="100%" stopColor={colorComp} />
              </linearGradient>
            </defs>

            {/* Grid */}
            <g className="opacity-10">
              {yScale.ticks(5).map((tick) => (
                <line key={tick} x1={marginLeft} x2={width - marginRight} y1={yScale(tick)} y2={yScale(tick)} stroke="white" />
              ))}
              {(isDelta || yScale.domain()[0] < 0) && (
                <line
                  x1={marginLeft}
                  x2={width - marginRight}
                  y1={yScale(0)}
                  y2={yScale(0)}
                  stroke="white"
                  strokeOpacity={0.5}
                  strokeDasharray={isDelta ? "4 4" : "0"}
                />
              )}
            </g>

            {/* Main Path */}
            <path
              d={pathRef}
              fill="none"
              stroke={isDelta ? `url(#${gradientId})` : colorRef}
              strokeWidth={2}
            />

            {/* Comparison Path (dashed) */}
            {pathComp && (
              <path d={pathComp} fill="none" stroke={colorComp} strokeWidth={2} strokeDasharray="4 2" />
            )}

            {/* Cursor */}
            {activePoint && (
              <g>
                <line
                  x1={xScale(getDist(activePoint))}
                  x2={xScale(getDist(activePoint))}
                  y1={marginTop}
                  y2={height - marginBottom}
                  stroke="white"
                  strokeWidth={1}
                  strokeDasharray="3 3"
                  opacity={0.6}
                />

                {/* Dot Color Logic */}
                <circle
                  cx={xScale(getDist(activePoint))}
                  cy={yScale(activePoint[dataKeyRef])}
                  r={4}
                  fill="#1a1c23"
                  stroke={isDelta ? (activePoint[dataKeyRef] > 0 ? colorRef : colorComp) : colorRef}
                  strokeWidth={2}
                />

                {dataKeyComp && pathComp && (
                  <circle cx={xScale(getDist(activePoint))} cy={yScale(activePoint[dataKeyComp])} r={4} fill="#1a1c23" stroke={colorComp} strokeWidth={2} />
                )}
              </g>
            )}

            {/* Axes */}
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