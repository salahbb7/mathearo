'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import BackgroundMusicPlayer from '@/app/components/BackgroundMusicPlayer';

export default function DashboardLayoutClient({ children, session }: { children: React.ReactNode, session: any }) {
    const pathname = usePathname();
    const isGamePage = pathname.includes('/games/') && pathname.split('/').length > 3;
    const [isMobileOpen, setIsMobileOpen] = useState(false);

    if (isGamePage) {
        return (
            <div className="min-h-screen bg-gray-50 flex flex-col" dir="rtl">
                <div className="absolute top-4 right-4 z-50">
                    <Link href="/dashboard/games" className="bg-white/80 backdrop-blur px-4 py-2 rounded-xl shadow-lg font-bold text-indigo-600 hover:bg-indigo-50 border border-indigo-100 transition-colors">
                        🔙 العودة للمكتبة
                    </Link>
                </div>
                {children}
                <BackgroundMusicPlayer />
            </div>
        );
    }

    return (
        <div className="flex h-screen bg-gray-50 text-gray-900" dir="rtl">
            {/* Mobile Header */}
            <div className="md:hidden fixed top-0 w-full h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 z-50 shadow-sm">
                <h1 className="text-xl font-black text-indigo-600">أبطال الرياضيات</h1>
                <button
                    onClick={() => setIsMobileOpen(!isMobileOpen)}
                    className="p-2 bg-indigo-50 text-indigo-600 rounded-lg font-bold"
                >
                    {isMobileOpen ? '❌' : '☰ القائمة'}
                </button>
            </div>

            {/* Sidebar */}
            <aside className={`
                fixed md:static inset-y-0 right-0 z-40
                w-64 bg-white border-l border-gray-200 flex flex-col 
                transform transition-transform duration-300 ease-in-out
                ${isMobileOpen ? 'translate-x-[0]' : 'translate-x-full md:translate-x-0'}
            `}>
                <div className="h-16 flex items-center justify-center border-b border-gray-200 hidden md:flex px-4">
                    <h1 className="text-xl font-black text-indigo-600 text-center w-full">أبطال الرياضيات</h1>
                </div>
                <div className="h-16 md:hidden" /> {/* Spacer for mobile */}

                <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
                    <Link onClick={() => setIsMobileOpen(false)} href="/dashboard/students" className="flex items-center p-3 rounded-lg hover:bg-indigo-50 hover:text-indigo-600 transition-colors">
                        <span className="font-semibold text-lg">👨‍🎓 إدارة الطلاب</span>
                    </Link>
                    <Link onClick={() => setIsMobileOpen(false)} href="/dashboard/games" className="flex items-center p-3 rounded-lg hover:bg-indigo-50 hover:text-indigo-600 transition-colors">
                        <span className="font-semibold text-lg">🎮 مكتبة الألعاب</span>
                    </Link>
                    <Link onClick={() => setIsMobileOpen(false)} href="/dashboard/reports" className="flex items-center p-3 rounded-lg hover:bg-indigo-50 hover:text-indigo-600 transition-colors">
                        <span className="font-semibold text-lg">📊 التقارير والنتائج</span>
                    </Link>
                    <Link onClick={() => setIsMobileOpen(false)} href="/dashboard/settings" className="flex items-center p-3 rounded-lg hover:bg-indigo-50 hover:text-indigo-600 transition-colors">
                        <span className="font-semibold text-lg">⚙️ الإعدادات</span>
                    </Link>
                    {(session?.user as any)?.role === 'superadmin' && (
                        <Link onClick={() => setIsMobileOpen(false)} href="/superadmin" className="flex items-center p-3 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors mt-4 border border-emerald-200">
                            <span className="font-bold text-lg">🛡️ الإدارة العليا</span>
                        </Link>
                    )}
                </nav>
                <div className="p-4 border-t border-gray-200 bg-gray-50">
                    <div className="text-sm font-bold text-gray-600 mb-1 text-center">مرحباً، {session?.user?.name}</div>
                    <div className="text-xs font-bold text-center mb-3">
                        {(session?.user as any)?.plan === 'pro' ? (
                            <span className="text-purple-600 bg-purple-50 px-2 py-1 rounded border border-purple-100 italic">💎 الباقة الاحترافية</span>
                        ) : (
                            <div className="space-y-1.5">
                                <span className="text-slate-500 bg-slate-100 px-2 py-1 rounded border border-slate-200">🧪 الباقة التجريبية</span>
                                <p className="text-[10px] text-purple-600 font-bold mt-1">الترقية: 3 ريال عُماني / شهر</p>
                                <a
                                    href="https://wa.me/96871776166"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center justify-center gap-1 text-[10px] text-white bg-green-500 hover:bg-green-600 px-2 py-1 rounded transition-colors font-bold"
                                >
                                    <svg viewBox="0 0 24 24" fill="currentColor" className="w-3 h-3 shrink-0"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" /><path d="M12 0C5.373 0 0 5.373 0 12c0 2.132.558 4.133 1.532 5.864L.057 23.664a.5.5 0 00.613.612l5.853-1.467A11.95 11.95 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.943 0-3.772-.528-5.339-1.444l-.383-.228-3.972.994.997-3.892-.248-.4A9.956 9.956 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z" /></svg>
                                    واتساب للترقية
                                </a>
                            </div>
                        )}
                    </div>
                    <Link href="/api/auth/signout" className="block w-full text-center py-2.5 text-red-600 bg-red-100/50 hover:bg-red-100 font-bold rounded-lg transition-colors border border-red-200">
                        تسجيل الخروج
                    </Link>
                </div>
            </aside>

            {/* Backdrop for mobile */}
            {isMobileOpen && (
                <div
                    className="fixed inset-0 bg-gray-900/50 z-30 md:hidden"
                    onClick={() => setIsMobileOpen(false)}
                />
            )}

            {/* Main Content */}
            <main className="flex-1 overflow-auto bg-gray-50 h-full pt-16 md:pt-0">
                <div className="p-4 md:p-8">
                    {children}
                </div>
            </main>

            {/* Global Background Music — persists across all navigations */}
            <BackgroundMusicPlayer />
        </div>
    );
}
