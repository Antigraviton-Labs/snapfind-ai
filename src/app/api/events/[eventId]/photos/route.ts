import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { uploadToCloudinary } from '@/lib/cloudinary';
import { checkPhotoLimit, checkStorageLimit } from '@/lib/planLimits';
import { enqueueFaceProcessing } from '@/lib/queue';
import { generateFilename, computeImageHash, isImageDuplicate } from '@/lib/utils';
import Event from '@/models/Event';
import Photo from '@/models/Photo';
import User from '@/models/User';
import { logger } from '@/lib/logger';

interface RouteParams {
    params: { eventId: string };
}

const MAX_BATCH_SIZE = 20;
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

// GET /api/events/[eventId]/photos — list photos with cursor pagination
export async function GET(req: NextRequest, { params }: RouteParams) {
    try {
        const user = await requireAuth(req);
        await connectDB();

        // Verify event ownership
        const event = await Event.findOne({ _id: params.eventId, photographerId: user._id }).lean();
        if (!event) {
            return NextResponse.json({ error: 'Event not found' }, { status: 404 });
        }

        const cursor = req.nextUrl.searchParams.get('cursor');
        const limit = Math.min(parseInt(req.nextUrl.searchParams.get('limit') || '20'), 50);
        const status = req.nextUrl.searchParams.get('status');

        const query: Record<string, unknown> = { eventId: params.eventId };
        if (cursor) query._id = { $lt: cursor };
        if (status) query.status = status;

        const photos = await Photo.find(query)
            .sort({ _id: -1 })
            .limit(limit + 1)
            .select('imageUrl thumbnailUrl watermarkedUrl facesCount status fileSize createdAt')
            .lean();

        const hasMore = photos.length > limit;
        const results = hasMore ? photos.slice(0, limit) : photos;
        const nextCursor = hasMore ? results[results.length - 1]._id.toString() : null;

        return NextResponse.json({
            photos: results,
            pagination: { nextCursor, hasMore },
        });
    } catch (error: unknown) {
        if (error instanceof Error && error.message === 'Authentication required') {
            return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
        }
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// POST /api/events/[eventId]/photos — bulk upload (max 20 files)
export async function POST(req: NextRequest, { params }: RouteParams) {
    try {
        const user = await requireAuth(req);
        await connectDB();

        // Verify event ownership
        const event = await Event.findOne({ _id: params.eventId, photographerId: user._id });
        if (!event) {
            return NextResponse.json({ error: 'Event not found' }, { status: 404 });
        }

        const formData = await req.formData();
        const files = formData.getAll('photos') as File[];

        if (!files.length) {
            return NextResponse.json({ error: 'No files uploaded' }, { status: 400 });
        }
        if (files.length > MAX_BATCH_SIZE) {
            return NextResponse.json({ error: `Maximum ${MAX_BATCH_SIZE} files per batch` }, { status: 400 });
        }

        // Validate file types and sizes
        for (const file of files) {
            if (!ALLOWED_TYPES.includes(file.type)) {
                return NextResponse.json({ error: `Invalid file type: ${file.name}. Allowed: jpg, jpeg, png` }, { status: 400 });
            }
            if (file.size > MAX_FILE_SIZE) {
                return NextResponse.json({ error: `File too large: ${file.name}. Max 10MB.` }, { status: 400 });
            }
        }

        // Check plan limits
        const userDoc = await User.findById(user._id).lean();
        if (!userDoc) return NextResponse.json({ error: 'User not found' }, { status: 404 });

        const photoLimitCheck = await checkPhotoLimit(params.eventId, userDoc.plan, files.length);
        if (!photoLimitCheck.allowed) {
            return NextResponse.json({ error: photoLimitCheck.message }, { status: 403 });
        }

        const totalBytes = files.reduce((sum, f) => sum + f.size, 0);
        const storageCheck = checkStorageLimit(userDoc, totalBytes);
        if (!storageCheck.allowed) {
            return NextResponse.json({ error: storageCheck.message }, { status: 403 });
        }

        // Get existing hashes for duplicate detection
        const existingPhotos = await Photo.find({ eventId: params.eventId, pHash: { $exists: true } })
            .select('pHash')
            .lean();
        const existingHashes = existingPhotos.map(p => p.pHash!).filter(Boolean);

        const results: Array<{ filename: string; status: string; photoId?: string; error?: string }> = [];
        let totalUploaded = 0;
        let actualUploadedBytes = 0;

        for (const file of files) {
            try {
                const buffer = Buffer.from(await file.arrayBuffer());

                // Duplicate detection
                const pHash = await computeImageHash(buffer);
                const isDuplicate = existingHashes.some(h => isImageDuplicate(pHash, h));
                if (isDuplicate) {
                    results.push({ filename: file.name, status: 'skipped', error: 'Duplicate image detected' });
                    continue;
                }

                const ext = file.name.split('.').pop() || 'jpg';
                const filename = generateFilename(ext);

                // Upload to Cloudinary
                const uploadResult = await uploadToCloudinary(buffer, params.eventId, filename);

                // Save to DB
                const photo = await Photo.create({
                    eventId: params.eventId,
                    cloudinaryPublicId: uploadResult.publicId,
                    imageUrl: uploadResult.imageUrl,
                    thumbnailUrl: uploadResult.thumbnailUrl,
                    watermarkedUrl: uploadResult.watermarkedUrl,
                    fileSize: uploadResult.fileSize,
                    status: 'processing',
                    pHash,
                });

                // Enqueue face processing with plan for priority
                await enqueueFaceProcessing({
                    photoId: photo._id.toString(),
                    eventId: params.eventId,
                    imageUrl: uploadResult.imageUrl,
                    plan: userDoc.plan,
                });

                existingHashes.push(pHash);
                totalUploaded++;
                actualUploadedBytes += uploadResult.fileSize;

                results.push({
                    filename: file.name,
                    status: 'uploaded',
                    photoId: photo._id.toString(),
                });
            } catch (error) {
                logger.uploadFailure(params.eventId, file.name, error);
                results.push({
                    filename: file.name,
                    status: 'failed',
                    error: error instanceof Error ? error.message : 'Upload failed',
                });
            }
        }

        // Update counts using ACTUAL uploaded bytes (not total batch size)
        if (totalUploaded > 0) {
            await Promise.all([
                Event.findByIdAndUpdate(params.eventId, {
                    $inc: { totalPhotos: totalUploaded, storageUsed: actualUploadedBytes },
                }),
                User.findByIdAndUpdate(user._id, {
                    $inc: { storageUsed: actualUploadedBytes },
                }),
            ]);
        }

        return NextResponse.json({
            results,
            summary: {
                total: files.length,
                uploaded: results.filter(r => r.status === 'uploaded').length,
                skipped: results.filter(r => r.status === 'skipped').length,
                failed: results.filter(r => r.status === 'failed').length,
            },
        });
    } catch (error: unknown) {
        if (error instanceof Error && error.message === 'Authentication required') {
            return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
        }
        logger.error('Bulk upload error', { eventId: params.eventId, error: String(error) });
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
