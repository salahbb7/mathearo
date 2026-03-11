import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import GameMeta from '@/models/GameMeta';
import path from 'path';
import { writeFile, mkdir } from 'fs/promises';

// GET /api/game-meta  → returns all game meta entries as { gameId → imageUrl } map
export async function GET() {
    try {
        await connectDB();
        const all = await GameMeta.find().lean();
        const map: Record<string, string> = {};
        for (const entry of all as any[]) {
            map[entry.gameId] = entry.imageUrl || '';
        }
        return NextResponse.json(map);
    } catch (error) {
        console.error('Error fetching game meta:', error);
        return NextResponse.json({}, { status: 500 });
    }
}

// POST /api/game-meta  → multipart form with gameId + optional image file
export async function POST(request: NextRequest) {
    try {
        await connectDB();

        const formData = await request.formData();
        const gameId = formData.get('gameId') as string | null;

        if (!gameId) {
            return NextResponse.json({ error: 'gameId is required' }, { status: 400 });
        }

        let meta = await GameMeta.findOne({ gameId });
        if (!meta) {
            meta = new GameMeta({ gameId });
        }

        const file = formData.get('image') as File | null;
        if (file && file.size > 0) {
            const bytes = await file.arrayBuffer();
            const buffer = Buffer.from(bytes);

            const ext = path.extname(file.name) || '.jpg';
            const filename = `game-${gameId}-${Date.now()}${ext}`;
            const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'games');

            await mkdir(uploadDir, { recursive: true });
            await writeFile(path.join(uploadDir, filename), buffer);

            meta.imageUrl = `/uploads/games/${filename}`;
        }

        await meta.save();
        return NextResponse.json({ gameId: meta.gameId, imageUrl: meta.imageUrl });
    } catch (error) {
        console.error('Error updating game meta:', error);
        return NextResponse.json({ error: 'Failed to update game meta' }, { status: 500 });
    }
}

