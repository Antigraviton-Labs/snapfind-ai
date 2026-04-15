import { NextRequest, NextResponse } from 'next/server';
import { logger } from './logger';

// ─── Rate Limit Backend Toggle ─────────────────────────────────────
// Phase 1: in-memory. Phase 2: Redis (toggle via env).
const RATE_LIMIT_BACKEND = process.env.RATE_LIMIT_BACKEND || 'memory';

interface RateLimitEntry {
    count: number;
    resetTime: number;
}

// In-memory store (suitable for single-instance deployments)
const store = new Map<string, RateLimitEntry>();

// Cleanup stale entries every 5 minutes
if (typeof setInterval !== 'undefined') {
    setInterval(() => {
        const now = Date.now();
        const entries = Array.from(store.entries());
        for (const [key, entry] of entries) {
            if (now > entry.resetTime) {
                store.delete(key);
            }
        }
    }, 5 * 60 * 1000);
}

export interface RateLimitConfig {
    maxRequests: number;
    windowMs: number;
    keyPrefix?: string;
}

function getClientIP(req: NextRequest): string {
    return (
        req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
        req.headers.get('x-real-ip') ||
        'unknown'
    );
}

// ─── Core Rate Limit Check ─────────────────────────────────────────
function checkRateLimitMemory(
    key: string,
    maxRequests: number,
    windowMs: number
): { allowed: boolean; remaining: number; resetIn: number } {
    const now = Date.now();
    const entry = store.get(key);

    if (!entry || now > entry.resetTime) {
        store.set(key, { count: 1, resetTime: now + windowMs });
        return { allowed: true, remaining: maxRequests - 1, resetIn: windowMs };
    }

    if (entry.count >= maxRequests) {
        const resetIn = entry.resetTime - now;
        return { allowed: false, remaining: 0, resetIn };
    }

    entry.count++;
    return { allowed: true, remaining: maxRequests - entry.count, resetIn: entry.resetTime - now };
}

// ─── Abstracted Public Interface ───────────────────────────────────

/**
 * Check face scan rate limit for a request.
 */
export function checkFaceScanLimit(
    req: NextRequest
): { allowed: boolean; remaining: number; resetIn: number } {
    const ip = getClientIP(req);
    const key = `face-scan:${ip}`;
    const maxRequests = parseInt(process.env.FACE_SCAN_RATE_LIMIT || '5', 10);
    const windowMs = parseInt(process.env.FACE_SCAN_RATE_WINDOW_MS || '60000', 10);

    if (RATE_LIMIT_BACKEND === 'redis') {
        // TODO: Redis implementation — fall back to memory for now
        logger.info('Redis rate limiter not yet implemented, using in-memory', { key });
    }

    const result = checkRateLimitMemory(key, maxRequests, windowMs);
    if (!result.allowed) {
        logger.suspiciousActivity(ip, `Face scan rate limit exceeded: ${key}`);
    }
    return result;
}

/**
 * Check general API rate limit for a request.
 */
export function checkApiRateLimit(
    req: NextRequest
): { allowed: boolean; remaining: number; resetIn: number } {
    const ip = getClientIP(req);
    const key = `api:${ip}`;
    const maxRequests = 100;
    const windowMs = 60000;

    if (RATE_LIMIT_BACKEND === 'redis') {
        logger.info('Redis rate limiter not yet implemented, using in-memory', { key });
    }

    return checkRateLimitMemory(key, maxRequests, windowMs);
}

// ─── Legacy compatibility: checkRateLimit ──────────────────────────
export function checkRateLimit(
    req: NextRequest,
    config: RateLimitConfig
): { allowed: boolean; remaining: number; resetIn: number } {
    const ip = getClientIP(req);
    const key = `${config.keyPrefix || 'rl'}:${ip}`;

    const result = checkRateLimitMemory(key, config.maxRequests, config.windowMs);
    if (!result.allowed) {
        logger.suspiciousActivity(ip, `Rate limit exceeded: ${key}`);
    }
    return result;
}

// ─── Response Helper ───────────────────────────────────────────────
export function rateLimitResponse(resetIn: number): NextResponse {
    return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        {
            status: 429,
            headers: {
                'Retry-After': String(Math.ceil(resetIn / 1000)),
                'X-RateLimit-Reset': String(Math.ceil(resetIn / 1000)),
            },
        }
    );
}

// ─── Pre-configured limiters (legacy compatibility) ────────────────
export const FACE_SCAN_LIMITER: RateLimitConfig = {
    maxRequests: parseInt(process.env.FACE_SCAN_RATE_LIMIT || '5', 10),
    windowMs: parseInt(process.env.FACE_SCAN_RATE_WINDOW_MS || '60000', 10),
    keyPrefix: 'face-scan',
};

export const API_GENERAL_LIMITER: RateLimitConfig = {
    maxRequests: 100,
    windowMs: 60000,
    keyPrefix: 'api',
};

export { getClientIP };
