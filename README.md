# SnapFind AI

> AI-Powered Event Photo Finder — Photographers upload, AI processes, guests find their photos with face recognition.

![Next.js](https://img.shields.io/badge/Next.js-14-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)
![FastAPI](https://img.shields.io/badge/FastAPI-0.109-green)
![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-darkgreen)
![Tailwind](https://img.shields.io/badge/Tailwind-3.4-38bdf8)

## 🎯 Overview

SnapFind AI connects photographers and event attendees through AI face recognition:

1. **Photographers** create events and bulk-upload photos
2. **AI** extracts face embeddings from every photo using DeepFace
3. **Guests** open the event link, scan their face via webcam
4. **System** matches faces and shows only their photos

## 🏗️ Architecture

```
┌──────────────┐     ┌──────────────────┐     ┌──────────────┐
│   Next.js    │────▶│   MongoDB Atlas  │     │   Redis      │
│   Frontend   │     │   (Mongoose)     │     │   (BullMQ)   │
│   + API      │     └──────────────────┘     └──────────────┘
│   Routes     │                                     │
└──────┬───────┘                                     │
       │              ┌──────────────────┐           │
       └─────────────▶│   Python FastAPI │◀──────────┘
                      │   + DeepFace     │
                      └──────────────────┘
                              │
                      ┌───────▼──────────┐
                      │   Cloudinary     │
                      │   (Storage)      │
                      └──────────────────┘
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- Python 3.11+
- MongoDB Atlas account
- Cloudinary account
- Redis (optional, for queue)

### 1. Install Dependencies

```bash
# Next.js app
npm install

# Python AI service
cd ai-service
pip install -r requirements.txt
cd ..
```

### 2. Configure Environment

```bash
cp .env.example .env.local
# Edit .env.local with your credentials
```

### 3. Seed Database (Optional)

```bash
npx ts-node scripts/seed.ts
```

### 4. Start Development

```bash
# Terminal 1: Next.js
npm run dev

# Terminal 2: Python AI Service
cd ai-service
uvicorn main:app --reload --port 8000
```

### 5. Open App

Visit [http://localhost:3000](http://localhost:3000)

Demo login: `demo@snapfind.ai` / `password123`

## 🐳 Docker

```bash
# Build and start all services
docker-compose up --build

# With background queue enabled
ENABLE_QUEUE=true docker-compose up --build
```

## 📁 Project Structure

```
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── api/                # API routes
│   │   │   ├── auth/           # Login, signup, me
│   │   │   ├── events/         # CRUD + photos + search
│   │   │   ├── analytics/      # Dashboard stats
│   │   │   └── download/       # Signed download URLs
│   │   ├── dashboard/          # Protected photographer pages
│   │   ├── event/[slug]/       # Public event + face search
│   │   ├── login/              # Auth pages
│   │   ├── signup/
│   │   └── pricing/
│   ├── components/ui/          # Shared UI components
│   ├── context/                # React context (Auth)
│   ├── lib/                    # Core utilities
│   │   ├── auth.ts             # JWT helpers
│   │   ├── cloudinary.ts       # Upload + signed URLs
│   │   ├── db.ts               # MongoDB connection
│   │   ├── embeddingSearch.ts   # Vector search abstraction
│   │   ├── logger.ts           # Structured logging
│   │   ├── planLimits.ts       # Free/Pro enforcement
│   │   ├── queue.ts            # BullMQ + worker
│   │   ├── rateLimiter.ts      # Rate limiting
│   │   ├── utils.ts            # Slug, hash, helpers
│   │   └── validation.ts       # Zod schemas
│   └── models/                 # Mongoose models
├── ai-service/                 # Python FastAPI + DeepFace
│   ├── main.py
│   ├── requirements.txt
│   └── Dockerfile
├── scripts/seed.ts
├── docker-compose.yml
├── Dockerfile
└── .env.example
```

## 🔑 Key Features

| Feature | Details |
|---------|---------|
| **Bulk Upload** | Drag & drop, max 20/batch, progress tracking |
| **Face Detection** | DeepFace with Facenet model, multi-face support |
| **Face Search** | Webcam capture, cosine similarity, confidence slider |
| **Plan Limits** | Free (3 events, 50 photos) / Pro (unlimited) |
| **Duplicate Guard** | Perceptual hash (aHash) deduplication |
| **Background Jobs** | BullMQ with 3 retries, exponential backoff |
| **Security** | JWT, rate limiting, signed URLs, helmet headers |
| **Cascade Delete** | Event → Cloudinary + Photos + Embeddings + Storage |
| **Analytics** | Stats, charts, popular events, download tracking |
| **Docker** | Multi-stage build, compose with Redis |

## ⚙️ Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `MONGODB_URI` | MongoDB Atlas connection string | ✅ |
| `JWT_SECRET` | Secret key for JWT tokens | ✅ |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name | ✅ |
| `CLOUDINARY_API_KEY` | Cloudinary API key | ✅ |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret | ✅ |
| `AI_SERVICE_URL` | Python service URL | ✅ |
| `REDIS_URL` | Redis connection URL | Optional |
| `ENABLE_QUEUE` | Enable BullMQ queue | Optional |
| `MEDIA_PRIVATE_MODE` | Enable signed URLs | Optional |

## 📄 License

MIT
