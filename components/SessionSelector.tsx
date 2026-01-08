'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronDown, Database, Loader2, Search, Check } from 'lucide-react';

interface SessionSelectorProps {
    sessions: string[];
    selected: string | null;
    onSelect: (session: string) => void;
    isLoading: boolean;
    isError: boolean;
}

export default function SessionSelector({
    sessions,
    selected,
    onSelect,
    isLoading,
    isError
}: SessionSelectorProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const filteredSessions = useMemo(() => {
        if (!search) return sessions;
        return sessions?.filter(s => s.toLowerCase().includes(search.toLowerCase())) || [];
    }, [sessions, search]);

    return (
        <div className="w-full relative" ref={dropdownRef}>
            <label className="block text-[10px] uppercase font-bold text-gray-400 tracking-wider mb-1.5 ml-1">
                Select Session
            </label>

            <button
                onClick={() => !isLoading && !isError && setIsOpen(!isOpen)}
                disabled={isLoading || isError}
                className={`
                    w-full flex items-center justify-between gap-3 px-4 py-3 
                    bg-gray-900/50 hover:bg-gray-900/80 backdrop-blur-sm
                    border border-gray-700/50 hover:border-gray-600
                    rounded-xl transition-all duration-200 group
                    ${isOpen ? 'ring-2 ring-telemetry-blue/50 border-telemetry-blue/50' : ''}
                    ${isLoading ? 'opacity-70 cursor-wait' : ''}
                    ${isError ? 'opacity-70 cursor-not-allowed border-red-900/50 bg-red-900/10' : ''}
                `}
            >
                <div className="flex items-center gap-3 overflow-hidden">
                    <div className={`
                         p-1.5 rounded-lg transition-colors
                         ${selected ? 'bg-telemetry-blue/10 text-telemetry-blue' : 'bg-gray-800 text-gray-400 group-hover:text-gray-300'}
                    `}>
                        {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Database className="w-4 h-4" />}
                    </div>
                    <div className="flex flex-col items-start truncate">
                        {selected ? (
                            <span className="text-white font-medium text-sm truncate">{selected}</span>
                        ) : (
                            <span className="text-gray-500 text-sm italic">
                                {isLoading ? "Loading sessions..." : isError ? "Connection Error" : "Choose a session..."}
                            </span>
                        )}
                    </div>
                </div>
                <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown Menu */}
            {isOpen && (
                <div className="absolute z-50 w-full mt-2 bg-[#0f1116] border border-gray-800 rounded-xl shadow-2xl shadow-black/50 overflow-hidden animate-in fade-in zoom-in-95 duration-100 origin-top">

                    {/* Search Header */}
                    <div className="p-2 border-b border-gray-800/50 sticky top-0 bg-[#0f1116]/95 backdrop-blur z-10">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                            <input
                                type="text"
                                placeholder="Search sessions..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="w-full bg-gray-900/50 text-gray-200 text-sm rounded-lg pl-9 pr-3 py-2 border border-gray-800 focus:outline-none focus:border-telemetry-blue/50 focus:ring-1 focus:ring-telemetry-blue/20 placeholder:text-gray-600"
                                autoFocus
                            />
                        </div>
                    </div>

                    {/* Scrollable List */}
                    <div className="max-h-[300px] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-800 scrollbar-track-transparent">
                        {filteredSessions && filteredSessions.length > 0 ? (
                            <div className="p-1.5 space-y-0.5">
                                {filteredSessions.map((session) => (
                                    <button
                                        key={session}
                                        onClick={() => {
                                            onSelect(session);
                                            setIsOpen(false);
                                            setSearch('');
                                        }}
                                        className={`
                                            w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-left text-sm transition-colors
                                            ${selected === session
                                                ? 'bg-telemetry-blue/10 text-white'
                                                : 'text-gray-400 hover:bg-gray-800/50 hover:text-gray-200'
                                            }
                                        `}
                                    >
                                        <span className="truncate pr-4">{session}</span>
                                        {selected === session && <Check className="w-3.5 h-3.5 text-telemetry-blue shrink-0" />}
                                    </button>
                                ))}
                            </div>
                        ) : (
                            <div className="py-8 text-center text-gray-500 text-sm">
                                No sessions found.
                            </div>
                        )}
                    </div>
                </div>
            )}

            {isError && (
                <div className="absolute top-full mt-2 w-full px-3 py-2 bg-red-950/30 border border-red-900/30 rounded-lg text-red-400 text-xs shadow-lg backdrop-blur-md z-40">
                    Warning: Backend disconnected (127.0.0.1:8000)
                </div>
            )}
        </div>
    );
}