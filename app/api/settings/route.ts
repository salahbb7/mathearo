import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import GameSettings from '@/models/GameSettings';

export async function GET() {
    try {
        await connectDB();

        let settings = await GameSettings.findOne();

        if (!settings) {
            settings = await GameSettings.create({
                successSoundUrl: '',
                errorSoundUrl: '',
                backgroundMusicUrl: '',
                backgroundMusicVolume: 50,
            });
        }

        return NextResponse.json(settings);
    } catch (error) {
        console.error('Error fetching settings:', error);
        return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        await connectDB();

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

        let settings = await GameSettings.findOne();
        if (!settings) {
            settings = new GameSettings({});
        }

        if (body.successSoundUrl !== undefined) settings.successSoundUrl = body.successSoundUrl;
        if (body.errorSoundUrl !== undefined) settings.errorSoundUrl = body.errorSoundUrl;
        if (body.backgroundMusicUrl !== undefined) settings.backgroundMusicUrl = body.backgroundMusicUrl;

        if (body.backgroundMusicVolume !== undefined) {
            const vol = parseFloat(body.backgroundMusicVolume as string);
            if (!isNaN(vol)) {
                settings.backgroundMusicVolume = Math.min(100, Math.max(0, vol));
            }
        }

        if (body.difficulty && ['easy', 'medium', 'hard'].includes(body.difficulty as string)) {
            settings.difficulty = body.difficulty as 'easy' | 'medium' | 'hard';
        }

        if (body.whatsappNumber !== undefined) {
            settings.whatsappNumber = (body.whatsappNumber as string).trim();
        }

        await settings.save();

        return NextResponse.json(settings);
    } catch (error) {
        console.error('Error updating settings:', error);
        return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
    }
}
