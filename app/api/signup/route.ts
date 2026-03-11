import { NextRequest, NextResponse } from 'next/server';
import { getDB } from '@/lib/db';
import bcrypt from 'bcryptjs';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json() as any;
        const { name, email, password, confirmPassword } = body;

        if (!name || !email || !password || !confirmPassword) {
            return NextResponse.json({ error: 'جميع الحقول مطلوبة' }, { status: 400 });
        }

        if (name.trim().length < 2) {
            return NextResponse.json({ error: 'الاسم يجب أن يكون حرفين على الأقل' }, { status: 400 });
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return NextResponse.json({ error: 'صيغة البريد الإلكتروني غير صحيحة' }, { status: 400 });
        }

        if (password.length < 6) {
            return NextResponse.json({ error: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' }, { status: 400 });
        }

        if (password !== confirmPassword) {
            return NextResponse.json({ error: 'كلمتا المرور غير متطابقتين' }, { status: 400 });
        }

        const db = await getDB();
        const normalizedEmail = email.toLowerCase().trim();

        const existing = await db
            .prepare('SELECT id FROM teachers WHERE email = ? LIMIT 1')
            .bind(normalizedEmail)
            .first<{ id: string }>();

        if (existing) {
            return NextResponse.json({ error: 'هذا البريد الإلكتروني مسجل بالفعل' }, { status: 400 });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const id = crypto.randomUUID();
        const now = new Date().toISOString();

        await db
            .prepare(
                'INSERT INTO teachers (id, name, email, password, role, isActive, plan, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
            )
            .bind(id, name.trim(), normalizedEmail, hashedPassword, 'teacher', 1, 'test', now, now)
            .run();

        return NextResponse.json(
            { message: 'تم إنشاء الحساب بنجاح! يمكنك الآن تسجيل الدخول.', id, name: name.trim(), email: normalizedEmail },
            { status: 201 }
        );
    } catch (error) {
        console.error('Signup error:', error);
        return NextResponse.json({ error: 'حدث خطأ أثناء إنشاء الحساب. يرجى المحاولة مرة أخرى.' }, { status: 500 });
    }
}
