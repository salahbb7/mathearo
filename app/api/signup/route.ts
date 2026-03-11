import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import Teacher from '@/models/Teacher';
import bcrypt from 'bcryptjs';

export async function POST(request: NextRequest) {
    try {
        await connectDB();
        const body = await request.json();

        const { name, email, password, confirmPassword } = body;

        // Validate required fields
        if (!name || !email || !password || !confirmPassword) {
            return NextResponse.json(
                { error: 'جميع الحقول مطلوبة' },
                { status: 400 }
            );
        }

        // Validate name length
        if (name.trim().length < 2) {
            return NextResponse.json(
                { error: 'الاسم يجب أن يكون حرفين على الأقل' },
                { status: 400 }
            );
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return NextResponse.json(
                { error: 'صيغة البريد الإلكتروني غير صحيحة' },
                { status: 400 }
            );
        }

        // Validate password length
        if (password.length < 6) {
            return NextResponse.json(
                { error: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' },
                { status: 400 }
            );
        }

        // Validate passwords match
        if (password !== confirmPassword) {
            return NextResponse.json(
                { error: 'كلمتا المرور غير متطابقتين' },
                { status: 400 }
            );
        }

        // Check if email already registered
        const existingUser = await Teacher.findOne({ email: email.toLowerCase().trim() });
        if (existingUser) {
            return NextResponse.json(
                { error: 'هذا البريد الإلكتروني مسجل بالفعل' },
                { status: 400 }
            );
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create teacher with 'test' plan by default (requires admin upgrade to 'pro')
        const teacher = await Teacher.create({
            name: name.trim(),
            email: email.toLowerCase().trim(),
            password: hashedPassword,
            role: 'teacher',
            plan: 'test',
            isActive: true,
        });

        return NextResponse.json(
            {
                message: 'تم إنشاء الحساب بنجاح! يمكنك الآن تسجيل الدخول.',
                id: teacher._id.toString(),
                name: teacher.name,
                email: teacher.email,
            },
            { status: 201 }
        );
    } catch (error) {
        console.error('Signup error:', error);
        return NextResponse.json(
            { error: 'حدث خطأ أثناء إنشاء الحساب. يرجى المحاولة مرة أخرى.' },
            { status: 500 }
        );
    }
}
