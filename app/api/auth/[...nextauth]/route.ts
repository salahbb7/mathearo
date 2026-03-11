import NextAuth, { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { getDB } from '@/lib/db';
import bcrypt from 'bcryptjs';

export const authOptions: NextAuthOptions = {
    providers: [
        CredentialsProvider({
            name: 'Credentials',
            credentials: {
                email: { label: 'البريد الإلكتروني', type: 'email' },
                password: { label: 'كلمة المرور', type: 'password' },
            },
            async authorize(credentials) {
                if (!credentials?.email || !credentials?.password) {
                    throw new Error('يرجى إدخال البريد الإلكتروني وكلمة المرور');
                }

                const db = await getDB();

                const teacher = await db
                    .prepare('SELECT * FROM teachers WHERE email = ? LIMIT 1')
                    .bind(credentials.email.toLowerCase().trim())
                    .first<any>();

                if (!teacher || !teacher.password) {
                    throw new Error('البريد الإلكتروني أو كلمة المرور غير صحيحة');
                }

                if (teacher.isActive === 0) {
                    throw new Error('هذا الحساب معطل. يرجى التواصل مع الإدارة.');
                }

                const isPasswordValid = await bcrypt.compare(credentials.password, teacher.password);

                if (!isPasswordValid) {
                    throw new Error('البريد الإلكتروني أو كلمة المرور غير صحيحة');
                }

                return {
                    id: teacher.id,
                    email: teacher.email,
                    name: teacher.name,
                    role: teacher.role || 'teacher',
                    plan: teacher.plan || 'test',
                };
            },
        }),
    ],
    session: {
        strategy: 'jwt',
    },
    pages: {
        signIn: '/login',
    },
    callbacks: {
        async jwt({ token, user }) {
            if (user) {
                token.id = user.id;
                token.role = (user as any).role;
                token.plan = (user as any).plan;
            }
            return token;
        },
        async session({ session, token }) {
            if (session.user) {
                (session.user as any).id = token.id;
                (session.user as any).role = token.role;
                (session.user as any).plan = token.plan;
            }
            return session;
        },
    },
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
