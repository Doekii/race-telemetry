import D3LineChart from '@/components/D3LineChart';
import { ZoomSynchronizer } from '@/utils/zoom';

interface DashboardChartsProps {
    telemetryData: any[];
    hoveredDistance: number | null;
    setHoveredDistance: (d: number | null) => void;
    resolution: number;
    zoomSync: ZoomSynchronizer;
    xDomain?: [number, number];
}

export default function DashboardCharts({
    telemetryData, hoveredDistance, setHoveredDistance, resolution, zoomSync, xDomain
}: DashboardChartsProps) {
    return (
        <div className="lg:col-span-2 space-y-6">
            <div className="bg-race-panel p-6 rounded-xl border border-gray-800 shadow-xl shadow-black/20">
                <D3LineChart
                    title="Speed Trace (km/h)" data={telemetryData} dataKey="speed" color="#3b82f6"
                    height={300} hoverDistance={hoveredDistance} onHover={setHoveredDistance}
                    targetPoints={resolution} zoomSync={zoomSync} xDomain={xDomain}
                />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-race-panel p-5 rounded-xl border border-gray-800 shadow-lg">
                    <D3LineChart
                        title="Engine RPM" data={telemetryData} dataKey="rpm" color="#ef4444"
                        height={180} hoverDistance={hoveredDistance} onHover={setHoveredDistance}
                        targetPoints={resolution} zoomSync={zoomSync} xDomain={xDomain}
                    />
                </div>
                <div className="bg-race-panel p-5 rounded-xl border border-gray-800 shadow-lg">
                    <D3LineChart
                        title="Throttle (%)" data={telemetryData} dataKey="throttle" color="#22c55e"
                        height={180} hoverDistance={hoveredDistance} onHover={setHoveredDistance}
                        targetPoints={resolution} zoomSync={zoomSync} xDomain={xDomain}
                    />
                </div>
            </div>
        </div>
    );
}
