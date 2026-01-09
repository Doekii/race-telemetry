interface CompareSessionManifestProps {
    refColor: string;
    refSession: string | null;
    refLap: number | null;
    compColor: string;
    compSession: string | null;
    compLap: number | null;
    dataPoints: number;
}

export default function CompareSessionManifest({
    refColor, refSession, refLap,
    compColor, compSession, compLap,
    dataPoints
}: CompareSessionManifestProps) {
    return (
        <div className="bg-gradient-to-br from-gray-900 to-gray-950 border border-gray-800 rounded-xl p-6 relative overflow-hidden group shadow-lg">
            <div className="absolute top-0 right-0 w-40 h-40 bg-purple-500/5 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />

            <h3 className="text-gray-400 text-[10px] font-bold uppercase tracking-widest mb-6 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-gray-500"></span> Session Manifest
            </h3>

            <div className="space-y-6">
                <div className="relative pl-4 border-l-2 transition-colors duration-300" style={{ borderColor: refColor }}>
                    <div className="absolute -left-[5px] top-0 w-2 h-2 rounded-full ring-4 ring-gray-900" style={{ backgroundColor: refColor }} />
                    <div className="text-[10px] uppercase font-bold mb-1 opacity-70" style={{ color: refColor }}>Reference Session</div>
                    <div className="text-white font-mono text-xs break-all leading-relaxed opacity-90 mb-2">{refSession || 'Not selected'}</div>
                    {refLap && <div className="inline-block px-2 py-0.5 rounded bg-gray-800 text-xs font-mono font-bold border border-gray-700">Lap {refLap}</div>}
                </div>

                <div className="relative pl-4 border-l-2 transition-colors duration-300" style={{ borderColor: compColor }}>
                    <div className="absolute -left-[5px] top-0 w-2 h-2 rounded-full ring-4 ring-gray-900" style={{ backgroundColor: compColor }} />
                    <div className="text-[10px] uppercase font-bold mb-1 opacity-70" style={{ color: compColor }}>Comparison Session</div>
                    <div className="text-white font-mono text-xs break-all leading-relaxed opacity-90 mb-2">{compSession || 'Not selected'}</div>
                    {compLap && <div className="inline-block px-2 py-0.5 rounded bg-gray-800 text-xs font-mono font-bold border border-gray-700">Lap {compLap}</div>}
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4 border-t border-gray-800/50 pt-4 mt-6">
                <div>
                    <div className="text-[10px] uppercase text-gray-500 font-bold mb-1">Data Points</div>
                    <div className="text-xl text-gray-300 font-mono font-bold">{dataPoints.toLocaleString()}</div>
                </div>
            </div>
        </div>
    );
}
