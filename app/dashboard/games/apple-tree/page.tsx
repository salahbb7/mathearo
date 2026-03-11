'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Difficulty } from '@/lib/difficulty';
import confetti from 'canvas-confetti';
import { motion, AnimatePresence } from 'framer-motion';

type Operation = 'add' | 'sub';

export default function AppleTreeGamePage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const studentId = searchParams.get('studentId');
    const paramStudentName = searchParams.get('studentName');
    const isTeacher = searchParams.get('teacher') === 'true';
    const difficulty = (searchParams.get('difficulty') || 'medium') as Difficulty;
    const maxAns = difficulty === 'easy' ? 15 : difficulty === 'hard' ? 50 : 20;
    const [studentName, setStudentName] = useState(paramStudentName || '');
    const [gameStarted, setGameStarted] = useState(false);

    const [operation, setOperation] = useState<Operation>('add');
    const [num1, setNum1] = useState(0);
    const [num2, setNum2] = useState(0);
    const [options, setOptions] = useState<number[]>([]);
    const [tappedApples, setTappedApples] = useState<Set<number>>(new Set());

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
        const isAdd = Math.random() > 0.5;
        setOperation(isAdd ? 'add' : 'sub');
        setTappedApples(new Set());
        setFeedback(null);
        setShake(false);

        let ans = 0;
        if (isAdd) {
            // Addition: answer scales with difficulty
            ans = Math.floor(Math.random() * (maxAns - 4)) + 5;
            const n1 = Math.floor(Math.random() * (ans - 1)) + 1; // 1 to ans-1
            const n2 = ans - n1;
            setNum1(n1);
            setNum2(n2);
        } else {
            // Subtraction: start amount scales with difficulty
            const n1 = Math.floor(Math.random() * (maxAns - 4)) + 5;
            const n2 = Math.floor(Math.random() * (n1 - 1)) + 1; // 1 to n1-1
            ans = n1 - n2;
            setNum1(n1);
            setNum2(n2);
        }

        // Generate 3 options including correct answer
        let opts = new Set<number>();
        opts.add(ans);
        while (opts.size < 3) {
            let randOpt = ans + (Math.floor(Math.random() * 7) - 3); // ans +/- 3
            if (randOpt >= 0 && randOpt !== ans) {
                opts.add(randOpt);
            }
        }

        // Shuffle options
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
        if ((studentId || isTeacher || paramStudentName) && !gameStarted) {
            setGameStarted(true);
            setScore(0);
            setQuestionNumber(1);
            setStartTime(Date.now());
            generateQuestion();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [studentId, isTeacher, paramStudentName, gameStarted]);


    const toggleApple = (idx: number) => {
        if (feedback !== null) return;
        setTappedApples(prev => {
            const next = new Set(prev);
            if (next.has(idx)) next.delete(idx);
            else next.add(idx);
            return next;
        });
    };

    const checkAnswer = (selectedAns: number) => {
        if (feedback !== null) return;

        const correctAnswer = operation === 'add' ? num1 + num2 : num1 - num2;

        if (selectedAns === correctAnswer) {
            setFeedback('correct');
            setScore(prev => prev + 1);
            playSound(settings.successSoundUrl);

            confetti({
                particleCount: 150,
                spread: 80,
                origin: { y: 0.6 },
                colors: ['#ef4444', '#22c55e', '#f59e0b', '#3b82f6'],
            });

            setTimeout(() => {
                nextQuestion(true);
            }, 2500);
        } else {
            setFeedback('wrong');
            setShake(true);
            playSound(settings.errorSoundUrl);

            setTimeout(() => {
                setShake(false);
                setFeedback(null);
            }, 1000);
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
                        gameType: 'apple-tree',
                    }),
                });
            }

            router.push(`/results?score=${finalScore}&total=${totalQuestions}&time=${timeSpent}&gameId=apple-tree${studentId ? `&studentId=${studentId}` : ''}`);
        } catch (error) {
            console.error('Error saving score:', error);
            alert('حدث خطأ في حفظ النتيجة');
        }
    };

    const applePositions = [
        { top: '20%', left: '40%' }, { top: '25%', left: '60%' }, { top: '35%', left: '30%' },
        { top: '40%', left: '50%' }, { top: '35%', left: '70%' }, { top: '50%', left: '25%' },
        { top: '55%', left: '45%' }, { top: '50%', left: '65%' }, { top: '65%', left: '35%' },
        { top: '70%', left: '55%' }, { top: '60%', left: '80%' }, { top: '30%', left: '15%' },
        { top: '75%', left: '25%' }, { top: '80%', left: '45%' }, { top: '75%', left: '65%' },
        { top: '45%', left: '85%' }, { top: '15%', left: '50%' }, { top: '85%', left: '35%' },
        { top: '65%', left: '15%' }, { top: '85%', left: '75%' }
    ];

    const totalApplesToRender = operation === 'add' ? num1 + num2 : num1;
    const renderedApples = Array.from({ length: totalApplesToRender });

    if (!gameStarted) {
        return (
            <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-b from-sky-300 to-green-300 relative overflow-hidden" dir="rtl">
                <div className="max-w-lg w-full relative z-10">
                    <div className="bg-white/90 backdrop-blur-md rounded-3xl shadow-2xl p-8 text-center flex flex-col items-center border-[4px] border-emerald-500">
                        <div className="mb-4 text-8xl drop-shadow-[0_0_15px_rgba(34,197,94,0.5)]">
                            🌳
                        </div>
                        <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-green-600 to-emerald-800 mb-4 drop-shadow-sm">
                            شجرة التفاح العجيبة
                        </h1>
                        <p className="text-xl text-green-900 mb-8 font-bold">
                            العب مع التفاح وتعلم الجمع والطرح والمرح! 🍎
                        </p>

                        <div className="mb-6 w-full">
                            <label htmlFor="name" className="block text-emerald-800 font-bold mb-2 text-right text-lg">
                                ما اسمك يا صديق الطبيعة؟
                            </label>
                            <input
                                type="text"
                                id="name"
                                value={studentName}
                                onChange={(e) => setStudentName(e.target.value)}
                                className="w-full px-4 py-4 bg-white border-2 border-emerald-300 rounded-xl focus:border-emerald-500 focus:outline-none transition-all text-emerald-900 placeholder-emerald-400/50 text-center text-xl font-black shadow-inner"
                                placeholder="اكتب اسمك هنا"
                                required
                            />
                        </div>

                        <button
                            onClick={startGame}
                            className="w-full bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white font-black text-2xl py-5 rounded-xl shadow-[0_6px_0_#9f1239] active:shadow-[0_0px_0_#9f1239] active:translate-y-2 transform transition-all border border-red-400/30"
                        >
                            هيا نلعب 🍎
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-4 sm:p-8 bg-gradient-to-b from-sky-200 to-sky-400 relative overflow-hidden" dir="rtl">

            {/* Clouds */}
            <div className="absolute top-10 right-20 text-7xl opacity-80 animate-pulse">☁️</div>
            <div className="absolute top-24 left-10 text-6xl opacity-60">☁️</div>
            <div className="absolute top-8 left-60 text-5xl opacity-40">☁️</div>

            {/* Question Banner */}
            <motion.div
                initial={{ y: -50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="fixed top-6 z-20 w-[95%] sm:w-auto min-w-[320px]"
            >
                <div className="bg-white/95 backdrop-blur-md border-4 border-amber-300 rounded-2xl p-4 sm:p-6 shadow-[0_10px_30px_rgba(0,0,0,0.2)] flex flex-col items-center justify-center text-center">
                    <h2 className="text-xl sm:text-2xl font-black text-slate-800 leading-normal">
                        {operation === 'add' ? (
                            <>شجرة بها <span className="text-red-600 px-2">{num1}</span> تفاحات، أثمرت <span className="text-emerald-600 px-2">{num2}</span> تفاحات أخرى.<br />كم تفاحة على الشجرة؟</>
                        ) : (
                            <>شجرة بها <span className="text-red-600 px-2">{num1}</span> تفاحات، قطفنا منها <span className="text-rose-500 px-2">{num2}</span>.<br />كم تفاحة بقيت؟</>
                        )}
                    </h2>
                </div>
            </motion.div>

            {/* Progress Ring */}
            <div className="fixed top-6 right-6 sm:right-10 z-20 hidden sm:flex flex-col items-center">
                <div className="bg-white/90 rounded-2xl p-4 border-2 border-emerald-200 shadow-xl text-center">
                    <div className="text-3xl mb-1">🌳</div>
                    <div className="text-slate-700 font-black text-sm mb-1">سؤال {questionNumber} / {totalQuestions}</div>
                    <div className="text-emerald-500 font-black">النقاط: {score}</div>
                </div>
            </div>

            <div className="w-full max-w-4xl flex flex-col mt-40 sm:mt-32 z-10 gap-6">

                {/* Nature Scene (Tree) */}
                <div className="bg-gradient-to-b from-sky-200 to-green-100 rounded-[40px] border-[6px] border-white p-4 sm:p-10 shadow-2xl min-h-[400px] flex flex-col justify-end relative overflow-hidden">

                    {/* Tree Rendering */}
                    <div className="relative z-10 flex flex-col items-center mt-4">
                        {/* Canopy */}
                        <div className="w-[300px] h-[260px] sm:w-[480px] sm:h-[360px] bg-gradient-to-br from-green-400 to-emerald-600 rounded-[50%_50%_40%_40%] relative shadow-[0_15px_0_#065f46] border-4 border-emerald-700 mx-auto">
                            {/* Apples */}
                            {renderedApples.map((_, i) => {
                                const pos = applePositions[i % applePositions.length]; // fallback safely
                                const isTapped = tappedApples.has(i);

                                return (
                                    <motion.div
                                        key={`apple-${i}`}
                                        className="absolute cursor-pointer z-20 flex items-center justify-center transform-gpu"
                                        style={{ top: pos.top, left: pos.left }}
                                        onClick={() => toggleApple(i)}
                                        whileHover={{ scale: 1.1 }}
                                        whileTap={{ scale: 0.9 }}
                                        animate={
                                            isTapped
                                                ? (operation === 'sub' ? { y: 250, opacity: 0.3, rotate: 45 } : { scale: 1.3, opacity: 0.5 })
                                                : { y: 0, opacity: 1, rotate: 0 }
                                        }
                                        transition={{ type: "spring", stiffness: 300, damping: 20 }}
                                    >
                                        <span className="text-4xl sm:text-5xl drop-shadow-[0_4px_4px_rgba(0,0,0,0.3)]">🍎</span>
                                    </motion.div>
                                );
                            })}
                        </div>
                        {/* Trunk */}
                        <div className="w-[70px] sm:w-[100px] h-[100px] sm:h-[130px] bg-gradient-to-br from-amber-800 to-amber-950 rounded-b-2xl border-x-4 border-amber-950 relative -mt-4 shadow-inner" />
                    </div>

                    {/* Grass / Ground */}
                    <div className="absolute bottom-0 left-0 w-full h-[60px] bg-gradient-to-t from-green-600 to-green-400 rounded-t-[50%] scale-110 origin-bottom" />
                </div>

                {/* Options Controls */}
                <motion.div
                    className="grid grid-cols-3 gap-4 sm:gap-6 px-2"
                    animate={shake ? { x: [-10, 10, -10, 10, 0] } : {}}
                    transition={{ duration: 0.4 }}
                >
                    {options.map((opt, i) => (
                        <motion.button
                            key={`opt-${i}`}
                            whileHover={{ scale: 1.05, y: -5 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => checkAnswer(opt)}
                            disabled={feedback !== null}
                            className="bg-white hover:bg-slate-50 border-b-8 border-slate-300 active:border-b-0 active:translate-y-2 text-slate-800 text-5xl sm:text-6xl font-black py-6 sm:py-8 rounded-[2rem] shadow-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        >
                            {opt}
                        </motion.button>
                    ))}
                </motion.div>

            </div>

            {/* Feedback Pop-up Overlay */}
            <AnimatePresence>
                {feedback && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm"
                    >
                        <motion.div
                            initial={{ scale: 0.5, y: 50 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.5, opacity: 0 }}
                            className={`max-w-md w-full rounded-3xl p-8 text-center shadow-[0_20px_50px_rgba(0,0,0,0.5)] border-[6px] ${feedback === 'correct' ? 'bg-white border-green-500 text-green-700' : 'bg-white border-red-500 text-red-700'}`}
                        >
                            <div className="text-8xl mb-4">
                                {feedback === 'correct' ? '🌟' : '🤔'}
                            </div>
                            <h2 className="text-3xl font-black mb-4">
                                {feedback === 'correct' ? 'أنت بطل الحساب! 🍎' : 'فكر مرة أخرى!'}
                            </h2>
                            {feedback === 'correct' && (
                                <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }} className="w-16 h-16 border-8 border-green-500 border-t-transparent rounded-full mx-auto mt-6" />
                            )}
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

        </div>
    );
}
