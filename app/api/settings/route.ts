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
        const { getBucket } = await import('@/lib/db');
        const bucket = await getBucket();

        let body: Record<string, unknown> = {};
        const contentType = request.headers.get('content-type') || '';
        let formData: FormData | null = null;

        if (contentType.includes('application/json')) {
            body = await request.json() as any;
        } else if (contentType.includes('multipart/form-data') || contentType.includes('application/x-www-form-urlencoded')) {
            formData = await request.formData();
            for (const [key, value] of formData.entries()) {
                // Ignore File objects for the generic body parsing
                if (!(value instanceof File)) {
                    body[key] = value;
                }
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

        let finalSuccessSoundUrl = body.successSoundUrl !== undefined ? (body.successSoundUrl as string) : existing?.successSoundUrl || '';
        let finalErrorSoundUrl = body.errorSoundUrl !== undefined ? (body.errorSoundUrl as string) : existing?.errorSoundUrl || '';
        let finalBackgroundMusicUrl = body.backgroundMusicUrl !== undefined ? (body.backgroundMusicUrl as string) : existing?.backgroundMusicUrl || '';

        if (formData) {
            const successFile = formData.get('successSound');
            if (successFile && successFile instanceof File && successFile.size > 0) {
                const fileKey = `settings/global/success_${Date.now()}_${successFile.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
                await bucket.put(fileKey, await successFile.arrayBuffer(), { httpMetadata: { contentType: successFile.type } });
                finalSuccessSoundUrl = `/api/files/${fileKey}`;
            }

            const errorFile = formData.get('errorSound');
            if (errorFile && errorFile instanceof File && errorFile.size > 0) {
                const fileKey = `settings/global/error_${Date.now()}_${errorFile.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
                await bucket.put(fileKey, await errorFile.arrayBuffer(), { httpMetadata: { contentType: errorFile.type } });
                finalErrorSoundUrl = `/api/files/${fileKey}`;
            }

            const musicFile = formData.get('backgroundMusic');
            if (musicFile && musicFile instanceof File && musicFile.size > 0) {
                const fileKey = `settings/global/music_${Date.now()}_${musicFile.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
                await bucket.put(fileKey, await musicFile.arrayBuffer(), { httpMetadata: { contentType: musicFile.type } });
                finalBackgroundMusicUrl = `/api/files/${fileKey}`;
            }
        }

        const backgroundMusicVolume = body.backgroundMusicVolume !== undefined ? Math.min(100, Math.max(0, parseFloat(body.backgroundMusicVolume as string) || 50)) : existing?.backgroundMusicVolume || 50;
        const difficulty = (body.difficulty && ['easy', 'medium', 'hard'].includes(body.difficulty as string)) ? body.difficulty as string : (existing?.difficulty || 'medium');
        const whatsappNumber = body.whatsappNumber !== undefined ? (body.whatsappNumber as string).trim() : (existing?.whatsappNumber || '96871776166');

        await db
            .prepare('UPDATE game_settings SET successSoundUrl=?, errorSoundUrl=?, backgroundMusicUrl=?, backgroundMusicVolume=?, difficulty=?, whatsappNumber=?, updatedAt=? WHERE id=?')
            .bind(finalSuccessSoundUrl, finalErrorSoundUrl, finalBackgroundMusicUrl, backgroundMusicVolume, difficulty, whatsappNumber, now, 'global')
            .run();

        return NextResponse.json({ id: 'global', successSoundUrl: finalSuccessSoundUrl, errorSoundUrl: finalErrorSoundUrl, backgroundMusicUrl: finalBackgroundMusicUrl, backgroundMusicVolume, difficulty, whatsappNumber, updatedAt: now });
    } catch (error) {
        console.error('Error updating settings:', error);
        return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
    }
}
