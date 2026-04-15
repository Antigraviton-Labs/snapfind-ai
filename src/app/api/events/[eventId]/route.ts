import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { updateEventSchema } from '@/lib/validation';
import Event from '@/models/Event';
import Photo from '@/models/Photo';
import FaceEmbedding from '@/models/FaceEmbedding';
import User from '@/models/User';
import { deleteEventFolder } from '@/lib/cloudinary';
import { logger } from '@/lib/logger';

interface RouteParams {
    params: { eventId: string };
}

// GET /api/events/[eventId]
export async function GET(req: NextRequest, { params }: RouteParams) {
    try {
        const user = await requireAuth(req);
        await connectDB();

        const event = await Event.findOne({
            _id: params.eventId,
            photographerId: user._id,
        }).lean();

        if (!event) {
            return NextResponse.json({ error: 'Event not found' }, { status: 404 });
        }

        // Get photo stats
        const [totalPhotos, processingPhotos, readyPhotos, failedPhotos] = await Promise.all([
            Photo.countDocuments({ eventId: params.eventId }),
            Photo.countDocuments({ eventId: params.eventId, status: 'processing' }),
            Photo.countDocuments({ eventId: params.eventId, status: 'ready' }),
            Photo.countDocuments({ eventId: params.eventId, status: 'failed' }),
        ]);

        return NextResponse.json({
            event,
            stats: { totalPhotos, processingPhotos, readyPhotos, failedPhotos },
        });
    } catch (error: unknown) {
        if (error instanceof Error && error.message === 'Authentication required') {
            return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
        }
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// PUT /api/events/[eventId]
export async function PUT(req: NextRequest, { params }: RouteParams) {
    try {
        const user = await requireAuth(req);
        await connectDB();

        const body = await req.json();
        const parsed = updateEventSchema.safeParse(body);

        if (!parsed.success) {
            return NextResponse.json(
                { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
                { status: 400 }
            );
        }

        const event = await Event.findOneAndUpdate(
            { _id: params.eventId, photographerId: user._id },
            {
                ...parsed.data,
                ...(parsed.data.date && { date: new Date(parsed.data.date) }),
                ...(parsed.data.expiresAt && { expiresAt: new Date(parsed.data.expiresAt) }),
            },
            { new: true }
        );

        if (!event) {
            return NextResponse.json({ error: 'Event not found' }, { status: 404 });
        }

        return NextResponse.json({ event });
    } catch (error: unknown) {
        if (error instanceof Error && error.message === 'Authentication required') {
            return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
        }
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// DELETE /api/events/[eventId] — cascade deletion
export async function DELETE(req: NextRequest, { params }: RouteParams) {
    try {
        const user = await requireAuth(req);
        await connectDB();

        const event = await Event.findOne({
            _id: params.eventId,
            photographerId: user._id,
        });

        if (!event) {
            return NextResponse.json({ error: 'Event not found' }, { status: 404 });
        }

        // 1. Calculate total storage of photos being deleted
        const photos = await Photo.find({ eventId: params.eventId }).select('fileSize').lean();
        const totalSize = photos.reduce((sum, p) => sum + (p.fileSize || 0), 0);

        // 2. Delete from Cloudinary
        try {
            await deleteEventFolder(params.eventId);
        } catch (error) {
            logger.error('Cloudinary cleanup failed during event delete', { eventId: params.eventId, error });
            // Continue with DB cleanup even if Cloudinary fails
        }

        // 3. Delete face embeddings
        const embeddingsDeleted = await FaceEmbedding.deleteMany({ eventId: params.eventId });

        // 4. Delete photos from DB
        const photosDeleted = await Photo.deleteMany({ eventId: params.eventId });

        // 5. Update user storage (guard against negatives)
        await User.findByIdAndUpdate(user._id, { $inc: { storageUsed: -totalSize } });
        await User.updateOne({ _id: user._id, storageUsed: { $lt: 0 } }, { $set: { storageUsed: 0 } });

        // 6. Delete event
        await Event.findByIdAndDelete(params.eventId);

        logger.info('Event deleted (cascade)', {
            eventId: params.eventId,
            photosDeleted: photosDeleted.deletedCount,
            embeddingsDeleted: embeddingsDeleted.deletedCount,
            storageFreed: totalSize,
        });

        return NextResponse.json({
            message: 'Event deleted successfully',
            summary: {
                photosDeleted: photosDeleted.deletedCount,
                embeddingsDeleted: embeddingsDeleted.deletedCount,
                storageFreed: totalSize,
            },
        });
    } catch (error: unknown) {
        if (error instanceof Error && error.message === 'Authentication required') {
            return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
        }
        logger.error('Delete event error', { eventId: params.eventId, error: String(error) });
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
