import { NextRequest, NextResponse } from 'next/server';
import { getDB, getBucket } from '@/lib/db';

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

// POST /api/game-meta → FormData with gameId + image (file)
export async function POST(request: NextRequest) {
    try {
        const db = await getDB();
        const bucket = await getBucket();
        
        // Handle FormData instead of JSON to support file upload
        const formData = await request.formData();
        const gameId = formData.get('gameId') as string;
        const imageFile = formData.get('image');

        if (!gameId) {
            return NextResponse.json({ error: 'gameId is required' }, { status: 400 });
        }

        let finalImageUrl = '';

        if (imageFile && imageFile instanceof File && imageFile.size > 0) {
            const fileKey = `games/${gameId}/cover_${Date.now()}_${imageFile.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
            const arrayBuffer = await imageFile.arrayBuffer();
            await bucket.put(fileKey, arrayBuffer, {
                httpMetadata: { contentType: imageFile.type }
            });
            finalImageUrl = `/api/files/${fileKey}`;
        }

        const now = new Date().toISOString();
        const existing = await db.prepare('SELECT id, imageUrl FROM game_meta WHERE gameId = ? LIMIT 1').bind(gameId).first<any>();

        // Fallback to old image URL if no new one was provided
        if (!finalImageUrl && existing && existing.imageUrl) {
            finalImageUrl = existing.imageUrl;
        }

        if (existing) {
            await db
                .prepare('UPDATE game_meta SET imageUrl=?, updatedAt=? WHERE gameId=?')
                .bind(finalImageUrl, now, gameId)
                .run();
        } else {
            const id = crypto.randomUUID();
            await db
                .prepare('INSERT INTO game_meta (id, gameId, imageUrl, updatedAt) VALUES (?, ?, ?, ?)')
                .bind(id, gameId, finalImageUrl, now)
                .run();
        }

        return NextResponse.json({ gameId, imageUrl: finalImageUrl });
    } catch (error) {
        console.error('Error updating game meta:', error);
        return NextResponse.json({ error: 'Failed to update game meta' }, { status: 500 });
    }
}
