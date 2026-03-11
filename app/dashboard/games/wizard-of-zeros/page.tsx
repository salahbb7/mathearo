'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Difficulty } from '@/lib/difficulty';
import confetti from 'canvas-confetti';
import { motion, AnimatePresence } from 'framer-motion';

export default function WizardOfZerosGamePage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const studentId = searchParams.get('studentId');
    const isTeacher = searchParams.get('teacher') === 'true';
    const difficulty = (searchParams.get('difficulty') || 'medium') as Difficulty;

    const [gameStarted, setGameStarted] = useState(false);
    const [studentName, setStudentName] = useState('');

    const [questionData, setQuestionData] = useState<{
        baseNumber: number;
        multiplier: number; // 10, 100, 1000
        equation: string;
        correctAnswer: number;
        options: { id: string; value: number }[];
    } | null>(null);

    const [score, setScore] = useState(0);
    const [questionNumber, setQuestionNumber] = useState(0);
    const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
    const [shakeScreen, setShakeScreen] = useState(false);
    const [startTime, setStartTime] = useState<number>(0);

    // Magic animation states
    const [spellCasting, setSpellCasting] = useState(false);
    const [shakeOptionId, setShakeOptionId] = useState<string | null>(null);
    const [showRabbit, setShowRabbit] = useState(false);
    const [showSmoke, setShowSmoke] = useState(false);

    const [settings, setSettings] = useState({
        successSoundUrl: '', // chime
        errorSoundUrl: '', // poof
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
        // Base number and multiplier scale with difficulty
        const baseMax = difficulty === 'easy' ? 99 : difficulty === 'hard' ? 9999 : 999;
        let baseNumber = Math.floor(Math.random() * baseMax) + 1;
        // Avoid multiples of 10 to make 0-counting pure
        if (baseNumber % 10 === 0) baseNumber += Math.floor(Math.random() * 9) + 1;

        const powersOfTen = difficulty === 'easy' ? [10] : difficulty === 'hard' ? [10, 100, 1000] : [10, 100];
        const multiplier = powersOfTen[Math.floor(Math.random() * powersOfTen.length)];

        const correctAnswer = baseNumber * multiplier;
        const equation = `${multiplier} × ${baseNumber} = ؟`;

        // Generate options (same base, different powers of 10)
        let wrong1 = baseNumber * (multiplier === 10 ? 100 : multiplier === 100 ? 1000 : 100);
        let wrong2 = baseNumber * (multiplier === 10 ? 1000 : multiplier === 100 ? 10 : 10);

        // Ensure strictly different
        if (wrong1 === wrong2) wrong2 = baseNumber * 1;

        const opts = [
            { id: 'correct', value: correctAnswer },
            { id: 'w1', value: wrong1 },
            { id: 'w2', value: wrong2 },
        ];

        // Shuffle
        for (let i = opts.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [opts[i], opts[j]] = [opts[j], opts[i]];
        }

        setQuestionData({
            baseNumber,
            multiplier,
            equation,
            correctAnswer,
            options: opts
        });

        // Reset stage
        setSpellCasting(true);
        setTimeout(() => setSpellCasting(false), 800);
        setShowRabbit(false);
        setShowSmoke(false);
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

    const checkAnswer = (selectedVal: number, optId: string) => {
        if (feedback !== null || !questionData) return;

        if (selectedVal === questionData.correctAnswer) {
            setFeedback('correct');
            setScore(prev => prev + 1);
            playSound(settings.successSoundUrl);
            setShowRabbit(true);

            // Magical burst (Stars)
            const duration = 2000;
            const end = Date.now() + duration;

            (function frame() {
                confetti({
                    particleCount: 15,
                    angle: 90,
                    spread: 90,
                    origin: { x: 0.5, y: 0.7 },
                    colors: ['#fcd34d', '#fbbf24', '#fef3c7', '#ffffff'], // Gold and white stars
                    shapes: ['star', 'circle'],
                    gravity: 0.5,
                    scalar: 1.5,
                    ticks: 150
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
            setShowSmoke(true);
            playSound(settings.errorSoundUrl);

            setTimeout(() => {
                setShakeScreen(false);
                setShakeOptionId(null);
                setFeedback(null);
                setShowSmoke(false);
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
                        gameType: 'wizard-of-zeros', // Match ID
                    }),
                });
            }

            router.push(`/results?score=${finalScore}&total=${totalQuestions}&time=${timeSpent}&gameId=wizard-of-zeros${studentId ? `&studentId=${studentId}` : ''}`);
        } catch (error) {
            console.error('Error saving score:', error);
            alert('حدث خطأ في حفظ النتيجة');
        }
    };


    if (!gameStarted) {
        return (
            <div className="min-h-screen flex items-center justify-center p-4 bg-purple-950 relative overflow-hidden font-sans" dir="rtl">
                {/* Magical Background Elements */}
                <div className="absolute inset-0 bg-gradient-to-br from-[#2e1065] via-purple-900 to-indigo-950 pointer-events-none"></div>

                {/* Floating magic dust/stars */}
                {Array.from({ length: 30 }).map((_, i) => (
                    <motion.div
                        key={i}
                        className="absolute w-2 h-2 bg-yellow-200 rounded-full blur-[1px] opacity-40 pointer-events-none"
                        style={{
                            left: `${Math.random() * 100}%`,
                            top: `${Math.random() * 100}%`,
                        }}
                        animate={{
                            y: [0, -30, 0],
                            opacity: [0.2, 0.8, 0.2],
                            scale: [1, 1.5, 1]
                        }}
                        transition={{
                            duration: Math.random() * 3 + 2,
                            repeat: Infinity,
                            ease: "easeInOut",
                            delay: Math.random() * 2
                        }}
                    />
                ))}

                <div className="max-w-lg w-full relative z-10">
                    <div className="bg-[#1e1b4b]/80 backdrop-blur-md rounded-[3rem] shadow-[0_30px_60px_rgba(0,0,0,0.8),inset_0_0_20px_rgba(168,85,247,0.3)] p-8 text-center flex flex-col items-center border-[4px] border-purple-700 outline outline-4 outline-fuchsia-500/20 outline-offset-4 overflow-hidden relative">

                        <div className="mb-6 relative z-10 w-32 h-32 bg-purple-900/60 rounded-[2rem] flex items-center justify-center border-4 border-fuchsia-500/50 shadow-[0_0_40px_rgba(192,38,211,0.6)] animate-pulse">
                            {/* Wizard Icon */}
                            <div className="text-7xl drop-shadow-[0_10px_10px_rgba(0,0,0,0.6)] z-20">
                                🧙‍♂️
                            </div>
                        </div>

                        <h1 className="text-4xl sm:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-300 via-purple-300 to-yellow-200 mb-4 tracking-tight drop-shadow-sm font-serif relative z-10">
                            ساحر الأصفار
                        </h1>
                        <p className="text-xl text-purple-200 mb-8 font-bold leading-relaxed relative z-10 drop-shadow-md">
                            استخدم سحر الأصفار لإيجاد الناتج الذهني السريع لتصبح الساحر الأعظم! ✨🪄
                        </p>

                        <div className="mb-8 w-full relative z-10">
                            <label htmlFor="name" className="block text-fuchsia-300 font-bold mb-2 text-right">
                                اسم الساحر:
                            </label>
                            <input
                                type="text"
                                id="name"
                                value={studentName}
                                onChange={(e) => setStudentName(e.target.value)}
                                className="w-full px-4 py-3 bg-indigo-950/80 border-2 border-purple-600 rounded-xl focus:border-fuchsia-400 focus:outline-none transition-all text-fuchsia-100 placeholder-purple-400 text-center text-xl font-bold font-mono shadow-inner"
                                placeholder="اكتب اسمك هنا"
                                required
                            />
                        </div>

                        <button
                            onClick={startGame}
                            className="w-full relative z-10 bg-gradient-to-t from-purple-700 to-fuchsia-600 hover:from-purple-600 hover:to-fuchsia-500 text-white font-black text-2xl py-4 rounded-xl shadow-[0_6px_0_#4c1d95] active:shadow-[0_0px_0_#4c1d95] active:translate-y-2 transform transition-all border-t-2 border-white/20 flex items-center justify-center gap-3 overflow-hidden group"
                        >
                            {/* Magic shimmer effect on button */}
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent transform -skew-x-12 -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]"></div>
                            <span>ألقِ التعويذة!</span>
                            <span className="group-hover:animate-spin">🪄</span>
                        </button>
                    </div>
                </div>

                <style dangerouslySetInnerHTML={{
                    __html: `
                    @keyframes shimmer {
                        100% { transform: skewX(-12deg) translateX(200%); }
                    }
                `}} />
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center p-2 sm:p-4 bg-[#0a0614] relative overflow-hidden font-sans" dir="rtl">

            {/* Dark Magic Forest/Tower Background */}
            <div className="absolute inset-0 bg-gradient-to-t from-indigo-950 via-purple-950 to-[#0a0614] z-0"></div>

            {/* Glowing magic runes in background */}
            <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/mathematics.png')] z-0 pointer-events-none mix-blend-color-dodge"></div>

            <div className="max-w-6xl w-full h-[95vh] relative z-10 py-4 sm:py-6 flex flex-col">

                <motion.div
                    animate={shakeScreen ? { x: [-15, 15, -15, 15, 0], y: [-5, 5, -5, 5, 0] } : {}}
                    transition={{ duration: 0.4 }}
                    className="bg-[#1e1b4b]/80 backdrop-blur-xl border-2 border-purple-800/60 rounded-[2rem] shadow-[0_40px_80px_rgba(0,0,0,0.8),inset_0_0_50px_rgba(168,85,247,0.15)] p-4 sm:p-8 relative overflow-hidden flex flex-col flex-1"
                >
                    {/* Header Controls */}
                    <div className="mb-6 relative z-10 bg-indigo-950/80 p-4 sm:p-5 rounded-[1.5rem] border border-purple-700/50 shadow-md flex flex-col sm:flex-row justify-between items-center gap-4 border-b-4 border-b-fuchsia-900/50">
                        <div className="order-2 sm:order-1 text-center sm:text-right w-full sm:w-auto">
                            <span className="block text-sm sm:text-base font-bold text-fuchsia-400 mb-1 font-mono tracking-wider uppercase">
                                التعويذة {questionNumber} / {totalQuestions}
                            </span>
                            <span className="block text-2xl font-black text-yellow-300 drop-shadow-[0_0_8px_rgba(253,224,71,0.5)]">
                                الطاقة السحرية: {score} ✨
                            </span>
                        </div>
                        <div className="order-1 sm:order-2 bg-gradient-to-r from-purple-900 via-indigo-900 to-purple-900 border-x-2 border-fuchsia-500/50 rounded-2xl px-6 py-3 shadow-[preset_0_0_15px_rgba(168,85,247,0.5)] w-full sm:w-auto text-center flex-1 mx-4">
                            <h2 className="text-lg sm:text-2xl font-black text-fuchsia-100 drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">
                                استخدم سحر الأصفار لإيجاد الناتج الذهني السريع! 📚
                            </h2>
                        </div>
                    </div>

                    {questionData && (
                        <div className="flex flex-col flex-1 items-center justify-center relative overflow-hidden">

                            {/* Wizard and Equation Area */}
                            <div className="flex flex-col sm:flex-row items-center justify-center gap-8 mb-12 sm:mb-16 relative w-full mt-4">

                                {/* The Wizard Character */}
                                <div className="relative text-8xl sm:text-[140px] drop-shadow-[0_20px_20px_rgba(0,0,0,0.8)] filter z-20 order-2 sm:order-1 transform translate-y-4">
                                    <motion.div animate={{ y: [-10, 10, -10] }} transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}>
                                        🧙‍♂️
                                    </motion.div>

                                    {/* Magic Wand effect cast at equation */}
                                    <AnimatePresence>
                                        {spellCasting && (
                                            <motion.div
                                                className="absolute top-1/4 left-full w-32 sm:w-64 h-8 bg-gradient-to-r from-fuchsia-400 to-transparent blur-md rounded-l-full origin-left"
                                                initial={{ scaleX: 0, opacity: 1 }}
                                                animate={{ scaleX: 1, opacity: 0 }}
                                                exit={{ opacity: 0 }}
                                                transition={{ duration: 0.8 }}
                                                style={{ transform: 'rotate(-10deg) translateY(-20px)' }} // Angle towards equation
                                            ></motion.div>
                                        )}
                                    </AnimatePresence>

                                    {/* Wand star sparkle */}
                                    <motion.div
                                        className="absolute top-[20%] right-[-10px] sm:right-0 text-3xl z-30 pointer-events-none drop-shadow-[0_0_15px_#fde047]"
                                        animate={{ scale: [1, 1.5, 1], opacity: [0.5, 1, 0.5], rotate: 360 }}
                                        transition={{ duration: 2, repeat: Infinity }}
                                    >
                                        ✨
                                    </motion.div>

                                    {/* Success/Error Character animations */}
                                    <AnimatePresence>
                                        {showRabbit && (
                                            <motion.div
                                                initial={{ scale: 0, y: 50, opacity: 0 }}
                                                animate={{ scale: 1, y: 0, opacity: 1 }}
                                                exit={{ scale: 0, opacity: 0 }}
                                                className="absolute -bottom-10 left-[-40px] text-6xl drop-shadow-xl z-30"
                                            >
                                                🐇
                                            </motion.div>
                                        )}
                                        {showSmoke && (
                                            <motion.div
                                                initial={{ scale: 0.5, opacity: 0 }}
                                                animate={{ scale: 2, opacity: 0.8, y: -50 }}
                                                exit={{ opacity: 0 }}
                                                transition={{ duration: 1.5 }}
                                                className="absolute top-0 right-0 text-7xl filter blur-[2px] z-30 grayscale opacity-70"
                                            >
                                                💨
                                            </motion.div>
                                        )}
                                    </AnimatePresence>

                                </div>

                                {/* The Floating Equation Box (The target of magic) */}
                                <motion.div
                                    className="order-1 sm:order-2 bg-gradient-to-b from-indigo-900 to-purple-950 border-[6px] border-fuchsia-500 shadow-[0_0_40px_rgba(217,70,239,0.5),inset_0_0_20px_rgba(0,0,0,0.8)] rounded-3xl px-8 py-6 flex items-center justify-center relative z-20"
                                    animate={{ scale: spellCasting ? [1, 1.1, 1] : 1, filter: spellCasting ? ["blur(0px)", "blur(2px)", "brightness(1.5)", "blur(0px)"] : "none" }}
                                    transition={{ duration: 0.6 }}
                                >
                                    {/* Sparkles around equation */}
                                    <div className="absolute -top-4 -left-4 text-2xl animate-pulse">✨</div>
                                    <div className="absolute -bottom-4 -right-4 text-2xl animate-pulse" style={{ animationDelay: '0.5s' }}>❇️</div>

                                    <h2 className="text-5xl sm:text-7xl font-sans font-black text-amber-300 drop-shadow-[0_5px_5px_rgba(0,0,0,0.8)] tracking-widest text-center" dir="ltr">
                                        {questionData.equation}
                                    </h2>
                                </motion.div>

                            </div>

                            {/* Spell Book Options (Bottom) */}
                            <div className="relative w-full z-30 flex justify-center gap-4 sm:gap-10 flex-wrap px-2">
                                <AnimatePresence>
                                    {questionData.options.map((option) => (
                                        <motion.button
                                            key={option.id}
                                            whileHover={{ scale: 1.05, y: -10 }}
                                            whileTap={{ scale: 0.95 }}
                                            animate={shakeOptionId === option.id ? { x: [-10, 10, -10, 10, 0] } : {}}
                                            onClick={() => checkAnswer(option.value, option.id)}
                                            disabled={feedback !== null || spellCasting}
                                            className={`
                                                relative w-[140px] sm:w-[220px] h-[100px] sm:h-[130px] rounded-2xl sm:rounded-[2rem] border-[4px] flex flex-col items-center justify-center font-bold transition-all
                                                overflow-hidden shadow-[0_20px_30px_rgba(0,0,0,0.5)] group
                                                ${shakeOptionId === option.id
                                                    ? 'border-red-600 bg-red-950/90 text-red-200 shadow-[0_0_40px_#991b1b]'
                                                    : (feedback === 'correct' && option.value === questionData.correctAnswer)
                                                        ? 'border-yellow-400 bg-emerald-900/90 text-yellow-200 shadow-[0_0_50px_#facc15]'
                                                        : 'border-fuchsia-700 bg-[#311059]/90 text-fuchsia-100 hover:border-fuchsia-400 hover:bg-[#4a1c7d]'
                                                }
                                            `}
                                        >
                                            {/* Spell Book Cover Texture */}
                                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#ffffff0a] to-[#00000040] pointer-events-none"></div>

                                            {/* Page edge simulation (left side in RTL -> right border visually) */}
                                            <div className="absolute top-0 bottom-0 left-0 w-4 bg-gradient-to-r from-orange-200 to-amber-100 border-r-2 border-amber-900/50 rounded-l-xl sm:rounded-l-2xl">
                                                {/* Page lines */}
                                                <div className="w-full h-full opacity-30 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0IiBoZWlnaHQ9IjQiPjxwYXRoIGQ9Ik0wIDEwaDRNMCAzMGg0TTAgNTBoNE0wIDcwaDRNMCA5MGg0IiBzdHJva2U9IiMwMDAiIHN0cm9rZS13aWR0aD0iMSIvPjwvc3ZnPg==')] pointer-events-none"></div>
                                            </div>

                                            {/* Magical glow inside button */}
                                            <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-purple-500/0 to-purple-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

                                            <span className="relative z-10 text-3xl sm:text-5xl font-mono font-black drop-shadow-[0_4px_4px_rgba(0,0,0,0.9)] tracking-wider">
                                                {option.value.toLocaleString('en-US')}
                                            </span>

                                        </motion.button>
                                    ))}
                                </AnimatePresence>
                            </div>

                        </div>
                    )}

                    {/* Interactive Feedback Interstitial Overlay */}
                    <div className="absolute inset-0 z-50 pointer-events-none flex items-center justify-center">
                        <AnimatePresence mode="wait">
                            {feedback === 'correct' && (
                                <motion.div
                                    key="correct"
                                    initial={{ scale: 0.5, opacity: 0, y: 30 }}
                                    animate={{ scale: 1, opacity: 1, y: 0 }}
                                    exit={{ scale: 0.5, opacity: 0, y: -30 }}
                                    className="bg-emerald-950/95 backdrop-blur-md border-[6px] border-yellow-400 text-yellow-100 px-8 py-6 rounded-[2rem] text-center shadow-[0_0_80px_rgba(250,204,21,0.6)] flex items-center justify-center gap-4 pointer-events-auto"
                                >
                                    <span className="text-5xl sm:text-6xl drop-shadow-[0_0_15px_rgba(255,255,255,0.8)] animate-pulse">✨</span>
                                    <p className="text-2xl sm:text-5xl font-black drop-shadow-sm font-serif text-transparent bg-clip-text bg-gradient-to-b from-yellow-100 to-amber-500 py-2">
                                        أنت ساحر الحساب الذهني!
                                    </p>
                                </motion.div>
                            )}

                            {feedback === 'wrong' && (
                                <motion.div
                                    key="wrong"
                                    initial={{ scale: 0.8, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    exit={{ scale: 0.8, opacity: 0 }}
                                    className="bg-purple-950/95 backdrop-blur-md border-4 border-fuchsia-600 text-fuchsia-100 px-6 py-4 rounded-[2rem] text-center shadow-[0_0_50px_rgba(192,38,211,0.8)] flex flex-col items-center justify-center gap-2 pointer-events-auto"
                                >
                                    <div className="flex items-center gap-3">
                                        <span className="text-4xl sm:text-5xl drop-shadow-md filter grayscale">🐸</span>
                                        <p className="text-xl sm:text-3xl font-black drop-shadow-sm leading-tight max-w-[300px] sm:max-w-none">
                                            عد الأصفار بعناية قبل إلقاء التعويذة!
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
