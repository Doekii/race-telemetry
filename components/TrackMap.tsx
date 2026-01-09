'use client';

import { useEffect, useMemo, useRef, useState, useLayoutEffect } from 'react';
import * as d3 from 'd3';
import { TelemetryPoint } from '@/types/api';

type ProjectedPoint = {
  x: number;
  y: number;
  data: TelemetryPoint;
  offsetMeters: number;
};

interface Geometry {
  leftEdgePoints: [number, number][];
  rightEdgePoints: [number, number][];
  drivenLinePoints: [number, number][];
  centerPoints: [number, number][];
  projectedPoints: ProjectedPoint[];
  startPoint: ProjectedPoint | null;
  pixelsPerMeter: number;
}

interface TrackMapProps {
  data: TelemetryPoint[];
  color?: string;
  height?: number;
  className?: string;
  onHover?: (point: TelemetryPoint | null) => void;
  hoverDistance?: number | null;
}

export default function TrackMap({
  data,
  color = "#3b82f6",
  height = 400,
  className,
  onHover,
  hoverDistance,
}: TrackMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [width, setWidth] = useState(0);
  const [zoomTransform, setZoomTransform] = useState<d3.ZoomTransform>(d3.zoomIdentity);

  useEffect(() => {
    if (!containerRef.current) return;
    const resizeObserver = new ResizeObserver((entries) => {
      const w = entries[0].contentRect.width;
      if (w > 0) setWidth(Math.floor(w));
    });
    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  // 1. Zoom Logic
  useEffect(() => {
    if (!svgRef.current || width === 0) return;
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([1, 20])
      .extent([[0, 0], [width, height]])
      .on("zoom", (event) => setZoomTransform(event.transform));

    const selection = d3.select(svgRef.current);
    selection.call(zoom);
    selection.on("dblclick.zoom", () => {
      selection.transition().duration(750).call(zoom.transform, d3.zoomIdentity);
    });
    return () => { selection.on(".zoom", null); };
  }, [width, height]);


  // 3. Geometry (Calculation)
  const geometry = useMemo<Geometry>(() => {
    if (width === 0 || !data || data.length === 0) {
      return { leftEdgePoints: [], rightEdgePoints: [], drivenLinePoints: [], centerPoints: [], projectedPoints: [], startPoint: null, pixelsPerMeter: 0 };
    }

    const padding = 40;
    const longExtent = d3.extent(data, d => d.long) as [number, number];
    const latExtent = d3.extent(data, d => d.lat) as [number, number];

    if (longExtent[0] === undefined || latExtent[0] === undefined) {
      return { leftEdgePoints: [], rightEdgePoints: [], drivenLinePoints: [], centerPoints: [], projectedPoints: [], startPoint: null, pixelsPerMeter: 0 };
    }

    let longRange = longExtent[1] - longExtent[0];
    let latRange = latExtent[1] - latExtent[0];
    if (longRange === 0) longRange = 0.0001;
    if (latRange === 0) latRange = 0.0001;

    const avgLatRad = (latExtent[0] + latExtent[1]) / 2 * (Math.PI / 180);
    const aspectCorrection = Math.cos(avgLatRad);

    const dataAspectRatio = (longRange * aspectCorrection) / latRange;
    const safeHeight = Math.max(height - padding * 2, 1);
    const containerAspectRatio = (width - padding * 2) / safeHeight;

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

    const rawPoints = data.map(d => ({
      x: xScale(d.long),
      y: yScale(d.lat),
      data: d,
      offsetMeters: d.trackEdge || 0
    }));

    const points: ProjectedPoint[] = [];
    if (rawPoints.length > 0) {
      points.push(rawPoints[0] as ProjectedPoint);
      for (let i = 1; i < rawPoints.length; i++) {
        const dx = rawPoints[i].x - points[points.length - 1].x;
        const dy = rawPoints[i].y - points[points.length - 1].y;
        if (Math.sqrt(dx * dx + dy * dy) > 0.5) points.push(rawPoints[i]);
      }
    }

    const maxOffsetFound = d3.max(data, d => Math.abs(d.trackEdge || 0)) || 10;
    const TRACK_HALF_WIDTH_METERS = Math.max(10, maxOffsetFound * 1.1);

    const widthInMeters = longRange * 111139 * aspectCorrection;
    const widthInPixels = xScale(longExtent[1]) - xScale(longExtent[0]);
    const pixelsPerMeter = widthInPixels / widthInMeters;
    const trackWidthPx = TRACK_HALF_WIDTH_METERS * pixelsPerMeter;

    const leftEdgePoints: [number, number][] = [];
    const rightEdgePoints: [number, number][] = [];
    const drivenLinePoints: [number, number][] = [];
    const centerPoints: [number, number][] = points.map(p => [p.x, p.y]);

    const add = (p: { x: number, y: number }, v: { x: number, y: number }, scale: number) =>
      [p.x + v.x * scale, p.y + v.y * scale] as [number, number];

    let prevTx = 1, prevTy = 0;

    for (let i = 0; i < points.length; i++) {
      const p = points[i];
      const prev = points[Math.max(0, i - 1)];
      const next = points[Math.min(points.length - 1, i + 1)];
      let tx = next.x - prev.x, ty = next.y - prev.y;
      const len = Math.sqrt(tx * tx + ty * ty);
      if (len < 1e-6) { tx = prevTx; ty = prevTy; }
      else { tx /= len; ty /= len; prevTx = tx; prevTy = ty; }

      const nx = -ty, ny = tx;
      leftEdgePoints.push(add(p, { x: nx, y: ny }, trackWidthPx));
      rightEdgePoints.push(add(p, { x: nx, y: ny }, -trackWidthPx));
      const offsetPx = p.offsetMeters * pixelsPerMeter;
      drivenLinePoints.push(add(p, { x: nx, y: ny }, offsetPx));
    }

    // Close the track loop visually if it's a loop?
    // Not strictly necessary for line drawing, but nice.
    // For now leaving as open lines.

    return { leftEdgePoints, rightEdgePoints, drivenLinePoints, centerPoints, projectedPoints: points, startPoint: points[0], pixelsPerMeter };
  }, [width, height, data]);


  // 4. Canvas Drawing
  useLayoutEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !geometry.pixelsPerMeter) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // High DPI
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    // Clear & Scale
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, width, height);

    // Apply Zoom Transform
    const { x, y, k } = zoomTransform;
    ctx.translate(x, y);
    ctx.scale(k, k);

    // Helpers
    const lineGen = d3.line().curve(d3.curveBasis).context(ctx);

    // Filter points visible in viewport? 
    // Hard to filter non-linear generic shapes. 
    // Canvas clipping handles it, but performance might suffer if we draw massive paths off-screen.
    // But 2000 points is trivial.

    // 1. Draw Track Edges (Gray Fill)
    // To fill, we need a closed shape: Left Line -> Reverse Right Line -> Close
    ctx.beginPath();
    lineGen(geometry.leftEdgePoints);
    // lineGen doesn't support "continue" typically for single array.
    // We need to manually link the second array in reverse.
    // Or just draw two lines and fill between? 
    // Easier: Draw simple lines for edges.

    // Actually, filling the track confirms the "Asphalt". 
    // Let's create a custom path.
    // Start at first left point.
    // Line to last left point.
    // Line to last right point.
    // Line to first right point.
    // Close.

    // d3.line is for one array.
    // Construct Combined Array: [...Left, ...Reverse(Right)]
    const trackPoly = [...geometry.leftEdgePoints, ...[...geometry.rightEdgePoints].reverse(), geometry.leftEdgePoints[0]];

    // Fill Track
    ctx.beginPath();
    d3.line().curve(d3.curveBasisClosed).context(ctx)(trackPoly); // curveBasisClosed creates smooth loop
    // But ends might not match well if not a loop.
    // Use curveBasis for open track?
    // Let's just Stroke Edges for now to replicate original "trackPath".
    // Original: trackPath = left + "L" + right(rev) + "Z". 
    // Yes, it was filled.
    ctx.fillStyle = "#2a2d36";
    ctx.fill();
    ctx.strokeStyle = "#4b5563";
    ctx.lineWidth = 1 / k;
    ctx.stroke();

    // 2. Draw Center Line
    ctx.beginPath();
    lineGen(geometry.centerPoints);
    ctx.strokeStyle = "rgba(255,255,255,0.1)";
    ctx.lineWidth = 1 / k;
    ctx.setLineDash([4 / k, 4 / k]); // Scale dash
    ctx.stroke();
    ctx.setLineDash([]);

    // 3. Draw Driven Line
    ctx.beginPath();
    lineGen(geometry.drivenLinePoints);
    ctx.strokeStyle = color;
    ctx.lineWidth = 2 / k;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.shadowColor = "rgba(0,0,0,0.5)";
    ctx.shadowBlur = 5;
    ctx.stroke();
    // Reset shadow
    ctx.shadowBlur = 0;
    ctx.shadowColor = "transparent";

  }, [width, height, geometry, zoomTransform, color]);


  // 5. Interaction (Active Marker)
  const activeMarker = useMemo<ProjectedPoint | null>(() => {
    if (hoverDistance === null || hoverDistance === undefined || !geometry.projectedPoints.length) return null;
    let closest = geometry.projectedPoints[0];
    let minDiff = Math.abs(closest.data.distance - hoverDistance);

    const bisector = d3.bisector((p: ProjectedPoint) => p.data.distance).left;
    const idx = bisector(geometry.projectedPoints, hoverDistance);

    if (idx < geometry.projectedPoints.length) {
      const p1 = geometry.projectedPoints[idx];
      const diff1 = Math.abs(p1.data.distance - hoverDistance);
      if (diff1 < minDiff) { closest = p1; minDiff = diff1; }
    }
    if (idx > 0) {
      const p0 = geometry.projectedPoints[idx - 1];
      const diff0 = Math.abs(p0.data.distance - hoverDistance);
      if (diff0 < minDiff) { closest = p0; }
    }
    return closest;
  }, [hoverDistance, geometry.projectedPoints]);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!geometry.projectedPoints.length || !containerRef.current || !onHover) return;
    const rect = containerRef.current.getBoundingClientRect();
    let mouseX = e.clientX - rect.left;
    let mouseY = e.clientY - rect.top;

    if (zoomTransform) {
      mouseX = (mouseX - zoomTransform.x) / zoomTransform.k;
      mouseY = (mouseY - zoomTransform.y) / zoomTransform.k;
    }

    let closest = null;
    let minDSq = Infinity;

    for (const p of geometry.projectedPoints) {
      const dx = p.x - mouseX;
      const dy = p.y - mouseY;
      const dSq = dx * dx + dy * dy;
      if (dSq < minDSq) { minDSq = dSq; closest = p; }
    }

    if (closest && minDSq < 2500) { // 50px radius
      onHover(closest.data);
    }
  };

  // Marker Coords for SVG Overlay (crisp)
  const k = zoomTransform.k;
  const markerCoords = useMemo(() => {
    if (!activeMarker || !geometry.projectedPoints.length) return null;
    const index = geometry.projectedPoints.indexOf(activeMarker as ProjectedPoint);
    if (index === -1) return null;

    const p = geometry.projectedPoints[index];
    const prev = geometry.projectedPoints[Math.max(0, index - 1)];
    const next = geometry.projectedPoints[Math.min(geometry.projectedPoints.length - 1, index + 1)];

    let tx = next.x - prev.x;
    let ty = next.y - prev.y;
    const len = Math.sqrt(tx * tx + ty * ty);
    if (len < 1e-6) { tx = 1; ty = 0; } else { tx /= len; ty /= len; }

    const nx = -ty, ny = tx;
    const offsetPx = p.offsetMeters * geometry.pixelsPerMeter;
    const cx = p.x + nx * offsetPx;
    const cy = p.y + ny * offsetPx;
    const markerLen = 10 / k;

    return { x1: cx - nx * markerLen, y1: cy - ny * markerLen, x2: cx + nx * markerLen, y2: cy + ny * markerLen };
  }, [activeMarker, geometry, k]);

  return (
    <div ref={containerRef} className={`w-full relative ${className}`} style={{ height }} onMouseMove={handleMouseMove} onMouseLeave={() => onHover && onHover(null)}>
      {/* CANVAS */}
      <canvas ref={canvasRef} className="absolute top-0 left-0 pointer-events-none" />

      {/* SVG Overlay */}
      {width > 0 && (
        <svg ref={svgRef} width={width} height={height} className="absolute top-0 left-0 overflow-hidden cursor-crosshair touch-none">
          <g transform={zoomTransform.toString()}>
            {geometry.startPoint && (
              <circle cx={geometry.startPoint.x} cy={geometry.startPoint.y} r={4 / k} fill="white" className="opacity-80" />
            )}
            {markerCoords && (
              <line
                x1={markerCoords.x1}
                y1={markerCoords.y1}
                x2={markerCoords.x2}
                y2={markerCoords.y2}
                stroke="red"
                strokeWidth={3 / k}
                strokeLinecap="round"
                className="drop-shadow-md"
              />
            )}
          </g>
        </svg>
      )}
      {!data || data.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center text-gray-500 text-sm pointer-events-none">
          No Track Data
        </div>
      )}
      <div className="absolute bottom-2 right-2 text-[10px] text-gray-500 bg-black/50 px-2 py-1 rounded pointer-events-none select-none">
        Scroll to Zoom • Drag to Pan
      </div>
    </div>
  );
}