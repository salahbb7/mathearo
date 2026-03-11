'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Difficulty } from '@/lib/difficulty';
import confetti from 'canvas-confetti';
import { motion, AnimatePresence } from 'framer-motion';

const patterns = ['circles', 'stars', 'stripes'];
const colorPairs = [
    { c1: '#ec4899', c2: '#a855f7' }, // pink-purple
    { c1: '#3b82f6', c2: '#06b6d4' }, // blue-cyan
    { c1: '#f59e0b', c2: '#ef4444' }, // amber-red
    { c1: '#10b981', c2: '#84cc16' }, // emerald-lime
    { c1: '#6366f1', c2: '#f43f5e' }, // indigo-rose
];

const WingHalf = ({ isRight, c1, c2, spots, isFlapping }: { isRight: boolean; c1: string; c2: string; spots: string; isFlapping: boolean }) => {
    return (
        <motion.div
            className={`flex items-center justify-start ${isRight ? 'origin-left' : 'origin-right'}`}
            animate={isFlapping ? { rotateY: isRight ? [0, 60, 0, 60, 0] : [0, -60, 0, -60, 0] } : {}}
            transition={{ duration: 0.8, repeat: isFlapping ? Infinity : 0, repeatType: 'reverse' }}
            initial={{ rotateY: 0 }}
        >
            <div className={!isRight ? 'scale-x-[-1]' : ''}>
                <svg viewBox="-5 -15 105 195" className="w-[120px] sm:w-[160px] h-[200px] sm:h-[260px] drop-shadow-xl overflow-visible">
                    {/* Upper Wing */}
                    <path d="M0 40 C 50 -30, 110 0, 95 80 C 85 110, 40 100, 0 80 Z" fill={c1} stroke="#1f2937" strokeWidth="2.5" strokeLinejoin="round" />
                    {/* Lower Wing */}
                    <path d="M0 80 C 40 100, 90 130, 70 170 C 40 210, 10 170, 0 140 Z" fill={c2} stroke="#1f2937" strokeWidth="2.5" strokeLinejoin="round" />

                    {/* Patterns */}
                    {spots === 'circles' && (
                        <>
                            <circle cx="50" cy="45" r="14" fill="#ffffff" opacity="0.85" />
                            <circle cx="75" cy="70" r="7" fill="#ffffff" opacity="0.85" />
                            <circle cx="35" cy="140" r="12" fill="#ffffff" opacity="0.85" />
                            <circle cx="55" cy="160" r="6" fill="#ffffff" opacity="0.85" />
                        </>
                    )}
                    {spots === 'stars' && (
                        <>
                            <polygon points="50,25 54,39 68,39 56,48 61,61 50,52 39,61 44,48 32,39 46,39" fill="#ffffff" opacity="0.9" />
                            <polygon points="40,130 43,137 50,137 44,142 47,149 40,144 33,149 36,142 30,137 37,137" fill="#ffffff" opacity="0.9" />
                        </>
                    )}
                    {spots === 'stripes' && (
                        <>
                            <path d="M15 25 Q 50 35, 80 55" stroke="#ffffff" strokeWidth="5" strokeLinecap="round" opacity="0.8" fill="none" />
                            <path d="M10 55 Q 50 65, 75 90" stroke="#ffffff" strokeWidth="5" strokeLinecap="round" opacity="0.8" fill="none" />
                            <path d="M10 120 Q 30 140, 50 160" stroke="#ffffff" strokeWidth="5" strokeLinecap="round" opacity="0.8" fill="none" />
                        </>
                    )}

                    {/* Bug Body Center Profile */}
                    <path d="M0 20 C 12 20, 12 140, 0 140 Z" fill="#374151" />
                    {/* Eye/Head */}
                    <circle cx="0" cy="15" r="9" fill="#374151" />
                    {/* Antenna */}
                    <path d="M0 10 Q 15 -10, 30 -5" stroke="#374151" strokeWidth="2.5" fill="none" strokeLinecap="round" />
                </svg>
            </div>
        </motion.div>
    );
};


export default function SymmetryButterflyGamePage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const studentId = searchParams.get('studentId');
    const isTeacher = searchParams.get('teacher') === 'true';
    const difficulty = (searchParams.get('difficulty') || 'medium') as Difficulty;

    const [gameStarted, setGameStarted] = useState(false);
    const [studentName, setStudentName] = useState('');

    type ButterflyConfig = { c1: string; c2: string; spots: string };

    const [questionData, setQuestionData] = useState<{
        targetButterfly: ButterflyConfig;
        options: { id: string; config: ButterflyConfig; isCorrect: boolean }[];
    } | null>(null);

    const [score, setScore] = useState(0);
    const [questionNumber, setQuestionNumber] = useState(0);
    const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
    const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
    const [shakeScreen, setShakeScreen] = useState(false);
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
        const targetPattern = patterns[Math.floor(Math.random() * patterns.length)];
        const targetColorPair = colorPairs[Math.floor(Math.random() * colorPairs.length)];

        const targetButterfly = { c1: targetColorPair.c1, c2: targetColorPair.c2, spots: targetPattern };

        const distractors: ButterflyConfig[] = [];

        // Distractor 1: same pattern, different colors
        let altColorPair = colorPairs[Math.floor(Math.random() * colorPairs.length)];
        while (altColorPair === targetColorPair) {
            altColorPair = colorPairs[Math.floor(Math.random() * colorPairs.length)];
        }
        distractors.push({ c1: altColorPair.c1, c2: altColorPair.c2, spots: targetPattern });

        // Distractor 2: same colors, different pattern
        let altPattern = patterns[Math.floor(Math.random() * patterns.length)];
        while (altPattern === targetPattern) {
            altPattern = patterns[Math.floor(Math.random() * patterns.length)];
        }
        distractors.push({ c1: targetColorPair.c1, c2: targetColorPair.c2, spots: altPattern });

        const possibleAnswers = [
            { id: 'correct', config: targetButterfly, isCorrect: true },
            { id: 'd1', config: distractors[0], isCorrect: false },
            { id: 'd2', config: distractors[1], isCorrect: false }
        ];

        // Shuffle options
        for (let i = possibleAnswers.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [possibleAnswers[i], possibleAnswers[j]] = [possibleAnswers[j], possibleAnswers[i]];
        }

        setQuestionData({
            targetButterfly,
            options: possibleAnswers,
        });

        setSelectedOptionId(null);
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

    const checkAnswer = (option: { id: string; config: ButterflyConfig; isCorrect: boolean }) => {
        if (feedback !== null) return;

        setSelectedOptionId(option.id);

        if (option.isCorrect) {
            setFeedback('correct');
            setScore(prev => prev + 1);
            playSound(settings.successSoundUrl);

            // Magic Celebration
            const duration = 2500;
            const end = Date.now() + duration;

            (function frame() {
                confetti({
                    particleCount: 8,
                    angle: 90,
                    spread: 80,
                    origin: { x: 0.5, y: 0.8 },
                    colors: [option.config.c1, option.config.c2, '#ffffff', '#fbbf24'],
                    shapes: ['star', 'circle'],
                    gravity: 0.5,
                    scalar: 1.2
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
            playSound(settings.errorSoundUrl);

            setTimeout(() => {
                setShakeScreen(false);
                setFeedback(null);
                setSelectedOptionId(null); // allow trying again or show empty
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
                        gameType: 'symmetry-butterfly',
                    }),
                });
            }

            router.push(`/results?score=${finalScore}&total=${totalQuestions}&time=${timeSpent}&gameId=symmetry-butterfly${studentId ? `&studentId=${studentId}` : ''}`);
        } catch (error) {
            console.error('Error saving score:', error);
            alert('حدث خطأ في حفظ النتيجة');
        }
    };

    if (!gameStarted) {
        return (
            <div className="min-h-screen flex items-center justify-center p-4 bg-fuchsia-100 relative overflow-hidden font-sans" dir="rtl">
                {/* Floral/Garden Background */}
                <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/floral-flourish.png')] mix-blend-multiply pointer-events-none"></div>

                <div className="max-w-lg w-full relative z-10">
                    <div className="bg-white/95 backdrop-blur-md rounded-[2.5rem] shadow-[0_20px_60px_rgba(0,0,0,0.2)] p-8 text-center flex flex-col items-center border-[8px] border-fuchsia-300">
                        <div className="mb-4 text-8xl drop-shadow-xl animate-[bounce_4s_ease-in-out_infinite]">
                            🦋
                        </div>
                        <h1 className="text-4xl sm:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-600 to-pink-500 mb-4 tracking-tight">
                            فراشة التماثل
                        </h1>
                        <p className="text-xl text-fuchsia-800 mb-8 font-bold leading-relaxed">
                            اختر الجناح المطابق تماماً لتكتمل الفراشة وتطير في الحديقة! 🌸
                        </p>

                        <div className="mb-6 w-full">
                            <label htmlFor="name" className="block text-fuchsia-900 font-bold mb-2 text-right">
                                اسم صديق الطبيعة:
                            </label>
                            <input
                                type="text"
                                id="name"
                                value={studentName}
                                onChange={(e) => setStudentName(e.target.value)}
                                className="w-full px-4 py-3 bg-fuchsia-50 border-2 border-fuchsia-300 rounded-xl focus:border-fuchsia-500 focus:outline-none transition-all text-fuchsia-900 placeholder-fuchsia-400 text-center text-xl font-bold shadow-inner focus:bg-white"
                                placeholder="اكتب اسمك هنا"
                                required
                            />
                        </div>

                        <button
                            onClick={startGame}
                            className="w-full bg-gradient-to-r from-fuchsia-500 to-pink-500 hover:from-fuchsia-600 hover:to-pink-600 text-white font-black text-2xl py-4 rounded-xl shadow-[0_6px_0_#9d174d] active:shadow-[0_0px_0_#9d174d] active:translate-y-2 transform transition-all border-2 border-white/50 flex items-center justify-center gap-3"
                        >
                            <span>هيا لنطير!</span>
                            <span>✨</span>
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-b from-sky-200 to-emerald-200 relative overflow-hidden" dir="rtl">
            {/* Garden Flora Background */}
            <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/floral-flourish.png')] pointer-events-none mix-blend-multiply"></div>

            {/* Sun Rays */}
            <div className="absolute -top-40 -left-40 w-96 h-96 bg-yellow-200 rounded-full blur-3xl opacity-50 mix-blend-overlay"></div>

            <div className="max-w-5xl w-full relative z-10 py-10">
                <motion.div
                    animate={shakeScreen ? { x: [-10, 10, -10, 10, 0] } : {}}
                    transition={{ duration: 0.4 }}
                    className="bg-white/90 backdrop-blur-xl border border-white/80 rounded-[3rem] shadow-[0_20px_60px_rgba(0,0,0,0.15)] p-6 sm:p-10 relative"
                >
                    {/* Progress Header */}
                    <div className="mb-6 sm:mb-8">
                        <div className="flex justify-between items-center mb-4 text-center sm:text-right flex-col sm:flex-row gap-4">
                            <div className="order-2 sm:order-1 text-right flex-1 w-full">
                                <span className="block text-lg sm:text-lg font-bold text-fuchsia-700 mb-1">
                                    الفراشة الملونة {questionNumber} من {totalQuestions}
                                </span>
                                <span className="block text-2xl font-black text-fuchsia-600">
                                    الأجنحة المكتملة: {score} 🦋
                                </span>
                            </div>
                            <div className="order-1 sm:order-2 text-4xl sm:text-5xl drop-shadow bg-fuchsia-100 p-4 rounded-3xl border border-fuchsia-200">
                                🌷
                            </div>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden border border-slate-200">
                            <motion.div
                                className="bg-gradient-to-r from-fuchsia-400 to-pink-500 h-full rounded-full relative"
                                initial={{ width: 0 }}
                                animate={{ width: `${(questionNumber / totalQuestions) * 100}%` }}
                                transition={{ duration: 0.5 }}
                            />
                        </div>
                    </div>

                    {questionData && (
                        <>
                            <div className="text-center mb-10">
                                <h2 className="text-2xl sm:text-3xl font-black text-slate-800 leading-tight mb-3">
                                    اختر النصف المتماثل لتكتمل الفراشة وتطير!
                                </h2>
                                <span className="text-fuchsia-600 text-xl block font-bold mt-2 bg-fuchsia-50 px-4 py-1.5 rounded-full inline-block border border-fuchsia-200">
                                    تلميح: يجب أن يكون الجناح نسخة "مرآة" مطابقة تماماً.
                                </span>
                            </div>

                            {/* Butterfly Assembly Area */}
                            <div className="flex justify-center items-center mb-12 relative h-64 sm:h-80 w-full max-w-sm mx-auto">

                                {/* Background glow */}
                                <div className="absolute inset-0 bg-yellow-100/50 rounded-full blur-3xl scale-150"></div>

                                {/* Dash Line of Symmetry */}
                                <div className="absolute top-0 bottom-0 left-1/2 w-1.5 bg-dashed border-l-4 border-dashed border-slate-400/50 transform -translate-x-1/2 z-0"></div>

                                <div className="flex z-10 w-full justify-center">
                                    {/* RIGHT WING (Fixed starting half - rendered on the Right logically in RTL if aligned) */}
                                    <div className="flex-1 flex justify-end pl-0.5">
                                        <WingHalf
                                            isRight={true}
                                            c1={questionData.targetButterfly.c1}
                                            c2={questionData.targetButterfly.c2}
                                            spots={questionData.targetButterfly.spots}
                                            isFlapping={feedback === 'correct'}
                                        />
                                    </div>

                                    {/* LEFT WING (Slot to be filled) */}
                                    <div className="flex-1 flex justify-start pr-0.5 relative">
                                        <AnimatePresence>
                                            {feedback === 'correct' && selectedOptionId ? (
                                                <motion.div
                                                    initial={{ opacity: 0, scale: 0.8, x: -20, rotateY: 90 }}
                                                    animate={{ opacity: 1, scale: 1, x: 0, rotateY: 0 }}
                                                    className="w-full flex justify-end"
                                                >
                                                    <WingHalf
                                                        isRight={false}
                                                        c1={questionData.targetButterfly.c1}
                                                        c2={questionData.targetButterfly.c2}
                                                        spots={questionData.targetButterfly.spots}
                                                        isFlapping={feedback === 'correct'}
                                                    />
                                                </motion.div>
                                            ) : (
                                                <div className="w-[120px] sm:w-[160px] h-[200px] sm:h-[260px] opacity-20 relative">
                                                    {/* Placeholder skeleton */}
                                                    <div className="w-full h-full border-4 border-dashed border-slate-400 rounded-l-[100%] rounded-r-lg bg-slate-200/50"></div>
                                                </div>
                                            )}
                                        </AnimatePresence>

                                        {/* Fall away animation for wrong answer */}
                                        <AnimatePresence>
                                            {feedback === 'wrong' && selectedOptionId && (
                                                <motion.div
                                                    initial={{ scale: 1, opacity: 1 }}
                                                    animate={{ y: 200, opacity: 0, rotateZ: 45 }}
                                                    exit={{ display: 'none' }}
                                                    transition={{ duration: 0.8, ease: "easeIn" }}
                                                    className="absolute inset-0 flex justify-start pointer-events-none"
                                                >
                                                    <WingHalf
                                                        isRight={false}
                                                        c1={questionData.options.find(o => o.id === selectedOptionId)?.config.c1!}
                                                        c2={questionData.options.find(o => o.id === selectedOptionId)?.config.c2!}
                                                        spots={questionData.options.find(o => o.id === selectedOptionId)?.config.spots!}
                                                        isFlapping={false}
                                                    />
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                </div>
                            </div>

                            {/* Options Area */}
                            <div className="bg-slate-50 p-6 sm:p-8 rounded-[2rem] shadow-inner border-y border-slate-200 max-w-4xl mx-auto relative overflow-hidden">
                                <h3 className="text-slate-500 text-center font-bold mb-6">أي جناح يكمل النصف الأيمن؟</h3>

                                <div className="flex flex-col sm:flex-row flex-wrap justify-center items-center gap-6 sm:gap-10 w-full">
                                    <AnimatePresence>
                                        {questionData.options.map((option) => (
                                            <motion.button
                                                key={option.id}
                                                whileHover={{ scale: 1.05, y: -5 }}
                                                whileTap={{ scale: 0.95 }}
                                                onClick={() => checkAnswer(option)}
                                                disabled={feedback !== null}
                                                className={`
                                                    w-32 h-44 sm:w-40 sm:h-56 rounded-2xl relative
                                                    flex items-center justify-center transition-all disabled:opacity-50
                                                    bg-white shadow-[0_8px_20px_rgba(0,0,0,0.1)] border-2 border-slate-100
                                                    hover:border-fuchsia-300 hover:shadow-[0_10px_25px_rgba(217,70,239,0.3)]
                                                    ${selectedOptionId === option.id && feedback === 'wrong' ? 'border-red-500 bg-red-50' : ''}
                                                `}
                                            >
                                                {/* Scale down the SVG just for the button view */}
                                                <div className="scale-[0.6] sm:scale-[0.7] origin-center -ml-4 pointer-events-none">
                                                    <WingHalf
                                                        isRight={false}
                                                        c1={option.config.c1}
                                                        c2={option.config.c2}
                                                        spots={option.config.spots}
                                                        isFlapping={false}
                                                    />
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
                                            className="bg-fuchsia-100 border-4 border-fuchsia-400 text-fuchsia-800 px-8 py-4 rounded-[2rem] text-center shadow-xl w-full max-w-xl flex items-center justify-center gap-4 z-30"
                                        >
                                            <span className="text-4xl animate-pulse">🌟</span>
                                            <p className="text-xl sm:text-3xl font-black">تطابق مذهل! 🦋</p>
                                        </motion.div>
                                    )}

                                    {feedback === 'wrong' && (
                                        <motion.div
                                            key="wrong"
                                            initial={{ scale: 0.8, opacity: 0 }}
                                            animate={{ scale: 1, opacity: 1 }}
                                            exit={{ scale: 0.8, opacity: 0 }}
                                            className="bg-red-100 border-4 border-red-500 text-red-800 px-6 py-4 rounded-[2rem] text-center shadow-xl w-full max-w-xl flex items-center justify-center gap-4 z-30"
                                        >
                                            <span className="text-4xl">❌</span>
                                            <p className="text-xl sm:text-2xl font-black">هذا النصف لا يطابق النصف الأول!</p>
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
