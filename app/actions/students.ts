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

export async function getStudents() {
    const db = await getDB();
    const teacherId = await getTeacherId();
    const result = await db
        .prepare('SELECT * FROM students WHERE teacherId = ? ORDER BY createdAt DESC')
        .bind(teacherId)
        .all<any>();
    return result.results;
}

export async function addStudent(formData: FormData) {
    const db = await getDB();
    const teacherId = await getTeacherId();
    const name = formData.get('name') as string;
    const grade = formData.get('grade') as string;

    if (!name || !grade) {
        throw new Error('اكمل جميع الحقول');
    }

    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    await db
        .prepare('INSERT INTO students (id, name, grade, teacherId, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?)')
        .bind(id, name, grade, teacherId, now, now)
        .run();

    revalidatePath('/dashboard/students');
}

export async function deleteStudent(id: string) {
    const db = await getDB();
    const teacherId = await getTeacherId();
    await db.prepare('DELETE FROM students WHERE id = ? AND teacherId = ?').bind(id, teacherId).run();
    revalidatePath('/dashboard/students');
}

export async function editStudent(id: string, formData: FormData) {
    const db = await getDB();
    const teacherId = await getTeacherId();
    const name = formData.get('name') as string;
    const grade = formData.get('grade') as string;

    if (!name || !grade) {
        throw new Error('اكمل جميع الحقول');
    }

    const now = new Date().toISOString();
    await db
        .prepare('UPDATE students SET name=?, grade=?, updatedAt=? WHERE id=? AND teacherId=?')
        .bind(name, grade, now, id, teacherId)
        .run();

    revalidatePath('/dashboard/students');
}
