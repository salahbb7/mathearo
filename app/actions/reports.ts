'use server';

import { getDB } from '@/lib/db';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

async function getTeacherId() {
    const session = await getServerSession(authOptions);
    if (!(session?.user as any)?.id) {
        throw new Error('غير مصرح');
    }
    return (session!.user as any).id as string;
}

export async function getGameSessions() {
    const db = await getDB();
    const teacherId = await getTeacherId();

    const sessions = await db
        .prepare(
            `SELECT gs.*, s.name as student_name_from_table, s.grade
             FROM game_sessions gs
             LEFT JOIN students s ON gs.studentId = s.id
             WHERE gs.teacherId = ?
             ORDER BY gs.date DESC`
        )
        .bind(teacherId)
        .all<any>();

    return sessions.results.map((s: any) => ({
        ...s,
        studentId: s.studentId ? {
            _id: s.studentId,
            name: s.student_name_from_table || s.studentName,
            grade: s.grade,
        } : null,
    }));
}
