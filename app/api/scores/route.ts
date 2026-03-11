import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import GameSession from '@/models/GameSession';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const teacherId = session.user.id;

        await connectDB();
        const body = await request.json();

        if (!body.studentId && !body.studentName) {
            return NextResponse.json({ error: 'studentId or studentName is required' }, { status: 400 });
        }

        const gameSession = await GameSession.create({
            studentId: body.studentId || undefined,
            studentName: body.studentName || undefined,
            teacherId: teacherId,
            score: body.score,
            totalQuestions: body.totalQuestions,
            gameName: body.gameType || 'unknown',
        });

        return NextResponse.json(gameSession, { status: 201 });
    } catch (error) {
        console.error('Error creating GameSession:', error);
        return NextResponse.json({ error: 'Failed to save score' }, { status: 500 });
    }
}
