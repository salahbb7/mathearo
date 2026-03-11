'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Difficulty } from '@/lib/difficulty';
import confetti from 'canvas-confetti';
import { motion, AnimatePresence } from 'framer-motion';

export default function DivisionPiratesGamePage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const studentId = searchParams.get('studentId');
    const isTeacher = searchParams.get('teacher') === 'true';
    const difficulty = (searchParams.get('difficulty') || 'medium') as Difficulty;
    // Chest and coin ranges scale with difficulty
    const maxChests = difficulty === 'easy' ? 3 : difficulty === 'hard' ? 8 : 5;
    const maxCoins = difficulty === 'easy' ? 5 : difficulty === 'hard' ? 15 : 10;

    const [gameStarted, setGameStarted] = useState(false);
    const [studentName, setStudentName] = useState('');

    const [questionData, setQuestionData] = useState<{
        totalCoins: number;
        chests: number;
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
        const chestsCount = Math.floor(Math.random() * (maxChests - 1)) + 2;
        const coinsPerChest = Math.floor(Math.random() * (maxCoins - 1)) + 2;
        const totalCoins = chestsCount * coinsPerChest;

        const correct = coinsPerChest;

        const distractors = [
            correct + 1,
            correct > 1 ? correct - 1 : correct + 2,
            correct + 2,
            correct > 2 ? correct - 2 : correct + 3,
            ((chestsCount + 1) * coinsPerChest) / chestsCount // tricky math
        ].map(Math.floor);

        const uniqueDistractors = [...new Set(distractors)].filter(d => d !== correct && d > 0);
        const selectedDistractors = uniqueDistractors.sort(() => 0.5 - Math.random()).slice(0, 2);

        const possibleAnswers = [
            { id: 'correct', value: correct, isCorrect: true },
            { id: 'd1', value: selectedDistractors[0], isCorrect: false },
            { id: 'd2', value: selectedDistractors[1], isCorrect: false }
        ];

        // Shuffle options
        for (let i = possibleAnswers.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [possibleAnswers[i], possibleAnswers[j]] = [possibleAnswers[j], possibleAnswers[i]];
        }

        setQuestionData({
            totalCoins,
            chests: chestsCount,
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

            // Pirate treasure celebration
            const duration = 2500;
            const end = Date.now() + duration;

            (function frame() {
                confetti({
                    particleCount: 5,
                    angle: 60,
                    spread: 55,
                    origin: { x: 0 },
                    colors: ['#FDE047', '#EAB308', '#CA8A04'],
                    shapes: ['circle'],
                });
                confetti({
                    particleCount: 5,
                    angle: 120,
                    spread: 55,
                    origin: { x: 1 },
                    colors: ['#FDE047', '#EAB308', '#CA8A04'],
                    shapes: ['circle'],
                });

                if (Date.now() < end) {
                    requestAnimationFrame(frame);
                }
            }());

            setTimeout(() => {
                nextQuestion(true);
            }, 3500);
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
                        gameType: 'division-pirates',
                    }),
                });
            }

            router.push(`/results?score=${finalScore}&total=${totalQuestions}&time=${timeSpent}&gameId=division-pirates${studentId ? `&studentId=${studentId}` : ''}`);
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
            <div className="min-h-screen flex items-center justify-center p-4 bg-amber-50 relative overflow-hidden font-sans" dir="rtl">
                {/* Treasure Map Background */}
                <div className="absolute inset-0 opacity-40 bg-[url('https://www.transparenttextures.com/patterns/wood-pattern.png')] mix-blend-multiply pointer-events-none"></div>

                <div className="max-w-lg w-full relative z-10">
                    <div className="bg-amber-100/90 backdrop-blur-md rounded-3xl shadow-[0_20px_60px_rgba(0,0,0,0.3)] p-8 text-center flex flex-col items-center border-[8px] border-amber-800/80 outline outline-4 outline-amber-900/40 outline-offset-4">
                        <div className="mb-4 text-8xl drop-shadow-xl transform -rotate-6">
                            🏴‍☠️
                        </div>
                        <h1 className="text-4xl sm:text-5xl font-black text-amber-900 mb-4 tracking-tight drop-shadow-[0_2px_2px_rgba(255,255,255,0.8)]" style={{ fontFamily: 'impact, sans-serif' }}>
                            قراصنة القسمة
                        </h1>
                        <p className="text-xl text-amber-800 mb-8 font-bold leading-relaxed">
                            ساعد قبطان القراصنة في توزيع العملات الذهبية بالتساوي! 🪙⚓
                        </p>

                        <div className="mb-6 w-full">
                            <label htmlFor="name" className="block text-amber-900 font-bold mb-2 text-right">
                                اسم القبطان:
                            </label>
                            <input
                                type="text"
                                id="name"
                                value={studentName}
                                onChange={(e) => setStudentName(e.target.value)}
                                className="w-full px-4 py-3 bg-amber-50 border-2 border-amber-700 rounded-xl focus:border-amber-900 focus:bg-white focus:outline-none transition-all text-amber-900 placeholder-amber-700/50 text-center text-xl font-bold shadow-inner"
                                placeholder="اكتب اسمك هنا"
                                required
                            />
                        </div>

                        <button
                            onClick={startGame}
                            className="w-full bg-gradient-to-b from-red-600 to-red-800 hover:from-red-500 hover:to-red-700 text-amber-100 font-black text-2xl py-4 rounded-xl shadow-[0_6px_0_#7f1d1d] active:shadow-[0_0px_0_#7f1d1d] active:translate-y-2 transform transition-all border-2 border-red-900 flex items-center justify-center gap-3"
                        >
                            <span>ارفع الأشرعة!</span>
                            <span>⛵</span>
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-sky-900 relative overflow-hidden" dir="rtl">
            {/* Pirate Sea Background */}
            <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/wave-cut.png')] pointer-events-none"></div>

            {/* Island Shape at bottom */}
            <div className="absolute bottom-0 w-full h-1/4 bg-amber-300 rounded-t-[100%] shadow-[inset_0_10px_30px_rgba(180,83,9,0.5)]"></div>

            <div className="max-w-5xl w-full relative z-10 py-10">
                <motion.div
                    animate={shakeScreen ? { x: [-10, 10, -10, 10, 0] } : {}}
                    transition={{ duration: 0.4 }}
                    className="bg-amber-100/95 backdrop-blur-md border-[6px] border-amber-800 rounded-[2.5rem] shadow-[0_20px_60px_rgba(0,0,0,0.5)] p-6 sm:p-10 relative"
                >
                    {/* Progress Header */}
                    <div className="mb-6 sm:mb-10">
                        <div className="flex justify-between items-center mb-4 text-center sm:text-right flex-col sm:flex-row gap-4">
                            <div className="order-2 sm:order-1 text-right flex-1 w-full">
                                <span className="block text-lg sm:text-lg font-bold text-amber-800 mb-1">
                                    الكنز {questionNumber} من {totalQuestions}
                                </span>
                                <span className="block text-2xl font-black text-amber-600">
                                    الثروة: {score} 🌟
                                </span>
                            </div>
                            <div className="order-1 sm:order-2 text-4xl sm:text-5xl drop-shadow bg-amber-200 p-4 rounded-3xl border-2 border-amber-400 transform rotate-3">
                                🗺️
                            </div>
                        </div>
                        <div className="w-full bg-amber-200/50 rounded-full h-3 overflow-hidden border border-amber-300">
                            <motion.div
                                className="bg-gradient-to-r from-red-500 to-red-600 h-full rounded-full relative"
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
                                <h2 className="text-2xl sm:text-3xl font-black text-amber-900 leading-tight mb-3">
                                    وزّع <span className="text-red-700 bg-red-100 px-2 rounded-lg" dir="ltr">{formatNumber(questionData.totalCoins)}</span> عملة ذهبية بالتساوي على
                                    <span className="text-cyan-700 bg-cyan-100 px-2 rounded-lg mx-2" dir="ltr">{formatNumber(questionData.chests)}</span> صناديق.
                                </h2>
                                <span className="text-amber-800 text-xl block font-bold mt-2">
                                    كم عملة ستوضع في كل صندوق؟
                                </span>
                            </div>

                            {/* Pirate Scene Area */}
                            <div className="flex flex-col items-center justify-center gap-8 mb-12 bg-amber-200/40 rounded-[2rem] p-6 border-2 border-amber-300">
                                {/* Captain and Main Pile */}
                                <div className="flex items-end justify-center gap-6 sm:gap-12 relative w-full">
                                    {/* The Captain */}
                                    <motion.div
                                        className="text-8xl drop-shadow-lg z-10"
                                        animate={feedback === 'wrong' ? { rotate: [-10, 10, -10, 10, 0] } : {}}
                                        transition={{ duration: 0.5 }}
                                    >
                                        🏴‍☠️
                                    </motion.div>

                                    {/* Gold Pile */}
                                    <div className="relative">
                                        <AnimatePresence>
                                            {feedback !== 'correct' && (
                                                <motion.div
                                                    exit={{ scale: 0, opacity: 0 }}
                                                    transition={{ duration: 0.8 }}
                                                    className="bg-amber-100 p-6 rounded-t-full border-b-[6px] border-amber-400 flex flex-col items-center justify-end h-[140px] w-[140px] shadow-inner relative"
                                                >
                                                    <span className="text-5xl absolute top-4 z-0">💰</span>
                                                    <span className="text-4xl font-black text-amber-600 bg-white/80 px-4 py-1 rounded-full z-10 border-2 border-amber-300" dir="ltr">
                                                        {formatNumber(questionData.totalCoins)}
                                                    </span>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>

                                        {/* Distributed Empty space indication when correct */}
                                        {feedback === 'correct' && (
                                            <div className="h-[140px] w-[140px] flex items-end justify-center opacity-50">
                                                <span className="text-4xl">❌</span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Chests Row */}
                                <div className="flex flex-wrap justify-center gap-4 sm:gap-8 w-full" dir="ltr">
                                    {Array.from({ length: questionData.chests }).map((_, i) => (
                                        <div key={i} className="relative group">
                                            {/* Chest Emoji */}
                                            <div className="text-6xl sm:text-7xl drop-shadow-md relative z-10 transition-transform transform group-hover:scale-110">
                                                {feedback === 'correct' ? '💎' : '🧰'}
                                            </div>

                                            {/* Coins received indicator (only shows on success) */}
                                            <AnimatePresence>
                                                {feedback === 'correct' && (
                                                    <motion.div
                                                        initial={{ opacity: 0, y: -40, scale: 0.5 }}
                                                        animate={{ opacity: 1, y: -10, scale: 1 }}
                                                        className="absolute -top-10 left-1/2 transform -translate-x-1/2 bg-yellow-100 border-2 border-yellow-400 text-yellow-800 font-bold px-3 py-1 rounded-full whitespace-nowrap z-20 shadow-lg"
                                                    >
                                                        + {questionData.options.find(o => o.isCorrect)?.value} 🪙
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Answer Buttons (Wooden Planks) */}
                            <div className="bg-amber-900 p-6 sm:p-8 rounded-[2rem] shadow-[0_15px_30px_rgba(0,0,0,0.4)] border-[6px] border-amber-800 relative overflow-hidden" style={{ backgroundImage: "url('https://www.transparenttextures.com/patterns/wood-pattern.png')" }}>
                                <h3 className="text-amber-100 text-center font-bold mb-6">اختر نصيب كل صندوق:</h3>

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
                                                    flex-1 min-w-[140px] h-20 sm:h-24 rounded-tl-xl rounded-br-xl rounded-tr-md rounded-bl-md relative
                                                    flex items-center justify-center transition-all disabled:opacity-90 outline outline-2 outline-black/20
                                                    ${shakeOptionId === option.id
                                                        ? 'bg-red-600 text-white shadow-[0_8px_0_#7f1d1d]'
                                                        : (feedback === 'correct' && option.isCorrect)
                                                            ? 'bg-green-600 text-white shadow-[0_8px_0_#14532d]'
                                                            : 'bg-amber-600 hover:bg-amber-500 text-amber-50 shadow-[0_8px_0_#78350f]'
                                                    }
                                                `}
                                                style={{ backgroundImage: "url('https://www.transparenttextures.com/patterns/wood-pattern.png')", backgroundBlendMode: 'overlay' }}
                                            >
                                                <span className="text-4xl sm:text-5xl font-black tracking-tight drop-shadow-[0_2px_2px_rgba(0,0,0,0.5)] font-mono" dir="ltr">
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
                                            className="bg-green-100 border-4 border-green-500 text-green-800 px-6 py-4 rounded-[2rem] text-center shadow-xl w-full max-w-xl flex items-center justify-center gap-4"
                                        >
                                            <span className="text-4xl">🏴‍☠️</span>
                                            <p className="text-xl sm:text-2xl font-black">توزيع عادل أيها القبطان!</p>
                                        </motion.div>
                                    )}

                                    {feedback === 'wrong' && (
                                        <motion.div
                                            key="wrong"
                                            initial={{ scale: 0.8, opacity: 0 }}
                                            animate={{ scale: 1, opacity: 1 }}
                                            exit={{ scale: 0.8, opacity: 0 }}
                                            className="bg-red-100 border-4 border-red-500 text-red-800 px-6 py-4 rounded-[2rem] text-center shadow-xl w-full max-w-xl flex items-center justify-center gap-4"
                                        >
                                            <span className="text-4xl">🦜</span>
                                            <p className="text-xl sm:text-2xl font-black">حاول التوزيع مرة أخرى!</p>
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
