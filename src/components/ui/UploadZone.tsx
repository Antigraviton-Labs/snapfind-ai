'use client';

import { useState, useCallback, useRef } from 'react';
import Button from './Button';

interface UploadZoneProps {
    eventId: string;
    token: string | null;
    maxFiles?: number;
    accept?: string;
    disabled?: boolean;
    onUploadComplete?: () => void;
}

interface FileStatus {
    file: File;
    status: 'pending' | 'uploading' | 'success' | 'failed';
    progress: number;
    error?: string;
}

export default function UploadZone({ eventId, token, maxFiles = 20, accept = 'image/jpeg,image/png', disabled = false, onUploadComplete }: UploadZoneProps) {
    const [files, setFiles] = useState<FileStatus[]>([]);
    const [isDragging, setIsDragging] = useState(false);
    const [uploading, setUploading] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    const handleFiles = useCallback((fileList: FileList | File[]) => {
        const newFiles = Array.from(fileList).slice(0, maxFiles).map((file) => ({
            file,
            status: 'pending' as const,
            progress: 0,
        }));
        setFiles((prev) => [...prev, ...newFiles].slice(0, maxFiles));
    }, [maxFiles]);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        if (e.dataTransfer.files) handleFiles(e.dataTransfer.files);
    }, [handleFiles]);

    const removeFile = (index: number) => {
        setFiles((prev) => prev.filter((_, i) => i !== index));
    };

    const uploadFiles = async (filesToUpload: File[]) => {
        const form = new FormData();
        filesToUpload.forEach((f) => form.append('photos', f));

        const res = await fetch(`/api/events/${eventId}/photos`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
            body: form,
        });

        if (!res.ok) {
            const data = await res.json();
            throw new Error(data.error || 'Upload failed');
        }

        return res.json();
    };

    const handleUpload = async () => {
        if (files.length === 0 || uploading) return;
        setUploading(true);

        // Mark all pending as uploading
        setFiles((prev) => prev.map((f) =>
            f.status === 'pending' ? { ...f, status: 'uploading', progress: 50 } : f
        ));

        try {
            const pendingFiles = files.filter((f) => f.status === 'pending' || f.status === 'uploading');
            const data = await uploadFiles(pendingFiles.map((f) => f.file));

            // Map API results back to file statuses
            setFiles((prev) => {
                const uploadingFiles = prev.filter((f) => f.status === 'uploading');
                const otherFiles = prev.filter((f) => f.status !== 'uploading');

                const updatedFiles = uploadingFiles.map((f, i) => {
                    const result = data.results?.[i];
                    if (!result || result.status === 'failed') {
                        return {
                            ...f,
                            status: 'failed' as const,
                            progress: 0,
                            error: result?.error || 'Upload failed',
                        };
                    }
                    return { ...f, status: 'success' as const, progress: 100 };
                });

                return [...otherFiles, ...updatedFiles];
            });

            // Auto-clear successful files after 2s
            setTimeout(() => {
                setFiles((prev) => prev.filter((f) => f.status !== 'success'));
            }, 2000);

            onUploadComplete?.();
        } catch (error) {
            // Mark all uploading as failed
            setFiles((prev) =>
                prev.map((f) =>
                    f.status === 'uploading'
                        ? {
                            ...f,
                            status: 'failed' as const,
                            progress: 0,
                            error: error instanceof Error ? error.message : 'Upload failed',
                        }
                        : f
                )
            );
        } finally {
            setUploading(false);
        }
    };

    const handleRetry = async (index: number) => {
        const fileToRetry = files[index];
        if (!fileToRetry) return;

        // Mark as uploading
        setFiles((prev) =>
            prev.map((f, i) => (i === index ? { ...f, status: 'uploading', progress: 50, error: undefined } : f))
        );

        try {
            const data = await uploadFiles([fileToRetry.file]);
            const result = data.results?.[0];

            setFiles((prev) =>
                prev.map((f, i) => {
                    if (i !== index) return f;
                    if (!result || result.status === 'failed') {
                        return { ...f, status: 'failed' as const, progress: 0, error: result?.error || 'Upload failed' };
                    }
                    return { ...f, status: 'success' as const, progress: 100 };
                })
            );

            // Auto-clear on success
            setTimeout(() => {
                setFiles((prev) => prev.filter((f) => f.status !== 'success'));
            }, 2000);

            onUploadComplete?.();
        } catch (error) {
            setFiles((prev) =>
                prev.map((f, i) =>
                    i === index
                        ? { ...f, status: 'failed' as const, progress: 0, error: error instanceof Error ? error.message : 'Upload failed' }
                        : f
                )
            );
        }
    };

    const clearFailed = () => {
        setFiles((prev) => prev.filter((f) => f.status !== 'failed'));
    };

    const hasFailed = files.some((f) => f.status === 'failed');
    const hasPending = files.some((f) => f.status === 'pending');

    return (
        <div className="space-y-4">
            {/* Drop Zone */}
            <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => inputRef.current?.click()}
                className={`
          border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer
          transition-all duration-300
          ${isDragging
                        ? 'border-accent-purple bg-accent-purple/10 scale-[1.02]'
                        : 'border-white/[0.1] hover:border-accent-purple/50 hover:bg-white/[0.02]'
                    }
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        `}
            >
                <input
                    ref={inputRef}
                    type="file"
                    multiple
                    accept={accept}
                    onChange={(e) => e.target.files && handleFiles(e.target.files)}
                    className="hidden"
                    disabled={disabled}
                />
                <div className="flex flex-col items-center gap-3">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-accent-purple/20 to-accent-blue/20 flex items-center justify-center">
                        <svg className="w-8 h-8 text-accent-purple" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                    </div>
                    <div>
                        <p className="text-white font-medium">Drop photos here or click to browse</p>
                        <p className="text-gray-500 text-sm mt-1">JPG, PNG up to 10MB · Max {maxFiles} files per batch</p>
                    </div>
                </div>
            </div>

            {/* File List */}
            {files.length > 0 && (
                <div className="space-y-2">
                    {files.map((f, i) => (
                        <div key={i} className={`glass-card p-3 flex items-center gap-3 ${f.status === 'failed' ? 'border border-red-500/20' : ''}`}>
                            <div className="w-10 h-10 rounded-lg bg-dark-50 flex items-center justify-center overflow-hidden">
                                <img
                                    src={URL.createObjectURL(f.file)}
                                    alt=""
                                    className="w-full h-full object-cover"
                                />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm text-white truncate">{f.file.name}</p>
                                <p className="text-xs text-gray-500">{(f.file.size / 1024 / 1024).toFixed(1)} MB</p>
                                {f.status === 'uploading' && (
                                    <div className="mt-1 h-1 bg-dark-50 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-gradient-to-r from-accent-purple to-accent-blue transition-all duration-500 rounded-full"
                                            style={{ width: `${f.progress}%` }}
                                        />
                                    </div>
                                )}
                                {f.status === 'failed' && (
                                    <p className="text-xs text-red-400 mt-1">{f.error}</p>
                                )}
                            </div>
                            <div className="flex items-center gap-2">
                                {f.status === 'success' && (
                                    <svg className="w-5 h-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                )}
                                {f.status === 'failed' && (
                                    <>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleRetry(i); }}
                                            className="px-2.5 py-1 rounded-lg bg-accent-purple/20 hover:bg-accent-purple/30 text-accent-purple text-xs font-medium transition-colors"
                                            title="Retry upload"
                                        >
                                            Retry
                                        </button>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); removeFile(i); }}
                                            className="p-1 hover:bg-red-500/10 rounded-lg transition-colors"
                                            title="Remove"
                                        >
                                            <svg className="w-4 h-4 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                            </svg>
                                        </button>
                                    </>
                                )}
                                {f.status === 'pending' && (
                                    <button
                                        onClick={(e) => { e.stopPropagation(); removeFile(i); }}
                                        className="p-1 hover:bg-white/[0.1] rounded-lg transition-colors"
                                    >
                                        <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                )}
                                {f.status === 'uploading' && (
                                    <svg className="w-5 h-5 text-accent-purple animate-spin" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                    </svg>
                                )}
                            </div>
                        </div>
                    ))}

                    <div className="flex items-center justify-between pt-2">
                        <p className="text-sm text-gray-400">{files.length} file(s) selected</p>
                        <div className="flex gap-2">
                            {hasFailed && (
                                <Button variant="ghost" size="sm" onClick={clearFailed}>
                                    Clear Failed
                                </Button>
                            )}
                            <Button variant="ghost" size="sm" onClick={() => setFiles([])} disabled={uploading}>
                                Clear All
                            </Button>
                            {hasPending && (
                                <Button size="sm" onClick={handleUpload} loading={uploading}>
                                    Upload {files.filter((f) => f.status === 'pending').length} Photo{files.filter((f) => f.status === 'pending').length > 1 ? 's' : ''}
                                </Button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
