'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Difficulty } from '@/lib/difficulty';
import confetti from 'canvas-confetti';
import { motion, AnimatePresence } from 'framer-motion';

// Base fractions that are easy for kids
const BASE_FRACTIONS = [
    { num: 1, den: 2 },
    { num: 1, den: 3 },
    { num: 2, den: 3 },
    { num: 1, den: 4 },
    { num: 3, den: 4 },
    { num: 1, den: 5 },
    { num: 2, den: 5 },
];

const POTION_COLORS = [
    { from: '#10b981', to: '#34d399', shadow: 'rgba(16,185,129,0.5)' }, // green
    { from: '#3b82f6', to: '#60a5fa', shadow: 'rgba(59,130,246,0.5)' }, // blue
    { from: '#a855f7', to: '#c084fc', shadow: 'rgba(168,85,247,0.5)' }, // purple
    { from: '#f43f5e', to: '#fb7185', shadow: 'rgba(244,63,94,0.5)' }, // rose
    { from: '#eab308', to: '#facc15', shadow: 'rgba(234,179,8,0.5)' }, // yellow
];

export default function FractionsLabGamePage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const studentId = searchParams.get('studentId');
    const isTeacher = searchParams.get('teacher') === 'true';
    const difficulty = (searchParams.get('difficulty') || 'medium') as Difficulty;

    const [gameStarted, setGameStarted] = useState(false);
    const [studentName, setStudentName] = useState('');

    const [questionData, setQuestionData] = useState<{
        baseNum: number;
        baseDen: number;
        options: { id: string; num: number; den: number; isCorrect: boolean }[];
        color: typeof POTION_COLORS[0];
    } | null>(null);

    const [score, setScore] = useState(0);
    const [questionNumber, setQuestionNumber] = useState(0);
    const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
    const [shakeScreen, setShakeScreen] = useState(false);
    const [startTime, setStartTime] = useState<number>(0);

    // State for the big beaker animation
    const [beakerState, setBeakerState] = useState<'idle' | 'bubbling' | 'clink'>('idle');
    const [shakeOptionId, setShakeOptionId] = useState<string | null>(null);

    const [settings, setSettings] = useState({
        successSoundUrl: '', // bubbling potion sound expected
        errorSoundUrl: '', // glass clink expected
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
        const base = BASE_FRACTIONS[Math.floor(Math.random() * BASE_FRACTIONS.length)];

        // Generate an equivalent fraction (multiplier 2, 3, or 4)
        const multiplier = Math.floor(Math.random() * 3) + 2;
        const correctNum = base.num * multiplier;
        const correctDen = base.den * multiplier;

        // Generate distractors (not equivalent)
        const generateDistractor = () => {
            let n = base.num + (Math.random() > 0.5 ? 1 : -1) * (Math.floor(Math.random() * 2) + 1);
            let d = base.den * (Math.floor(Math.random() * 3) + 2);
            if (n <= 0) n = 1;
            // ensure it's not actually equivalent
            if (n * base.den === d * base.num) {
                d += 1;
            }
            return { num: n, den: d };
        };

        const d1 = generateDistractor();
        const d2 = generateDistractor();
        // Make sure d1 and d2 themselves aren't identical just in case
        if (d1.num === d2.num && d1.den === d2.den) d2.den += 1;

        const opts = [
            { id: 'correct', num: correctNum, den: correctDen, isCorrect: true },
            { id: 'd1', num: d1.num, den: d1.den, isCorrect: false },
            { id: 'd2', num: d2.num, den: d2.den, isCorrect: false }
        ];

        // Shuffle
        for (let i = opts.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [opts[i], opts[j]] = [opts[j], opts[i]];
        }

        const color = POTION_COLORS[Math.floor(Math.random() * POTION_COLORS.length)];

        setQuestionData({
            baseNum: base.num,
            baseDen: base.den,
            options: opts,
            color
        });

        setBeakerState('idle');
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

    const checkAnswer = (selectedOpt: { id: string; num: number; den: number; isCorrect: boolean }) => {
        if (feedback !== null || !questionData) return;

        if (selectedOpt.isCorrect) {
            setFeedback('correct');
            setScore(prev => prev + 1);
            playSound(settings.successSoundUrl);
            setBeakerState('bubbling');

            // Magical Potion Celebration
            const duration = 2000;
            const end = Date.now() + duration;

            (function frame() {
                confetti({
                    particleCount: 15,
                    angle: 90,
                    spread: 60,
                    startVelocity: 50,
                    origin: { x: 0.5, y: 0.6 },
                    colors: [questionData.color.from, questionData.color.to, '#ffffff', '#fbbf24'],
                    shapes: ['circle'],
                    gravity: 0.8,
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
            setBeakerState('clink');
            playSound(settings.errorSoundUrl);

            setTimeout(() => {
                setShakeScreen(false);
                setShakeOptionId(null);
                setFeedback(null);
                setBeakerState('idle');
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
                        gameType: 'fractions-lab', // Match ID
                    }),
                });
            }

            router.push(`/results?score=${finalScore}&total=${totalQuestions}&time=${timeSpent}&gameId=fractions-lab${studentId ? `&studentId=${studentId}` : ''}`);
        } catch (error) {
            console.error('Error saving score:', error);
            alert('حدث خطأ في حفظ النتيجة');
        }
    };

    // React Component for a simple fraction
    const FractionDisplay = ({ num, den, className = "" }: { num: number, den: number, className?: string }) => (
        <div className={`flex flex-col items-center justify-center font-black ${className}`}>
            <span className="leading-none">{num}</span>
            <div className="w-full h-1 bg-current rounded-full my-1"></div>
            <span className="leading-none">{den}</span>
        </div>
    );

    if (!gameStarted) {
        return (
            <div className="min-h-screen flex items-center justify-center p-4 bg-slate-900 relative overflow-hidden font-sans" dir="rtl">
                {/* Lab Background Grid */}
                <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] filter invert opacity-10 pointer-events-none"></div>

                {/* Glowing Orbs */}
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-500/20 rounded-full blur-[100px] pointer-events-none"></div>
                <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-[100px] pointer-events-none"></div>

                <div className="max-w-lg w-full relative z-10">
                    <div className="bg-slate-800/95 backdrop-blur-xl rounded-[3rem] shadow-[0_20px_60px_rgba(0,0,0,0.8)] p-8 text-center flex flex-col items-center border-[4px] border-slate-700 outline outline-4 outline-emerald-500/30 outline-offset-4">
                        <div className="mb-4 relative">
                            {/* Animated SVG Beaker Icon */}
                            <svg viewBox="0 0 100 120" className="w-32 h-32 drop-shadow-[0_0_15px_rgba(16,185,129,0.5)]">
                                <path d="M40,20 L40,40 L20,100 A10,10 0 0,0 30,115 L70,115 A10,10 0 0,0 80,100 L60,40 L60,20 Z" fill="rgba(255,255,255,0.1)" stroke="#cbd5e1" strokeWidth="4" strokeLinejoin="round" />
                                <path d="M25,85 L45,45 L55,45 L75,85 A5,5 0 0,1 70,95 L30,95 A5,5 0 0,1 25,85 Z" fill="#10b981" />
                                <motion.circle cx="35" cy="80" r="4" fill="white" animate={{ y: [-10, -40], opacity: [1, 0] }} transition={{ repeat: Infinity, duration: 1.5, ease: "easeOut" }} />
                                <motion.circle cx="65" cy="70" r="3" fill="white" animate={{ y: [-10, -30], opacity: [1, 0] }} transition={{ repeat: Infinity, duration: 1.2, delay: 0.5, ease: "easeOut" }} />
                                <motion.circle cx="50" cy="85" r="5" fill="white" animate={{ y: [-10, -50], opacity: [1, 0] }} transition={{ repeat: Infinity, duration: 1.8, delay: 0.2, ease: "easeOut" }} />
                            </svg>
                        </div>
                        <h1 className="text-4xl sm:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-t from-emerald-400 to-green-200 mb-4 tracking-tight drop-shadow-sm font-serif">
                            معمل الكسور
                        </h1>
                        <p className="text-xl text-emerald-200/90 mb-8 font-bold leading-relaxed">
                            أيها التلميذ العالِم، ابحث عن الكسور المتكافئة لتكمل معادلاتك! 🧪🔬
                        </p>

                        <div className="mb-6 w-full">
                            <label htmlFor="name" className="block text-emerald-400 font-bold mb-2 text-right">
                                اسم العالِم:
                            </label>
                            <input
                                type="text"
                                id="name"
                                value={studentName}
                                onChange={(e) => setStudentName(e.target.value)}
                                className="w-full px-4 py-3 bg-slate-900 border-2 border-slate-600 rounded-xl focus:border-emerald-400 focus:outline-none transition-all text-emerald-300 placeholder-slate-500 text-center text-xl font-bold font-mono shadow-inner"
                                placeholder="اكتب اسمك هنا"
                                required
                            />
                        </div>

                        <button
                            onClick={startGame}
                            className="w-full bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-black text-2xl py-4 rounded-xl shadow-[0_6px_0_#065f46] active:shadow-[0_0px_0_#065f46] active:translate-y-2 transform transition-all border-t-2 border-emerald-300/50 flex items-center justify-center gap-3"
                        >
                            <span>ادخل المعمل!</span>
                            <span>🧪</span>
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    const fillPercentage = questionData ? (questionData.baseNum / questionData.baseDen) * 100 : 50;

    return (
        <div className="min-h-screen flex items-center justify-center p-2 sm:p-4 bg-slate-950 relative overflow-hidden font-sans" dir="rtl">
            {/* Lab Environment Background */}
            <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/diagmonds-light.png')] mix-blend-screen"></div>

            {/* Ambient desk light */}
            <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-[800px] h-[400px] bg-slate-800/80 rounded-full blur-[120px] pointer-events-none"></div>

            <div className="max-w-5xl w-full relative z-10 py-6 sm:py-10">
                <motion.div
                    animate={shakeScreen ? { x: [-15, 15, -15, 15, 0], y: [-5, 5, -5, 5, 0] } : {}}
                    transition={{ duration: 0.4 }}
                    className="bg-slate-900/90 backdrop-blur-md border-[4px] border-slate-700 rounded-[3rem] sm:rounded-[4rem] shadow-[0_30px_60px_rgba(0,0,0,0.8),inset_0_0_50px_rgba(0,0,0,0.5)] p-4 sm:p-10 relative overflow-hidden"
                >
                    {/* Header Info */}
                    <div className="mb-8 relative z-10 bg-slate-800/80 p-4 sm:p-6 rounded-[2rem] border border-slate-600 shadow-xl flex flex-col sm:flex-row justify-between items-center gap-4">
                        <div className="order-2 sm:order-1 text-center sm:text-right w-full sm:w-auto">
                            <span className="block text-sm sm:text-base font-bold text-slate-400 mb-1 font-mono tracking-wider uppercase">
                                التجربة {questionNumber} / {totalQuestions}
                            </span>
                            <span className="block text-2xl font-black text-emerald-400 drop-shadow-[0_0_10px_rgba(52,211,153,0.3)]">
                                الاكتشافات: {score} 🌟
                            </span>
                        </div>
                        <div className="order-1 sm:order-2 bg-slate-950/80 border-2 border-slate-700 rounded-2xl px-6 py-3 shadow-inner w-full sm:w-auto text-center">
                            <h2 className="text-lg sm:text-2xl font-black text-slate-200">
                                أيها العالم، أي دورق يحتوي على نفس الكمية المكتوبة؟ 🧪
                            </h2>
                        </div>
                    </div>

                    {questionData && (
                        <div className="flex flex-col items-center">

                            {/* Main Beaker Area */}
                            <div className="relative w-full max-w-sm mx-auto h-[350px] sm:h-[400px] flex justify-center items-end mb-12">

                                {/* Lab Desk Surface */}
                                <div className="absolute bottom-0 w-[150%] h-16 bg-slate-800 border-t-4 border-slate-600 rounded-lg transform -translate-x-1/6 shadow-[inset_0_-10px_20px_rgba(0,0,0,0.5)] z-0"></div>

                                {/* The Big Beaker SVG */}
                                <motion.div
                                    className="relative z-10 w-48 sm:w-56 h-[300px] sm:h-[350px]"
                                    animate={beakerState === 'clink' ? { x: [-10, 10, -10, 10, 0], rotate: [-5, 5, -5, 5, 0] } : {}}
                                    transition={{ duration: 0.5 }}
                                >
                                    {/* Glass reflection back */}
                                    <svg viewBox="0 0 100 150" className="absolute inset-0 w-full h-full drop-shadow-2xl">
                                        <path d="M40,20 L40,50 L10,140 A15,15 0 0,0 25,150 L75,150 A15,15 0 0,0 90,140 L60,50 L60,20 Z" fill="rgba(255,255,255,0.02)" />
                                    </svg>

                                    {/* The Liquid Inside */}
                                    <div className="absolute inset-0 w-full h-full flex flex-col justify-end items-center pb-[5%] px-[15%]">
                                        {/* Container for liquid mask */}
                                        <div className="relative w-full overflow-hidden" style={{ height: '80%', clipPath: 'polygon(30% 0%, 70% 0%, 100% 100%, 0% 100%)', borderRadius: '0 0 15% 15%' }}>
                                            <motion.div
                                                className="absolute bottom-0 left-0 right-0 z-0"
                                                initial={{ height: 0 }}
                                                animate={{ height: `${fillPercentage}%` }}
                                                transition={{ duration: 1.5, type: 'spring', bounce: 0.3 }}
                                                style={{
                                                    background: `linear-gradient(to top, ${questionData.color.from}, ${questionData.color.to})`,
                                                    boxShadow: `0 0 30px ${questionData.color.shadow}`
                                                }}
                                            >
                                                {/* Surface wave effect */}
                                                <div className="absolute top-0 w-[200%] h-4 -left-[50%] bg-white/30 rounded-full blur-[2px] animate-[pulse_2s_ease-in-out_infinite]"></div>

                                                {/* Bubbles if correct */}
                                                {beakerState === 'bubbling' && (
                                                    <>
                                                        {Array.from({ length: 15 }).map((_, i) => (
                                                            <motion.div
                                                                key={i}
                                                                className="absolute bottom-0 rounded-full bg-white/60"
                                                                style={{
                                                                    width: Math.random() * 8 + 4,
                                                                    height: Math.random() * 8 + 4,
                                                                    left: `${Math.random() * 80 + 10}%`
                                                                }}
                                                                animate={{
                                                                    y: [0, -150 - Math.random() * 50],
                                                                    x: [0, (Math.random() - 0.5) * 30],
                                                                    opacity: [1, 0]
                                                                }}
                                                                transition={{ duration: Math.random() * 1 + 1, repeat: Infinity, ease: 'easeOut' }}
                                                            />
                                                        ))}
                                                    </>
                                                )}
                                            </motion.div>
                                        </div>
                                    </div>

                                    {/* Glass outline front */}
                                    <svg viewBox="0 0 100 150" className="absolute inset-0 w-full h-full pointer-events-none">
                                        <path d="M35,20 L65,20" stroke="rgba(255,255,255,0.8)" strokeWidth="4" strokeLinecap="round" />
                                        <path d="M40,20 L40,50 L10,140 A15,15 0 0,0 25,150 L75,150 A15,15 0 0,0 90,140 L60,50 L60,20" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="3" strokeLinejoin="round" />
                                        {/* Measurement markers */}
                                        <line x1="30" y1="120" x2="40" y2="120" stroke="rgba(255,255,255,0.5)" strokeWidth="2" />
                                        <line x1="35" y1="90" x2="45" y2="90" stroke="rgba(255,255,255,0.5)" strokeWidth="2" />
                                        <line x1="42" y1="60" x2="52" y2="60" stroke="rgba(255,255,255,0.5)" strokeWidth="2" />
                                        {/* Highlight reflection */}
                                        <path d="M20,130 L45,55" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="4" strokeLinecap="round" />
                                    </svg>

                                    {/* the target fraction placed boldly on the beaker glass */}
                                    <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none pt-12">
                                        <div className="bg-slate-900/40 backdrop-blur-sm p-4 rounded-full border-2 border-white/20 shadow-[0_0_15px_rgba(0,0,0,0.5)]">
                                            <FractionDisplay num={questionData.baseNum} den={questionData.baseDen} className="text-5xl sm:text-6xl text-white drop-shadow-md" />
                                        </div>
                                    </div>

                                </motion.div>

                            </div>

                            {/* Options Buttons (Small Beakers) */}
                            <div className="w-full flex justify-center gap-4 sm:gap-10 relative z-30 px-2 sm:px-8">
                                <AnimatePresence>
                                    {questionData.options.map((option) => {
                                        const optFill = (option.num / option.den) * 100;

                                        return (
                                            <motion.button
                                                key={option.id}
                                                whileHover={{ scale: 1.05, y: -10 }}
                                                whileTap={{ scale: 0.95 }}
                                                animate={shakeOptionId === option.id ? { x: [-10, 10, -10, 10, 0] } : {}}
                                                onClick={() => checkAnswer(option)}
                                                disabled={feedback !== null}
                                                className={`
                                                relative w-28 sm:w-40 h-40 sm:h-48 rounded-[2rem] border-[4px] flex flex-col items-center justify-end font-bold transition-all
                                                overflow-hidden group outline-none focus:outline-none
                                                ${shakeOptionId === option.id
                                                        ? 'border-red-500 bg-red-950/50 shadow-[0_0_30px_#ef4444]'
                                                        : (feedback === 'correct' && option.isCorrect)
                                                            ? 'border-emerald-500 bg-emerald-950/50 shadow-[0_0_30px_#10b981]'
                                                            : 'border-slate-600 bg-slate-800/80 hover:border-emerald-400 hover:bg-slate-800 shadow-[0_10px_20px_rgba(0,0,0,0.5)]'
                                                    }
                                            `}
                                            >

                                                {/* Mini Liquid background based on its own value */}
                                                <div className="absolute inset-0 flex items-end">
                                                    <div
                                                        className="w-full transition-all duration-1000"
                                                        style={{
                                                            height: `${Math.min(optFill, 100)}%`, // cap at 100 just in case
                                                            background: `linear-gradient(to top, ${questionData.color.from}88, ${questionData.color.to}44)`
                                                        }}
                                                    ></div>
                                                </div>

                                                {/* The option fraction */}
                                                <div className="relative z-10 mb-4 bg-slate-900/60 backdrop-blur-md p-3 sm:p-4 rounded-xl border border-slate-500 group-hover:border-white/50 transition-colors shadow-lg">
                                                    <FractionDisplay num={option.num} den={option.den} className={`text-3xl sm:text-4xl ${feedback === 'correct' && option.isCorrect ? 'text-emerald-300' : 'text-slate-200'}`} />
                                                </div>

                                                {/* Neck of the small flask */}
                                                <div className="absolute top-0 w-8 sm:w-10 h-6 bg-slate-900/50 border-x-4 border-slate-600"></div>

                                            </motion.button>
                                        )
                                    })}
                                </AnimatePresence>
                            </div>

                            {/* Feedback Overlay Message */}
                            <div className="absolute top-[45%] left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full max-w-lg px-4 z-50 pointer-events-none flex justify-center mt-[-30px]">
                                <AnimatePresence mode="wait">
                                    {feedback === 'correct' && (
                                        <motion.div
                                            key="correct"
                                            initial={{ scale: 0.5, opacity: 0, y: 30 }}
                                            animate={{ scale: 1, opacity: 1, y: 0 }}
                                            exit={{ scale: 0.5, opacity: 0, y: -30 }}
                                            className="bg-emerald-950/90 backdrop-blur-lg border-4 border-emerald-500 text-emerald-100 px-6 py-4 rounded-[2.5rem] text-center shadow-[0_0_50px_rgba(16,185,129,0.5)] flex items-center justify-center gap-4"
                                        >
                                            <span className="text-4xl sm:text-5xl drop-shadow-md animate-pulse">🌟</span>
                                            <p className="text-xl sm:text-3xl font-black drop-shadow-sm font-serif">اكتشاف علمي مذهل!</p>
                                        </motion.div>
                                    )}

                                    {feedback === 'wrong' && (
                                        <motion.div
                                            key="wrong"
                                            initial={{ scale: 0.8, opacity: 0 }}
                                            animate={{ scale: 1, opacity: 1 }}
                                            exit={{ scale: 0.8, opacity: 0 }}
                                            className="bg-red-950/90 backdrop-blur-lg border-4 border-red-600 text-red-100 px-6 py-4 rounded-[2.5rem] text-center shadow-[0_0_50px_rgba(220,38,38,0.5)] flex flex-col items-center justify-center gap-2"
                                        >
                                            <div className="flex items-center gap-3">
                                                <span className="text-4xl sm:text-5xl drop-shadow-md">💥</span>
                                                <p className="text-lg sm:text-xl font-black drop-shadow-sm leading-tight max-w-[200px] sm:max-w-none">
                                                    المقادير غير متساوية، جرب كسراً آخر!
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
