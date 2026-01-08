'use client';

import { useEffect, useRef, useMemo, useState, useLayoutEffect } from 'react';
import * as d3 from 'd3';
import { TelemetryPoint } from '@/types/api';
import { ZoomSynchronizer } from '@/utils/zoom';

interface D3LineChartProps {
  data: TelemetryPoint[];
  dataKey: keyof TelemetryPoint;
  color?: string;
  height?: number;
  hoverDistance?: number | null;
  onHover?: (distance: number | null) => void;
  title?: string;
  targetPoints?: number;
  zoomSync?: ZoomSynchronizer;
  xDomain?: [number, number];
}

export default function D3LineChart({
  data,
  dataKey,
  color = "#3b82f6",
  height = 300,
  hoverDistance = null,
  onHover,
  title,
  targetPoints = 4000,
  zoomSync,
  xDomain: globalXDomain
}: D3LineChartProps) {
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

  // Removed downsampledData memo. Using full 'data' enables infinite zoom detail.

  const getDist = (d: TelemetryPoint) => d.distance;
  const getVal = (d: TelemetryPoint) => Number(d[dataKey]);

  // 1. Base Scales
  const { xBase, y } = useMemo(() => {
    if (width === 0 || !data || data.length === 0) {
      return { xBase: null, y: null };
    }

    const xExtent = globalXDomain || d3.extent(data, getDist) as [number, number];
    const x = d3.scaleLinear()
      .domain(xExtent)
      .range([marginLeft, width - marginRight]);

    const extent = d3.extent(data, getVal) as [number, number];
    const min = extent[0] < 0 ? extent[0] : 0;
    const max = extent[1];
    const padding = (max - min) * 0.05;

    const yScale = d3.scaleLinear()
      .domain([min - padding, max + padding])
      .range([height - marginBottom, marginTop]);

    return { xBase: x, y: yScale };
  }, [width, height, data, dataKey, globalXDomain]);

  // 2. Localized X Scale (0..PlotWidth)
  const xBaseLocalized = useMemo(() => {
    if (!xBase) return null;
    const plotWidth = width - marginLeft - marginRight;
    return d3.scaleLinear().domain(xBase.domain()).range([0, plotWidth]);
  }, [xBase, width, marginLeft, marginRight]);


  // 3. Drawing & Zoom Logic
  useLayoutEffect(() => {
    if (!zoomSync || !xBaseLocalized || !y || !canvasRef.current || !svgRef.current || !xAxisRef.current || !yAxisRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const svg = d3.select(svgRef.current);
    const xAxisG = d3.select(xAxisRef.current);
    const yAxisG = d3.select(yAxisRef.current);

    // Handle High DPI
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.scale(dpr, dpr);

    // Initialize Axes
    const xAxis = d3.axisBottom(xBaseLocalized)
      .ticks(width / 80)
      .tickSizeOuter(0)
      .tickFormat(d => Math.round(Number(d)) + "m");

    const yAxis = d3.axisLeft(y).ticks(5).tickSizeOuter(0);

    // Initial Axis Draw
    xAxisG.call(xAxis).selectAll("text").style("fill", "#9ca3af").style("font-size", "10px");
    xAxisG.selectAll("line").style("stroke", "#374151");
    yAxisG.call(yAxis).selectAll("text").style("fill", "#9ca3af").style("font-size", "10px");
    yAxisG.selectAll("line").style("stroke", "#374151");
    yAxisG.selectAll("path").style("display", "none");

    const bisect = d3.bisector((d: TelemetryPoint) => d.distance).left;

    const drawer = (transform: d3.ZoomTransform) => {
      // 1. Clear
      ctx.clearRect(0, 0, width, height);

      // 2. Rescale X
      const newXScale = transform.rescaleX(xBaseLocalized);
      const [minDist, maxDist] = newXScale.domain();

      // 3. Viewport Culling & LOD
      let startIndex = bisect(data, minDist);
      let endIndex = bisect(data, maxDist);

      // Add buffer
      startIndex = Math.max(0, startIndex - 2);
      endIndex = Math.min(data.length, endIndex + 2);

      const visibleCount = endIndex - startIndex;

      // Dynamic LOD: Target ~4000 points visible max
      const stride = Math.ceil(visibleCount / 4000);

      // 4. Draw Line
      ctx.save();
      ctx.beginPath();

      const plotWidth = width - marginLeft - marginRight;
      const plotHeight = height - marginBottom - marginTop;

      ctx.rect(marginLeft, marginTop, plotWidth, plotHeight);
      ctx.clip();

      ctx.beginPath();

      if (visibleCount > 0) {
        // First Point
        const d0 = data[startIndex];
        const val0 = Number(d0[dataKey]);
        if (!isNaN(val0)) {
          ctx.moveTo(newXScale(d0.distance) + marginLeft, y(val0));
        }

        for (let i = startIndex + stride; i < endIndex; i += stride) {
          const d = data[i];
          const val = Number(d[dataKey]);
          if (!isNaN(val)) {
            ctx.lineTo(newXScale(d.distance) + marginLeft, y(val));
          }
        }

        // Ensure connection to end if needed
        if (stride > 1 && endIndex > startIndex) {
          const dLast = data[endIndex - 1];
          if (!isNaN(Number(dLast[dataKey]))) {
            ctx.lineTo(newXScale(dLast.distance) + marginLeft, y(Number(dLast[dataKey])));
          }
        }
      }

      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.lineJoin = 'round';
      ctx.stroke();
      ctx.restore();

      // 5. Update Axes
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

    return () => {
      unsubscribe();
      svg.on(".zoom", null);
    };
  }, [width, height, xBaseLocalized, y, zoomSync, data, color, dataKey]);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!xBaseLocalized || !onHover || !zoomSync || !svgRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const mouseX = e.clientX - rect.left - marginLeft;

    const t = d3.zoomTransform(svgRef.current);
    const newScale = t.rescaleX(xBaseLocalized);

    // Invert
    const dist = newScale.invert(mouseX);
    const [d0, d1] = newScale.domain();
    const clamped = Math.max(Math.min(dist, d1), d0);
    onHover(clamped);
  };

  const activePoint = useMemo(() => {
    if (hoverDistance === null || hoverDistance === undefined || !data.length) return null;
    const bisector = d3.bisector((d: TelemetryPoint) => d.distance).left;
    const index = bisector(data, hoverDistance);
    if (index === 0) return data[0];
    if (index >= data.length) return data[data.length - 1];
    const d0 = data[index - 1], d1 = data[index];
    return Math.abs(d0.distance - hoverDistance) < Math.abs(d1.distance - hoverDistance) ? d0 : d1;
  }, [hoverDistance, data]);

  // Derive Screen X for Cursor
  const currentDomain = zoomSync?.getDomain() || xBaseLocalized?.domain();
  let cursorX = 0;
  let transformK = 1;

  if (activePoint && xBaseLocalized && currentDomain) {
    const [G0, G1] = xBaseLocalized.domain();
    const [d0, d1] = currentDomain;
    transformK = (G1 - G0) / (d1 - d0);
    const tx = -xBaseLocalized(d0) * transformK;
    cursorX = xBaseLocalized(activePoint.distance) * transformK + tx;
  }

  return (
    <div className="w-full flex flex-col relative group">
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

      <div
        ref={containerRef}
        className="w-full relative cursor-crosshair overflow-hidden"
        style={{ height }}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => onHover && onHover(null)}
      >
        <canvas
          ref={canvasRef}
          className="absolute top-0 left-0 pointer-events-none"
        />

        <svg ref={svgRef} width={width} height={height} className="absolute top-0 left-0">
          <defs>
            <clipPath id="cursor-clip">
              <rect x={marginLeft} y={0} width={Math.max(0, width - marginLeft - marginRight)} height={height} />
            </clipPath>
          </defs>
          <g ref={xAxisRef} transform={`translate(${marginLeft}, ${height - marginBottom})`} />
          <g ref={yAxisRef} transform={`translate(${marginLeft}, 0)`} />

          {activePoint && y && (
            <g clipPath="url(#cursor-clip)">
              <g className="cursor-group" transform={`translate(${marginLeft + cursorX}, 0)`}>
                <line
                  y1={marginTop}
                  y2={height - marginBottom}
                  stroke="white"
                  strokeWidth={1}
                  strokeDasharray="3 3"
                  opacity={0.6}
                />
                <line
                  x1={0}
                  x2={-cursorX}
                  y1={y(Number(activePoint[dataKey]))}
                  y2={y(Number(activePoint[dataKey]))}
                  stroke="white"
                  strokeWidth={1}
                  strokeDasharray="3 3"
                  opacity={0.6}
                />
                <circle
                  cy={y(Number(activePoint[dataKey]))}
                  r={5}
                  fill="#1a1c23"
                  stroke="white"
                  strokeWidth={2}
                />
                <circle
                  cy={y(Number(activePoint[dataKey]))}
                  r={2.5}
                  fill={color}
                  stroke="none"
                />
              </g>
            </g>
          )}
        </svg>
      </div>
    </div>
  );
}