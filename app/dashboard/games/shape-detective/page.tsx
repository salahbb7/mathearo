'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Difficulty } from '@/lib/difficulty';
import confetti from 'canvas-confetti';
import { motion, AnimatePresence } from 'framer-motion';

const SHAPES = [
    {
        id: 'circle',
        name: 'دائرة',
        svg: (
            <svg viewBox="0 0 100 100" className="w-[80%] h-[80%] drop-shadow-2xl" fill="currentColor">
                <circle cx="50" cy="50" r="45" className="text-blue-500" />
            </svg>
        )
    },
    {
        id: 'square',
        name: 'مربع',
        svg: (
            <svg viewBox="0 0 100 100" className="w-[70%] h-[70%] drop-shadow-2xl" fill="currentColor">
                <rect x="10" y="10" width="80" height="80" className="text-rose-500" rx="8" />
            </svg>
        )
    },
    {
        id: 'triangle',
        name: 'مُثلث',
        svg: (
            <svg viewBox="0 0 100 100" className="w-[80%] h-[80%] drop-shadow-2xl" fill="currentColor">
                <polygon points="50,15 90,85 10,85" className="text-emerald-500" strokeLinejoin="round" strokeWidth="4" stroke="currentColor" />
            </svg>
        )
    },
    {
        id: 'rectangle',
        name: 'مستطيل',
        svg: (
            <svg viewBox="0 0 100 100" className="w-[80%] h-[80%] drop-shadow-2xl" fill="currentColor">
                <rect x="5" y="25" width="90" height="50" className="text-purple-500" rx="6" />
            </svg>
        )
    },
    {
        id: 'cube',
        name: 'مكعب',
        svg: (
            <svg viewBox="0 0 100 100" className="w-[80%] h-[80%] drop-shadow-2xl" fill="none" stroke="currentColor" strokeWidth="3" strokeLinejoin="round">
                <path d="M30,40 L70,40 L70,80 L30,80 Z" className="fill-amber-400 text-amber-700" />
                <path d="M70,40 L85,25 L85,65 L70,80 Z" className="fill-amber-500 text-amber-800" />
                <path d="M30,40 L45,25 L85,25 L70,40 Z" className="fill-amber-300 text-amber-600" />
            </svg>
        )
    },
    {
        id: 'cylinder',
        name: 'أسطوانة',
        svg: (
            <svg viewBox="0 0 100 100" className="w-[70%] h-[70%] drop-shadow-2xl" fill="none" stroke="currentColor" strokeWidth="3">
                <path d="M30,30 V70 A20,10 0 0,0 70,70 V30 Z" className="fill-cyan-500 text-cyan-800" />
                <ellipse cx="50" cy="30" rx="20" ry="10" className="fill-cyan-400 text-cyan-700" />
            </svg>
        )
    },
    {
        id: 'sphere',
        name: 'كرة',
        svg: (
            <svg viewBox="0 0 100 100" className="w-[80%] h-[80%] drop-shadow-2xl">
                <defs>
                    <radialGradient id="sphereGrad" cx="35%" cy="35%" r="65%">
                        <stop offset="0%" stopColor="#fca5a5" />
                        <stop offset="60%" stopColor="#ef4444" />
                        <stop offset="100%" stopColor="#991b1b" />
                    </radialGradient>
                </defs>
                <circle cx="50" cy="50" r="45" fill="url(#sphereGrad)" />
            </svg>
        )
    },
    {
        id: 'cone',
        name: 'مخروط',
        svg: (
            <svg viewBox="0 0 100 100" className="w-[80%] h-[80%] drop-shadow-2xl" fill="none" stroke="currentColor" strokeWidth="3" strokeLinejoin="round">
                <path d="M50,15 L20,80 A30,12 0 0,0 80,80 Z" className="fill-orange-500 text-orange-800" />
            </svg>
        )
    }
];

export default function ShapeDetectiveGamePage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const studentId = searchParams.get('studentId');
  const isTeacher = searchParams.get('teacher') === 'true';
    const difficulty = (searchParams.get('difficulty') || 'medium') as Difficulty;
    const [gameStarted, setGameStarted] = useState(false);
    const [studentName, setStudentName] = useState('');

    const [currentShape, setCurrentShape] = useState<typeof SHAPES[0] | null>(null);
    const [options, setOptions] = useState<string[]>([]);
    const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);

    const [score, setScore] = useState(0);
    const [questionNumber, setQuestionNumber] = useState(0);
    const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
    const [shake, setShake] = useState(false);
    const [startTime, setStartTime] = useState<number>(0);

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
        setFeedback(null);
        setSelectedAnswer(null);

        const target = SHAPES[Math.floor(Math.random() * SHAPES.length)];
        setCurrentShape(target);

        const opts = new Set<string>();
        opts.add(target.name);
        while (opts.size < 3) {
            const rand = SHAPES[Math.floor(Math.random() * SHAPES.length)].name;
            opts.add(rand);
        }
        setOptions(Array.from(opts).sort(() => Math.random() - 0.5));
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


    const checkAnswer = (selectedOpt: string) => {
        if (feedback !== null || !currentShape) return;

        setSelectedAnswer(selectedOpt);

        if (selectedOpt === currentShape.name) {
            setFeedback('correct');
            setScore(prev => prev + 1);
            playSound(settings.successSoundUrl);

            confetti({
                particleCount: 150,
                spread: 100,
                origin: { y: 0.4 },
                colors: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'],
            });

            setTimeout(() => {
                nextQuestion(true);
            }, 3000);
        } else {
            setFeedback('wrong');
            setShake(true);
            playSound(settings.errorSoundUrl);

            setTimeout(() => {
                setFeedback(null);
                setSelectedAnswer(null);
                setShake(false);
            }, 1500);
        }
    };

    const nextQuestion = (wasCorrect: boolean) => {
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
            if (!isTeacher) { await fetch('/api/scores', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    studentName: studentName || 'Student',
                    studentId: studentId || undefined,
                    score: finalScore,
                    totalQuestions,
                    timeSpent,
                    gameType: 'shape-detective',
                }),
            }); }

            router.push(`/results?score=${finalScore}&total=${totalQuestions}&time=${timeSpent}&gameId=shape-detective${studentId ? `&studentId=${studentId}` : ''}`);
        } catch (error) {
            console.error('Error saving score:', error);
            alert('حدث خطأ في حفظ النتيجة');
        }
    };

    if (!gameStarted) {
        return (
            <div className="min-h-screen flex items-center justify-center p-4 bg-slate-900 relative overflow-hidden" dir="rtl">
                {/* Mystery Background Elements */}
                <div className="absolute inset-0 opacity-20 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-indigo-700 via-slate-900 to-black"></div>
                <div className="absolute top-20 left-10 text-6xl opacity-20 transform -rotate-12">🔍</div>
                <div className="absolute bottom-32 right-20 text-7xl opacity-20 transform rotate-12">🕵️‍♂️</div>

                <div className="max-w-lg w-full relative z-10">
                    <div className="bg-slate-800/95 backdrop-blur-md rounded-3xl shadow-[0_20px_60px_rgba(0,0,0,0.5)] p-8 text-center flex flex-col items-center border-[4px] border-slate-600">
                        <div className="mb-4 text-8xl drop-shadow-[0_0_20px_rgba(255,255,255,0.2)]">
                            🕵️‍♂️
                        </div>
                        <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-200 to-amber-500 mb-4 drop-shadow-sm">
                            مفتش الأشكال
                        </h1>
                        <p className="text-xl text-slate-300 mb-8 font-bold">
                            العب دور المحقق الذكي واكتشف الأشكال المخفية! 🔍
                        </p>

                        <div className="mb-6 w-full">
                            <label htmlFor="name" className="block text-slate-400 font-bold mb-2 text-right text-lg">
                                ما اسمك أيها المحقق؟
                            </label>
                            <input
                                type="text"
                                id="name"
                                value={studentName}
                                onChange={(e) => setStudentName(e.target.value)}
                                className="w-full px-4 py-4 bg-slate-700/50 border-2 border-slate-500 rounded-xl focus:border-amber-400 focus:outline-none transition-all text-white placeholder-slate-400 text-center text-xl font-black shadow-inner"
                                placeholder="اكتب اسمك هنا"
                                required
                            />
                        </div>

                        <button
                            onClick={startGame}
                            className="w-full bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-slate-900 font-black text-2xl py-5 rounded-xl shadow-[0_6px_0_#9a3412] active:shadow-[0_0px_0_#9a3412] active:translate-y-2 transform transition-all border border-amber-300/50"
                        >
                            ابدأ البحث 🕵️‍♂️
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex flex-col items-center justify-start pt-28 sm:pt-32 pb-8 px-4 sm:px-8 bg-slate-900 relative overflow-hidden" dir="rtl">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-indigo-900/40 via-slate-900 to-slate-950"></div>

            {/* Background floating elements */}
            <div className="absolute top-1/4 left-10 text-white/5 text-8xl rotate-12">🔴</div>
            <div className="absolute bottom-1/4 right-10 text-white/5 text-9xl -rotate-12">⬛</div>

            {/* HUD */}
            <div className="fixed top-6 left-0 w-full px-6 flex justify-between items-start z-30 pointer-events-none">
                <div className="bg-slate-800/90 backdrop-blur-sm rounded-2xl p-4 border-2 border-slate-600 shadow-xl flex flex-col pointer-events-auto">
                    <span className="text-2xl font-black text-amber-400">القضية {questionNumber}/{totalQuestions}</span>
                    <span className="text-xl font-bold text-slate-300">النقاط: {score} 🏆</span>
                </div>
            </div>

            {/* Question Title Header */}
            <motion.div
                initial={{ y: -50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="mb-8 z-20 w-full max-w-4xl"
            >
                <div className="bg-slate-800/80 backdrop-blur-md rounded-3xl p-6 sm:px-12 shadow-[0_10px_30px_rgba(0,0,0,0.5)] border-l-8 border-r-8 border-amber-500 text-center">
                    <h2 className="text-2xl sm:text-4xl font-black text-white drop-shadow-lg leading-tight">
                        أيها المفتش، ما اسم هذا الشكل المخبأ؟
                    </h2>
                </div>
            </motion.div>

            {/* Magnifying Glass Area */}
            <div className="relative w-full max-w-5xl flex flex-col items-center justify-center mt-12 sm:mt-16 z-10 h-80 sm:h-96">
                <motion.div
                    className="relative"
                    animate={
                        shake
                            ? { x: [-10, 10, -10, 10, 0], rotate: [-2, 2, -2, 2, 0] }
                            : {}
                    }
                    transition={{ duration: 0.5 }}
                >
                    {/* The Magnifying Glass Circle */}
                    <div className="relative z-10 w-64 h-64 sm:w-80 sm:h-80 rounded-full border-[16px] sm:border-[20px] border-slate-300 shadow-[0_25px_50px_rgba(0,0,0,0.6),inset_0_10px_20px_rgba(0,0,0,0.2)] bg-slate-800 flex items-center justify-center overflow-hidden">

                        {/* Glass Reflection */}
                        <div className="absolute top-4 left-8 w-24 sm:w-32 h-8 sm:h-12 bg-white/20 rounded-full rotate-[-40deg] blur-[4px] z-20"></div>
                        <div className="absolute bottom-4 right-8 w-16 sm:w-20 h-4 sm:h-6 bg-white/10 rounded-full rotate-[-40deg] blur-[2px] z-20"></div>

                        {/* Hidden Shape */}
                        <div className="w-48 h-48 sm:w-60 sm:h-60 flex items-center justify-center z-10">
                            {currentShape?.svg}
                        </div>
                    </div>

                    {/* Magnifying Glass Handle */}
                    <div className="absolute top-[85%] right-1/4 translate-x-12 w-10 sm:w-12 h-32 sm:h-40 bg-gradient-to-b from-amber-700 to-amber-900 rounded-b-full border-x-4 border-b-4 border-amber-950 shadow-2xl z-0 transform -rotate-45 origin-top relative overflow-hidden">
                        <div className="absolute top-0 right-2 w-2 h-full bg-white/20 blur-[1px]"></div>
                    </div>

                    {/* "Case Solved" Stamp Overlay */}
                    <AnimatePresence>
                        {feedback === 'correct' && (
                            <motion.div
                                initial={{ scale: 3, opacity: 0, rotate: -25 }}
                                animate={{ scale: 1, opacity: 1, rotate: -15 }}
                                exit={{ opacity: 0 }}
                                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-30 pointer-events-none"
                            >
                                <div className="border-[8px] sm:border-[12px] border-red-500 rounded-xl px-6 py-2 text-red-500 font-black text-4xl sm:text-6xl uppercase tracking-widest shadow-2xl bg-white/90 backdrop-blur-sm border-dashed">
                                    تم حل القضية!
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </motion.div>
            </div>

            {/* Answer Options Controls */}
            <motion.div
                className="mt-16 sm:mt-24 flex flex-wrap gap-4 sm:gap-6 justify-center w-full z-20 px-4 max-w-3xl"
                initial={{ y: 50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
            >
                {options.map((opt, i) => {
                    let btnColor = "bg-slate-700 hover:bg-slate-600 border-slate-500 text-slate-200 border-b-[8px]";
                    let statusLabel = null;

                    if (selectedAnswer === opt) {
                        if (feedback === 'correct') {
                            btnColor = "bg-emerald-500 hover:bg-emerald-400 border-emerald-700 text-white border-b-[8px]";
                        } else if (feedback === 'wrong') {
                            btnColor = "bg-red-500 hover:bg-red-400 border-red-700 text-white border-b-2 translate-y-[6px]";
                        }
                    } else if (selectedAnswer && feedback === 'wrong') {
                        // dim other buttons if wrong
                        btnColor += " opacity-60";
                    }

                    return (
                        <motion.button
                            key={`opt-${i}`}
                            whileHover={feedback === null ? { scale: 1.05, y: -5 } : {}}
                            whileTap={feedback === null ? { scale: 0.95 } : {}}
                            onClick={() => checkAnswer(opt)}
                            disabled={feedback !== null}
                            className={`flex-1 min-w-[150px] sm:min-w-[200px] py-4 sm:py-6 px-4 rounded-2xl shadow-xl font-black text-2xl sm:text-4xl transition-all relative ${btnColor} disabled:cursor-not-allowed`}
                        >
                            <span className="drop-shadow-md">{opt}</span>
                        </motion.button>
                    )
                })}
            </motion.div>

            {/* Feedback Message overlay context under buttons */}
            {feedback === 'correct' && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-8 text-2xl sm:text-3xl font-bold text-emerald-400 drop-shadow-lg"
                >
                    أحسنت أيها المفتش الذكي! 🕵️‍♂️
                </motion.div>
            )}

            {feedback === 'wrong' && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-8 text-2xl sm:text-3xl font-bold text-red-400 drop-shadow-lg"
                >
                    ابحث بدقة أكثر!
                </motion.div>
            )}

        </div>
    );
}

