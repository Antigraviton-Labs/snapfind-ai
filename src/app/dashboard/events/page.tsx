'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import GlassCard from '@/components/ui/GlassCard';
import Button from '@/components/ui/Button';
import EmptyState from '@/components/ui/EmptyState';
import { EventCardSkeleton } from '@/components/ui/Skeleton';

interface EventItem {
    _id: string;
    title: string;
    slug: string;
    eventCode: string;
    date: string;
    location: string;
    privacy: string;
    totalPhotos: number;
    createdAt: string;
}

export default function EventsListPage() {
    const { token } = useAuth();
    const [events, setEvents] = useState<EventItem[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!token) return;
        fetch('/api/events', { headers: { Authorization: `Bearer ${token}` } })
            .then((r) => r.json())
            .then((data) => setEvents(data.events || []))
            .catch(console.error)
            .finally(() => setLoading(false));
    }, [token]);

    return (
        <div className="animate-fade-in">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-white">Events</h1>
                    <p className="text-gray-500 mt-1">Manage your event photo galleries</p>
                </div>
                <Link href="/dashboard/events/new">
                    <Button>
                        <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
                        </svg>
                        New Event
                    </Button>
                </Link>
            </div>

            {loading ? (
                <div className="grid gap-4">
                    {Array.from({ length: 4 }).map((_, i) => <EventCardSkeleton key={i} />)}
                </div>
            ) : !events.length ? (
                <GlassCard className="p-8">
                    <EmptyState
                        title="No events created yet"
                        description="Create your first event and start uploading photos"
                        action={
                            <Link href="/dashboard/events/new">
                                <Button>Create Your First Event</Button>
                            </Link>
                        }
                    />
                </GlassCard>
            ) : (
                <div className="grid gap-4">
                    {events.map((event) => (
                        <Link key={event._id} href={`/dashboard/events/${event._id}`}>
                            <GlassCard hover className="p-6">
                                <div className="flex items-center justify-between">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-3 mb-2">
                                            <h3 className="text-lg font-semibold text-white truncate">{event.title}</h3>
                                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${event.privacy === 'public'
                                                    ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                                                    : 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'
                                                }`}>
                                                {event.privacy}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-4 text-sm text-gray-500">
                                            <span className="flex items-center gap-1.5">
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                </svg>
                                                {new Date(event.date).toLocaleDateString()}
                                            </span>
                                            <span className="flex items-center gap-1.5">
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                                </svg>
                                                {event.location}
                                            </span>
                                            <span className="flex items-center gap-1.5">
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                </svg>
                                                {event.totalPhotos} photos
                                            </span>
                                            <span className="font-mono text-accent-purple">{event.eventCode}</span>
                                        </div>
                                    </div>
                                    <svg className="w-5 h-5 text-gray-500 flex-shrink-0 ml-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                    </svg>
                                </div>
                            </GlassCard>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
}
