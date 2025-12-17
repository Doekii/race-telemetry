'use client';

import { ChevronDown, Flag, Loader2 } from 'lucide-react';
import { LapItem } from '@/types/api';

interface LapSelectorProps {
    laps: LapItem[];
    selected: number | null;
    onSelect: (lap: number) => void;
    isLoading: boolean;
    disabled: boolean;
}

export default function LapSelector({
    laps,
    selected,
    onSelect,
    isLoading,
    disabled
}: LapSelectorProps) {

    return (
        <div className="w-full max-w-[200px]">
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                Select Lap
            </label>

            <div className="relative group">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                    {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Flag className="w-4 h-4" />}
                </div>

                <select
                    value={selected ?? ''}
                    onChange={(e) => onSelect(Number(e.target.value))}
                    disabled={disabled || isLoading}
                    className="w-full appearance-none bg-race-panel text-white pl-10 pr-8 py-3 rounded-lg border border-gray-700 
                     focus:outline-none focus:ring-2 focus:ring-telemetry-blue focus:border-transparent
                     disabled:opacity-50 disabled:cursor-not-allowed
                     hover:border-gray-500 transition-colors"
                >
                    <option className="bg-gray-900" value="" disabled>
                        {isLoading ? "Loading..." : "-- Lap --"}
                    </option>

                    {laps?.map((lap) => (
                        <option key={lap.lap_number} value={lap.lap_number} className="bg-gray-900">
                            Lap {lap.lap_number}
                        </option>
                    ))}
                </select>

                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                    <ChevronDown className="w-4 h-4" />
                </div>
            </div>
        </div>
    );
}