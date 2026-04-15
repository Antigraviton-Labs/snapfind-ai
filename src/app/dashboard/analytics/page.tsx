'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import GlassCard from '@/components/ui/GlassCard';
import StatCard from '@/components/ui/StatCard';
import { StatCardSkeleton } from '@/components/ui/Skeleton';

interface AnalyticsData {
    overview: {
        totalEvents: number;
        totalPhotos: number;
        readyPhotos: number;
        processingPhotos: number;
        failedPhotos: number;
        totalDownloads: number;
        recentDownloads: number;
        storageFormatted: string;
        plan: string;
    };
    popularEvents: Array<{ eventId: string; title: string; downloads: number }>;
    dailyDownloads: Array<{ _id: string; count: number }>;
}

export default function AnalyticsPage() {
    const { token } = useAuth();
    const [data, setData] = useState<AnalyticsData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!token) return;
        fetch('/api/analytics', { headers: { Authorization: `Bearer ${token}` } })
            .then((r) => r.json())
            .then(setData)
            .catch(console.error)
            .finally(() => setLoading(false));
    }, [token]);

    const maxDailyCount = Math.max(...(data?.dailyDownloads?.map(d => d.count) || [1]));

    return (
        <div className="animate-fade-in">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-white">Analytics</h1>
                <p className="text-gray-500 mt-1">Track your event performance and usage</p>
            </div>

            {/* Stats */}
            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    {Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)}
                </div>
            ) : (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                        <StatCard
                            title="Total Uploads"
                            value={data?.overview.totalPhotos || 0}
                            subtitle={`${data?.overview.readyPhotos || 0} ready`}
                            icon={<svg className="w-6 h-6 text-accent-purple" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>}
                            gradient="bg-accent-purple"
                        />
                        <StatCard
                            title="Total Downloads"
                            value={data?.overview.totalDownloads || 0}
                            subtitle={`${data?.overview.recentDownloads || 0} this month`}
                            icon={<svg className="w-6 h-6 text-accent-blue" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>}
                            gradient="bg-accent-blue"
                        />
                        <StatCard
                            title="Storage Used"
                            value={data?.overview.storageFormatted || '0 B'}
                            subtitle={`${data?.overview.plan || 'free'} plan`}
                            icon={<svg className="w-6 h-6 text-accent-cyan" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" /></svg>}
                            gradient="bg-accent-cyan"
                        />
                        <StatCard
                            title="Processing"
                            value={data?.overview.processingPhotos || 0}
                            subtitle={`${data?.overview.failedPhotos || 0} failed`}
                            icon={<svg className="w-6 h-6 text-accent-pink" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>}
                            gradient="bg-accent-pink"
                        />
                    </div>

                    {/* Charts Row */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Downloads Chart */}
                        <GlassCard className="p-6">
                            <h3 className="text-lg font-semibold text-white mb-6">Downloads (Last 7 Days)</h3>
                            {data?.dailyDownloads?.length ? (
                                <div className="flex items-end gap-2 h-48">
                                    {data.dailyDownloads.map((day) => (
                                        <div key={day._id} className="flex-1 flex flex-col items-center gap-2">
                                            <span className="text-xs text-gray-400">{day.count}</span>
                                            <div
                                                className="w-full rounded-t-lg bg-gradient-to-t from-accent-purple to-accent-blue transition-all duration-500"
                                                style={{ height: `${Math.max((day.count / maxDailyCount) * 100, 8)}%` }}
                                            />
                                            <span className="text-xs text-gray-500">
                                                {new Date(day._id).toLocaleDateString('en', { weekday: 'short' })}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="h-48 flex items-center justify-center text-gray-500 text-sm">
                                    No download data yet
                                </div>
                            )}
                        </GlassCard>

                        {/* Popular Events */}
                        <GlassCard className="p-6">
                            <h3 className="text-lg font-semibold text-white mb-6">Popular Events</h3>
                            {data?.popularEvents?.length ? (
                                <div className="space-y-4">
                                    {data.popularEvents.map((event, i) => (
                                        <div key={event.eventId} className="flex items-center gap-4">
                                            <span className="text-sm font-bold text-gray-500 w-6">{i + 1}</span>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm text-white truncate">{event.title}</p>
                                                <div className="mt-1 h-1.5 bg-dark-50 rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full bg-gradient-to-r from-accent-purple to-accent-blue rounded-full transition-all"
                                                        style={{
                                                            width: `${Math.max((event.downloads / (data.popularEvents[0]?.downloads || 1)) * 100, 10)}%`,
                                                        }}
                                                    />
                                                </div>
                                            </div>
                                            <span className="text-sm font-medium text-accent-purple">{event.downloads}</span>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="h-48 flex items-center justify-center text-gray-500 text-sm">
                                    No download data yet
                                </div>
                            )}
                        </GlassCard>
                    </div>
                </>
            )}
        </div>
    );
}
