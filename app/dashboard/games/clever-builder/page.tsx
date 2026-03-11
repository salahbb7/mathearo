'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Difficulty } from '@/lib/difficulty';
import confetti from 'canvas-confetti';
import { motion, AnimatePresence } from 'framer-motion';

const OBJECT_TYPES = [
    { name: 'لوح خشبي', bg: 'bg-amber-700', pattern: 'url("https://www.transparenttextures.com/patterns/wood-pattern.png")', border: 'border-amber-900', icon: '🪵' },
    { name: 'أنبوب معدني', bg: 'bg-slate-400', pattern: 'url("https://www.transparenttextures.com/patterns/brushed-alum.png")', border: 'border-slate-600', icon: '🪈' },
    { name: 'عارضة فولاذية', bg: 'bg-red-600', pattern: 'url("https://www.transparenttextures.com/patterns/carbon-fibre.png")', border: 'border-red-900', icon: '🏗️' },
    { name: 'حجر طوب', bg: 'bg-orange-800', pattern: 'url("https://www.transparenttextures.com/patterns/wall-4-light.png")', border: 'border-orange-950', icon: '🧱' },
];

export default function CleverBuilderGamePage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const studentId = searchParams.get('studentId');
    const isTeacher = searchParams.get('teacher') === 'true';
    const difficulty = (searchParams.get('difficulty') || 'medium') as Difficulty;

    const [gameStarted, setGameStarted] = useState(false);
    const [studentName, setStudentName] = useState('');

    const [questionData, setQuestionData] = useState<{
        length: number;
        objectType: typeof OBJECT_TYPES[0];
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
    const NUM_SEGMENTS = 15;

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
        const length = Math.floor(Math.random() * 13) + 3; // 3 to 15 cm
        const objectType = OBJECT_TYPES[Math.floor(Math.random() * OBJECT_TYPES.length)];

        const distractors = [
            length + 1,
            length > 1 ? length - 1 : length + 2,
            length + 2,
            length > 2 ? length - 2 : length + 3,
        ];

        const uniqueDistractors = [...new Set(distractors)].filter(d => d !== length && d > 0 && d <= NUM_SEGMENTS + 2);
        const selectedDistractors = uniqueDistractors.sort(() => 0.5 - Math.random()).slice(0, 2);

        const possibleAnswers = [
            { id: 'correct', value: length, isCorrect: true },
            { id: 'd1', value: selectedDistractors[0], isCorrect: false },
            { id: 'd2', value: selectedDistractors[1], isCorrect: false }
        ];

        // Shuffle options
        for (let i = possibleAnswers.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [possibleAnswers[i], possibleAnswers[j]] = [possibleAnswers[j], possibleAnswers[i]];
        }

        setQuestionData({
            length,
            objectType,
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

            // Construction Celebration
            const duration = 2500;
            const end = Date.now() + duration;

            (function frame() {
                confetti({
                    particleCount: 5,
                    angle: 60,
                    spread: 55,
                    origin: { x: 0 },
                    colors: ['#F59E0B', '#D97706', '#92400E'],
                    shapes: ['square'],
                });
                confetti({
                    particleCount: 5,
                    angle: 120,
                    spread: 55,
                    origin: { x: 1 },
                    colors: ['#F59E0B', '#D97706', '#92400E'],
                    shapes: ['square'],
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
                        gameType: 'clever-builder', // Match ID
                    }),
                });
            }

            router.push(`/results?score=${finalScore}&total=${totalQuestions}&time=${timeSpent}&gameId=clever-builder${studentId ? `&studentId=${studentId}` : ''}`);
        } catch (error) {
            console.error('Error saving score:', error);
            alert('حدث خطأ في حفظ النتيجة');
        }
    };

    const formatNumber = (num: number) => num.toLocaleString('en-US');

    if (!gameStarted) {
        return (
            <div className="min-h-screen flex items-center justify-center p-4 bg-orange-50 relative overflow-hidden font-sans" dir="rtl">
                {/* Construction Blueprint Background */}
                <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/blueprint.png')] mix-blend-multiply pointer-events-none filter sepia"></div>

                <div className="max-w-lg w-full relative z-10">
                    <div className="bg-white/95 backdrop-blur-md rounded-3xl shadow-[0_20px_60px_rgba(0,0,0,0.2)] p-8 text-center flex flex-col items-center border-[8px] border-amber-500 outline outline-4 outline-amber-700/20 outline-offset-4">
                        <div className="mb-4 text-8xl drop-shadow-xl transform -rotate-6">
                            👷
                        </div>
                        <h1 className="text-4xl sm:text-5xl font-black text-amber-900 mb-4 tracking-tight drop-shadow-sm">
                            البناء الماهر
                        </h1>
                        <p className="text-xl text-amber-800 mb-8 font-bold leading-relaxed">
                            استخدم المسطرة لقياس القطع بدقة قبل بنائها! 📏🏗️
                        </p>

                        <div className="mb-6 w-full">
                            <label htmlFor="name" className="block text-amber-900 font-bold mb-2 text-right">
                                اسم المهندس:
                            </label>
                            <input
                                type="text"
                                id="name"
                                value={studentName}
                                onChange={(e) => setStudentName(e.target.value)}
                                className="w-full px-4 py-3 bg-amber-50 border-2 border-amber-300 rounded-xl focus:border-amber-600 focus:outline-none transition-all text-amber-900 placeholder-amber-500 text-center text-xl font-bold shadow-inner"
                                placeholder="اكتب اسمك هنا"
                                required
                            />
                        </div>

                        <button
                            onClick={startGame}
                            className="w-full bg-gradient-to-b from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-white font-black text-2xl py-4 rounded-xl shadow-[0_6px_0_#92400e] active:shadow-[0_0px_0_#92400e] active:translate-y-2 transform transition-all border-2 border-amber-700 flex items-center justify-center gap-3"
                        >
                            <span>البس الخوذة وابدأ!</span>
                            <span>🦺</span>
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-sky-100 relative overflow-hidden font-sans" dir="rtl">
            {/* Blueprint Grid Background */}
            <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/blueprint.png')] mix-blend-multiply pointer-events-none filter hue-rotate-180"></div>

            {/* Construction Site Floor */}
            <div className="absolute bottom-0 w-full h-[30%] bg-stone-300 rounded-t-[30%] shadow-[inset_0_15px_40px_rgba(0,0,0,0.1)] border-t-[8px] border-stone-400">
                <div className="absolute inset-0 opacity-50 bg-[url('https://www.transparenttextures.com/patterns/concrete-wall.png')] mix-blend-multiply"></div>
            </div>

            <div className="max-w-5xl w-full relative z-10 py-10">
                <motion.div
                    animate={shakeScreen ? { x: [-10, 10, -10, 10, 0] } : {}}
                    transition={{ duration: 0.4 }}
                    className="bg-white/95 backdrop-blur-md border-[6px] border-stone-400 rounded-[2.5rem] shadow-[0_20px_60px_rgba(0,0,0,0.2)] p-6 sm:p-10 relative overflow-hidden"
                >
                    {/* Progress Header */}
                    <div className="mb-6 sm:mb-8">
                        <div className="flex justify-between items-center mb-4 text-center sm:text-right flex-col sm:flex-row gap-4">
                            <div className="order-2 sm:order-1 text-right flex-1 w-full">
                                <span className="block text-lg sm:text-lg font-bold text-stone-600 mb-1">
                                    القطعة رقم {questionNumber} من {totalQuestions}
                                </span>
                                <span className="block text-2xl font-black text-amber-600">
                                    المشاريع الناجحة: {score} 🌟
                                </span>
                            </div>
                            <div className="order-1 sm:order-2 text-4xl sm:text-5xl drop-shadow bg-stone-100 p-4 rounded-3xl border-2 border-stone-300">
                                🏗️
                            </div>
                        </div>
                        <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden border border-slate-300">
                            <motion.div
                                className="bg-gradient-to-r from-amber-400 to-yellow-500 h-full rounded-full relative"
                                initial={{ width: 0 }}
                                animate={{ width: `${(questionNumber / totalQuestions) * 100}%` }}
                                transition={{ duration: 0.5 }}
                            >
                                <div className="absolute inset-0 bg-white/20 animate-[pulse_2s_ease-in-out_infinite]"></div>
                            </motion.div>
                        </div>
                    </div>

                    {questionData && (
                        <>
                            <div className="text-center mb-10">
                                <h2 className="text-2xl sm:text-3xl font-black text-stone-800 leading-tight mb-3">
                                    كم سنتيمتراً يبلغ طول {questionData.objectType.name}؟
                                </h2>
                                <span className="text-stone-600 text-xl block font-bold mt-2">
                                    اقرأ الرقم عند نهاية القطعة على المسطرة.
                                </span>
                            </div>

                            {/* Measuring Area */}
                            <div className="flex flex-col items-center justify-center mb-16 relative w-full pt-12 pb-8">

                                {/* Container for Object and Ruler */}
                                <div className="w-full relative px-6 sm:px-12">

                                    {/* The Object to measure */}
                                    <div className="relative w-full h-16 sm:h-20 mb-2" dir="rtl">
                                        <motion.div
                                            className={`absolute top-0 right-0 h-full ${questionData.objectType.bg} rounded-l-md border-b-[6px] ${questionData.objectType.border} shadow-[0_10px_15px_rgba(0,0,0,0.2)] flex items-center justify-start pr-4 overflow-hidden origin-right`}
                                            style={{
                                                backgroundImage: questionData.objectType.pattern,
                                                backgroundBlendMode: 'multiply'
                                            }}
                                            initial={{ scaleX: 0 }}
                                            animate={{ scaleX: 1, width: `${(questionData.length / NUM_SEGMENTS) * 100}%` }}
                                            transition={{ duration: 0.6, type: 'spring', bounce: 0.4 }}
                                        >
                                            <span className="text-4xl drop-shadow-md opacity-80" style={{ transform: 'rotate(90deg)' }}>
                                                {questionData.objectType.icon}
                                            </span>

                                            {/* Edge highlight */}
                                            <div className="absolute left-0 top-0 w-1 h-full bg-white/40"></div>
                                        </motion.div>

                                        {/* Guide line descending from object end */}
                                        <AnimatePresence>
                                            {feedback !== null && (
                                                <motion.div
                                                    initial={{ height: 0, opacity: 0 }}
                                                    animate={{ height: 60, opacity: 1 }}
                                                    className={`absolute bottom-[-40px] w-1 border-l-4 ${feedback === 'correct' ? 'border-green-500' : 'border-red-500'} border-dashed z-30`}
                                                    style={{ right: `${(questionData.length / NUM_SEGMENTS) * 100}%`, transform: 'translateX(50%)' }}
                                                />
                                            )}
                                        </AnimatePresence>
                                    </div>

                                    {/* The Ruler */}
                                    <div className="w-full h-20 sm:h-24 bg-yellow-300 rounded-lg shadow-[0_10px_20px_rgba(0,0,0,0.15)] border-t-[8px] border-yellow-200 border-b-[8px] border-yellow-500 relative flex overflow-hidden" dir="rtl">
                                        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/wood-pattern.png')] mix-blend-multiply opacity-20"></div>

                                        {Array.from({ length: NUM_SEGMENTS + 1 }).map((_, i) => (
                                            <div
                                                key={i}
                                                className="absolute top-0 h-full flex flex-col justify-between items-center z-10"
                                                style={{ right: `${(i / NUM_SEGMENTS) * 100}%`, transform: 'translateX(50%)' }}
                                            >
                                                {/* Top Tick marks */}
                                                <div className={`w-[2px] bg-yellow-800/80 ${i % 5 === 0 ? 'h-6 sm:h-8 w-[3px]' : 'h-3 sm:h-4'}`}></div>

                                                {/* Numbers */}
                                                <span className={`font-mono font-black text-yellow-900 drop-shadow-sm pb-1 ${i % 5 === 0 ? 'text-xl sm:text-2xl' : 'text-sm sm:text-base opacity-50'}`} dir="ltr">
                                                    {i}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="w-full text-right mt-2 font-bold text-stone-500">سنتيمتر (سم)</div>
                                </div>
                            </div>

                            {/* Options Area (Buttons) */}
                            <div className="bg-stone-800 p-6 sm:p-8 rounded-[2rem] shadow-inner border-[6px] border-stone-700 max-w-4xl mx-auto relative overflow-hidden">
                                {/* Diagonal hazard stripes */}
                                <div className="absolute top-0 inset-x-0 h-3 bg-[repeating-linear-gradient(45deg,#fbbf24,#fbbf24_10px,#000_10px,#000_20px)] opacity-80"></div>
                                <div className="absolute bottom-0 inset-x-0 h-3 bg-[repeating-linear-gradient(45deg,#fbbf24,#fbbf24_10px,#000_10px,#000_20px)] opacity-80"></div>

                                <h3 className="text-amber-300 text-center font-bold mb-6 mt-4 text-lg">اختر الطول الصحيح للقطعة:</h3>

                                <div className="flex flex-col sm:flex-row flex-wrap justify-center gap-4 sm:gap-6 w-full" dir="ltr">
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
                                                    flex items-center justify-center transition-all disabled:opacity-90 outline outline-2 outline-black/40
                                                    border-t border-white/20
                                                    ${shakeOptionId === option.id
                                                        ? 'bg-red-600 shadow-[0_8px_0_#991b1b] text-white'
                                                        : (feedback === 'correct' && option.isCorrect)
                                                            ? 'bg-green-600 shadow-[0_8px_0_#166534] text-white'
                                                            : 'bg-stone-300 hover:bg-white text-stone-900 shadow-[0_8px_0_#78716c]'
                                                    }
                                                `}
                                            >
                                                {/* Screws design on buttons */}
                                                <div className="absolute top-2 left-2 w-2 h-2 rounded-full bg-stone-500 shadow-inner"></div>
                                                <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-stone-500 shadow-inner"></div>
                                                <div className="absolute bottom-2 left-2 w-2 h-2 rounded-full bg-stone-500 shadow-inner"></div>
                                                <div className="absolute bottom-2 right-2 w-2 h-2 rounded-full bg-stone-500 shadow-inner"></div>

                                                <div className="flex items-baseline gap-2 z-10">
                                                    <span className="text-4xl sm:text-5xl font-black tracking-widest drop-shadow-[0_2px_2px_rgba(255,255,255,0.8)] font-mono" dir="ltr">
                                                        {formatNumber(option.value)}
                                                    </span>
                                                    <span className="text-xl font-bold opacity-70">سم</span>
                                                </div>
                                            </motion.button>
                                        ))}
                                    </AnimatePresence>
                                </div>
                            </div>

                            {/* Feedback Overlay Message */}
                            <div className="h-20 sm:h-24 flex items-center justify-center mt-6">
                                <AnimatePresence mode="wait">
                                    {feedback === 'correct' && (
                                        <motion.div
                                            key="correct"
                                            initial={{ scale: 0.5, opacity: 0, y: 30 }}
                                            animate={{ scale: 1, opacity: 1, y: 0 }}
                                            exit={{ scale: 0.5, opacity: 0, y: -30 }}
                                            className="bg-green-100 border-4 border-green-500 text-green-800 px-6 py-4 rounded-[2rem] text-center shadow-[0_10px_30px_rgba(34,197,94,0.4)] flex items-center justify-center gap-4 z-30"
                                        >
                                            <span className="text-5xl drop-shadow-md">👷</span>
                                            <p className="text-xl sm:text-2xl font-black drop-shadow-md">قياس دقيق أيها المهندس! 🏗️</p>
                                        </motion.div>
                                    )}

                                    {feedback === 'wrong' && (
                                        <motion.div
                                            key="wrong"
                                            initial={{ scale: 0.8, opacity: 0 }}
                                            animate={{ scale: 1, opacity: 1 }}
                                            exit={{ scale: 0.8, opacity: 0 }}
                                            className="bg-red-100 border-4 border-red-500 text-red-800 px-6 py-4 rounded-[2rem] text-center shadow-[0_10px_30px_rgba(239,68,68,0.4)] flex items-center justify-center gap-4 z-30"
                                        >
                                            <span className="text-5xl drop-shadow-md">👀</span>
                                            <p className="text-xl sm:text-2xl font-black drop-shadow-md">انظر إلى نهاية القطعة بتركيز!</p>
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
