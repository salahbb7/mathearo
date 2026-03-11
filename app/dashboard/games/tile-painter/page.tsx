'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Difficulty } from '@/lib/difficulty';
import confetti from 'canvas-confetti';
import { motion, AnimatePresence } from 'framer-motion';

const GRID_SIZE = 10;
const PAINT_COLORS = [
    { name: 'yellow', class: 'bg-yellow-400', shadow: 'shadow-yellow-400' },
    { name: 'green', class: 'bg-green-400', shadow: 'shadow-green-400' },
    { name: 'blue', class: 'bg-blue-400', shadow: 'shadow-blue-400' },
    { name: 'purple', class: 'bg-purple-400', shadow: 'shadow-purple-400' },
    { name: 'rose', class: 'bg-rose-400', shadow: 'shadow-rose-400' },
];

export default function TilePainterGamePage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const studentId = searchParams.get('studentId');
    const isTeacher = searchParams.get('teacher') === 'true';
    const difficulty = (searchParams.get('difficulty') || 'medium') as Difficulty;
    // Size range: easy 2-5, medium 2-8, hard 2-12
    const maxSize = difficulty === 'easy' ? 4 : difficulty === 'hard' ? 11 : 7;

    const [gameStarted, setGameStarted] = useState(false);
    const [studentName, setStudentName] = useState('');

    const [questionData, setQuestionData] = useState<{
        width: number;
        height: number;
        startX: number;
        startY: number;
        area: number;
        perimeter: number;
        color: typeof PAINT_COLORS[0];
        options: { id: string; value: number }[];
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
        // Generate random width and height scaled by difficulty
        const w = Math.floor(Math.random() * maxSize) + 2;
        const h = Math.floor(Math.random() * maxSize) + 2;

        const startX = Math.floor(Math.random() * (GRID_SIZE - w + 1));
        const startY = Math.floor(Math.random() * (GRID_SIZE - h + 1));

        const area = w * h;
        const perimeter = 2 * (w + h);

        const color = PAINT_COLORS[Math.floor(Math.random() * PAINT_COLORS.length)];

        // Create distractors
        let distractor1 = perimeter;
        // If square perimeter == area (like 4x4 area=16, perim=16), adjust it
        if (distractor1 === area) {
            distractor1 += Math.floor(Math.random() * 5) + 2;
        }

        let distractor2 = area + (Math.random() > 0.5 ? 1 : -1) * (Math.floor(Math.random() * 4) + 1);
        while (distractor2 === area || distractor2 === distractor1 || distractor2 <= 0) {
            distractor2 = area + (Math.random() > 0.5 ? 2 : -2) * (Math.floor(Math.random() * 4) + 1);
        }

        const opts = [
            { id: 'correct', value: area },
            { id: 'd1', value: distractor1 },
            { id: 'd2', value: distractor2 }
        ];

        // Shuffle
        for (let i = opts.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [opts[i], opts[j]] = [opts[j], opts[i]];
        }

        setQuestionData({
            width: w,
            height: h,
            startX,
            startY,
            area,
            perimeter,
            color,
            options: opts
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

    const checkAnswer = (selectedOpt: { id: string; value: number }) => {
        if (feedback !== null || !questionData) return;

        if (selectedOpt.id === 'correct') {
            setFeedback('correct');
            setScore(prev => prev + 1);
            playSound(settings.successSoundUrl);

            // Paint Splatter Celebration
            const duration = 2000;
            const end = Date.now() + duration;
            // Get hex color approx matching tailwind class
            let hexColor = '#fbbf24'; // yellow def
            if (questionData.color.name === 'green') hexColor = '#4ade80';
            if (questionData.color.name === 'blue') hexColor = '#60a5fa';
            if (questionData.color.name === 'purple') hexColor = '#c084fc';
            if (questionData.color.name === 'rose') hexColor = '#fb7185';

            (function frame() {
                confetti({
                    particleCount: 8,
                    angle: 90,
                    spread: 100,
                    origin: { x: 0.5, y: 0.8 },
                    colors: [hexColor, '#ffffff', '#e2e8f0'],
                    shapes: ['square', 'circle'],
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
            setShakeOptionId(selectedOpt.id);
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
                        gameType: 'tile-painter', // Match ID
                    }),
                });
            }

            router.push(`/results?score=${finalScore}&total=${totalQuestions}&time=${timeSpent}&gameId=tile-painter${studentId ? `&studentId=${studentId}` : ''}`);
        } catch (error) {
            console.error('Error saving score:', error);
            alert('حدث خطأ في حفظ النتيجة');
        }
    };

    // Helper to determine if a cell is part of the painted area
    const isPainted = (x: number, y: number) => {
        if (!questionData) return false;
        return (
            x >= questionData.startX &&
            x < questionData.startX + questionData.width &&
            y >= questionData.startY &&
            y < questionData.startY + questionData.height
        );
    };

    if (!gameStarted) {
        return (
            <div className="min-h-screen flex items-center justify-center p-4 bg-teal-50 relative overflow-hidden font-sans" dir="rtl">
                {/* Paper texture background */}
                <div className="absolute inset-0 opacity-40 bg-[url('https://www.transparenttextures.com/patterns/notebook.png')] mix-blend-multiply pointer-events-none"></div>

                <div className="max-w-lg w-full relative z-10">
                    <div className="bg-white/95 backdrop-blur-md rounded-[3rem] shadow-[0_20px_60px_rgba(20,184,166,0.15)] p-8 text-center flex flex-col items-center border-[8px] border-teal-200">
                        <div className="mb-4 text-8xl drop-shadow-[0_10px_10px_rgba(0,0,0,0.1)] hover:rotate-12 transition-transform cursor-pointer">
                            🎨
                        </div>
                        <h1 className="text-4xl sm:text-5xl font-black text-teal-600 mb-4 tracking-tight drop-shadow-sm font-serif">
                            رسّام البلاط
                        </h1>
                        <p className="text-xl text-teal-800 mb-8 font-bold leading-relaxed">
                            احسب المساحة الملونة بالوحدات المربعة وانتبه للمحيط المخادع! 📏🖌️
                        </p>

                        <div className="mb-6 w-full">
                            <label htmlFor="name" className="block text-teal-900 font-bold mb-2 text-right">
                                اسم الفنّان:
                            </label>
                            <input
                                type="text"
                                id="name"
                                value={studentName}
                                onChange={(e) => setStudentName(e.target.value)}
                                className="w-full px-4 py-3 bg-teal-50 border-2 border-teal-300 rounded-xl focus:border-teal-500 focus:outline-none transition-all text-teal-900 placeholder-teal-400 text-center text-xl font-bold shadow-inner"
                                placeholder="اكتب اسمك هنا"
                                required
                            />
                        </div>

                        <button
                            onClick={startGame}
                            className="w-full bg-gradient-to-l from-emerald-400 via-teal-500 to-cyan-500 hover:from-emerald-500 hover:via-teal-600 hover:to-cyan-600 text-white font-black text-2xl py-4 rounded-xl shadow-[0_6px_0_#0f766e] active:shadow-[0_0px_0_#0f766e] active:translate-y-2 transform transition-all border-2 border-teal-300/50 flex items-center justify-center gap-3"
                        >
                            <span>ابدأ التلوين!</span>
                            <span>🖌️</span>
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center p-2 sm:p-4 bg-gray-100 relative overflow-hidden font-sans" dir="rtl">
            {/* Grid Paper Background */}
            <div className="absolute inset-0 opacity-10 bg-[linear-gradient(#cbd5e1_1px,transparent_1px),linear-gradient(90deg,#cbd5e1_1px,transparent_1px)] bg-[size:20px_20px]"></div>

            <div className="max-w-4xl w-full relative z-10 py-6 sm:py-10">
                <motion.div
                    animate={shakeScreen ? { x: [-15, 15, -15, 15, 0], y: [-5, 5, -5, 5, 0] } : {}}
                    transition={{ duration: 0.4 }}
                    className="bg-white border-4 border-slate-300 rounded-[2rem] sm:rounded-[3rem] shadow-[0_20px_50px_rgba(0,0,0,0.1)] p-4 sm:p-8 relative overflow-hidden"
                >
                    {/* Header Info */}
                    <div className="mb-6 flex flex-col sm:flex-row justify-between items-center bg-slate-50 p-4 sm:p-6 rounded-3xl border-2 border-slate-200 shadow-sm gap-4">
                        <div className="text-center sm:text-right flex-1 w-full order-2 sm:order-1">
                            <span className="block text-sm sm:text-base font-bold text-slate-500 mb-1 font-mono uppercase">
                                اللوحة رقم {questionNumber} / {totalQuestions}
                            </span>
                            <span className="block text-2xl font-black text-teal-600 drop-shadow-sm">
                                المساحات: {score} 📐
                            </span>
                        </div>
                        <div className="bg-white border-2 border-teal-100 px-4 py-3 rounded-2xl order-1 sm:order-2 text-center shadow-sm w-full sm:w-auto">
                            <h2 className="text-lg sm:text-xl font-black text-slate-700 leading-tight">
                                ما هي مساحة الجزء الملون بالوحدات المربعة؟ 🎨
                            </h2>
                        </div>
                    </div>

                    {questionData && (
                        <div className="flex flex-col items-center">

                            {/* The Grid Board */}
                            <div className="relative mb-8 bg-white p-2 sm:p-4 rounded-xl border-[6px] border-slate-300 shadow-inner">
                                {/* Grid container */}
                                <div
                                    className="grid gap-[1px] bg-slate-200 border border-slate-200 relative overflow-hidden"
                                    style={{
                                        gridTemplateColumns: `repeat(${GRID_SIZE}, minmax(0, 1fr))`,
                                        width: 'fit-content'
                                    }}
                                >
                                    {Array.from({ length: GRID_SIZE * GRID_SIZE }).map((_, index) => {
                                        const x = index % GRID_SIZE; // left to right inside grid context
                                        const y = Math.floor(index / GRID_SIZE);
                                        const painted = isPainted(x, y);

                                        return (
                                            <motion.div
                                                key={index}
                                                className={`w-6 h-6 sm:w-10 sm:h-10 md:w-12 md:h-12 border border-slate-100 ${painted ? questionData.color.class : 'bg-white'}`}
                                                initial={false}
                                                animate={
                                                    feedback === 'correct' && painted
                                                        ? { scale: [1, 1.1, 1], zIndex: 10, borderRadius: ['0%', '20%', '0%'] }
                                                        : feedback === 'wrong' && painted
                                                            ? { y: [0, 5, 0, 5, 0], opacity: [1, 0.7, 1] }
                                                            : {}
                                                }
                                                transition={{
                                                    duration: feedback === 'wrong' ? 1.5 : 0.5,
                                                    delay: painted && feedback === 'correct' ? (x + y) * 0.05 : 0,
                                                    ease: "easeInOut"
                                                }}
                                                style={
                                                    painted && feedback === 'correct'
                                                        ? { boxShadow: '0 0 10px rgba(0,0,0,0.2)' }
                                                        : {}
                                                }
                                            >
                                                {/* Paint drops effect for errors */}
                                                {(feedback === 'wrong' && painted && Math.random() > 0.7) && (
                                                    <motion.div
                                                        initial={{ height: 0 }}
                                                        animate={{ height: 15 }}
                                                        className="w-1 bg-current opacity-30 mx-auto rounded-b-full"
                                                    />
                                                )}
                                            </motion.div>
                                        );
                                    })}
                                </div>

                                {/* Tools decoration */}
                                <div className="absolute -bottom-6 -left-6 text-4xl transform -rotate-45 drop-shadow-md z-20">🖌️</div>
                                <div className="absolute -top-6 -right-6 text-4xl transform rotate-12 drop-shadow-md z-20">🪣</div>
                            </div>

                            {/* Options Buttons */}
                            <div className="w-full grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-6 relative z-30 px-2 sm:px-8">
                                <AnimatePresence>
                                    {questionData.options.map((option) => (
                                        <motion.button
                                            key={option.id}
                                            whileHover={{ scale: 1.05, y: -4 }}
                                            whileTap={{ scale: 0.95 }}
                                            animate={shakeOptionId === option.id ? { x: [-10, 10, -10, 10, 0] } : {}}
                                            onClick={() => checkAnswer(option)}
                                            disabled={feedback !== null}
                                            className={`
                                                relative h-20 sm:h-24 rounded-2xl sm:rounded-3xl border-4 flex flex-col items-center justify-center font-bold transition-all
                                                overflow-hidden group
                                                ${shakeOptionId === option.id
                                                    ? 'border-red-500 bg-red-50 shadow-[0_8px_0_#ef4444] text-red-700'
                                                    : (feedback === 'correct' && option.id === 'correct')
                                                        ? 'border-emerald-500 bg-emerald-50 shadow-[0_8px_0_#10b981] text-emerald-700'
                                                        : 'border-slate-200 bg-white hover:border-teal-400 hover:bg-teal-50 shadow-[0_8px_0_#e2e8f0] hover:shadow-[0_8px_0_#ccfbf1] text-slate-700'
                                                }
                                            `}
                                        >
                                            <div className="absolute inset-0 opacity-0 group-hover:opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] transition-opacity"></div>
                                            <span className="text-3xl sm:text-4xl font-black font-mono relative z-10">
                                                {option.value}
                                            </span>
                                        </motion.button>
                                    ))}
                                </AnimatePresence>
                            </div>

                            {/* Feedback Overlay Message */}
                            <div className="absolute top-[50%] left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full max-w-lg px-4 z-50 pointer-events-none flex justify-center mt-[-30px]">
                                <AnimatePresence mode="wait">
                                    {feedback === 'correct' && (
                                        <motion.div
                                            key="correct"
                                            initial={{ scale: 0.5, opacity: 0, y: 30 }}
                                            animate={{ scale: 1, opacity: 1, y: 0 }}
                                            exit={{ scale: 0.5, opacity: 0, y: -30 }}
                                            className="bg-emerald-100/95 backdrop-blur-md border-4 border-emerald-500 text-emerald-800 px-6 py-4 rounded-[2.5rem] text-center shadow-2xl flex items-center justify-center gap-4"
                                        >
                                            <span className="text-4xl sm:text-5xl drop-shadow-md animate-bounce">🎨</span>
                                            <p className="text-xl sm:text-2xl font-black drop-shadow-sm">حساب مساحة ممتاز!</p>
                                        </motion.div>
                                    )}

                                    {feedback === 'wrong' && (
                                        <motion.div
                                            key="wrong"
                                            initial={{ scale: 0.8, opacity: 0 }}
                                            animate={{ scale: 1, opacity: 1 }}
                                            exit={{ scale: 0.8, opacity: 0 }}
                                            className="bg-red-100/95 backdrop-blur-md border-4 border-red-500 text-red-800 px-6 py-4 rounded-[2.5rem] text-center shadow-2xl flex flex-col items-center justify-center gap-2"
                                        >
                                            <div className="flex items-center gap-3">
                                                <span className="text-4xl sm:text-5xl drop-shadow-md">💧</span>
                                                <p className="text-lg sm:text-xl font-black drop-shadow-sm leading-tight max-w-[200px] sm:max-w-none">
                                                    تذكر: المساحة هي عدد المربعات بالداخل!
                                                </p>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>

                        </div>
                    )}
                </motion.div>
            </div>
        </div>
    );
}
