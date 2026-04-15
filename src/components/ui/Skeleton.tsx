'use client';

interface SkeletonProps {
    className?: string;
    variant?: 'text' | 'circular' | 'rectangular' | 'card';
}

export function Skeleton({ className = '', variant = 'rectangular' }: SkeletonProps) {
    const variants = {
        text: 'h-4 rounded',
        circular: 'rounded-full',
        rectangular: 'rounded-xl',
        card: 'rounded-2xl',
    };

    return (
        <div
            className={`
        bg-gradient-to-r from-dark-50 via-dark-100 to-dark-50
        bg-[length:200%_100%] animate-shimmer
        ${variants[variant]}
        ${className}
      `}
        />
    );
}

export function StatCardSkeleton() {
    return (
        <div className="glass-card p-6 space-y-3">
            <Skeleton className="h-4 w-24" variant="text" />
            <Skeleton className="h-8 w-20" variant="text" />
            <Skeleton className="h-3 w-32" variant="text" />
        </div>
    );
}

export function PhotoGridSkeleton({ count = 8 }: { count?: number }) {
    return (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.from({ length: count }).map((_, i) => (
                <Skeleton key={i} className="aspect-square" variant="card" />
            ))}
        </div>
    );
}

export function EventCardSkeleton() {
    return (
        <div className="glass-card p-6 space-y-4">
            <Skeleton className="h-5 w-3/4" variant="text" />
            <Skeleton className="h-4 w-1/2" variant="text" />
            <div className="flex gap-4">
                <Skeleton className="h-4 w-20" variant="text" />
                <Skeleton className="h-4 w-20" variant="text" />
            </div>
        </div>
    );
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
    return (
        <div className="space-y-3">
            {Array.from({ length: rows }).map((_, i) => (
                <div key={i} className="flex gap-4 items-center">
                    <Skeleton className="h-10 w-10" variant="circular" />
                    <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-3/4" variant="text" />
                        <Skeleton className="h-3 w-1/2" variant="text" />
                    </div>
                </div>
            ))}
        </div>
    );
}
