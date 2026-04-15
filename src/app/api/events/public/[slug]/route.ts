import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import Event from '@/models/Event';
import Photo from '@/models/Photo';

interface RouteParams {
    params: { slug: string };
}

// GET /api/events/public/[slug] — public event data
// For private events: returns only basic info + requiresPassword flag (no photos)
// For public events: returns full event + photos
export async function GET(req: NextRequest, { params }: RouteParams) {
    try {
        await connectDB();

        const event = await Event.findOne({ slug: params.slug })
            .select('-password')
            .lean();

        if (!event) {
            return NextResponse.json({ error: 'Event not found' }, { status: 404 });
        }

        // Check expiry
        if (event.expiresAt && new Date(event.expiresAt) < new Date()) {
            return NextResponse.json({ error: 'This event has expired' }, { status: 410 });
        }

        // If private event, return limited info — require password via POST
        if (event.privacy === 'private') {
            return NextResponse.json({
                event: {
                    id: event._id,
                    title: event.title,
                    slug: event.slug,
                    date: event.date,
                    location: event.location,
                    privacy: event.privacy,
                    requiresPassword: true,
                    totalPhotos: 0,
                },
                photos: [],
                pagination: { page: 1, limit: 20, total: 0, pages: 0 },
            });
        }

        // Public event — return everything
        const page = parseInt(req.nextUrl.searchParams.get('page') || '1');
        const limit = Math.min(parseInt(req.nextUrl.searchParams.get('limit') || '20'), 50);
        const skip = (page - 1) * limit;

        const [photos, totalPhotos] = await Promise.all([
            Photo.find({ eventId: event._id, status: 'ready' })
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .select('_id imageUrl thumbnailUrl watermarkedUrl facesCount createdAt')
                .lean(),
            Photo.countDocuments({ eventId: event._id, status: 'ready' }),
        ]);

        return NextResponse.json({
            event: {
                id: event._id,
                title: event.title,
                slug: event.slug,
                date: event.date,
                location: event.location,
                privacy: event.privacy,
                totalPhotos,
            },
            photos,
            pagination: { page, limit, total: totalPhotos, pages: Math.ceil(totalPhotos / limit) },
        });
    } catch {
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// POST /api/events/public/[slug] — verify password for private events
export async function POST(req: NextRequest, { params }: RouteParams) {
    try {
        await connectDB();

        const body = await req.json();
        const { password } = body;

        if (!password) {
            return NextResponse.json({ error: 'Password is required' }, { status: 400 });
        }

        // Fetch event WITH password for comparison
        const event = await Event.findOne({ slug: params.slug })
            .select('+password')
            .lean();

        if (!event) {
            return NextResponse.json({ error: 'Event not found' }, { status: 404 });
        }

        // Check expiry
        if (event.expiresAt && new Date(event.expiresAt) < new Date()) {
            return NextResponse.json({ error: 'This event has expired' }, { status: 410 });
        }

        if (event.privacy !== 'private') {
            return NextResponse.json({ error: 'This event is not password protected' }, { status: 400 });
        }

        // Validate password (plain text comparison — password stored as plain text)
        if (event.password !== password) {
            return NextResponse.json({ error: 'Incorrect password' }, { status: 403 });
        }

        // Password correct — return full event data with photos
        const page = parseInt(req.nextUrl.searchParams.get('page') || '1');
        const limit = Math.min(parseInt(req.nextUrl.searchParams.get('limit') || '20'), 50);
        const skip = (page - 1) * limit;

        const [photos, totalPhotos] = await Promise.all([
            Photo.find({ eventId: event._id, status: 'ready' })
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .select('_id imageUrl thumbnailUrl watermarkedUrl facesCount createdAt')
                .lean(),
            Photo.countDocuments({ eventId: event._id, status: 'ready' }),
        ]);

        return NextResponse.json({
            event: {
                id: event._id,
                title: event.title,
                slug: event.slug,
                date: event.date,
                location: event.location,
                privacy: event.privacy,
                totalPhotos,
            },
            photos,
            pagination: { page, limit, total: totalPhotos, pages: Math.ceil(totalPhotos / limit) },
        });
    } catch {
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
