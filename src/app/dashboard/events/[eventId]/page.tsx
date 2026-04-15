'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import GlassCard from '@/components/ui/GlassCard';
import Button from '@/components/ui/Button';
import UploadZone from '@/components/ui/UploadZone';
import EmptyState from '@/components/ui/EmptyState';
import { PhotoGridSkeleton, StatCardSkeleton } from '@/components/ui/Skeleton';

interface EventData {
    event: {
        _id: string;
        title: string;
        slug: string;
        eventCode: string;
        date: string;
        location: string;
        privacy: string;
        totalPhotos: number;
    };
    stats: {
        totalPhotos: number;
        processingPhotos: number;
        readyPhotos: number;
        failedPhotos: number;
    };
}

interface Photo {
    _id: string;
    imageUrl: string;
    thumbnailUrl: string;
    watermarkedUrl: string;
    status: string;
    facesCount: number;
    createdAt: string;
}

export default function EventDetailPage() {
    const params = useParams();
    const router = useRouter();
    const { token } = useAuth();
    const eventId = params.eventId as string;

    const [eventData, setEventData] = useState<EventData | null>(null);
    const [photos, setPhotos] = useState<Photo[]>([]);
    const [loading, setLoading] = useState(true);
    const [photosLoading, setPhotosLoading] = useState(true);
    const [deleting, setDeleting] = useState(false);
    const [deletingPhotoId, setDeletingPhotoId] = useState<string | null>(null);

    const fetchEvent = useCallback(async () => {
        if (!token) return;
        const res = await fetch(`/api/events/${eventId}`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
            const data = await res.json();
            setEventData(data);
        }
        setLoading(false);
    }, [eventId, token]);

    const fetchPhotos = useCallback(async () => {
        if (!token) return;
        const res = await fetch(`/api/events/${eventId}/photos`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
            const data = await res.json();
            setPhotos(data.photos || []);
        }
        setPhotosLoading(false);
    }, [eventId, token]);

    useEffect(() => {
        fetchEvent();
        fetchPhotos();
    }, [fetchEvent, fetchPhotos]);

    const handleUploadComplete = async () => {
        await fetchEvent();
        await fetchPhotos();
    };

    const handleDelete = async () => {
        if (!confirm('Delete this event and all its photos? This cannot be undone.')) return;
        setDeleting(true);

        const res = await fetch(`/api/events/${eventId}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` },
        });

        if (res.ok) {
            router.push('/dashboard/events');
        } else {
            setDeleting(false);
        }
    };

    const handleDeletePhoto = async (photoId: string) => {
        if (!confirm('Delete this photo? This cannot be undone.')) return;
        setDeletingPhotoId(photoId);

        try {
            const res = await fetch(`/api/events/${eventId}/photos/${photoId}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` },
            });

            if (res.ok) {
                setPhotos((prev) => prev.filter((p) => p._id !== photoId));
                await fetchEvent(); // refresh stats
            }
        } catch (error) {
            console.error('Failed to delete photo:', error);
        } finally {
            setDeletingPhotoId(null);
        }
    };

    const publicUrl = typeof window !== 'undefined'
        ? `${window.location.origin}/event/${eventData?.event.slug}`
        : '';

    if (loading) {
        return (
            <div className="space-y-6">
                <StatCardSkeleton />
                <PhotoGridSkeleton />
            </div>
        );
    }

    if (!eventData) {
        return (
            <EmptyState title="Event not found" description="This event doesn't exist or you don't have access." />
        );
    }

    return (
        <div className="animate-fade-in space-y-6">
            {/* Event Header */}
            <div className="flex items-start justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-white">{eventData.event.title}</h1>
                    <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                        <span>{new Date(eventData.event.date).toLocaleDateString()}</span>
                        <span>{eventData.event.location}</span>
                        <span className="font-mono text-accent-purple">{eventData.event.eventCode}</span>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Link href={`/dashboard/events/${eventId}/edit`}>
                        <Button variant="secondary" size="sm">
                            <svg className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                            Edit
                        </Button>
                    </Link>
                    <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => navigator.clipboard.writeText(publicUrl)}
                    >
                        Copy Link
                    </Button>
                    <Button variant="danger" size="sm" onClick={handleDelete} loading={deleting}>
                        Delete
                    </Button>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { label: 'Total', value: eventData.stats.totalPhotos, color: 'text-white' },
                    { label: 'Ready', value: eventData.stats.readyPhotos, color: 'text-green-400' },
                    { label: 'Processing', value: eventData.stats.processingPhotos, color: 'text-yellow-400' },
                    { label: 'Failed', value: eventData.stats.failedPhotos, color: 'text-red-400' },
                ].map((stat) => (
                    <GlassCard key={stat.label} className="p-4 text-center">
                        <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
                        <p className="text-xs text-gray-500 mt-1">{stat.label}</p>
                    </GlassCard>
                ))}
            </div>

            {/* Share Link */}
            <GlassCard className="p-4">
                <div className="flex items-center gap-3">
                    <span className="text-sm text-gray-400">Public Link:</span>
                    <code className="flex-1 text-sm text-accent-purple bg-dark-50/50 px-3 py-1.5 rounded-lg truncate">
                        {publicUrl}
                    </code>
                    <Button size="sm" variant="ghost" onClick={() => navigator.clipboard.writeText(publicUrl)}>
                        Copy
                    </Button>
                </div>
            </GlassCard>

            {/* Upload Zone */}
            <GlassCard className="p-6">
                <h2 className="text-lg font-semibold text-white mb-4">Upload Photos</h2>
                <UploadZone eventId={eventId} token={token} onUploadComplete={handleUploadComplete} maxFiles={20} />
            </GlassCard>

            {/* Photo Grid */}
            <div>
                <h2 className="text-lg font-semibold text-white mb-4">
                    Photos ({eventData.stats.totalPhotos})
                </h2>

                {photosLoading ? (
                    <PhotoGridSkeleton />
                ) : !photos.length ? (
                    <GlassCard className="p-8">
                        <EmptyState
                            title="No photos yet"
                            description="Upload photos using the upload zone above"
                        />
                    </GlassCard>
                ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {photos.map((photo) => (
                            <div key={photo._id} className="relative group rounded-xl overflow-hidden aspect-square bg-dark-50">
                                <img
                                    src={photo.imageUrl || photo.thumbnailUrl}
                                    alt=""
                                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                                    loading="lazy"
                                />
                                {/* Delete button */}
                                <button
                                    onClick={() => handleDeletePhoto(photo._id)}
                                    disabled={deletingPhotoId === photo._id}
                                    className="absolute top-2 left-2 w-7 h-7 rounded-full bg-red-500/80 hover:bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200 backdrop-blur-sm z-10"
                                    title="Delete photo"
                                >
                                    {deletingPhotoId === photo._id ? (
                                        <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                        </svg>
                                    ) : (
                                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    )}
                                </button>
                                {/* Status badge */}
                                <div className="absolute top-2 right-2">
                                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium backdrop-blur-sm ${photo.status === 'ready'
                                        ? 'bg-green-500/20 text-green-400'
                                        : photo.status === 'processing'
                                            ? 'bg-yellow-500/20 text-yellow-400'
                                            : 'bg-red-500/20 text-red-400'
                                        }`}>
                                        {photo.status}
                                    </span>
                                </div>
                                {/* Face count */}
                                {photo.facesCount > 0 && (
                                    <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded-full bg-black/50 backdrop-blur-sm text-xs text-white">
                                        {photo.facesCount} face{photo.facesCount !== 1 ? 's' : ''}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
