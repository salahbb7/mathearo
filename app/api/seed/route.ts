import { NextRequest, NextResponse } from 'next/server';
import { getDB } from '@/lib/db';
import bcrypt from 'bcryptjs';

export async function POST(request: NextRequest) {
    try {
        const db = await getDB();

        const existing = await db
            .prepare("SELECT id FROM teachers WHERE email = 'superadmin@school.com' LIMIT 1")
            .first<{ id: string }>();

        if (existing) {
            return NextResponse.json({ message: 'المستخدم موجود بالفعل' }, { status: 400 });
        }

        const hashedPassword = await bcrypt.hash('admin123', 10);
        const id = crypto.randomUUID();
        const now = new Date().toISOString();

        await db
            .prepare(
                'INSERT INTO teachers (id, name, email, password, role, isActive, plan, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
            )
            .bind(id, 'المدير العام', 'superadmin@school.com', hashedPassword, 'superadmin', 1, 'pro', now, now)
            .run();

        return NextResponse.json(
            { message: 'تم إنشاء حساب المدير بنجاح', teacher: { email: 'superadmin@school.com', name: 'المدير العام' } },
            { status: 201 }
        );
    } catch (error) {
        console.error('Error creating admin:', error);
        return NextResponse.json({ error: 'Failed to create admin user' }, { status: 500 });
    }
}
