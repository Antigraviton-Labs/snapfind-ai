import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IFaceEmbedding extends Document {
    _id: mongoose.Types.ObjectId;
    photoId: mongoose.Types.ObjectId;
    eventId: mongoose.Types.ObjectId;
    embedding: number[];
    faceBox: {
        x: number;
        y: number;
        w: number;
        h: number;
    };
    createdAt: Date;
}

const faceEmbeddingSchema = new Schema<IFaceEmbedding>(
    {
        photoId: { type: Schema.Types.ObjectId, ref: 'Photo', required: true },
        eventId: { type: Schema.Types.ObjectId, ref: 'Event', required: true },
        embedding: { type: [Number], required: true },
        faceBox: {
            x: { type: Number, required: true },
            y: { type: Number, required: true },
            w: { type: Number, required: true },
            h: { type: Number, required: true },
        },
    },
    { timestamps: true }
);

faceEmbeddingSchema.index({ eventId: 1 });
faceEmbeddingSchema.index({ photoId: 1 });

const FaceEmbedding: Model<IFaceEmbedding> =
    mongoose.models.FaceEmbedding || mongoose.model<IFaceEmbedding>('FaceEmbedding', faceEmbeddingSchema);
export default FaceEmbedding;
