'use client';

import GlassCard from './GlassCard';
import { ReactNode } from 'react';

interface StatCardProps {
    title: string;
    value: string | number;
    subtitle?: string;
    icon: ReactNode;
    trend?: { value: number; label: string };
    gradient?: string;
}

export default function StatCard({ title, value, subtitle, icon, trend, gradient }: StatCardProps) {
    return (
        <GlassCard className="p-4 sm:p-6 relative overflow-hidden">
            {/* Background gradient accent */}
            <div className={`absolute top-0 right-0 w-24 sm:w-32 h-24 sm:h-32 rounded-full blur-3xl opacity-10 -translate-y-1/2 translate-x-1/2 ${gradient || 'bg-accent-purple'}`} />

            <div className="relative flex items-start justify-between gap-3 sm:gap-4">
                <div className="min-w-0 flex-1">
                    <p className="text-xs sm:text-sm text-gray-400 mb-1">{title}</p>
                    <p className="text-xl sm:text-2xl md:text-3xl font-bold text-white break-words">{value}</p>
                    {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
                    {trend && (
                        <div className="flex items-center gap-1 mt-2">
                            <span className={`text-xs font-medium ${trend.value >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                {trend.value >= 0 ? '↑' : '↓'} {Math.abs(trend.value)}%
                            </span>
                            <span className="text-xs text-gray-500">{trend.label}</span>
                        </div>
                    )}
                </div>
                <div className="p-2 sm:p-3 rounded-xl bg-white/[0.05] flex-shrink-0">
                    {icon}
                </div>
            </div>
        </GlassCard>
    );
}
