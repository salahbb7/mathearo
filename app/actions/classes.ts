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

export async function getClasses() {
    const db = await getDB();
    const teacherId = await getTeacherId();
    const result = await db
        .prepare('SELECT * FROM class_groups WHERE teacherId = ? ORDER BY createdAt DESC')
        .bind(teacherId)
        .all<any>();
    return result.results;
}

export async function addClass(formData: FormData) {
    const db = await getDB();
    const teacherId = await getTeacherId();
    const name = formData.get('name') as string;

    if (!name) {
        throw new Error('يرجى إدخال اسم الصف');
    }

    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    await db
        .prepare('INSERT INTO class_groups (id, name, teacherId, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?)')
        .bind(id, name, teacherId, now, now)
        .run();

    revalidatePath('/dashboard/students');
}

export async function deleteClass(id: string) {
    const db = await getDB();
    const teacherId = await getTeacherId();

    const classGroup = await db
        .prepare('SELECT * FROM class_groups WHERE id = ? AND teacherId = ? LIMIT 1')
        .bind(id, teacherId)
        .first<any>();

    if (!classGroup) throw new Error('الصف غير موجود');

    // Delete students in this class
    await db
        .prepare('DELETE FROM students WHERE grade = ? AND teacherId = ?')
        .bind(classGroup.name, teacherId)
        .run();

    await db.prepare('DELETE FROM class_groups WHERE id = ? AND teacherId = ?').bind(id, teacherId).run();

    revalidatePath('/dashboard/students');
}
