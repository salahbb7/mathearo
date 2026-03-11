'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Difficulty } from '@/lib/difficulty';
import confetti from 'canvas-confetti';
import { motion, AnimatePresence } from 'framer-motion';

const WHEEL_COLORS = [
    { id: 'red', name: 'الأحمر', hex: '#ef4444' },
    { id: 'blue', name: 'الأزرق', hex: '#3b82f6' },
    { id: 'green', name: 'الأخضر', hex: '#10b981' },
    { id: 'yellow', name: 'الأصفر', hex: '#facc15' },
    { id: 'purple', name: 'البنفسجي', hex: '#a855f7' },
];

type ProbabilityTerm = 'مؤكد' | 'محتمل' | 'مستحيل';

export default function ProbabilitySpinnerGamePage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const studentId = searchParams.get('studentId');
    const isTeacher = searchParams.get('teacher') === 'true';
    const difficulty = (searchParams.get('difficulty') || 'medium') as Difficulty;

    const [gameStarted, setGameStarted] = useState(false);
    const [studentName, setStudentName] = useState('');

    const [questionData, setQuestionData] = useState<{
        slices: typeof WHEEL_COLORS[0][]; // array representing slices colors
        targetColor: typeof WHEEL_COLORS[0];
        correctProbability: ProbabilityTerm;
        options: { id: string; text: ProbabilityTerm; isCorrect: boolean }[];
    } | null>(null);

    const [score, setScore] = useState(0);
    const [questionNumber, setQuestionNumber] = useState(0);
    const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
    const [shakeScreen, setShakeScreen] = useState(false);
    const [startTime, setStartTime] = useState<number>(0);

    // Spinner state
    const [spinnerDeg, setSpinnerDeg] = useState(0);
    const [isSpinning, setIsSpinning] = useState(false);
    const [shakeOptionId, setShakeOptionId] = useState<string | null>(null);

    const [settings, setSettings] = useState({
        successSoundUrl: '', // cheering
        errorSoundUrl: '', // buzz
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
        const numSlices = 8; // Wheel size
        const pType = Math.floor(Math.random() * 3); // 0: Certain, 1: Possible, 2: Impossible

        let slices: typeof WHEEL_COLORS[0][] = [];
        let targetColor = WHEEL_COLORS[Math.floor(Math.random() * WHEEL_COLORS.length)];
        let correctProbability: ProbabilityTerm;

        if (pType === 0) {
            // Certain (All slices same)
            slices = Array(numSlices).fill(targetColor);
            correctProbability = 'مؤكد';
        } else if (pType === 2) {
            // Impossible (No slices have the target color)
            let otherColors = WHEEL_COLORS.filter(c => c.id !== targetColor.id);
            for (let i = 0; i < numSlices; i++) {
                slices.push(otherColors[Math.floor(Math.random() * otherColors.length)]);
            }
            correctProbability = 'مستحيل';
        } else {
            // Possible (Some slices have target color, but not all)
            // Ensure 1 to numSlices-1 occurrences
            const targetCount = Math.floor(Math.random() * (numSlices - 1)) + 1;
            let otherColors = WHEEL_COLORS.filter(c => c.id !== targetColor.id);
            for (let i = 0; i < targetCount; i++) slices.push(targetColor);
            for (let i = targetCount; i < numSlices; i++) slices.push(otherColors[Math.floor(Math.random() * otherColors.length)]);

            // Shuffle slices
            for (let i = slices.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [slices[i], slices[j]] = [slices[j], slices[i]];
            }
            correctProbability = 'محتمل';
        }

        const opts = [
            { id: 'p1', text: 'مؤكد' as ProbabilityTerm, isCorrect: correctProbability === 'مؤكد' },
            { id: 'p2', text: 'محتمل' as ProbabilityTerm, isCorrect: correctProbability === 'محتمل' },
            { id: 'p3', text: 'مستحيل' as ProbabilityTerm, isCorrect: correctProbability === 'مستحيل' }
        ];

        setQuestionData({
            slices,
            targetColor,
            correctProbability,
            options: opts
        });

        // reset spinner visually mapping
        setSpinnerDeg(0);
        setIsSpinning(false);
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

    const checkAnswer = (selectedOpt: { id: string; text: string; isCorrect: boolean }) => {
        if (feedback !== null || !questionData || isSpinning) return;

        if (selectedOpt.isCorrect) {
            setIsSpinning(true);

            // Determine stopping angle based on probability type
            // Target is color.
            let targetSliceIndex = 0;
            if (questionData.correctProbability === 'مؤكد') {
                targetSliceIndex = Math.floor(Math.random() * 8); // Any slice works
            } else if (questionData.correctProbability === 'محتمل') {
                // find index of a matching color
                const matchingIndexes = [];
                for (let i = 0; i < questionData.slices.length; i++) {
                    if (questionData.slices[i].id === questionData.targetColor.id) matchingIndexes.push(i);
                }
                targetSliceIndex = matchingIndexes[Math.floor(Math.random() * matchingIndexes.length)];
            } else {
                // Impossible: stop anywhere, we already won by choosing 'Impossible'
                targetSliceIndex = Math.floor(Math.random() * 8);
            }

            // Slice angle is 360/8 = 45 deg.
            // Slice 0 is top (0 to 45 or centered on something).
            // Let's assume CSS conic-gradient starts at top right. We will adjust visually.
            // For 8 slices, each is 45 deg. 
            // 0th slice is from 0 to 45. Center is 22.5.
            // To make slice N be at the top under the pointer, we rotate the wheel backwards by that angle.
            // Wheel top is 0 deg. Backwards by (N * 45 + 22.5) degrees.
            const sliceDeg = targetSliceIndex * 45 + 22.5;
            const spins = 5 * 360; // 5 full spins
            const newDeg = spinnerDeg + spins + (360 - sliceDeg); // calculate absolute rotation

            setSpinnerDeg(newDeg);

            // Wait for spin to finish (duration = 3s)
            setTimeout(() => {
                setFeedback('correct');
                setScore(prev => prev + 1);
                playSound(settings.successSoundUrl);

                // Carnival Confetti Celebration
                const duration = 2000;
                const end = Date.now() + duration;

                (function frame() {
                    confetti({
                        particleCount: 15,
                        angle: 90, // Upwards burst
                        spread: 100,
                        startVelocity: 60,
                        origin: { x: 0.5, y: 0.8 },
                        colors: ['#ef4444', '#3b82f6', '#10b981', '#facc15', '#a855f7'],
                        shapes: ['circle', 'square'],
                        gravity: 1.0,
                        scalar: 1.4
                    });

                    if (Date.now() < end) {
                        requestAnimationFrame(frame);
                    }
                }());

                setTimeout(() => {
                    nextQuestion(true);
                }, 2500);
            }, 3000);

        } else {
            setFeedback('wrong');
            setShakeScreen(true);
            setShakeOptionId(selectedOpt.id);
            playSound(settings.errorSoundUrl);

            setTimeout(() => {
                setShakeScreen(false);
                setShakeOptionId(null);
                setFeedback(null);
            }, 2000);
        }
    };

    const nextQuestion = (wasCorrect: boolean) => {
        setFeedback(null);
        setIsSpinning(false);

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
                        gameType: 'probability-spinner', // Match ID
                    }),
                });
            }

            router.push(`/results?score=${finalScore}&total=${totalQuestions}&time=${timeSpent}&gameId=probability-spinner${studentId ? `&studentId=${studentId}` : ''}`);
        } catch (error) {
            console.error('Error saving score:', error);
            alert('حدث خطأ في حفظ النتيجة');
        }
    };

    if (!gameStarted) {
        return (
            <div className="min-h-screen flex items-center justify-center p-4 bg-indigo-950 relative overflow-hidden font-sans" dir="rtl">
                {/* Carnival Night Background */}
                <div className="absolute inset-0 bg-gradient-to-b from-indigo-950 via-purple-950 to-indigo-900 z-0"></div>
                <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] pointer-events-none z-0"></div>

                {/* Spotlights */}
                <div className="absolute bottom-0 left-[20%] w-[100px] h-[800px] bg-yellow-100/10 rounded-full blur-[40px] transform -rotate-45 origin-bottom pointer-events-none z-0"></div>
                <div className="absolute bottom-0 right-[20%] w-[100px] h-[800px] bg-sky-100/10 rounded-full blur-[40px] transform rotate-45 origin-bottom pointer-events-none z-0"></div>

                <div className="max-w-lg w-full relative z-10">
                    <div className="bg-purple-900/60 backdrop-blur-xl rounded-[3rem] shadow-[0_20px_60px_rgba(0,0,0,0.8),0_0_50px_rgba(168,85,247,0.3)] p-8 text-center flex flex-col items-center border-[6px] border-purple-500/50 outline outline-4 outline-pink-500/30 outline-offset-4 overflow-hidden">
                        <div className="mb-4 relative z-10">
                            {/* Colorful Spinner Icon */}
                            <motion.div
                                animate={{ rotate: 360 }}
                                transition={{ repeat: Infinity, duration: 8, ease: "linear" }}
                                className="text-8xl drop-shadow-[0_10px_10px_rgba(0,0,0,0.5)]"
                            >
                                🎯
                            </motion.div>
                        </div>
                        <h1 className="text-4xl sm:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-pink-400 via-purple-300 to-indigo-400 mb-4 tracking-tight drop-shadow-sm font-serif relative z-10">
                            عجلة الاحتمالات
                        </h1>
                        <p className="text-xl text-purple-200 mb-8 font-bold leading-relaxed relative z-10">
                            مرحباً بك في السيرك الرياضي! توقع الاحتمالات الصحيحة لتدوير العجلة السحرية! 🎪🎡
                        </p>

                        <div className="mb-6 w-full relative z-10">
                            <label htmlFor="name" className="block text-pink-300 font-bold mb-2 text-right">
                                اسم المتنافس بكرنفال الرياضيات:
                            </label>
                            <input
                                type="text"
                                id="name"
                                value={studentName}
                                onChange={(e) => setStudentName(e.target.value)}
                                className="w-full px-4 py-3 bg-indigo-950/80 border-2 border-purple-500 rounded-xl focus:border-pink-400 focus:outline-none transition-all text-purple-100 placeholder-purple-400/50 text-center text-xl font-bold shadow-inner"
                                placeholder="اكتب اسمك هنا"
                                required
                            />
                        </div>

                        <button
                            onClick={startGame}
                            className="w-full relative z-10 bg-gradient-to-l from-pink-600 via-purple-600 to-indigo-600 hover:from-pink-500 hover:via-purple-500 hover:to-indigo-500 text-white font-black text-2xl py-4 rounded-xl shadow-[0_6px_0_#4c1d95] active:shadow-[0_0px_0_#4c1d95] active:translate-y-2 transform transition-all border-y-2 border-white/30 flex items-center justify-center gap-3"
                        >
                            <span>لتبدأ اللعبة!</span>
                            <span>🎉</span>
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // Prepare conic gradient for the wheel
    // 8 slices = 45 deg per slice
    let conicStr = '';
    if (questionData) {
        const stops = questionData.slices.map((slice, index) => {
            const startAngle = index * 45;
            const endAngle = (index + 1) * 45;
            return `${slice.hex} ${startAngle}deg, ${slice.hex} ${endAngle}deg`;
        });
        conicStr = `conic-gradient(${stops.join(', ')})`;
    }

    return (
        <div className="min-h-screen flex items-center justify-center p-2 sm:p-4 bg-indigo-950 relative overflow-hidden font-sans" dir="rtl">
            {/* Carnival Show Environment Background */}
            <div className="absolute inset-0 bg-gradient-to-tr from-purple-900 via-indigo-950 to-blue-950 opacity-80 z-0"></div>
            <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] z-0"></div>

            <div className="absolute top-[-20%] left-[-20%] w-[50%] h-[50%] bg-pink-600/20 rounded-full blur-[120px] pointer-events-none z-0"></div>
            <div className="absolute bottom-[-20%] right-[-20%] w-[50%] h-[50%] bg-cyan-600/20 rounded-full blur-[120px] pointer-events-none z-0"></div>

            <div className="max-w-5xl w-full relative z-10 py-6 sm:py-10">
                <motion.div
                    animate={shakeScreen ? { x: [-15, 15, -15, 15, 0], y: [-5, 5, -5, 5, 0] } : {}}
                    transition={{ duration: 0.4 }}
                    className="bg-purple-900/40 backdrop-blur-md border-[4px] border-purple-500/50 rounded-[3rem] shadow-[0_30px_60px_rgba(0,0,0,0.8),inset_0_0_50px_rgba(168,85,247,0.2)] p-4 sm:p-8 relative overflow-hidden"
                >
                    {/* Header Info */}
                    <div className="mb-8 relative z-10 bg-indigo-950/80 p-4 sm:p-6 rounded-[2rem] border border-indigo-500/50 shadow-xl flex flex-col sm:flex-row justify-between items-center gap-4">
                        <div className="order-2 sm:order-1 text-center sm:text-right w-full sm:w-auto flex-1">
                            <span className="block text-sm sm:text-base font-bold text-indigo-300 mb-1 font-mono tracking-wider uppercase">
                                الجولة {questionNumber} / {totalQuestions}
                            </span>
                            <span className="block text-xl sm:text-3xl font-black text-pink-400 drop-shadow-[0_0_10px_rgba(244,114,182,0.3)]">
                                الرصيد: {score} 🎟️
                            </span>
                        </div>
                        <div className="order-1 sm:order-2 bg-purple-900/80 border-2 border-pink-500/50 rounded-2xl px-6 py-4 shadow-inner w-full sm:w-auto text-center flex-2">
                            <h2 className="text-xl sm:text-2xl font-black text-indigo-100 drop-shadow-md leading-relaxed">
                                ما هو احتمال أن يقف المؤشر على اللون <span className="px-3 py-1 bg-white border-2 rounded-xl border-slate-300 shadow-md inline-block font-mono" style={{ color: questionData?.targetColor.hex }}>{questionData?.targetColor.name}</span> ؟ 🎪
                            </h2>
                        </div>
                    </div>

                    {questionData && (
                        <div className="flex flex-col items-center">

                            {/* The Spinner Scene Area */}
                            <div className="relative w-full flex justify-center items-center mb-16 mt-8 h-[300px] sm:h-[400px]">

                                {/* Background glow for wheel */}
                                <div className="absolute inset-0 bg-white/5 rounded-full blur-[50px] pointer-events-none scale-150"></div>

                                {/* Light Bulbs around the wheel */}
                                <div className="absolute z-20 w-[300px] h-[300px] sm:w-[380px] sm:h-[380px] rounded-full pointer-events-none border-[12px] border-indigo-900 shadow-[0_0_50px_rgba(0,0,0,0.8),inset_0_0_20px_rgba(0,0,0,0.8)] flex items-center justify-center">
                                    {/* Generate 16 dots for lights */}
                                    {Array.from({ length: 16 }).map((_, i) => (
                                        <div
                                            key={i}
                                            className="absolute w-3 h-3 sm:w-4 sm:h-4 bg-yellow-200 rounded-full shadow-[0_0_10px_#fef08a]"
                                            style={{
                                                transform: `rotate(${i * (360 / 16)}deg) translateY(-142px) sm:translateY(-182px)`, // Adjust radius
                                                animation: `pulse ${1 + (i % 2) * 0.5}s ease-in-out infinite alternate`,
                                            }}
                                        ></div>
                                    ))}
                                </div>

                                {/* The Pointer (Arrow) */}
                                <div className="absolute -top-6 sm:-top-8 z-40 bg-pink-600 w-8 h-12 sm:w-10 sm:h-16 transform polygon-pointer drop-shadow-2xl border-2 border-white/50" style={{ clipPath: 'polygon(50% 100%, 0 0, 100% 0)' }}></div>
                                <div className="absolute -top-6 sm:-top-8 z-30 bg-black/30 w-10 h-16 transform polygon-pointer blur-md" style={{ clipPath: 'polygon(50% 100%, 0 0, 100% 0)' }}></div>

                                {/* The Colorful Wheel */}
                                <motion.div
                                    className="relative z-10 w-[270px] h-[270px] sm:w-[340px] sm:h-[340px] rounded-full shadow-inner overflow-hidden"
                                    style={{ background: conicStr }}
                                    animate={{ rotate: spinnerDeg }}
                                    transition={{ duration: 3, ease: [0.2, 0.8, 0.3, 1] }} // smooth deceleration
                                >
                                    {/* Center Peg */}
                                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-10 h-10 bg-gradient-to-br from-indigo-300 to-indigo-600 rounded-full shadow-[0_0_15px_rgba(0,0,0,0.5),inset_0_5px_5px_rgba(255,255,255,0.5)] border-4 border-indigo-900 z-20"></div>
                                    {/* Lines separators for aesthetic */}
                                    {Array.from({ length: 8 }).map((_, i) => (
                                        <div
                                            key={i}
                                            className="absolute top-1/2 left-1/2 w-[50%] h-[2px] bg-indigo-900/50 transform origin-left z-10"
                                            style={{ rotate: `${i * 45}deg` }}
                                        ></div>
                                    ))}
                                </motion.div>

                                {/* Pedestal / Stand */}
                                <div className="absolute -bottom-10 sm:-bottom-16 w-32 sm:w-40 h-24 bg-gradient-to-b from-indigo-900 to-indigo-950 rounded-t-full z-0 clip-path-pedestal border-x-4 border-indigo-800" style={{ clipPath: 'polygon(20% 0%, 80% 0%, 100% 100%, 0% 100%)' }}></div>

                            </div>

                            {/* Options Buttons (Probability Terms) */}
                            <div className="w-full grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 relative z-30 px-2 sm:px-8 mt-10">
                                <AnimatePresence>
                                    {questionData.options.map((option) => (
                                        <motion.button
                                            key={option.id}
                                            whileHover={{ scale: 1.05, y: -5 }}
                                            whileTap={{ scale: 0.95 }}
                                            animate={shakeOptionId === option.id ? { x: [-10, 10, -10, 10, 0] } : {}}
                                            onClick={() => checkAnswer(option)}
                                            disabled={feedback !== null || isSpinning}
                                            className={`
                                                relative h-20 sm:h-28 rounded-2xl border-[4px] flex flex-col items-center justify-center font-bold transition-all
                                                overflow-hidden group
                                                ${shakeOptionId === option.id
                                                    ? 'border-red-500 bg-red-900/80 shadow-[0_0_30px_#ef4444] text-red-100'
                                                    : (feedback === 'correct' && option.isCorrect)
                                                        ? 'border-emerald-500 bg-emerald-900/80 shadow-[0_0_30px_#10b981] text-emerald-100'
                                                        : 'border-indigo-400 bg-indigo-800/80 hover:border-pink-400 hover:bg-indigo-700 shadow-[0_10px_20px_rgba(0,0,0,0.5)] text-indigo-100'
                                                }
                                            `}
                                        >

                                            {/* Glow Background */}
                                            <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent pointer-events-none z-0"></div>

                                            {/* Value */}
                                            <span className="relative z-10 text-3xl sm:text-4xl font-black drop-shadow-md tracking-wider">
                                                {option.text}
                                            </span>

                                            {/* Icons mapping */}
                                            {option.text === 'مؤكد' && <div className="absolute top-2 right-2 text-xl opacity-30 pointer-events-none">💯</div>}
                                            {option.text === 'محتمل' && <div className="absolute top-2 right-2 text-xl opacity-30 pointer-events-none">🤔</div>}
                                            {option.text === 'مستحيل' && <div className="absolute top-2 right-2 text-xl opacity-30 pointer-events-none">🚫</div>}

                                        </motion.button>
                                    ))}
                                </AnimatePresence>
                            </div>

                            {/* Feedback Overlay Message */}
                            <div className="absolute top-[50%] left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full max-w-xl px-4 z-50 pointer-events-none flex justify-center mt-[120px] sm:mt-[160px]">
                                <AnimatePresence mode="wait">
                                    {feedback === 'correct' && !isSpinning && (
                                        <motion.div
                                            key="correct"
                                            initial={{ scale: 0.5, opacity: 0, y: 30 }}
                                            animate={{ scale: 1, opacity: 1, y: 0 }}
                                            exit={{ scale: 0.5, opacity: 0, y: -30 }}
                                            className="bg-emerald-500/95 backdrop-blur-md border-4 border-emerald-300 text-emerald-950 px-6 py-4 rounded-[2rem] text-center shadow-[0_0_50px_rgba(16,185,129,0.8)] flex items-center justify-center gap-4"
                                        >
                                            <span className="text-4xl sm:text-5xl drop-shadow-md animate-pulse">🎡</span>
                                            <p className="text-xl sm:text-2xl font-black drop-shadow-sm font-serif">توقع سليم أيها البطل!</p>
                                        </motion.div>
                                    )}

                                    {feedback === 'wrong' && (
                                        <motion.div
                                            key="wrong"
                                            initial={{ scale: 0.8, opacity: 0 }}
                                            animate={{ scale: 1, opacity: 1 }}
                                            exit={{ scale: 0.8, opacity: 0 }}
                                            className="bg-red-600/95 backdrop-blur-md border-4 border-red-300 text-red-50 px-6 py-4 rounded-[2rem] text-center shadow-[0_0_50px_rgba(220,38,38,0.8)] flex flex-col items-center justify-center gap-2"
                                        >
                                            <div className="flex items-center gap-3">
                                                <span className="text-3xl sm:text-4xl drop-shadow-md">⚠️</span>
                                                <p className="text-lg sm:text-xl font-black drop-shadow-sm leading-tight max-w-[200px] sm:max-w-none">
                                                    انظر لترتيب ألوان العجلة جيداً!
                                                </p>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>

                        </div>
                    )}
                </motion.div>
            </div>
        </div>
    );
}
