import { NextRequest, NextResponse } from 'next/server';
import { getDB } from '@/lib/db';

export async function GET() {
    try {
        const db = await getDB();

        let settings = await db
            .prepare('SELECT * FROM game_settings WHERE id = ? LIMIT 1')
            .bind('global')
            .first<any>();

        if (!settings) {
            const now = new Date().toISOString();
            await db
                .prepare(
                    'INSERT INTO game_settings (id, successSoundUrl, errorSoundUrl, backgroundMusicUrl, backgroundMusicVolume, difficulty, whatsappNumber, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
                )
                .bind('global', '', '', '', 50, 'medium', '96871776166', now)
                .run();
            settings = { id: 'global', successSoundUrl: '', errorSoundUrl: '', backgroundMusicUrl: '', backgroundMusicVolume: 50, difficulty: 'medium', whatsappNumber: '96871776166', updatedAt: now };
        }

        return NextResponse.json(settings);
    } catch (error) {
        console.error('Error fetching settings:', error);
        return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const db = await getDB();

        let body: Record<string, unknown> = {};
        const contentType = request.headers.get('content-type') || '';

        if (contentType.includes('application/json')) {
            body = await request.json();
        } else if (contentType.includes('multipart/form-data') || contentType.includes('application/x-www-form-urlencoded')) {
            const formData = await request.formData();
            for (const [key, value] of formData.entries()) {
                body[key] = value;
            }
        }

        const now = new Date().toISOString();

        const existing = await db.prepare('SELECT * FROM game_settings WHERE id = ? LIMIT 1').bind('global').first<any>();

        if (!existing) {
            await db
                .prepare('INSERT INTO game_settings (id, successSoundUrl, errorSoundUrl, backgroundMusicUrl, backgroundMusicVolume, difficulty, whatsappNumber, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
                .bind('global', '', '', '', 50, 'medium', '96871776166', now)
                .run();
        }

        const successSoundUrl = body.successSoundUrl !== undefined ? body.successSoundUrl : existing?.successSoundUrl || '';
        const errorSoundUrl = body.errorSoundUrl !== undefined ? body.errorSoundUrl : existing?.errorSoundUrl || '';
        const backgroundMusicUrl = body.backgroundMusicUrl !== undefined ? body.backgroundMusicUrl : existing?.backgroundMusicUrl || '';
        const backgroundMusicVolume = body.backgroundMusicVolume !== undefined ? Math.min(100, Math.max(0, parseFloat(body.backgroundMusicVolume as string) || 50)) : existing?.backgroundMusicVolume || 50;
        const difficulty = (body.difficulty && ['easy', 'medium', 'hard'].includes(body.difficulty as string)) ? body.difficulty : (existing?.difficulty || 'medium');
        const whatsappNumber = body.whatsappNumber !== undefined ? (body.whatsappNumber as string).trim() : (existing?.whatsappNumber || '96871776166');

        await db
            .prepare('UPDATE game_settings SET successSoundUrl=?, errorSoundUrl=?, backgroundMusicUrl=?, backgroundMusicVolume=?, difficulty=?, whatsappNumber=?, updatedAt=? WHERE id=?')
            .bind(successSoundUrl, errorSoundUrl, backgroundMusicUrl, backgroundMusicVolume, difficulty, whatsappNumber, now, 'global')
            .run();

        return NextResponse.json({ id: 'global', successSoundUrl, errorSoundUrl, backgroundMusicUrl, backgroundMusicVolume, difficulty, whatsappNumber, updatedAt: now });
    } catch (error) {
        console.error('Error updating settings:', error);
        return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
    }
}
