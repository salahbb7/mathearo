import { NextRequest, NextResponse } from 'next/server';
import { getDB } from '@/lib/db';
import bcrypt from 'bcryptjs';

export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const db = await getDB();
        const body = await request.json() as any;
        const { id } = await params;

        const user = await db
            .prepare('SELECT * FROM teachers WHERE id = ? LIMIT 1')
            .bind(id)
            .first<any>();

        if (!user) {
            return NextResponse.json({ error: 'المستخدم غير موجود' }, { status: 404 });
        }

        const name = body.name || user.name;
        const email = body.email || user.email;
        let role = body.role || user.role;
        if (role === 'admin') role = 'superadmin';
        const plan = body.plan || user.plan;
        const isActive = body.isActive !== undefined ? (body.isActive ? 1 : 0) : user.isActive;
        const now = new Date().toISOString();

        if (body.password) {
            const hashedPassword = await bcrypt.hash(body.password, 10);
            await db
                .prepare('UPDATE teachers SET name=?, email=?, role=?, plan=?, isActive=?, password=?, updatedAt=? WHERE id=?')
                .bind(name, email, role, plan, isActive, hashedPassword, now, id)
                .run();
        } else {
            await db
                .prepare('UPDATE teachers SET name=?, email=?, role=?, plan=?, isActive=?, updatedAt=? WHERE id=?')
                .bind(name, email, role, plan, isActive, now, id)
                .run();
        }

        return NextResponse.json({ id, name, email, role, plan, isActive: isActive === 1 });
    } catch (error) {
        console.error('Error updating user:', error);
        return NextResponse.json({ error: 'فشل في تحديث المستخدم' }, { status: 500 });
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const db = await getDB();
        const { id } = await params;

        const user = await db.prepare('SELECT id FROM teachers WHERE id = ? LIMIT 1').bind(id).first<{ id: string }>();

        if (!user) {
            return NextResponse.json({ error: 'المستخدم غير موجود' }, { status: 404 });
        }

        await db.prepare('DELETE FROM teachers WHERE id = ?').bind(id).run();

        return NextResponse.json({ message: 'تم حذف المستخدم بنجاح' });
    } catch (error) {
        console.error('Error deleting user:', error);
        return NextResponse.json({ error: 'فشل في حذف المستخدم' }, { status: 500 });
    }
}
