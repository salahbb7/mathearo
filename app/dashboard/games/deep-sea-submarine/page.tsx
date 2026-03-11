'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Difficulty } from '@/lib/difficulty';
import confetti from 'canvas-confetti';
import { motion, AnimatePresence } from 'framer-motion';

export default function DeepSeaSubmarineGamePage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const studentId = searchParams.get('studentId');
    const isTeacher = searchParams.get('teacher') === 'true';
    const difficulty = (searchParams.get('difficulty') || 'medium') as Difficulty;

    const [gameStarted, setGameStarted] = useState(false);
    const [studentName, setStudentName] = useState('');

    const [questionData, setQuestionData] = useState<{
        wholeNumber: number;
        decimalPart: number; // 1 to 9
        targetValue: number; // e.g. 4.5
        options: { id: string; value: string; isCorrect: boolean }[];
    } | null>(null);

    const [score, setScore] = useState(0);
    const [questionNumber, setQuestionNumber] = useState(0);
    const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
    const [shakeScreen, setShakeScreen] = useState(false);
    const [startTime, setStartTime] = useState<number>(0);

    // Submarine animation state
    const [subState, setSubState] = useState<'diving' | 'stopped' | 'flickering'>('diving');
    const [shakeOptionId, setShakeOptionId] = useState<string | null>(null);
    const [showBubbles, setShowBubbles] = useState(false);

    const [settings, setSettings] = useState({
        successSoundUrl: '', // sonar ping / splash
        errorSoundUrl: '', // error buzzer
        backgroundMusicUrl: '',
    });

    const totalQuestions = 10;
    const MAX_DEPTH = 10;

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
        // Generate whole number from 0 to 9
        const wholeNumber = Math.floor(Math.random() * 10);
        // Generate decimal part from 1 to 9 (so it's clearly between numbers)
        const decimalPart = Math.floor(Math.random() * 9) + 1;
        const targetValue = parseFloat(`${wholeNumber}.${decimalPart}`);

        // Generate distractors
        const generateDistractor = (excluding: string[]) => {
            const types = ['swap', 'wrongDecimal', 'wrongWhole'];
            const type = types[Math.floor(Math.random() * types.length)];
            let distStr = '';

            if (type === 'swap') {
                distStr = `${decimalPart}.${wholeNumber}`;
            } else if (type === 'wrongDecimal') {
                let d = decimalPart;
                while (d === decimalPart) d = Math.floor(Math.random() * 10);
                distStr = `${wholeNumber}.${d}`;
            } else {
                let w = wholeNumber;
                while (w === wholeNumber) w = Math.floor(Math.random() * 10);
                distStr = `${w}.${decimalPart}`;
            }

            // Format to ensure 1 decimal place if it ended up being an integer string
            if (!distStr.includes('.')) distStr += '.0';

            return distStr;
        };

        const targetStr = targetValue.toFixed(1);
        let dist1 = generateDistractor([targetStr]);
        // Simple fallback if dist1 perfectly matches target
        if (dist1 === targetStr) dist1 = `${wholeNumber === 9 ? 8 : wholeNumber + 1}.${decimalPart}`;

        let dist2 = generateDistractor([targetStr, dist1]);
        if (dist2 === targetStr || dist2 === dist1) {
            dist2 = `${wholeNumber > 0 ? wholeNumber - 1 : 1}.${decimalPart === 9 ? 8 : decimalPart + 1}`;
        }

        const opts = [
            { id: 'correct', value: targetStr, isCorrect: true },
            { id: 'd1', value: dist1, isCorrect: false },
            { id: 'd2', value: dist2, isCorrect: false }
        ];

        // Shuffle
        for (let i = opts.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [opts[i], opts[j]] = [opts[j], opts[i]];
        }

        setQuestionData({
            wholeNumber,
            decimalPart,
            targetValue,
            options: opts
        });

        setSubState('diving');
        setShowBubbles(false);
        setShakeOptionId(null);

        // Wait a small moment to let layout render then set state to stopped to trigger animation CSS
        setTimeout(() => setSubState('stopped'), 100);
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

    const checkAnswer = (selectedOpt: { id: string; value: string; isCorrect: boolean }) => {
        if (feedback !== null || !questionData) return;

        if (selectedOpt.isCorrect) {
            setFeedback('correct');
            setScore(prev => prev + 1);
            playSound(settings.successSoundUrl);
            setShowBubbles(true);

            // Celebration (Ocean Bubbles Confetti)
            const duration = 2000;
            const end = Date.now() + duration;

            (function frame() {
                confetti({
                    particleCount: 15,
                    angle: 90,
                    spread: 80,
                    origin: { x: 0.5, y: 0.8 },
                    colors: ['#bae6fd', '#38bdf8', '#e0f2fe', '#ffffff'], // Blue bubbles colors
                    shapes: ['circle'],
                    gravity: -0.8, // Bubbles go UP!
                    scalar: 1.4,
                    ticks: 200
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
            setSubState('flickering'); // Submarine flicker lights
            playSound(settings.errorSoundUrl);

            setTimeout(() => {
                setShakeScreen(false);
                setShakeOptionId(null);
                setFeedback(null);
                setSubState('stopped'); // return to normal state
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
                        gameType: 'deep-sea-submarine', // Match ID
                    }),
                });
            }

            router.push(`/results?score=${finalScore}&total=${totalQuestions}&time=${timeSpent}&gameId=deep-sea-submarine${studentId ? `&studentId=${studentId}` : ''}`);
        } catch (error) {
            console.error('Error saving score:', error);
            alert('حدث خطأ في حفظ النتيجة');
        }
    };


    if (!gameStarted) {
        return (
            <div className="min-h-screen flex items-center justify-center p-4 bg-cyan-950 relative overflow-hidden font-sans" dir="rtl">
                {/* Deep Ocean Background */}
                <div className="absolute inset-0 bg-gradient-to-b from-cyan-800 via-sky-900 to-[#020617] pointer-events-none"></div>

                {/* Underwater Light Shafts */}
                <div className="absolute top-[-50px] left-1/4 w-[200px] h-[120%] bg-cyan-400/10 transform rotate-12 blur-3xl pointer-events-none"></div>
                <div className="absolute top-[-50px] right-1/4 w-[150px] h-[120%] bg-sky-300/10 transform -rotate-12 blur-3xl pointer-events-none"></div>

                {/* Bubbles */}
                <div className="absolute inset-0 pointer-events-none overflow-hidden">
                    {Array.from({ length: 20 }).map((_, i) => (
                        <div key={i} className="absolute rounded-full border border-cyan-100/30"
                            style={{
                                width: Math.random() * 20 + 5 + 'px',
                                height: Math.random() * 20 + 5 + 'px',
                                left: Math.random() * 100 + '%',
                                bottom: -20,
                                animation: `floatUp ${Math.random() * 8 + 4}s linear infinite`,
                                animationDelay: `${Math.random() * 5}s`
                            }}>
                        </div>
                    ))}
                </div>

                <style dangerouslySetInnerHTML={{
                    __html: `
                    @keyframes floatUp {
                        0% { transform: translateY(0) scale(1); opacity: 0; }
                        50% { opacity: 0.5; }
                        100% { transform: translateY(-100vh) scale(1.5); opacity: 0; }
                    }
                `}} />

                <div className="max-w-lg w-full relative z-10">
                    <div className="bg-[#0f172a]/80 backdrop-blur-md rounded-[3rem] shadow-[0_30px_60px_rgba(0,0,0,0.8),inset_0_0_20px_rgba(34,211,238,0.2)] p-8 text-center flex flex-col items-center border-[4px] border-cyan-900 outline outline-4 outline-cyan-500/30 outline-offset-4 overflow-hidden relative">

                        <div className="mb-6 relative z-10 w-32 h-32 bg-cyan-950/50 rounded-full flex items-center justify-center border-4 border-cyan-500/50 shadow-[0_0_30px_rgba(6,182,212,0.5)]">
                            {/* Submarine Icon */}
                            <motion.div
                                className="text-7xl drop-shadow-[0_10px_10px_rgba(0,0,0,0.6)] z-20"
                                animate={{ y: [-5, 5, -5] }}
                                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                            >
                                🚢
                            </motion.div>
                            {/* Radar sweep */}
                            <div className="absolute inset-0 rounded-full border border-cyan-500/20 pointer-events-none overflow-hidden" style={{ clipPath: 'circle(50%)' }}>
                                <motion.div
                                    className="w-[150%] h-[150%] bg-gradient-to-r from-transparent via-cyan-400/40 to-transparent absolute top-[-25%] left-[-25%] origin-center"
                                    animate={{ rotate: 360 }}
                                    transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                                />
                            </div>
                        </div>

                        <h1 className="text-4xl sm:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-b from-cyan-200 to-sky-500 mb-4 tracking-tight drop-shadow-sm font-serif relative z-10">
                            غواصة الأعماق
                        </h1>
                        <p className="text-xl text-cyan-100/80 mb-8 font-bold leading-relaxed relative z-10">
                            راقب مسار الغواصة بدقة واقرأ إحداثيات الأعماق العشرية لتصل للكنز المفقود! ⚓🌊
                        </p>

                        <div className="mb-8 w-full relative z-10">
                            <label htmlFor="name" className="block text-cyan-300 font-bold mb-2 text-right">
                                اسم القبطان:
                            </label>
                            <input
                                type="text"
                                id="name"
                                value={studentName}
                                onChange={(e) => setStudentName(e.target.value)}
                                className="w-full px-4 py-3 bg-slate-900 border-2 border-cyan-700 rounded-xl focus:border-cyan-400 focus:outline-none transition-all text-cyan-100 placeholder-cyan-800/80 text-center text-xl font-bold font-mono shadow-inner"
                                placeholder="اكتب اسمك هنا"
                                required
                            />
                        </div>

                        <button
                            onClick={startGame}
                            className="w-full relative z-10 bg-gradient-to-t from-cyan-700 to-sky-500 hover:from-cyan-600 hover:to-sky-400 text-white font-black text-2xl py-4 rounded-xl shadow-[0_6px_0_#0e7490] active:shadow-[0_0px_0_#0e7490] active:translate-y-2 transform transition-all border-t-2 border-white/20 flex items-center justify-center gap-3 group"
                        >
                            <span>غُص في الأعماق!</span>
                            <span className="group-hover:animate-bounce">⚓</span>
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center p-2 sm:p-4 bg-[#010816] relative overflow-hidden font-sans" dir="rtl">

            {/* Main Ocean Canvas setup */}
            <div className="absolute inset-0 bg-gradient-to-b from-cyan-900 via-[#031d38] to-[#010816] z-0"></div>

            {/* Water surface glints */}
            <div className="absolute top-0 w-full h-8 bg-gradient-to-b from-cyan-200/40 to-transparent z-0"></div>

            {/* Left side rocks/plants for underwater effect */}
            <div className="absolute left-[-50px] bottom-[-20px] text-8xl opacity-30 filter drop-shadow-2xl z-0 pointer-events-none">🪸</div>
            <div className="absolute left-[100px] bottom-10 text-6xl opacity-20 filter drop-shadow-2xl z-0 pointer-events-none">🌿</div>

            <div className="max-w-6xl w-full h-[95vh] relative z-10 py-6 sm:py-8 flex flex-col">

                <motion.div
                    animate={shakeScreen ? { x: [-15, 15, -15, 15, 0], y: [-5, 5, -5, 5, 0] } : {}}
                    transition={{ duration: 0.4 }}
                    className="bg-[#0f172a]/80 backdrop-blur-xl border border-cyan-800/50 rounded-[2rem] shadow-[0_30px_60px_rgba(0,0,0,0.8),inset_0_0_50px_rgba(34,211,238,0.1)] p-4 sm:p-6 relative overflow-hidden flex flex-col flex-1"
                >
                    {/* Header Controls Interface (Dashboard like) */}
                    <div className="mb-6 relative z-10 bg-slate-900/90 p-4 sm:p-5 rounded-[1.5rem] border border-cyan-800/80 shadow-sm flex flex-col sm:flex-row justify-between items-center gap-4">
                        <div className="order-2 sm:order-1 text-center sm:text-right w-full sm:w-auto">
                            <span className="block text-sm sm:text-base font-bold text-cyan-600 mb-1 font-mono tracking-wider uppercase">
                                الإحداثية {questionNumber} / {totalQuestions}
                            </span>
                            <span className="block text-2xl font-black text-cyan-300 drop-shadow-[0_0_8px_rgba(103,232,249,0.5)]">
                                الرصيد: {score} ⚓
                            </span>
                        </div>
                        <div className="order-1 sm:order-2 bg-gradient-to-r from-cyan-950 via-slate-900 to-cyan-950 border-y-2 border-cyan-500/50 rounded-2xl px-6 py-3 shadow-[inset_0_0_10px_rgba(8,145,178,0.5)] w-full sm:w-auto text-center flex-1 mx-4">
                            <h2 className="text-xl sm:text-2xl font-black text-cyan-100 drop-shadow-md">
                                القبطان يسأل: عند أي رقم عشري توقفت الغواصة؟ 📟
                            </h2>
                        </div>
                    </div>

                    {questionData && (
                        <div className="flex flex-col lg:flex-row flex-1 gap-6 items-center lg:items-stretch overflow-hidden">

                            {/* The Options Panel (Left side in RTL) */}
                            <div className="w-full lg:w-1/3 flex flex-col justify-center gap-4 sm:gap-6 relative z-30 order-2 lg:order-1 px-4">
                                <AnimatePresence>
                                    {questionData.options.map((option) => (
                                        <motion.button
                                            key={option.id}
                                            whileHover={{ scale: 1.05 }}
                                            whileTap={{ scale: 0.95 }}
                                            animate={shakeOptionId === option.id ? { x: [-10, 10, -10, 10, 0] } : {}}
                                            onClick={() => checkAnswer(option)}
                                            disabled={feedback !== null || subState === 'diving'}
                                            className={`
                                                relative h-20 sm:h-24 rounded-full border-[3px] flex items-center justify-center font-bold transition-all
                                                overflow-hidden shadow-[0_10px_20px_rgba(0,0,0,0.5)] group
                                                ${shakeOptionId === option.id
                                                    ? 'border-red-500 bg-red-950 text-red-200 shadow-[0_0_30px_#ef4444]'
                                                    : (feedback === 'correct' && option.isCorrect)
                                                        ? 'border-emerald-400 bg-emerald-950 text-emerald-200 shadow-[0_0_30px_#10b981]'
                                                        : 'border-cyan-500 bg-slate-900/80 text-cyan-300 hover:border-cyan-300 hover:bg-slate-800'
                                                }
                                            `}
                                        >

                                            {/* Sonar sweep background effect inside button */}
                                            <div className="absolute inset-0 bg-transparent overflow-hidden rounded-full pointer-events-none opacity-20 group-hover:opacity-40 transition-opacity">
                                                <motion.div
                                                    className={`w-[200%] h-[200%] absolute top-[-50%] left-[-50%] origin-center
                                                        ${feedback === 'correct' && option.isCorrect ? 'bg-gradient-to-r from-transparent via-emerald-400 to-transparent' : shakeOptionId === option.id ? 'bg-gradient-to-r from-transparent via-red-500 to-transparent' : 'bg-gradient-to-r from-transparent via-cyan-400 to-transparent'}
                                                    `}
                                                    animate={{ rotate: 360 }}
                                                    transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                                                />
                                            </div>

                                            {/* Screen Scanlines */}
                                            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/grid-me.png')] opacity-10 mix-blend-overlay pointer-events-none"></div>

                                            <span className="relative z-10 text-4xl sm:text-5xl font-mono font-black tracking-widest drop-shadow-[0_0_8px_rgba(103,232,249,0.8)]">
                                                {option.value}
                                            </span>

                                            {/* Radar Ping dots */}
                                            <div className="absolute left-6 w-3 h-3 rounded-full bg-current opacity-50 shadow-[0_0_10px_currentColor] animate-ping"></div>

                                        </motion.button>
                                    ))}
                                </AnimatePresence>

                                {/* Info graphic below buttons */}
                                <div className="mt-8 text-center bg-cyan-950/40 p-4 rounded-xl border border-cyan-800/50">
                                    <p className="text-cyan-400/80 text-sm font-mono leading-relaxed">
                                        &gt; جهاز السونار متصل.<br />
                                        &gt; بانتظار قراءة إحداثيات العمق بدقة..<br />
                                        &gt; اضغط على القراءة الصحيحة.
                                    </p>
                                </div>
                            </div>

                            {/* The Number Line & Submarine Area (Right side in RTL) */}
                            <div className="w-full lg:w-2/3 h-[400px] lg:h-auto border-[4px] border-slate-700 bg-gradient-to-b from-[#0e7490]/20 to-[#082f49]/60 rounded-3xl relative overflow-hidden order-1 lg:order-2 shadow-inner">

                                {/* Depth Gradients */}
                                <div className="absolute top-0 w-full h-[20%] bg-gradient-to-b from-cyan-400/20 to-transparent pointer-events-none"></div>

                                {/* Vertical Number Line Container - Align Right */}
                                <div className="absolute top-8 bottom-8 right-8 sm:right-16 w-32 flex">

                                    {/* The Line Base */}
                                    <div className="absolute top-0 bottom-0 right-[40px] w-4 bg-cyan-900/50 rounded-full border-x border-cyan-700/50 flex flex-col justify-between py-2">
                                        {/* Tick marks for whole numbers */}
                                        {Array.from({ length: MAX_DEPTH + 1 }).map((_, i) => (
                                            <div key={`whole-${i}`} className="w-8 -mr-2 h-1 bg-cyan-400 rounded-full relative shadow-[0_0_5px_#22d3ee]">
                                                {/* Text label for whole numbers */}
                                                <span className="absolute right-12 top-[-14px] text-2xl font-mono font-black text-cyan-200 drop-shadow-md bg-[#0f172a]/80 px-2 py-0 rounded">
                                                    {i}
                                                </span>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Tick marks for decimals (tenths) */}
                                    <div className="absolute top-0 bottom-0 right-[40px] w-4 flex flex-col justify-between py-2 pointer-events-none">
                                        {Array.from({ length: MAX_DEPTH }).map((_, wholeIdx) => (
                                            <div key={`group-${wholeIdx}`} className="h-full flex flex-col justify-between items-center py-[2px] opacity-60">
                                                {Array.from({ length: 9 }).map((_, decIdx) => (
                                                    <div
                                                        key={`dec-${wholeIdx}-${decIdx}`}
                                                        className={`w-4 h-[2px] bg-cyan-400/80 rounded-full transform translate-x-1 ${decIdx === 4 ? 'w-6 bg-cyan-300' : ''}`}
                                                    ></div>
                                                ))}
                                            </div>
                                        ))}
                                    </div>

                                    {/* Animated Target Depth Highlight indicator (optional, maybe keep it stealthy to make them read) */}
                                    {/* <div className="absolute top-0 w-12 h-1 bg-yellow-400 right-[35px] shadow-[0_0_15px_#facc15] z-0" 
                                        style={{ top: `${(questionData.targetValue / MAX_DEPTH) * 100}%` }}></div> */}
                                </div>

                                {/* Submarine Element */}
                                <motion.div
                                    className="absolute right-[40px] sm:right-[100px] z-20"
                                    initial={{ top: '0%' }}
                                    animate={{
                                        top: subState === 'diving' ? '0%' : `calc(${(questionData.targetValue / MAX_DEPTH) * 100}% - 35px)`, // Center sub on the value visually
                                        x: (subState === 'flickering' || shakeScreen) ? [-5, 5, -5, 5, 0] : 0
                                    }}
                                    transition={subState === 'diving' ? { duration: 0 } : (subState === 'flickering' ? { duration: 0.4 } : { type: 'spring', bounce: 0.2, duration: 2.5 })}
                                >
                                    <div className="relative text-5xl sm:text-7xl drop-shadow-[0_10px_20px_rgba(0,0,0,0.8)] filter">
                                        <motion.div
                                            // Submarine tilt down when diving, level when stopped
                                            animate={{ rotate: subState === 'diving' ? 25 : 0 }}
                                            transition={{ duration: 1 }}
                                        >
                                            🚢
                                        </motion.div>

                                        {/* Headlight beam */}
                                        <motion.div
                                            animate={{ opacity: subState === 'flickering' ? [1, 0, 1, 0, 1] : 1 }}
                                            className="absolute top-1/2 right-[80%] w-[150px] sm:w-[250px] h-20 bg-yellow-100/20 rounded-l-full blur-xl transform -translate-y-1/2 origin-right pointer-events-none"
                                        ></motion.div>

                                        {/* Bubbles emitting from sub */}
                                        {showBubbles && (
                                            <div className="absolute -top-10 left-10 w-10 h-20 overflow-visible z-30 pointer-events-none">
                                                {Array.from({ length: 5 }).map((_, i) => (
                                                    <div
                                                        key={`sub-bubble-${i}`}
                                                        className="absolute w-3 h-3 bg-white/40 border border-cyan-100/60 rounded-full"
                                                        style={{
                                                            left: Math.random() * 20,
                                                            bottom: 0,
                                                            animation: `floatUp ${Math.random() * 2 + 1}s ease-in forwards`,
                                                        }}
                                                    ></div>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {/* Red horizontal line crossing to the number line to precisely show its tip */}
                                    <div className="absolute top-1/2 right-[-20px] sm:right-[-60px] w-[50px] sm:w-[80px] h-[3px] bg-red-500/80 shadow-[0_0_8px_#ef4444] rounded-full z-10 pointer-events-none border-y border-red-300"></div>
                                </motion.div>

                                {/* Depth markers on background left side */}
                                <div className="absolute bottom-4 left-4 text-cyan-800/40 text-8xl font-black font-sans pointer-events-none -rotate-90 origin-bottom-left">
                                    DEPTH: {questionData.targetValue}m
                                </div>

                                {/* School of fish passing by randomly */}
                                <div className="absolute top-1/3 left-10 flex gap-2 opacity-20 hover:opacity-100 pointer-events-none transition-opacity">
                                    <span className="transform -scale-x-100 animate-pulse">🐟</span>
                                    <span className="transform -scale-x-100 translate-y-2 animate-pulse" style={{ animationDelay: '0.2s' }}>🐟</span>
                                    <span className="transform -scale-x-100 -translate-x-4 animate-pulse" style={{ animationDelay: '0.4s' }}>🐟</span>
                                </div>

                            </div>

                        </div>
                    )}
                </motion.div>

                {/* Interactive Feedback Interstitial Overlay */}
                <div className="absolute inset-0 z-50 pointer-events-none flex items-center justify-center">
                    <AnimatePresence mode="wait">
                        {feedback === 'correct' && (
                            <motion.div
                                key="correct"
                                initial={{ scale: 0.5, opacity: 0, y: 30 }}
                                animate={{ scale: 1, opacity: 1, y: 0 }}
                                exit={{ scale: 0.5, opacity: 0, y: -30 }}
                                className="bg-emerald-950/95 backdrop-blur-md border-4 border-emerald-500 text-emerald-100 px-8 py-6 rounded-[2rem] text-center shadow-[0_0_60px_rgba(16,185,129,0.8)] flex items-center justify-center gap-4 pointer-events-auto"
                            >
                                <span className="text-5xl sm:text-6xl drop-shadow-md">⚓</span>
                                <p className="text-2xl sm:text-4xl font-black drop-shadow-sm font-serif">قراءة ممتازة للرادار أيها القبطان!</p>
                            </motion.div>
                        )}

                        {feedback === 'wrong' && (
                            <motion.div
                                key="wrong"
                                initial={{ scale: 0.8, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0.8, opacity: 0 }}
                                className="bg-red-950/95 backdrop-blur-md border-4 border-red-600 text-red-100 px-6 py-4 rounded-[2rem] text-center shadow-[0_0_50px_rgba(185,28,28,0.8)] flex flex-col items-center justify-center gap-2 pointer-events-auto"
                            >
                                <div className="flex items-center gap-3">
                                    <span className="text-4xl sm:text-5xl drop-shadow-md animate-pulse">📡</span>
                                    <p className="text-lg sm:text-xl font-black drop-shadow-sm leading-tight max-w-[250px] sm:max-w-none">
                                        انتبه لإشارات السونار! انظر بين أي رقمين توقفت الغواصة.
                                    </p>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
}
