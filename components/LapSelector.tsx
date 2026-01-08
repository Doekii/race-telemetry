'use client';

import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Flag, Loader2, Check } from 'lucide-react';
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
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const selectedLapData = laps?.find(l => l.lap_number === selected);

    return (
        <div className="w-full relative min-w-[140px]" ref={dropdownRef}>
            <label className="block text-[10px] uppercase font-bold text-gray-400 tracking-wider mb-1.5 ml-1">
                Select Lap
            </label>

            <button
                onClick={() => !disabled && !isLoading && setIsOpen(!isOpen)}
                disabled={disabled || isLoading}
                className={`
                    w-full flex items-center justify-between gap-3 px-4 py-3 
                    bg-gray-900/50 hover:bg-gray-900/80 backdrop-blur-sm
                    border border-gray-700/50 hover:border-gray-600
                    rounded-xl transition-all duration-200 group
                    ${isOpen ? 'ring-2 ring-telemetry-blue/50 border-telemetry-blue/50' : ''}
                    ${disabled ? 'opacity-50 cursor-not-allowed bg-gray-900/30' : ''}
                `}
            >
                <div className="flex items-center gap-3">
                    <div className={`p-1.5 rounded-lg transition-colors ${selected ? 'bg-purple-500/10 text-purple-400' : 'bg-gray-800 text-gray-400'}`}>
                        {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Flag className="w-4 h-4" />}
                    </div>

                    <div className="flex flex-col items-start">
                        {selected ? (
                            <span className="text-white font-bold text-sm tracking-wide">Lap {selected}</span>
                        ) : (
                            <span className="text-gray-500 text-sm italic">--</span>
                        )}
                    </div>
                </div>
                <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown Grid */}
            {isOpen && (
                <div className="absolute z-50 w-[280px] mt-2 right-0 bg-[#0f1116] border border-gray-800 rounded-xl shadow-2xl shadow-black/50 p-2 animate-in fade-in zoom-in-95 duration-100 origin-top-right">
                    <div className="text-[10px] uppercase font-bold text-gray-500 px-2 py-1 mb-1">Available Laps</div>

                    <div className="max-h-[300px] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-800 scrollbar-track-transparent">
                        <div className="grid grid-cols-4 gap-1.5">
                            {laps?.map((lap) => (
                                <button
                                    key={lap.lap_number}
                                    onClick={() => {
                                        onSelect(lap.lap_number);
                                        setIsOpen(false);
                                    }}
                                    className={`
                                        flex flex-col items-center justify-center p-2 rounded-lg border transition-all
                                        ${selected === lap.lap_number
                                            ? 'bg-purple-500/20 border-purple-500/50 text-white shadow-[0_0_10px_rgba(168,85,247,0.2)]'
                                            : 'bg-gray-900 border-gray-800 text-gray-400 hover:bg-gray-800 hover:border-gray-600 hover:text-white'
                                        }
                                    `}
                                >
                                    <span className="text-xs font-bold">L{lap.lap_number}</span>
                                    {/* Placeholder for lap time if available later */}
                                    {/* <span className="text-[9px] opacity-60 font-mono">1:24.5</span> */}
                                </button>
                            ))}
                        </div>
                        {(!laps || laps.length === 0) && (
                            <div className="py-6 text-center text-gray-500 text-xs italic">
                                No laps available
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}