'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Navbar from '@/components/ui/Navbar';
import GlassCard from '@/components/ui/GlassCard';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { PhotoGridSkeleton } from '@/components/ui/Skeleton';

interface EventInfo {
    id: string;
    title: string;
    slug: string;
    date: string;
    location: string;
    privacy?: string;
    requiresPassword?: boolean;
    totalPhotos: number;
}

interface MatchedPhoto {
    photoId: string;
    similarity: number;
    imageUrl: string;
    thumbnailUrl: string;
    watermarkedUrl: string;
}

export default function PublicEventPage() {
    const params = useParams();
    const slug = params.slug as string;
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    const [event, setEvent] = useState<EventInfo | null>(null);
    const [photos, setPhotos] = useState<Array<{ _id: string; imageUrl?: string; thumbnailUrl: string; watermarkedUrl: string }>>([]);
    const [matches, setMatches] = useState<MatchedPhoto[]>([]);
    const [loading, setLoading] = useState(true);
    const [searching, setSearching] = useState(false);
    const [showWebcam, setShowWebcam] = useState(false);
    const [webcamReady, setWebcamReady] = useState(false);
    const [error, setError] = useState('');
    const [threshold, setThreshold] = useState(0.6);
    const [searchMode, setSearchMode] = useState(false);
    const [downloadingId, setDownloadingId] = useState<string | null>(null);
    const [downloadingAll, setDownloadingAll] = useState(false);

    // Password protection state
    const [passwordRequired, setPasswordRequired] = useState(false);
    const [passwordVerified, setPasswordVerified] = useState(false);
    const [password, setPassword] = useState('');
    const [passwordError, setPasswordError] = useState('');
    const [verifying, setVerifying] = useState(false);

    // Get the best available image URL (fallback chain)
    const getDisplayUrl = (photo: { imageUrl?: string; watermarkedUrl?: string; thumbnailUrl?: string }) => {
        return photo.imageUrl || photo.watermarkedUrl || photo.thumbnailUrl || '';
    };

    // Get stored password for API calls
    const getEventPassword = useCallback(() => {
        if (typeof window !== 'undefined') {
            return sessionStorage.getItem(`event-password-${slug}`) || '';
        }
        return '';
    }, [slug]);

    // Fetch event data
    useEffect(() => {
        fetch(`/api/events/public/${slug}`)
            .then((r) => {
                if (!r.ok) throw new Error('Event not found');
                return r.json();
            })
            .then((data) => {
                setEvent(data.event);

                // Check if password is required
                if (data.event?.requiresPassword) {
                    // Check if we already have the password in sessionStorage
                    const storedPassword = sessionStorage.getItem(`event-password-${slug}`);
                    if (storedPassword) {
                        // Try to verify with stored password
                        verifyPassword(storedPassword);
                    } else {
                        setPasswordRequired(true);
                    }
                } else {
                    setPhotos(data.photos || []);
                    setPasswordVerified(true);
                }
            })
            .catch(() => setError('Event not found or has expired'))
            .finally(() => setLoading(false));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [slug]);

    // Verify password
    const verifyPassword = async (pwd: string) => {
        setVerifying(true);
        setPasswordError('');

        try {
            const res = await fetch(`/api/events/public/${slug}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password: pwd }),
            });

            const data = await res.json();

            if (!res.ok) {
                setPasswordError(data.error || 'Incorrect password');
                setPasswordRequired(true);
                sessionStorage.removeItem(`event-password-${slug}`);
                return;
            }

            // Password correct — store and show content
            sessionStorage.setItem(`event-password-${slug}`, pwd);
            setEvent(data.event);
            setPhotos(data.photos || []);
            setPasswordVerified(true);
            setPasswordRequired(false);
        } catch {
            setPasswordError('Something went wrong. Please try again.');
        } finally {
            setVerifying(false);
        }
    };

    const handlePasswordSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!password.trim()) {
            setPasswordError('Please enter a password');
            return;
        }
        verifyPassword(password);
    };

    // Start webcam
    const startWebcam = useCallback(async () => {
        setShowWebcam(true);
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'user', width: 640, height: 480 },
            });
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                setWebcamReady(true);
            }
        } catch {
            setError('Camera access denied. Please allow camera access to find your photos.');
        }
    }, []);

    // Capture and search
    const captureAndSearch = async () => {
        if (!videoRef.current || !canvasRef.current || !event) return;

        const canvas = canvasRef.current;
        const video = videoRef.current;
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        canvas.getContext('2d')?.drawImage(video, 0, 0);

        // Convert to blob
        const blob = await new Promise<Blob>((resolve) => {
            canvas.toBlob((b) => resolve(b!), 'image/jpeg', 0.9);
        });

        setSearching(true);
        setSearchMode(true);
        setError('');

        try {
            const formData = new FormData();
            formData.append('face', blob, 'face.jpg');
            formData.append('threshold', threshold.toString());

            const headers: Record<string, string> = {};
            const eventPwd = getEventPassword();
            if (eventPwd) {
                headers['x-event-password'] = eventPwd;
            }

            const res = await fetch(`/api/events/${event.id}/search`, {
                method: 'POST',
                headers,
                body: formData,
            });

            if (res.status === 429) {
                setError('Too many searches. Please wait a moment and try again.');
                return;
            }

            if (res.status === 403) {
                setError('Access denied. Please re-enter the event password.');
                setPasswordVerified(false);
                setPasswordRequired(true);
                sessionStorage.removeItem(`event-password-${slug}`);
                return;
            }

            const data = await res.json();

            if (!res.ok) {
                setError(data.error || 'Search failed');
                return;
            }

            setMatches(data.matches || []);

            // Stop webcam
            const stream = videoRef.current?.srcObject as MediaStream;
            stream?.getTracks().forEach((t) => t.stop());
            setShowWebcam(false);
        } catch {
            setError('Face search failed. Please try again.');
        } finally {
            setSearching(false);
        }
    };

    // Download single photo
    const handleDownload = async (photoId: string) => {
        setDownloadingId(photoId);
        try {
            const res = await fetch(`/api/download/${photoId}`);
            const data = await res.json();
            if (res.ok && data.downloadUrl) {
                window.open(data.downloadUrl, '_self');
            } else {
                setError(data.error || 'Download failed');
            }
        } catch {
            setError('Download failed. Please try again.');
        } finally {
            setDownloadingId(null);
        }
    };

    // Download All as ZIP
    const handleDownloadAll = async () => {
        if (matches.length === 0) return;
        setDownloadingAll(true);
        setError('');

        try {
            const JSZip = (await import('jszip')).default;
            const zip = new JSZip();

            // Fetch all images in parallel
            const fetchPromises = matches.map(async (match, index) => {
                try {
                    // Get the download URL from our API
                    const res = await fetch(`/api/download/${match.photoId}`);
                    const data = await res.json();
                    if (!res.ok || !data.downloadUrl) return;

                    // Fetch the actual image
                    const imgRes = await fetch(data.downloadUrl);
                    if (!imgRes.ok) return;

                    const blob = await imgRes.blob();
                    const ext = blob.type.includes('png') ? 'png' : 'jpg';
                    zip.file(`photo-${index + 1}.${ext}`, blob);
                } catch {
                    // Skip failed downloads
                }
            });

            await Promise.all(fetchPromises);

            // Generate ZIP
            const zipBlob = await zip.generateAsync({ type: 'blob' });

            // Trigger download
            const url = URL.createObjectURL(zipBlob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `${event?.title || 'snapfind'}-photos.zip`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        } catch {
            setError('Failed to create ZIP. Please download photos individually.');
        } finally {
            setDownloadingAll(false);
        }
    };

    // Download All gallery photos as ZIP
    const handleDownloadAllGallery = async () => {
        if (photos.length === 0) return;
        setDownloadingAll(true);
        setError('');

        try {
            const JSZip = (await import('jszip')).default;
            const zip = new JSZip();

            const fetchPromises = photos.map(async (photo, index) => {
                try {
                    const res = await fetch(`/api/download/${photo._id}`);
                    const data = await res.json();
                    if (!res.ok || !data.downloadUrl) return;

                    const imgRes = await fetch(data.downloadUrl);
                    if (!imgRes.ok) return;

                    const blob = await imgRes.blob();
                    const ext = blob.type.includes('png') ? 'png' : 'jpg';
                    zip.file(`photo-${index + 1}.${ext}`, blob);
                } catch {
                    // Skip failed downloads
                }
            });

            await Promise.all(fetchPromises);

            const zipBlob = await zip.generateAsync({ type: 'blob' });
            const url = URL.createObjectURL(zipBlob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `${event?.title || 'snapfind'}-all-photos.zip`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        } catch {
            setError('Failed to create ZIP. Please download photos individually.');
        } finally {
            setDownloadingAll(false);
        }
    };

    if (loading) {
        return (
            <div className="page-container">
                <Navbar />
                <div className="pt-24 section-container">
                    <PhotoGridSkeleton count={12} />
                </div>
            </div>
        );
    }

    if (error && !event) {
        return (
            <div className="page-container">
                <Navbar />
                <div className="pt-24 section-container text-center py-20">
                    <h1 className="text-2xl font-bold text-white mb-4">Event Not Found</h1>
                    <p className="text-gray-500">{error}</p>
                </div>
            </div>
        );
    }

    // Password Gate for Private Events
    if (passwordRequired && !passwordVerified) {
        return (
            <div className="page-container">
                <Navbar />
                <div className="pt-24 pb-16 section-container">
                    <div className="max-w-md mx-auto animate-fade-in">
                        <GlassCard className="p-8 text-center relative overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-br from-accent-purple/5 to-accent-blue/5" />
                            <div className="relative">
                                {/* Lock icon */}
                                <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-accent-purple/20 to-accent-blue/20 flex items-center justify-center">
                                    <svg className="w-10 h-10 text-accent-purple" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                    </svg>
                                </div>

                                <h1 className="text-2xl font-bold text-white mb-2">{event?.title}</h1>
                                <p className="text-gray-400 text-sm mb-2">
                                    {event?.date && new Date(event.date).toLocaleDateString()} · {event?.location}
                                </p>
                                <p className="text-gray-500 text-sm mb-6">
                                    This is a private event. Enter the password to view photos.
                                </p>

                                <form onSubmit={handlePasswordSubmit} className="space-y-4">
                                    {passwordError && (
                                        <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                                            {passwordError}
                                        </div>
                                    )}

                                    <Input
                                        label="Event Password"
                                        type="password"
                                        placeholder="Enter event password"
                                        value={password}
                                        onChange={(e) => { setPassword(e.target.value); setPasswordError(''); }}
                                        required
                                    />

                                    <Button type="submit" loading={verifying} className="w-full">
                                        {verifying ? 'Verifying...' : 'Access Event'}
                                    </Button>
                                </form>
                            </div>
                        </GlassCard>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="page-container">
            <Navbar />

            <div className="pt-24 pb-16 section-container">
                {/* Event Header */}
                <div className="text-center mb-12 animate-fade-in">
                    <h1 className="text-4xl font-bold text-white mb-3">{event?.title}</h1>
                    <div className="flex items-center justify-center gap-4 text-gray-400">
                        <span>{event?.date && new Date(event.date).toLocaleDateString()}</span>
                        <span>·</span>
                        <span>{event?.location}</span>
                        <span>·</span>
                        <span>{event?.totalPhotos} photos</span>
                    </div>
                </div>

                {/* Face Search Card */}
                <div className="max-w-2xl mx-auto mb-12">
                    <GlassCard className="p-8 text-center relative overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-br from-accent-purple/5 to-accent-blue/5" />
                        <div className="relative">
                            {!showWebcam && !searchMode && (
                                <>
                                    <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-accent-purple/20 to-accent-blue/20 flex items-center justify-center">
                                        <svg className="w-10 h-10 text-accent-purple" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                        </svg>
                                    </div>
                                    <h2 className="text-xl font-semibold text-white mb-2">Find Your Photos</h2>
                                    <p className="text-gray-400 text-sm mb-6">
                                        Use your camera to scan your face and instantly find all photos of you
                                    </p>

                                    {/* Confidence slider */}
                                    <div className="mb-6 max-w-xs mx-auto">
                                        <label className="text-xs text-gray-500 block mb-2">
                                            Match Sensitivity: {Math.round(threshold * 100)}%
                                        </label>
                                        <input
                                            type="range"
                                            min="0.3"
                                            max="0.9"
                                            step="0.05"
                                            value={threshold}
                                            onChange={(e) => setThreshold(parseFloat(e.target.value))}
                                            className="w-full accent-accent-purple"
                                        />
                                        <div className="flex justify-between text-xs text-gray-600 mt-1">
                                            <span>Loose</span>
                                            <span>Strict</span>
                                        </div>
                                    </div>

                                    <Button onClick={startWebcam} size="lg">
                                        <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                        </svg>
                                        Open Camera
                                    </Button>
                                </>
                            )}

                            {showWebcam && (
                                <div className="space-y-4">
                                    <div className="relative rounded-xl overflow-hidden bg-dark-50 max-w-md mx-auto">
                                        <video
                                            ref={videoRef}
                                            autoPlay
                                            playsInline
                                            muted
                                            className="w-full rounded-xl"
                                        />
                                        {/* Face outline overlay */}
                                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                            <div className="w-48 h-56 border-2 border-accent-purple/50 rounded-[40%] animate-pulse_slow" />
                                        </div>
                                    </div>
                                    <canvas ref={canvasRef} className="hidden" />
                                    <p className="text-sm text-gray-400">Position your face within the frame</p>
                                    <div className="flex gap-3 justify-center">
                                        <Button
                                            onClick={captureAndSearch}
                                            loading={searching}
                                            disabled={!webcamReady}
                                        >
                                            {searching ? 'Searching...' : 'Scan Face'}
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            onClick={() => {
                                                const stream = videoRef.current?.srcObject as MediaStream;
                                                stream?.getTracks().forEach((t) => t.stop());
                                                setShowWebcam(false);
                                            }}
                                        >
                                            Cancel
                                        </Button>
                                    </div>
                                </div>
                            )}

                            {searchMode && !showWebcam && (
                                <div>
                                    <h3 className="text-lg font-semibold text-white mb-4">
                                        {matches.length > 0
                                            ? `Found ${matches.length} photo${matches.length !== 1 ? 's' : ''} of you!`
                                            : 'No matching photos found'}
                                    </h3>
                                    <div className="flex gap-3 justify-center">
                                        <Button variant="secondary" size="sm" onClick={() => { setSearchMode(false); setMatches([]); }}>
                                            Search Again
                                        </Button>
                                        {matches.length > 0 && (
                                            <Button
                                                size="sm"
                                                onClick={handleDownloadAll}
                                                loading={downloadingAll}
                                            >
                                                <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                                </svg>
                                                {downloadingAll ? 'Creating ZIP...' : `Download All (${matches.length})`}
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </GlassCard>
                </div>

                {error && (
                    <div className="max-w-2xl mx-auto mb-8 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm text-center">
                        {error}
                    </div>
                )}

                {/* Matched Results */}
                {matches.length > 0 && (
                    <div className="mb-12 animate-fade-in">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-2xl font-bold text-white">
                                Your Photos
                            </h2>
                            <Button
                                size="sm"
                                onClick={handleDownloadAll}
                                loading={downloadingAll}
                            >
                                <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                </svg>
                                {downloadingAll ? 'Creating ZIP...' : `Download All (${matches.length})`}
                            </Button>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            {matches.map((match) => (
                                <div key={match.photoId} className="group relative rounded-xl overflow-hidden aspect-square bg-dark-50">
                                    <img
                                        src={getDisplayUrl(match)}
                                        alt=""
                                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                                        loading="lazy"
                                    />
                                    {/* Hover overlay */}
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                                        <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
                                            <span className="text-xs text-white/80">
                                                {Math.round(match.similarity * 100)}% match
                                            </span>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); handleDownload(match.photoId); }}
                                                disabled={downloadingId === match.photoId}
                                                className="p-2 rounded-lg bg-accent-purple/80 hover:bg-accent-purple transition-colors disabled:opacity-50"
                                            >
                                                {downloadingId === match.photoId ? (
                                                    <svg className="w-4 h-4 text-white animate-spin" fill="none" viewBox="0 0 24 24">
                                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                                    </svg>
                                                ) : (
                                                    <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                                    </svg>
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                    {/* Always-visible download button */}
                                    <button
                                        onClick={(e) => { e.stopPropagation(); handleDownload(match.photoId); }}
                                        className="absolute top-2 right-2 p-2 rounded-lg bg-black/50 backdrop-blur-sm hover:bg-accent-purple/80 transition-colors"
                                    >
                                        <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                        </svg>
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* All Event Photos */}
                {!searchMode && photos.length > 0 && (
                    <div>
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-2xl font-bold text-white">Event Gallery</h2>
                            <Button
                                size="sm"
                                onClick={handleDownloadAllGallery}
                                loading={downloadingAll}
                            >
                                <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                </svg>
                                {downloadingAll ? 'Creating ZIP...' : `Download All (${photos.length})`}
                            </Button>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            {photos.map((photo) => (
                                <div key={photo._id} className="group relative rounded-xl overflow-hidden aspect-square bg-dark-50">
                                    <img
                                        src={getDisplayUrl(photo)}
                                        alt=""
                                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                                        loading="lazy"
                                    />
                                    {/* Hover overlay */}
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                                        <div className="absolute bottom-3 right-3">
                                            <button
                                                onClick={() => handleDownload(photo._id)}
                                                disabled={downloadingId === photo._id}
                                                className="p-2 rounded-lg bg-accent-purple/80 hover:bg-accent-purple transition-colors disabled:opacity-50"
                                            >
                                                {downloadingId === photo._id ? (
                                                    <svg className="w-4 h-4 text-white animate-spin" fill="none" viewBox="0 0 24 24">
                                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                                    </svg>
                                                ) : (
                                                    <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                                    </svg>
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                    {/* Always-visible download button */}
                                    <button
                                        onClick={() => handleDownload(photo._id)}
                                        className="absolute top-2 right-2 p-2 rounded-lg bg-black/50 backdrop-blur-sm hover:bg-accent-purple/80 transition-colors"
                                    >
                                        <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                        </svg>
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
