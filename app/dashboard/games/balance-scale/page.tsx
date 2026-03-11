'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Difficulty } from '@/lib/difficulty';
import confetti from 'canvas-confetti';
import { motion, AnimatePresence } from 'framer-motion';

export default function BalanceScaleGamePage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const studentId = searchParams.get('studentId');
  const isTeacher = searchParams.get('teacher') === 'true';
    const difficulty = (searchParams.get('difficulty') || 'medium') as Difficulty;
    const maxSum = difficulty === 'easy' ? 15 : difficulty === 'hard' ? 50 : 20;
    const [gameStarted, setGameStarted] = useState(false);
    const [studentName, setStudentName] = useState('');

    // Expressions:  a + b = c + ?
    const [numA1, setNumA1] = useState(0);
    const [numA2, setNumA2] = useState(0);
    const [numB1, setNumB1] = useState(0);
    const [targetB2, setTargetB2] = useState(0);
    const [options, setOptions] = useState<number[]>([]);

    // selectedAnswer is null before choosing
    const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);

    const [score, setScore] = useState(0);
    const [questionNumber, setQuestionNumber] = useState(0);
    const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
    const [shake, setShake] = useState(false);
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
        setFeedback(null);
        setSelectedAnswer(null);

        // Target sum scales with difficulty
        const currentSum = Math.floor(Math.random() * (maxSum - 4)) + 5;

        // Split into A1 + A2
        const nA1 = Math.floor(Math.random() * (currentSum - 1)) + 1;
        const nA2 = currentSum - nA1;
        setNumA1(nA1);
        setNumA2(nA2);

        // Split into B1 + B2
        const nB1 = Math.floor(Math.random() * (currentSum - 1)) + 1;
        const nB2 = currentSum - nB1;
        setNumB1(nB1);
        setTargetB2(nB2);

        // Generate options (3 distinct)
        const opts = new Set<number>();
        opts.add(nB2);
        while (opts.size < 3) {
            const randOpt = nB2 + (Math.floor(Math.random() * 9) - 4); // -4 to +4
            if (randOpt > 0 && randOpt !== nB2) {
                opts.add(randOpt);
            }
        }
        setOptions(Array.from(opts).sort(() => Math.random() - 0.5));
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


    const checkAnswer = (selectedOpt: number) => {
        if (feedback !== null) return;

        setSelectedAnswer(selectedOpt);

        if (selectedOpt === targetB2) {
            setFeedback('correct');
            setScore(prev => prev + 1);
            playSound(settings.successSoundUrl);

            confetti({
                particleCount: 200,
                spread: 100,
                origin: { y: 0.5 },
                colors: ['#f87171', '#fbbf24', '#34d399', '#60a5fa', '#a78bfa'],
            });

            setTimeout(() => {
                nextQuestion(true);
            }, 3000);
        } else {
            setFeedback('wrong');
            setShake(true);
            playSound(settings.errorSoundUrl);

            setTimeout(() => {
                // Clear selected to allow try again, or optionally just move forward?
                // Requirements imply "حاول مجدداً!" (Try again)
                setFeedback(null);
                setSelectedAnswer(null);
                setShake(false);
            }, 1500);
        }
    };

    const nextQuestion = (wasCorrect: boolean) => {
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
                    gameType: 'balance-scale',
                }),
            }); }

            router.push(`/results?score=${finalScore}&total=${totalQuestions}&time=${timeSpent}&gameId=balance-scale${studentId ? `&studentId=${studentId}` : ''}`);
        } catch (error) {
            console.error('Error saving score:', error);
            alert('حدث خطأ في حفظ النتيجة');
        }
    };

    // Calculate rotation of the scale
    // In RTL, the right side visually is A (numA1 + numA2). The left side is B.
    // Let's explicitly define side A and side B.
    // If we use standard CSS transforms, positive rotation = clockwise = Right side goes DOWN, Left side goes UP.
    // Weight A is on the Right visually inside a flex-row with dir="rtl".
    // Wait, flex with dir="rtl": first child visually on Right, second visually on Left.
    // Weight of visually Right side (A) = numA1 + numA2.
    // Weight of visually Left side (B) = numB1 + (selectedAnswer || 0).
    // Difference = Weight Right - Weight Left.
    // If Right is heavier, expect clockwise rotation (positive angle).

    let rotationAngle = 0;

    if (feedback === 'wrong') {
        // Tilt wildly
        rotationAngle = (Math.random() > 0.5 ? 1 : -1) * (20 + Math.random() * 10);
    } else {
        const weightA = numA1 + numA2;
        const weightB = numB1 + (selectedAnswer !== null ? selectedAnswer : 0);

        let diff = weightA - weightB;
        // Clamp difference visually
        if (diff > 5) diff = 5;
        if (diff < -5) diff = -5;

        rotationAngle = diff * 4; // Max 20 degrees
    }

    if (!gameStarted) {
        return (
            <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-b from-indigo-300 to-purple-400 relative overflow-hidden" dir="rtl">
                <div className="max-w-lg w-full relative z-10">
                    <div className="bg-white/95 backdrop-blur-md rounded-3xl shadow-[0_20px_60px_rgba(0,0,0,0.3)] p-8 text-center flex flex-col items-center border-[5px] border-indigo-700">
                        <div className="mb-4 text-8xl drop-shadow-[0_0_15px_rgba(99,102,241,0.6)]">
                            ⚖️
                        </div>
                        <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-700 to-purple-800 mb-4 drop-shadow-sm">
                            ميزان الأبطال
                        </h1>
                        <p className="text-xl text-indigo-900 mb-8 font-bold">
                            ابحث عن الرقم المفقود لتحقيق التوازن المثالي! 🦸‍♂️
                        </p>

                        <div className="mb-6 w-full">
                            <label htmlFor="name" className="block text-indigo-800 font-bold mb-2 text-right text-lg">
                                ما اسمك أيها البطل؟
                            </label>
                            <input
                                type="text"
                                id="name"
                                value={studentName}
                                onChange={(e) => setStudentName(e.target.value)}
                                className="w-full px-4 py-4 bg-indigo-50 border-2 border-indigo-300 rounded-xl focus:border-indigo-600 focus:outline-none transition-all text-indigo-900 placeholder-indigo-400/70 text-center text-xl font-black shadow-inner"
                                placeholder="اكتب اسمك هنا"
                                required
                            />
                        </div>

                        <button
                            onClick={startGame}
                            className="w-full bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-500 hover:to-orange-600 text-white font-black text-2xl py-5 rounded-xl shadow-[0_6px_0_#c2410c] active:shadow-[0_0px_0_#c2410c] active:translate-y-2 transform transition-all border border-orange-400/50"
                        >
                            ابدأ التحدي ⚖️
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex flex-col items-center justify-start pt-28 sm:pt-32 pb-8 px-4 sm:px-8 bg-gradient-to-b from-blue-300 via-indigo-200 to-purple-300 relative overflow-x-hidden" dir="rtl">

            {/* Background elements */}
            <div className="absolute top-10 left-10 text-6xl opacity-20 transform -rotate-12">🦸‍♀️</div>
            <div className="absolute top-32 right-20 text-7xl opacity-20 transform rotate-12">🦸‍♂️</div>
            <div className="absolute bottom-40 left-20 text-5xl opacity-20 transform rotate-45">✨</div>
            <div className="absolute bottom-20 right-32 text-6xl opacity-20 transform -rotate-12">⭐</div>

            {/* HUD */}
            <div className="fixed top-6 left-0 w-full px-6 flex justify-between items-start z-30 pointer-events-none">
                <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-4 border-4 border-indigo-300 shadow-xl flex flex-col pointer-events-auto">
                    <span className="text-2xl font-black text-indigo-800">مرحلة {questionNumber}/{totalQuestions}</span>
                    <span className="text-xl font-bold text-indigo-600">النقاط: {score} 🏆</span>
                </div>
            </div>

            {/* Question Title Header */}
            <motion.div
                initial={{ y: -50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="mb-8 z-20 w-full max-w-4xl"
            >
                <div className="bg-indigo-900/80 backdrop-blur-md rounded-3xl p-6 sm:px-12 shadow-[0_10px_30px_rgba(0,0,0,0.3)] border-4 border-indigo-400/50 text-center">
                    <h2 className="text-2xl sm:text-4xl font-black text-white drop-shadow-lg leading-tight">
                        اختر الرقم الذي يجعل الكفتين متساويتين!
                    </h2>
                </div>
            </motion.div>

            {/* Scale Component Area */}
            <div className="w-full max-w-5xl flex flex-col items-center justify-center relative mt-32 sm:mt-48 z-10">

                {/* The Seesaw Bar */}
                <motion.div
                    className="w-[90%] sm:w-[800px] h-6 sm:h-8 bg-gradient-to-r from-amber-400 via-amber-300 to-amber-400 rounded-full border-b-8 border-amber-600 shadow-[0_15px_30px_rgba(0,0,0,0.4)] relative flex justify-between px-4 sm:px-10 z-20"
                    animate={
                        feedback === 'wrong'
                            ? { rotate: [rotationAngle, -rotationAngle, rotationAngle, 0] } // Wild shake
                            : { rotate: rotationAngle }
                    }
                    transition={feedback === 'wrong' ? { duration: 0.6, ease: "easeInOut" } : { type: "spring", bounce: 0.5, duration: 1 }}
                    style={{ transformOrigin: 'center center' }}
                >
                    {/* Metal Pin in the center */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 sm:w-10 sm:h-10 bg-slate-300 rounded-full border-4 border-slate-500 shadow-inner z-30 flex items-center justify-center">
                        <div className="w-3 h-3 bg-slate-700 rounded-full"></div>
                    </div>

                    {/* Weight Right (A) */}
                    <motion.div
                        className="w-28 sm:w-40 h-28 sm:h-40 -mt-24 sm:-mt-36 bg-gradient-to-br from-indigo-500 to-indigo-700 border-[6px] border-indigo-300 rounded-2xl shadow-xl flex flex-col items-center justify-center relative"
                        style={{ perspective: '500px' }}
                    >
                        <div className="absolute top-0 w-full h-full bg-indigo-800/20 rounded-xl" />
                        <span className="text-3xl sm:text-5xl font-black text-white drop-shadow-md z-10 flex gap-2">
                            <span>{numA1}</span>
                            <span className="text-indigo-300">+</span>
                            <span>{numA2}</span>
                        </span>
                    </motion.div>

                    {/* Weight Left (B) */}
                    <motion.div
                        className={`w-28 sm:w-40 h-28 sm:h-40 -mt-24 sm:-mt-36 bg-gradient-to-br ${selectedAnswer !== null && feedback === 'correct' ? 'from-emerald-400 to-emerald-600 border-white' : 'from-purple-500 to-purple-700 border-purple-300'} border-[6px] rounded-2xl shadow-xl flex flex-col items-center justify-center relative transition-colors duration-500`}
                    >
                        <div className="absolute top-0 w-full h-full bg-purple-800/20 rounded-xl" />
                        <span className="text-3xl sm:text-5xl font-black text-white drop-shadow-md z-10 flex gap-2 items-center">
                            <span>{numB1}</span>
                            <span className="text-purple-300 flex items-center justify-center pb-1">+</span>
                            <span className={selectedAnswer === null ? "text-amber-300 text-5xl sm:text-6xl animate-pulse" : "border-b-4 border-white/50 px-2 leading-none pb-2"}>
                                {selectedAnswer !== null ? selectedAnswer : '?'}
                            </span>
                        </span>
                    </motion.div>
                </motion.div>

                {/* The Base */}
                <div className="relative z-10 flex justify-center -mt-2 sm:-mt-3">
                    <div className="w-0 h-0 
                        border-l-[60px] sm:border-l-[100px] border-l-transparent
                        border-b-[100px] sm:border-b-[150px] border-b-slate-800
                        border-r-[60px] sm:border-r-[100px] border-r-transparent
                        drop-shadow-[0_15px_15px_rgba(0,0,0,0.5)]
                        relative"
                    >
                        {/* Highlights on the Base */}
                        <div className="absolute top-[20px] -left-[20px] sm:top-[30px] sm:-left-[30px] w-0 h-0 
                        border-l-[20px] sm:border-l-[30px] border-l-transparent
                        border-b-[80px] sm:border-b-[120px] border-b-slate-700
                        border-r-[20px] sm:border-r-[30px] border-r-transparent opacity-50
                        "></div>
                    </div>
                </div>
            </div>

            {/* Answer Options Controls */}
            <motion.div
                className="mt-16 sm:mt-24 flex gap-4 sm:gap-8 justify-center w-full z-20 px-4"
                animate={shake ? { x: [-10, 10, -10, 10, 0] } : {}}
                transition={{ duration: 0.4 }}
            >
                {options.map((opt, i) => (
                    <motion.button
                        key={`opt-${i}`}
                        whileHover={{ scale: 1.1, y: -10 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => checkAnswer(opt)}
                        disabled={feedback !== null}
                        className="bg-gradient-to-t from-slate-200 to-white hover:to-indigo-50 border-b-[12px] border-slate-400 active:border-b-4 active:translate-y-2 text-slate-800 text-5xl sm:text-7xl font-black rounded-3xl w-24 h-28 sm:w-36 sm:h-40 shadow-[0_15px_30px_rgba(0,0,0,0.4)] disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center relative overflow-hidden"
                    >
                        {/* Metallic Texture Overlay */}
                        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/brushed-alum.png')] opacity-30 mix-blend-overlay"></div>
                        <span className="drop-shadow-sm z-10">{opt}</span>
                    </motion.button>
                ))}
            </motion.div>

            {/* Feedback Pop-up Overlay */}
            <AnimatePresence>
                {feedback && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm pointer-events-none"
                    >
                        <motion.div
                            initial={{ scale: 0.5, y: 50 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.5, opacity: 0 }}
                            className={`max-w-lg w-full rounded-3xl p-8 text-center shadow-[0_20px_50px_rgba(0,0,0,0.5)] border-[6px] pointer-events-auto ${feedback === 'correct' ? 'bg-gradient-to-br from-emerald-100 to-green-50 border-emerald-500 text-emerald-800' : 'bg-gradient-to-br from-red-100 to-rose-50 border-red-500 text-red-800'}`}
                        >
                            <div className="text-8xl mb-4 drop-shadow-md">
                                {feedback === 'correct' ? '⚖️✨' : '💥🥴'}
                            </div>
                            <h2 className="text-3xl sm:text-5xl font-black mb-4 leading-tight">
                                {feedback === 'correct' ? 'توازن مثالي! ⚖️' : 'الميزان غير معتدل، حاول مجدداً!'}
                            </h2>
                            {feedback === 'correct' && (
                                <p className="text-xl font-bold mt-2 text-emerald-600">أنت بطل حقيقي!</p>
                            )}
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

        </div>
    );
}
