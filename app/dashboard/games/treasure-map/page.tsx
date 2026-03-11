'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Difficulty } from '@/lib/difficulty';
import confetti from 'canvas-confetti';
import { motion, AnimatePresence } from 'framer-motion';

const GRID_SIZE = 5;

export default function TreasureMapGamePage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const studentId = searchParams.get('studentId');
    const isTeacher = searchParams.get('teacher') === 'true';
    const difficulty = (searchParams.get('difficulty') || 'medium') as Difficulty;

    const [gameStarted, setGameStarted] = useState(false);
    const [studentName, setStudentName] = useState('');

    const [questionData, setQuestionData] = useState<{
        x: number;
        y: number;
        options: { id: string; x: number; y: number; isCorrect: boolean }[];
    } | null>(null);

    const [score, setScore] = useState(0);
    const [questionNumber, setQuestionNumber] = useState(0);
    const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
    const [shakeScreen, setShakeScreen] = useState(false);
    const [startTime, setStartTime] = useState<number>(0);

    // Chest animation state
    const [chestState, setChestState] = useState<'closed' | 'opening' | 'opened'>('closed');
    const [shakeOptionId, setShakeOptionId] = useState<string | null>(null);

    const [settings, setSettings] = useState({
        successSoundUrl: '', // triumphant music/coins
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
        // Points 1 to 5
        const x = Math.floor(Math.random() * GRID_SIZE) + 1;
        const y = Math.floor(Math.random() * GRID_SIZE) + 1;

        // Distractor 1: Reversed coordinates (very common mistake)
        let d1X = y;
        let d1Y = x;
        // If x == y (e.g., (3,3)), make sure distractors are different
        if (x === y) {
            d1X = x === GRID_SIZE ? x - 1 : x + 1;
            d1Y = y === 1 ? y + 1 : y - 1;
        }

        // Distractor 2: Random adjacent point
        let d2X = x + (Math.random() > 0.5 ? 1 : -1);
        let d2Y = y + (Math.random() > 0.5 ? 1 : -1);

        // Keep within bounds
        d2X = Math.max(1, Math.min(GRID_SIZE, d2X));
        d2Y = Math.max(1, Math.min(GRID_SIZE, d2Y));

        // Ensure uniqueness
        if ((d2X === x && d2Y === y) || (d2X === d1X && d2Y === d1Y)) {
            d2X = x === 1 ? 2 : 1;
            d2Y = y === 1 ? 2 : 1;
        }

        // Extra check for edge cases where math above fails uniqueness
        if ((d2X === x && d2Y === y) || (d2X === d1X && d2Y === d1Y)) {
            d2X = 5; d2Y = 5;
            if ((d2X === x && d2Y === y) || (d2X === d1X && d2Y === d1Y)) {
                d2X = 2; d2Y = 4;
            }
        }

        const opts = [
            { id: 'correct', x, y, isCorrect: true },
            { id: 'd1', x: d1X, y: d1Y, isCorrect: false },
            { id: 'd2', x: d2X, y: d2Y, isCorrect: false }
        ];

        // Shuffle
        for (let i = opts.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [opts[i], opts[j]] = [opts[j], opts[i]];
        }

        setQuestionData({
            x,
            y,
            options: opts
        });

        setChestState('closed');
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

    const checkAnswer = (selectedOpt: { id: string; x: number; y: number; isCorrect: boolean }) => {
        if (feedback !== null || !questionData) return;

        if (selectedOpt.isCorrect) {
            setFeedback('correct');
            setScore(prev => prev + 1);
            playSound(settings.successSoundUrl);
            setChestState('opening');

            setTimeout(() => {
                setChestState('opened');
            }, 500);

            // Treasure Celebration (Gold Coins Confetti)
            const duration = 2500;
            const end = Date.now() + duration;

            (function frame() {
                confetti({
                    particleCount: 8,
                    angle: 90,
                    spread: 80,
                    origin: { x: 0.5, y: 0.8 },
                    colors: ['#fcd34d', '#fbbf24', '#f59e0b', '#d97706'], // Gold tones
                    shapes: ['circle'], // Coins
                    scalar: 1.5,
                    gravity: 1.2
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
                        gameType: 'treasure-map', // Match ID
                    }),
                });
            }

            router.push(`/results?score=${finalScore}&total=${totalQuestions}&time=${timeSpent}&gameId=treasure-map${studentId ? `&studentId=${studentId}` : ''}`);
        } catch (error) {
            console.error('Error saving score:', error);
            alert('حدث خطأ في حفظ النتيجة');
        }
    };

    if (!gameStarted) {
        return (
            <div className="min-h-screen flex items-center justify-center p-4 bg-orange-950 relative overflow-hidden font-sans" dir="rtl">
                {/* Pirate Background */}
                <div className="absolute inset-0 opacity-30 bg-[url('https://www.transparenttextures.com/patterns/aged-paper.png')] pointer-events-none mix-blend-color-burn"></div>
                <div className="absolute inset-0 bg-gradient-to-t from-[#3e1d0f] to-transparent pointer-events-none"></div>

                {/* Decorative Map Corners */}
                <div className="absolute top-4 left-4 w-12 h-12 border-t-4 border-l-4 border-amber-500/50 rounded-tl-xl pointer-events-none"></div>
                <div className="absolute top-4 right-4 w-12 h-12 border-t-4 border-r-4 border-amber-500/50 rounded-tr-xl pointer-events-none"></div>
                <div className="absolute bottom-4 left-4 w-12 h-12 border-b-4 border-l-4 border-amber-500/50 rounded-bl-xl pointer-events-none"></div>
                <div className="absolute bottom-4 right-4 w-12 h-12 border-b-4 border-r-4 border-amber-500/50 rounded-br-xl pointer-events-none"></div>

                <div className="max-w-lg w-full relative z-10">
                    <div className="bg-[#fde68a] bg-opacity-95 backdrop-blur-md rounded-[2rem] shadow-[0_30px_60px_rgba(0,0,0,0.8),inset_0_0_20px_rgba(180,83,9,0.3)] p-8 text-center flex flex-col items-center border-[8px] border-amber-900 outline outline-4 outline-amber-700/50 outline-offset-4 overflow-hidden relative">
                        {/* Inner Paper Texture */}
                        <div className="absolute inset-0 opacity-40 bg-[url('https://www.transparenttextures.com/patterns/parchment.png')] mix-blend-multiply pointer-events-none z-0"></div>

                        <div className="mb-4 relative z-10">
                            {/* Treasure Box Icon */}
                            <div className="text-8xl drop-shadow-[0_15px_15px_rgba(0,0,0,0.6)] animate-pulse">
                                🏴‍☠️
                            </div>
                        </div>
                        <h1 className="text-4xl sm:text-5xl font-black text-amber-950 mb-4 tracking-tight drop-shadow-sm font-serif relative z-10">
                            خريطة الكنز
                        </h1>
                        <p className="text-xl text-amber-900 mb-8 font-bold leading-relaxed relative z-10">
                            أيها القرصان الشجاع، اقرأ الإحداثيات المنسية ببراعة واعثر على جزيرة الذهب! 🗺️🧭
                        </p>

                        <div className="mb-6 w-full relative z-10">
                            <label htmlFor="name" className="block text-amber-950 font-black mb-2 text-right">
                                اسم القبطان:
                            </label>
                            <input
                                type="text"
                                id="name"
                                value={studentName}
                                onChange={(e) => setStudentName(e.target.value)}
                                className="w-full px-4 py-3 bg-[#fffbeb] border-2 border-amber-700 rounded-xl focus:border-amber-900 focus:outline-none transition-all text-amber-950 placeholder-amber-700/50 text-center text-xl font-bold shadow-inner"
                                placeholder="اكتب اسمك هنا"
                                required
                            />
                        </div>

                        <button
                            onClick={startGame}
                            className="w-full relative z-10 bg-gradient-to-t from-red-800 to-red-600 hover:from-red-900 hover:to-red-700 text-amber-100 font-black text-2xl py-4 rounded-xl shadow-[0_6px_0_#450a0a] active:shadow-[0_0px_0_#450a0a] active:translate-y-2 transform transition-all border-2 border-red-950/50 flex items-center justify-center gap-3"
                        >
                            <span>ارفع الأشرعة!</span>
                            <span>⛵</span>
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // Mathematical Cartesian mapping
    // X is 1 to 5 (Left to Right because coordinate system is standard, though RTL usually flips right-to-left. 
    // In math, X axis usually grows to the right. Let's make it standard Math LTR style for the grid itself).
    // Y is 1 to 5 (Bottom to Top)
    // CSS Grid generates Top to Bottom, Left to Right.
    // So to map (x,y) where origin (1,1) is bottom-left:
    // col = x
    // row = GRID_SIZE - y + 1 (since row 1 is top, row 5 is bottom)

    return (
        <div className="min-h-screen flex items-center justify-center p-2 sm:p-4 bg-teal-950 relative overflow-hidden font-sans" dir="rtl">
            {/* Deep Ocean & Island Background */}
            <div className="absolute inset-0 bg-gradient-to-br from-teal-900 via-sky-900 to-blue-950 mix-blend-multiply z-0"></div>

            {/* Compass rose ambient visual */}
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-sky-400/5 rounded-full blur-[50px] pointer-events-none z-0"></div>
            <div className="absolute top-10 right-10 text-6xl opacity-10 pointer-events-none z-0 transform -rotate-45">🧭</div>

            <div className="max-w-5xl w-full relative z-10 py-6 sm:py-10">
                <motion.div
                    animate={shakeScreen ? { x: [-15, 15, -15, 15, 0], y: [-5, 5, -5, 5, 0], rotate: [-1, 1, -1, 1, 0] } : {}}
                    transition={{ duration: 0.4 }}
                    className="bg-[#fde68a] border-[8px] border-amber-900 rounded-[2rem] shadow-[0_30px_60px_rgba(0,0,0,0.8)] p-4 sm:p-8 relative overflow-hidden"
                >
                    {/* Parchment inner texture */}
                    <div className="absolute inset-0 opacity-50 bg-[url('https://www.transparenttextures.com/patterns/parchment.png')] mix-blend-multiply pointer-events-none z-0"></div>

                    {/* Burn mark decorations */}
                    <div className="absolute bottom-[-20px] left-[-20px] w-24 h-24 bg-amber-950/40 blur-xl rounded-full z-0 block"></div>
                    <div className="absolute top-[-10px] right-20 w-16 h-16 bg-amber-950/30 blur-lg rounded-full z-0 block"></div>

                    {/* Header Info */}
                    <div className="mb-6 sm:mb-8 relative z-10 bg-amber-900/10 p-4 sm:p-6 rounded-[1.5rem] border-2 border-amber-800/20 shadow-sm flex flex-col sm:flex-row justify-between items-center gap-4">
                        <div className="order-2 sm:order-1 text-center sm:text-right w-full sm:w-auto">
                            <span className="block text-sm sm:text-base font-bold text-amber-800 mb-1 font-mono tracking-wider uppercase">
                                الخريطة {questionNumber} / {totalQuestions}
                            </span>
                            <span className="block text-2xl font-black text-amber-600 drop-shadow-sm">
                                الكنوز: {score} 💎
                            </span>
                        </div>
                        <div className="order-1 sm:order-2 bg-amber-950 border-2 border-amber-700/50 rounded-2xl px-6 py-3 shadow-inner w-full sm:w-auto text-center">
                            <h2 className="text-lg sm:text-xl font-black text-amber-100 drop-shadow-md">
                                حدد موقع الكنز بدقة ليفوز به القراصنة! (س ، ص) 🗺️
                            </h2>
                        </div>
                    </div>

                    {questionData && (
                        <div className="flex flex-col items-center">

                            {/* Mathematical Grid Map (LTR for standard math reading X right, Y up) */}
                            <div className="relative mb-10 mt-4 bg-amber-50 p-6 sm:p-10 rounded-3xl border-4 border-amber-800 shadow-2xl z-20">

                                {/* Inner parchment */}
                                <div className="absolute inset-0 opacity-40 bg-[url('https://www.transparenttextures.com/patterns/aged-paper.png')] mix-blend-multiply rounded-3xl z-0 pointer-events-none"></div>

                                {/* Y-axis label */}
                                <div className="absolute top-1/2 -left-12 transform -translate-y-1/2 -rotate-90 text-amber-900 font-black text-xl tracking-widest pointer-events-none">
                                    ص (المحور الرأسي)
                                </div>

                                {/* X-axis label */}
                                <div className="absolute -bottom-10 left-1/2 transform -translate-x-1/2 text-amber-900 font-black text-xl tracking-widest pointer-events-none">
                                    س (المحور الأفقي)
                                </div>

                                {/* The Grid itself */}
                                <div className="relative z-10 flex flex-col items-center" dir="ltr">

                                    {/* Y axis numbers (left side) */}
                                    <div className="absolute left-[-30px] sm:left-[-40px] top-0 bottom-0 flex flex-col justify-around py-4">
                                        {Array.from({ length: GRID_SIZE }).map((_, i) => (
                                            <span key={i} className="font-mono font-black text-amber-800 text-lg sm:text-2xl transform -translate-y-1/2">
                                                {GRID_SIZE - i}
                                            </span>
                                        ))}
                                    </div>

                                    {/* Grid Board */}
                                    <div
                                        className="grid gap-[2px] bg-amber-800/30 border-2 border-amber-900 overflow-hidden shadow-[inset_0_0_20px_rgba(0,0,0,0.1)] relative"
                                        style={{
                                            gridTemplateColumns: `repeat(${GRID_SIZE}, minmax(0, 1fr))`
                                        }}
                                    >
                                        {Array.from({ length: GRID_SIZE * GRID_SIZE }).map((_, index) => {
                                            const col = (index % GRID_SIZE) + 1; // 1 to 5 LTR
                                            const row = GRID_SIZE - Math.floor(index / GRID_SIZE); // 5 to 1 Top to Bottom

                                            const isTreasure = col === questionData.x && row === questionData.y;

                                            return (
                                                <div
                                                    key={index}
                                                    className={`
                                                        w-10 h-10 sm:w-16 sm:h-16 md:w-20 md:h-20 flex items-center justify-center relative border border-amber-800/20
                                                        ${isTreasure ? 'bg-[#fef3c7]/60' : 'bg-[#fffbeb]/40 hover:bg-amber-100/50'}
                                                    `}
                                                >
                                                    {/* Island map features scattered randomly for flair */}
                                                    {!isTreasure && (col + row) % 3 === 0 && (
                                                        <span className="absolute opacity-20 text-xs sm:text-base pointer-events-none filter sepia pb-2">🌴</span>
                                                    )}
                                                    {!isTreasure && (col + row) % 7 === 0 && (
                                                        <span className="absolute opacity-20 text-xs sm:text-base pointer-events-none filter sepia pb-2">⛰️</span>
                                                    )}

                                                    {/* Central marker lines */}
                                                    <div className="absolute inset-0 m-auto w-2 h-2 rounded-full bg-amber-900/10 pointer-events-none"></div>

                                                    {/* Treasure Chest */}
                                                    {isTreasure && (
                                                        <AnimatePresence mode="wait">
                                                            {chestState === 'closed' && (
                                                                <motion.div
                                                                    key="closed"
                                                                    initial={false}
                                                                    animate={{ scale: [1, 1.1, 1] }}
                                                                    transition={{ duration: 2, repeat: Infinity }}
                                                                    className="text-3xl sm:text-5xl drop-shadow-[0_5px_5px_rgba(0,0,0,0.5)] z-20 cursor-pointer"
                                                                >
                                                                    {/* Simple red X marker on top of the chest for map feel */}
                                                                    <div className="absolute inset-0 flex items-center justify-center text-red-600/80 font-black text-5xl pointer-events-none transform -rotate-12 translate-y-1">❌</div>
                                                                    {/* 📦 or chest emoji */}
                                                                </motion.div>
                                                            )}
                                                            {chestState === 'opening' && (
                                                                <motion.div
                                                                    key="opening"
                                                                    initial={{ scale: 1, rotate: 0 }}
                                                                    animate={{ scale: 1.5, rotate: [0, -10, 10, -10, 10, 0] }}
                                                                    transition={{ duration: 0.5 }}
                                                                    className="text-4xl sm:text-6xl drop-shadow-[0_10px_10px_rgba(251,191,36,0.8)] z-30"
                                                                >
                                                                    🎁
                                                                </motion.div>
                                                            )}
                                                            {chestState === 'opened' && (
                                                                <motion.div
                                                                    key="opened"
                                                                    initial={{ scale: 0.5, opacity: 0 }}
                                                                    animate={{ scale: 1.5, opacity: 1 }}
                                                                    className="text-4xl sm:text-6xl drop-shadow-[0_0_20px_rgba(252,211,77,1)] z-30"
                                                                >
                                                                    💎
                                                                </motion.div>
                                                            )}
                                                        </AnimatePresence>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>

                                    {/* X axis numbers (bottom side) */}
                                    <div className="relative h-8 sm:h-10 mt-2 flex justify-around w-full px-[5px] sm:px-[10px]">
                                        {Array.from({ length: GRID_SIZE }).map((_, i) => (
                                            <span key={i} className="font-mono font-black text-amber-800 text-lg sm:text-2xl mt-1">
                                                {i + 1}
                                            </span>
                                        ))}
                                    </div>

                                </div>
                            </div>

                            {/* Options Buttons (Coordinates) */}
                            <div className="w-full grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 relative z-30 px-2 sm:px-8 mt-4">
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
                                                relative h-20 sm:h-28 rounded-2xl border-[4px] flex flex-col items-center justify-center font-bold transition-all
                                                overflow-hidden group
                                                ${shakeOptionId === option.id
                                                    ? 'border-red-600 bg-red-100 shadow-[0_8px_0_#991b1b] text-red-900'
                                                    : (feedback === 'correct' && option.isCorrect)
                                                        ? 'border-emerald-600 bg-emerald-100 shadow-[0_8px_0_#065f46] text-emerald-900'
                                                        : 'border-amber-950 bg-amber-800 hover:border-amber-700 hover:bg-amber-700 shadow-[0_8px_0_#450a0a] text-amber-100'
                                                }
                                            `}
                                            dir="ltr" // Important for (x, y) visual flow
                                        >

                                            {/* Wood texture */}
                                            <div className="absolute inset-0 opacity-40 bg-[url('https://www.transparenttextures.com/patterns/wood-pattern.png')] mix-blend-multiply pointer-events-none"></div>

                                            {/* Coordinate reading */}
                                            <span className="relative z-10 text-3xl sm:text-5xl font-mono font-black drop-shadow-md">
                                                (<span className={shakeOptionId === option.id ? '' : 'text-amber-300'}>{option.x}</span>, <span className={shakeOptionId === option.id ? '' : 'text-[#fca5a5]'}>{option.y}</span>)
                                            </span>

                                        </motion.button>
                                    ))}
                                </AnimatePresence>
                            </div>

                            {/* Feedback Overlay Message */}
                            <div className="absolute top-[40%] left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full max-w-xl px-4 z-50 pointer-events-none flex justify-center mt-[-30px]">
                                <AnimatePresence mode="wait">
                                    {feedback === 'correct' && (
                                        <motion.div
                                            key="correct"
                                            initial={{ scale: 0.5, opacity: 0, y: 30 }}
                                            animate={{ scale: 1, opacity: 1, y: 0 }}
                                            exit={{ scale: 0.5, opacity: 0, y: -30 }}
                                            className="bg-emerald-900/95 backdrop-blur-md border-4 border-emerald-400 text-emerald-100 px-6 py-4 rounded-[2rem] text-center shadow-[0_0_50px_rgba(52,211,153,0.6)] flex items-center justify-center gap-4"
                                        >
                                            <span className="text-4xl sm:text-5xl drop-shadow-md">💎</span>
                                            <p className="text-xl sm:text-2xl font-black drop-shadow-sm font-serif">لقد وجدت الكنز المخفي!</p>
                                        </motion.div>
                                    )}

                                    {feedback === 'wrong' && (
                                        <motion.div
                                            key="wrong"
                                            initial={{ scale: 0.8, opacity: 0 }}
                                            animate={{ scale: 1, opacity: 1 }}
                                            exit={{ scale: 0.8, opacity: 0 }}
                                            className="bg-red-900/95 backdrop-blur-md border-4 border-red-500 text-red-100 px-6 py-4 rounded-[2rem] text-center shadow-[0_0_50px_rgba(239,68,68,0.6)] flex flex-col items-center justify-center gap-2"
                                        >
                                            <div className="flex items-center gap-3">
                                                <span className="text-4xl sm:text-5xl drop-shadow-md animate-bounce">⚠️</span>
                                                <p className="text-lg sm:text-xl font-black drop-shadow-sm leading-tight max-w-[200px] sm:max-w-none">
                                                    احذر! ابدأ دائماً بالمحور الأفقي (س) أولاً!
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
