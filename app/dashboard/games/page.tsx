import { getStudents } from '@/app/actions/students';
import { getClasses } from '@/app/actions/classes';
import GamesClient from './GamesClient';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export default async function GamesPage() {
    const session = await getServerSession(authOptions);
    const students = await getStudents();
    const classes = await getClasses();
    return <GamesClient
        students={students}
        classes={classes}
        plan={(session?.user as any)?.plan || 'test'}
        userName={session?.user?.name || ''}
    />;
}
