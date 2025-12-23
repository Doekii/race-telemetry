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
  targetPoints?: number;
}

export default function TrackMap({ 
  data, 
  color = "#3b82f6", 
  height = 400,
  className,
  onHover,
  hoverDistance,
  targetPoints = 4000
}: TrackMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [width, setWidth] = useState(0);
  const [zoomTransform, setZoomTransform] = useState<d3.ZoomTransform | null>(null);

  // 1. Responsive: Measure container width
  useEffect(() => {
    if (!containerRef.current) return;
    const resizeObserver = new ResizeObserver((entries) => {
      setWidth(entries[0].contentRect.width);
    });
    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  // 2. Setup Zoom Behavior
  useEffect(() => {
    if (!svgRef.current || width === 0) return;
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([1, 20])
      .extent([[0, 0], [width, height]])
      .on("zoom", (event) => setZoomTransform(event.transform));

    const selection = d3.select(svgRef.current);
    selection.call(zoom);
    
    // Double click to reset
    selection.on("dblclick.zoom", () => {
      selection.transition().duration(750).call(zoom.transform, d3.zoomIdentity);
    });
    return () => { selection.on(".zoom", null); };
  }, [width, height]);

  // 3. Downsample Data (Optimization)
  const downsampledData = useMemo(() => {
    if (targetPoints <= 0) return [];
    if (!data || data.length <= targetPoints) return data;
    const step = Math.ceil(data.length / targetPoints);
    return data.filter((_, i) => i % step === 0);
  }, [data, targetPoints]);

  // ---------------------------------------------------------
  // CORE GEOMETRY CALCULATION
  // ---------------------------------------------------------
  const geometry = useMemo(() => {
    if (width === 0 || !downsampledData || downsampledData.length === 0) {
      return { trackPath: '', linePath: '', centerPath: '', projectedPoints: [], startPoint: null, pixelsPerMeter: 0 };
    }

    const padding = 40; 

    // A. Calculate Projection Scales
    const longExtent = d3.extent(downsampledData, d => d.long) as [number, number];
    const latExtent = d3.extent(downsampledData, d => d.lat) as [number, number];
    
    if (!longExtent[0] || !latExtent[0]) return { trackPath: '', linePath: '', centerPath: '', projectedPoints: [], startPoint: null, pixelsPerMeter: 0 };

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

    // B. Project Points & Filter Duplicates
    const rawPoints = downsampledData.map(d => ({
      x: xScale(d.long),
      y: yScale(d.lat),
      data: d,
      offsetMeters: d.trackEdge || 0
    }));

    const points = [];
    if (rawPoints.length > 0) {
      points.push(rawPoints[0]);
      for (let i = 1; i < rawPoints.length; i++) {
        const dx = rawPoints[i].x - points[points.length - 1].x;
        const dy = rawPoints[i].y - points[points.length - 1].y;
        if (Math.sqrt(dx*dx + dy*dy) > 0.5) {
          points.push(rawPoints[i]);
        }
      }
    }

    // C. Dynamic Track Width Normalization
    const maxOffsetFound = d3.max(downsampledData, d => Math.abs(d.trackEdge || 0)) || 10;
    const TRACK_HALF_WIDTH_METERS = Math.max(10, maxOffsetFound * 1.1);

    // D. Calculate Scale Factor (Pixels per Meter)
    const widthInMeters = longRange * 111139 * aspectCorrection;
    const widthInPixels = xScale(longExtent[1]) - xScale(longExtent[0]);
    const pixelsPerMeter = widthInPixels / widthInMeters;

    const trackWidthPx = TRACK_HALF_WIDTH_METERS * pixelsPerMeter;

    // E. Compute Geometry
    const leftEdgePoints: [number, number][] = [];
    const rightEdgePoints: [number, number][] = [];
    const drivenLinePoints: [number, number][] = [];

    const add = (p: {x:number, y:number}, v: {x:number, y:number}, scale: number) => 
      [p.x + v.x * scale, p.y + v.y * scale] as [number, number];

    let prevTx = 1;
    let prevTy = 0;

    for (let i = 0; i < points.length; i++) {
      const p = points[i];
      const prev = points[Math.max(0, i - 1)];
      const next = points[Math.min(points.length - 1, i + 1)];
      
      let tx = next.x - prev.x;
      let ty = next.y - prev.y;
      
      const len = Math.sqrt(tx*tx + ty*ty);

      if (len < 1e-6) {
        tx = prevTx;
        ty = prevTy;
      } else {
        tx /= len;
        ty /= len;
        prevTx = tx;
        prevTy = ty;
      }

      const nx = -ty;
      const ny = tx;

      leftEdgePoints.push(add(p, {x: nx, y: ny}, trackWidthPx));
      rightEdgePoints.push(add(p, {x: nx, y: ny}, -trackWidthPx));

      const offsetPx = p.offsetMeters * pixelsPerMeter;
      drivenLinePoints.push(add(p, {x: nx, y: ny}, offsetPx));
    }

    const lineGen = d3.line().curve(d3.curveBasis);
    
    const leftPath = lineGen(leftEdgePoints);
    const rightPath = lineGen(rightEdgePoints.reverse());
    
    const trackPath = (leftPath && rightPath) 
      ? leftPath + "L" + rightPath.substring(1) + "Z"
      : '';
      
    const linePath = lineGen(drivenLinePoints) || '';
    const centerPath = lineGen(points.map(p => [p.x, p.y])) || '';

    return {
      trackPath,
      linePath,
      centerPath,
      projectedPoints: points, 
      startPoint: points[0],
      pixelsPerMeter
    };

  }, [width, height, downsampledData]);

  // 4. Active Marker Logic
  const activeMarker = useMemo(() => {
    if (hoverDistance === null || hoverDistance === undefined || !geometry.projectedPoints.length) return null;
    return d3.least(geometry.projectedPoints, p => Math.abs(p.data.distance - hoverDistance));
  }, [hoverDistance, geometry.projectedPoints]);

  // 5. Mouse Interaction
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!geometry.projectedPoints.length || !containerRef.current || !onHover) return;
    const rect = containerRef.current.getBoundingClientRect();
    let mouseX = e.clientX - rect.left;
    let mouseY = e.clientY - rect.top;

    if (zoomTransform) {
      mouseX = (mouseX - zoomTransform.x) / zoomTransform.k;
      mouseY = (mouseY - zoomTransform.y) / zoomTransform.k;
    }

    const closest = d3.least(geometry.projectedPoints, p => {
      const dx = p.x - mouseX;
      const dy = p.y - mouseY;
      return dx * dx + dy * dy;
    });

    if (closest) onHover(closest.data);
  };

  const handleMouseLeave = () => { if (onHover) onHover(null); };
  
  const k = zoomTransform?.k || 1;

  // Render Logic for Marker Line
  const getMarkerLine = () => {
    if (!activeMarker || !geometry.projectedPoints.length) return null;

    const index = geometry.projectedPoints.indexOf(activeMarker);
    if (index === -1) return null;

    const p = geometry.projectedPoints[index];
    const prev = geometry.projectedPoints[Math.max(0, index - 1)];
    const next = geometry.projectedPoints[Math.min(geometry.projectedPoints.length - 1, index + 1)];

    let tx = next.x - prev.x;
    let ty = next.y - prev.y;
    const len = Math.sqrt(tx*tx + ty*ty);
    
    if (len < 1e-6) { tx = 1; ty = 0; } 
    else { tx /= len; ty /= len; }

    const nx = -ty;
    const ny = tx;

    // Move from center to ideal line
    const offsetPx = p.offsetMeters * geometry.pixelsPerMeter;
    const cx = p.x + nx * offsetPx;
    const cy = p.y + ny * offsetPx;

    // Line dimensions (perpendicular to track)
    // Length of the red line marker (e.g., 20px)
    const markerLen = 10 / k; 

    return {
      x1: cx - nx * markerLen,
      y1: cy - ny * markerLen,
      x2: cx + nx * markerLen,
      y2: cy + ny * markerLen
    };
  };

  const markerCoords = getMarkerLine();

  return (
    <div ref={containerRef} className={`w-full relative ${className}`} style={{ height }} onMouseMove={handleMouseMove} onMouseLeave={handleMouseLeave}>
      {width > 0 && geometry.trackPath && (
        <svg ref={svgRef} width={width} height={height} className="overflow-hidden cursor-crosshair touch-none">
          <g transform={zoomTransform ? zoomTransform.toString() : ""}>
            {/* Track Ribbon */}
            <path 
              d={geometry.trackPath} 
              fill="#2a2d36" 
              stroke="#4b5563" 
              strokeWidth={1 / k} 
              vectorEffect="non-scaling-stroke"
            />
            
            {/* Center Line (Reference) */}
            <path 
              d={geometry.centerPath} 
              fill="none" 
              stroke="white" 
              strokeOpacity={0.1}
              strokeWidth={1 / k}
              vectorEffect="non-scaling-stroke"
              strokeDasharray="4 4"
            />

            {/* Driven Line */}
            <path 
              d={geometry.linePath} 
              fill="none" 
              stroke={color} 
              strokeWidth={2} 
              vectorEffect="non-scaling-stroke"
              strokeLinejoin="round" 
              strokeLinecap="round" 
              className="drop-shadow-lg"
            />

            {/* Start/Finish */}
            {geometry.startPoint && (
              <circle cx={geometry.startPoint.x} cy={geometry.startPoint.y} r={4 / k} fill="white" className="opacity-80" />
            )}

            {/* Active Marker (Red Line on Ideal Line) */}
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
      <div className="absolute bottom-2 right-2 text-[10px] text-gray-500 bg-black/50 px-2 py-1 rounded pointer-events-none select-none">
        Scroll to Zoom • Drag to Pan
      </div>
    </div>
  );
}