'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Difficulty } from '@/lib/difficulty';
import confetti from 'canvas-confetti';
import { motion, AnimatePresence } from 'framer-motion';

export default function NumberDeconstructorGamePage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const studentId = searchParams.get('studentId');
    const isTeacher = searchParams.get('teacher') === 'true';
    const difficulty = (searchParams.get('difficulty') || 'medium') as Difficulty;
    const [gameStarted, setGameStarted] = useState(false);
    const [studentName, setStudentName] = useState('');

    type QuestionData = {
        targetNumber: number;
        correctBlocks: number[];
        allBlocks: number[];
    };

    const [questionData, setQuestionData] = useState<QuestionData | null>(null);
    const [selectedBlocks, setSelectedBlocks] = useState<number[]>([]);

    const [score, setScore] = useState(0);
    const [questionNumber, setQuestionNumber] = useState(0);
    const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
    const [isAnimating, setIsAnimating] = useState(false);
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
        setFeedback(null);
        setSelectedBlocks([]);
        setIsAnimating(false);
        setShake(false);

        const places = [100000, 10000, 1000, 100, 10, 1];
        // Select 3 to 4 random active places to keep length manageable
        const numPlaces = Math.floor(Math.random() * 2) + 3;
        const activePlaces = [...places].sort(() => Math.random() - 0.5).slice(0, numPlaces).sort((a, b) => b - a);

        const correctBlocks: number[] = [];
        let sum = 0;

        activePlaces.forEach(p => {
            const digit = Math.floor(Math.random() * 9) + 1;
            const val = digit * p;
            correctBlocks.push(val);
            sum += val;
        });

        // Generate distractors
        const distractors: number[] = [];
        let attempts = 0;
        while (distractors.length < 4 && attempts < 50) {
            attempts++;
            const randPlace = places[Math.floor(Math.random() * places.length)];
            const digit = Math.floor(Math.random() * 9) + 1;
            const val = randPlace * digit;
            if (!correctBlocks.includes(val) && !distractors.includes(val)) {
                distractors.push(val);
            }
        }

        const allBlocks = [...correctBlocks, ...distractors].sort(() => Math.random() - 0.5);

        setQuestionData({
            targetNumber: sum,
            correctBlocks,
            allBlocks,
        });
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
            startGame();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [studentId, isTeacher, gameStarted]);


    const handleBlockClick = (blockValue: number) => {
        if (feedback !== null || !questionData || isAnimating) return;

        if (selectedBlocks.includes(blockValue)) {
            // Deselect block
            setSelectedBlocks(prev => prev.filter(v => v !== blockValue));
        } else {
            // Select block
            if (selectedBlocks.length < questionData.correctBlocks.length) {
                const newSelected = [...selectedBlocks, blockValue];
                setSelectedBlocks(newSelected);

                // Auto check when full
                if (newSelected.length === questionData.correctBlocks.length) {
                    checkAnswer(newSelected);
                }
            }
        }
    };

    const checkAnswer = (currentSelected: number[]) => {
        if (!questionData) return;
        setIsAnimating(true);

        const currentSum = currentSelected.reduce((a, b) => a + b, 0);

        if (currentSum === questionData.targetNumber) {
            setFeedback('correct');
            setScore(prev => prev + 1);
            playSound(settings.successSoundUrl);

            confetti({
                particleCount: 150,
                spread: 80,
                origin: { y: 0.6 },
                colors: ['#fbbf24', '#f59e0b', '#d97706'],
            });

            setTimeout(() => {
                nextQuestion(true);
            }, 3000);
        } else {
            setFeedback('wrong');
            playSound(settings.errorSoundUrl);
            setShake(true);

            setTimeout(() => {
                setShake(false);
                setFeedback(null);
                setSelectedBlocks([]);
                setIsAnimating(false);
            }, 2000);
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
                        gameType: 'number-deconstructor',
                    }),
                });
            }

            router.push(`/results?score=${finalScore}&total=${totalQuestions}&time=${timeSpent}&gameId=number-deconstructor${studentId ? `&studentId=${studentId}` : ''}`);
        } catch (error) {
            console.error('Error saving score:', error);
            alert('حدث خطأ في حفظ النتيجة');
        }
    };

    // Helper to format number
    const formatNumber = (num: number) => {
        return num.toLocaleString('en-US'); // keeping it standard comma separated format 
    };

    if (!gameStarted) {
        return (
            <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-b from-orange-400 to-amber-600 relative overflow-hidden" dir="rtl">
                {/* Factory Gears Background */}
                <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] mix-blend-overlay"></div>

                <div className="absolute top-20 right-10 text-6xl opacity-30 animate-[spin_10s_linear_infinite]">⚙️</div>
                <div className="absolute bottom-10 left-20 text-7xl opacity-40 animate-[spin_15s_linear_infinite_reverse]">🎡</div>
                <div className="absolute top-40 left-10 text-5xl opacity-40">🏭</div>

                <div className="max-w-lg w-full relative z-10">
                    <div className="bg-white/95 backdrop-blur-md rounded-3xl shadow-[0_20px_60px_rgba(0,0,0,0.5)] p-8 text-center flex flex-col items-center border-[5px] border-orange-500">
                        <div className="mb-4 text-8xl drop-shadow-[0_10px_10px_rgba(234,88,12,0.5)]">
                            🧩
                        </div>
                        <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-orange-600 to-amber-800 mb-4 drop-shadow-sm">
                            مفكك الأرقام
                        </h1>
                        <p className="text-xl text-orange-900 mb-8 font-bold">
                            حلل الرقم الكبير إلى قيمته المنزلية في مصنع الأرقام! 🏗️
                        </p>

                        <div className="mb-6 w-full">
                            <label htmlFor="name" className="block text-orange-800 font-bold mb-2 text-right text-lg">
                                ما اسمك أيها المهندس البارع؟
                            </label>
                            <input
                                type="text"
                                id="name"
                                value={studentName}
                                onChange={(e) => setStudentName(e.target.value)}
                                className="w-full px-4 py-4 bg-orange-50 border-2 border-orange-300 rounded-xl focus:border-orange-500 focus:outline-none transition-all text-orange-900 placeholder-orange-400/80 text-center text-xl font-black shadow-inner"
                                placeholder="اكتب اسمك هنا"
                                required
                            />
                        </div>

                        <button
                            onClick={startGame}
                            className="w-full bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-400 hover:to-amber-500 text-white font-black text-2xl py-5 rounded-xl shadow-[0_6px_0_#9a3412] active:shadow-[0_0px_0_#9a3412] active:translate-y-2 transform transition-all border border-orange-300/50"
                        >
                            ابدأ التفكيك 🚜
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex flex-col items-center justify-start pt-24 sm:pt-28 pb-12 px-4 sm:px-8 bg-gradient-to-b from-slate-800 to-slate-900 relative overflow-x-hidden" dir="rtl">
            {/* Machinery Background */}
            <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] mix-blend-overlay pointer-events-none"></div>

            {/* Background Gears */}
            <div className="fixed top-1/4 right-5 text-8xl opacity-10 animate-[spin_20s_linear_infinite] pointer-events-none">⚙️</div>
            <div className="fixed bottom-1/4 left-5 text-9xl opacity-10 animate-[spin_25s_linear_infinite_reverse] pointer-events-none">⚙️</div>

            {/* HUD */}
            <div className="fixed top-6 left-0 w-full px-6 flex justify-between items-start z-30 pointer-events-none">
                <div className="bg-slate-800/90 backdrop-blur-sm rounded-2xl p-4 border-2 border-slate-600 shadow-xl flex flex-col pointer-events-auto">
                    <span className="text-2xl font-black text-slate-300">التفكيك {questionNumber}/{totalQuestions}</span>
                    <span className="text-xl font-bold text-amber-500">النقاط: {score} 🏆</span>
                </div>
            </div>

            {questionData && (
                <div className="w-full max-w-5xl flex flex-col flex-1 items-center relative z-10">

                    {/* Top Display - Target Number */}
                    <motion.div
                        initial={{ y: -50, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        className="mb-8 w-full max-w-3xl"
                    >
                        <div className="bg-slate-800 rounded-3xl p-8 sm:px-12 shadow-[0_15px_35px_rgba(0,0,0,0.5),inset_0_4px_15px_rgba(255,255,255,0.1)] border-4 border-slate-600/50 text-center relative overflow-hidden">
                            <h2 className="text-xl sm:text-2xl font-bold text-slate-400 mb-4 drop-shadow-md">
                                حلل الرقم الكبير إلى قيمته المنزلية!
                            </h2>
                            <div className="flex justify-center items-center">
                                {/* The Big Number Display */}
                                <div className="bg-slate-900 border-4 border-slate-700 shadow-[inset_0_5px_15px_rgba(0,0,0,0.8)] rounded-2xl px-12 py-6" dir="ltr">
                                    <span className="text-6xl sm:text-8xl font-black text-transparent bg-clip-text bg-gradient-to-b from-amber-300 to-orange-500 drop-shadow-[0_0_10px_rgba(245,158,11,0.5)] font-mono tracking-wider">
                                        {formatNumber(questionData.targetNumber)}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </motion.div>

                    {/* Equation Area */}
                    <motion.div
                        className="w-full max-w-4xl bg-slate-800/80 backdrop-blur-md rounded-2xl p-6 sm:p-10 border-2 border-slate-600 shadow-2xl mb-12"
                        animate={shake ? { x: [-10, 10, -10, 10, 0] } : {}}
                        transition={{ duration: 0.4 }}
                    >
                        <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 min-h-[5rem]" dir="ltr">
                            {Array.from({ length: questionData.correctBlocks.length }).map((_, idx) => {
                                const isFilled = idx < selectedBlocks.length;
                                const val = isFilled ? selectedBlocks[idx] : null;

                                return (
                                    <div key={`slot-${idx}`} className="flex items-center gap-4 sm:gap-6">
                                        {/* Slot */}
                                        <motion.div
                                            className={`
                                                w-24 sm:w-36 h-16 sm:h-24 rounded-xl border-dashed border-4 
                                                flex items-center justify-center text-2xl sm:text-3xl font-black
                                                ${isFilled
                                                    ? (feedback === 'correct' ? 'border-none bg-gradient-to-br from-green-400 to-green-600 text-white shadow-[0_0_20px_rgba(74,222,128,0.6)]'
                                                        : feedback === 'wrong' ? 'border-none bg-red-500 text-white shadow-[0_0_20px_rgba(239,68,68,0.6)]'
                                                            : 'border-none bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-[0_5px_15px_rgba(0,0,0,0.3)]')
                                                    : 'border-slate-600 bg-slate-900/50 text-slate-500'}
                                                transition-all duration-300
                                            `}
                                            initial={{ scale: 0.8 }}
                                            animate={{ scale: 1 }}
                                        >
                                            {isFilled ? <span dir="ltr">{formatNumber(val as number)}</span> : '?'}
                                        </motion.div>

                                        {/* Plus Sign */}
                                        {idx < questionData.correctBlocks.length - 1 && (
                                            <div className="text-4xl sm:text-5xl font-black text-slate-500">
                                                +
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </motion.div>

                    {/* Toolbelt / Blocks Area */}
                    <div className="w-full max-w-4xl flex flex-col items-center bg-slate-900/80 backdrop-blur-md border-2 border-slate-700 rounded-3xl pt-6 pb-8 px-4 sm:px-8 shadow-[0_10px_40px_rgba(0,0,0,0.6)] mt-auto mb-4">
                        <h3 className="text-slate-400 font-bold mb-6 flex items-center gap-2">
                            <span>🛠️</span> اسحب واضغط على الكتل المناسبة لتفكيك الرقم
                        </h3>
                        <div className="flex flex-wrap justify-center gap-4 sm:gap-6 w-full" dir="ltr">
                            {questionData.allBlocks.map((block, i) => {
                                const isSelected = selectedBlocks.includes(block);
                                return (
                                    <motion.button
                                        key={`block-${i}`}
                                        whileHover={!isSelected && !isAnimating ? { scale: 1.05, y: -5 } : {}}
                                        whileTap={!isSelected && !isAnimating ? { scale: 0.95 } : {}}
                                        onClick={() => handleBlockClick(block)}
                                        disabled={isAnimating || isSelected}
                                        className={`
                                            px-6 py-4 sm:px-8 sm:py-6 rounded-xl font-black text-2xl sm:text-3xl font-mono
                                            shadow-[0_8px_0_rgba(0,0,0,0.5)] border-t border-white/20
                                            transition-all
                                            ${isSelected
                                                ? 'bg-slate-700 text-slate-500 opacity-50 shadow-none translate-y-2 cursor-not-allowed'
                                                : 'bg-gradient-to-br from-amber-200 to-orange-400 text-slate-900 hover:from-amber-100 hover:to-orange-300'}
                                        `}
                                    >
                                        <span dir="ltr">{formatNumber(block)}</span>
                                    </motion.button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Feedback Overlay Message */}
                    <AnimatePresence>
                        {feedback && (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                className={`
                                    fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2
                                    z-50 px-8 py-6 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)]
                                    border-4 flex flex-col items-center gap-4
                                    ${feedback === 'correct'
                                        ? 'bg-slate-800 border-green-500'
                                        : 'bg-slate-800 border-red-500'}
                                `}
                            >
                                <div className="text-7xl">
                                    {feedback === 'correct' ? '🌟' : '❌'}
                                </div>
                                <h2 className={`text-4xl font-black ${feedback === 'correct' ? 'text-green-400' : 'text-red-400'}`}>
                                    {feedback === 'correct' ? 'تحليل عبقري!' : 'تأكد من عدد الأصفار!'}
                                </h2>
                            </motion.div>
                        )}
                    </AnimatePresence>

                </div>
            )}
        </div>
    );
}
