'use server';

import { getDB, getBucket } from '@/lib/db';
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
    const bucket = await getBucket();
    const teacherId = await getTeacherId();

    const successSoundFile = formData.get('successSoundUrl');
    const errorSoundFile = formData.get('errorSoundUrl');

    let finalSuccessSoundUrl = '';
    let finalErrorSoundUrl = '';

    // Handle success sound file
    if (successSoundFile && successSoundFile instanceof File && successSoundFile.size > 0) {
        const fileKey = `settings/${teacherId}/success_${Date.now()}_${successSoundFile.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
        const arrayBuffer = await successSoundFile.arrayBuffer();
        await bucket.put(fileKey, arrayBuffer, {
            httpMetadata: { contentType: successSoundFile.type }
        });
        // We will store the path. When serving, we can expose an API route or a public R2 URL.
        // Assuming we will configure a public bucket or a custom domain bucket, e.g. /cdn/...
        finalSuccessSoundUrl = `/api/files/${fileKey}`;
    }

    // Handle error sound file
    if (errorSoundFile && errorSoundFile instanceof File && errorSoundFile.size > 0) {
        const fileKey = `settings/${teacherId}/error_${Date.now()}_${errorSoundFile.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
        const arrayBuffer = await errorSoundFile.arrayBuffer();
        await bucket.put(fileKey, arrayBuffer, {
            httpMetadata: { contentType: errorSoundFile.type }
        });
        finalErrorSoundUrl = `/api/files/${fileKey}`;
    }

    const now = new Date().toISOString();
    const existing = await db
        .prepare('SELECT id, successSoundUrl, errorSoundUrl FROM teacher_settings WHERE teacherId = ? LIMIT 1')
        .bind(teacherId)
        .first<any>();

    // If no new file uploaded but existing settings exist, preserve old urls
    if (!finalSuccessSoundUrl && existing && existing.successSoundUrl) {
        finalSuccessSoundUrl = existing.successSoundUrl;
    }
    if (!finalErrorSoundUrl && existing && existing.errorSoundUrl) {
        finalErrorSoundUrl = existing.errorSoundUrl;
    }

    if (existing) {
        await db
            .prepare('UPDATE teacher_settings SET successSoundUrl=?, errorSoundUrl=?, updatedAt=? WHERE teacherId=?')
            .bind(finalSuccessSoundUrl, finalErrorSoundUrl, now, teacherId)
            .run();
    } else {
        const id = crypto.randomUUID();
        await db
            .prepare('INSERT INTO teacher_settings (id, teacherId, successSoundUrl, errorSoundUrl, updatedAt) VALUES (?, ?, ?, ?, ?)')
            .bind(id, teacherId, finalSuccessSoundUrl, finalErrorSoundUrl, now)
            .run();
    }

    revalidatePath('/dashboard/settings');
}
