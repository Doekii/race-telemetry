interface DashboardActiveSessionProps {
    sessionName: string | null;
    lapNumber: number | null;
}

export default function DashboardActiveSession({ sessionName, lapNumber }: DashboardActiveSessionProps) {
    return (
        <div className="bg-gradient-to-br from-gray-900 to-gray-950 border border-gray-800 rounded-xl p-6 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-telemetry-blue/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />

            <div className="text-[10px] uppercase text-gray-400 font-bold mb-2 tracking-widest">Active Session</div>
            <div className="text-white font-mono text-sm break-all leading-relaxed opacity-90 mb-6 border-l-2 border-telemetry-blue pl-3 py-1">
                {sessionName}
            </div>

            <div className="flex items-center justify-between border-t border-gray-800/50 pt-4 mt-2">
                <span className="text-xs text-gray-500 uppercase font-bold tracking-wider">Current Lap</span>
                <span className="text-4xl text-white font-mono font-bold tracking-tighter shadow-telemetry-glow">
                    #{lapNumber}
                </span>
            </div>
        </div>
    );
}
