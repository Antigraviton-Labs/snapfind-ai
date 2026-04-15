import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IPhoto extends Document {
    _id: mongoose.Types.ObjectId;
    eventId: mongoose.Types.ObjectId;
    cloudinaryPublicId: string;
    imageUrl: string;
    thumbnailUrl: string;
    watermarkedUrl: string;
    facesCount: number;
    status: 'processing' | 'ready' | 'failed';
    fileSize: number; // bytes
    pHash?: string; // perceptual hash for duplicate detection
    createdAt: Date;
    updatedAt: Date;
}

const photoSchema = new Schema<IPhoto>(
    {
        eventId: { type: Schema.Types.ObjectId, ref: 'Event', required: true },
        cloudinaryPublicId: { type: String, required: true },
        imageUrl: { type: String, required: true },
        thumbnailUrl: { type: String, required: true },
        watermarkedUrl: { type: String, required: true },
        facesCount: { type: Number, default: 0 },
        status: { type: String, enum: ['processing', 'ready', 'failed'], default: 'processing' },
        fileSize: { type: Number, default: 0 },
        pHash: { type: String },
    },
    { timestamps: true }
);

photoSchema.index({ eventId: 1, status: 1 });
photoSchema.index({ eventId: 1, pHash: 1 });
photoSchema.index({ cloudinaryPublicId: 1 });

const Photo: Model<IPhoto> = mongoose.models.Photo || mongoose.model<IPhoto>('Photo', photoSchema);
export default Photo;
