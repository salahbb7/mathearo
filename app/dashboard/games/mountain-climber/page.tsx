'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Difficulty } from '@/lib/difficulty';
import confetti from 'canvas-confetti';
import { motion, AnimatePresence } from 'framer-motion';

export default function MountainClimberGamePage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const studentId = searchParams.get('studentId');
    const isTeacher = searchParams.get('teacher') === 'true';
    const difficulty = (searchParams.get('difficulty') || 'medium') as Difficulty;

    const [gameStarted, setGameStarted] = useState(false);
    const [studentName, setStudentName] = useState('');

    const [questionData, setQuestionData] = useState<{
        numbers: { id: string; value: number }[];
        correctOrder: number[];
    } | null>(null);

    const [selectedIndexes, setSelectedIndexes] = useState<number[]>([]);

    const [score, setScore] = useState(0);
    const [questionNumber, setQuestionNumber] = useState(0);
    const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
    const [shakeScreen, setShakeScreen] = useState(false);
    const [startTime, setStartTime] = useState<number>(0);

    // Climber animation state
    const [climberStep, setClimberStep] = useState(0);
    const [shakeRockId, setShakeRockId] = useState<string | null>(null);
    const [isSliding, setIsSliding] = useState(false);

    const [settings, setSettings] = useState({
        successSoundUrl: '',
        errorSoundUrl: '',
    });

    const totalQuestions = 10;
    const NUM_ROCKS = 4;

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
        const baseFormats = [
            (a: number, b: number, c: number) => a * 100000 + b * 10000 + c * 1000,
            (a: number, b: number, c: number) => a * 100000 + c * 10000 + b * 1000,
            (a: number, b: number, c: number) => a * 100000 + 0 * 10000 + b * 1000 + c * 100,
            (a: number, b: number, c: number) => a * 100000 + b * 10000 + 0 * 1000 + c * 100,
            (a: number, b: number, c: number) => a * 100000 + b * 1000 + c * 10,
        ];

        let d1 = Math.floor(Math.random() * 8) + 2;
        let d2 = Math.floor(Math.random() * 9) + 1;
        let d3 = Math.floor(Math.random() * 9) + 1;

        while (d2 === d1) d2 = Math.floor(Math.random() * 9) + 1;
        while (d3 === d1 || d3 === d2) d3 = Math.floor(Math.random() * 9) + 1;

        const shuffledFormats = [...baseFormats].sort(() => Math.random() - 0.5).slice(0, NUM_ROCKS);
        let rawNumbers = shuffledFormats.map(fn => fn(d1, d2, d3));

        rawNumbers = Array.from(new Set(rawNumbers));
        while (rawNumbers.length < NUM_ROCKS) {
            const extra = Math.floor(Math.random() * 899999) + 100000;
            if (!rawNumbers.includes(extra)) rawNumbers.push(extra);
        }

        const sortedOrder = [...rawNumbers].sort((a, b) => a - b);

        const displayNumbers = [...rawNumbers].sort(() => Math.random() - 0.5).map((val, i) => ({
            id: `rock-${i}`,
            value: val,
        }));

        setQuestionData({ numbers: displayNumbers, correctOrder: sortedOrder });
        setSelectedIndexes([]);
        setClimberStep(0);
        setIsSliding(false);
        setShakeRockId(null);
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

    const handleRockClick = (rockIndex: number) => {
        if (feedback !== null || !questionData || selectedIndexes.includes(rockIndex)) return;

        const currentStep = selectedIndexes.length;
        const clickedValue = questionData.numbers[rockIndex].value;
        const expectedValue = questionData.correctOrder[currentStep];

        if (clickedValue === expectedValue) {
            const newSelected = [...selectedIndexes, rockIndex];
            setSelectedIndexes(newSelected);
            setClimberStep(newSelected.length);

            if (newSelected.length === NUM_ROCKS) {
                setFeedback('correct');
                setScore(prev => prev + 1);
                playSound(settings.successSoundUrl);

                const duration = 2500;
                const end = Date.now() + duration;
                (function frame() {
                    confetti({ particleCount: 10, angle: 60, spread: 55, origin: { x: 0 }, colors: ['#fff', '#e2e8f0', '#38bdf8'] });
                    confetti({ particleCount: 10, angle: 120, spread: 55, origin: { x: 1 }, colors: ['#fff', '#e2e8f0', '#38bdf8'] });
                    if (Date.now() < end) requestAnimationFrame(frame);
                }());

                setTimeout(() => nextQuestion(true), 3000);
            }
        } else {
            setFeedback('wrong');
            setShakeScreen(true);
            setShakeRockId(questionData.numbers[rockIndex].id);
            setIsSliding(true);
            playSound(settings.errorSoundUrl);

            setTimeout(() => {
                setShakeScreen(false);
                setShakeRockId(null);
                setFeedback(null);
                setIsSliding(false);
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
                        gameType: 'mountain-climber',
                    }),
                });
            }
            router.push(`/results?score=${finalScore}&total=${totalQuestions}&time=${timeSpent}&gameId=mountain-climber${studentId ? `&studentId=${studentId}` : ''}`);
        } catch (error) {
            console.error('Error saving score:', error);
            alert('حدث خطأ في حفظ النتيجة');
        }
    };

    // ── Start screen ─────────────────────────────────────────────────────
    if (!gameStarted) {
        return (
            <div className="min-h-screen flex items-center justify-center p-4 bg-sky-900 relative overflow-hidden font-sans" dir="rtl">
                <div className="absolute inset-0 bg-gradient-to-b from-sky-300 via-sky-600 to-slate-800 pointer-events-none" />
                <div className="absolute bottom-0 left-[-10%] w-[50%] h-[40%] bg-slate-300 rounded-t-full transform rotate-45 pointer-events-none opacity-50 blur-[2px]" />
                <div className="absolute bottom-0 right-[-10%] w-[60%] h-[50%] bg-slate-400 rounded-t-full transform -rotate-12 pointer-events-none opacity-50 blur-[2px]" />
                <div className="absolute top-[20%] left-[10%] text-6xl opacity-30 animate-pulse pointer-events-none">☁️</div>
                <div className="absolute top-[10%] right-[20%] text-8xl opacity-40 animate-pulse pointer-events-none">☁️</div>

                <div className="max-w-lg w-full relative z-10">
                    <div className="bg-slate-900/80 backdrop-blur-xl rounded-[3rem] shadow-[0_30px_60px_rgba(0,0,0,0.8),inset_0_0_20px_rgba(255,255,255,0.2)] p-8 text-center flex flex-col items-center border-[4px] border-slate-600 outline outline-4 outline-slate-500/30 outline-offset-4 overflow-hidden relative">

                        <div className="mb-6 relative z-10 w-32 h-32 bg-slate-800 rounded-full flex items-center justify-center border-4 border-slate-500/50 shadow-[0_0_30px_rgba(255,255,255,0.3)] overflow-hidden">
                            <div className="absolute bottom-0 w-full h-1/2 bg-slate-600 transform flex items-end justify-center">
                                <motion.div
                                    className="text-6xl drop-shadow-[0_10px_10px_rgba(0,0,0,0.6)] z-20 origin-bottom"
                                    animate={{ rotate: [-5, 5, -5] }}
                                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                                >🧗‍♂️</motion.div>
                            </div>
                            <div className="absolute top-0 w-full h-1/2 bg-sky-400" />
                            <div className="absolute top-2 right-2 w-8 h-8 bg-yellow-300 rounded-full shadow-[0_0_15px_#fde047]" />
                        </div>

                        <h1 className="text-4xl sm:text-5xl font-black text-white mb-4 tracking-tight drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)] font-serif relative z-10">
                            متسلق الجبال
                        </h1>
                        <p className="text-xl text-sky-100 mb-8 font-bold leading-relaxed relative z-10 drop-shadow-md">
                            رتب الأعداد من الأصغر إلى الأكبر لتصل للبطل إلى قمة جبل الرياضيات! 🏔️🚩
                        </p>

                        <div className="mb-8 w-full relative z-10">
                            <label htmlFor="name" className="block text-sky-200 font-bold mb-2 text-right">
                                اسم المتسلق البطل:
                            </label>
                            <input
                                type="text"
                                id="name"
                                value={studentName}
                                onChange={(e) => setStudentName(e.target.value)}
                                className="w-full px-4 py-3 bg-slate-800 border-2 border-slate-500 rounded-xl focus:border-sky-400 focus:outline-none transition-all text-white placeholder-slate-400 text-center text-xl font-bold font-mono shadow-inner"
                                placeholder="اكتب اسمك هنا"
                                required
                            />
                        </div>

                        <button
                            onClick={startGame}
                            className="w-full relative z-10 bg-gradient-to-t from-slate-700 to-slate-500 hover:from-slate-600 hover:to-slate-400 text-white font-black text-2xl py-4 rounded-xl shadow-[0_6px_0_#334155] active:shadow-[0_0px_0_#334155] active:translate-y-2 transform transition-all border-t-2 border-white/20 flex items-center justify-center gap-3 group"
                        >
                            <span>ابدأ التسلق!</span>
                            <span className="group-hover:animate-bounce">🏔️</span>
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // ── Game screen ───────────────────────────────────────────────────────
    const mountainSteps = NUM_ROCKS;

    return (
        <div className="min-h-screen flex items-center justify-center p-2 sm:p-4 bg-sky-900 relative overflow-hidden font-sans" dir="rtl">

            <div className="absolute inset-0 bg-gradient-to-t from-slate-800 via-sky-700 to-sky-400 z-0" />

            <motion.div animate={{ x: [0, -100, 0] }} transition={{ duration: 60, repeat: Infinity, ease: "linear" }} className="absolute top-10 right-[10%] text-6xl opacity-40 z-0">☁️</motion.div>
            <motion.div animate={{ x: [0, 100, 0] }} transition={{ duration: 40, repeat: Infinity, ease: "linear" }} className="absolute top-[30%] left-[5%] text-8xl opacity-30 z-0 text-white">☁️</motion.div>
            <motion.div animate={{ x: [0, -50, 0] }} transition={{ duration: 50, repeat: Infinity, ease: "linear" }} className="absolute top-[15%] left-[45%] text-7xl opacity-50 z-0 text-white">☁️</motion.div>
            <div className="absolute top-10 left-10 w-24 h-24 bg-yellow-300 rounded-full shadow-[0_0_80px_#fef08a] z-0 pointer-events-none" />

            <div className="max-w-6xl w-full h-[95vh] relative z-10 flex flex-col pt-4 sm:pt-6">

                {/* Header */}
                <div className="mb-4 relative z-20 bg-slate-900/80 backdrop-blur-md p-4 sm:p-5 rounded-[1.5rem] border border-slate-600/80 shadow-xl flex flex-col sm:flex-row justify-between items-center gap-4 mx-2">
                    <div className="order-2 sm:order-1 text-center sm:text-right w-full sm:w-auto">
                        <span className="block text-sm sm:text-base font-bold text-slate-300 mb-1 font-mono tracking-wider uppercase">
                            القمة {questionNumber} / {totalQuestions}
                        </span>
                        <span className="block text-2xl font-black text-amber-400 drop-shadow-sm">
                            القمم المجتازة: {score} 🚩
                        </span>
                    </div>
                    <div className="order-1 sm:order-2 bg-gradient-to-r from-slate-800 via-slate-700 to-slate-800 border-y-2 border-slate-500 rounded-2xl px-6 py-3 shadow-inner w-full sm:w-auto text-center flex-1 mx-4">
                        <h2 className="text-base sm:text-xl md:text-2xl font-black text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                            رتب الأعداد من الأصغر إلى الأكبر (تصاعدي) لمساعدة البطل! 🧗‍♂️
                        </h2>
                    </div>
                </div>

                {questionData && (
                    <div className="flex flex-col flex-1 relative overflow-hidden">

                        <div className="flex-1 w-full relative z-10 flex flex-col sm:flex-row items-end justify-center sm:justify-start px-4 sm:px-[10%] pb-[200px] sm:pb-32">

                            <div className="absolute bottom-[200px] sm:bottom-32 right-[5%] sm:right-[15%] w-[90%] sm:w-[70%] h-[300px] sm:h-[450px] flex items-end dir-rtl z-10">

                                {Array.from({ length: mountainSteps }).map((_, stepIndex) => {
                                    const h = 25 + (stepIndex * 25);
                                    const placedRockIndex = selectedIndexes[stepIndex];
                                    const placedValue = placedRockIndex !== undefined ? questionData.numbers[placedRockIndex].value : null;
                                    return (
                                        <div key={`mountain-step-${stepIndex}`} className="flex-1 h-full flex items-end justify-center relative">
                                            <div
                                                className={`relative w-full bg-gradient-to-t from-slate-900 to-slate-600 border-t-[8px] sm:border-t-[16px] border-white/90 border-r-4 ${stepIndex === 0 ? 'rounded-br-2xl' : 'border-slate-800/80'}`}
                                                style={{ height: `${h}%` }}
                                            >
                                                <div className="absolute top-0 left-0 right-0 h-4 sm:h-8 bg-white/90 rounded-b-xl sm:rounded-b-3xl" />
                                                <div className="absolute top-0 left-[20%] w-[30%] h-6 sm:h-12 bg-white/70 rounded-b-2xl sm:rounded-b-full" />
                                                <div className="absolute top-0 right-[20%] w-[40%] h-5 sm:h-10 bg-white/50 rounded-b-xl sm:rounded-b-full" />
                                            </div>
                                            {placedValue !== null && (
                                                <motion.div
                                                    initial={{ opacity: 0, y: -50, scale: 0.5 }}
                                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                                    className="absolute z-20 top-[-60px] sm:top-[-90px]"
                                                    style={{ bottom: `${h}%` }}
                                                />
                                            )}
                                        </div>
                                    );
                                })}

                                {Array.from({ length: mountainSteps }).map((_, stepIndex) => {
                                    const h = 25 + (stepIndex * 25);
                                    const placedRockIndex = selectedIndexes[stepIndex];
                                    const placedValue = placedRockIndex !== undefined ? questionData.numbers[placedRockIndex].value : null;
                                    return (
                                        <div key={`placed-val-wrap-${stepIndex}`} className="flex-1 h-full absolute bottom-0 flex justify-center w-full pointer-events-none" style={{ right: `${(100 / mountainSteps) * stepIndex}%`, width: `${100 / mountainSteps}%` }}>
                                            {placedValue !== null && (
                                                <motion.div
                                                    initial={{ opacity: 0, y: -50, scale: 0.5 }}
                                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                                    className="absolute z-10 flex flex-col items-center justify-end pb-4 sm:pb-8 drop-shadow-[0_10px_10px_rgba(0,0,0,0.8)]"
                                                    style={{ height: `${h}%`, bottom: 0 }}
                                                >
                                                    <div className="bg-slate-800/90 border-2 border-slate-400 px-3 sm:px-6 py-2 sm:py-4 rounded-[1rem] sm:rounded-[2rem] mb-2 sm:mb-4">
                                                        <span className="text-xl sm:text-3xl font-mono font-black text-amber-400">
                                                            {placedValue.toLocaleString('en-US')}
                                                        </span>
                                                    </div>
                                                </motion.div>
                                            )}
                                        </div>
                                    );
                                })}

                                {/* Climber */}
                                <motion.div
                                    className="absolute bottom-0 z-30 flex flex-col items-center"
                                    initial={false}
                                    animate={{
                                        right: climberStep === 0 ? '-10%' : `${12.5 + (climberStep - 1) * 25}%`,
                                        bottom: climberStep === 0 ? '0%' : `${25 + ((climberStep - 1) * 25)}%`,
                                        x: isSliding ? [-10, 10, -10, 10, 0] : 0,
                                        y: isSliding ? [0, 20, 0] : (climberStep === mountainSteps ? [-20, 0, -20] : 0),
                                    }}
                                    transition={{ type: "spring", stiffness: 100, damping: 15 }}
                                >
                                    {climberStep === mountainSteps && (
                                        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="absolute -top-16 sm:-top-24 text-6xl sm:text-8xl origin-bottom drop-shadow-lg">
                                            🚩
                                        </motion.div>
                                    )}
                                    <div className="text-6xl sm:text-8xl drop-shadow-[0_15px_15px_rgba(0,0,0,0.8)] filter relative z-10 transform scale-x-[-1]">
                                        🦸‍♂️
                                    </div>
                                    <div className="w-10 h-2 bg-black/40 rounded-full blur-sm mt-[-5px]" />
                                </motion.div>
                            </div>

                            {/* Rock buttons */}
                            <div className="absolute min-w-full bottom-4 sm:bottom-6 left-0 right-0 z-50 px-2 sm:px-[5%] flex justify-center gap-2 sm:gap-6 flex-wrap">
                                {questionData.numbers.map((rockStr, index) => {
                                    const isSelected = selectedIndexes.includes(index);
                                    return (
                                        <motion.button
                                            key={rockStr.id}
                                            whileHover={isSelected ? {} : { scale: 1.05, y: -5 }}
                                            whileTap={isSelected ? {} : { scale: 0.95 }}
                                            animate={shakeRockId === rockStr.id ? { x: [-10, 10, -10, 10, 0] } : {}}
                                            onClick={() => handleRockClick(index)}
                                            disabled={feedback !== null || isSelected}
                                            className={`
                                                relative w-[130px] sm:w-[200px] md:w-[220px] h-[80px] sm:h-[120px] rounded-t-[2rem] rounded-b-[1rem] border-[4px] sm:border-[8px] flex flex-col items-center justify-center font-bold transition-all overflow-hidden shadow-[0_15px_20px_rgba(0,0,0,0.6)]
                                                ${isSelected
                                                    ? 'border-slate-800 bg-slate-900/40 text-slate-700/50 shadow-none scale-90 blur-[1px]'
                                                    : shakeRockId === rockStr.id
                                                        ? 'border-red-900 bg-red-800 text-red-100 shadow-[0_0_30px_#7f1d1d]'
                                                        : 'border-slate-800 bg-gradient-to-t from-slate-600 via-slate-500 to-slate-400 text-white hover:border-slate-600 hover:from-slate-500 hover:to-slate-300'
                                                }
                                            `}
                                        >
                                            <div className="absolute inset-0 opacity-40 bg-[url('https://www.transparenttextures.com/patterns/granite.png')] mix-blend-multiply pointer-events-none" />
                                            <span className={`relative z-10 text-xl sm:text-3xl lg:text-4xl font-black font-mono drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] ${isSelected ? 'opacity-20' : ''}`}>
                                                {rockStr.value.toLocaleString('en-US')}
                                            </span>
                                        </motion.button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Feedback overlay */}
                        <div className="absolute top-[40%] left-1/2 transform -translate-x-1/2 w-full max-w-2xl px-4 z-50 pointer-events-none flex justify-center mt-[-40px]">
                            <AnimatePresence mode="wait">
                                {feedback === 'correct' && (
                                    <motion.div key="correct" initial={{ scale: 0.5, opacity: 0, y: 30 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.5, opacity: 0, y: -30 }}
                                        className="bg-emerald-950/95 backdrop-blur-md border-4 border-emerald-500 text-emerald-100 px-8 py-6 rounded-[2rem] text-center shadow-[0_0_60px_rgba(16,185,129,0.8)] flex items-center justify-center gap-4 pointer-events-auto">
                                        <span className="text-5xl sm:text-6xl drop-shadow-md">🚩</span>
                                        <p className="text-2xl sm:text-4xl font-black drop-shadow-sm font-serif">تسلق ناجح! قمة جبل الرياضيات!</p>
                                    </motion.div>
                                )}
                                {feedback === 'wrong' && (
                                    <motion.div key="wrong" initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.8, opacity: 0 }}
                                        className="bg-red-950/95 backdrop-blur-md border-4 border-red-600 text-red-100 px-6 py-4 rounded-[2rem] text-center shadow-[0_0_50px_rgba(185,28,28,0.8)] flex flex-col items-center justify-center gap-2 pointer-events-auto">
                                        <div className="flex items-center gap-3">
                                            <span className="text-4xl sm:text-5xl drop-shadow-md animate-bounce">⚠️</span>
                                            <p className="text-lg sm:text-2xl font-black drop-shadow-sm leading-tight max-w-[250px] sm:max-w-none">
                                                تأكد من القيمة المنزلية للأرقام! ابحث عن الأصغر.
                                            </p>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
