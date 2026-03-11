import { NextRequest, NextResponse } from 'next/server';
import { getDB } from '@/lib/db';

// GET /api/game-meta → returns all game meta entries as { gameId → imageUrl } map
export async function GET() {
    try {
        const db = await getDB();
        const all = await db.prepare('SELECT gameId, imageUrl FROM game_meta').all<any>();
        const map: Record<string, string> = {};
        for (const entry of all.results) {
            map[entry.gameId] = entry.imageUrl || '';
        }
        return NextResponse.json(map);
    } catch (error) {
        console.error('Error fetching game meta:', error);
        return NextResponse.json({}, { status: 500 });
    }
}

// POST /api/game-meta → JSON body with gameId + imageUrl (URL-based, no file upload on Workers)
export async function POST(request: NextRequest) {
    try {
        const db = await getDB();
        const body = await request.json() as any;
        const { gameId, imageUrl } = body;

        if (!gameId) {
            return NextResponse.json({ error: 'gameId is required' }, { status: 400 });
        }

        const now = new Date().toISOString();
        const existing = await db.prepare('SELECT id FROM game_meta WHERE gameId = ? LIMIT 1').bind(gameId).first<any>();

        if (existing) {
            await db
                .prepare('UPDATE game_meta SET imageUrl=?, updatedAt=? WHERE gameId=?')
                .bind(imageUrl || '', now, gameId)
                .run();
        } else {
            const id = crypto.randomUUID();
            await db
                .prepare('INSERT INTO game_meta (id, gameId, imageUrl, updatedAt) VALUES (?, ?, ?, ?)')
                .bind(id, gameId, imageUrl || '', now)
                .run();
        }

        return NextResponse.json({ gameId, imageUrl: imageUrl || '' });
    } catch (error) {
        console.error('Error updating game meta:', error);
        return NextResponse.json({ error: 'Failed to update game meta' }, { status: 500 });
    }
}
