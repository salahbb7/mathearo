import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import Teacher from '@/models/Teacher';
import bcrypt from 'bcryptjs';

export async function POST(request: NextRequest) {
    try {
        await connectDB();

        // Check if superadmin already exists
        const existingAdmin = await Teacher.findOne({ email: 'superadmin@school.com' });

        if (existingAdmin) {
            return NextResponse.json({ message: 'المستخدم موجود بالفعل' }, { status: 400 });
        }

        // Create superadmin teacher
        const hashedPassword = await bcrypt.hash('admin123', 10);

        const admin = await Teacher.create({
            email: 'superadmin@school.com',
            password: hashedPassword,
            name: 'المدير العام',
            role: 'superadmin',
        });

        return NextResponse.json({
            message: 'تم إنشاء حساب المعلم بنجاح',
            teacher: {
                email: admin.email,
                name: admin.name,
            }
        }, { status: 201 });
    } catch (error) {
        console.error('Error creating admin:', error);
        return NextResponse.json({ error: 'Failed to create admin user' }, { status: 500 });
    }
}
