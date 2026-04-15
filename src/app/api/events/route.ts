import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { createEventSchema } from '@/lib/validation';
import { checkEventLimit } from '@/lib/planLimits';
import { generateSlug, generateEventCode } from '@/lib/utils';
import Event from '@/models/Event';
import { logger } from '@/lib/logger';

// GET /api/events — list authenticated user's events
export async function GET(req: NextRequest) {
    try {
        const user = await requireAuth(req);
        await connectDB();

        const page = parseInt(req.nextUrl.searchParams.get('page') || '1');
        const limit = parseInt(req.nextUrl.searchParams.get('limit') || '20');
        const skip = (page - 1) * limit;

        const [events, total] = await Promise.all([
            Event.find({ photographerId: user._id })
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            Event.countDocuments({ photographerId: user._id }),
        ]);

        return NextResponse.json({
            events,
            pagination: { page, limit, total, pages: Math.ceil(total / limit) },
        });
    } catch (error: unknown) {
        if (error instanceof Error && error.message === 'Authentication required') {
            return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
        }
        logger.error('List events error', { error: error instanceof Error ? error.message : String(error) });
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// POST /api/events — create new event
export async function POST(req: NextRequest) {
    try {
        const user = await requireAuth(req);
        await connectDB();

        const body = await req.json();
        const parsed = createEventSchema.safeParse(body);

        if (!parsed.success) {
            return NextResponse.json(
                { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
                { status: 400 }
            );
        }

        // Check plan limits
        const userPlan = (user as unknown as { plan?: string }).plan || 'free';
        const limitCheck = await checkEventLimit(user._id.toString(), userPlan);
        if (!limitCheck.allowed) {
            return NextResponse.json({ error: limitCheck.message }, { status: 403 });
        }

        const slug = generateSlug(parsed.data.title);
        const eventCode = generateEventCode();

        const event = await Event.create({
            ...parsed.data,
            slug,
            eventCode,
            photographerId: user._id,
            date: new Date(parsed.data.date),
            expiresAt: parsed.data.expiresAt ? new Date(parsed.data.expiresAt) : undefined,
        });

        logger.info('Event created', { eventId: event._id.toString(), slug });

        return NextResponse.json({ event }, { status: 201 });
    } catch (error: unknown) {
        if (error instanceof Error && error.message === 'Authentication required') {
            return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
        }
        logger.error('Create event error', { error: error instanceof Error ? error.message : String(error) });
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
