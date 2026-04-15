import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IUser extends Document {
    _id: mongoose.Types.ObjectId;
    name: string;
    email: string;
    password?: string;
    avatar?: string;
    provider: 'local' | 'google';
    role: 'user' | 'admin';
    plan: 'free' | 'pro';
    storageUsed: number;
    createdAt: Date;
    updatedAt: Date;
}

const userSchema = new Schema<IUser>(
    {
        name: { type: String, required: true, trim: true },
        email: { type: String, required: true, unique: true, lowercase: true, trim: true },
        password: { type: String, select: false }, // Not required — Google users don't have one
        avatar: { type: String },
        provider: { type: String, enum: ['local', 'google'], default: 'local' },
        role: { type: String, enum: ['user', 'admin'], default: 'user' },
        plan: { type: String, enum: ['free', 'pro'], default: 'free' },
        storageUsed: { type: Number, default: 0 }, // in bytes
    },
    { timestamps: true }
);

// Note: email index already created by unique: true in schema field

const User: Model<IUser> = mongoose.models.User || mongoose.model<IUser>('User', userSchema);
export default User;
