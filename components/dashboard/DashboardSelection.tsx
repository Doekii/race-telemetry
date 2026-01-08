import SessionSelector from '@/components/SessionSelector';
import LapSelector from '@/components/LapSelector';
import { LapItem } from '@/types/api';

interface DashboardSelectionProps {
    sessions: string[];
    sessionsLoading: boolean;
    sessionsError: boolean;
    selectedSession: string | null;
    setSelectedSession: (s: string | null) => void;
    laps: LapItem[];
    lapsLoading: boolean;
    selectedLap: number | null;
    setSelectedLap: (l: number | null) => void;
}

export default function DashboardSelection({
    sessions, sessionsLoading, sessionsError, selectedSession, setSelectedSession,
    laps, lapsLoading, selectedLap, setSelectedLap
}: DashboardSelectionProps) {
    return (
        <div className="flex flex-col md:flex-row gap-4 w-full">
            <div className="flex-grow max-w-2xl">
                <SessionSelector
                    sessions={sessions} isLoading={sessionsLoading} isError={sessionsError}
                    selected={selectedSession} onSelect={setSelectedSession}
                />
            </div>
            <div className="w-full md:w-auto min-w-[180px]">
                <LapSelector
                    laps={laps} selected={selectedLap} onSelect={setSelectedLap}
                    isLoading={lapsLoading} disabled={!selectedSession}
                />
            </div>
        </div>
    );
}
