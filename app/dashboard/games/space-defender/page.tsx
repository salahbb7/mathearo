'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Difficulty } from '@/lib/difficulty';
import confetti from 'canvas-confetti';
import { motion, AnimatePresence } from 'framer-motion';

export default function SpaceDefenderGamePage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const studentId = searchParams.get('studentId');
    const isTeacher = searchParams.get('teacher') === 'true';
    const difficulty = (searchParams.get('difficulty') || 'medium') as Difficulty;
    // Multiplier range: easy 1-6, medium 1-9, hard 1-12
    const maxMultiplier = difficulty === 'easy' ? 6 : difficulty === 'hard' ? 12 : 9;

    const [gameStarted, setGameStarted] = useState(false);
    const [studentName, setStudentName] = useState('');

    const [questionData, setQuestionData] = useState<{
        num1: number;
        num2: number;
        answer: number;
        options: { id: string; value: number; isCorrect: boolean }[];
    } | null>(null);

    const [score, setScore] = useState(0);
    const [questionNumber, setQuestionNumber] = useState(0);
    const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
    const [shakeScreen, setShakeScreen] = useState(false);
    const [startTime, setStartTime] = useState<number>(0);

    const [meteorStatus, setMeteorStatus] = useState<'falling' | 'speeding' | 'exploded'>('falling');
    const [laserFiredTo, setLaserFiredTo] = useState<boolean>(false); // Trigger laser beam
    const [shakeOptionId, setShakeOptionId] = useState<string | null>(null);

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
        const n1 = Math.floor(Math.random() * maxMultiplier) + 1;
        const n2 = Math.floor(Math.random() * maxMultiplier) + 1;
        const answer = n1 * n2;

        const distractors = [
            answer + n1,
            answer > n1 ? answer - n1 : answer + n2,
            answer + 10,
            answer > 10 ? answer - 10 : answer + 5,
            answer + n2
        ];

        const uniqueDistractors = [...new Set(distractors)].filter(d => d !== answer && d > 0);
        const selectedDistractors = uniqueDistractors.sort(() => 0.5 - Math.random()).slice(0, 2);

        const possibleAnswers = [
            { id: 'correct', value: answer, isCorrect: true },
            { id: 'd1', value: selectedDistractors[0], isCorrect: false },
            { id: 'd2', value: selectedDistractors[1], isCorrect: false }
        ];

        // Shuffle options
        for (let i = possibleAnswers.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [possibleAnswers[i], possibleAnswers[j]] = [possibleAnswers[j], possibleAnswers[i]];
        }

        setQuestionData({
            num1: n1,
            num2: n2,
            answer,
            options: possibleAnswers,
        });

        setMeteorStatus('falling');
        setLaserFiredTo(false);
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

    const checkAnswer = (option: { id: string; value: number; isCorrect: boolean }) => {
        if (feedback !== null) return;

        if (option.isCorrect) {
            setFeedback('correct');
            setScore(prev => prev + 1);
            playSound(settings.successSoundUrl);
            setLaserFiredTo(true);
            setMeteorStatus('exploded');

            // Explosion Particles
            const duration = 1500;
            const end = Date.now() + duration;

            (function frame() {
                confetti({
                    particleCount: 15,
                    spread: 120,
                    startVelocity: 50,
                    origin: { x: 0.5, y: 0.3 },
                    colors: ['#ef4444', '#f97316', '#eab308', '#ffffff'],
                    shapes: ['square', 'circle'],
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
            setShakeOptionId(option.id);
            setMeteorStatus('speeding');
            playSound(settings.errorSoundUrl);

            setTimeout(() => {
                setShakeScreen(false);
                setShakeOptionId(null);
                setFeedback(null);
                // Go back to falling after a shake / fast move
                if (meteorStatus !== 'exploded') {
                    setMeteorStatus('falling');
                }
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
                        gameType: 'space-defender',
                    }),
                });
            }

            router.push(`/results?score=${finalScore}&total=${totalQuestions}&time=${timeSpent}&gameId=space-defender${studentId ? `&studentId=${studentId}` : ''}`);
        } catch (error) {
            console.error('Error saving score:', error);
            alert('حدث خطأ في حفظ النتيجة');
        }
    };

    const formatNumber = (num: number) => num.toLocaleString('en-US');

    if (!gameStarted) {
        return (
            <div className="min-h-screen flex items-center justify-center p-4 bg-slate-900 relative overflow-hidden font-sans" dir="rtl">
                {/* Space Stars Background */}
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-60 mix-blend-screen pointer-events-none"></div>

                <div className="max-w-lg w-full relative z-10">
                    <div className="bg-slate-800/90 backdrop-blur-md rounded-[2.5rem] shadow-[0_20px_60px_rgba(0,0,0,0.5)] p-8 text-center flex flex-col items-center border-[4px] border-cyan-800 outline outline-4 outline-cyan-500/30 outline-offset-4">
                        <div className="mb-4 text-8xl drop-shadow-[0_0_30px_rgba(6,182,212,0.8)] animate-[pulse_3s_ease-in-out_infinite]">
                            🪐
                        </div>
                        <h1 className="text-4xl sm:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-br from-cyan-400 to-blue-600 mb-4 tracking-tight">
                            حارس الفضاء
                        </h1>
                        <p className="text-xl text-cyan-200 mb-8 font-bold leading-relaxed">
                            دَمر النيازك بأسلحة الضرب قبل أن تدمر كوكبنا! 🚀☄️
                        </p>

                        <div className="mb-6 w-full">
                            <label htmlFor="name" className="block text-cyan-300 font-bold mb-2 text-right">
                                اسم الحارس:
                            </label>
                            <input
                                type="text"
                                id="name"
                                value={studentName}
                                onChange={(e) => setStudentName(e.target.value)}
                                className="w-full px-4 py-3 bg-slate-700 border-2 border-cyan-600 rounded-xl focus:border-cyan-400 focus:outline-none transition-all text-cyan-100 placeholder-cyan-600/50 text-center text-xl font-bold shadow-inner focus:bg-slate-800"
                                placeholder="اكتب اسمك هنا"
                                required
                            />
                        </div>

                        <button
                            onClick={startGame}
                            className="w-full bg-gradient-to-r from-cyan-600 to-blue-700 hover:from-cyan-500 hover:to-blue-600 text-white font-black text-2xl py-4 rounded-xl shadow-[0_6px_0_#1d4ed8] active:shadow-[0_0px_0_#1d4ed8] active:translate-y-2 transform transition-all border-2 border-cyan-400/50 flex items-center justify-center gap-3"
                        >
                            <span>إطلاق الأنظمة!</span>
                            <span>🛸</span>
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-950 relative overflow-hidden" dir="rtl">
            {/* Moving Stars Background */}
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-40 pointer-events-none animate-[ping_8s_ease-in-out_infinite]"></div>

            <motion.div
                className="w-full h-full absolute inset-0 flex flex-col items-center"
                animate={shakeScreen ? { x: [-15, 15, -15, 15, 0], y: [-5, 5, -5, 5, 0] } : {}}
                transition={{ duration: 0.5 }}
            >
                {/* Planet at the Bottom */}
                <div className="absolute -bottom-[40vh] sm:-bottom-[60vh] left-1/2 transform -translate-x-1/2 w-[150vw] sm:w-[120vw] h-[80vh] sm:h-[100vh] bg-gradient-to-t from-cyan-900 via-blue-800 to-cyan-500 rounded-t-[100%] shadow-[0_0_150px_rgba(6,182,212,0.4)] border-t-[12px] border-cyan-300/40 z-0">
                    <div className="absolute top-10 left-1/4 w-32 h-10 bg-cyan-200/20 rounded-full blur-xl"></div>
                    <div className="absolute top-20 right-1/4 w-60 h-16 bg-blue-400/20 rounded-full blur-2xl"></div>
                </div>

                {/* Laser Beam Animation */}
                <AnimatePresence>
                    {laserFiredTo && (
                        <motion.div
                            initial={{ height: 0, opacity: 1 }}
                            animate={{ height: "60vh", opacity: 0 }}
                            transition={{ duration: 0.5, ease: "easeOut" }}
                            className="absolute bottom-[20vh] left-1/2 transform -translate-x-1/2 w-4 bg-cyan-300 shadow-[0_0_30px_#22d3ee,0_0_60px_#22d3ee] rounded-full z-10 origin-bottom"
                        />
                    )}
                </AnimatePresence>

                {/* Game Container overlay */}
                <div className="relative z-20 w-full max-w-5xl h-full flex flex-col justify-between py-6 sm:py-10 px-4">

                    {/* Header Bar */}
                    <div className="bg-slate-900/80 backdrop-blur-md border border-cyan-800/60 rounded-3xl p-4 sm:p-6 w-full shadow-[0_10px_30px_rgba(0,0,0,0.5)]">
                        <div className="flex justify-between items-center text-center sm:text-right flex-col sm:flex-row gap-4">
                            <div className="order-2 sm:order-1 text-right flex-1 w-full relative z-10">
                                <span className="block text-sm sm:text-base font-bold text-cyan-400/80 mb-1 uppercase tracking-widest">
                                    موجة الهجوم {questionNumber} / {totalQuestions}
                                </span>
                                <span className="block text-2xl font-black text-cyan-400 drop-shadow-[0_0_10px_rgba(34,211,238,0.5)]">
                                    النيازك المدمرة: {score} ☄️
                                </span>
                            </div>
                            <div className="order-1 sm:order-2">
                                <h2 className="text-xl sm:text-2xl font-black text-white drop-shadow-md bg-red-600/20 border border-red-500/50 px-6 py-2 rounded-full inline-block">
                                    دمر النيزك قبل أن يصطدم بالكوكب! ⚠️
                                </h2>
                            </div>
                        </div>
                    </div>

                    {/* METEOR AREA */}
                    <div className="flex-1 relative flex justify-center w-full overflow-hidden mt-8">
                        {questionData && meteorStatus !== 'exploded' && (
                            <motion.div
                                key={questionNumber}
                                initial={{ y: -50, scale: 0.8 }}
                                animate={{
                                    y: meteorStatus === 'falling' ? 100 : 250,
                                    scale: meteorStatus === 'speeding' ? 1.2 : 1,
                                    rotateZ: [0, 10, -10, 5, -5, 0]
                                }}
                                transition={{
                                    y: { duration: meteorStatus === 'falling' ? 10 : 0.5, ease: "linear" },
                                    rotateZ: { duration: 2, repeat: Infinity, ease: "linear" }
                                }}
                                className={`absolute top-0 z-10 flex flex-col items-center justify-center p-6 sm:p-10 rounded-full bg-gradient-to-br from-stone-600 to-stone-900 border-[6px] border-stone-500 shadow-[inset_0_0_20px_rgba(0,0,0,0.8),0_20px_50px_rgba(0,0,0,0.5)] ${meteorStatus === 'speeding' ? 'shadow-[0_0_50px_#ef4444]' : ''}`}
                            >
                                {/* Fire Trail behind meteor */}
                                <div className="absolute -top-16 left-1/2 transform -translate-x-1/2 w-16 h-32 bg-gradient-to-t from-orange-500/80 via-red-500/40 to-transparent blur-md -z-10 rounded-full"></div>

                                <span className="text-4xl sm:text-5xl font-black font-mono text-amber-200 drop-shadow-[0_0_15px_#f59e0b] bg-black/40 px-6 py-2 rounded-2xl border-2 border-stone-600/50" dir="ltr">
                                    {questionData.num1} × {questionData.num2}
                                </span>
                            </motion.div>
                        )}

                        {/* Explosion mark if exploded */}
                        <AnimatePresence>
                            {meteorStatus === 'exploded' && (
                                <motion.div
                                    initial={{ scale: 0, opacity: 1 }}
                                    animate={{ scale: 2, opacity: 0 }}
                                    transition={{ duration: 0.8 }}
                                    className="absolute top-[100px] text-8xl drop-shadow-[0_0_50px_#ef4444]"
                                >
                                    💥
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Turret Controls (Answers) */}
                    <div className="bg-slate-900/90 backdrop-blur-xl p-6 sm:p-8 rounded-[2.5rem] shadow-[0_0_50px_rgba(0,0,0,0.8)] border-t-[8px] border-cyan-600 w-full max-w-4xl mx-auto relative z-20 mt-4">
                        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 w-32 h-2 bg-cyan-900 rounded-full overflow-hidden">
                            <div className="w-full h-full bg-cyan-400 animate-[pulse_1s_ease-in-out_infinite] shadow-[0_0_10px_#22d3ee]"></div>
                        </div>

                        <h3 className="text-cyan-300 text-center font-bold mb-6 text-lg tracking-wider uppercase mt-4">
                            أنظمة الاستهداف (اختر الناتج):
                        </h3>

                        <div className="flex flex-col sm:flex-row flex-wrap justify-center gap-4 sm:gap-6 w-full" dir="ltr">
                            <AnimatePresence>
                                {questionData?.options.map((option) => (
                                    <motion.button
                                        key={option.id}
                                        whileHover={{ scale: 1.05, y: -5 }}
                                        whileTap={{ scale: 0.95 }}
                                        animate={shakeOptionId === option.id ? { x: [-10, 10, -10, 10, 0] } : {}}
                                        onClick={() => checkAnswer(option)}
                                        disabled={feedback !== null}
                                        className={`
                                            flex-1 min-w-[140px] h-20 sm:h-24 rounded-2xl relative
                                            flex items-center justify-center transition-all disabled:opacity-90 outline outline-2 outline-black/40
                                            border-t-2 border-white/20 overflow-hidden
                                            ${shakeOptionId === option.id
                                                ? 'bg-red-600 shadow-[0_0_30px_#dc2626,inset_0_5px_0_rgba(255,255,255,0.2)] text-white'
                                                : (feedback === 'correct' && option.isCorrect)
                                                    ? 'bg-cyan-500 shadow-[0_0_30px_#06b6d4,inset_0_5px_0_rgba(255,255,255,0.4)] text-white'
                                                    : 'bg-slate-800 hover:bg-slate-700 text-cyan-200 shadow-[0_8px_0_#0f172a,inset_0_2px_0_rgba(255,255,255,0.1)] border border-cyan-800/50 hover:border-cyan-500'
                                            }
                                        `}
                                    >
                                        {/* Cyber UI Lines inside button */}
                                        <div className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-current opacity-30"></div>
                                        <div className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-current opacity-30"></div>

                                        <span className="text-4xl sm:text-5xl font-black tracking-widest drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)] font-mono z-10" dir="ltr">
                                            {formatNumber(option.value)}
                                        </span>
                                    </motion.button>
                                ))}
                            </AnimatePresence>
                        </div>
                    </div>

                    {/* Feedback Overlay Message centered over controls */}
                    <div className="absolute bottom-[25vh] left-1/2 transform -translate-x-1/2 w-full max-w-xl px-4 z-30 pointer-events-none">
                        <AnimatePresence mode="wait">
                            {feedback === 'correct' && (
                                <motion.div
                                    key="correct"
                                    initial={{ scale: 0.5, opacity: 0, y: 30 }}
                                    animate={{ scale: 1, opacity: 1, y: 0 }}
                                    exit={{ scale: 0.5, opacity: 0, y: -30 }}
                                    className="bg-cyan-900/90 backdrop-blur-sm border-2 border-cyan-400 text-cyan-50 px-6 py-4 rounded-[2rem] text-center shadow-[0_0_40px_rgba(6,182,212,0.6)] flex items-center justify-center gap-4 border-t-4 border-white/30"
                                >
                                    <span className="text-4xl drop-shadow-md">🛡️</span>
                                    <p className="text-xl sm:text-2xl font-black drop-shadow-md">ضربة حاسمة أيها الحارس!</p>
                                </motion.div>
                            )}

                            {feedback === 'wrong' && (
                                <motion.div
                                    key="wrong"
                                    initial={{ scale: 0.8, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    exit={{ scale: 0.8, opacity: 0 }}
                                    className="bg-red-900/90 backdrop-blur-sm border-2 border-red-500 text-red-50 px-6 py-4 rounded-[2rem] text-center shadow-[0_0_40px_rgba(239,68,68,0.6)] flex items-center justify-center gap-4 border-t-4 border-white/30"
                                >
                                    <span className="text-4xl drop-shadow-md">⚠️</span>
                                    <p className="text-xl sm:text-2xl font-black drop-shadow-md">أسرع في الحساب!</p>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                </div>
            </motion.div>
        </div>
    );
}
