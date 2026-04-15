'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import StatCard from '@/components/ui/StatCard';
import GlassCard from '@/components/ui/GlassCard';
import Button from '@/components/ui/Button';
import { StatCardSkeleton, EventCardSkeleton } from '@/components/ui/Skeleton';
import EmptyState from '@/components/ui/EmptyState';

interface PlanLimits {
    plan: string;
    events: { used: number; limit: number | null; unlimited: boolean };
    storage: { used: number; usedFormatted: string; limit: number; limitFormatted: string; percentage: number };
    photosPerEvent: number;
    downloadsPerDay: number | null;
    faceScansPerMinute: number;
    watermarkForced: boolean;
    priorityProcessing: boolean;
}

interface Analytics {
    overview: {
        totalEvents: number;
        totalPhotos: number;
        processingPhotos: number;
        totalDownloads: number;
        storageFormatted: string;
        plan: string;
    };
    limits: PlanLimits;
    recentEvents: Array<{
        _id: string;
        title: string;
        totalPhotos: number;
        storageUsed: number;
        storageFormatted: string;
        createdAt: string;
    }>;
}

function ProgressBar({ value, max, label, sublabel, color = 'bg-accent-purple' }: {
    value: number; max: number | null; label: string; sublabel: string; color?: string;
}) {
    if (max === null) {
        return (
            <div className="space-y-1.5">
                <div className="flex justify-between text-sm">
                    <span className="text-gray-400">{label}</span>
                    <span className="text-green-400">Unlimited</span>
                </div>
                <div className="h-2 rounded-full bg-dark-50/50">
                    <div className="h-full rounded-full bg-green-500/40 w-full" />
                </div>
                <p className="text-xs text-gray-600">{sublabel}</p>
            </div>
        );
    }

    const pct = Math.min(100, Math.round((value / max) * 100));
    const isWarning = pct >= 80;
    const barColor = isWarning ? 'bg-amber-500' : color;

    return (
        <div className="space-y-1.5">
            <div className="flex justify-between text-sm">
                <span className="text-gray-400">{label}</span>
                <span className={isWarning ? 'text-amber-400' : 'text-gray-300'}>{pct}%</span>
            </div>
            <div className="h-2 rounded-full bg-dark-50/50 overflow-hidden">
                <div
                    className={`h-full rounded-full transition-all duration-500 ${barColor}`}
                    style={{ width: `${pct}%` }}
                />
            </div>
            <p className="text-xs text-gray-600">{sublabel}</p>
        </div>
    );
}

export default function DashboardPage() {
    const { user, token } = useAuth();
    const [data, setData] = useState<Analytics | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!token) return;
        fetch('/api/analytics', {
            headers: { Authorization: `Bearer ${token}` },
        })
            .then((r) => r.json())
            .then(setData)
            .catch(console.error)
            .finally(() => setLoading(false));
    }, [token]);

    const limits = data?.limits;

    return (
        <div className="animate-fade-in">
            {/* Header */}
            <div className="mb-8 flex items-start justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-white">
                        Welcome back, <span className="gradient-text">{user?.name?.split(' ')[0]}</span>
                    </h1>
                    <p className="text-gray-500 mt-1">Here&apos;s what&apos;s happening with your events</p>
                </div>
                {limits && (
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider ${limits.plan === 'pro'
                            ? 'bg-gradient-to-r from-accent-purple to-accent-blue text-white'
                            : 'bg-white/[0.05] border border-white/[0.1] text-gray-400'
                        }`}>
                        {limits.plan} plan
                    </span>
                )}
            </div>

            {/* Stats Grid */}
            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    {Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    <StatCard
                        title="Total Events"
                        value={data?.overview.totalEvents || 0}
                        subtitle={limits?.events.unlimited ? 'unlimited' : `of ${limits?.events.limit}`}
                        icon={<svg className="w-6 h-6 text-accent-purple" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>}
                        gradient="bg-accent-purple"
                    />
                    <StatCard
                        title="Total Photos"
                        value={data?.overview.totalPhotos || 0}
                        subtitle={`${data?.overview.processingPhotos || 0} processing`}
                        icon={<svg className="w-6 h-6 text-accent-blue" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>}
                        gradient="bg-accent-blue"
                    />
                    <StatCard
                        title="Downloads"
                        value={data?.overview.totalDownloads || 0}
                        icon={<svg className="w-6 h-6 text-accent-cyan" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>}
                        gradient="bg-accent-cyan"
                    />
                    <StatCard
                        title="Storage Used"
                        value={data?.overview.storageFormatted || '0 B'}
                        subtitle={`of ${limits?.storage.limitFormatted || '500 MB'}`}
                        icon={<svg className="w-6 h-6 text-accent-pink" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" /></svg>}
                        gradient="bg-accent-pink"
                    />
                </div>
            )}

            {/* Usage & Limits Panel */}
            {!loading && limits && (
                <GlassCard className="p-6 mb-8">
                    <h2 className="text-lg font-semibold text-white mb-5">Usage & Limits</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <ProgressBar
                            value={limits.events.used}
                            max={limits.events.unlimited ? null : limits.events.limit}
                            label="Events"
                            sublabel={limits.events.unlimited ? `${limits.events.used} events created` : `${limits.events.used} / ${limits.events.limit} events`}
                            color="bg-accent-purple"
                        />
                        <ProgressBar
                            value={limits.storage.used}
                            max={limits.storage.limit}
                            label="Storage"
                            sublabel={`${limits.storage.usedFormatted} / ${limits.storage.limitFormatted}`}
                            color="bg-accent-blue"
                        />
                        <div className="space-y-3">
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-gray-400">Photos/event</span>
                                <span className="text-gray-300">{limits.photosPerEvent.toLocaleString()}</span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-gray-400">Downloads/day</span>
                                <span className="text-gray-300">{limits.downloadsPerDay ?? '∞'}</span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-gray-400">Face scans/min</span>
                                <span className="text-gray-300">{limits.faceScansPerMinute}</span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-gray-400">Priority processing</span>
                                <span className={limits.priorityProcessing ? 'text-green-400' : 'text-gray-600'}>
                                    {limits.priorityProcessing ? '✓ Enabled' : '✗ Off'}
                                </span>
                            </div>
                        </div>
                    </div>
                </GlassCard>
            )}

            {/* Quick Actions + Recent Events */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Quick Actions */}
                <GlassCard className="p-6">
                    <h2 className="text-lg font-semibold text-white mb-4">Quick Actions</h2>
                    <div className="space-y-3">
                        <Link href="/dashboard/events/new" className="block">
                            <Button variant="primary" className="w-full justify-start gap-3">
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
                                </svg>
                                Create New Event
                            </Button>
                        </Link>
                        <Link href="/dashboard/events" className="block">
                            <Button variant="secondary" className="w-full justify-start gap-3">
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                </svg>
                                View All Events
                            </Button>
                        </Link>
                        <Link href="/dashboard/analytics" className="block">
                            <Button variant="secondary" className="w-full justify-start gap-3">
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                </svg>
                                View Analytics
                            </Button>
                        </Link>
                    </div>
                </GlassCard>

                {/* Recent Events */}
                <div className="lg:col-span-2">
                    <GlassCard className="p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-semibold text-white">Recent Events</h2>
                            <Link href="/dashboard/events" className="text-sm text-accent-purple hover:underline">
                                View all
                            </Link>
                        </div>

                        {loading ? (
                            <div className="space-y-4">
                                {Array.from({ length: 3 }).map((_, i) => <EventCardSkeleton key={i} />)}
                            </div>
                        ) : !data?.recentEvents?.length ? (
                            <EmptyState
                                title="No events yet"
                                description="Create your first event to get started"
                                action={
                                    <Link href="/dashboard/events/new">
                                        <Button size="sm">Create Event</Button>
                                    </Link>
                                }
                            />
                        ) : (
                            <div className="space-y-3">
                                {data.recentEvents.map((event) => (
                                    <Link
                                        key={event._id}
                                        href={`/dashboard/events/${event._id}`}
                                        className="block p-4 rounded-xl bg-white/[0.02] border border-white/[0.05] hover:bg-white/[0.05] hover:border-accent-purple/20 transition-all duration-200"
                                    >
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <h3 className="font-medium text-white">{event.title}</h3>
                                                <p className="text-sm text-gray-500 mt-1">
                                                    {event.totalPhotos} photos · {event.storageFormatted} · {new Date(event.createdAt).toLocaleDateString()}
                                                </p>
                                            </div>
                                            <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                            </svg>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        )}
                    </GlassCard>
                </div>
            </div>
        </div>
    );
}
