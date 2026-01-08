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
  const pathGroupRef = useRef<SVGGElement>(null);
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

  const downsampledData = useMemo(() => {
    if (targetPoints <= 0) return [];
    if (!data || data.length <= targetPoints) return data;
    const step = Math.ceil(data.length / targetPoints);
    return data.filter((_, i) => i % step === 0);
  }, [data, targetPoints]);

  const getDist = (d: TelemetryPoint) => d.distance;
  const getVal = (d: TelemetryPoint) => Number(d[dataKey]);

  // 1. Base Scales & Paths
  const { pathD, xBase, y } = useMemo(() => {
    if (width === 0 || !data || data.length === 0) {
      return { pathD: '', xBase: null, y: null };
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

    const lineGenerator = d3.line<TelemetryPoint>()
      .x((d) => x(getDist(d)))
      .y((d) => yScale(getVal(d)))
      .curve(d3.curveMonotoneX);

    const p = lineGenerator(downsampledData);

    return { pathD: p || '', xBase: x, y: yScale };
  }, [width, height, data, downsampledData, dataKey, globalXDomain]);

  // Re-calc Localized Scales/Paths (0..PlotWidth) for Zoom Transforms
  const { xBaseLocalized, pathDLocalized } = useMemo(() => {
    if (!xBase || !y || !downsampledData.length) return { xBaseLocalized: null, pathDLocalized: '' };

    const plotWidth = width - marginLeft - marginRight;
    const xLoc = d3.scaleLinear().domain(xBase.domain()).range([0, plotWidth]);

    const lineGen = d3.line<TelemetryPoint>()
      .x(d => xLoc(getDist(d)))
      .y(d => y(getVal(d)))
      .curve(d3.curveMonotoneX);

    return { xBaseLocalized: xLoc, pathDLocalized: lineGen(downsampledData) || '' };
  }, [xBase, y, downsampledData, width, marginLeft, marginRight]);


  // 2. Imperative D3 Logic
  useLayoutEffect(() => {
    if (!zoomSync || !xBaseLocalized || !y || !pathGroupRef.current) return;

    const svg = d3.select(svgRef.current);
    const xAxisG = d3.select(xAxisRef.current);
    const yAxisG = d3.select(yAxisRef.current);
    const pathGroup = d3.select(pathGroupRef.current);

    // Init Axes
    const xAxis = d3.axisBottom(xBaseLocalized).ticks(width / 80).tickSizeOuter(0).tickFormat(d => Math.round(Number(d)) + "m");
    const yAxis = d3.axisLeft(y).ticks(5).tickSizeOuter(0);

    xAxisG.call(xAxis).selectAll("text").style("fill", "#9ca3af").style("font-size", "10px");
    xAxisG.selectAll("line").style("stroke", "#374151");

    yAxisG.call(yAxis).selectAll("text").style("fill", "#9ca3af").style("font-size", "10px");
    yAxisG.selectAll("line").style("stroke", "#374151");
    yAxisG.selectAll("path").style("display", "none");

    // Zoom
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

      // Visual Update
      const newXScale = transform.rescaleX(xBaseLocalized);
      xAxisG.call(xAxis.scale(newXScale)).selectAll("text").style("fill", "#9ca3af");
      xAxisG.selectAll("line").style("stroke", "#374151");

      pathGroup.attr("transform", `translate(${marginLeft + transform.x}, 0) scale(${transform.k}, 1)`);
      pathGroup.selectAll(".cursor-group").attr("transform", `scale(${1 / transform.k}, 1)`);

      // Sync D3 State
      const currentT = d3.zoomTransform(svg.node()!);
      if (Math.abs(currentT.k - transform.k) > 0.001 || Math.abs(currentT.x - transform.x) > 1) {
        svg.property("__zoom", transform);
      }
    });

    return () => {
      unsubscribe();
      svg.on(".zoom", null);
    };
  }, [width, height, xBaseLocalized, y, zoomSync, marginLeft, marginRight]);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!xBaseLocalized || !onHover || !zoomSync) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const mouseX = e.clientX - rect.left - marginLeft;

    // Invert zoom to find distance
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

  const handleMouseLeave = () => { if (onHover) onHover(null); };

  const activePoint = useMemo(() => {
    if (hoverDistance === null || hoverDistance === undefined || !downsampledData.length) return null;
    const bisector = d3.bisector((d: TelemetryPoint) => d.distance).left;
    const index = bisector(downsampledData, hoverDistance);
    if (index === 0) return downsampledData[0];
    if (index >= downsampledData.length) return downsampledData[downsampledData.length - 1];
    const d0 = downsampledData[index - 1], d1 = downsampledData[index];
    return Math.abs(d0.distance - hoverDistance) < Math.abs(d1.distance - hoverDistance) ? d0 : d1;
  }, [hoverDistance, downsampledData]);

  const cursorX = activePoint && xBaseLocalized ? xBaseLocalized(activePoint.distance) : 0;

  // Initial Transform
  let currentK = 1;
  if (zoomSync && zoomSync.getDomain() && xBaseLocalized) {
    const [G0, G1] = xBaseLocalized.domain();
    const [d0, d1] = zoomSync.getDomain()!;
    currentK = (G1 - G0) / (d1 - d0);
  }
  const cursorTransform = `scale(${1 / currentK}, 1)`;

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
        onMouseLeave={handleMouseLeave}
      >
        <svg ref={svgRef} width={width} height={height} className="block">
          <defs>
            <clipPath id={`clip-${dataKey}`}>
              <rect x={marginLeft} y={0} width={Math.max(0, width - marginLeft - marginRight)} height={height} />
            </clipPath>
          </defs>

          <g ref={xAxisRef} transform={`translate(${marginLeft}, ${height - marginBottom})`} />
          <g ref={yAxisRef} transform={`translate(${marginLeft}, 0)`} />

          <g clipPath={`url(#clip-${dataKey})`}>
            <g ref={pathGroupRef} transform={`translate(${marginLeft},0)`}>
              <path d={pathDLocalized} fill="none" stroke={color} strokeWidth={2} vectorEffect="non-scaling-stroke" />

              {activePoint && y && (
                <g className="cursor-group" transform={`translate(${cursorX}, 0) ${cursorTransform}`}>
                  <line x1={0} x2={0} y1={marginTop} y2={height - marginBottom} stroke="white" strokeWidth={1} strokeDasharray="3 3" opacity={0.6} vectorEffect="non-scaling-stroke" />

                  {/* Horizontal Line logic from original: x2 is cursorX. But here we are at 0 inside group.
                                Origin [0, y(val)].
                                We need line from [GlobalMarginLeft - cursorX?? No.]
                                The original had a horizontal line from Y-Axis to Point.
                                In this transformed group context:
                                The Y axis is at -cursorX (relative to this group).
                                So x1 = -cursorX, x2 = 0.
                            */}
                  <line x1={-cursorX} x2={0} y1={y(Number(activePoint[dataKey]))} y2={y(Number(activePoint[dataKey]))} stroke="white" strokeWidth={1} strokeDasharray="3 3" opacity={0.6} vectorEffect="non-scaling-stroke" />

                  <circle cy={y(Number(activePoint[dataKey]))} r={5} fill="#1a1c23" stroke="white" strokeWidth={2} vectorEffect="non-scaling-stroke" />
                  <circle cy={y(Number(activePoint[dataKey]))} r={2.5} fill={color} stroke="none" vectorEffect="non-scaling-stroke" />
                </g>
              )}
            </g>
          </g>
        </svg>
      </div>
    </div>
  );
}