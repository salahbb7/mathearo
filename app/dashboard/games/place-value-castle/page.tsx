'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Difficulty } from '@/lib/difficulty';
import confetti from 'canvas-confetti';
import { motion, AnimatePresence } from 'framer-motion';

export default function PlaceValueCastleGamePage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const studentId = searchParams.get('studentId');
  const isTeacher = searchParams.get('teacher') === 'true';
    const difficulty = (searchParams.get('difficulty') || 'medium') as Difficulty;
    // Number range: easy 11-49, medium 11-99, hard 11-999 (hundreds)
    const targetMax = difficulty === 'easy' ? 38 : difficulty === 'hard' ? 988 : 88;
    const [gameStarted, setGameStarted] = useState(false);
    const [studentName, setStudentName] = useState('');

    const [targetNumber, setTargetNumber] = useState(0);
    const [tensCount, setTensCount] = useState(0);
    const [onesCount, setOnesCount] = useState(0);

    const [score, setScore] = useState(0);
    const [questionNumber, setQuestionNumber] = useState(0);
    const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
    const [shakeBlocks, setShakeBlocks] = useState(false);
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
        // Number range scales with difficulty
        const target = Math.floor(Math.random() * targetMax) + 11;
        setTargetNumber(target);
        setTensCount(0);
        setOnesCount(0);
        setShakeBlocks(false);
        setFeedback(null);
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


    const handleAddTen = () => {
        if (feedback !== null) return;
        if (tensCount < 9) setTensCount(prev => prev + 1);
    };

    const handleAddOne = () => {
        if (feedback !== null) return;
        if (onesCount < 18) setOnesCount(prev => prev + 1); // Allow up to 18 for carryover mistakes or flexibility
    };

    const handleReset = () => {
        if (feedback !== null) return;
        setTensCount(0);
        setOnesCount(0);
    };

    const checkAnswer = () => {
        if (feedback !== null) return;

        const currentTotal = tensCount * 10 + onesCount;

        if (currentTotal === targetNumber) {
            setFeedback('correct');
            setScore(prev => prev + 1);
            playSound(settings.successSoundUrl);

            confetti({
                particleCount: 150,
                spread: 80,
                origin: { y: 0.6 },
                colors: ['#3b82f6', '#60a5fa', '#bfdbfe', '#fef08a'],
            });

            setTimeout(() => {
                nextQuestion(true);
            }, 2500);
        } else {
            setFeedback('wrong');
            setShakeBlocks(true);
            playSound(settings.errorSoundUrl);

            setTimeout(() => {
                setShakeBlocks(false);
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
            if (!isTeacher) { await fetch('/api/scores', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    studentName: studentName || 'Student',
                    studentId: studentId || undefined,
                    score: finalScore,
                    totalQuestions,
                    timeSpent,
                    gameType: 'place-value-castle',
                }),
            }); }

            router.push(`/results?score=${finalScore}&total=${totalQuestions}&time=${timeSpent}&gameId=place-value-castle${studentId ? `&studentId=${studentId}` : ''}`);
        } catch (error) {
            console.error('Error saving score:', error);
            alert('حدث خطأ في حفظ النتيجة');
        }
    };

    const tensArray = Array.from({ length: tensCount });
    const onesArray = Array.from({ length: onesCount });

    if (!gameStarted) {
        return (
            <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-b from-blue-900 to-indigo-900 relative overflow-hidden" dir="rtl">
                {/* Decorative Castle Background */}
                <div className="absolute bottom-0 w-full opacity-30 pointer-events-none flex justify-center">
                    <div className="w-[600px] h-[300px] bg-indigo-950 flex shadow-2xl relative">
                        <div className="absolute -top-16 left-0 w-32 h-64 bg-indigo-950"></div>
                        <div className="absolute -top-16 right-0 w-32 h-64 bg-indigo-950"></div>
                        <div className="w-full mt-auto flex justify-center border-t-8 border-indigo-900">
                            <div className="w-32 h-40 bg-indigo-900 rounded-t-full mt-20 border-4 border-b-0 border-indigo-800"></div>
                        </div>
                    </div>
                </div>

                <div className="max-w-lg w-full relative z-10">
                    <div className="bg-slate-800/90 backdrop-blur-md rounded-3xl shadow-2xl p-8 text-center flex flex-col items-center border-[4px] border-slate-600">
                        <div className="mb-4 text-7xl drop-shadow-[0_0_15px_rgba(59,130,246,0.5)]">
                            🏰
                        </div>
                        <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300 mb-4 drop-shadow-md">
                            قلعة الآحاد والعشرات
                        </h1>
                        <p className="text-xl text-blue-100 mb-8 font-bold">
                            ابنِ الأرقام بدقة لتفتح بوابات القلعة! 🧱
                        </p>

                        <div className="mb-6 w-full">
                            <label htmlFor="name" className="block text-blue-200 font-bold mb-2 text-right text-lg">
                                اسم البطل المِعمارِي:
                            </label>
                            <input
                                type="text"
                                id="name"
                                value={studentName}
                                onChange={(e) => setStudentName(e.target.value)}
                                className="w-full px-4 py-4 bg-slate-900 border-2 border-blue-500/50 rounded-xl focus:border-cyan-400 focus:bg-slate-800 focus:outline-none transition-all text-white placeholder-slate-500 text-center text-xl font-black shadow-inner"
                                placeholder="اكتب اسمك هنا"
                                required
                            />
                        </div>

                        <button
                            onClick={startGame}
                            className="w-full bg-gradient-to-r from-blue-500 to-cyan-600 hover:from-blue-600 hover:to-cyan-700 text-white font-black text-2xl py-5 rounded-xl shadow-[0_6px_0_#1e3a8a] active:shadow-[0_0px_0_#1e3a8a] active:translate-y-2 transform transition-all border border-blue-400/30"
                        >
                            ابدأ البناء 🏰
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-4 sm:p-8 bg-gradient-to-b from-blue-900 to-indigo-900 relative overflow-hidden" dir="rtl">

            {/* Target Number Banner */}
            <motion.div
                initial={{ y: -50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="fixed top-6 z-20 w-[95%] sm:w-auto min-w-[320px]"
            >
                <div className="bg-slate-800/95 backdrop-blur-md border-4 border-blue-500/50 rounded-2xl p-4 shadow-[0_10px_30px_rgba(0,0,0,0.5)] flex flex-col items-center justify-center">
                    <span className="text-blue-200 text-lg font-bold mb-1">أيها البطل، ابنِ الرقم:</span>
                    <div className="bg-slate-900 px-8 py-2 rounded-xl border border-blue-500/30 shadow-inner inline-flex items-center justify-center min-w-[120px]">
                        <span className="text-5xl sm:text-6xl font-black text-cyan-400 drop-shadow-[0_0_10px_rgba(34,211,238,0.6)]">
                            {targetNumber}
                        </span>
                    </div>
                </div>
            </motion.div>

            {/* Progress Ring (Top Right/Left based on RTL) */}
            <div className="fixed top-6 right-6 sm:right-10 z-20 hidden sm:flex flex-col items-center">
                <div className="bg-slate-800/90 rounded-2xl p-3 border-2 border-slate-600 shadow-xl text-center">
                    <div className="text-3xl mb-1">🏰</div>
                    <div className="text-white font-bold text-sm">مرحلة {questionNumber}/{totalQuestions}</div>
                    <div className="text-cyan-400 font-black">النقاط: {score}</div>
                </div>
            </div>

            <div className="w-full max-w-5xl flex flex-col mt-28 sm:mt-24 z-10 gap-6">

                {/* Building Area */}
                <div className="bg-slate-800/60 backdrop-blur-sm border-b-[16px] border-slate-700 rounded-3xl p-6 sm:p-10 shadow-2xl min-h-[400px] flex flex-col justify-end relative">

                    {/* Visual Guides / Headers inside build area */}
                    <div className="absolute top-4 w-full left-0 right-0 flex justify-between px-10 pointer-events-none opacity-40">
                        <div className="w-1/2 text-center text-blue-200 font-bold text-xl sm:text-2xl border-b-2 border-dashed border-blue-500 pb-2 mx-4">عشرات (+10)</div>
                        <div className="w-1/2 text-center text-blue-200 font-bold text-xl sm:text-2xl border-b-2 border-dashed border-cyan-500 pb-2 mx-4">آحاد (+1)</div>
                    </div>

                    <motion.div
                        className="flex justify-between w-full h-[300px]"
                        animate={shakeBlocks ? { x: [-15, 15, -15, 15, 0] } : {}}
                        transition={{ duration: 0.5 }}
                    >
                        {/* TENS COLUMN AREA */}
                        <div className="w-1/2 flex items-end justify-center gap-2 sm:gap-4 px-2">
                            <AnimatePresence>
                                {tensArray.map((_, i) => (
                                    <motion.div
                                        key={`ten-${i}`}
                                        initial={{ y: -200, opacity: 0 }}
                                        animate={{ y: 0, opacity: 1 }}
                                        exit={{ scale: 0, opacity: 0 }}
                                        className="w-10 sm:w-12 h-[260px] bg-gradient-to-b from-blue-400 to-blue-600 rounded-sm border-2 border-blue-700 shadow-[2px_2px_0px_#1e3a8a] flex flex-col relative"
                                    >
                                        {/* Segment lines for Tens blocks */}
                                        {Array.from({ length: 9 }).map((_, j) => (
                                            <div key={j} className="h-1/10 w-full border-b border-blue-700/50 mt-[23.5px]"></div>
                                        ))}
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                        </div>

                        {/* ONES COLUMN AREA (Grid Layout for stacking) */}
                        <div className="w-1/2 flex items-end justify-center px-4">
                            <div className="flex flex-wrap-reverse justify-center gap-2 max-w-[200px] pb-1">
                                <AnimatePresence>
                                    {onesArray.map((_, i) => (
                                        <motion.div
                                            key={`one-${i}`}
                                            initial={{ scale: 0, y: -50 }}
                                            animate={{ scale: 1, y: 0 }}
                                            exit={{ scale: 0, opacity: 0 }}
                                            className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-cyan-300 to-cyan-500 rounded-sm border-2 border-cyan-700 shadow-[2px_2px_0_#0891b2] flex items-center justify-center"
                                        >
                                            <span className="text-white/40 text-xs font-black">1</span>
                                        </motion.div>
                                    ))}
                                </AnimatePresence>
                            </div>
                        </div>
                    </motion.div>
                </div>

                {/* Controls Section */}
                <div className="bg-slate-800/90 backdrop-blur-md rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-600">

                    <div className="flex flex-col sm:flex-row gap-4 mb-6">
                        <button
                            onClick={handleAddTen}
                            disabled={feedback !== null || tensCount >= 9}
                            className="flex-1 flex flex-col items-center justify-center bg-blue-500 hover:bg-blue-400 active:bg-blue-600 text-white p-4 rounded-2xl shadow-[0_6px_0_#1e3a8a] active:shadow-[0_0px_0_#1e3a8a] active:translate-y-2 transition-all disabled:opacity-50 disabled:active:translate-y-0 disabled:active:shadow-[0_6px_0_#1e3a8a] h-28"
                        >
                            <span className="text-3xl font-black drop-shadow-md mb-1">+10</span>
                            <span className="text-lg font-bold text-blue-100">(عشرات)</span>
                        </button>

                        <button
                            onClick={handleAddOne}
                            disabled={feedback !== null || onesCount >= 18}
                            className="flex-1 flex flex-col items-center justify-center bg-cyan-500 hover:bg-cyan-400 active:bg-cyan-600 text-white p-4 rounded-2xl shadow-[0_6px_0_#0891b2] active:shadow-[0_0px_0_#0891b2] active:translate-y-2 transition-all disabled:opacity-50 disabled:active:translate-y-0 disabled:active:shadow-[0_6px_0_#0891b2] h-28"
                        >
                            <span className="text-3xl font-black drop-shadow-md mb-1">+1</span>
                            <span className="text-lg font-bold text-cyan-100">(آحاد)</span>
                        </button>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-4">
                        <button
                            onClick={handleReset}
                            disabled={feedback !== null || (onesCount === 0 && tensCount === 0)}
                            className="w-full sm:w-1/3 bg-slate-700 hover:bg-slate-600 active:bg-slate-800 text-slate-200 p-4 rounded-xl shadow-[0_5px_0_#334155] active:shadow-[0_0px_0_#334155] active:translate-y-1 transition-all font-bold text-xl disabled:opacity-50"
                        >
                            مسح 🗑️
                        </button>

                        <button
                            onClick={checkAnswer}
                            disabled={feedback !== null || (onesCount === 0 && tensCount === 0)}
                            className="w-full sm:w-2/3 bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-400 hover:to-green-400 active:bg-emerald-600 text-white p-4 rounded-xl shadow-[0_6px_0_#047857] active:shadow-[0_0px_0_#047857] active:translate-y-2 transition-all font-black text-2xl flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                            تأكيد وبناء 🏰
                        </button>
                    </div>

                    {/* Current Total Display (Helper for student) */}
                    <div className="mt-4 text-center">
                        <span className="text-slate-400 font-bold">المجموع الحالي في البناء: </span>
                        <span className="text-2xl font-black text-white">{tensCount * 10 + onesCount}</span>
                    </div>
                </div>

            </div>

            {/* Feedback Overlay completely hiding standard layout if wanted, but using a modal-like pop for absolute clarity */}
            <AnimatePresence>
                {feedback && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className={`fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm ${feedback === 'correct' ? 'bg-green-900/40' : 'bg-red-900/40'}`}
                    >
                        <motion.div
                            initial={{ scale: 0.5, y: 50 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.5, opacity: 0 }}
                            className={`max-w-md w-full rounded-3xl p-8 text-center shadow-2xl border-4 ${feedback === 'correct' ? 'bg-green-100 border-green-500 text-green-800' : 'bg-red-100 border-red-500 text-red-800'}`}
                        >
                            <div className="text-6xl mb-4">
                                {feedback === 'correct' ? '🏰✨' : '🧱❌'}
                            </div>
                            <h2 className="text-3xl font-black mb-2">
                                {feedback === 'correct' ? 'عمل رائع أيها البناء!' : 'العدد غير مطابق، حاول مجدداً!'}
                            </h2>
                            {feedback === 'correct' && (
                                <p className="text-xl font-bold mt-2">البوابة تُفتح...</p>
                            )}
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

        </div>
    );
}
