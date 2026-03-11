import { NextRequest, NextResponse } from 'next/server';
import { getDB } from '@/lib/db';
import bcrypt from 'bcryptjs';

export async function GET() {
    try {
        const db = await getDB();

        const teachers = await db
            .prepare('SELECT id, name, email, role, isActive, plan, createdAt FROM teachers ORDER BY createdAt DESC')
            .all<any>();

        const usersWithCounts = await Promise.all(
            teachers.results.map(async (teacher: any) => {
                const classes = await db
                    .prepare('SELECT id, name FROM class_groups WHERE teacherId = ?')
                    .bind(teacher.id)
                    .all<any>();

                const studentCount = await db
                    .prepare('SELECT COUNT(*) as count FROM students WHERE teacherId = ?')
                    .bind(teacher.id)
                    .first<{ count: number }>();

                const classesWithCounts = await Promise.all(
                    classes.results.map(async (cls: any) => {
                        const count = await db
                            .prepare('SELECT COUNT(*) as count FROM students WHERE teacherId = ? AND grade = ?')
                            .bind(teacher.id, cls.name)
                            .first<{ count: number }>();
                        return { name: cls.name, studentCount: count?.count || 0 };
                    })
                );

                return {
                    ...teacher,
                    isActive: teacher.isActive === 1,
                    statistics: {
                        classCount: classes.results.length,
                        studentCount: studentCount?.count || 0,
                        classes: classesWithCounts,
                    },
                };
            })
        );

        return NextResponse.json(usersWithCounts);
    } catch (error) {
        console.error('Error fetching users:', error);
        return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const db = await getDB();
        const body = await request.json();

        if (!body.email || !body.password || !body.name) {
            return NextResponse.json({ error: 'جميع الحقول مطلوبة (الاسم، البريد، كلمة المرور)' }, { status: 400 });
        }

        const existing = await db
            .prepare('SELECT id FROM teachers WHERE email = ? LIMIT 1')
            .bind(body.email)
            .first<{ id: string }>();

        if (existing) {
            return NextResponse.json({ error: 'البريد الإلكتروني مسجل بالفعل' }, { status: 400 });
        }

        const hashedPassword = await bcrypt.hash(body.password, 10);
        const id = crypto.randomUUID();
        const now = new Date().toISOString();
        const role = body.role === 'admin' ? 'superadmin' : (body.role || 'teacher');

        await db
            .prepare(
                'INSERT INTO teachers (id, name, email, password, role, isActive, plan, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
            )
            .bind(id, body.name, body.email, hashedPassword, role, 1, body.plan || 'test', now, now)
            .run();

        return NextResponse.json({ id, name: body.name, email: body.email, role, plan: body.plan || 'test' }, { status: 201 });
    } catch (error) {
        console.error('Error creating user:', error);
        return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
    }
}
