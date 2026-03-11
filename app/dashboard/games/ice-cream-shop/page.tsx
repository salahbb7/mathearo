'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Difficulty } from '@/lib/difficulty';
import confetti from 'canvas-confetti';
import { motion, AnimatePresence } from 'framer-motion';

const FLAVORS = [
    { id: 'strawberry', name: 'الفراولة', color: 'bg-pink-400', border: 'border-pink-600', icon: '🍓', shadow: 'shadow-pink-400/50' },
    { id: 'chocolate', name: 'الشوكولاتة', color: 'bg-amber-800', border: 'border-amber-950', icon: '🍫', shadow: 'shadow-amber-900/50' },
    { id: 'vanilla', name: 'الفانيليا', color: 'bg-amber-100', border: 'border-amber-300', icon: '🍦', shadow: 'shadow-amber-200/50' },
];

type QuestionType = 'count' | 'max' | 'min';

export default function IceCreamShopGamePage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const studentId = searchParams.get('studentId');
    const isTeacher = searchParams.get('teacher') === 'true';
    const difficulty = (searchParams.get('difficulty') || 'medium') as Difficulty;

    const [gameStarted, setGameStarted] = useState(false);
    const [studentName, setStudentName] = useState('');

    const [questionData, setQuestionData] = useState<{
        data: { flavor: typeof FLAVORS[0], count: number }[];
        type: QuestionType;
        targetFlavor?: typeof FLAVORS[0]; // For 'count' type
        questionText: string;
        options: { id: string; label: string | number; isCorrect: boolean }[];
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
    const MAX_COUNT = 10;

    useEffect(() => {
        fetch('/api/settings')
            .then((res) => res.json())
            .then((data) => setSettings(data))
            .catch((err) => console.error('Error loading settings:', err));
    }, []);

    const playSound = (url: string) => {
        if (url) {
            const audio = new Audio(url);
            audio.play().catch((err) => console.error('Error playing sound:', err));
        }
    };

    const generateQuestion = () => {
        // Generate unique counts for 3 flavors to ensure clear max/min
        let counts: number[] = [];
        while (counts.length < 3) {
            const c = Math.floor(Math.random() * (MAX_COUNT + 1));
            if (!counts.includes(c)) counts.push(c);
        }

        const data = FLAVORS.map((f, i) => ({
            flavor: f,
            count: counts[i]
        }));

        const type = ['count', 'max', 'min'][Math.floor(Math.random() * 3)] as QuestionType;
        let questionText = '';
        let options: { id: string; label: string | number; isCorrect: boolean }[] = [];

        if (type === 'count') {
            const targetFlavor = data[Math.floor(Math.random() * data.length)];
            questionText = `كم طفلاً يحب ${targetFlavor.flavor.name}؟`;

            const distractors = data.map(d => d.count).filter(c => c !== targetFlavor.count);
            // Add a random one if we need 2 distractors (we have 2 from other flavors)

            options = [
                { id: 'correct', label: targetFlavor.count, isCorrect: true },
                { id: 'd1', label: distractors[0], isCorrect: false },
                { id: 'd2', label: distractors[1], isCorrect: false }
            ];

            setQuestionData({ data, type, targetFlavor: targetFlavor.flavor, questionText, options });

        } else if (type === 'max') {
            questionText = `ما النكهة المفضلة لدى العدد الأكبر من الأطفال؟`;
            const maxVal = Math.max(...data.map(d => d.count));
            const correctFlavor = data.find(d => d.count === maxVal)!.flavor;

            options = data.map(d => ({
                id: d.flavor.id,
                label: d.flavor.name,
                isCorrect: d.count === maxVal
            }));

            setQuestionData({ data, type, questionText, options });

        } else if (type === 'min') {
            questionText = `ما النكهة الأقل تفضيلاً بين الأطفال؟`;
            const minVal = Math.min(...data.map(d => d.count));
            const correctFlavor = data.find(d => d.count === minVal)!.flavor;

            options = data.map(d => ({
                id: d.flavor.id,
                label: d.flavor.name,
                isCorrect: d.count === minVal
            }));

            setQuestionData({ data, type, questionText, options });
        }

        // Always shuffle options if they are numbers (for count).
        // For flavors (max/min), shuffling is also good.
        setQuestionData(prev => {
            if (!prev) return prev;
            const shuffledOptions = [...prev.options];
            for (let i = shuffledOptions.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [shuffledOptions[i], shuffledOptions[j]] = [shuffledOptions[j], shuffledOptions[i]];
            }
            return { ...prev, options: shuffledOptions };
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

    const checkAnswer = (option: { id: string; label: string | number; isCorrect: boolean }) => {
        if (feedback !== null) return;

        if (option.isCorrect) {
            setFeedback('correct');
            setScore(prev => prev + 1);
            playSound(settings.successSoundUrl);

            // Ice Cream Celebration
            const duration = 2000;
            const end = Date.now() + duration;

            (function frame() {
                confetti({
                    particleCount: 5,
                    angle: 90,
                    spread: 80,
                    origin: { x: 0.5, y: 0.8 },
                    colors: ['#f472b6', '#fef3c7', '#92400e', '#ffffff'],
                    shapes: ['circle'],
                    scalar: 1.2
                });

                if (Date.now() < end) {
                    requestAnimationFrame(frame);
                }
            }());

            setTimeout(() => {
                nextQuestion(true);
            }, 2500);
        } else {
            setFeedback('wrong');
            setShakeScreen(true);
            setShakeOptionId(option.id);
            playSound(settings.errorSoundUrl);

            setTimeout(() => {
                setShakeScreen(false);
                setShakeOptionId(null);
                setFeedback(null);
            }, 2000);
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
                        gameType: 'ice-cream-shop', // Match ID
                    }),
                });
            }

            router.push(`/results?score=${finalScore}&total=${totalQuestions}&time=${timeSpent}&gameId=ice-cream-shop${studentId ? `&studentId=${studentId}` : ''}`);
        } catch (error) {
            console.error('Error saving score:', error);
            alert('حدث خطأ في حفظ النتيجة');
        }
    };

    if (!gameStarted) {
        return (
            <div className="min-h-screen flex items-center justify-center p-4 bg-pink-50 relative overflow-hidden font-sans" dir="rtl">
                {/* Ice cream sprinkles background */}
                <div className="absolute inset-0 opacity-30 bg-[url('https://www.transparenttextures.com/patterns/candy-hole.png')] mix-blend-multiply pointer-events-none"></div>

                <div className="max-w-lg w-full relative z-10">
                    <div className="bg-white/95 backdrop-blur-md rounded-[3rem] shadow-[0_20px_60px_rgba(236,72,153,0.15)] p-8 text-center flex flex-col items-center border-[8px] border-pink-200">
                        <div className="mb-4 text-8xl drop-shadow-xl animate-[bounce_3s_ease-in-out_infinite]">
                            🍨
                        </div>
                        <h1 className="text-4xl sm:text-5xl font-black text-pink-600 mb-4 tracking-tight drop-shadow-sm">
                            متجر الآيس كريم
                        </h1>
                        <p className="text-xl text-pink-800 mb-8 font-bold leading-relaxed">
                            اقرأ الأعمدة البيانية وتعرف على نكهات الأطفال المفضلة! 🍦📊
                        </p>

                        <div className="mb-6 w-full">
                            <label htmlFor="name" className="block text-pink-900 font-bold mb-2 text-right">
                                اسم البائع الذكي:
                            </label>
                            <input
                                type="text"
                                id="name"
                                value={studentName}
                                onChange={(e) => setStudentName(e.target.value)}
                                className="w-full px-4 py-3 bg-pink-50 border-2 border-pink-300 rounded-xl focus:border-pink-500 focus:outline-none transition-all text-pink-900 placeholder-pink-400 text-center text-xl font-bold shadow-inner"
                                placeholder="اكتب اسمك هنا"
                                required
                            />
                        </div>

                        <button
                            onClick={startGame}
                            className="w-full bg-gradient-to-r from-pink-400 to-rose-500 hover:from-pink-500 hover:to-rose-600 text-white font-black text-2xl py-4 rounded-xl shadow-[0_6px_0_#be185d] active:shadow-[0_0px_0_#be185d] active:translate-y-2 transform transition-all border-2 border-pink-300/50 flex items-center justify-center gap-3"
                        >
                            <span>افتح المتجر!</span>
                            <span>🛎️</span>
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-teal-50 relative overflow-hidden font-sans" dir="rtl">
            {/* Soft Shop Background */}
            <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/candy-hole.png')] mix-blend-multiply pointer-events-none"></div>

            {/* Awning Decoration */}
            <div className="absolute top-0 w-full flex h-16 sm:h-20 shadow-md z-0">
                {Array.from({ length: 20 }).map((_, i) => (
                    <div key={i} className={`flex-1 h-full rounded-b-full ${i % 2 === 0 ? 'bg-pink-400' : 'bg-white'}`}></div>
                ))}
            </div>

            <div className="max-w-5xl w-full relative z-10 py-12 sm:py-16">
                <motion.div
                    animate={shakeScreen ? { x: [-15, 15, -15, 15, 0] } : {}}
                    transition={{ duration: 0.4 }}
                    className="bg-white border-[4px] border-pink-200 rounded-[3rem] shadow-[0_20px_60px_rgba(236,72,153,0.15)] p-6 sm:p-10 relative overflow-hidden"
                >
                    {/* Progress Header */}
                    <div className="mb-6 sm:mb-8">
                        <div className="flex justify-between items-center mb-4 text-center sm:text-right flex-col sm:flex-row gap-4">
                            <div className="order-2 sm:order-1 text-right flex-1 w-full">
                                <span className="block text-lg sm:text-lg font-bold text-pink-400 mb-1">
                                    الزبون رقم {questionNumber} من {totalQuestions}
                                </span>
                                <span className="block text-2xl font-black text-pink-600">
                                    المبيعات: {score} 🍧
                                </span>
                            </div>
                            <div className="order-1 sm:order-2 text-4xl sm:text-5xl drop-shadow bg-pink-100/50 p-4 rounded-full border-2 border-pink-200">
                                📊
                            </div>
                        </div>
                        <div className="w-full bg-teal-100 rounded-full h-3 overflow-hidden border border-teal-200">
                            <motion.div
                                className="bg-gradient-to-r from-pink-400 to-rose-400 h-full rounded-full relative"
                                initial={{ width: 0 }}
                                animate={{ width: `${(questionNumber / totalQuestions) * 100}%` }}
                                transition={{ duration: 0.5 }}
                            />
                        </div>
                    </div>

                    {questionData && (
                        <>
                            <div className="text-center mb-8">
                                <h2 className="text-2xl sm:text-3xl font-black text-slate-800 leading-tight mb-3">
                                    {questionData.questionText}
                                </h2>
                                {questionData.type === 'count' && (
                                    <span className="text-pink-600 text-lg block font-bold mt-2 bg-pink-50 px-4 py-1.5 rounded-full inline-block border border-pink-200">
                                        انظر إلى عمود "{questionData.targetFlavor?.name}" واقرأ الرقم الذي يقابله.
                                    </span>
                                )}
                            </div>

                            {/* Chart Area */}
                            <div className="bg-slate-50 border-2 border-slate-200 rounded-[2rem] p-6 sm:p-10 pt-6 pb-20 sm:pb-24 mb-8 max-w-2xl mx-auto shadow-inner">
                                <h3 className="text-center font-bold text-slate-500 mb-6 font-mono border-b-2 border-slate-200 pb-2 border-dashed">
                                    عدد الأطفال المفضّلين لكل نكهة
                                </h3>

                                <div className="relative h-60 sm:h-72 mt-8 px-4 sm:px-8 border-b-4 border-l-4 border-slate-400" dir="ltr">
                                    {/* Y-Axis Labels & Grid (0 to MAX_COUNT) */}
                                    {Array.from({ length: MAX_COUNT + 1 }).map((_, i) => {
                                        const bottomPercent = (i / MAX_COUNT) * 100;
                                        return (
                                            <div key={i} className="absolute w-full pointer-events-none" style={{ bottom: `${bottomPercent}%`, left: 0 }}>
                                                {/* Label */}
                                                <div className="absolute right-full w-10 pr-2 flex justify-end items-center bottom-0 translate-y-1/2">
                                                    <span className="text-sm font-bold text-slate-500">{i}</span>
                                                </div>
                                                {/* Grid Line */}
                                                {i > 0 && <div className="absolute w-full border-b border-slate-300 border-dashed opacity-60 bottom-0 z-0"></div>}
                                            </div>
                                        );
                                    })}

                                    {/* Bars Container */}
                                    <div className="absolute inset-x-0 bottom-0 top-0 flex items-end justify-around pl-2 sm:pl-6 pr-2 sm:pr-6 z-10">
                                        {questionData.data.map((d, index) => (
                                            <div key={index} className="relative flex flex-col justify-end items-center h-full w-full mx-2 sm:mx-6 group">
                                                {/* Bar itself */}
                                                <motion.div
                                                    className={`w-12 sm:w-16 ${d.flavor.color} border-t-4 border-x-4 ${d.flavor.border} rounded-t-xl transition-all shadow-[0_0_15px_rgba(0,0,0,0.1)] relative overflow-hidden`}
                                                    initial={{ height: 0 }}
                                                    animate={{ height: `${(d.count / MAX_COUNT) * 100}%` }}
                                                    transition={{ duration: 1, type: "spring", bounce: 0.3 }}
                                                >
                                                    {/* Bar shine effect */}
                                                    <div className="absolute top-0 right-0 w-2 h-full bg-white/20"></div>
                                                </motion.div>

                                                {/* X-Axis Label (Flavor) */}
                                                <div className="absolute top-[100%] pt-3 flex flex-col items-center space-y-1 w-24">
                                                    <span className="text-slate-600 font-bold text-xs sm:text-sm whitespace-nowrap bg-white px-3 py-1 rounded-full border border-slate-200 shadow-sm text-center">
                                                        {d.flavor.name}
                                                    </span>
                                                    <span className="text-2xl drop-shadow-sm">{d.flavor.icon}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Options Area (Buttons) */}
                            <div className="max-w-3xl mx-auto pt-8">
                                <div className="flex flex-col sm:flex-row flex-wrap justify-center gap-4 sm:gap-6 w-full">
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
                                                    border-2
                                                    ${shakeOptionId === option.id
                                                        ? 'bg-red-50 border-red-500 shadow-[0_8px_0_#ef4444] text-red-700'
                                                        : (feedback === 'correct' && option.isCorrect)
                                                            ? 'bg-green-50 border-green-500 shadow-[0_8px_0_#22c55e] text-green-700'
                                                            : 'bg-white border-slate-200 hover:border-pink-300 text-slate-700 shadow-[0_8px_0_#e2e8f0] hover:shadow-[0_8px_0_#fbcfe8]'
                                                    }
                                                `}
                                            >
                                                <span className={`text-3xl sm:text-4xl font-black ${typeof option.label === 'number' ? 'font-mono' : ''}`}>
                                                    {option.label}
                                                </span>
                                            </motion.button>
                                        ))}
                                    </AnimatePresence>
                                </div>
                            </div>

                            {/* Feedback Overlay Message */}
                            <div className="flex items-center justify-center mt-10">
                                <AnimatePresence mode="wait">
                                    {feedback === 'correct' && (
                                        <motion.div
                                            key="correct"
                                            initial={{ scale: 0.5, opacity: 0, y: 30 }}
                                            animate={{ scale: 1, opacity: 1, y: 0 }}
                                            exit={{ scale: 0.5, opacity: 0, y: -30 }}
                                            className="bg-green-100 border-4 border-green-500 text-green-800 px-6 py-4 rounded-[2rem] text-center shadow-xl flex items-center justify-center gap-4 z-30"
                                        >
                                            <span className="text-5xl drop-shadow-md animate-bounce">🍦</span>
                                            <p className="text-xl sm:text-2xl font-black drop-shadow-md">قراءة صحيحة للبيانات!</p>
                                        </motion.div>
                                    )}

                                    {feedback === 'wrong' && (
                                        <motion.div
                                            key="wrong"
                                            initial={{ scale: 0.8, opacity: 0 }}
                                            animate={{ scale: 1, opacity: 1 }}
                                            exit={{ scale: 0.8, opacity: 0 }}
                                            className="bg-red-100 border-4 border-red-500 text-red-800 px-6 py-4 rounded-[2rem] text-center shadow-xl flex items-center justify-center gap-4 z-30"
                                        >
                                            <span className="text-5xl drop-shadow-md">📉</span>
                                            <p className="text-xl sm:text-2xl font-black drop-shadow-md">تتبع العمود حتى تصل للرقم الصحيح!</p>
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
