'use server';

import path from 'path';
import { writeFile, mkdir } from 'fs/promises';

import { connectDB } from '@/lib/db';
import Settings from '@/models/Settings';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { revalidatePath } from 'next/cache';

async function getTeacherId() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        throw new Error('غير مصرح');
    }
    return session.user.id;
}

export async function getSettings() {
    await connectDB();
    const teacherId = await getTeacherId();
    const settings = await Settings.findOne({ teacherId });
    return JSON.parse(JSON.stringify(settings || {}));
}

export async function updateSettings(formData: FormData) {
    await connectDB();
    const teacherId = await getTeacherId();

    const successSound = formData.get('successSoundUrl') as File | null;
    const errorSound = formData.get('errorSoundUrl') as File | null;

    let settings = await Settings.findOne({ teacherId });
    if (!settings) {
        settings = new Settings({ teacherId });
    }

    const uploadDir = path.join(process.cwd(), 'public', 'uploads');

    // We only create directory if dealing with uploading
    if ((successSound && successSound.size > 0) || (errorSound && errorSound.size > 0)) {
        await mkdir(uploadDir, { recursive: true });
    }

    if (successSound && successSound.size > 0) {
        const bytes = await successSound.arrayBuffer();
        const buffer = Buffer.from(bytes);
        const filename = `teacher-${teacherId}-success-${Date.now()}${path.extname(successSound.name)}`;
        const filePath = path.join(uploadDir, filename);
        await writeFile(filePath, buffer);
        settings.successSoundUrl = `/uploads/${filename}`;
    }

    // A hidden input indicating user wanted to clear the URL? For now let's just update if file provided.

    if (errorSound && errorSound.size > 0) {
        const bytes = await errorSound.arrayBuffer();
        const buffer = Buffer.from(bytes);
        const filename = `teacher-${teacherId}-error-${Date.now()}${path.extname(errorSound.name)}`;
        const filePath = path.join(uploadDir, filename);
        await writeFile(filePath, buffer);
        settings.errorSoundUrl = `/uploads/${filename}`;
    }

    await settings.save();

    revalidatePath('/dashboard/settings');
}
