import { v2 as cloudinary } from 'cloudinary';
import { logger } from './logger';

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

export const MEDIA_PRIVATE_MODE = process.env.MEDIA_PRIVATE_MODE === 'true';

const ALLOWED_FORMATS = ['jpg', 'jpeg', 'png'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export interface UploadResult {
    publicId: string;
    imageUrl: string;
    thumbnailUrl: string;
    watermarkedUrl: string;
    fileSize: number;
}

/**
 * Upload image to Cloudinary with structured folder path
 */
export async function uploadToCloudinary(
    fileBuffer: Buffer,
    eventId: string,
    filename: string
): Promise<UploadResult> {
    if (fileBuffer.length > MAX_FILE_SIZE) {
        throw new Error(`File exceeds maximum size of 10MB`);
    }

    const folder = `snapfind-ai/events/${eventId}/original`;

    return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
            {
                folder,
                public_id: filename,
                resource_type: 'image',
                allowed_formats: ALLOWED_FORMATS,
                transformation: [{ quality: 'auto', fetch_format: 'auto' }],
                type: MEDIA_PRIVATE_MODE ? 'authenticated' : 'upload',
            },
            (error, result) => {
                if (error || !result) {
                    logger.error('Cloudinary upload failed', { error, eventId, filename });
                    reject(error || new Error('Upload failed'));
                    return;
                }

                const thumbnailUrl = cloudinary.url(result.public_id, {
                    transformation: [
                        { width: 400, height: 400, crop: 'fill', quality: 'auto' },
                    ],
                    secure: true,
                    type: MEDIA_PRIVATE_MODE ? 'authenticated' : 'upload',
                });

                const watermarkedUrl = cloudinary.url(result.public_id, {
                    transformation: [
                        {
                            overlay: 'text:Arial_20_bold:SnapFind%20AI',
                            gravity: 'south_east',
                            opacity: 40,
                            x: 10,
                            y: 10,
                            color: '#ffffff',
                        },
                    ],
                    secure: true,
                    type: MEDIA_PRIVATE_MODE ? 'authenticated' : 'upload',
                });

                resolve({
                    publicId: result.public_id,
                    imageUrl: result.secure_url,
                    thumbnailUrl,
                    watermarkedUrl,
                    fileSize: result.bytes,
                });
            }
        );

        uploadStream.end(fileBuffer);
    });
}

/**
 * Generate a signed download URL (expires in 1 hour)
 */
export function getSignedUrl(publicId: string): string {
    if (MEDIA_PRIVATE_MODE) {
        return cloudinary.url(publicId, {
            secure: true,
            type: 'authenticated',
            sign_url: true,
            expires_at: Math.floor(Date.now() / 1000) + 3600,
        });
    }
    return cloudinary.url(publicId, { secure: true });
}

/**
 * Delete all assets in an event folder
 */
export async function deleteEventFolder(eventId: string): Promise<void> {
    const folderPath = `snapfind-ai/events/${eventId}`;
    try {
        // Delete all resources in the folder
        await cloudinary.api.delete_resources_by_prefix(folderPath);
        // Delete subfolders
        const subfolders = ['original', 'thumbnails', 'watermarked'];
        for (const sub of subfolders) {
            try {
                await cloudinary.api.delete_folder(`${folderPath}/${sub}`);
            } catch {
                // folder may not exist
            }
        }
        await cloudinary.api.delete_folder(folderPath);
        logger.info('Cloudinary event folder deleted', { eventId, folderPath });
    } catch (error) {
        logger.error('Failed to delete Cloudinary event folder', { eventId, error });
        throw error;
    }
}

/**
 * Delete a single asset
 */
export async function deleteFromCloudinary(publicId: string): Promise<void> {
    await cloudinary.uploader.destroy(publicId);
}

/**
 * Get the appropriate download URL based on photographer plan and watermark config.
 * NEVER modifies the original asset — uses Cloudinary transformation URLs.
 *
 * @param photo - Photo with imageUrl and watermarkedUrl
 * @param photographerPlan - The plan of the event owner
 * @returns URL string with fl_attachment for browser download
 */
export function getDownloadUrl(
    photo: { imageUrl: string; watermarkedUrl?: string },
    photographerPlan: string
): string {
    const watermarkEnabled = process.env.ENABLE_WATERMARK !== 'false';

    let url: string;
    if (!watermarkEnabled || photographerPlan === 'pro') {
        // No watermark: serve original
        url = photo.imageUrl;
    } else {
        // Free plan + watermark enabled: serve watermarked version
        url = photo.watermarkedUrl || photo.imageUrl;
    }

    // Append fl_attachment to force browser download
    if (url.includes('cloudinary.com') && !url.includes('fl_attachment')) {
        url = url.replace('/upload/', '/upload/fl_attachment/');
    }

    return url;
}

export { cloudinary };

