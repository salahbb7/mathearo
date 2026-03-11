'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useEffect, Suspense } from 'react';
import confetti from 'canvas-confetti';
import { useSession } from 'next-auth/react';

function ResultsContent() {
    const { data: session } = useSession();
    const router = useRouter();
    const searchParams = useSearchParams();
    const score = parseInt(searchParams.get('score') || '0');
    const total = parseInt(searchParams.get('total') || '10');
    const time = parseInt(searchParams.get('time') || '0');
    const gameId = searchParams.get('gameId');
    const studentId = searchParams.get('studentId');

    const percentage = Math.round((score / total) * 100);

    useEffect(() => {
        if (percentage >= 70) {
            confetti({
                particleCount: 150,
                spread: 100,
                origin: { y: 0.6 },
            });
        }
    }, [percentage]);

    const getMessage = () => {
        if (percentage === 100) return { text: 'مذهل! أنت بطل حقيقي! 🏆', emoji: '🌟', color: 'from-yellow-400 to-orange-500' };
        if (percentage >= 80) return { text: 'ممتاز جداً! 🎉', emoji: '🎊', color: 'from-green-400 to-teal-500' };
        if (percentage >= 60) return { text: 'أحسنت! 👍', emoji: '😊', color: 'from-blue-400 to-cyan-500' };
        return { text: 'حاول مرة أخرى! 💪', emoji: '📚', color: 'from-purple-400 to-pink-500' };
    };

    const message = getMessage();

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return mins > 0 ? `${mins} دقيقة و ${secs} ثانية` : `${secs} ثانية`;
    };

    // Determine Play Again link
    const playAgainHref = gameId
        ? (gameId === 'game' ? '/game' : `/dashboard/games/${gameId}${studentId ? `?studentId=${studentId}` : ''}`)
        : '/game';

    // Determine Home link - if logged in as teacher/admin, go to dashboard
    const homeHref = session?.user?.role === 'teacher' || session?.user?.role === 'superadmin'
        ? '/dashboard/games'
        : '/';

    return (
        <div className="min-h-screen flex items-center justify-center p-4">
            <div className="max-w-2xl w-full">
                <div className="bg-white/95 backdrop-blur-sm rounded-3xl shadow-2xl p-8 text-center flex flex-col items-center">
                    {/* Logo */}
                    <div className="mb-4 relative w-32 h-32">
                        <Image
                            src="/logo.png"
                            alt="شعار"
                            fill
                            className="object-contain animate-bounce-slow"
                        />
                    </div>
                    {/* Emoji */}
                    <div className="text-8xl mb-6 animate-bounce">{message.emoji}</div>

                    {/* Title */}
                    <h1 className={`text-4xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r ${message.color} mb-4`}>
                        {message.text}
                    </h1>

                    {/* Score Circle */}
                    <div className="my-8">
                        <div className={`inline-block bg-gradient-to-br ${message.color} rounded-full p-2`}>
                            <div className="bg-white rounded-full w-48 h-48 flex items-center justify-center">
                                <div className="text-center">
                                    <div className="text-6xl font-extrabold text-gray-800">
                                        {percentage}%
                                    </div>
                                    <div className="text-lg text-gray-600 font-bold mt-2">
                                        {score} من {total}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Stats */}
                    <div className="grid md:grid-cols-2 gap-4 mb-8">
                        <div className="bg-gradient-to-br from-blue-100 to-blue-200 rounded-2xl p-6">
                            <div className="text-4xl mb-2">⏱️</div>
                            <div className="text-gray-700 font-bold">الوقت المستغرق</div>
                            <div className="text-2xl font-extrabold text-blue-700 mt-2">
                                {formatTime(time)}
                            </div>
                        </div>

                        <div className="bg-gradient-to-br from-green-100 to-green-200 rounded-2xl p-6">
                            <div className="text-4xl mb-2">✅</div>
                            <div className="text-gray-700 font-bold">الإجابات الصحيحة</div>
                            <div className="text-2xl font-extrabold text-green-700 mt-2">
                                {score} إجابة
                            </div>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <Link
                            href={playAgainHref}
                            className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-bold text-xl px-8 py-4 rounded-xl shadow-lg transform hover:scale-105 transition-all duration-200"
                        >
                            🔄 العب مرة أخرى
                        </Link>

                        <Link
                            href={homeHref}
                            className="bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 text-white font-bold text-xl px-8 py-4 rounded-xl shadow-lg transform hover:scale-105 transition-all duration-200"
                        >
                            🏠 {homeHref === '/dashboard/games' ? 'عودة للمكتبة' : 'الصفحة الرئيسية'}
                        </Link>
                    </div>

                    {/* Encouragement */}
                    <div className="mt-8 p-4 bg-yellow-50 rounded-xl border border-yellow-200">
                        <p className="text-yellow-800 font-bold">
                            {percentage >= 70
                                ? '🌟 استمر في التدريب لتصبح بطلاً في الرياضيات!'
                                : '💪 لا تستسلم! التدريب المستمر هو مفتاح النجاح!'}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function ResultsPage() {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center p-4 text-xl">جاري تحميل النتائج...</div>}>
            <ResultsContent />
        </Suspense>
    );
}
