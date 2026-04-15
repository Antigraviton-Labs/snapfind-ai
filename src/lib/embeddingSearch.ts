import FaceEmbedding, { IFaceEmbedding } from '@/models/FaceEmbedding';
import Photo from '@/models/Photo';
import { connectDB } from './db';
import { logger } from './logger';

/**
 * Embedding Search Abstraction Layer
 *
 * This module abstracts all face embedding comparison logic.
 * To swap MongoDB for a vector DB (Pinecone, Weaviate, Qdrant), only
 * replace the implementation in this file — API routes remain unchanged.
 */

export interface MatchResult {
    photoId: string;
    similarity: number;
    imageUrl: string;
    thumbnailUrl: string;
    watermarkedUrl: string;
    faceBox: { x: number; y: number; w: number; h: number };
}

export interface SearchOptions {
    threshold: number;
    page: number;
    limit: number;
}

/**
 * Compute cosine similarity between two embedding vectors
 */
export function cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
        dotProduct += a[i] * b[i];
        normA += a[i] * a[i];
        normB += b[i] * b[i];
    }

    const denominator = Math.sqrt(normA) * Math.sqrt(normB);
    if (denominator === 0) return 0;

    return dotProduct / denominator;
}

/**
 * Find matching photos in an event by comparing face embeddings
 *
 * Current implementation: MongoDB scan with in-memory cosine similarity.
 * Future: Replace with vector DB query (Pinecone, Weaviate, etc.)
 */
export async function findMatchesByEvent(
    eventId: string,
    queryEmbedding: number[],
    options: SearchOptions
): Promise<{ matches: MatchResult[]; total: number }> {
    await connectDB();

    // Fetch all embeddings for this event
    const embeddings = await FaceEmbedding.find({ eventId })
        .select('photoId embedding faceBox')
        .lean<Array<Pick<IFaceEmbedding, 'photoId' | 'embedding' | 'faceBox'>>>();

    if (!embeddings.length) {
        return { matches: [], total: 0 };
    }

    // Compute similarities
    const scored = embeddings
        .map((emb) => ({
            photoId: emb.photoId.toString(),
            similarity: cosineSimilarity(queryEmbedding, emb.embedding),
            faceBox: emb.faceBox,
        }))
        .filter((r) => r.similarity >= options.threshold)
        .sort((a, b) => b.similarity - a.similarity);

    // Deduplicate by photoId (keep highest similarity)
    const uniqueMap = new Map<string, (typeof scored)[0]>();
    for (const item of scored) {
        if (!uniqueMap.has(item.photoId) || uniqueMap.get(item.photoId)!.similarity < item.similarity) {
            uniqueMap.set(item.photoId, item);
        }
    }
    const unique = Array.from(uniqueMap.values());
    const total = unique.length;

    // Paginate
    const start = (options.page - 1) * options.limit;
    const paginated = unique.slice(start, start + options.limit);

    // Fetch photo details
    const photoIds = paginated.map((p) => p.photoId);
    const photos = await Photo.find({ _id: { $in: photoIds }, status: 'ready' })
        .select('imageUrl thumbnailUrl watermarkedUrl')
        .lean();

    const photoMap = new Map(photos.map((p) => [p._id.toString(), p]));

    const matches: MatchResult[] = paginated
        .filter((p) => photoMap.has(p.photoId))
        .map((p) => {
            const photo = photoMap.get(p.photoId)!;
            return {
                photoId: p.photoId,
                similarity: Math.round(p.similarity * 1000) / 1000,
                imageUrl: photo.imageUrl,
                thumbnailUrl: photo.thumbnailUrl,
                watermarkedUrl: photo.watermarkedUrl,
                faceBox: p.faceBox,
            };
        });

    logger.info('Face search completed', {
        eventId,
        totalEmbeddings: embeddings.length,
        matchesAboveThreshold: total,
        returnedPage: options.page,
    });

    return { matches, total };
}

/**
 * Direct comparison of two embeddings
 */
export function compareEmbeddings(
    embedding1: number[],
    embedding2: number[],
    threshold = 0.6
): { match: boolean; similarity: number } {
    const similarity = cosineSimilarity(embedding1, embedding2);
    return { match: similarity >= threshold, similarity };
}
