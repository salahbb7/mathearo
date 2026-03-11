'use server';

import { connectDB } from '@/lib/db';
import GameSession from '@/models/GameSession';
import Student from '@/models/Student';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

async function getTeacherId() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        throw new Error('غير مصرح');
    }
    return session.user.id;
}

export async function getGameSessions() {
    await connectDB();
    const teacherId = await getTeacherId();

    // We need to fetch sessions and populate the student info
    // Wait, Student is a separate model. Ensure it's registered.
    await Student.findOne(); // trick to register model in mongoose

    const sessions = await GameSession.find({ teacherId })
        .populate('studentId', 'name grade')
        .sort({ date: -1 });

    return JSON.parse(JSON.stringify(sessions));
}
