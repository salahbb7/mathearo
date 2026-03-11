'use server';

import { connectDB } from '@/lib/db';
import Student from '@/models/Student';
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

export async function getStudents() {
    await connectDB();
    const teacherId = await getTeacherId();
    const students = await Student.find({ teacherId }).sort({ createdAt: -1 });
    return JSON.parse(JSON.stringify(students));
}

export async function addStudent(formData: FormData) {
    await connectDB();
    const teacherId = await getTeacherId();
    const name = formData.get('name') as string;
    const grade = formData.get('grade') as string;

    if (!name || !grade) {
        throw new Error('اكمل جميع الحقول');
    }

    await Student.create({ name, grade, teacherId });
    revalidatePath('/dashboard/students');
}

export async function deleteStudent(id: string) {
    await connectDB();
    const teacherId = await getTeacherId();
    await Student.findOneAndDelete({ _id: id, teacherId });
    revalidatePath('/dashboard/students');
}

export async function editStudent(id: string, formData: FormData) {
    await connectDB();
    const teacherId = await getTeacherId();
    const name = formData.get('name') as string;
    const grade = formData.get('grade') as string;

    if (!name || !grade) {
        throw new Error('اكمل جميع الحقول');
    }

    await Student.findOneAndUpdate({ _id: id, teacherId }, { name, grade });
    revalidatePath('/dashboard/students');
}
