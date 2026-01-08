import SessionSelector from '@/components/SessionSelector';
import LapSelector from '@/components/LapSelector';
import { LapItem } from '@/types/api';

interface CompareSelectionCardProps {
    type: 'REF' | 'CMP';
    title: string;
    color: string;
    setColor: (c: string) => void;
    sessions: string[];
    selectedSession: string | null;
    setSession: (s: string | null) => void;
    laps: LapItem[];
    selectedLap: number | null;
    setLap: (l: number | null) => void;
    sessionsLoading: boolean;
    sessionsError: boolean;
    lapsLoading: boolean;
}

export default function CompareSelectionCard({
    type, title, color, setColor,
    sessions, selectedSession, setSession, sessionsLoading, sessionsError,
    laps, selectedLap, setLap, lapsLoading
}: CompareSelectionCardProps) {
    const isRef = type === 'REF';
    const borderColor = isRef ? 'border-l-cyan-500/50' : 'border-l-rose-500/50';
    const iconBg = isRef ? 'bg-cyan-500/10' : 'bg-rose-500/10';
    const iconText = isRef ? 'text-cyan-400' : 'text-rose-400';
    const iconBorder = isRef ? 'border-cyan-500/20' : 'border-rose-500/20';
    const shadow = isRef ? 'shadow-[0_0_15px_rgba(6,182,212,0.1)]' : 'shadow-[0_0_15px_rgba(244,63,94,0.1)]';

    return (
        <div className={`bg-gray-900/40 rounded-2xl p-4 border border-y border-r border-gray-800 border-l-4 ${borderColor} flex flex-col gap-4 relative`}>

            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg ${iconBg} flex items-center justify-center ${iconText} border ${iconBorder} ${shadow}`}>
                        <span className="font-bold text-xs">{type}</span>
                    </div>
                    <span className="text-sm font-medium text-gray-300">{title}</span>
                </div>
                <input
                    type="color"
                    value={color}
                    onChange={e => setColor(e.target.value)}
                    className="w-6 h-6 bg-transparent border-none cursor-pointer rounded overflow-hidden"
                    title="Change Color"
                />
            </div>

            <div className="flex flex-col md:flex-row gap-3">
                <div className="flex-grow z-20">
                    <SessionSelector
                        sessions={sessions}
                        selected={selectedSession}
                        onSelect={setSession}
                        isLoading={sessionsLoading}
                        isError={sessionsError}
                    />
                </div>
                <div className="md:w-40 flex-shrink-0 z-10">
                    <LapSelector
                        laps={laps}
                        selected={selectedLap}
                        onSelect={setLap}
                        isLoading={lapsLoading}
                        disabled={!selectedSession}
                    />
                </div>
            </div>
        </div>
    );
}
