import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { hashPassword, signToken } from '@/lib/auth';
import { signupSchema } from '@/lib/validation';
import User from '@/models/User';
import { logger } from '@/lib/logger';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const parsed = signupSchema.safeParse(body);

        if (!parsed.success) {
            return NextResponse.json(
                { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
                { status: 400 }
            );
        }

        await connectDB();

        // Check duplicate email
        const existing = await User.findOne({ email: parsed.data.email });
        if (existing) {
            return NextResponse.json({ error: 'Email already registered' }, { status: 409 });
        }

        const hashedPassword = await hashPassword(parsed.data.password);

        const user = await User.create({
            name: parsed.data.name,
            email: parsed.data.email,
            password: hashedPassword,
            role: 'user',
            plan: 'free',
        });

        const token = signToken({
            userId: user._id.toString(),
            email: user.email,
            role: user.role,
        });

        logger.info('User registered', { userId: user._id.toString(), email: user.email });

        return NextResponse.json(
            {
                token,
                user: {
                    id: user._id,
                    name: user.name,
                    email: user.email,
                    role: user.role,
                    plan: user.plan,
                },
            },
            { status: 201 }
        );
    } catch (error) {
        logger.error('Signup error', { error: error instanceof Error ? error.message : String(error) });
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
