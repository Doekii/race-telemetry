import { Settings2, ArrowRightLeft, ZoomOut } from 'lucide-react';
import Link from 'next/link';
import { ZoomSynchronizer } from '@/utils/zoom';

interface DashboardHeaderProps {
    zoomSync: ZoomSynchronizer;
    resolution: number;
    setResolution: (val: number) => void;
    maxResolution: number;
    hasData: boolean;
}

export default function DashboardHeader({ zoomSync, resolution, setResolution, maxResolution, hasData }: DashboardHeaderProps) {
    return (
        <div className="flex flex-col xl:flex-row justify-between items-start xl:items-end gap-6 border-b border-gray-800/60 pb-6">

            {/* Logo & Title */}
            <div className="flex-shrink-0">
                <div className="flex items-center gap-3 mb-1">
                    <div className="w-2 h-8 bg-gradient-to-b from-telemetry-blue to-purple-600 rounded-full" />
                    <h1 className="text-3xl font-bold tracking-tight text-white">
                        Telemetry<span className="text-transparent bg-clip-text bg-gradient-to-r from-telemetry-blue to-purple-500">Hub</span>
                    </h1>
                </div>
                <p className="text-gray-400 text-sm font-medium tracking-wide">Professional Race Analysis Dashboard</p>
            </div>

            {/* Action Area */}
            <div className="flex flex-col xl:flex-row gap-6 w-full xl:w-auto items-end xl:items-center">

                {/* Toolbar */}
                <div className="flex items-center gap-3 bg-gray-900/40 p-1.5 rounded-xl border border-gray-800/60 backdrop-blur-sm">
                    <Link
                        href="/compare"
                        className="flex items-center gap-2 px-4 py-2.5 bg-gray-800 hover:bg-gray-700 hover:text-white text-gray-300 rounded-lg border border-gray-700/50 transition-all text-xs font-bold uppercase tracking-wider shadow-sm"
                    >
                        <ArrowRightLeft className="w-3.5 h-3.5" />
                        Compare Laps
                    </Link>

                    <div className="w-px h-8 bg-gray-800 mx-1" />

                    <button
                        onClick={() => zoomSync.reset()}
                        className="flex items-center gap-2 px-4 py-2.5 bg-gray-800/50 hover:bg-gray-700 text-gray-400 hover:text-white rounded-lg border border-transparent hover:border-gray-700 transition-all text-xs font-bold uppercase tracking-wider"
                    >
                        <ZoomOut className="w-3.5 h-3.5" />
                        Reset Zoom
                    </button>
                </div>

                {/* Resolution Slider */}
                <div className="hidden md:flex flex-col items-end mr-2 group">
                    <div className="flex items-center gap-2 text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5 opacity-70 group-hover:opacity-100 transition-opacity">
                        <Settings2 className="w-3 h-3" />
                        Data Resolution
                    </div>
                    <div className="flex items-center gap-3 bg-gray-900/30 px-3 py-1.5 rounded-lg border border-gray-800/30">
                        <input
                            type="range" min={100} max={maxResolution || 20000} step={100}
                            value={resolution} onChange={(e) => setResolution(Number(e.target.value))}
                            disabled={!hasData}
                            className="w-32 h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-telemetry-blue hover:accent-purple-500 transition-colors"
                        />
                        <span className="text-xs text-gray-400 font-mono w-14 text-right">{resolution} pts</span>
                    </div>
                </div>

            </div>
        </div>
    );
}
