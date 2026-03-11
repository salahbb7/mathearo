'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Difficulty } from '@/lib/difficulty';
import confetti from 'canvas-confetti';
import { motion, AnimatePresence } from 'framer-motion';

const CAR_COLORS = [
    'bg-red-500 border-red-700',
    'bg-yellow-400 border-yellow-600',
    'bg-green-500 border-green-700',
    'bg-blue-500 border-blue-700',
    'bg-purple-500 border-purple-700',
];

export default function MissingTrainGamePage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const studentId = searchParams.get('studentId');
  const isTeacher = searchParams.get('teacher') === 'true';
    const difficulty = (searchParams.get('difficulty') || 'medium') as Difficulty;
    const [gameStarted, setGameStarted] = useState(false);
    const [studentName, setStudentName] = useState('');

    const [sequence, setSequence] = useState<(number | null)[]>([]);
    const [missingValue, setMissingValue] = useState<number>(0);
    const [options, setOptions] = useState<{ id: number; value: number }[]>([]);

    const [score, setScore] = useState(0);
    const [questionNumber, setQuestionNumber] = useState(0);
    const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
    const [shakeLuggageId, setShakeLuggageId] = useState<number | null>(null);
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
        // Steps and start range scale with difficulty
        const steps = difficulty === 'easy' ? [2, 5] : difficulty === 'hard' ? [2, 5, 10, 20, 50] : [2, 5, 10];
        const step = steps[Math.floor(Math.random() * steps.length)];
        const startMax = difficulty === 'easy' ? 20 : difficulty === 'hard' ? 100 : 50;
        const startNumber = Math.floor(Math.random() * startMax) + 1;

        // Sequence of 5 numbers
        const newSeq = Array.from({ length: 5 }).map((_, i) => startNumber + (i * step));

        const hiddenIndex = Math.floor(Math.random() * 5);
        const hiddenValue = newSeq[hiddenIndex];

        const displaySeq: (number | null)[] = [...newSeq];
        displaySeq[hiddenIndex] = null;

        // Distractors
        const wrongAnswers = new Set<number>();
        while (wrongAnswers.size < 2) {
            const offset = (Math.floor(Math.random() * 3) + 1) * step * (Math.random() > 0.5 ? 1 : -1);
            let r = hiddenValue + offset;
            if (r <= 0) r = hiddenValue + (Math.floor(Math.random() * 3) + 1) * step; // ensure positive
            if (r !== hiddenValue) {
                wrongAnswers.add(r);
            }
        }

        const possibleAnswers = [hiddenValue, ...Array.from(wrongAnswers)];

        // Shuffle
        for (let i = possibleAnswers.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [possibleAnswers[i], possibleAnswers[j]] = [possibleAnswers[j], possibleAnswers[i]];
        }

        setSequence(displaySeq);
        setMissingValue(hiddenValue);
        setOptions(possibleAnswers.map((val, idx) => ({ id: idx, value: val })));
        setShakeLuggageId(null);
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


    const checkAnswer = (id: number, value: number) => {
        if (feedback !== null) return;

        if (value === missingValue) {
            setFeedback('correct');
            setScore(prev => prev + 1);
            playSound(settings.successSoundUrl);

            confetti({
                particleCount: 150,
                spread: 80,
                origin: { y: 0.6 },
                colors: ['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6'],
            });

            setTimeout(() => {
                nextQuestion(true);
            }, 2000);
        } else {
            setFeedback('wrong');
            setShakeLuggageId(id);
            playSound(settings.errorSoundUrl);

            setTimeout(() => {
                setShakeLuggageId(null);
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
                    gameType: 'missing-train',
                }),
            }); }

            router.push(`/results?score=${finalScore}&total=${totalQuestions}&time=${timeSpent}&gameId=missing-train${studentId ? `&studentId=${studentId}` : ''}`);
        } catch (error) {
            console.error('Error saving score:', error);
            alert('حدث خطأ في حفظ النتيجة');
        }
    };

    const [clouds, setClouds] = useState<{ id: number; top: string; delay: number; duration: number }[]>([]);
    useEffect(() => {
        const newClouds = Array.from({ length: 5 }).map((_, i) => ({
            id: i,
            top: `${Math.random() * 40}%`,
            delay: Math.random() * 5,
            duration: Math.random() * 30 + 30, // 30-60 seconds for slow drifting clouds
        }));
        setClouds(newClouds);
    }, []);

    if (!gameStarted) {
        return (
            <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-b from-sky-300 to-green-400 relative overflow-hidden" dir="rtl">
                {/* Subtle pattern overlay */}
                <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23ffffff\' fill-opacity=\'0.2\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')] opacity-30"></div>

                <div className="max-w-lg w-full relative z-10">
                    <div className="bg-white/95 backdrop-blur-md rounded-3xl shadow-2xl p-8 text-center flex flex-col items-center border-4 border-white">
                        <div className="mb-4 text-7xl animate-[bounce_3s_infinite]">
                            🚂
                        </div>
                        <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-red-600 to-orange-500 mb-4 drop-shadow-md">
                            القطار المفقود
                        </h1>
                        <p className="text-xl text-slate-700 mb-8 font-bold">
                            أكمل النمط لينطلق القطار! 🛤️
                        </p>

                        <div className="mb-6 w-full">
                            <label htmlFor="name" className="block text-slate-700 font-bold mb-2 text-right">
                                اسم سائق القطار:
                            </label>
                            <input
                                type="text"
                                id="name"
                                value={studentName}
                                onChange={(e) => setStudentName(e.target.value)}
                                className="w-full px-4 py-3 bg-slate-50 border-2 border-red-300 rounded-xl focus:border-red-500 focus:bg-white focus:outline-none transition-all text-slate-800 placeholder-slate-400 text-center text-xl font-bold shadow-inner"
                                placeholder="اكتب اسمك هنا"
                                required
                            />
                        </div>

                        <button
                            onClick={startGame}
                            className="w-full bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white font-black text-2xl py-4 rounded-xl shadow-[0_6px_0_#9a3412] active:shadow-[0_0px_0_#9a3412] active:translate-y-2 transform transition-all"
                        >
                            🚂 انطلق
                        </button>

                        <div className="mt-8 p-4 bg-orange-50 rounded-xl border border-orange-200 w-full">
                            <p className="text-sm text-orange-800 font-bold">
                                📝 ستتجاوز {totalQuestions} محطات
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-b from-sky-300 via-sky-200 to-green-400 relative overflow-hidden" dir="rtl">

            {/* Animated Clouds */}
            {clouds.map((cloud) => (
                <motion.div
                    key={cloud.id}
                    className="absolute text-white/50 text-6xl drop-shadow-sm select-none"
                    style={{ top: cloud.top, right: '-10%' }}
                    animate={{ right: ['-10%', '110%'] }}
                    transition={{ duration: cloud.duration, repeat: Infinity, ease: 'linear', delay: cloud.delay }}
                >
                    ☁️
                </motion.div>
            ))}

            <div className="max-w-5xl w-full relative z-10">
                <div className="bg-white/85 backdrop-blur-md border border-white/60 rounded-3xl shadow-2xl p-6 sm:p-10">

                    {/* Progress Header */}
                    <div className="mb-8">
                        <div className="flex justify-between items-center mb-4 text-center sm:text-right">
                            <div className="text-4xl sm:text-5xl drop-shadow">🚂</div>
                            <div className="text-right flex-1 px-4">
                                <span className="block text-lg sm:text-xl font-black text-slate-700 mb-1">
                                    المحطة {questionNumber} من {totalQuestions}
                                </span>
                                <span className="block text-2xl font-extrabold text-orange-600">
                                    التذاكر: {score} 🎟️
                                </span>
                            </div>
                        </div>
                        <div className="w-full bg-slate-200 rounded-full h-4 shadow-inner overflow-hidden border border-slate-300">
                            <motion.div
                                className="bg-gradient-to-r from-orange-400 to-red-500 h-full rounded-full relative"
                                initial={{ width: 0 }}
                                animate={{ width: `${(questionNumber / totalQuestions) * 100}%` }}
                                transition={{ duration: 0.5 }}
                            >
                                <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
                            </motion.div>
                        </div>
                    </div>

                    {/* Question Title */}
                    <div className="text-center mb-10">
                        <h2 className="text-2xl sm:text-4xl font-black text-slate-800 mb-6 drop-shadow-sm">
                            أكمل النمط لينطلق القطار!
                        </h2>
                    </div>

                    {/* Train Wrapper */}
                    <div className="relative mb-16 px-2 overflow-x-auto pb-8 pt-6">
                        <motion.div
                            className="flex items-end justify-start sm:justify-center gap-2 sm:gap-4 min-w-[700px] sm:min-w-0"
                            animate={feedback === 'correct' ? { x: [0, -70, 0] } : {}}
                            transition={{ duration: 1.8 }}
                        >
                            {/* Train Cars */}
                            <AnimatePresence mode="popLayout">
                                {sequence.map((num, i) => (
                                    <motion.div
                                        key={`car-${questionNumber}-${i}`}
                                        initial={{ scale: 0, y: 50 }}
                                        animate={{ scale: 1, y: 0 }}
                                        transition={{ delay: i * 0.1, type: 'spring' }}
                                        className={`
                      relative w-24 h-20 sm:w-28 sm:h-24 rounded-t-xl rounded-b-md shadow-lg
                      flex items-center justify-center border-4 border-b-8 z-10
                      ${CAR_COLORS[i % CAR_COLORS.length]}
                    `}
                                    >
                                        {/* Connection to next car (Except last visual car which is car 4 because engine is after it in DOM) */}
                                        <div className="absolute -left-6 bottom-4 w-6 h-3 bg-slate-700/80 z-0 rounded-sm shadow-inner" />

                                        {/* Wheels */}
                                        <div className="absolute -bottom-5 right-2 w-8 h-8 bg-slate-800 rounded-full border-4 border-slate-300 shadow-md flex items-center justify-center">
                                            <div className="w-2 h-2 bg-slate-400 rounded-full"></div>
                                        </div>
                                        <div className="absolute -bottom-5 left-2 w-8 h-8 bg-slate-800 rounded-full border-4 border-slate-300 shadow-md flex items-center justify-center">
                                            <div className="w-2 h-2 bg-slate-400 rounded-full"></div>
                                        </div>

                                        {/* Window / Number background */}
                                        <div className="w-[85%] h-[75%] bg-white/95 rounded-lg shadow-inner flex items-center justify-center overflow-hidden relative">
                                            {num === null ? (
                                                <AnimatePresence mode="wait">
                                                    {feedback === 'correct' ? (
                                                        <motion.span
                                                            initial={{ scale: 0, opacity: 0 }}
                                                            animate={{ scale: 1, opacity: 1 }}
                                                            className="text-4xl sm:text-5xl font-black text-green-600"
                                                        >
                                                            {missingValue}
                                                        </motion.span>
                                                    ) : (
                                                        <motion.span
                                                            animate={{ opacity: [1, 0.4, 1] }}
                                                            transition={{ repeat: Infinity, duration: 1.5 }}
                                                            className="text-4xl sm:text-5xl font-black text-slate-300"
                                                        >
                                                            ?
                                                        </motion.span>
                                                    )}
                                                </AnimatePresence>
                                            ) : (
                                                <span className="text-3xl sm:text-4xl font-black text-slate-800 drop-shadow-sm">
                                                    {num}
                                                </span>
                                            )}
                                        </div>
                                    </motion.div>
                                ))}
                            </AnimatePresence>

                            {/* Train Engine (Visual Left side in RTL since it is last in DOM mapping) */}
                            <div className="relative z-20">
                                <div className="text-7xl sm:text-8xl drop-shadow-2xl relative">
                                    🚂
                                </div>
                                {/* Smoke animation */}
                                <motion.div
                                    className="absolute -top-8 right-8 text-3xl text-white/80"
                                    animate={{ y: [0, -30], opacity: [1, 0], scale: [1, 2] }}
                                    transition={{ duration: 1.2, repeat: Infinity, ease: 'easeOut' }}
                                >
                                    ☁️
                                </motion.div>
                            </div>
                        </motion.div>

                        {/* Railroad Track */}
                        <div className="absolute bottom-[10px] left-0 right-0 h-4 flex flex-col justify-end opacity-80 z-0">
                            <div className="w-full h-2 bg-slate-600 mb-1 rounded-full shadow-md"></div>
                            <div className="flex w-full justify-between overflow-hidden">
                                {Array.from({ length: 40 }).map((_, i) => (
                                    <div key={i} className="w-2 h-3 bg-slate-700 inline-block mx-[3px] skew-x-[-20deg]"></div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Controls (Luggage) */}
                    <div className="flex flex-wrap justify-center gap-6 sm:gap-12 mb-6 pt-8 border-t-4 border-dotted border-slate-300/50">
                        {options.map((option, i) => (
                            <motion.button
                                key={option.id}
                                whileHover={{ scale: 1.05, y: -5 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => checkAnswer(option.id, option.value)}
                                disabled={feedback !== null}
                                animate={shakeLuggageId === option.id ? { x: [-10, 10, -10, 10, 0] } : {}}
                                className={`
                  w-28 h-28 sm:w-36 sm:h-36 rounded-2xl relative
                  flex flex-col items-center justify-center transition-all disabled:opacity-90
                  shadow-[0_8px_0_rgba(0,0,0,0.3)] active:shadow-[0_0px_0_rgba(0,0,0,0.3)] active:translate-y-2
                  ${shakeLuggageId === option.id
                                        ? 'bg-red-100 border-4 border-red-500'
                                        : (feedback === 'correct' && option.value === missingValue)
                                            ? 'bg-green-100 border-4 border-green-500'
                                            : 'bg-[#8B4513] hover:bg-[#A0522D] border-4 border-[#5C2E09]'
                                    }
                `}
                            >
                                {/* Luggage Handle */}
                                <div className="absolute -top-5 w-14 h-6 border-4 border-[#5C2E09] rounded-t-lg border-b-0 bg-transparent" />

                                {/* Luggage Straps */}
                                <div className="absolute left-5 top-0 bottom-0 w-3 bg-[#5C2E09]/40 drop-shadow-sm" />
                                <div className="absolute right-5 top-0 bottom-0 w-3 bg-[#5C2E09]/40 drop-shadow-sm" />

                                {/* Luggage Tag / Sticker */}
                                <div className="bg-amber-50 w-16 h-16 sm:w-20 sm:h-20 rounded-md flex items-center justify-center rotate-[-3deg] shadow-md border-2 border-amber-200 z-10">
                                    <span className={`text-3xl sm:text-4xl font-black ${shakeLuggageId === option.id ? 'text-red-600' : (feedback === 'correct' && option.value === missingValue) ? 'text-green-600' : 'text-slate-800'}`}>
                                        {option.value}
                                    </span>
                                </div>
                            </motion.button>
                        ))}
                    </div>

                    {/* Feedback Section */}
                    <div className="h-20 flex items-center justify-center">
                        <AnimatePresence mode="wait">
                            {feedback === 'correct' && (
                                <motion.div
                                    key="correct"
                                    initial={{ scale: 0.5, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    exit={{ scale: 0.5, opacity: 0 }}
                                    className="bg-green-100 border-4 border-green-500 text-green-700 px-8 py-4 rounded-2xl text-center shadow-xl"
                                >
                                    <p className="text-2xl sm:text-3xl font-black">إجابة صحيحة! توت توت 🚂</p>
                                </motion.div>
                            )}

                            {feedback === 'wrong' && (
                                <motion.div
                                    key="wrong"
                                    initial={{ scale: 0.8, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    exit={{ scale: 0.8, opacity: 0 }}
                                    className="bg-red-100 border-4 border-red-500 text-red-700 px-8 py-4 rounded-2xl text-center shadow-xl"
                                >
                                    <p className="text-2xl sm:text-3xl font-black">فكر مجدداً! ❌</p>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                </div>
            </div>
        </div>
    );
}
