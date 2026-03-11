import { getStudents } from '@/app/actions/students';
import { getClasses } from '@/app/actions/classes';
import StudentsClient from './StudentsClient';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export default async function StudentsPage() {
    const session = await getServerSession(authOptions);
    const students = await getStudents();
    const classGroups = await getClasses();
    return <StudentsClient
        initialStudents={students}
        initialClasses={classGroups}
        plan={(session?.user as any)?.plan || 'test'}
    />;
}
