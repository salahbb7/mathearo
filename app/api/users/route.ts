import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import Teacher from '@/models/Teacher';
import ClassGroup from '@/models/ClassGroup';
import Student from '@/models/Student';
import bcrypt from 'bcryptjs';

export async function GET() {
    try {
        await connectDB();
        const users = await Teacher.find({}, '-password').sort({ createdAt: -1 });

        const usersWithCounts = await Promise.all(users.map(async (user) => {
            const u = user.toObject();
            if ((u.role as string) === 'admin') u.role = 'superadmin' as any;

            // Get classes for this teacher
            const classes = await ClassGroup.find({ teacherId: user._id });
            const classCount = classes.length;

            // Get total students for this teacher
            const studentCount = await Student.countDocuments({ teacherId: user._id });

            // Get per-class student counts
            const classesWithStudentCounts = await Promise.all(classes.map(async (cls) => {
                const count = await Student.countDocuments({
                    teacherId: user._id,
                    grade: cls.name
                });
                return {
                    name: cls.name,
                    studentCount: count
                };
            }));

            return {
                ...u,
                statistics: {
                    classCount,
                    studentCount,
                    classes: classesWithStudentCounts
                }
            };
        }));

        return NextResponse.json(usersWithCounts);
    } catch (error) {
        console.error('Error fetching users:', error);
        return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        await connectDB();
        const body = await request.json();

        // Validate required fields
        if (!body.email || !body.password || !body.name) {
            return NextResponse.json(
                { error: 'جميع الحقول مطلوبة (الاسم، البريد، كلمة المرور)' },
                { status: 400 }
            );
        }

        // Check if user already exists
        const existingUser = await Teacher.findOne({ email: body.email });
        if (existingUser) {
            return NextResponse.json(
                { error: 'البريد الإلكتروني مسجل بالفعل' },
                { status: 400 }
            );
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(body.password, 10);

        const user = await Teacher.create({
            name: body.name,
            email: body.email,
            password: hashedPassword,
            role: (body.role === 'admin' ? 'superadmin' : body.role) || 'teacher',
            plan: body.plan || 'test',
        });

        const { ...userWithoutPassword } = user.toObject();
        delete userWithoutPassword.password; // Manually remove password from response

        return NextResponse.json(userWithoutPassword, { status: 201 });
    } catch (error) {
        console.error('Error creating user:', error);
        return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
    }
}
