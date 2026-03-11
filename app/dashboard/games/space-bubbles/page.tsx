'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Difficulty } from '@/lib/difficulty';
import confetti from 'canvas-confetti';
import { motion, AnimatePresence } from 'framer-motion';

export default function SpaceBubblesGamePage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const studentId = searchParams.get('studentId');
  const isTeacher = searchParams.get('teacher') === 'true';
    const difficulty = (searchParams.get('difficulty') || 'medium') as Difficulty;
    const [gameStarted, setGameStarted] = useState(false);
    const [studentName, setStudentName] = useState('');

    const [targetNumber, setTargetNumber] = useState(0);
    const [bubbles, setBubbles] = useState<{ id: number; value: number }[]>([]);

    const [score, setScore] = useState(0);
    const [questionNumber, setQuestionNumber] = useState(0);
    const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
    const [shakeBubbleId, setShakeBubbleId] = useState<number | null>(null);
    const [startTime, setStartTime] = useState<number>(0);

    const [settings, setSettings] = useState({
        successSoundUrl: '',
        errorSoundUrl: '',
        backgroundMusicUrl: '',
    });

    const totalQuestions = 10;

    // Fetch game settings
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
        const num = Math.floor(Math.random() * 11); // 0 to 10
        const correct = 10 - num;

        const wrongAnswers = new Set<number>();
        while (wrongAnswers.size < 3) {
            const r = Math.floor(Math.random() * 11);
            if (r !== correct) {
                wrongAnswers.add(r);
            }
        }

        const answers = [correct, ...Array.from(wrongAnswers)];

        // Shuffle array
        for (let i = answers.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [answers[i], answers[j]] = [answers[j], answers[i]];
        }

        setTargetNumber(num);
        setBubbles(answers.map((val, idx) => ({ id: idx, value: val })));
        setShakeBubbleId(null);
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
        if (feedback !== null) return; // Prevent multiple clicks

        const isCorrect = targetNumber + value === 10;

        if (isCorrect) {
            setFeedback('correct');
            setScore(prev => prev + 1);
            playSound(settings.successSoundUrl);

            // Rocket/Star Confetti
            confetti({
                particleCount: 100,
                spread: 70,
                origin: { y: 0.6 },
                colors: ['#a855f7', '#ec4899', '#eab308', '#3b82f6'],
            });

            setTimeout(() => {
                nextQuestion(true);
            }, 2000);
        } else {
            setFeedback('wrong');
            setShakeBubbleId(id);
            playSound(settings.errorSoundUrl);

            setTimeout(() => {
                setShakeBubbleId(null);
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
                    gameType: 'space-bubbles',
                }),
            }); }

            router.push(`/results?score=${finalScore}&total=${totalQuestions}&time=${timeSpent}&gameId=space-bubbles${studentId ? `&studentId=${studentId}` : ''}`);
        } catch (error) {
            console.error('Error saving score:', error);
            alert('حدث خطأ في حفظ النتيجة');
        }
    };

    // Generate some random stars for the background
    const [stars, setStars] = useState<{ id: number; left: string; top: string; size: number; delay: number }[]>([]);
    useEffect(() => {
        const newStars = Array.from({ length: 30 }).map((_, i) => ({
            id: i,
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            size: Math.random() * 3 + 1,
            delay: Math.random() * 2,
        }));
        setStars(newStars);
    }, []);

    if (!gameStarted) {
        return (
            <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-indigo-950 via-purple-900 to-slate-900 relative overflow-hidden" dir="rtl">
                {/* Background Stars layer */}
                {stars.map((star) => (
                    <motion.div
                        key={star.id}
                        className="absolute bg-white rounded-full opacity-50"
                        style={{ left: star.left, top: star.top, width: star.size, height: star.size }}
                        animate={{ opacity: [0.2, 0.8, 0.2] }}
                        transition={{ duration: 2, repeat: Infinity, delay: star.delay }}
                    />
                ))}

                <div className="max-w-lg w-full relative z-10">
                    <div className="bg-white/10 backdrop-blur-md rounded-3xl shadow-2xl p-8 text-center flex flex-col items-center border border-white/20">
                        <div className="mb-4 text-7xl">
                            🚀
                        </div>
                        <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400 mb-4 drop-shadow-lg">
                            فقاعات الفضاء
                        </h1>
                        <p className="text-xl text-white/90 mb-8 font-medium">
                            حلق في الفضاء وأكمل الأعداد لتصبح 10! ✨
                        </p>

                        <div className="mb-6 w-full">
                            <label htmlFor="name" className="block text-purple-200 font-bold mb-2 text-right">
                                ما اسمك؟
                            </label>
                            <input
                                type="text"
                                id="name"
                                value={studentName}
                                onChange={(e) => setStudentName(e.target.value)}
                                className="w-full px-4 py-3 bg-white/20 border-2 border-purple-400/50 rounded-xl focus:border-pink-400 focus:bg-white/30 focus:outline-none transition-all text-white placeholder-purple-300 text-center text-xl font-bold"
                                placeholder="اكتب اسم رائد الفضاء هنا"
                                required
                            />
                        </div>

                        <button
                            onClick={startGame}
                            className="w-full bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white font-bold text-2xl py-4 rounded-xl shadow-[0_0_20px_rgba(236,72,153,0.4)] transform hover:scale-105 transition-all duration-200"
                        >
                            🚀 انطلق
                        </button>

                        <div className="mt-6 p-4 bg-purple-900/40 rounded-xl border border-purple-500/30 w-full">
                            <p className="text-sm text-purple-200 font-bold">
                                📝 ستجيب على {totalQuestions} أسئلة
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-indigo-950 via-purple-900 to-slate-900 relative overflow-hidden" dir="rtl">
            {/* Background Stars layer */}
            {stars.map((star) => (
                <motion.div
                    key={star.id}
                    className="absolute bg-white rounded-full opacity-50"
                    style={{ left: star.left, top: star.top, width: star.size, height: star.size }}
                    animate={{ opacity: [0.2, 0.8, 0.2] }}
                    transition={{ duration: 2, repeat: Infinity, delay: star.delay }}
                />
            ))}

            <div className="max-w-4xl w-full relative z-10">
                <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-3xl shadow-2xl p-6 sm:p-10">

                    {/* Progress Header */}
                    <div className="mb-8">
                        <div className="flex justify-between items-center mb-4 text-center sm:text-right">
                            <div className="text-4xl sm:text-5xl">👨‍🚀</div>
                            <div className="text-right flex-1 px-4">
                                <span className="block text-lg sm:text-xl font-bold text-purple-200 mb-1">
                                    المهمة {questionNumber} من {totalQuestions}
                                </span>
                                <span className="block text-2xl font-extrabold text-pink-400">
                                    النجوم: {score} ⭐️
                                </span>
                            </div>
                        </div>
                        <div className="w-full bg-indigo-950/50 rounded-full h-4 shadow-inner overflow-hidden border border-purple-500/30">
                            <motion.div
                                className="bg-gradient-to-r from-pink-500 to-purple-500 h-full rounded-full relative"
                                initial={{ width: 0 }}
                                animate={{ width: `${(questionNumber / totalQuestions) * 100}%` }}
                                transition={{ duration: 0.5 }}
                            >
                                <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
                            </motion.div>
                        </div>
                    </div>

                    {/* Question Area */}
                    <div className="text-center mb-10">
                        <h2 className="text-2xl sm:text-4xl font-extrabold text-white mb-6 drop-shadow-md leading-relaxed">
                            ما هو العدد الذي يكمل الـ <span className="text-yellow-400 text-3xl sm:text-5xl mx-2 bg-black/30 px-4 py-2 rounded-2xl border border-yellow-400/30 inline-block">{targetNumber}</span> ليصبح 10؟
                        </h2>
                    </div>

                    {/* Bubbles Area */}
                    <div className="flex flex-wrap justify-center gap-6 sm:gap-12 mb-10 min-h-[160px]">
                        <AnimatePresence>
                            {bubbles.map((bubble, i) => (
                                <motion.button
                                    key={bubble.id}
                                    initial={{ opacity: 0, scale: 0, y: 50 }}
                                    animate={
                                        shakeBubbleId === bubble.id
                                            ? { x: [-10, 10, -10, 10, 0], scale: 1, opacity: 1 }
                                            : {
                                                opacity: 1,
                                                scale: 1,
                                                y: [0, -15, 0], // Floating effect
                                                transition: {
                                                    y: { duration: 2.5 + (i * 0.2), repeat: Infinity, ease: "easeInOut" },
                                                    scale: { duration: 0.3 }
                                                }
                                            }
                                    }
                                    exit={{ opacity: 0, scale: 0, y: -50 }}
                                    whileHover={{ scale: 1.1, boxShadow: "0px 0px 20px rgba(255,255,255,0.5)" }}
                                    whileTap={{ scale: 0.9 }}
                                    onClick={() => checkAnswer(bubble.id, bubble.value)}
                                    disabled={feedback !== null}
                                    className={`
                    w-24 h-24 sm:w-32 sm:h-32 rounded-full flex items-center justify-center
                    text-4xl sm:text-5xl font-extrabold text-white shadow-xl backdrop-blur-sm
                    border-4 transition-colors disabled:opacity-80
                    ${shakeBubbleId === bubble.id
                                            ? 'bg-red-500/80 border-red-300'
                                            : (feedback === 'correct' && targetNumber + bubble.value === 10)
                                                ? 'bg-green-500/80 border-green-300'
                                                : 'bg-gradient-to-br from-cyan-400/40 to-blue-600/60 border-cyan-300/50 hover:bg-cyan-400/60'
                                        }
                  `}
                                    style={{
                                        boxShadow: 'inset -5px -5px 15px rgba(0,0,0,0.3), inset 5px 5px 15px rgba(255,255,255,0.4)',
                                    }}
                                >
                                    <span className="drop-shadow-md">{bubble.value}</span>
                                </motion.button>
                            ))}
                        </AnimatePresence>
                    </div>

                    {/* Feedback Section */}
                    <div className="h-24 flex items-center justify-center">
                        <AnimatePresence mode="wait">
                            {feedback === 'correct' && (
                                <motion.div
                                    key="correct"
                                    initial={{ scale: 0.5, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    exit={{ scale: 0.5, opacity: 0 }}
                                    className="bg-green-500/20 border-2 border-green-400 text-green-300 px-8 py-4 rounded-2xl text-center backdrop-blur-md shadow-[0_0_20px_rgba(74,222,128,0.3)]"
                                >
                                    <p className="text-3xl sm:text-4xl font-extrabold">ممتاز! انطلق الصاروخ 🚀</p>
                                </motion.div>
                            )}

                            {feedback === 'wrong' && (
                                <motion.div
                                    key="wrong"
                                    initial={{ scale: 0.8, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    exit={{ scale: 0.8, opacity: 0 }}
                                    className="bg-red-500/20 border-2 border-red-400 text-red-300 px-8 py-4 rounded-2xl text-center backdrop-blur-md"
                                >
                                    <p className="text-3xl sm:text-4xl font-extrabold">حاول مرة أخرى ❌</p>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                </div>
            </div>
        </div>
    );
}
