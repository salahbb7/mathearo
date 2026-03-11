'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Difficulty } from '@/lib/difficulty';
import confetti from 'canvas-confetti';
import { motion, AnimatePresence } from 'framer-motion';

const toys = [
    { emoji: '🧸', name: 'دبدوب' },
    { emoji: '🚗', name: 'سيارة سباق' },
    { emoji: '⚽', name: 'كرة قدم' },
    { emoji: '🤖', name: 'روبوت' },
    { emoji: '🚂', name: 'قطار' },
    { emoji: '🚁', name: 'طائرة مروحية' },
    { emoji: '🎨', name: 'علبة ألوان' },
    { emoji: '📚', name: 'قصة مصورة' },
];

export default function HeroesMarketGamePage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const studentId = searchParams.get('studentId');
    const isTeacher = searchParams.get('teacher') === 'true';
    const difficulty = (searchParams.get('difficulty') || 'medium') as Difficulty;

    const [gameStarted, setGameStarted] = useState(false);
    const [studentName, setStudentName] = useState('');

    const [questionData, setQuestionData] = useState<{
        price: number;
        paid: number;
        toy: { emoji: string; name: string };
        options: { id: string; value: number; isCorrect: boolean }[];
    } | null>(null);

    const [score, setScore] = useState(0);
    const [questionNumber, setQuestionNumber] = useState(0);
    const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
    const [shakeScreen, setShakeScreen] = useState(false);
    const [startTime, setStartTime] = useState<number>(0);
    const [shakeOptionId, setShakeOptionId] = useState<string | null>(null);

    const [settings, setSettings] = useState({
        successSoundUrl: '',
        errorSoundUrl: '',
        backgroundMusicUrl: '',
    });

    const totalQuestions = 10;

    useEffect(() => {
        fetch('/api/settings')
            .then((res) => res.json())
            .then((data: unknown) => setSettings(data as Parameters<typeof setSettings>[0]))
            .catch((err) => console.error('Error loading settings:', err));
    }, []);

    const playSound = (url: string) => {
        if (url) {
            const audio = new Audio(url);
            audio.play().catch((err) => console.error('Error playing sound:', err));
        }
    };

    const generateQuestion = () => {
        // Price range scales with difficulty: easy 5-20, medium 15-95, hard 15-195
        const priceRange = difficulty === 'easy' ? { range: 16, min: 5 } : difficulty === 'hard' ? { range: 181, min: 15 } : { range: 81, min: 15 };
        const price = Math.floor(Math.random() * priceRange.range) + priceRange.min;

        // Paid amount based on price and difficulty
        let paid: number;
        if (difficulty === 'hard') {
            paid = price < 100 ? 100 : 200;
        } else if (difficulty === 'easy') {
            paid = price < 10 ? 10 : 20;
        } else {
            if (price < 20) paid = 20;
            else if (price < 50) paid = 50;
            else paid = 100;
            // Sometimes just give 100 anyway for harder change calculation
            if (Math.random() > 0.5) paid = 100;
        }

        const correctChange = paid - price;

        // Generate distractors
        const distractors = [
            correctChange + 10,
            correctChange > 10 ? correctChange - 10 : correctChange + 20,
            correctChange + 5,
            correctChange > 5 ? correctChange - 5 : correctChange + 15,
            (Math.floor(correctChange / 10) + 1) * 10 + (correctChange % 10) // mix up tens digit
        ];

        const uniqueDistractors = [...new Set(distractors)].filter(d => d !== correctChange && d > 0);
        const selectedDistractors = uniqueDistractors.sort(() => 0.5 - Math.random()).slice(0, 2);

        const possibleAnswers = [
            { id: 'correct', value: correctChange, isCorrect: true },
            { id: 'd1', value: selectedDistractors[0], isCorrect: false },
            { id: 'd2', value: selectedDistractors[1], isCorrect: false }
        ];

        // Shuffle options
        for (let i = possibleAnswers.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [possibleAnswers[i], possibleAnswers[j]] = [possibleAnswers[j], possibleAnswers[i]];
        }

        const randomToy = toys[Math.floor(Math.random() * toys.length)];

        setQuestionData({
            price,
            paid,
            toy: randomToy,
            options: possibleAnswers,
        });
        setShakeOptionId(null);
    };

    const startGame = () => {
        if (!studentName.trim() && !studentId && !isTeacher) {
            alert('يرجى إدخال اسمك أولاً');
            return;
        }
        setGameStarted(true);
        setScore(0);
        setQuestionNumber(1);
        setStartTime(Date.now());
        generateQuestion();
    };

    useEffect(() => {
        if ((studentId || isTeacher) && !gameStarted) {
            setGameStarted(true);
            setScore(0);
            setQuestionNumber(1);
            setStartTime(Date.now());
            generateQuestion();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [studentId, isTeacher, gameStarted]);

    const checkAnswer = (option: { id: string; value: number; isCorrect: boolean }) => {
        if (feedback !== null) return;

        if (option.isCorrect) {
            setFeedback('correct');
            setScore(prev => prev + 1);
            playSound(settings.successSoundUrl);

            // Coins falling animation
            const duration = 2000;
            const end = Date.now() + duration;

            (function frame() {
                confetti({
                    particleCount: 3,
                    angle: 270,
                    spread: 60,
                    origin: { x: Math.random(), y: 0 },
                    colors: ['#FDE047', '#EAB308', '#CA8A04'],
                    shapes: ['circle'], // like coins
                });

                if (Date.now() < end) {
                    requestAnimationFrame(frame);
                }
            }());

            setTimeout(() => {
                nextQuestion(true);
            }, 3000);
        } else {
            setFeedback('wrong');
            setShakeScreen(true);
            setShakeOptionId(option.id);
            playSound(settings.errorSoundUrl);

            setTimeout(() => {
                setShakeScreen(false);
                setShakeOptionId(null);
                setFeedback(null);
            }, 1000);
        }
    };

    const nextQuestion = (wasCorrect: boolean) => {
        setFeedback(null);

        if (questionNumber >= totalQuestions) {
            finishGame(wasCorrect);
        } else {
            setQuestionNumber(prev => prev + 1);
            generateQuestion();
        }
    };

    const finishGame = async (wasCorrect: boolean) => {
        const timeSpent = Math.floor((Date.now() - startTime) / 1000);
        const finalScore = wasCorrect ? score + 1 : score;

        try {
            if (!isTeacher) {
                await fetch('/api/scores', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        studentName: studentName || 'Student',
                        studentId: studentId || undefined,
                        score: finalScore,
                        totalQuestions,
                        timeSpent,
                        gameType: 'heroes-market',
                    }),
                });
            }

            router.push(`/results?score=${finalScore}&total=${totalQuestions}&time=${timeSpent}&gameId=heroes-market${studentId ? `&studentId=${studentId}` : ''}`);
        } catch (error) {
            console.error('Error saving score:', error);
            alert('حدث خطأ في حفظ النتيجة');
        }
    };

    // Helper to format number
    const formatNumber = (num: number) => {
        return num.toLocaleString('en-US');
    };

    if (!gameStarted) {
        return (
            <div className="min-h-screen flex items-center justify-center p-4 bg-emerald-50 relative overflow-hidden" dir="rtl">
                {/* Decorative Background */}
                <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cartographer.png')]"></div>

                <div className="max-w-lg w-full relative z-10">
                    <div className="bg-white/95 backdrop-blur-md rounded-3xl shadow-2xl p-8 text-center flex flex-col items-center border-[6px] border-emerald-400">
                        <div className="mb-4 text-8xl drop-shadow-lg transform -rotate-12">
                            🛒
                        </div>
                        <h1 className="text-4xl sm:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-teal-500 mb-4 tracking-tight">
                            سوق الأبطال
                        </h1>
                        <p className="text-xl text-slate-700 mb-8 font-bold leading-relaxed">
                            احسب الباقي وكن أمهر بائع في السوق! 🏪💵
                        </p>

                        <div className="mb-6 w-full">
                            <label htmlFor="name" className="block text-slate-700 font-bold mb-2 text-right">
                                اسم أمين الصندوق:
                            </label>
                            <input
                                type="text"
                                id="name"
                                value={studentName}
                                onChange={(e) => setStudentName(e.target.value)}
                                className="w-full px-4 py-3 bg-emerald-50 border-2 border-emerald-300 rounded-xl focus:border-teal-500 focus:bg-white focus:outline-none transition-all text-slate-800 placeholder-emerald-700/50 text-center text-xl font-bold shadow-inner"
                                placeholder="اكتب اسمك هنا"
                                required
                            />
                        </div>

                        <button
                            onClick={startGame}
                            className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-black text-2xl py-4 rounded-xl shadow-[0_6px_0_#047857] active:shadow-[0_0px_0_#047857] active:translate-y-2 transform transition-all flex items-center justify-center gap-3"
                        >
                            <span>افتح المتجر</span>
                            <span>🔑</span>
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-emerald-50 relative overflow-hidden" dir="rtl">
            {/* Supermarket Shelves Background */}
            <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cartographer.png')]"></div>

            <div className="max-w-5xl w-full relative z-10 py-10">
                <motion.div
                    animate={shakeScreen ? { x: [-10, 10, -10, 10, 0] } : {}}
                    transition={{ duration: 0.4 }}
                    className="bg-white/95 backdrop-blur-md border border-emerald-100 rounded-[2.5rem] shadow-[0_20px_60px_rgba(0,0,0,0.1)] p-6 sm:p-10 relative"
                >
                    {/* Progress indicator */}
                    <div className="mb-6 sm:mb-10">
                        <div className="flex justify-between items-center mb-4 text-center sm:text-right flex-col sm:flex-row gap-4">
                            <div className="order-2 sm:order-1 text-right flex-1 w-full">
                                <span className="block text-lg sm:text-lg font-bold text-slate-500 mb-1">
                                    الزبون رقم {questionNumber} من {totalQuestions}
                                </span>
                                <span className="block text-2xl font-black text-emerald-600">
                                    حاسبة الصندوق: {score} 🌟
                                </span>
                            </div>
                            <div className="order-1 sm:order-2 text-4xl sm:text-5xl drop-shadow bg-emerald-50 p-4 rounded-3xl border border-emerald-100">
                                🏪
                            </div>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                            <motion.div
                                className="bg-gradient-to-r from-emerald-400 to-teal-500 h-full rounded-full"
                                initial={{ width: 0 }}
                                animate={{ width: `${(questionNumber / totalQuestions) * 100}%` }}
                                transition={{ duration: 0.5 }}
                            />
                        </div>
                    </div>

                    {questionData && (
                        <>
                            <div className="text-center mb-10">
                                <h2 className="text-2xl sm:text-3xl font-black text-slate-800 leading-tight mb-2">
                                    ثمن {questionData.toy.name} <span className="text-emerald-600" dir="ltr">{formatNumber(questionData.price)}</span> فلس.
                                    دفعت <span className="text-emerald-600" dir="ltr">{formatNumber(questionData.paid)}</span> فلس.
                                </h2>
                                <span className="text-slate-500 text-xl block font-bold mt-2">
                                    كم سيعيد لك البائع؟ (الباقي)
                                </span>
                            </div>

                            {/* Store Shelf UI */}
                            <div className="flex flex-col md:flex-row items-center justify-center gap-8 mb-12">
                                {/* Item on shelf */}
                                <div className="relative">
                                    <div className="bg-amber-100/50 p-8 rounded-[2rem] border-4 border-amber-200 shadow-inner flex items-center justify-center min-w-[200px] h-[200px]">
                                        <span className="text-8xl drop-shadow-xl filter hover:brightness-110 transition-all transform hover:scale-105">
                                            {questionData.toy.emoji}
                                        </span>
                                    </div>
                                    {/* Price tag */}
                                    <div className="absolute -bottom-6 -right-6 bg-red-500 text-white font-black text-3xl px-6 py-3 rounded-tr-3xl rounded-bl-3xl rounded-tl-md rounded-br-md shadow-lg transform -rotate-12 border-4 border-white z-10">
                                        <span dir="ltr">{formatNumber(questionData.price)}</span>
                                    </div>
                                </div>

                                <div className="text-5xl font-black text-slate-300">➖</div>

                                {/* Paid amount (Wallet/Hand) */}
                                <div className="relative">
                                    <div className="bg-emerald-50 p-8 rounded-[2rem] border-4 border-emerald-200 shadow-inner flex flex-col items-center justify-center min-w-[200px] h-[200px] gap-2">
                                        <span className="text-7xl drop-shadow-md">
                                            💵
                                        </span>
                                        <span className="text-4xl font-black text-emerald-600 drop-shadow-sm" dir="ltr">
                                            {formatNumber(questionData.paid)}
                                        </span>
                                        <span className="text-emerald-700 font-bold">دفع الزبون</span>
                                    </div>
                                </div>
                            </div>

                            {/* Register Machine Options (Cash Register Keys) */}
                            <div className="bg-slate-800 p-6 sm:p-8 rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.2)] border-t-[12px] border-slate-700 max-w-4xl mx-auto relative overflow-hidden">
                                {/* Cash Register details */}
                                <div className="absolute top-4 left-6 right-6 h-8 bg-slate-900 rounded-full opacity-50"></div>

                                <h3 className="text-slate-300 text-center font-bold mb-6 mt-8">اضغط على زر المبلغ المتبقي:</h3>

                                <div className="flex flex-col sm:flex-row flex-wrap justify-center gap-4 sm:gap-6 relative z-10 w-full" dir="ltr">
                                    <AnimatePresence>
                                        {questionData.options.map((option) => (
                                            <motion.button
                                                key={option.id}
                                                whileHover={{ scale: 1.05, y: -5 }}
                                                whileTap={{ scale: 0.95 }}
                                                animate={shakeOptionId === option.id ? { x: [-10, 10, -10, 10, 0] } : {}}
                                                onClick={() => checkAnswer(option)}
                                                disabled={feedback !== null}
                                                className={`
                                                    flex-1 min-w-[140px] h-20 sm:h-24 rounded-2xl relative
                                                    flex items-center justify-center transition-all disabled:opacity-90
                                                    shadow-[0_8px_0_rgba(0,0,0,0.3)] active:shadow-[0_0px_0_rgba(0,0,0,0.3)] active:translate-y-2
                                                    border-t border-white/20
                                                    ${shakeOptionId === option.id
                                                        ? 'bg-red-500 text-white shadow-[0_8px_0_#991b1b]'
                                                        : (feedback === 'correct' && option.isCorrect)
                                                            ? 'bg-emerald-500 text-white shadow-[0_8px_0_#047857]'
                                                            : 'bg-slate-200 hover:bg-white text-slate-800 shadow-[0_8px_0_#64748b]'
                                                    }
                                                `}
                                            >
                                                <span className="text-4xl sm:text-5xl font-black font-mono tracking-tight drop-shadow-sm" dir="ltr">
                                                    {formatNumber(option.value)}
                                                </span>
                                            </motion.button>
                                        ))}
                                    </AnimatePresence>
                                </div>
                            </div>

                            {/* Feedback Overlay Message */}
                            <div className="h-16 sm:h-24 flex items-center justify-center mt-6">
                                <AnimatePresence mode="wait">
                                    {feedback === 'correct' && (
                                        <motion.div
                                            key="correct"
                                            initial={{ scale: 0.5, opacity: 0, y: 30 }}
                                            animate={{ scale: 1, opacity: 1, y: 0 }}
                                            exit={{ scale: 0.5, opacity: 0, y: -30 }}
                                            className="bg-emerald-100 border-4 border-emerald-400 text-emerald-700 px-6 py-4 rounded-[2rem] text-center shadow-xl w-full max-w-xl flex items-center justify-center gap-4"
                                        >
                                            <span className="text-4xl">💰</span>
                                            <p className="text-xl sm:text-2xl font-black">حساب دقيق أيها التاجر الصغير!</p>
                                        </motion.div>
                                    )}

                                    {feedback === 'wrong' && (
                                        <motion.div
                                            key="wrong"
                                            initial={{ scale: 0.8, opacity: 0 }}
                                            animate={{ scale: 1, opacity: 1 }}
                                            exit={{ scale: 0.8, opacity: 0 }}
                                            className="bg-red-100 border-4 border-red-400 text-red-700 px-6 py-4 rounded-[2rem] text-center shadow-xl w-full max-w-xl flex items-center justify-center gap-4"
                                        >
                                            <span className="text-4xl">🤔</span>
                                            <p className="text-xl sm:text-2xl font-black">احسب الباقي بدقة أكبر!</p>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </>
                    )}
                </motion.div>
            </div>
        </div>
    );
}
