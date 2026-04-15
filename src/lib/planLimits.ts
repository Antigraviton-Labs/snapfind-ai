import { IUser } from '@/models/User';
import Event from '@/models/Event';
import Photo from '@/models/Photo';
import { logger } from './logger';

// ─── Plan Configuration ────────────────────────────────────────────
export interface PlanConfig {
    maxEvents: number;
    photosPerEvent: number;
    storageBytes: number;
    watermarkForced: boolean;
    faceScansPerMinute: number;
    downloadsPerDay: number;
    priorityProcessing: boolean;
}

/**
 * All plan limits are env-driven with safe defaults.
 * No magic numbers in code.
 */
function envInt(key: string, fallback: number): number {
    const val = process.env[key];
    return val ? parseInt(val, 10) : fallback;
}

export const PLAN_LIMITS: Record<string, PlanConfig> = {
    free: {
        maxEvents: envInt('FREE_EVENT_LIMIT', 3),
        photosPerEvent: envInt('FREE_PHOTO_LIMIT', 50),
        storageBytes: envInt('FREE_STORAGE_MB', 500) * 1024 * 1024,
        watermarkForced: true,
        faceScansPerMinute: envInt('FREE_FACE_SCANS_PER_MIN', 5),
        downloadsPerDay: envInt('FREE_DAILY_DOWNLOAD', 20),
        priorityProcessing: false,
    },
    pro: {
        maxEvents: Infinity,
        photosPerEvent: envInt('PRO_PHOTO_LIMIT', 5000),
        storageBytes: envInt('PRO_STORAGE_MB', 10240) * 1024 * 1024,
        watermarkForced: false,
        faceScansPerMinute: envInt('PRO_FACE_SCANS_PER_MIN', 60),
        downloadsPerDay: Infinity,
        priorityProcessing: true,
    },
};

export function getPlanConfig(plan: string): PlanConfig {
    return PLAN_LIMITS[plan] || PLAN_LIMITS.free;
}

// ─── Event Limit Check ─────────────────────────────────────────────
export async function checkEventLimit(userId: string, plan: string): Promise<{ allowed: boolean; message?: string }> {
    const config = getPlanConfig(plan);
    if (config.maxEvents === Infinity) return { allowed: true };

    const count = await Event.countDocuments({ photographerId: userId });
    if (count >= config.maxEvents) {
        logger.info('Event limit reached', { userId, plan, current: count, limit: config.maxEvents });
        return { allowed: false, message: `Free plan allows max ${config.maxEvents} events. Upgrade to Pro for unlimited events.` };
    }
    return { allowed: true };
}

// ─── Photo Limit Check ─────────────────────────────────────────────
export async function checkPhotoLimit(
    eventId: string,
    plan: string,
    batchSize: number
): Promise<{ allowed: boolean; message?: string; remaining?: number }> {
    const config = getPlanConfig(plan);
    if (config.photosPerEvent === Infinity) return { allowed: true };

    const current = await Photo.countDocuments({ eventId });
    const remaining = config.photosPerEvent - current;

    if (remaining <= 0) {
        logger.info('Photo limit reached', { eventId, plan, current, limit: config.photosPerEvent });
        return { allowed: false, message: `Photo limit reached (${config.photosPerEvent} per event). Upgrade to Pro.` };
    }
    if (batchSize > remaining) {
        return { allowed: false, message: `Can only upload ${remaining} more photos to this event.`, remaining };
    }
    return { allowed: true, remaining };
}

// ─── Storage Limit Check ───────────────────────────────────────────
export function checkStorageLimit(
    user: Pick<IUser, 'storageUsed' | 'plan'>,
    additionalBytes: number
): { allowed: boolean; message?: string } {
    const config = getPlanConfig(user.plan);
    if (config.storageBytes === Infinity) return { allowed: true };

    if (user.storageUsed + additionalBytes > config.storageBytes) {
        const usedMB = Math.round(user.storageUsed / (1024 * 1024));
        const limitMB = Math.round(config.storageBytes / (1024 * 1024));
        logger.info('Storage limit reached', { plan: user.plan, usedMB, limitMB, additionalBytes });
        return {
            allowed: false,
            message: `Storage limit reached (${usedMB}MB / ${limitMB}MB). Upgrade to Pro for ${Math.round(PLAN_LIMITS.pro.storageBytes / (1024 * 1024 * 1024))}GB.`,
        };
    }
    return { allowed: true };
}

// ─── Download Limit Check ──────────────────────────────────────────
/**
 * Check download limit for the downloader (not the photographer).
 * Tracked per identifier per day.
 */
export async function checkDownloadLimit(
    identifier: string,
    photographerPlan: string,
): Promise<{ allowed: boolean; remaining: number; message?: string }> {
    const config = getPlanConfig(photographerPlan);
    if (config.downloadsPerDay === Infinity) {
        return { allowed: true, remaining: Infinity };
    }

    // Lazy import to avoid circular deps
    const DownloadLog = (await import('@/models/DownloadLog')).default;

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const count = await DownloadLog.countDocuments({
        identifier,
        downloadedAt: { $gte: todayStart },
    });

    const remaining = Math.max(0, config.downloadsPerDay - count);

    if (count >= config.downloadsPerDay) {
        logger.info('Download limit exceeded', { identifier, plan: photographerPlan, count, limit: config.downloadsPerDay });
        return {
            allowed: false,
            remaining: 0,
            message: `Daily download limit reached (${config.downloadsPerDay}/day). Please try again tomorrow.`,
        };
    }

    return { allowed: true, remaining };
}
