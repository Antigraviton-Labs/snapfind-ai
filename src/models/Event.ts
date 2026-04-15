import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IEvent extends Document {
    _id: mongoose.Types.ObjectId;
    title: string;
    slug: string;
    photographerId: mongoose.Types.ObjectId;
    eventCode: string;
    date: Date;
    location: string;
    privacy: 'public' | 'private';
    password?: string;
    expiresAt?: Date;
    totalPhotos: number;
    storageUsed: number;  // bytes
    createdAt: Date;
    updatedAt: Date;
}

const eventSchema = new Schema<IEvent>(
    {
        title: { type: String, required: true, trim: true },
        slug: { type: String, required: true, unique: true, lowercase: true },
        photographerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        eventCode: { type: String, required: true, unique: true },
        date: { type: Date, required: true },
        location: { type: String, required: true, trim: true },
        privacy: { type: String, enum: ['public', 'private'], default: 'public' },
        password: { type: String, select: false },
        expiresAt: { type: Date },
        totalPhotos: { type: Number, default: 0 },
        storageUsed: { type: Number, default: 0 },
    },
    { timestamps: true }
);

// Note: slug and eventCode indexes already created by unique: true in schema fields
eventSchema.index({ photographerId: 1 });
eventSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const Event: Model<IEvent> = mongoose.models.Event || mongoose.model<IEvent>('Event', eventSchema);
export default Event;
