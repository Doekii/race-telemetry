'use client';

import { ChevronDown, Database, Loader2 } from 'lucide-react';

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

    return (
        <div className="w-full max-w-md">
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                Select Race Session
            </label>

            <div className="relative group">
                {/* Icon */}
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                    {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Database className="w-5 h-5" />}
                </div>

                <select
                    value={selected || ''}
                    onChange={(e) => onSelect(e.target.value)}
                    disabled={isLoading || isError}
                    className="w-full appearance-none bg-race-panel text-white pl-10 pr-10 py-3 rounded-lg border border-gray-700 
                     focus:outline-none focus:ring-2 focus:ring-telemetry-blue focus:border-transparent
                     disabled:opacity-50 disabled:cursor-not-allowed
                     hover:border-gray-500 transition-colors"
                >
                    <option className="bg-gray-900" value="" disabled>
                        {isLoading ? "Loading sessions..." : isError ? "Error loading sessions" : "-- Choose a File --"}
                    </option>

                    {sessions?.map((file) => (
                        <option key={file} value={file} className="bg-gray-900">
                            {file}
                        </option>
                    ))}
                </select>

                {/* Custom Arrow */}
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                    <ChevronDown className="w-4 h-4" />
                </div>
            </div>

            {isError && (
                <p className="text-red-500 text-xs mt-2">
                    Could not connect to backend at 127.0.0.1:8000
                </p>
            )}
        </div>
    );
}