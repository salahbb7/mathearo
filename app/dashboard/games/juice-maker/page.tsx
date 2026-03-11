'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Difficulty } from '@/lib/difficulty';
import confetti from 'canvas-confetti';
import { motion, AnimatePresence } from 'framer-motion';

type UnitType = 'مليلتر' | 'لتر' | 'جرام';

interface ItemDef {
    id: string;
    name: string;
    icon: string;
    correctUnit: 'مليلتر' | 'لتر';
}

const ITEMS: ItemDef[] = [
    { id: 'dropper', name: 'قطارة الدواء', icon: '💧', correctUnit: 'مليلتر' },
    { id: 'bottle', name: 'زجاجة ماء كبيرة', icon: '🧴', correctUnit: 'لتر' },
    { id: 'coffee', name: 'فنجان قهوة', icon: '☕', correctUnit: 'مليلتر' },
    { id: 'pool', name: 'مسبح عائلي', icon: '🏊', correctUnit: 'لتر' },
    { id: 'spoon', name: 'ملعقة طعام', icon: '🥄', correctUnit: 'مليلتر' },
    { id: 'bathtub', name: 'حوض الاستحمام', icon: '🛁', correctUnit: 'لتر' },
    { id: 'milk', name: 'علبة حليب عائلية', icon: '🥛', correctUnit: 'لتر' },
    { id: 'perfume', name: 'زجاجة عطر فاخر', icon: '✨', correctUnit: 'مليلتر' }, // using sparkles or similar if perfume not available visually everywhere
    { id: 'bucket', name: 'دلو غسيل', icon: '🪣', correctUnit: 'لتر' },
    { id: 'teacup', name: 'كوب شاي', icon: '🍵', correctUnit: 'مليلتر' },
];

export default function JuiceMakerGamePage() {
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

    // Juice animation state
    const [juiceState, setJuiceState] = useState<'empty' | 'filling' | 'full' | 'spilled'>('empty');
    const [shakeOptionId, setShakeOptionId] = useState<string | null>(null);

    const [settings, setSettings] = useState({
        successSoundUrl: '', // pour/slurp
        errorSoundUrl: '', //splat
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
        const item = ITEMS[Math.floor(Math.random() * ITEMS.length)];

        const opts: { id: string; unit: UnitType }[] = [
            { id: 'ml', unit: 'مليلتر' },
            { id: 'l', unit: 'لتر' },
            { id: 'g', unit: 'جرام' }, // Distractor
        ];

        // Shuffle
        for (let i = opts.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [opts[i], opts[j]] = [opts[j], opts[i]];
        }

        setQuestionData({
            item,
            options: opts
        });

        setJuiceState('empty');
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
            setJuiceState('filling');
            playSound(settings.successSoundUrl);

            // Confetti Cocktail
            const duration = 2000;
            const end = Date.now() + duration;

            (function frame() {
                confetti({
                    particleCount: 15,
                    angle: 90,
                    spread: 80,
                    origin: { x: 0.5, y: 0.8 },
                    colors: ['#f472b6', '#38bdf8', '#fbbf24', '#a3e635'], // Fruity colors: Pink, Blue, Yellow, Green
                    shapes: ['circle'],
                    gravity: 1.2,
                    scalar: 1.5,
                });

                if (Date.now() < end) {
                    requestAnimationFrame(frame);
                }
            }());

            setTimeout(() => {
                setJuiceState('full');
            }, 600); // 0.6s to fill

            setTimeout(() => {
                nextQuestion(true);
            }, 2500);
        } else {
            setFeedback('wrong');
            setShakeScreen(true);
            setShakeOptionId(optId);
            setJuiceState('spilled');
            playSound(settings.errorSoundUrl);

            setTimeout(() => {
                setShakeScreen(false);
                setShakeOptionId(null);
                setFeedback(null);
                setJuiceState('empty');
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
                        gameType: 'juice-maker', // Match ID
                    }),
                });
            }

            router.push(`/results?score=${finalScore}&total=${totalQuestions}&time=${timeSpent}&gameId=juice-maker${studentId ? `&studentId=${studentId}` : ''}`);
        } catch (error) {
            console.error('Error saving score:', error);
            alert('حدث خطأ في حفظ النتيجة');
        }
    };


    if (!gameStarted) {
        return (
            <div className="min-h-screen flex items-center justify-center p-4 bg-orange-100 relative overflow-hidden font-sans" dir="rtl">
                {/* Fruity Background Pattern */}
                <div className="absolute inset-0 opacity-40 bg-[radial-gradient(circle_at_20%_30%,#fdba74_0%,transparent_10%),radial-gradient(circle_at_80%_70%,#fcd34d_0%,transparent_15%),radial-gradient(circle_at_50%_50%,#fca5a5_0%,transparent_20%)] pointer-events-none"></div>

                <div className="max-w-lg w-full relative z-10">
                    <div className="bg-white/80 backdrop-blur-md rounded-[3rem] shadow-[0_30px_60px_rgba(249,115,22,0.2),inset_0_0_20px_rgba(255,255,255,0.8)] p-8 text-center flex flex-col items-center border-[6px] border-orange-400 outline outline-4 outline-orange-300/50 outline-offset-4 overflow-hidden relative">

                        <div className="mb-6 relative z-10 w-32 h-32 bg-gradient-to-tr from-pink-400 via-orange-400 to-yellow-400 rounded-full flex items-center justify-center border-[6px] border-white shadow-[0_15px_30px_rgba(249,115,22,0.4)]">
                            {/* Blender/Juice Icon */}
                            <motion.div
                                className="text-7xl drop-shadow-[0_10px_10px_rgba(0,0,0,0.3)] z-20"
                                animate={{ rotate: [-2, 2, -2] }}
                                transition={{ duration: 0.5, repeat: Infinity, ease: "linear" }}
                            >
                                🍹
                            </motion.div>
                        </div>

                        <h1 className="text-4xl sm:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-orange-600 to-pink-500 mb-4 tracking-tight drop-shadow-sm font-serif relative z-10">
                            صانع العصائر
                        </h1>
                        <p className="text-xl text-orange-950/80 mb-8 font-bold leading-relaxed relative z-10">
                            تعرف على سعة الأوعية لتنجز ألذ العصائر، ما هي وحدة القياس الأنسب؟ 🍎🍊
                        </p>

                        <div className="mb-8 w-full relative z-10">
                            <label htmlFor="name" className="block text-orange-700 font-bold mb-2 text-right">
                                اسم صانع العصير:
                            </label>
                            <input
                                type="text"
                                id="name"
                                value={studentName}
                                onChange={(e) => setStudentName(e.target.value)}
                                className="w-full px-4 py-3 bg-orange-50/80 border-[3px] border-orange-300 rounded-xl focus:border-pink-400 focus:outline-none transition-all text-orange-900 placeholder-orange-400/80 text-center text-xl font-bold font-mono shadow-inner"
                                placeholder="اكتب اسمك هنا"
                                required
                            />
                        </div>

                        <button
                            onClick={startGame}
                            className="w-full relative z-10 bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-400 hover:to-pink-400 text-white font-black text-2xl py-4 rounded-xl shadow-[0_6px_0_#be185d] active:shadow-[0_0px_0_#be185d] active:translate-y-2 transform transition-all border-b-[4px] border-white/30 flex items-center justify-center gap-3"
                        >
                            <span>افتح كشك العصير!</span>
                            <span className="animate-bounce">🥤</span>
                        </button>
                    </div>
                </div>
            </div>
        );
    }


    return (
        <div className="min-h-screen flex items-center justify-center p-2 sm:p-4 bg-[url('https://www.transparenttextures.com/patterns/wood-pattern.png')] bg-[#ffedd5] relative overflow-hidden font-sans" dir="rtl">

            {/* Soft Café Background Lighting */}
            <div className="absolute inset-0 bg-gradient-to-b from-orange-100/60 to-rose-200/90 z-0 mix-blend-multiply pointer-events-none"></div>

            {/* Sun flare */}
            <div className="absolute -top-20 -right-20 w-96 h-96 bg-yellow-300/40 rounded-full blur-[100px] pointer-events-none z-0"></div>

            <div className="max-w-6xl w-full relative z-10 py-6 sm:py-8 flex flex-col items-center">

                <motion.div
                    animate={shakeScreen ? { x: [-15, 15, -15, 15, 0], y: [-5, 5, -5, 5, 0] } : {}}
                    transition={{ duration: 0.4 }}
                    className="w-full"
                >
                    {/* The Juice Stand Kiosk Design */}
                    <div className="relative bg-white/90 backdrop-blur-md rounded-t-[3rem] border-x-[16px] border-t-[16px] border-red-500 shadow-[0_20px_50px_rgba(0,0,0,0.3)] mx-auto max-w-4xl pt-8 pb-4">

                        {/* Kiosk Awning Striped Canopy */}
                        <div className="absolute -top-[50px] sm:-top-[70px] -left-[20px] -right-[20px] h-[60px] sm:h-[80px] bg-[repeating-linear-gradient(90deg,#ef4444_0,#ef4444_40px,#ffffff_40px,#ffffff_80px)] rounded-t-full shadow-[0_10px_20px_rgba(0,0,0,0.4)] border-b-[8px] border-red-800 z-30">
                            {/* Scalloped edge */}
                            <div className="absolute -bottom-[20px] w-full h-[20px] bg-[radial-gradient(circle_at_20px_0,#ef4444_20px,transparent_21px)] bg-[size:40px_20px] bg-repeat-x z-30"></div>
                            <div className="absolute -bottom-[20px] left-[40px] w-full h-[20px] bg-[radial-gradient(circle_at_20px_0,#ffffff_20px,transparent_21px)] bg-[size:40px_20px] bg-repeat-x opacity-90 z-20"></div>
                        </div>

                        {/* Top Score Board Area */}
                        <div className="bg-red-950/20 mx-4 sm:mx-12 mt-4 p-4 rounded-2xl flex justify-between items-center shadow-inner mb-6">
                            <span className="text-red-900 font-bold font-mono uppercase bg-white/60 px-4 py-1 rounded-full border-[2px] border-red-200">
                                طلب {questionNumber} / {totalQuestions}
                            </span>
                            <span className="text-2xl font-black text-orange-600 drop-shadow-[0_1px_1px_rgba(255,255,255,0.8)] bg-white/80 px-6 py-2 rounded-full border-[3px] border-orange-300">
                                الأكواب الممتلئة: {score} 🍹
                            </span>
                        </div>

                        {/* Main Interaction Area */}
                        {questionData && (
                            <div className="flex flex-col items-center">

                                <h2 className="text-2xl sm:text-3xl font-black text-rose-800 mb-8 sm:mb-12 drop-shadow-sm px-4 text-center">
                                    ما هي الوحدة الأنسب لقياس سعة هذا الوعاء؟
                                </h2>

                                {/* Visual Scene (Table with item and cup) */}
                                <div className="relative w-full h-[280px] sm:h-[350px] flex items-end justify-center mb-8 bg-gradient-to-b from-transparent to-red-50/50 rounded-lg">

                                    {/* The Countertop Table */}
                                    <div className="absolute bottom-0 w-[120%] h-[50px] sm:h-[70px] bg-gradient-to-r from-red-800 via-red-600 to-red-800 rounded-lg shadow-[inset_0_5px_15px_rgba(255,255,255,0.3),0_15px_20px_rgba(0,0,0,0.5)] z-0 border-t-8 border-red-500">
                                        <div className="absolute inset-0 opacity-50 bg-[url('https://www.transparenttextures.com/patterns/wood-pattern.png')] pointer-events-none mix-blend-multiply rounded-lg"></div>
                                    </div>

                                    <div className="flex justify-center items-end gap-10 sm:gap-24 w-full relative z-10 px-8 pb-[40px] sm:pb-[60px]">

                                        {/* Target Item Display */}
                                        <div className="flex flex-col items-center justify-end relative z-10">
                                            {/* Item floating slightly */}
                                            <motion.div
                                                className="text-[120px] sm:text-[160px] drop-shadow-[0_15px_15px_rgba(0,0,0,0.4)] relative"
                                                animate={{ y: [-5, 5, -5] }}
                                                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                                            >
                                                {questionData.item.icon}

                                                {/* Spill effect overlaid on item if spilled */}
                                                <AnimatePresence>
                                                    {juiceState === 'spilled' && (
                                                        <motion.div
                                                            initial={{ scale: 0, top: 0 }}
                                                            animate={{ scale: 1, top: '50%' }}
                                                            exit={{ opacity: 0 }}
                                                            className="absolute left-[-20%] right-[-20%] h-1/2 bg-red-500/80 rounded-b-full filter blur-[2px] z-50 mix-blend-multiply"
                                                            style={{ clipPath: 'polygon(10% 0, 90% 0, 70% 100%, 30% 100%)' }}
                                                        ></motion.div>
                                                    )}
                                                </AnimatePresence>
                                            </motion.div>
                                            <div className="bg-white/95 px-5 py-2 rounded-xl shadow-[0_5px_10px_rgba(0,0,0,0.3)] border-2 border-orange-200 text-base sm:text-xl font-bold text-orange-950 absolute -bottom-[25px] sm:-bottom-[35px] whitespace-nowrap transform translate-y-full z-20">
                                                {questionData.item.name}
                                            </div>
                                            {/* Table shadow */}
                                            <div className="w-24 h-4 bg-black/20 rounded-[100%] absolute -bottom-2 blur-sm"></div>
                                        </div>

                                        {/* The Juice Cup Visualizer */}
                                        <div className="relative z-10 flex flex-col items-center">
                                            <div className="relative w-24 h-32 sm:w-32 sm:h-40 border-[6px] border-b-[12px] border-gray-100 bg-white/40 backdrop-blur-sm rounded-b-3xl shadow-[5px_15px_30px_rgba(0,0,0,0.2)] overflow-hidden flex items-end">

                                                {/* Actual Juice Fluid filling up */}
                                                <motion.div
                                                    className={`w-full relative origin-bottom ${feedback === 'correct' ? 'bg-gradient-to-t from-orange-500 to-pink-500' : 'bg-red-600'}`}
                                                    initial={{ height: '0%' }}
                                                    animate={{ height: juiceState === 'filling' ? '120%' : juiceState === 'full' ? '95%' : juiceState === 'spilled' ? '0%' : '5%' }}
                                                    transition={juiceState === 'filling' ? { duration: 0.6, ease: 'easeOut' } : juiceState === 'spilled' ? { duration: 0.2 } : { duration: 0.5 }}
                                                >
                                                    {/* Wave effect on top of juice */}
                                                    {(juiceState === 'filling' || juiceState === 'full') && (
                                                        <motion.div
                                                            className="absolute top-0 left-0 right-0 h-4 bg-white/30 rounded-full"
                                                            animate={{ scaleX: [1, 1.1, 1] }}
                                                            transition={{ duration: 1, repeat: Infinity }}
                                                        ></motion.div>
                                                    )}
                                                </motion.div>

                                                {/* Glass shine reflection */}
                                                <div className="absolute top-2 bottom-2 left-2 w-4 bg-white/50 rounded-full pointer-events-none skew-x-[-5deg]"></div>
                                            </div>
                                            {/* Cup shadow */}
                                            <div className="w-20 h-4 bg-black/20 rounded-[100%] absolute -bottom-2 blur-sm z-0"></div>

                                            {/* Straw */}
                                            <motion.div
                                                className="absolute -top-12 left-1/2 w-3 h-20 bg-[repeating-linear-gradient(45deg,#ef4444_0,#ef4444_10px,#ffffff_10px,#ffffff_20px)] border-[1px] border-gray-300 origin-bottom rounded-full z-[15]"
                                                animate={{ rotate: 15, x: 10, y: (juiceState === 'filling' || juiceState === 'full') ? -5 : 0 }}
                                            ></motion.div>
                                        </div>

                                    </div>

                                    {/* Messy Splat image on table if wrong */}
                                    <AnimatePresence>
                                        {juiceState === 'spilled' && (
                                            <motion.div
                                                initial={{ scale: 0, opacity: 0 }}
                                                animate={{ scale: 1.5, opacity: 1, rotate: Math.random() * 360 }}
                                                exit={{ scale: 0, opacity: 0 }}
                                                className="absolute bottom-[30px] right-[10%] sm:right-[30%] text-6xl text-red-600 drop-shadow-md z-30 filter"
                                            >
                                                <svg viewBox="0 0 200 200" className="w-48 h-48 fill-current">
                                                    <path d="M49.2,-43.3C66.1,-29.4,83.9,-14.7,85.2,1.3C86.5,17.3,71.2,34.6,54.3,51.8C37.4,69,18.7,86.1,-1.1,87.2C-20.9,88.3,-41.8,73.4,-57.4,56.2C-73,39,-83.4,19.5,-82.4,1C-81.4,-17.5,-69,-35,-53.4,-48.9C-37.8,-62.8,-18.9,-73.1,-2.1,-71C14.7,-68.9,29.4,-54.4,49.2,-43.3Z" transform="translate(100 100)" />
                                                </svg>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>

                                {/* Answers Buttons */}
                                <div className="w-full flex justify-center gap-4 sm:gap-6 flex-wrap px-4 mt-8 pb-10">
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
                                                    relative w-[110px] sm:w-[150px] md:w-[180px] h-[100px] sm:h-[130px] flex flex-col items-center justify-center font-bold transition-all
                                                    overflow-hidden group
                                                `}
                                                // Create a cup shape via css clip-path for button
                                                style={{ clipPath: 'polygon(10% 0, 90% 0, 80% 100%, 20% 100%)', borderRadius: '5px' }}
                                            >
                                                {/* Button base color layer */}
                                                <div className={`absolute inset-0 border-t-[8px] border-black/10
                                                    ${shakeOptionId === option.id
                                                        ? 'bg-red-600'
                                                        : (feedback === 'correct' && option.unit === questionData.item.correctUnit)
                                                            ? 'bg-emerald-500'
                                                            : 'bg-gradient-to-b from-white to-gray-200'
                                                    }
                                                `}></div>

                                                {/* Button fluid layer hover effect */}
                                                <div className={`absolute bottom-0 left-0 right-0 top-full group-hover:top-[30%] bg-gradient-to-t from-orange-400 to-pink-400 opacity-20 transition-all duration-500 ease-out border-t-2 border-white/50
                                                    ${feedback !== null ? 'hidden' : ''}
                                                `}></div>

                                                <span className={`relative z-10 text-xl sm:text-3xl lg:text-4xl font-black drop-shadow-[0_2px_2px_rgba(255,255,255,0.8)] px-2
                                                    ${shakeOptionId === option.id || (feedback === 'correct' && option.unit === questionData.item.correctUnit) ? 'text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]' : 'text-slate-800'}
                                                `}>
                                                    {option.unit}
                                                </span>
                                                <span className={`relative z-10 text-xs sm:text-sm font-bold opacity-60 mt-2
                                                    ${shakeOptionId === option.id || (feedback === 'correct' && option.unit === questionData.item.correctUnit) ? 'text-white' : 'text-slate-500'}
                                                `}>
                                                    {option.unit === 'جرام' ? '(وزن)' : '(سعة)'}
                                                </span>
                                            </motion.button>
                                        ))}
                                    </AnimatePresence>
                                </div>

                            </div>
                        )}

                        {/* Fake Base of Kiosk Structure below red line */}
                        <div className="absolute top-[100%] left-[-20px] right-[-20px] h-[300px] bg-[repeating-linear-gradient(0deg,#ffffff_0,#ffffff_20px,#f87171_20px,#f87171_40px)] shadow-[inset_0_-50px_100px_rgba(0,0,0,0.2)] -z-10 rounded-b-xl opacity-90"></div>

                    </div>

                    {/* Interactive Feedback Interstitial Overlay */}
                    <div className="absolute inset-0 top-[-100px] z-50 pointer-events-none flex items-center justify-center">
                        <AnimatePresence mode="wait">
                            {feedback === 'correct' && (
                                <motion.div
                                    key="correct"
                                    initial={{ scale: 0.5, opacity: 0, y: 30 }}
                                    animate={{ scale: 1, opacity: 1, y: 0 }}
                                    exit={{ scale: 0.5, opacity: 0, y: -30 }}
                                    className="bg-emerald-500/95 backdrop-blur-md border-[6px] border-emerald-300 text-white px-8 py-6 rounded-[2rem] text-center shadow-[0_0_80px_rgba(16,185,129,0.8)] flex items-center justify-center gap-4 pointer-events-auto"
                                >
                                    <span className="text-5xl sm:text-6xl drop-shadow-[0_5px_15px_rgba(0,0,0,0.3)] animate-pulse">🍹</span>
                                    <p className="text-2xl sm:text-4xl font-black drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)] font-serif py-2">
                                        اختيار منعش وصحيح!
                                    </p>
                                </motion.div>
                            )}

                            {feedback === 'wrong' && (
                                <motion.div
                                    key="wrong"
                                    initial={{ scale: 0.8, opacity: 0, rotate: -5 }}
                                    animate={{ scale: 1, opacity: 1, rotate: 0 }}
                                    exit={{ scale: 0.8, opacity: 0 }}
                                    className="bg-red-600/95 backdrop-blur-md border-[6px] border-red-800 text-white px-6 py-5 rounded-[2rem] text-center shadow-[0_0_50px_rgba(220,38,38,0.8)] flex flex-col items-center justify-center gap-2 pointer-events-auto max-w-sm sm:max-w-md"
                                >
                                    <div className="flex items-center justify-center gap-3">
                                        <span className="text-4xl sm:text-5xl drop-shadow-md">⚠️</span>
                                        <p className="text-xl sm:text-3xl font-black drop-shadow-sm leading-tight text-white">
                                            تذكر:<br />المليلتر للأشياء الصغيرة جداً فقط!
                                        </p>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                </motion.div>
            </div>
        </div>
    );
}
