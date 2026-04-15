/**
 * SnapFind AI — Seed Script
 *
 * Usage: npx ts-node scripts/seed.ts
 *
 * Creates sample data for development:
 * - 1 photographer user
 * - 2 sample events
 */

import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/snapfind-ai';

async function seed() {
    console.log('🌱 Seeding database...');

    await mongoose.connect(MONGODB_URI);

    const db = mongoose.connection.db;
    if (!db) throw new Error('Database connection failed');

    // Clear existing data
    await db.collection('users').deleteMany({});
    await db.collection('events').deleteMany({});
    await db.collection('photos').deleteMany({});
    await db.collection('faceembeddings').deleteMany({});
    await db.collection('downloadlogs').deleteMany({});

    // Create photographer
    const hashedPassword = await bcrypt.hash('password123', 12);
    const user = await db.collection('users').insertOne({
        name: 'Demo Photographer',
        email: 'demo@snapfind.ai',
        password: hashedPassword,
        role: 'photographer',
        plan: 'free',
        storageUsed: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
    });

    console.log('✅ Created user: demo@snapfind.ai / password123');

    // Create events
    const events = [
        {
            title: 'Summer Wedding 2024',
            slug: 'summer-wedding-2024-demo1234',
            photographerId: user.insertedId,
            eventCode: 'WED24A',
            date: new Date('2024-06-15'),
            location: 'Central Park, New York',
            privacy: 'public',
            totalPhotos: 0,
            createdAt: new Date(),
            updatedAt: new Date(),
        },
        {
            title: 'Tech Conference 2024',
            slug: 'tech-conference-2024-demo5678',
            photographerId: user.insertedId,
            eventCode: 'TCH24B',
            date: new Date('2024-09-20'),
            location: 'Convention Center, San Francisco',
            privacy: 'public',
            totalPhotos: 0,
            createdAt: new Date(),
            updatedAt: new Date(),
        },
    ];

    await db.collection('events').insertMany(events);
    console.log(`✅ Created ${events.length} sample events`);

    console.log('\n🎉 Seed complete!');
    console.log('Login: demo@snapfind.ai / password123');

    await mongoose.disconnect();
    process.exit(0);
}

seed().catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
});
