'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';

export default function LoginPage() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const result = await signIn('credentials', {
                email,
                password,
                redirect: false,
            });

            if (result?.error) {
                setError(result.error);
            } else {
                router.push('/dashboard');
            }
        } catch (err) {
            setError('حدث خطأ أثناء تسجيل الدخول');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4">
            <div className="max-w-md w-full">
                <div className="bg-white/95 backdrop-blur-sm rounded-3xl shadow-2xl p-8">
                    {/* Header */}
                    <div className="text-center mb-8 flex flex-col items-center">
                        <div className="mb-4 relative w-32 h-32">
                            <Image
                                src="/logo.png"
                                alt="شعار ابطال الرياضيات"
                                fill
                                className="object-contain"
                                priority
                            />
                        </div>
                        <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-600 mb-2">
                            تسجيل دخول المعلم
                        </h1>
                        <p className="text-gray-600">
                            مرحباً بك في لوحة التحكم
                        </p>
                    </div>

                    {/* Login Form */}
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {error && (
                            <div className="bg-red-100 border-r-4 border-red-500 text-red-700 p-4 rounded-lg shake">
                                <p className="font-bold">❌ خطأ</p>
                                <p className="text-sm">{error}</p>
                            </div>
                        )}

                        <div>
                            <label htmlFor="email" className="block text-gray-700 font-bold mb-2">
                                البريد الإلكتروني
                            </label>
                            <input
                                type="email"
                                id="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-purple-500 focus:outline-none transition-colors text-gray-800"
                                placeholder="admin@school.com"
                                required
                                dir="ltr"
                            />
                        </div>

                        <div>
                            <label htmlFor="password" className="block text-gray-700 font-bold mb-2">
                                كلمة المرور
                            </label>
                            <input
                                type="password"
                                id="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-purple-500 focus:outline-none transition-colors text-gray-800"
                                placeholder="••••••••"
                                required
                                dir="ltr"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-bold text-lg py-4 rounded-xl shadow-lg transform hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? '⏳ جاري تسجيل الدخول...' : '🔐 تسجيل الدخول'}
                        </button>
                    </form>

                    {/* Links */}
                    <div className="mt-6 text-center space-y-3">
                        <p className="text-gray-500 text-sm">
                            ليس لديك حساب؟{' '}
                            <Link
                                href="/signup"
                                className="text-purple-600 hover:text-purple-800 font-bold transition-colors"
                            >
                                إنشاء حساب جديد
                            </Link>
                        </p>
                        <Link
                            href="/"
                            className="block text-gray-400 hover:text-gray-600 text-sm transition-colors"
                        >
                            ← العودة للصفحة الرئيسية
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
