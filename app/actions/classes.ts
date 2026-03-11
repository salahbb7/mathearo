'use server';

import { connectDB } from '@/lib/db';
import ClassGroup from '@/models/ClassGroup';
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

export async function getClasses() {
    await connectDB();
    const teacherId = await getTeacherId();
    const classes = await ClassGroup.find({ teacherId }).sort({ createdAt: -1 });
    return JSON.parse(JSON.stringify(classes));
}

export async function addClass(formData: FormData) {
    await connectDB();
    const teacherId = await getTeacherId();
    const name = formData.get('name') as string;

    if (!name) {
        throw new Error('يرجى إدخال اسم الصف');
    }

    await ClassGroup.create({ name, teacherId });
    revalidatePath('/dashboard/students');
}

export async function deleteClass(id: string) {
    await connectDB();
    const teacherId = await getTeacherId();

    const classGroup = await ClassGroup.findOne({ _id: id, teacherId });
    if (!classGroup) throw new Error('الصف غير موجود');

    // delete students in this class
    await Student.deleteMany({ grade: classGroup.name, teacherId });
    await ClassGroup.findOneAndDelete({ _id: id, teacherId });

    revalidatePath('/dashboard/students');
}
