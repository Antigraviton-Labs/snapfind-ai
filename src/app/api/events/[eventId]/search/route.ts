import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { findMatchesByEvent } from '@/lib/embeddingSearch';
import { checkRateLimit, rateLimitResponse, FACE_SCAN_LIMITER } from '@/lib/rateLimiter';
import { faceSearchSchema } from '@/lib/validation';
import Event from '@/models/Event';
import { logger } from '@/lib/logger';

interface RouteParams {
    params: { eventId: string };
}

const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB for face scan images

// POST /api/events/[eventId]/search — face search
export async function POST(req: NextRequest, { params }: RouteParams) {
    const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';

    try {
        // Rate limiting
        const rateCheck = checkRateLimit(req, FACE_SCAN_LIMITER);
        if (!rateCheck.allowed) {
            logger.suspiciousActivity(clientIp, 'Face scan rate limit exceeded');
            return rateLimitResponse(rateCheck.resetIn);
        }

        await connectDB();

        // Verify event exists and is accessible
        const event = await Event.findById(params.eventId).select('+password').lean();
        if (!event) {
            return NextResponse.json({ error: 'Event not found' }, { status: 404 });
        }

        // Check event expiry
        if (event.expiresAt && new Date(event.expiresAt) < new Date()) {
            return NextResponse.json({ error: 'This event has expired' }, { status: 410 });
        }

        // For private events, verify password
        if (event.privacy === 'private' && event.password) {
            const eventPassword = req.headers.get('x-event-password');
            if (!eventPassword || eventPassword !== event.password) {
                return NextResponse.json({ error: 'Password required to access this event' }, { status: 403 });
            }
        }

        const formData = await req.formData();
        const faceImage = formData.get('face') as File | null;
        const thresholdStr = formData.get('threshold') as string | null;
        const pageStr = formData.get('page') as string | null;
        const limitStr = formData.get('limit') as string | null;

        if (!faceImage) {
            return NextResponse.json({ error: 'Face image is required' }, { status: 400 });
        }

        // Validate file size
        if (faceImage.size > MAX_IMAGE_SIZE) {
            return NextResponse.json({ error: 'Face image too large. Max 5MB.' }, { status: 400 });
        }

        const options = faceSearchSchema.parse({
            threshold: thresholdStr ? parseFloat(thresholdStr) : 0.6,
            page: pageStr ? parseInt(pageStr) : 1,
            limit: limitStr ? parseInt(limitStr) : 20,
        });

        // Send face image to AI service for embedding extraction
        const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';
        const aiFormData = new FormData();
        aiFormData.append('file', faceImage);

        const aiResponse = await fetch(`${AI_SERVICE_URL}/compare-faces`, {
            method: 'POST',
            body: aiFormData,
            signal: AbortSignal.timeout(30000),
        });

        if (!aiResponse.ok) {
            throw new Error(`AI service error: ${aiResponse.status}`);
        }

        const aiResult = await aiResponse.json();

        if (!aiResult.embedding || !Array.isArray(aiResult.embedding)) {
            return NextResponse.json(
                { error: 'No face detected in the image. Please try again with a clearer photo.' },
                { status: 400 }
            );
        }

        // Search for matches using the embedding search abstraction
        const { matches, total } = await findMatchesByEvent(
            params.eventId,
            aiResult.embedding,
            options
        );

        return NextResponse.json({
            matches,
            pagination: {
                page: options.page,
                limit: options.limit,
                total,
                pages: Math.ceil(total / options.limit),
            },
            remaining: rateCheck.remaining,
        });
    } catch (error) {
        logger.searchFailure(params.eventId, clientIp, error);
        if (error instanceof Error && error.message.includes('AI service')) {
            return NextResponse.json(
                { error: 'Face recognition service is temporarily unavailable. Please try again.' },
                { status: 503 }
            );
        }
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
