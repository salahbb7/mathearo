'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Difficulty } from '@/lib/difficulty';
import confetti from 'canvas-confetti';
import { motion, AnimatePresence } from 'framer-motion';

export default function RobotSorterGamePage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const studentId = searchParams.get('studentId');
    const isTeacher = searchParams.get('teacher') === 'true';
    const difficulty = (searchParams.get('difficulty') || 'medium') as Difficulty;

    const [gameStarted, setGameStarted] = useState(false);
    const [studentName, setStudentName] = useState('');

    const [questionData, setQuestionData] = useState<{
        targetNumber: number;
        isEven: boolean;
    } | null>(null);

    const [score, setScore] = useState(0);
    const [questionNumber, setQuestionNumber] = useState(0);
    const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
    const [shakeScreen, setShakeScreen] = useState(false);
    const [startTime, setStartTime] = useState<number>(0);

    const [gearState, setGearState] = useState<'dropping' | 'even-bin' | 'odd-bin' | 'sparking'>('dropping');

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
        // Number range scales with difficulty
        let num;
        if (difficulty === 'easy') {
            num = Math.floor(Math.random() * 20) + 1; // 1-20 only
        } else if (difficulty === 'hard') {
            num = Math.floor(Math.random() * 9999) + 1; // 1-9999
        } else {
            // medium: 50% small (1-20), 50% big (21-999)
            if (Math.random() < 0.5) {
                num = Math.floor(Math.random() * 20) + 1;
            } else {
                num = Math.floor(Math.random() * 979) + 21;
            }
        }

        setQuestionData({
            targetNumber: num,
            isEven: num % 2 === 0,
        });

        setGearState('dropping');
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

    const checkAnswer = (selectedIsEven: boolean) => {
        if (feedback !== null || !questionData) return;

        const isCorrect = selectedIsEven === questionData.isEven;

        if (isCorrect) {
            setFeedback('correct');
            setScore(prev => prev + 1);
            playSound(settings.successSoundUrl);
            setGearState(selectedIsEven ? 'even-bin' : 'odd-bin');

            // Robot/Gear Celebration
            const duration = 2000;
            const end = Date.now() + duration;

            (function frame() {
                confetti({
                    particleCount: 5,
                    angle: selectedIsEven ? 135 : 45, // Assuming Even is on the right visually in RTL layout, meaning origin x is ~0.7
                    spread: 80,
                    origin: { x: selectedIsEven ? 0.75 : 0.25, y: 0.8 },
                    colors: ['#06b6d4', '#e2e8f0', '#94a3b8', '#0ea5e9'],
                    shapes: ['square'],
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
            setGearState('sparking');
            playSound(settings.errorSoundUrl);

            setTimeout(() => {
                setShakeScreen(false);
                setFeedback(null);
                if (gearState !== 'even-bin' && gearState !== 'odd-bin') {
                    setGearState('dropping');
                }
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
                        gameType: 'robot-sorter', // Match ID
                    }),
                });
            }

            router.push(`/results?score=${finalScore}&total=${totalQuestions}&time=${timeSpent}&gameId=robot-sorter${studentId ? `&studentId=${studentId}` : ''}`);
        } catch (error) {
            console.error('Error saving score:', error);
            alert('حدث خطأ في حفظ النتيجة');
        }
    };

    const formatNumber = (num: number) => num.toLocaleString('en-US');

    // Animations for the gear
    const gearAnimations = {
        'dropping': { x: 0, y: 0, scale: 1, rotate: 360, opacity: 1 },
        'even-bin': { x: 150, y: 250, scale: 0.4, rotate: 720, opacity: 0 }, // Moves right (in RTL context) / left (visual) - will adjust flex
        'odd-bin': { x: -150, y: 250, scale: 0.4, rotate: -720, opacity: 0 }, // Moves left
        'sparking': { x: 0, y: -50, scale: 1.2, rotate: [0, 15, -15, 10, -10, 0], opacity: 1 },
    };

    const gearTransitions = {
        'dropping': { y: { type: "spring", stiffness: 100, damping: 12 }, rotate: { duration: 20, repeat: Infinity, ease: "linear" } },
        'even-bin': { duration: 0.8, ease: "easeInOut" },
        'odd-bin': { duration: 0.8, ease: "easeInOut" },
        'sparking': { duration: 0.5, type: 'spring' },
    };

    if (!gameStarted) {
        return (
            <div className="min-h-screen flex items-center justify-center p-4 bg-slate-900 relative overflow-hidden font-sans" dir="rtl">
                {/* Circuit Grid Background */}
                <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/black-scales.png')] mix-blend-color-dodge pointer-events-none filter sepia hue-rotate-180"></div>
                <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] pointer-events-none"></div>

                <div className="max-w-lg w-full relative z-10">
                    <div className="bg-slate-800/90 backdrop-blur-xl rounded-[2.5rem] shadow-[0_20px_60px_rgba(0,0,0,0.8)] p-8 text-center flex flex-col items-center border-[6px] border-slate-700 outline outline-4 outline-cyan-500/20 outline-offset-4">
                        <div className="mb-4 text-8xl drop-shadow-[0_0_20px_rgba(34,211,238,0.5)] transform -rotate-12 animate-[spin_10s_linear_infinite]">
                            ⚙️
                        </div>
                        <h1 className="text-4xl sm:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-t from-cyan-400 to-blue-300 mb-4 tracking-tight drop-shadow-sm">
                            فرّاز الروبوتات
                        </h1>
                        <p className="text-xl text-cyan-200/80 mb-8 font-bold leading-relaxed">
                            افحص التروس ورتّب الأعداد إلى زوجية أو فردية! 🤖🔢
                        </p>

                        <div className="mb-6 w-full">
                            <label htmlFor="name" className="block text-cyan-400 font-bold mb-2 text-right">
                                اسم المُبرمج:
                            </label>
                            <input
                                type="text"
                                id="name"
                                value={studentName}
                                onChange={(e) => setStudentName(e.target.value)}
                                className="w-full px-4 py-3 bg-slate-900 border-2 border-cyan-800 rounded-xl focus:border-cyan-400 focus:outline-none transition-all text-cyan-300 placeholder-slate-600 text-center text-xl font-bold shadow-inner"
                                placeholder="اكتب اسمك هنا"
                                required
                            />
                        </div>

                        <button
                            onClick={startGame}
                            className="w-full bg-gradient-to-r from-cyan-600 to-blue-700 hover:from-cyan-500 hover:to-blue-600 text-white font-black text-2xl py-4 rounded-xl shadow-[0_6px_0_#1e3a8a] active:shadow-[0_0px_0_#1e3a8a] active:translate-y-2 transform transition-all border-t-2 border-cyan-300/50 flex items-center justify-center gap-3"
                        >
                            <span>شغّل المصنع!</span>
                            <span>🏭</span>
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-slate-950 relative overflow-hidden font-sans" dir="rtl">
            {/* Tech Factory Background */}
            <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/black-scales.png')] pointer-events-none mix-blend-lighter"></div>

            {/* Ambient Lights */}
            <div className="absolute top-0 left-1/4 w-96 h-96 bg-cyan-900/40 rounded-full blur-[100px] pointer-events-none"></div>
            <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-900/40 rounded-full blur-[100px] pointer-events-none"></div>

            <div className="max-w-5xl w-full relative z-10 py-10 pt-4 sm:pt-10">
                <motion.div
                    animate={shakeScreen ? { x: [-15, 15, -15, 15, 0], y: [-5, 5, -5, 5, 0] } : {}}
                    transition={{ duration: 0.4 }}
                    className="bg-slate-900 border-[6px] border-slate-700 rounded-[3rem] shadow-[0_30px_60px_rgba(0,0,0,0.8),inset_0_0_50px_rgba(0,0,0,0.5)] p-6 sm:p-10 relative overflow-hidden"
                >
                    {/* Metal rivots */}
                    <div className="absolute top-4 left-4 w-4 h-4 rounded-full bg-slate-600 shadow-inner"></div>
                    <div className="absolute top-4 right-4 w-4 h-4 rounded-full bg-slate-600 shadow-inner"></div>
                    <div className="absolute bottom-4 left-4 w-4 h-4 rounded-full bg-slate-600 shadow-inner"></div>
                    <div className="absolute bottom-4 right-4 w-4 h-4 rounded-full bg-slate-600 shadow-inner"></div>

                    {/* Progress Header */}
                    <div className="mb-8 relative z-10 bg-slate-800/80 p-4 rounded-2xl border border-slate-600 shadow-lg">
                        <div className="flex justify-between items-center mb-4 text-center sm:text-right flex-col sm:flex-row gap-4">
                            <div className="order-2 sm:order-1 text-right flex-1 w-full">
                                <span className="block text-sm sm:text-base font-bold text-cyan-500 mb-1 tracking-widest uppercase font-mono">
                                    الترس رقم {questionNumber} / {totalQuestions}
                                </span>
                                <span className="block text-2xl font-black text-white drop-shadow-[0_0_10px_rgba(34,211,238,0.5)]">
                                    التروس الدقيقة: {score} ⚙️
                                </span>
                            </div>
                            <div className="order-1 sm:order-2">
                                <h2 className="text-xl sm:text-2xl font-black text-cyan-300 drop-shadow-md bg-slate-900 border-2 border-cyan-800/50 px-6 py-2 rounded-xl inline-block">
                                    هل هذا العدد زوجي أم فردي؟ 🤖
                                </h2>
                            </div>
                        </div>
                        <div className="w-full bg-slate-950 rounded-full h-3 overflow-hidden border-t-2 border-slate-700 shadow-inner mt-2">
                            <motion.div
                                className="bg-gradient-to-r from-cyan-600 to-blue-400 h-full rounded-full relative"
                                initial={{ width: 0 }}
                                animate={{ width: `${(questionNumber / totalQuestions) * 100}%` }}
                                transition={{ duration: 0.5 }}
                            >
                                <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
                            </motion.div>
                        </div>
                    </div>

                    {questionData && (
                        <div className="relative flex flex-col items-center min-h-[400px]">

                            {/* The Conveyor / Claw Area */}
                            <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-32 h-20 bg-slate-800 border-x-4 border-b-4 border-slate-600 rounded-b-xl shadow-lg z-0 flex justify-center">
                                {/* Claw arms */}
                                <div className="absolute -bottom-6 left-2 w-4 h-12 bg-slate-500 rounded-full border-2 border-slate-400 origin-top transform rotate-12"></div>
                                <div className="absolute -bottom-6 right-2 w-4 h-12 bg-slate-500 rounded-full border-2 border-slate-400 origin-top transform -rotate-12"></div>
                            </div>

                            {/* The Gear with Number */}
                            <div className="relative z-20 w-full h-[250px] flex justify-center mt-12">
                                <motion.div
                                    initial={{ y: -200, opacity: 0 }}
                                    animate={gearAnimations[gearState]}
                                    // @ts-ignore
                                    transition={gearTransitions[gearState]}
                                    className={`relative w-40 h-40 sm:w-48 sm:h-48 rounded-full flex items-center justify-center shadow-2xl transition-colors duration-300 ${gearState === 'sparking' ? 'bg-red-900/90 shadow-[0_0_50px_#7f1d1d]' : 'bg-slate-700 shadow-[0_0_30px_rgba(34,211,238,0.2)]'}`}
                                >
                                    {/* Gear Teeth using SVG */}
                                    <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full text-slate-500 drop-shadow-md">
                                        <g stroke="currentColor" strokeWidth="8" fill="none">
                                            {Array.from({ length: 8 }).map((_, i) => (
                                                <line key={i} x1="50" y1="50" x2="50" y2="5" transform={`rotate(${i * 45} 50 50)`} />
                                            ))}
                                            <circle cx="50" cy="50" r="40" fill="currentColor" />
                                        </g>
                                    </svg>

                                    {/* Inner Circle / Display display */}
                                    <div className={`relative z-10 w-28 h-28 sm:w-36 sm:h-36 rounded-full border-[6px] flex items-center justify-center bg-slate-900 ${gearState === 'sparking' ? 'border-red-500 shadow-[inset_0_0_20px_#ef4444]' : 'border-cyan-500 shadow-[inset_0_0_20px_rgba(34,211,238,0.5)]'}`}>
                                        <span className={`text-4xl sm:text-5xl font-black font-mono tracking-wider drop-shadow-[0_0_10px_currentColor] ${gearState === 'sparking' ? 'text-red-400' : 'text-cyan-300'}`} dir="ltr">
                                            {formatNumber(questionData.targetNumber)}
                                        </span>
                                    </div>
                                </motion.div>
                            </div>

                            {/* Bins / Buttons */}
                            <div className="w-full flex justify-between sm:justify-center items-end gap-4 sm:gap-16 mt-auto px-2 relative z-10 w-full max-w-2xl mx-auto pb-4">
                                {/* Using RTL, right side is visually right, left is left. Let's make Right = Even, Left = Odd */}

                                {/* Even Bin Button */}
                                <motion.button
                                    whileHover={{ scale: 1.05, y: -5 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => checkAnswer(true)} // true = isEven
                                    disabled={feedback !== null}
                                    className={`
                                        flex-1 h-32 sm:h-40 rounded-t-3xl border-t-[8px] border-x-[8px] border-b-[8px] border-b-transparent relative overflow-hidden transition-all flex flex-col items-center justify-start pt-6
                                        bg-slate-800 shadow-[0_-10px_30px_rgba(0,0,0,0.5)] outline outline-2 outline-black/50
                                        ${feedback === 'correct' && questionData.isEven
                                            ? 'border-green-500 bg-green-900 shadow-[0_-15px_40px_rgba(34,197,94,0.4),inset_0_20px_40px_rgba(34,197,94,0.2)]'
                                            : 'border-slate-600 hover:border-cyan-400 hover:bg-slate-700'
                                        }
                                        ${gearState === 'sparking' && questionData.isEven ? 'border-red-500' : ''}
                                    `}
                                >
                                    {/* Caution tape on edge */}
                                    <div className="absolute top-0 w-full h-3 bg-[repeating-linear-gradient(45deg,#22d3ee,#22d3ee_10px,#0f172a_10px,#0f172a_20px)] opacity-50"></div>
                                    <span className="text-2xl sm:text-4xl">🟢</span>
                                    <span className={`text-xl sm:text-2xl font-black mt-2 ${feedback === 'correct' && questionData.isEven ? 'text-green-300 drop-shadow-[0_0_8px_#86efac]' : 'text-cyan-400'}`}>
                                        عدد زوجي
                                    </span>
                                </motion.button>

                                {/* Odd Bin Button */}
                                <motion.button
                                    whileHover={{ scale: 1.05, y: -5 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => checkAnswer(false)} // false = isEven
                                    disabled={feedback !== null}
                                    className={`
                                        flex-1 h-32 sm:h-40 rounded-t-3xl border-t-[8px] border-x-[8px] border-b-[8px] border-b-transparent relative overflow-hidden transition-all flex flex-col items-center justify-start pt-6
                                        bg-slate-800 shadow-[0_-10px_30px_rgba(0,0,0,0.5)] outline outline-2 outline-black/50
                                        ${feedback === 'correct' && !questionData.isEven
                                            ? 'border-purple-500 bg-purple-900 shadow-[0_-15px_40px_rgba(168,85,247,0.4),inset_0_20px_40px_rgba(168,85,247,0.2)]'
                                            : 'border-slate-600 hover:border-blue-400 hover:bg-slate-700'
                                        }
                                        ${gearState === 'sparking' && !questionData.isEven ? 'border-red-500' : ''}
                                    `}
                                >
                                    {/* Caution tape on edge */}
                                    <div className="absolute top-0 w-full h-3 bg-[repeating-linear-gradient(45deg,#3b82f6,#3b82f6_10px,#0f172a_10px,#0f172a_20px)] opacity-50"></div>
                                    <span className="text-2xl sm:text-4xl">🟣</span>
                                    <span className={`text-xl sm:text-2xl font-black mt-2 ${feedback === 'correct' && !questionData.isEven ? 'text-purple-300 drop-shadow-[0_0_8px_#d8b4fe]' : 'text-blue-400'}`}>
                                        عدد فردي
                                    </span>
                                </motion.button>

                            </div>

                            {/* Feedback Overlay Message centered */}
                            <div className="absolute top-[40%] left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full max-w-xl px-4 z-30 pointer-events-none">
                                <AnimatePresence mode="wait">
                                    {feedback === 'correct' && (
                                        <motion.div
                                            key="correct"
                                            initial={{ scale: 0.5, opacity: 0, y: 30 }}
                                            animate={{ scale: 1, opacity: 1, y: 0 }}
                                            exit={{ scale: 0.5, opacity: 0, y: -30 }}
                                            className="bg-green-900/90 backdrop-blur-md border-4 border-green-500 text-green-100 px-6 py-4 rounded-[2rem] text-center shadow-[0_0_50px_rgba(34,197,94,0.6)] flex items-center justify-center gap-4"
                                        >
                                            <span className="text-4xl drop-shadow-md">✔️</span>
                                            <p className="text-xl sm:text-2xl font-black drop-shadow-md">فرز دقيق أيها المهندس! ⚙️</p>
                                        </motion.div>
                                    )}

                                    {feedback === 'wrong' && (
                                        <motion.div
                                            key="wrong"
                                            initial={{ scale: 0.8, opacity: 0 }}
                                            animate={{ scale: 1, opacity: 1 }}
                                            exit={{ scale: 0.8, opacity: 0 }}
                                            className="bg-red-900/90 backdrop-blur-md border-4 border-red-500 text-red-100 px-6 py-4 rounded-[2rem] text-center shadow-[0_0_50px_rgba(239,68,68,0.6)] flex items-center justify-center gap-4"
                                        >
                                            <span className="text-4xl drop-shadow-md">⚠️</span>
                                            <p className="text-xl sm:text-2xl font-black drop-shadow-md">انظر إلى خانة الآحاد جيداً!</p>
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
