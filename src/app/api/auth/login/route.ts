import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { comparePassword, signToken } from '@/lib/auth';
import { loginSchema } from '@/lib/validation';
import User from '@/models/User';
import { logger } from '@/lib/logger';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const parsed = loginSchema.safeParse(body);

        if (!parsed.success) {
            return NextResponse.json(
                { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
                { status: 400 }
            );
        }

        await connectDB();

        const user = await User.findOne({ email: parsed.data.email }).select('+password');
        if (!user) {
            return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
        }

        // If user registered via Google and has no password, prompt them
        if (!user.password) {
            return NextResponse.json(
                { error: 'This account uses Google login. Please sign in with Google.' },
                { status: 401 }
            );
        }

        const isValid = await comparePassword(parsed.data.password, user.password);
        if (!isValid) {
            return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
        }

        const token = signToken({
            userId: user._id.toString(),
            email: user.email,
            role: user.role,
        });

        logger.info('User logged in', { userId: user._id.toString() });

        return NextResponse.json({
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                plan: user.plan,
            },
        });
    } catch (error) {
        logger.error('Login error', { error: error instanceof Error ? error.message : String(error) });
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
