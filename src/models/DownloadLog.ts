import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IDownloadLog extends Document {
    _id: mongoose.Types.ObjectId;
    photoId: mongoose.Types.ObjectId;
    eventId: mongoose.Types.ObjectId;
    identifier: string;       // userId or IP — primary key for limit tracking
    userId?: string;          // optional — set when authenticated
    ipAddress: string;        // always captured
    downloadedAt: Date;
}

const downloadLogSchema = new Schema<IDownloadLog>({
    photoId: { type: Schema.Types.ObjectId, ref: 'Photo', required: true },
    eventId: { type: Schema.Types.ObjectId, ref: 'Event', required: true },
    identifier: { type: String, required: true },
    userId: { type: String },
    ipAddress: { type: String, required: true },
    downloadedAt: { type: Date, default: Date.now },
});

// Compound indexes for efficient daily limit queries
downloadLogSchema.index({ identifier: 1, downloadedAt: -1 });
downloadLogSchema.index({ ipAddress: 1, downloadedAt: -1 });
downloadLogSchema.index({ eventId: 1 });

const DownloadLog: Model<IDownloadLog> =
    mongoose.models.DownloadLog || mongoose.model<IDownloadLog>('DownloadLog', downloadLogSchema);
export default DownloadLog;
