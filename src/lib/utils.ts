import { v4 as uuidv4 } from 'uuid';

/**
 * Generate a URL-friendly slug from a title
 */
export function generateSlug(title: string): string {
    const base = title
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
        .substring(0, 60);

    const suffix = uuidv4().substring(0, 8);
    return `${base}-${suffix}`;
}

/**
 * Generate a unique event code (6 chars uppercase)
 */
export function generateEventCode(): string {
    return uuidv4().substring(0, 6).toUpperCase();
}

/**
 * Generate a random secure filename
 */
export function generateFilename(extension: string): string {
    // Don't include extension in the name — Cloudinary handles format via allowed_formats
    void extension; // extension is used by the caller for validation only
    return uuidv4().substring(0, 16);
}

/**
 * Format bytes to human readable
 */
export function formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

/**
 * Simple perceptual hash for duplicate detection.
 * Uses average hash (aHash) approach — fast, lightweight.
 * Works on raw image buffer by sampling pixel data.
 */
export async function computeImageHash(buffer: Buffer): Promise<string> {
    // Use sharp to resize to 8x8 grayscale
    const sharp = (await import('sharp')).default;

    const { data } = await sharp(buffer)
        .resize(8, 8, { fit: 'fill' })
        .grayscale()
        .raw()
        .toBuffer({ resolveWithObject: true });

    // Compute average
    const pixels = Array.from(data);
    const avg = pixels.reduce((sum, p) => sum + p, 0) / pixels.length;

    // Generate hash: 1 if pixel > avg, 0 otherwise
    let hash = '';
    for (const pixel of pixels) {
        hash += pixel > avg ? '1' : '0';
    }

    // Convert binary string to hex
    let hex = '';
    for (let i = 0; i < hash.length; i += 4) {
        hex += parseInt(hash.substring(i, i + 4), 2).toString(16);
    }

    return hex;
}

/**
 * Compare two perceptual hashes (Hamming distance).
 * Returns true if images are likely duplicates (distance <= threshold).
 */
export function isImageDuplicate(hash1: string, hash2: string, threshold = 5): boolean {
    if (hash1.length !== hash2.length) return false;

    let distance = 0;
    for (let i = 0; i < hash1.length; i++) {
        const diff = parseInt(hash1[i], 16) ^ parseInt(hash2[i], 16);
        // Count bits
        let bits = diff;
        while (bits) {
            distance += bits & 1;
            bits >>= 1;
        }
    }

    return distance <= threshold;
}
