import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { deleteFromCloudinary } from '@/lib/cloudinary';
import Event from '@/models/Event';
import Photo from '@/models/Photo';
import FaceEmbedding from '@/models/FaceEmbedding';
import User from '@/models/User';
import { logger } from '@/lib/logger';

interface RouteParams {
    params: { eventId: string; photoId: string };
}

// DELETE /api/events/[eventId]/photos/[photoId]
export async function DELETE(req: NextRequest, { params }: RouteParams) {
    try {
        const user = await requireAuth(req);
        await connectDB();

        // Verify event ownership
        const event = await Event.findOne({
            _id: params.eventId,
            photographerId: user._id,
        }).lean();

        if (!event) {
            return NextResponse.json({ error: 'Event not found' }, { status: 404 });
        }

        // Find the photo
        const photo = await Photo.findOne({
            _id: params.photoId,
            eventId: params.eventId,
        });

        if (!photo) {
            return NextResponse.json({ error: 'Photo not found' }, { status: 404 });
        }

        const fileSize = photo.fileSize || 0;

        // 1. Delete from Cloudinary
        try {
            await deleteFromCloudinary(photo.cloudinaryPublicId);
        } catch (error) {
            logger.error('Cloudinary delete failed for photo', {
                photoId: params.photoId,
                publicId: photo.cloudinaryPublicId,
                error,
            });
            // Continue with DB cleanup
        }

        // 2. Delete face embeddings for this photo
        await FaceEmbedding.deleteMany({ photoId: params.photoId });

        // 3. Delete photo document
        await Photo.findByIdAndDelete(params.photoId);

        // 4. Update event photo count/storage and user storage (guard against negatives)
        await Promise.all([
            Event.findByIdAndUpdate(params.eventId, {
                $inc: { totalPhotos: -1, storageUsed: -fileSize },
            }),
            User.findByIdAndUpdate(user._id, {
                $inc: { storageUsed: -fileSize },
            }),
        ]);

        // Guard against negative values (can happen from legacy data inconsistencies)
        await Promise.all([
            Event.updateOne({ _id: params.eventId, storageUsed: { $lt: 0 } }, { $set: { storageUsed: 0 } }),
            User.updateOne({ _id: user._id, storageUsed: { $lt: 0 } }, { $set: { storageUsed: 0 } }),
        ]);

        logger.info('Photo deleted', {
            photoId: params.photoId,
            eventId: params.eventId,
            storageFreed: fileSize,
        });

        return NextResponse.json({ message: 'Photo deleted successfully' });
    } catch (error: unknown) {
        if (error instanceof Error && error.message === 'Authentication required') {
            return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
        }
        logger.error('Delete photo error', {
            eventId: params.eventId,
            photoId: params.photoId,
            error: String(error),
        });
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
