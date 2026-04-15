import { NextRequest, NextResponse } from 'next/server';
import { OAuth2Client } from 'google-auth-library';
import { connectDB } from '@/lib/db';
import { signToken } from '@/lib/auth';
import User from '@/models/User';
import { logger } from '@/lib/logger';

// Initialize Google OAuth client
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

/**
 * POST /api/auth/google
 * Verify Google ID token, find or create user, return app JWT
 */
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { token } = body;

        if (!token) {
            return NextResponse.json({ error: 'Google token is required' }, { status: 400 });
        }

        // ── Step 1: Verify the Google ID token ──
        let payload;
        try {
            const ticket = await googleClient.verifyIdToken({
                idToken: token,
                audience: process.env.GOOGLE_CLIENT_ID,
            });
            payload = ticket.getPayload();
        } catch (error) {
            logger.error('Google token verification failed', { error: String(error) });
            return NextResponse.json({ error: 'Invalid Google token' }, { status: 401 });
        }

        if (!payload || !payload.email) {
            return NextResponse.json({ error: 'Unable to extract user info from Google token' }, { status: 400 });
        }

        const { email, name, picture, email_verified } = payload;

        if (!email_verified) {
            return NextResponse.json({ error: 'Google email is not verified' }, { status: 400 });
        }

        // ── Step 2: Find or create user ──
        await connectDB();

        let user = await User.findOne({ email });

        if (user) {
            // Existing user — if they signed up with password, link their Google account
            if (user.provider === 'local' && !user.avatar && picture) {
                user.avatar = picture;
                await user.save();
            }
        } else {
            // New user — create account via Google (no password needed)
            user = await User.create({
                name: name || email.split('@')[0],
                email,
                avatar: picture || undefined,
                provider: 'google',
                role: 'user',
                plan: 'free',
            });
            logger.info('User registered via Google', { userId: user._id.toString(), email });
        }

        // ── Step 3: Issue our app JWT ──
        const appToken = signToken({
            userId: user._id.toString(),
            email: user.email,
            role: user.role,
        });

        logger.info('Google login successful', { userId: user._id.toString(), email });

        return NextResponse.json({
            token: appToken,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                plan: user.plan,
                avatar: user.avatar,
            },
        });
    } catch (error) {
        logger.error('Google auth error', { error: error instanceof Error ? error.message : String(error) });
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
