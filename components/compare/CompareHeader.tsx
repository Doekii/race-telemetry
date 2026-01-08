import { ZoomSynchronizer } from '@/utils/zoom';
import { Settings2, ArrowLeft, ZoomOut, Zap } from 'lucide-react';
import Link from 'next/link';

interface CompareHeaderProps {
    zoomSync: ZoomSynchronizer;

    resolution: number;
    setResolution: (val: number) => void;
    isFullRes: boolean;
    setIsFullRes: (val: boolean) => void;
}

export default function CompareHeader({ zoomSync, resolution, setResolution, isFullRes, setIsFullRes }: CompareHeaderProps) {
    return (
        <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6 border-b border-gray-800/60 pb-6">
            <div className="flex items-center gap-4">
                <Link href="/" className="p-2.5 bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white rounded-xl border border-gray-700/50 hover:border-gray-600 transition-all shadow-sm group">
                    <ArrowLeft className="w-5 h-5 group-hover:-translate-x-0.5 transition-transform" />
                </Link>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                        Compare Analysis
                    </h1>
                    <p className="text-gray-400 text-xs font-medium tracking-wide mt-0.5">Reference vs Comparison Overlay</p>
                </div>
            </div>

            <div className="flex items-center gap-4 bg-gray-900/40 p-1.5 rounded-xl border border-gray-800/60 backdrop-blur-sm">
                <button
                    onClick={() => zoomSync.reset()}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-800/50 hover:bg-gray-700 text-gray-400 hover:text-white rounded-lg border border-transparent hover:border-gray-700 transition-all text-xs font-bold uppercase tracking-wider"
                >
                    <ZoomOut className="w-3.5 h-3.5" />
                    Reset Zoom
                </button>

                <div className="w-px h-6 bg-gray-800" />

                <div className="flex items-center gap-3 px-2">
                    <button
                        onClick={() => setIsFullRes(!isFullRes)}
                        className={`p-1.5 rounded-lg border transition-all ${isFullRes
                            ? 'bg-telemetry-blue text-white border-telemetry-blue shadow-[0_0_10px_rgba(6,182,212,0.5)]'
                            : 'bg-gray-800 text-gray-500 border-gray-700 hover:text-gray-300'
                            }`}
                        title="Toggle Full Resolution (Disable Downsampling)"
                    >
                        <Zap className="w-4 h-4" />
                    </button>

                    <div className={`flex items-center gap-3 transition-opacity duration-300 ${isFullRes ? 'opacity-30 pointer-events-none' : 'opacity-100'}`}>
                        <input
                            type="range" min={100} max={20000} step={100}
                            value={resolution} onChange={e => setResolution(Number(e.target.value))}
                            className="w-24 h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-telemetry-blue"
                            disabled={isFullRes}
                        />
                        <span className="text-xs font-mono text-gray-400 w-12 text-right">{isFullRes ? 'MAX' : `${resolution}pts`}</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
