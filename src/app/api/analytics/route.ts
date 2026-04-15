import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { getPlanConfig } from '@/lib/planLimits';
import Event from '@/models/Event';
import Photo from '@/models/Photo';
import DownloadLog from '@/models/DownloadLog';
import User from '@/models/User';
import { formatBytes } from '@/lib/utils';

// GET /api/analytics — dashboard analytics with plan limits
export async function GET(req: NextRequest) {
    try {
        const user = await requireAuth(req);
        await connectDB();

        const userId = user._id;

        // Get all events for this user (with per-event storage)
        const events = await Event.find({ photographerId: userId })
            .select('_id title totalPhotos storageUsed createdAt')
            .lean();
        const eventIds = events.map(e => e._id);

        // Aggregate stats
        const [
            totalPhotos,
            readyPhotos,
            processingPhotos,
            failedPhotos,
            totalDownloads,
            recentDownloads,
            userDoc,
        ] = await Promise.all([
            Photo.countDocuments({ eventId: { $in: eventIds } }),
            Photo.countDocuments({ eventId: { $in: eventIds }, status: 'ready' }),
            Photo.countDocuments({ eventId: { $in: eventIds }, status: 'processing' }),
            Photo.countDocuments({ eventId: { $in: eventIds }, status: 'failed' }),
            DownloadLog.countDocuments({ eventId: { $in: eventIds } }),
            DownloadLog.countDocuments({
                eventId: { $in: eventIds },
                downloadedAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
            }),
            User.findById(userId).select('storageUsed plan').lean(),
        ]);

        const plan = userDoc?.plan || 'free';
        const config = getPlanConfig(plan);

        // Popular events (by downloads)
        const popularEvents = await DownloadLog.aggregate([
            { $match: { eventId: { $in: eventIds } } },
            { $group: { _id: '$eventId', downloads: { $sum: 1 } } },
            { $sort: { downloads: -1 } },
            { $limit: 5 },
        ]);

        const populatedPopular = popularEvents.map(pe => {
            const event = events.find(e => e._id.toString() === pe._id.toString());
            return {
                eventId: pe._id,
                title: event?.title || 'Unknown',
                downloads: pe.downloads,
            };
        });

        // Downloads per day (last 7 days) for chart
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const dailyDownloads = await DownloadLog.aggregate([
            { $match: { eventId: { $in: eventIds }, downloadedAt: { $gte: sevenDaysAgo } } },
            {
                $group: {
                    _id: { $dateToString: { format: '%Y-%m-%d', date: '$downloadedAt' } },
                    count: { $sum: 1 },
                },
            },
            { $sort: { _id: 1 } },
        ]);

        // Per-event storage breakdown
        const eventsWithStorage = events.map(e => ({
            _id: e._id,
            title: e.title,
            totalPhotos: e.totalPhotos,
            storageUsed: e.storageUsed || 0,
            storageFormatted: formatBytes(e.storageUsed || 0),
            createdAt: e.createdAt,
        }));

        return NextResponse.json({
            overview: {
                totalEvents: events.length,
                totalPhotos,
                readyPhotos,
                processingPhotos,
                failedPhotos,
                totalDownloads,
                recentDownloads,
                storageUsed: userDoc?.storageUsed || 0,
                storageFormatted: formatBytes(userDoc?.storageUsed || 0),
                plan,
            },
            // Plan limits vs current usage for progress bars
            limits: {
                plan,
                events: {
                    used: events.length,
                    limit: config.maxEvents === Infinity ? null : config.maxEvents,
                    unlimited: config.maxEvents === Infinity,
                },
                storage: {
                    used: userDoc?.storageUsed || 0,
                    usedFormatted: formatBytes(userDoc?.storageUsed || 0),
                    limit: config.storageBytes,
                    limitFormatted: formatBytes(config.storageBytes),
                    percentage: Math.round(((userDoc?.storageUsed || 0) / config.storageBytes) * 100),
                },
                photosPerEvent: config.photosPerEvent,
                downloadsPerDay: config.downloadsPerDay === Infinity ? null : config.downloadsPerDay,
                faceScansPerMinute: config.faceScansPerMinute,
                watermarkForced: config.watermarkForced,
                priorityProcessing: config.priorityProcessing,
            },
            popularEvents: populatedPopular,
            dailyDownloads,
            recentEvents: eventsWithStorage
                .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                .slice(0, 5),
        });
    } catch (error: unknown) {
        if (error instanceof Error && error.message === 'Authentication required') {
            return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
        }
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
