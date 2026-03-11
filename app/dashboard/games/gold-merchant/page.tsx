'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Difficulty } from '@/lib/difficulty';
import confetti from 'canvas-confetti';
import { motion, AnimatePresence } from 'framer-motion';

type UnitType = 'جرام' | 'كيلوجرام' | 'لتر';

interface ItemDef {
    id: string;
    name: string;
    icon: string;
    correctUnit: UnitType;
}

const ITEMS: ItemDef[] = [
    { id: 'feather', name: 'ريشة طائر نعام', icon: '🪶', correctUnit: 'جرام' },
    { id: 'watermelon', name: 'بطيخة صيفية كبيرة', icon: '🍉', correctUnit: 'كيلوجرام' },
    { id: 'apple', name: 'تفاحة يانعة', icon: '🍎', correctUnit: 'جرام' },
    { id: 'car', name: 'عربة تجار خشبية', icon: '🛒', correctUnit: 'كيلوجرام' }, // Car/Cart
    { id: 'gold_coin', name: 'عملة ذهبية ثمينة', icon: '🪙', correctUnit: 'جرام' },
    { id: 'camel', name: 'جمل عربي أصيل', icon: '🐪', correctUnit: 'كيلوجرام' },
    { id: 'paperclip', name: 'مسمار حديدي صغير', icon: '📌', correctUnit: 'جرام' },
    { id: 'chair', name: 'كرسي خشبي متين', icon: '🪑', correctUnit: 'كيلوجرام' },
    { id: 'ring', name: 'خاتم ألماس', icon: '💍', correctUnit: 'جرام' },
    { id: 'cow', name: 'بقرة حلوب الحلوب', icon: '🐄', correctUnit: 'كيلوجرام' },
];

export default function GoldMerchantGamePage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const studentId = searchParams.get('studentId');
    const isTeacher = searchParams.get('teacher') === 'true';
    const difficulty = (searchParams.get('difficulty') || 'medium') as Difficulty;

    const [gameStarted, setGameStarted] = useState(false);
    const [studentName, setStudentName] = useState('');

    const [questionData, setQuestionData] = useState<{
        item: ItemDef;
        options: { id: string; unit: UnitType }[];
    } | null>(null);

    const [score, setScore] = useState(0);
    const [questionNumber, setQuestionNumber] = useState(0);
    const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
    const [shakeScreen, setShakeScreen] = useState(false);
    const [startTime, setStartTime] = useState<number>(0);

    // Scale animation state
    const [scaleState, setScaleState] = useState<'balanced' | 'tipped' | 'dropped'>('balanced');
    const [shakeOptionId, setShakeOptionId] = useState<string | null>(null);

    const [settings, setSettings] = useState({
        successSoundUrl: '', // coins dropping expected
        errorSoundUrl: '', // drop sound
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
        // Pick a random item
        const item = ITEMS[Math.floor(Math.random() * ITEMS.length)];

        // Options
        const opts: { id: string; unit: UnitType }[] = [
            { id: 'g', unit: 'جرام' },
            { id: 'kg', unit: 'كيلوجرام' },
            { id: 'l', unit: 'لتر' },
        ];

        // Shuffle options just in case, though they are units
        for (let i = opts.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [opts[i], opts[j]] = [opts[j], opts[i]];
        }

        setQuestionData({
            item,
            options: opts
        });

        setScaleState('balanced');
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

    const checkAnswer = (selectedUnit: UnitType, optId: string) => {
        if (feedback !== null || !questionData) return;

        if (selectedUnit === questionData.item.correctUnit) {
            setFeedback('correct');
            setScore(prev => prev + 1);
            playSound(settings.successSoundUrl);
            setScaleState('tipped');

            // Celebration (Gold Coins Confetti)
            const duration = 2000;
            const end = Date.now() + duration;

            (function frame() {
                confetti({
                    particleCount: 12,
                    angle: 90,
                    spread: 80,
                    origin: { x: 0.5, y: 0.8 },
                    colors: ['#fbbf24', '#f59e0b', '#d97706', '#ffe4e6'], // Gold + some sparkle
                    shapes: ['circle'],
                    gravity: 1.5,
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
            setShakeOptionId(optId);
            setScaleState('dropped'); // Scale breaks/drops
            playSound(settings.errorSoundUrl);

            setTimeout(() => {
                setShakeScreen(false);
                setShakeOptionId(null);
                setFeedback(null);
                setScaleState('balanced');
            }, 2500);
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
                        gameType: 'gold-merchant', // Match ID
                    }),
                });
            }

            router.push(`/results?score=${finalScore}&total=${totalQuestions}&time=${timeSpent}&gameId=gold-merchant${studentId ? `&studentId=${studentId}` : ''}`);
        } catch (error) {
            console.error('Error saving score:', error);
            alert('حدث خطأ في حفظ النتيجة');
        }
    };

    if (!gameStarted) {
        return (
            <div className="min-h-screen flex items-center justify-center p-4 bg-[#4a2e1b] relative overflow-hidden font-sans" dir="rtl">
                {/* Vintage Market Background */}
                <div className="absolute inset-0 opacity-40 bg-[url('https://www.transparenttextures.com/patterns/wood-pattern.png')] pointer-events-none mix-blend-multiply"></div>
                <div className="absolute inset-0 bg-gradient-to-t from-[#2c1a0e] to-transparent pointer-events-none"></div>

                {/* Ambient lights */}
                <div className="absolute top-0 right-1/4 w-[300px] h-[300px] bg-yellow-600/30 rounded-full blur-[100px] pointer-events-none"></div>

                <div className="max-w-lg w-full relative z-10">
                    <div className="bg-[#fffbeb] bg-opacity-95 backdrop-blur-md rounded-[2rem] shadow-[0_30px_60px_rgba(0,0,0,0.8),inset_0_0_20px_rgba(180,83,9,0.3)] p-8 text-center flex flex-col items-center border-[8px] border-amber-900 outline outline-4 outline-amber-700/50 outline-offset-4 overflow-hidden relative">
                        {/* Inner Paper Texture */}
                        <div className="absolute inset-0 opacity-30 bg-[url('https://www.transparenttextures.com/patterns/aged-paper.png')] mix-blend-multiply pointer-events-none z-0"></div>

                        <div className="mb-4 relative z-10">
                            {/* Merchant Scale Icon */}
                            <div className="text-8xl drop-shadow-[0_15px_15px_rgba(0,0,0,0.6)] animate-bounce">
                                ⚖️
                            </div>
                        </div>
                        <h1 className="text-4xl sm:text-5xl font-black text-amber-950 mb-4 tracking-tight drop-shadow-sm font-serif relative z-10">
                            تاجر الذهب
                        </h1>
                        <p className="text-xl text-amber-900 mb-8 font-bold leading-relaxed relative z-10">
                            أيها التاجر الذكي، استخدم ميزانك ببراعة لاختيار وحدة القياس الأنسب! 💰⚖️
                        </p>

                        <div className="mb-6 w-full relative z-10">
                            <label htmlFor="name" className="block text-amber-950 font-black mb-2 text-right">
                                اسم كبير التجار:
                            </label>
                            <input
                                type="text"
                                id="name"
                                value={studentName}
                                onChange={(e) => setStudentName(e.target.value)}
                                className="w-full px-4 py-3 bg-[#fef3c7] border-2 border-amber-700 rounded-xl focus:border-amber-900 focus:outline-none transition-all text-amber-950 placeholder-amber-700/50 text-center text-xl font-bold shadow-inner"
                                placeholder="اكتب اسمك هنا"
                                required
                            />
                        </div>

                        <button
                            onClick={startGame}
                            className="w-full relative z-10 bg-gradient-to-t from-yellow-700 to-yellow-500 hover:from-yellow-800 hover:to-yellow-600 text-amber-50 font-black text-2xl py-4 rounded-xl shadow-[0_6px_0_#713f12] active:shadow-[0_0px_0_#713f12] active:translate-y-2 transform transition-all border-2 border-yellow-200/50 flex items-center justify-center gap-3"
                        >
                            <span>افتح المتجر!</span>
                            <span>🏪</span>
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center p-2 sm:p-4 bg-[url('https://www.transparenttextures.com/patterns/wood-pattern.png')] bg-[#4a2e1b] relative overflow-hidden font-sans" dir="rtl">
            {/* Deep Market Tent Background */}
            <div className="absolute inset-0 bg-gradient-to-br from-amber-900/40 via-[#2c1a0e]/80 to-[#1a0f08] mix-blend-multiply z-0"></div>

            {/* Ambient lamp glow */}
            <div className="absolute top-10 left-10 w-[400px] h-[400px] bg-yellow-500/10 rounded-full blur-[80px] pointer-events-none z-0"></div>

            <div className="max-w-5xl w-full relative z-10 py-6 sm:py-10">
                <motion.div
                    animate={shakeScreen ? { x: [-15, 15, -15, 15, 0], y: [-5, 5, -5, 5, 0] } : {}}
                    transition={{ duration: 0.4 }}
                    className="bg-amber-100/95 backdrop-blur-md border-[8px] border-amber-900 rounded-[2rem] shadow-[0_30px_60px_rgba(0,0,0,0.8),inset_0_0_50px_rgba(180,83,9,0.3)] p-4 sm:p-8 relative overflow-hidden"
                >
                    {/* Inner texture */}
                    <div className="absolute inset-0 opacity-40 bg-[url('https://www.transparenttextures.com/patterns/aged-paper.png')] mix-blend-multiply pointer-events-none z-0"></div>

                    {/* Header Info */}
                    <div className="mb-8 sm:mb-12 relative z-10 bg-amber-900/10 p-4 sm:p-6 rounded-[1.5rem] border-2 border-amber-800/20 shadow-sm flex flex-col sm:flex-row justify-between items-center gap-4">
                        <div className="order-2 sm:order-1 text-center sm:text-right w-full sm:w-auto">
                            <span className="block text-sm sm:text-base font-bold text-amber-800 mb-1 font-mono tracking-wider uppercase">
                                وزن {questionNumber} / {totalQuestions}
                            </span>
                            <span className="block text-2xl font-black text-amber-700 drop-shadow-sm">
                                العملات: {score} 🪙
                            </span>
                        </div>
                        <div className="order-1 sm:order-2 bg-gradient-to-b from-amber-800 to-amber-950 border-2 border-amber-600 rounded-2xl px-6 py-4 shadow-[0_10px_20px_rgba(0,0,0,0.5),inset_0_2px_5px_rgba(255,255,255,0.2)] w-full sm:w-auto text-center">
                            <h2 className="text-xl sm:text-2xl font-black text-amber-100 drop-shadow-md leading-relaxed">
                                أيها التاجر، ما هي الوحدة الأنسب لقياس هذا الصنف؟ ⚖️
                            </h2>
                        </div>
                    </div>

                    {questionData && (
                        <div className="flex flex-col items-center">

                            {/* The Balance Scale Scene */}
                            <div className="relative w-full max-w-lg mx-auto h-[350px] sm:h-[400px] flex justify-center items-end mb-16">

                                {/* Wooden Desk Surface */}
                                <div className="absolute bottom-4 sm:bottom-0 w-[120%] h-12 bg-[#5c3a21] border-t-4 border-[#3e2716] rounded-t-xl shadow-[inset_0_-10px_20px_rgba(0,0,0,0.8)] z-0"></div>
                                <div className="absolute bottom-4 sm:bottom-0 left-0 w-full h-12 opacity-50 bg-[url('https://www.transparenttextures.com/patterns/wood-pattern.png')] z-0 pointer-events-none mix-blend-multiply"></div>

                                {/* Scale Base */}
                                <div className="absolute bottom-16 sm:bottom-12 w-48 h-12 bg-gradient-to-b from-yellow-700 to-yellow-900 rounded-t-[2rem] border-2 border-yellow-600 shadow-[0_10px_20px_rgba(0,0,0,0.8)] z-10 flex justify-center">
                                    <div className="w-10 h-full bg-yellow-800 opacity-50 rounded-t-lg"></div>
                                </div>
                                <div className="absolute bottom-28 sm:bottom-24 w-6 h-64 bg-gradient-to-r from-yellow-800 via-yellow-600 to-yellow-900 rounded-t-full border border-yellow-500/50 shadow-xl z-10"></div>
                                {/* Top pivot */}
                                <div className="absolute bottom-[330px] sm:bottom-[310px] w-12 h-12 rounded-full bg-gradient-to-br from-yellow-500 to-yellow-800 shadow-md z-30 border-2 border-yellow-400">
                                    <div className="absolute inset-[25%] rounded-full bg-yellow-900 shadow-inner"></div>
                                </div>

                                {/* Scale Arm & Pans Container - Animates on tip */}
                                <motion.div
                                    className="absolute bottom-[320px] sm:bottom-[300px] w-full max-w-[400px] sm:max-w-[450px] z-20 origin-bottom"
                                    animate={{
                                        rotate: scaleState === 'tipped' ? (questionData.item.correctUnit === 'كيلوجرام' ? -15 : 15) // kg heavy left, g heavy right
                                            : scaleState === 'dropped' ? (Math.random() > 0.5 ? -25 : 25) // Fail tilts hard
                                                : 0  // balanced
                                    }}
                                    transition={scaleState === 'dropped' ? { type: "spring", stiffness: 200, damping: 10 } : { duration: 1, type: "spring", bounce: 0.4 }}
                                >
                                    {/* The Horizontal Bar */}
                                    <div className="absolute top-0 left-0 right-0 h-4 bg-gradient-to-b from-yellow-600 to-yellow-800 rounded-full border border-yellow-500 shadow-xl"></div>

                                    {/* Left Pan (The Item) */}
                                    <div className="absolute top-2 left-4 w-32 flex flex-col items-center origin-top"
                                        style={{ transform: scaleState !== 'balanced' ? 'rotate(' + (scaleState === 'tipped' ? (questionData.item.correctUnit === 'كيلوجرام' ? 15 : -15) : (Math.random() > 0.5 ? 25 : -25)) + 'deg)' : 'none', transition: 'transform 1s' }}
                                    >
                                        {/* Strings */}
                                        <svg width="100%" height="100" viewBox="0 0 100 100" className="z-10">
                                            <line x1="50" y1="0" x2="20" y2="100" stroke="#b45309" strokeWidth="2" />
                                            <line x1="50" y1="0" x2="50" y2="100" stroke="#b45309" strokeWidth="2" />
                                            <line x1="50" y1="0" x2="80" y2="100" stroke="#b45309" strokeWidth="2" />
                                        </svg>
                                        {/* The Pan Plate */}
                                        <div className="w-full h-8 bg-gradient-to-b from-yellow-600 to-yellow-900 rounded-[50%] -mt-4 shadow-[0_15px_15px_rgba(0,0,0,0.5)] border-t border-yellow-500 relative flex items-end justify-center">

                                            {/* Dropped item animation */}
                                            <AnimatePresence>
                                                <motion.div
                                                    className="absolute bottom-4 z-20"
                                                    animate={scaleState === 'dropped' ? { y: 200, rotate: 180, opacity: 0 } : { y: 0, rotate: 0, opacity: 1 }}
                                                    transition={{ duration: 0.8, ease: "easeIn" }}
                                                >
                                                    <div className="text-6xl sm:text-7xl drop-shadow-[0_10px_10px_rgba(0,0,0,0.5)]">
                                                        {questionData.item.icon}
                                                    </div>
                                                </motion.div>
                                            </AnimatePresence>

                                            {/* Item name badge */}
                                            <div className="absolute -bottom-10 bg-amber-950/80 text-amber-100 px-3 py-1 rounded-full text-sm font-bold shadow-md w-max border border-amber-700/50">
                                                {questionData.item.name}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Right Pan (The Weights - visually implies where weights go) */}
                                    <div className="absolute top-2 right-4 w-32 flex flex-col items-center origin-top"
                                        style={{ transform: scaleState !== 'balanced' ? 'rotate(' + (scaleState === 'tipped' ? (questionData.item.correctUnit === 'كيلوجرام' ? 15 : -15) : (Math.random() > 0.5 ? 25 : -25)) + 'deg)' : 'none', transition: 'transform 1s' }}
                                    >
                                        <svg width="100%" height="100" viewBox="0 0 100 100" className="z-10">
                                            <line x1="50" y1="0" x2="20" y2="100" stroke="#b45309" strokeWidth="2" />
                                            <line x1="50" y1="0" x2="50" y2="100" stroke="#b45309" strokeWidth="2" />
                                            <line x1="50" y1="0" x2="80" y2="100" stroke="#b45309" strokeWidth="2" />
                                        </svg>
                                        <div className="w-full h-8 bg-gradient-to-b from-yellow-600 to-yellow-900 rounded-[50%] -mt-4 shadow-[0_15px_15px_rgba(0,0,0,0.5)] border-t border-yellow-500 relative flex items-end justify-center">

                                            <AnimatePresence>
                                                {scaleState === 'tipped' && (
                                                    <motion.div
                                                        initial={{ opacity: 0, y: -50 }}
                                                        animate={{ opacity: 1, y: 0 }}
                                                        className="absolute bottom-4 text-6xl drop-shadow-[0_10px_10px_rgba(0,0,0,0.5)] z-20"
                                                    >
                                                        {/* Visual feedback of weight */}
                                                        {questionData.item.correctUnit === 'كيلوجرام' ? '📦' : '⚖️'}
                                                    </motion.div>
                                                )}
                                                {scaleState === 'dropped' && (
                                                    <motion.div
                                                        initial={{ opacity: 0 }}
                                                        animate={{ opacity: 1, y: [0, -20, 0] }}
                                                        transition={{ duration: 0.5 }}
                                                        className="absolute bottom-4 text-6xl drop-shadow-[0_10px_10px_rgba(0,0,0,0.5)] z-20 filter grayscale"
                                                    >
                                                        🚫
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>

                                        </div>
                                    </div>
                                </motion.div>

                            </div>

                            {/* Options Buttons (Weights) */}
                            <div className="w-full flex flex-wrap justify-center gap-4 sm:gap-8 relative z-30 px-2 sm:px-8 mt-4">
                                <AnimatePresence>
                                    {questionData.options.map((option) => (
                                        <motion.button
                                            key={option.id}
                                            whileHover={{ scale: 1.05, y: -5 }}
                                            whileTap={{ scale: 0.95 }}
                                            animate={shakeOptionId === option.id ? { x: [-10, 10, -10, 10, 0] } : {}}
                                            onClick={() => checkAnswer(option.unit, option.id)}
                                            disabled={feedback !== null}
                                            className={`
                                                relative w-[140px] h-[100px] sm:w-[180px] sm:h-[130px] rounded-t-3xl rounded-b-lg border-[6px] border-b-[12px] flex flex-col items-center justify-center font-bold transition-all
                                                overflow-hidden shadow-[0_20px_20px_rgba(0,0,0,0.4)] group
                                                ${shakeOptionId === option.id
                                                    ? 'border-red-900 bg-red-800 text-red-100 shadow-[0_0_30px_#7f1d1d]'
                                                    : (feedback === 'correct' && option.unit === questionData.item.correctUnit)
                                                        ? 'border-emerald-700 bg-emerald-600 text-emerald-50 shadow-[0_0_30px_#047857]'
                                                        : 'border-slate-800 bg-gradient-to-b from-slate-500 to-slate-700 text-slate-100 hover:border-slate-600 hover:from-slate-400 hover:to-slate-600' // Metallic iron look
                                                }
                                            `}
                                        >

                                            {/* Metallic shine */}
                                            <div className="absolute top-0 left-0 right-0 h-1/3 bg-white/20 rounded-t-[1.5rem] pointer-events-none"></div>

                                            {/* Button text */}
                                            <span className="relative z-10 text-2xl sm:text-3xl font-black drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                                                {option.unit}
                                            </span>

                                            {/* Sub text */}
                                            <span className="text-sm font-mono mt-1 opacity-70">
                                                {option.unit === 'جرام' ? 'للأشياء الخفيفة' : option.unit === 'كيلوجرام' ? 'للأشياء الثقيلة' : 'للسوائل'}
                                            </span>

                                            {/* Top ring/handle simulation */}
                                            <div className="absolute -top-4 w-8 h-8 rounded-full border-4 border-slate-800/50 -z-10 bg-transparent"></div>

                                        </motion.button>
                                    ))}
                                </AnimatePresence>
                            </div>

                            {/* Feedback Overlay Message */}
                            <div className="absolute top-[50%] left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full max-w-xl px-4 z-50 pointer-events-none flex justify-center mt-[-40px]">
                                <AnimatePresence mode="wait">
                                    {feedback === 'correct' && (
                                        <motion.div
                                            key="correct"
                                            initial={{ scale: 0.5, opacity: 0, y: 30 }}
                                            animate={{ scale: 1, opacity: 1, y: 0 }}
                                            exit={{ scale: 0.5, opacity: 0, y: -30 }}
                                            className="bg-emerald-950/95 backdrop-blur-md border-4 border-emerald-500 text-emerald-100 px-8 py-5 rounded-[2rem] text-center shadow-[0_0_60px_rgba(16,185,129,0.8)] flex items-center justify-center gap-4"
                                        >
                                            <span className="text-5xl sm:text-6xl drop-shadow-md">💰</span>
                                            <p className="text-2xl sm:text-4xl font-black drop-shadow-sm font-serif">قياس مثالي أيها التاجر!</p>
                                        </motion.div>
                                    )}

                                    {feedback === 'wrong' && (
                                        <motion.div
                                            key="wrong"
                                            initial={{ scale: 0.8, opacity: 0 }}
                                            animate={{ scale: 1, opacity: 1 }}
                                            exit={{ scale: 0.8, opacity: 0 }}
                                            className="bg-red-950/95 backdrop-blur-md border-4 border-red-600 text-red-100 px-6 py-4 rounded-[2rem] text-center shadow-[0_0_50px_rgba(185,28,28,0.8)] flex flex-col items-center justify-center gap-2"
                                        >
                                            <div className="flex items-center gap-3">
                                                <span className="text-4xl sm:text-5xl drop-shadow-md animate-bounce">⚠️</span>
                                                <p className="text-lg sm:text-xl font-black drop-shadow-sm leading-tight max-w-[250px] sm:max-w-none">
                                                    تذكر: الجرام للأشياء الخفيفة والكيلوجرام للثقيلة!
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
