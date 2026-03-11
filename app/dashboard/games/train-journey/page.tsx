'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Difficulty } from '@/lib/difficulty';
import confetti from 'canvas-confetti';
import { motion, AnimatePresence } from 'framer-motion';

// Helper to format time as HH:MM
const formatTime = (minutes: number) => {
    // Normalize to 12-hour format for easier reading by kids
    // Let's stick to 24-hour but max 12 for simplicity if needed, or 12h format.
    // Let's just use simple 12-hour values: 1:00 to 12:59
    let h = Math.floor(minutes / 60) % 12;
    if (h === 0) h = 12;
    const m = minutes % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
};

export default function TrainJourneyGamePage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const studentId = searchParams.get('studentId');
    const isTeacher = searchParams.get('teacher') === 'true';
    const difficulty = (searchParams.get('difficulty') || 'medium') as Difficulty;

    const [gameStarted, setGameStarted] = useState(false);
    const [studentName, setStudentName] = useState('');

    const [questionData, setQuestionData] = useState<{
        departureMinsTotal: number;
        durationDurationMins: number; // e.g. 90 mins (1.5 h)
        durationText: string;
        arrivalMinsTotal: number;
        options: { id: string; time: string; isCorrect: boolean }[];
    } | null>(null);

    const [score, setScore] = useState(0);
    const [questionNumber, setQuestionNumber] = useState(0);
    const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
    const [shakeScreen, setShakeScreen] = useState(false);
    const [startTime, setStartTime] = useState<number>(0);

    // State for the train animation
    const [trainState, setTrainState] = useState<'idle' | 'arriving' | 'shaking'>('idle');
    const [shakeOptionId, setShakeOptionId] = useState<string | null>(null);

    const [settings, setSettings] = useState({
        successSoundUrl: '', // train whistle expected
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
        // Departure time: 1:00 to 10:00 (to avoid crossing 12 for simplicity, or we cross it and handle it)
        // Let's generate a time between 1:00 (60) and 10:30 (630)
        // Steps of 30 minutes
        const departureSlots = [60, 90, 120, 150, 180, 210, 240, 270, 300, 330, 360, 390, 420, 450, 480, 510, 540, 570, 600, 630];
        const departureBase = departureSlots[Math.floor(Math.random() * departureSlots.length)];

        // Duration: 1h to 4h, in 30min increments
        const durSlots = [
            { mins: 60, text: 'ساعة واحدة' },
            { mins: 90, text: 'ساعة ونصف' },
            { mins: 120, text: 'ساعتان' },
            { mins: 150, text: 'ساعتان ونصف' },
            { mins: 180, text: '3 ساعات' },
            { mins: 210, text: '3 ساعات ونصف' },
            { mins: 240, text: '4 ساعات' },
        ];

        const durationObj = durSlots[Math.floor(Math.random() * durSlots.length)];
        const dur = durationObj.mins;

        const correctArrival = departureBase + dur;

        // Distractors
        const generateDistractor = () => {
            // common mistakes: add duration to wrong unit, missing 30 min, adding wrong number of hours
            const errType = Math.floor(Math.random() * 3);
            let dType = correctArrival;
            if (errType === 0) dType += 60; // plus 1 hour
            else if (errType === 1) dType -= 60; // minus 1 hour
            else if (errType === 2) dType += 30; // missing / extra half hour

            // Validate: prevent going negative or exactly same as correct
            if (dType < 0) dType += 120;
            if (dType === correctArrival) dType += 60;
            return dType;
        };

        const d1 = generateDistractor();
        let d2 = generateDistractor();
        while (d2 === correctArrival || d2 === d1) {
            d2 = generateDistractor();
        }

        const opts = [
            { id: 'correct', time: formatTime(correctArrival), isCorrect: true },
            { id: 'd1', time: formatTime(d1), isCorrect: false },
            { id: 'd2', time: formatTime(d2), isCorrect: false }
        ];

        // Shuffle
        for (let i = opts.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [opts[i], opts[j]] = [opts[j], opts[i]];
        }

        setQuestionData({
            departureMinsTotal: departureBase,
            durationDurationMins: dur,
            durationText: durationObj.text,
            arrivalMinsTotal: correctArrival,
            options: opts
        });

        setTrainState('idle');
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

    const checkAnswer = (selectedOpt: { id: string; time: string; isCorrect: boolean }) => {
        if (feedback !== null || !questionData) return;

        if (selectedOpt.isCorrect) {
            setFeedback('correct');
            setScore(prev => prev + 1);
            playSound(settings.successSoundUrl);
            setTrainState('arriving');

            // Journey Celebration (Train arriving confetti)
            const duration = 2000;
            const end = Date.now() + duration;

            (function frame() {
                confetti({
                    particleCount: 10,
                    angle: 180, // Shooting leftwards from right side
                    spread: 40,
                    startVelocity: 50,
                    origin: { x: 0.9, y: 0.6 },
                    colors: ['#475569', '#f8fafc', '#dc2626', '#eab308'],
                    shapes: ['square', 'circle'],
                    gravity: 0.8,
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
            setShakeOptionId(selectedOpt.id);
            setTrainState('shaking');
            playSound(settings.errorSoundUrl);

            setTimeout(() => {
                setShakeScreen(false);
                setShakeOptionId(null);
                setFeedback(null);
                setTrainState('idle');
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
                        gameType: 'train-journey', // Match ID
                    }),
                });
            }

            router.push(`/results?score=${finalScore}&total=${totalQuestions}&time=${timeSpent}&gameId=train-journey${studentId ? `&studentId=${studentId}` : ''}`);
        } catch (error) {
            console.error('Error saving score:', error);
            alert('حدث خطأ في حفظ النتيجة');
        }
    };

    if (!gameStarted) {
        return (
            <div className="min-h-screen flex items-center justify-center p-4 bg-amber-50 relative overflow-hidden font-sans" dir="rtl">
                {/* Station Background Grid */}
                <div className="absolute inset-0 opacity-40 bg-[url('https://www.transparenttextures.com/patterns/brick-wall.png')] pointer-events-none"></div>

                {/* Ambient lights */}
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-amber-500/20 rounded-full blur-[100px] pointer-events-none"></div>

                <div className="max-w-lg w-full relative z-10">
                    <div className="bg-white/90 backdrop-blur-xl rounded-[3rem] shadow-[0_20px_60px_rgba(217,119,6,0.2)] p-8 text-center flex flex-col items-center border-[6px] border-amber-800/80 outline outline-4 outline-amber-500/30 outline-offset-4">
                        <div className="mb-4 relative">
                            {/* Train Icon SVG */}
                            <div className="text-8xl drop-shadow-[0_10px_10px_rgba(180,83,9,0.5)] transform animate-[bounce_3s_ease-in-out_infinite]">
                                🚂
                            </div>
                        </div>
                        <h1 className="text-4xl sm:text-5xl font-black text-amber-800 mb-4 tracking-tight drop-shadow-sm font-serif">
                            رحلة القطار
                        </h1>
                        <p className="text-xl text-amber-900/80 mb-8 font-bold leading-relaxed">
                            أيها المفتش، اقرأ التذكرة واحسب متى سيصل القطار إلى الوجهة الصحيحة! ⏱️🛤️
                        </p>

                        <div className="mb-6 w-full">
                            <label htmlFor="name" className="block text-amber-800 font-bold mb-2 text-right">
                                اسم مفتش المحطة:
                            </label>
                            <input
                                type="text"
                                id="name"
                                value={studentName}
                                onChange={(e) => setStudentName(e.target.value)}
                                className="w-full px-4 py-3 bg-amber-50 border-2 border-amber-600 rounded-xl focus:border-amber-400 focus:outline-none transition-all text-amber-900 placeholder-amber-700/50 text-center text-xl font-bold font-mono shadow-inner"
                                placeholder="اكتب اسمك هنا"
                                required
                            />
                        </div>

                        <button
                            onClick={startGame}
                            className="w-full bg-gradient-to-l from-amber-700 to-yellow-600 hover:from-amber-600 hover:to-yellow-500 text-white font-black text-2xl py-4 rounded-xl shadow-[0_6px_0_#92400e] active:shadow-[0_0px_0_#92400e] active:translate-y-2 transform transition-all border-t-2 border-white/30 flex items-center justify-center gap-3"
                        >
                            <span>اطلق الصافرة!</span>
                            <span>📢</span>
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center p-2 sm:p-4 bg-slate-800 relative overflow-hidden font-sans" dir="rtl">
            {/* Night Station Environment Background */}
            <div className="absolute inset-0 opacity-40 bg-[url('https://www.transparenttextures.com/patterns/brick-wall-dark.png')] mix-blend-multiply"></div>

            {/* Moon/Light */}
            <div className="absolute top-10 left-20 w-32 h-32 bg-yellow-100/50 rounded-full blur-[40px] pointer-events-none"></div>

            <div className="max-w-5xl w-full relative z-10 py-6 sm:py-10">
                <motion.div
                    animate={shakeScreen ? { x: [-15, 15, -15, 15, 0], y: [-5, 5, -5, 5, 0] } : {}}
                    transition={{ duration: 0.4 }}
                    className="bg-slate-900 border-[6px] border-slate-700 rounded-[3rem] shadow-[0_30px_60px_rgba(0,0,0,0.8),inset_0_0_50px_rgba(0,0,0,0.5)] p-4 sm:p-8 relative overflow-hidden"
                >
                    {/* Header Info */}
                    <div className="mb-8 relative z-10 bg-slate-800/80 p-4 sm:p-6 rounded-[2rem] border border-slate-600 shadow-xl flex flex-col sm:flex-row justify-between items-center gap-4">
                        <div className="order-2 sm:order-1 text-center sm:text-right w-full sm:w-auto">
                            <span className="block text-sm sm:text-base font-bold text-slate-400 mb-1 font-mono tracking-wider uppercase">
                                الرحلة {questionNumber} / {totalQuestions}
                            </span>
                            <span className="block text-xl sm:text-2xl font-black text-amber-400 drop-shadow-[0_0_10px_rgba(251,191,36,0.3)]">
                                الرحلات الدقيقة: {score} 🚂
                            </span>
                        </div>
                        <div className="order-1 sm:order-2 bg-slate-950 border-2 border-amber-900/50 rounded-2xl px-6 py-3 shadow-inner w-full sm:w-auto text-center">
                            <h2 className="text-lg sm:text-2xl font-black text-amber-100 drop-shadow-md">
                                متى سيصل القطار إلى المحطة الأخيرة؟ ⏱️
                            </h2>
                        </div>
                    </div>

                    {questionData && (
                        <div className="flex flex-col items-center">

                            {/* Visual Scene & Ticket Area */}
                            <div className="w-full flex flex-col md:flex-row items-center justify-between gap-8 mb-12">

                                {/* The Large Train Ticket */}
                                <motion.div
                                    className="relative w-full md:w-1/2 max-w-sm h-64 bg-[#FDE68A] rounded-xl transform md:-rotate-3 shadow-2xl flex border-t-[16px] border-amber-900/90 overflow-hidden"
                                    animate={trainState === 'shaking' ? { rotate: [-5, 0, 5, -2, 2, 0] } : {}}
                                >
                                    {/* Ticket Edge Punches / Perforations left and right */}
                                    <div className="absolute left-0 top-0 bottom-0 w-3 flex flex-col justify-between py-4">
                                        {Array.from({ length: 8 }).map((_, i) => <div key={i} className="w-3 h-3 bg-slate-900 rounded-full transform -translate-x-1.5 opacity-60"></div>)}
                                    </div>
                                    <div className="absolute right-0 top-0 bottom-0 w-3 flex flex-col justify-between py-4">
                                        {Array.from({ length: 8 }).map((_, i) => <div key={i} className="w-3 h-3 bg-slate-900 rounded-full transform translate-x-1.5 opacity-60"></div>)}
                                    </div>

                                    {/* Ticket Content */}
                                    <div className="flex-1 p-6 pl-10 pr-10 border-r-2 border-dashed border-amber-700/30">
                                        <div className="flex justify-between items-center border-b-2 border-amber-800/20 pb-2 mb-4">
                                            <span className="font-serif font-black text-xl text-amber-900 tracking-widest uppercase">تذكرة سفر VIP</span>
                                            <span className="text-2xl">🎫</span>
                                        </div>

                                        <div className="space-y-4 text-amber-950 font-bold">
                                            <div className="flex justify-between items-center bg-amber-100 p-2 rounded-lg border border-amber-200">
                                                <span className="text-slate-600">وقت المغادرة:</span>
                                                <span className="text-2xl font-mono font-black">{formatTime(questionData.departureMinsTotal)}</span>
                                            </div>
                                            <div className="flex justify-between items-center bg-amber-100 p-2 rounded-lg border border-amber-200">
                                                <span className="text-slate-600">مدة الرحلة:</span>
                                                <span className="font-black text-xl">{questionData.durationText}</span>
                                            </div>
                                        </div>

                                        {/* Barcode graphic */}
                                        <div className="absolute bottom-4 left-10 right-10 h-10 flex gap-1 justify-center opacity-70">
                                            {Array.from({ length: 30 }).map((_, i) => (
                                                <div key={i} className="bg-amber-900 h-full" style={{ width: Math.random() * 4 + 1 }}></div>
                                            ))}
                                        </div>
                                    </div>
                                </motion.div>

                                {/* Train Station Scene right side */}
                                <div className="relative w-full md:w-1/2 h-64 border-4 border-slate-700 bg-slate-800 rounded-2xl overflow-hidden shadow-inner">
                                    {/* Tracks */}
                                    <div className="absolute bottom-4 w-full h-8 bg-slate-700">
                                        <div className="w-full h-2 bg-slate-900 absolute top-0"></div>
                                        {/* Ties */}
                                        <div className="absolute inset-0 flex justify-between px-2">
                                            {Array.from({ length: 15 }).map((_, i) => <div key={i} className="w-2 h-full bg-slate-900 transform -skew-x-12"></div>)}
                                        </div>
                                    </div>

                                    {/* Platform roof */}
                                    <div className="absolute top-0 w-full h-16 bg-red-900 flex">
                                        {Array.from({ length: 15 }).map((_, i) => <div key={i} className="flex-1 border-r border-red-950 opacity-30"></div>)}
                                        <div className="absolute bottom-0 w-full h-2 bg-slate-900/50"></div>
                                    </div>

                                    {/* Distant mountains/city shapes */}
                                    <div className="absolute bottom-12 w-full h-32 opacity-20 flex items-end justify-center pointer-events-none">
                                        {Array.from({ length: 5 }).map((_, i) => (
                                            <div key={i} className="bg-slate-400 w-20 rounded-t-xl" style={{ height: Math.random() * 80 + 20, margin: '0 -10px' }}></div>
                                        ))}
                                    </div>

                                    {/* Animated Train Arrival */}
                                    <AnimatePresence>
                                        {(trainState === 'arriving' || trainState === 'shaking') && (
                                            <motion.div
                                                // Assuming we move from right to center visually. Standard x: from large to 0. Right is positive x.
                                                initial={trainState === 'arriving' ? { x: -800 } : { x: 0 }} // Start far left visually in RTL? Wait, standard CSS is LTR inside components unless overwritten. 
                                                // We are in dir="rtl" parent.
                                                // If dir=rtl, negative x moves right. Positive x moves left.
                                                // Let's bring it in from the far right (positive x).
                                                animate={trainState === 'arriving' ? { x: 0 } : trainState === 'shaking' ? { x: [-5, 5, -5, 5, 0] } : {}}
                                                transition={trainState === 'arriving' ? { duration: 1.5, type: 'spring', bounce: 0.2 } : { duration: 0.5 }}
                                                className="absolute bottom-8 right-10" // Put it on tracks
                                            >
                                                <div className="relative text-8xl drop-shadow-[0_10px_20px_rgba(0,0,0,0.8)] filter">
                                                    🚂
                                                    {/* Headlight beam */}
                                                    <div className="absolute top-1/2 left-0 w-[500px] h-32 bg-yellow-100/20 rounded-r-full blur-2xl transform -translate-y-1/2 translate-x-10 origin-left pointer-events-none"></div>
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>

                                    {/* Standard waiting state */}
                                    {trainState === 'idle' && (
                                        <div className="absolute inset-0 flex items-center justify-center opacity-60">
                                            <span className="text-slate-400 font-bold font-mono text-xl animate-pulse">السكة فارغة... 🛤️</span>
                                        </div>
                                    )}
                                </div>

                            </div>

                            {/* Options Buttons (Digital Clocks) */}
                            <div className="w-full grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 relative z-30 px-2 sm:px-8">
                                <AnimatePresence>
                                    {questionData.options.map((option) => {
                                        return (
                                            <motion.button
                                                key={option.id}
                                                whileHover={{ scale: 1.05, y: -5 }}
                                                whileTap={{ scale: 0.95 }}
                                                animate={shakeOptionId === option.id ? { x: [-10, 10, -10, 10, 0] } : {}}
                                                onClick={() => checkAnswer(option)}
                                                disabled={feedback !== null}
                                                className={`
                                                relative h-24 sm:h-32 rounded-[1.5rem] border-[6px] flex flex-col items-center justify-center font-bold transition-all
                                                overflow-hidden group outline-none focus:outline-none bg-slate-900/80 backdrop-blur-md
                                                ${shakeOptionId === option.id
                                                        ? 'border-red-500 shadow-[0_0_30px_#ef4444]'
                                                        : (feedback === 'correct' && option.isCorrect)
                                                            ? 'border-emerald-500 shadow-[0_0_30px_#10b981]'
                                                            : 'border-slate-600 hover:border-amber-400 shadow-[0_10px_20px_rgba(0,0,0,0.5)]'
                                                    }
                                            `}
                                            >

                                                {/* Digital Display bg effect */}
                                                <div className="absolute inset-2 sm:inset-3 bg-black rounded-xl opacity-50 z-0 border border-slate-700"></div>

                                                {/* The option time format */}
                                                <div className="relative z-10 text-4xl sm:text-5xl font-mono font-black tracking-widest text-[#0f0]">
                                                    {/* Make it look like old digital clock LCD */}
                                                    <span className={`inline-block ${shakeOptionId === option.id
                                                            ? 'text-red-500 drop-shadow-[0_0_8px_#ef4444]'
                                                            : (feedback === 'correct' && option.isCorrect)
                                                                ? 'text-emerald-400 drop-shadow-[0_0_8px_#10b981]'
                                                                : 'text-amber-500 drop-shadow-[0_0_8px_#f59e0b]'
                                                        }`}>
                                                        {option.time}
                                                    </span>
                                                </div>

                                                {/* Top gloss */}
                                                <div className="absolute top-0 left-0 right-0 h-1/2 bg-white/5 rounded-t-[1rem] pointer-events-none"></div>

                                            </motion.button>
                                        )
                                    })}
                                </AnimatePresence>
                            </div>

                            {/* Feedback Overlay Message */}
                            <div className="absolute top-[45%] left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full max-w-xl px-4 z-50 pointer-events-none flex justify-center mt-[-30px]">
                                <AnimatePresence mode="wait">
                                    {feedback === 'correct' && (
                                        <motion.div
                                            key="correct"
                                            initial={{ scale: 0.5, opacity: 0, y: 30 }}
                                            animate={{ scale: 1, opacity: 1, y: 0 }}
                                            exit={{ scale: 0.5, opacity: 0, y: -30 }}
                                            className="bg-emerald-950/95 backdrop-blur-lg border-4 border-emerald-500 text-emerald-100 px-6 py-4 rounded-[2.5rem] text-center shadow-[0_0_50px_rgba(16,185,129,0.5)] flex items-center justify-center gap-4"
                                        >
                                            <span className="text-4xl sm:text-5xl drop-shadow-md animate-pulse">🚂</span>
                                            <p className="text-xl sm:text-3xl font-black drop-shadow-sm font-serif">وصل القطار في الوقت المحدد!</p>
                                        </motion.div>
                                    )}

                                    {feedback === 'wrong' && (
                                        <motion.div
                                            key="wrong"
                                            initial={{ scale: 0.8, opacity: 0 }}
                                            animate={{ scale: 1, opacity: 1 }}
                                            exit={{ scale: 0.8, opacity: 0 }}
                                            className="bg-red-950/95 backdrop-blur-lg border-4 border-red-600 text-red-100 px-6 py-4 rounded-[2.5rem] text-center shadow-[0_0_50px_rgba(220,38,38,0.5)] flex flex-col items-center justify-center gap-2"
                                        >
                                            <div className="flex items-center gap-3">
                                                <span className="text-4xl sm:text-5xl drop-shadow-md">⏰</span>
                                                <p className="text-lg sm:text-xl font-black drop-shadow-sm leading-tight max-w-[200px] sm:max-w-none">
                                                    تأكد من حساب الساعات بشكل صحيح!
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
