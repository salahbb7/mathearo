import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import Teacher from '@/models/Teacher';
import bcrypt from 'bcryptjs';

export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        await connectDB();
        const body = await request.json();
        const { id } = await params;
        const user = await Teacher.findById(id);

        if (!user) {
            return NextResponse.json({ error: 'المستخدم غير موجود' }, { status: 404 });
        }

        user.name = body.name || user.name;
        user.email = body.email || user.email;
        let newRole: string = body.role || user.role;
        if (newRole === 'admin') {
            newRole = 'superadmin';
        }
        user.role = newRole as 'superadmin' | 'teacher';
        user.plan = body.plan || user.plan;

        user.isActive = body.isActive !== undefined ? body.isActive : user.isActive;

        // Only update password if provided
        if (body.password) {
            user.password = await bcrypt.hash(body.password, 10);
        }

        await user.save();

        const { ...userWithoutPassword } = user.toObject();
        delete userWithoutPassword.password;

        return NextResponse.json(userWithoutPassword);
    } catch (error) {
        console.error('Error updating user:', error);
        return NextResponse.json({ error: 'فشل في تحديث المستخدم', details: error instanceof Error ? error.message : String(error) }, { status: 500 });
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        await connectDB();
        const { id } = await params;
        const user = await Teacher.findById(id);

        if (!user) {
            return NextResponse.json({ error: 'المستخدم غير موجود' }, { status: 404 });
        }

        await Teacher.findByIdAndDelete(id);

        return NextResponse.json({ message: 'تم حذف المستخدم بنجاح' });
    } catch (error) {
        console.error('Error deleting user:', error);
        return NextResponse.json({ error: 'فشل في حذف المستخدم' }, { status: 500 });
    }
}
