import React from 'react';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { redirect } from 'next/navigation';
import Link from 'next/link';

export default async function SuperAdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const session = await getServerSession(authOptions);

    if (!session || session.user?.role !== 'superadmin') {
        redirect('/dashboard');
    }

    return (
        <div className="flex min-h-screen bg-gray-50 text-gray-900" dir="rtl">
            <aside className="w-64 bg-slate-900 text-white flex flex-col hidden sm:flex">
                <div className="p-6 text-center border-b border-slate-700">
                    <h2 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400">
                        الإدارة العليا
                    </h2>
                </div>
                <nav className="flex-1 p-4 space-y-2">
                    <Link href="/superadmin" className="block px-4 py-3 rounded-xl bg-slate-800 text-emerald-400 font-bold transition-colors">
                        👥 إدارة المعلمين
                    </Link>
                    <Link href="/dashboard" className="block px-4 py-3 rounded-xl hover:bg-slate-800 text-gray-300 transition-colors">
                        👨‍🏫 لوحة المعلم
                    </Link>
                </nav>
                <div className="p-4 border-t border-slate-700">
                    <Link href="/api/auth/signout?callbackUrl=/" className="block text-center px-4 py-2 bg-red-500/10 text-red-500 hover:bg-red-500/20 font-bold rounded-lg transition-colors">
                        تسجيل الخروج
                    </Link>
                </div>
            </aside>
            <main className="flex-1 flex flex-col min-w-0">
                <div className="sm:hidden bg-slate-900 text-white p-4 flex justify-between items-center">
                    <h2 className="text-xl font-bold">الإدارة العليا</h2>
                    <Link href="/api/auth/signout?callbackUrl=/" className="text-red-400 font-bold">خروج</Link>
                </div>
                <div className="flex-1 overflow-auto p-4 sm:p-8">
                    {children}
                </div>
            </main>
        </div>
    );
}
