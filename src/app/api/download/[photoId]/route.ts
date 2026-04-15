import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { getDownloadUrl } from '@/lib/cloudinary';
import Photo from '@/models/Photo';
import Event from '@/models/Event';
import User from '@/models/User';
import DownloadLog from '@/models/DownloadLog';
import { logger } from '@/lib/logger';
import { getPlanConfig } from '@/lib/planLimits';

interface RouteParams {
    params: { photoId: string };
}

function getClientIPFromRequest(req: NextRequest): string {
    return (
        req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
        req.headers.get('x-real-ip') ||
        'unknown'
    );
}

// GET /api/download/[photoId] — get download URL + enforce limits
export async function GET(req: NextRequest, { params }: RouteParams) {
    try {
        await connectDB();

        const photo = await Photo.findById(params.photoId)
            .select('cloudinaryPublicId imageUrl watermarkedUrl eventId status fileSize')
            .lean();

        if (!photo) {
            return NextResponse.json({ error: 'Photo not found' }, { status: 404 });
        }

        if (photo.status === 'processing') {
            return NextResponse.json({ error: 'Photo is still being processed' }, { status: 400 });
        }

        // Look up event → photographer → plan
        const event = await Event.findById(photo.eventId).select('photographerId').lean();
        if (!event) {
            return NextResponse.json({ error: 'Event not found' }, { status: 404 });
        }

        const photographer = await User.findById(event.photographerId).select('plan').lean();
        const photographerPlan = photographer?.plan || 'free';

        // Determine downloader identity (hybrid: userId if logged in, else IP)
        const ipAddress = getClientIPFromRequest(req);
        let authUser = null;
        try {
            authUser = await getAuthUser(req);
        } catch {
            // Not logged in — that's fine for public downloads
        }
        const identifier = authUser ? authUser._id.toString() : ipAddress;

        // Check download limit (based on photographer's plan)
        const config = getPlanConfig(photographerPlan);
        if (config.downloadsPerDay !== Infinity) {
            try {
                const todayStart = new Date();
                todayStart.setHours(0, 0, 0, 0);

                const count = await DownloadLog.countDocuments({
                    identifier,
                    downloadedAt: { $gte: todayStart },
                });

                if (count >= config.downloadsPerDay) {
                    logger.info('Download limit exceeded', { identifier, plan: photographerPlan, count, limit: config.downloadsPerDay });
                    return NextResponse.json(
                        { error: `Daily download limit reached (${config.downloadsPerDay}/day). Please try again tomorrow.`, remaining: 0 },
                        { status: 429, headers: { 'Retry-After': '86400' } }
                    );
                }
            } catch (limitError) {
                // Don't block downloads if limit check fails — log and continue
                logger.error('Download limit check failed (non-fatal)', { error: String(limitError) });
            }
        }

        // Get plan-aware download URL (handles watermark)
        const downloadUrl = getDownloadUrl(
            { imageUrl: photo.imageUrl, watermarkedUrl: photo.watermarkedUrl },
            photographerPlan
        );

        // Log download with hybrid identity (non-blocking, don't fail the download)
        try {
            await DownloadLog.create({
                photoId: params.photoId,
                eventId: photo.eventId,
                identifier,
                userId: authUser?._id?.toString() || undefined,
                ipAddress,
            });
        } catch (logError) {
            logger.error('Download log creation failed (non-fatal)', { error: String(logError) });
        }

        return NextResponse.json({
            downloadUrl,
        });
    } catch (error) {
        logger.error('Download error', { photoId: params.photoId, error: String(error) });
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
