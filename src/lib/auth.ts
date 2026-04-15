import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { NextRequest } from 'next/server';
import { connectDB } from './db';
import User from '@/models/User';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-change-me';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

export interface JWTPayload {
    userId: string;
    email: string;
    role: string;
}

export async function hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 12);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
}

export function signToken(payload: JWTPayload): string {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN } as jwt.SignOptions);
}

export function verifyToken(token: string): JWTPayload {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
}

export function getTokenFromRequest(req: NextRequest): string | null {
    const authHeader = req.headers.get('authorization');
    if (authHeader?.startsWith('Bearer ')) {
        return authHeader.substring(7);
    }
    return req.cookies.get('token')?.value || null;
}

export async function getAuthUser(req: NextRequest) {
    const token = getTokenFromRequest(req);
    if (!token) return null;

    try {
        const decoded = verifyToken(token);
        await connectDB();
        const user = await User.findById(decoded.userId).select('-password').lean();
        return user;
    } catch {
        return null;
    }
}

export async function requireAuth(req: NextRequest) {
    const user = await getAuthUser(req);
    if (!user) {
        throw new Error('Authentication required');
    }
    return user;
}
