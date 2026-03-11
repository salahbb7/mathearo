'use server';

import { getDB } from '@/lib/db';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { revalidatePath } from 'next/cache';

async function getTeacherId() {
    const session = await getServerSession(authOptions);
    if (!(session?.user as any)?.id) {
        throw new Error('غير مصرح');
    }
    return (session!.user as any).id as string;
}

export async function getSettings() {
    const db = await getDB();
    const teacherId = await getTeacherId();
    const settings = await db
        .prepare('SELECT * FROM teacher_settings WHERE teacherId = ? LIMIT 1')
        .bind(teacherId)
        .first<any>();
    return settings || {};
}

export async function updateSettings(formData: FormData) {
    const db = await getDB();
    const teacherId = await getTeacherId();

    // On Cloudflare Workers, fs/path are not available.
    // Settings now store URLs directly (user pastes URL or uses hosted files).
    const successSoundUrl = formData.get('successSoundUrl') as string | null;
    const errorSoundUrl = formData.get('errorSoundUrl') as string | null;

    const now = new Date().toISOString();
    const existing = await db
        .prepare('SELECT id FROM teacher_settings WHERE teacherId = ? LIMIT 1')
        .bind(teacherId)
        .first<any>();

    if (existing) {
        await db
            .prepare('UPDATE teacher_settings SET successSoundUrl=?, errorSoundUrl=?, updatedAt=? WHERE teacherId=?')
            .bind(successSoundUrl || '', errorSoundUrl || '', now, teacherId)
            .run();
    } else {
        const id = crypto.randomUUID();
        await db
            .prepare('INSERT INTO teacher_settings (id, teacherId, successSoundUrl, errorSoundUrl, updatedAt) VALUES (?, ?, ?, ?, ?)')
            .bind(id, teacherId, successSoundUrl || '', errorSoundUrl || '', now)
            .run();
    }

    revalidatePath('/dashboard/settings');
}
