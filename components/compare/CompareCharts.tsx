import DeltaLineChart from '@/components/DeltaLineChart';
import TyreWearAnalysis from '@/components/analysis/TyreWearAnalysis';
import { ZoomSynchronizer } from '@/utils/zoom';

interface CompareChartsProps {
    comparisonData: any[];
    hoverDistance: number | null;
    setHoverDistance: (d: number | null) => void;
    resolution: number;
    isFullRes?: boolean;
    refColor: string;
    compColor: string;
    zoomSync: ZoomSynchronizer;
    xDomain?: [number, number];
}

export default function CompareCharts({
    comparisonData, hoverDistance, setHoverDistance, resolution, isFullRes = false,
    refColor, compColor, zoomSync, xDomain
}: CompareChartsProps) {
    const tyreChannelRef = 'Tyres Wear_Ref';
    const tyreChannelComp = 'Tyres Wear_Comp';

    const targetPoints = isFullRes ? 1000000 : resolution;

    return (
        <div className="lg:col-span-2 space-y-6">

            {/* Primary Deltas */}
            <div className="bg-race-panel p-6 rounded-xl border border-gray-800 shadow-xl shadow-black/20">
                <DeltaLineChart
                    data={comparisonData} dataKeyRef="time_delta" label="Time Delta" unit="s"
                    height={220} hoverDistance={hoverDistance} onHover={setHoverDistance} isDelta={true}
                    targetPoints={targetPoints} colorRef={refColor} colorComp={compColor}
                    zoomSync={zoomSync} xDomain={xDomain}
                />
            </div>

            <div className="bg-race-panel p-6 rounded-xl border border-gray-800 shadow-lg">
                <DeltaLineChart
                    data={comparisonData} dataKeyRef="Ground Speed_Ref" dataKeyComp="Ground Speed_Comp" label="Speed" unit="km/h"
                    height={200} hoverDistance={hoverDistance} onHover={setHoverDistance}
                    targetPoints={targetPoints} colorRef={refColor} colorComp={compColor}
                    zoomSync={zoomSync} xDomain={xDomain}
                />
            </div>

            {/* Driver Inputs Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-race-panel p-5 rounded-lg border border-gray-800 shadow-md hover:border-gray-700 transition-colors">
                    <DeltaLineChart
                        data={comparisonData} dataKeyRef="Throttle Pos_Ref" dataKeyComp="Throttle Pos_Comp" label="Throttle" unit="%"
                        height={120} hoverDistance={hoverDistance} onHover={setHoverDistance}
                        targetPoints={targetPoints} colorRef={refColor} colorComp={compColor}
                        zoomSync={zoomSync} xDomain={xDomain}
                    />
                </div>
                <div className="bg-race-panel p-5 rounded-lg border border-gray-800 shadow-md hover:border-gray-700 transition-colors">
                    <DeltaLineChart
                        data={comparisonData} dataKeyRef="Brake Pos_Ref" dataKeyComp="Brake Pos_Comp" label="Brake" unit="%"
                        height={120} hoverDistance={hoverDistance} onHover={setHoverDistance}
                        targetPoints={targetPoints} colorRef={refColor} colorComp={compColor}
                        zoomSync={zoomSync} xDomain={xDomain}
                    />
                </div>
                <div className="bg-race-panel p-5 rounded-lg border border-gray-800 md:col-span-2 shadow-md hover:border-gray-700 transition-colors">
                    <DeltaLineChart
                        data={comparisonData} dataKeyRef="Steering Pos_Ref" dataKeyComp="Steering Pos_Comp" label="Steering" unit="rad"
                        height={150} hoverDistance={hoverDistance} onHover={setHoverDistance}
                        targetPoints={targetPoints} colorRef={refColor} colorComp={compColor}
                        zoomSync={zoomSync} xDomain={xDomain}
                    />
                </div>
            </div>

            {/* Secondary Telemetry */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                    { keyRef: 'Gear_Ref', keyComp: 'Gear_Comp', label: 'Gear', unit: '#' },
                    { keyRef: 'Fuel Level_Ref', keyComp: 'Fuel Level_Comp', label: 'Fuel', unit: 'L' },
                    { keyRef: 'Virtual Energy_Ref', keyComp: 'Virtual Energy_Comp', label: 'Energy', unit: 'J' }
                ].map((chart, i) => (
                    <div key={i} className="bg-race-panel p-4 rounded-lg border border-gray-800 hover:border-gray-700 transition-colors">
                        <DeltaLineChart
                            data={comparisonData} dataKeyRef={chart.keyRef} dataKeyComp={chart.keyComp} label={chart.label} unit={chart.unit}
                            height={100} hoverDistance={hoverDistance} onHover={setHoverDistance}
                            targetPoints={targetPoints} colorRef={refColor} colorComp={compColor}
                            zoomSync={zoomSync} xDomain={xDomain}
                        />
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-race-panel p-4 rounded-lg border border-gray-800">
                    <DeltaLineChart
                        data={comparisonData} dataKeyRef="TC_Ref" dataKeyComp="TC_Comp" label="TC Active" unit="bool"
                        height={80} hoverDistance={hoverDistance} onHover={setHoverDistance}
                        targetPoints={targetPoints} colorRef={refColor} colorComp={compColor}
                        zoomSync={zoomSync} xDomain={xDomain}
                    />
                </div>
                <div className="bg-race-panel p-4 rounded-lg border border-gray-800">
                    <DeltaLineChart
                        data={comparisonData} dataKeyRef="ABS_Ref" dataKeyComp="ABS_Comp" label="ABS Active" unit="bool"
                        height={80} hoverDistance={hoverDistance} onHover={setHoverDistance}
                        targetPoints={targetPoints} colorRef={refColor} colorComp={compColor}
                        zoomSync={zoomSync} xDomain={xDomain}
                    />
                </div>
            </div>

            <TyreWearAnalysis
                hoverDistance={hoverDistance} onHover={setHoverDistance}
                data={comparisonData} channelRef={tyreChannelRef} channelComp={tyreChannelComp}
                colors={{ main: refColor, comp: compColor }}
                zoomSync={zoomSync} xDomain={xDomain}
            />
        </div>
    );
}
