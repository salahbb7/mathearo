import { NextRequest, NextResponse } from 'next/server';
import { getDB } from '@/lib/db';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const teacherId = (session.user as any).id;
        const db = await getDB();
        const body = await request.json();

        if (!body.studentId && !body.studentName) {
            return NextResponse.json({ error: 'studentId or studentName is required' }, { status: 400 });
        }

        const id = crypto.randomUUID();
        const now = new Date().toISOString();

        await db
            .prepare(
                'INSERT INTO game_sessions (id, studentId, studentName, teacherId, gameName, score, totalQuestions, date, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
            )
            .bind(
                id,
                body.studentId || null,
                body.studentName || null,
                teacherId,
                body.gameType || 'unknown',
                body.score,
                body.totalQuestions,
                now,
                now
            )
            .run();

        return NextResponse.json({ id, teacherId, gameName: body.gameType, score: body.score }, { status: 201 });
    } catch (error) {
        console.error('Error creating GameSession:', error);
        return NextResponse.json({ error: 'Failed to save score' }, { status: 500 });
    }
}
