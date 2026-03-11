'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';

export default function SignupPage() {
    const router = useRouter();
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        // Client-side validation
        if (password !== confirmPassword) {
            setError('كلمتا المرور غير متطابقتين');
            return;
        }
        if (password.length < 6) {
            setError('كلمة المرور يجب أن تكون 6 أحرف على الأقل');
            return;
        }

        setLoading(true);

        try {
            const res = await fetch('/api/signup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, email, password, confirmPassword }),
            });

            const data = await res.json();

            if (!res.ok) {
                setError(data.error || 'حدث خطأ أثناء إنشاء الحساب');
            } else {
                setSuccess(true);
                // Redirect to login after 2.5 seconds
                setTimeout(() => {
                    router.push('/login');
                }, 2500);
            }
        } catch {
            setError('حدث خطأ في الاتصال بالخادم. يرجى المحاولة مرة أخرى.');
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div className="min-h-screen flex items-center justify-center p-4" dir="rtl">
                <div className="max-w-md w-full">
                    <div className="bg-white/95 backdrop-blur-sm rounded-3xl shadow-2xl p-10 text-center">
                        <div className="text-7xl mb-6 animate-bounce">🎉</div>
                        <h2 className="text-2xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-green-500 to-emerald-600 mb-3">
                            تم إنشاء الحساب بنجاح!
                        </h2>
                        <p className="text-gray-600 mb-2">مرحباً بك في منصة أبطال الرياضيات</p>
                        <div className="bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-200 rounded-2xl p-4 mb-6 text-right">
                            <p className="text-sm text-gray-600 mb-2">
                                حسابك الآن على <strong className="text-slate-700">الباقة التجريبية 🧪</strong>.
                            </p>
                            <p className="text-sm text-gray-600 mb-3">
                                للترقية إلى <strong className="text-purple-700">الباقة الاحترافية 💎</strong> بسعر
                                <strong className="text-purple-700"> 3 ريال عُماني / شهرياً</strong>، تواصل معنا:
                            </p>
                            <a
                                href="https://wa.me/96871776166"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white text-sm font-bold px-4 py-2 rounded-xl transition-colors shadow"
                            >
                                <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" /><path d="M12 0C5.373 0 0 5.373 0 12c0 2.132.558 4.133 1.532 5.864L.057 23.664a.5.5 0 00.613.612l5.853-1.467A11.95 11.95 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.943 0-3.772-.528-5.339-1.444l-.383-.228-3.972.994.997-3.892-.248-.4A9.956 9.956 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z" /></svg>
                                واتساب: +968 71776166
                            </a>
                        </div>
                        <div className="flex items-center justify-center gap-2 text-indigo-500 text-sm">
                            <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                            </svg>
                            جاري تحويلك لصفحة تسجيل الدخول...
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center p-4" dir="rtl">
            <div className="max-w-md w-full">
                <div className="bg-white/95 backdrop-blur-sm rounded-3xl shadow-2xl p-8">
                    {/* Header */}
                    <div className="text-center mb-8 flex flex-col items-center">
                        <div className="mb-4 relative w-28 h-28">
                            <Image
                                src="/logo.png"
                                alt="شعار ابطال الرياضيات"
                                fill
                                className="object-contain"
                                priority
                            />
                        </div>
                        <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-600 mb-1">
                            إنشاء حساب جديد
                        </h1>
                        <p className="text-gray-500 text-sm">سجّل كمعلم وابدأ رحلتك مع أبطال الرياضيات</p>
                    </div>

                    {/* Error */}
                    {error && (
                        <div className="bg-red-50 border-r-4 border-red-500 text-red-700 p-4 rounded-lg mb-5 shake">
                            <p className="font-bold text-sm">❌ {error}</p>
                        </div>
                    )}

                    {/* Signup Form */}
                    <form onSubmit={handleSubmit} className="space-y-5">
                        {/* Name */}
                        <div>
                            <label htmlFor="signup-name" className="block text-gray-700 font-bold mb-1.5 text-sm">
                                الاسم الكامل
                            </label>
                            <div className="relative">
                                <span className="absolute inset-y-0 right-3 flex items-center text-gray-400 text-lg pointer-events-none">👤</span>
                                <input
                                    type="text"
                                    id="signup-name"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="w-full pr-10 pl-4 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:outline-none transition-colors text-gray-800 bg-gray-50 focus:bg-white"
                                    placeholder="محمد أحمد"
                                    required
                                    minLength={2}
                                    autoComplete="name"
                                />
                            </div>
                        </div>

                        {/* Email */}
                        <div>
                            <label htmlFor="signup-email" className="block text-gray-700 font-bold mb-1.5 text-sm">
                                البريد الإلكتروني
                            </label>
                            <div className="relative">
                                <span className="absolute inset-y-0 right-3 flex items-center text-gray-400 text-lg pointer-events-none">✉️</span>
                                <input
                                    type="email"
                                    id="signup-email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full pr-10 pl-4 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:outline-none transition-colors text-gray-800 bg-gray-50 focus:bg-white"
                                    placeholder="teacher@school.com"
                                    required
                                    dir="ltr"
                                    autoComplete="email"
                                />
                            </div>
                        </div>

                        {/* Password */}
                        <div>
                            <label htmlFor="signup-password" className="block text-gray-700 font-bold mb-1.5 text-sm">
                                كلمة المرور
                            </label>
                            <div className="relative">
                                <span className="absolute inset-y-0 right-3 flex items-center text-gray-400 text-lg pointer-events-none">🔒</span>
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    id="signup-password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full pr-10 pl-10 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:outline-none transition-colors text-gray-800 bg-gray-50 focus:bg-white"
                                    placeholder="6 أحرف على الأقل"
                                    required
                                    minLength={6}
                                    dir="ltr"
                                    autoComplete="new-password"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute inset-y-0 left-3 flex items-center text-gray-400 hover:text-purple-500 transition-colors text-sm"
                                    tabIndex={-1}
                                >
                                    {showPassword ? '🙈' : '👁️'}
                                </button>
                            </div>
                            {password.length > 0 && password.length < 6 && (
                                <p className="text-xs text-red-500 mt-1">كلمة المرور قصيرة جداً ({password.length}/6 أحرف)</p>
                            )}
                            {password.length >= 6 && (
                                <p className="text-xs text-green-500 mt-1">✅ كلمة المرور مقبولة</p>
                            )}
                        </div>

                        {/* Confirm Password */}
                        <div>
                            <label htmlFor="signup-confirm-password" className="block text-gray-700 font-bold mb-1.5 text-sm">
                                تأكيد كلمة المرور
                            </label>
                            <div className="relative">
                                <span className="absolute inset-y-0 right-3 flex items-center text-gray-400 text-lg pointer-events-none">🔑</span>
                                <input
                                    type={showConfirmPassword ? 'text' : 'password'}
                                    id="signup-confirm-password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className={`w-full pr-10 pl-10 py-3 border-2 rounded-xl focus:outline-none transition-colors text-gray-800 bg-gray-50 focus:bg-white ${confirmPassword.length > 0
                                        ? confirmPassword === password
                                            ? 'border-green-400 focus:border-green-500'
                                            : 'border-red-400 focus:border-red-500'
                                        : 'border-gray-200 focus:border-purple-500'
                                        }`}
                                    placeholder="أعد كتابة كلمة المرور"
                                    required
                                    dir="ltr"
                                    autoComplete="new-password"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                    className="absolute inset-y-0 left-3 flex items-center text-gray-400 hover:text-purple-500 transition-colors text-sm"
                                    tabIndex={-1}
                                >
                                    {showConfirmPassword ? '🙈' : '👁️'}
                                </button>
                            </div>
                            {confirmPassword.length > 0 && (
                                <p className={`text-xs mt-1 ${confirmPassword === password ? 'text-green-500' : 'text-red-500'}`}>
                                    {confirmPassword === password ? '✅ كلمتا المرور متطابقتان' : '❌ كلمتا المرور غير متطابقتين'}
                                </p>
                            )}
                        </div>

                        {/* Plan info */}
                        <div className="bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-xl p-3">
                            <p className="text-xs text-slate-600 text-center mb-1">
                                🧪 سيتم إنشاء حسابك على <strong>الباقة التجريبية</strong> مجاناً.
                            </p>
                            <p className="text-xs text-slate-500 text-center">
                                الترقية للباقة الاحترافية 💎 بـ <strong className="text-purple-700">3 ريال عُماني / شهر</strong> — تواصل عبر واتساب:{' '}
                                <a href="https://wa.me/96871776166" target="_blank" rel="noopener noreferrer" className="text-green-600 font-bold hover:underline" dir="ltr">+968 71776166</a>
                            </p>
                        </div>

                        {/* Submit */}
                        <button
                            type="submit"
                            disabled={loading}
                            id="signup-submit-btn"
                            className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-bold text-lg py-4 rounded-xl shadow-lg transform hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                        >
                            {loading ? (
                                <span className="flex items-center justify-center gap-2">
                                    <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                                    </svg>
                                    جاري إنشاء الحساب...
                                </span>
                            ) : '🚀 إنشاء الحساب'}
                        </button>
                    </form>

                    {/* Login link */}
                    <div className="mt-6 text-center space-y-3">
                        <p className="text-gray-500 text-sm">
                            لديك حساب بالفعل؟{' '}
                            <Link
                                href="/login"
                                className="text-purple-600 hover:text-purple-800 font-bold transition-colors"
                            >
                                سجّل الدخول
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
