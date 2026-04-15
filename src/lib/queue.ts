import { Queue, Worker, Job } from 'bullmq';
import { connectDB } from './db';
import Photo from '@/models/Photo';
import FaceEmbedding from '@/models/FaceEmbedding';
import { logger } from './logger';

const QUEUE_ENABLED = process.env.ENABLE_QUEUE === 'true';
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const QUEUE_NAME = 'face-processing';

// Job data interface
export interface FaceProcessingJob {
    photoId: string;
    eventId: string;
    imageUrl: string;
    plan?: string;
}

// Lazy-initialize queue
let queue: Queue | null = null;
function getQueue(): Queue {
    if (!queue) {
        queue = new Queue(QUEUE_NAME, {
            connection: { url: REDIS_URL },
            defaultJobOptions: {
                attempts: 3,
                backoff: { type: 'exponential', delay: 2000 },
                removeOnComplete: { count: 100 },
                removeOnFail: { count: 50 },
            },
        });
    }
    return queue;
}

/**
 * Enqueue a face processing job.
 * If queue is disabled, process synchronously.
 */
export async function enqueueFaceProcessing(job: FaceProcessingJob): Promise<void> {
    // Pro plan gets higher priority (lower number = higher priority in BullMQ)
    const priority = job.plan === 'pro' ? 1 : 5;

    if (QUEUE_ENABLED) {
        const q = getQueue();
        await q.add('extract-faces', job, {
            jobId: `face-${job.photoId}`,
            priority,
        });
        logger.info('face_job_enqueued', { plan: job.plan || 'free', priority, photoId: job.photoId, eventId: job.eventId });
    } else {
        // Process asynchronously (non-blocking) with error handling
        setTimeout(async () => {
            try {
                await processFaceJob(job);
            } catch (error) {
                logger.error('Sync face processing failed (non-fatal)', {
                    photoId: job.photoId,
                    error: error instanceof Error ? error.message : String(error),
                });
            }
        }, 0);
        logger.info('face_job_enqueued', { plan: job.plan || 'free', priority, photoId: job.photoId, mode: 'sync' });
    }
}

/**
 * Process a face extraction job — calls the Python AI service
 */
export async function processFaceJob(data: FaceProcessingJob): Promise<void> {
    const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';

    try {
        await connectDB();

        // Call Python AI service
        const response = await fetch(`${AI_SERVICE_URL}/extract-faces`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                imageUrl: data.imageUrl,
                photoId: data.photoId,
                eventId: data.eventId,
            }),
            signal: AbortSignal.timeout(90000), // 90s timeout
        });

        if (!response.ok) {
            const errBody = await response.text();
            throw new Error(`AI service error: ${response.status} - ${errBody}`);
        }

        const result = await response.json();

        // Save embeddings to DB
        if (result.faces && result.faces.length > 0) {
            const embeddings = result.faces.map((face: { embedding: number[]; box: { x: number; y: number; w: number; h: number } }) => ({
                photoId: data.photoId,
                eventId: data.eventId,
                embedding: face.embedding,
                faceBox: face.box,
            }));

            await FaceEmbedding.insertMany(embeddings);
        }

        // Update photo status
        await Photo.findByIdAndUpdate(data.photoId, {
            status: 'ready',
            facesCount: result.faces?.length || 0,
        });

        logger.info('Face processing completed', {
            photoId: data.photoId,
            facesFound: result.faces?.length || 0,
        });
    } catch (error) {
        logger.aiFailure(data.photoId, error);

        // Mark photo as failed
        try {
            await connectDB();
            await Photo.findByIdAndUpdate(data.photoId, { status: 'failed' });
        } catch {
            // Ignore secondary error
        }

        throw error; // Re-throw for BullMQ retry
    }
}

/**
 * Start the BullMQ worker (call this in a separate process or on server start)
 */
export function startWorker(): Worker | null {
    if (!QUEUE_ENABLED) {
        logger.info('Queue disabled, worker not started');
        return null;
    }

    const worker = new Worker(
        QUEUE_NAME,
        async (job: Job) => {
            logger.info('Processing face job', { jobId: job.id, photoId: job.data.photoId });
            await processFaceJob(job.data as FaceProcessingJob);
        },
        {
            connection: { url: REDIS_URL },
            concurrency: 2,
            limiter: {
                max: 5,
                duration: 60000,
            },
        }
    );

    worker.on('completed', (job) => {
        logger.info('Job completed', { jobId: job.id });
    });

    worker.on('failed', (job, error) => {
        logger.queueFailure(job?.id || 'unknown', error);
    });

    worker.on('error', (error) => {
        logger.error('Worker error', { error: error.message });
    });

    logger.info('BullMQ worker started', { queue: QUEUE_NAME, concurrency: 2 });
    return worker;
}
