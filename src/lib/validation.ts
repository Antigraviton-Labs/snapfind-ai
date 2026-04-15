import { z } from 'zod';

// ── Auth Schemas ──
export const signupSchema = z.object({
    name: z.string().min(2, 'Name must be at least 2 characters').max(100),
    email: z.string().email('Invalid email address'),
    password: z.string().min(8, 'Password must be at least 8 characters').max(128),
});

export const loginSchema = z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(1, 'Password is required'),
});

// ── Event Schemas ──
export const createEventSchema = z.object({
    title: z.string().min(3, 'Title must be at least 3 characters').max(200),
    date: z.string().refine((val) => !isNaN(Date.parse(val)), 'Invalid date'),
    location: z.string().min(2, 'Location is required').max(300),
    privacy: z.enum(['public', 'private']).default('public'),
    password: z.string().max(100).optional(),
    expiresAt: z.string().optional().refine((val) => !val || !isNaN(Date.parse(val)), 'Invalid expiry date'),
});

export const updateEventSchema = createEventSchema.partial();

// ── Photo Upload Schema ──
export const photoUploadSchema = z.object({
    eventId: z.string().min(1, 'Event ID is required'),
});

// ── Face Search Schema ──
export const faceSearchSchema = z.object({
    threshold: z.number().min(0.1).max(1.0).default(0.6),
    page: z.number().int().min(1).default(1),
    limit: z.number().int().min(1).max(50).default(20),
});

// ── Types derived from schemas ──
export type SignupInput = z.infer<typeof signupSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type CreateEventInput = z.infer<typeof createEventSchema>;
export type UpdateEventInput = z.infer<typeof updateEventSchema>;
export type FaceSearchInput = z.infer<typeof faceSearchSchema>;
