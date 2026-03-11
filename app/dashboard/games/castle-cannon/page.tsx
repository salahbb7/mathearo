'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Difficulty } from '@/lib/difficulty';
import confetti from 'canvas-confetti';
import { motion, AnimatePresence } from 'framer-motion';

type AngleType = 'acute' | 'right' | 'obtuse';

interface AngleDef {
    id: AngleType;
    label: string;
    min: number;
    max: number;
    color: string;
}

const ANGLE_TYPES: AngleDef[] = [
    { id: 'acute', label: 'زاوية حادة', min: 15, max: 75, color: 'text-amber-500 border-amber-500 bg-amber-50' },
    { id: 'right', label: 'زاوية قائمة', min: 90, max: 90, color: 'text-blue-500 border-blue-500 bg-blue-50' },
    { id: 'obtuse', label: 'زاوية منفرجة', min: 105, max: 165, color: 'text-purple-500 border-purple-500 bg-purple-50' },
];

export default function CastleCannonGamePage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const studentId = searchParams.get('studentId');
    const isTeacher = searchParams.get('teacher') === 'true';
    const difficulty = (searchParams.get('difficulty') || 'medium') as Difficulty;

    const [gameStarted, setGameStarted] = useState(false);
    const [studentName, setStudentName] = useState('');

    const [questionData, setQuestionData] = useState<{
        angleValue: number;
        angleType: AngleType;
        options: AngleDef[];
    } | null>(null);

    const [score, setScore] = useState(0);
    const [questionNumber, setQuestionNumber] = useState(0);
    const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
    const [shakeScreen, setShakeScreen] = useState(false);
    const [startTime, setStartTime] = useState<number>(0);

    const [cannonState, setCannonState] = useState<'idle' | 'shooting' | 'misfire'>('idle');
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
        const typeObj = ANGLE_TYPES[Math.floor(Math.random() * ANGLE_TYPES.length)];
        let value = typeObj.min;

        if (typeObj.id !== 'right') {
            // Pick a random multiple of 5 between min and max
            const range = (typeObj.max - typeObj.min) / 5;
            value = typeObj.min + Math.floor(Math.random() * (range + 1)) * 5;
        }

        const possibleAnswers = [...ANGLE_TYPES];

        // Shuffle options
        for (let i = possibleAnswers.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [possibleAnswers[i], possibleAnswers[j]] = [possibleAnswers[j], possibleAnswers[i]];
        }

        setQuestionData({
            angleValue: value,
            angleType: typeObj.id,
            options: possibleAnswers,
        });

        setCannonState('idle');
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

    const checkAnswer = (selectedType: AngleType) => {
        if (feedback !== null || !questionData) return;

        if (selectedType === questionData.angleType) {
            setFeedback('correct');
            setScore(prev => prev + 1);
            playSound(settings.successSoundUrl);
            setCannonState('shooting');

            // Cannon Fire Celebration
            const duration = 2000;
            const end = Date.now() + duration;

            (function frame() {
                confetti({
                    particleCount: 10,
                    angle: 120, // Shooting upwards/leftish relative to cannon
                    spread: 60,
                    startVelocity: 60,
                    origin: { x: 0.7, y: 0.5 }, // Positioning around the cannon muzzle
                    colors: ['#fca5a5', '#dc2626', '#fcd34d', '#78716c'],
                    shapes: ['circle', 'square'],
                    gravity: 1.5,
                    scalar: 1.5
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
            setShakeOptionId(selectedType);
            setCannonState('misfire');
            playSound(settings.errorSoundUrl);

            setTimeout(() => {
                setShakeScreen(false);
                setShakeOptionId(null);
                setFeedback(null);
                setCannonState('idle');
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
                        gameType: 'castle-cannon', // Match ID
                    }),
                });
            }

            router.push(`/results?score=${finalScore}&total=${totalQuestions}&time=${timeSpent}&gameId=castle-cannon${studentId ? `&studentId=${studentId}` : ''}`);
        } catch (error) {
            console.error('Error saving score:', error);
            alert('حدث خطأ في حفظ النتيجة');
        }
    };

    // Helper to calculate coordinates for SVG angle arc
    const getAngleCoordinates = (angle: number, radius: number) => {
        const radians = (angle * Math.PI) / 180;
        // SVG y is down, so we subtract to go up
        const x = 50 + radius * Math.cos(radians);
        const y = 80 - radius * Math.sin(radians);
        return { x, y };
    };

    if (!gameStarted) {
        return (
            <div className="min-h-screen flex items-center justify-center p-4 bg-stone-900 relative overflow-hidden font-sans" dir="rtl">
                {/* Castle Wall Background */}
                <div className="absolute inset-0 opacity-40 bg-[url('https://www.transparenttextures.com/patterns/brick-wall-dark.png')] mix-blend-multiply pointer-events-none"></div>

                <div className="max-w-lg w-full relative z-10">
                    <div className="bg-stone-800/95 backdrop-blur-md rounded-[2.5rem] shadow-[0_20px_60px_rgba(0,0,0,0.8)] p-8 text-center flex flex-col items-center border-[8px] border-stone-600 outline outline-4 outline-amber-700/50 outline-offset-4">
                        <div className="mb-4 text-8xl drop-shadow-[0_10px_10px_rgba(0,0,0,0.5)] transform -scale-x-100">
                            💣
                        </div>
                        <h1 className="text-4xl sm:text-5xl font-black text-amber-500 mb-4 tracking-tight drop-shadow-md font-serif">
                            مدفع القلعة
                        </h1>
                        <p className="text-xl text-stone-300 mb-8 font-bold leading-relaxed">
                            حدد الزاوية الصحيحة لإطلاق المدفع بدقة وحماية أسوارنا! 🏰📐
                        </p>

                        <div className="mb-6 w-full">
                            <label htmlFor="name" className="block text-amber-400 font-bold mb-2 text-right">
                                اسم الرامي:
                            </label>
                            <input
                                type="text"
                                id="name"
                                value={studentName}
                                onChange={(e) => setStudentName(e.target.value)}
                                className="w-full px-4 py-3 bg-stone-700 border-2 border-stone-500 rounded-xl focus:border-amber-500 focus:outline-none transition-all text-stone-100 placeholder-stone-400 text-center text-xl font-bold shadow-inner"
                                placeholder="اكتب اسمك هنا"
                                required
                            />
                        </div>

                        <button
                            onClick={startGame}
                            className="w-full bg-gradient-to-t from-red-800 to-red-600 hover:from-red-700 hover:to-red-500 text-amber-100 font-black text-2xl py-4 rounded-xl shadow-[0_6px_0_#7f1d1d] active:shadow-[0_0px_0_#7f1d1d] active:translate-y-2 transform transition-all border-2 border-red-400/50 flex items-center justify-center gap-3"
                        >
                            <span>اشحن المدافع!</span>
                            <span>🔥</span>
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // Determine the end point of the dynamic arm based on the generated angle
    const angleValue = questionData?.angleValue || 0;
    const { x: armEndx, y: armEndy } = getAngleCoordinates(angleValue, 40);

    // Determine path for the arc or square
    let arcPath = '';
    if (angleValue === 90) {
        // Draw a small square for 90 degrees
        // Baseline is y=80. Arm straight up is x=50.
        // Size = 10.
        arcPath = `M 60 80 L 60 70 L 50 70`; // Starts right of center 50, goes up, goes left to center x=50
    } else {
        // Draw an arc
        // End points of the arc
        const { x: arcStartX, y: arcStartY } = getAngleCoordinates(0, 15); // Baseline
        const { x: arcEndX, y: arcEndY } = getAngleCoordinates(angleValue, 15); // Moving arm
        const largeArcFlag = angleValue > 180 ? 1 : 0;
        arcPath = `M ${50 + 15} 80 A 15 15 0 ${largeArcFlag} 0 ${arcEndX} ${arcEndY}`;
    }

    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-sky-900 relative overflow-hidden font-sans" dir="rtl">
            {/* Castle Sky & Clouds Background */}
            <div className="absolute inset-0 bg-gradient-to-b from-sky-900 to-sky-700 z-0"></div>
            <div className="absolute top-10 left-10 w-40 h-10 bg-white/20 rounded-full blur-xl z-0"></div>
            <div className="absolute top-20 right-20 w-60 h-16 bg-white/10 rounded-full blur-2xl z-0"></div>

            {/* Castle Wall */}
            <div className="absolute bottom-0 inset-x-0 h-[45%] bg-stone-700 shadow-[inset_0_20px_50px_rgba(0,0,0,0.5)] z-10 border-t-[10px] border-stone-800">
                <div className="absolute inset-0 opacity-60 bg-[url('https://www.transparenttextures.com/patterns/brick-wall-dark.png')] mix-blend-multiply"></div>
                {/* Crenellations (Merlons) */}
                <div className="absolute -top-12 left-0 w-full flex justify-around">
                    {Array.from({ length: 15 }).map((_, i) => (
                        <div key={i} className="w-12 h-12 bg-stone-700 border-x-4 border-t-8 border-b-0 border-stone-800" style={{ boxShadow: 'inset 0px 5px 10px rgba(0,0,0,0.3)' }}>
                            <div className="w-full h-full opacity-60 bg-[url('https://www.transparenttextures.com/patterns/brick-wall-dark.png')] mix-blend-multiply"></div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="max-w-5xl w-full relative z-20 pt-4 sm:pt-8 pb-10">
                <motion.div
                    animate={shakeScreen ? { x: [-15, 15, -15, 15, 0], y: [-5, 5, -5, 5, 0] } : {}}
                    transition={{ duration: 0.4 }}
                    className="bg-transparent relative"
                >
                    {/* Header Info */}
                    <div className="mb-8 flex justify-between items-start bg-slate-900/80 backdrop-blur-sm p-4 sm:p-6 rounded-[2rem] border-2 border-slate-700 shadow-xl max-w-3xl mx-auto">
                        <div className="text-right">
                            <span className="block text-sm sm:text-base font-bold text-slate-400 mb-1 font-mono tracking-widest uppercase">
                                القذيفة {questionNumber} من {totalQuestions}
                            </span>
                            <span className="block text-xl sm:text-3xl font-black text-amber-400 drop-shadow-md">
                                الأهداف الناجحة: {score} 🎯
                            </span>
                        </div>
                        <div className="bg-red-900/50 border border-red-500/50 px-6 py-3 rounded-2xl">
                            <h2 className="text-xl sm:text-2xl font-black text-amber-100 drop-shadow-md">
                                حدد نوع الزاوية لضبط المدفع! 📏
                            </h2>
                        </div>
                    </div>

                    {questionData && (
                        <div className="flex flex-col items-center">

                            {/* The Cannon and Angle UI */}
                            <div className="relative w-full max-w-2xl h-[350px] sm:h-[400px] flex items-end justify-center mb-8">

                                {/* Base/Mount of cannon */}
                                <div className="absolute bottom-8 right-[20%] w-32 h-20 bg-stone-900 rounded-t-3xl border-4 border-stone-800 shadow-2xl z-30">
                                    <div className="absolute top-4 left-1/2 transform -translate-x-1/2 w-8 h-8 rounded-full bg-stone-700 border-4 border-stone-600 shadow-inner"></div>
                                </div>
                                <div className="absolute bottom-4 right-[15%] w-40 h-8 bg-stone-900 rounded-xl border-4 border-stone-800 shadow-2xl z-40"></div>
                                {/* Wheel */}
                                <div className="absolute bottom-0 right-[22%] w-16 h-16 rounded-full bg-amber-900 border-4 border-stone-900 shadow-2xl z-50 flex items-center justify-center">
                                    <div className="absolute inset-0 opacity-50 bg-[url('https://www.transparenttextures.com/patterns/wood-pattern.png')] rounded-full mix-blend-multiply"></div>
                                    <div className="w-4 h-4 rounded-full bg-stone-800"></div>
                                    {/* Spokes */}
                                    <div className="absolute top-0 bottom-0 left-1/2 transform -translate-x-1/2 w-1 bg-stone-900"></div>
                                    <div className="absolute left-0 right-0 top-1/2 transform -translate-y-1/2 h-1 bg-stone-900"></div>
                                </div>

                                {/* Cannon Barrel */}
                                {/* In RTL, the canonical view has the wall perhaps on the right. If right=20%. Target angle goes from 0 (horizontal right) up to 180 (horizontal left). Since wall is on right, let's have cannon face LEFT.
                                    So instead of standard math angle, standard 0 is left. 
                                    Wait, the angle SVG uses standard coordinate system inside a 100x100 viewBox.
                                */}
                                <motion.div
                                    className="absolute bottom-20 right-[25%] origin-bottom-right z-20"
                                    animate={{
                                        rotate: -questionData.angleValue, // Rotate standard way (negative because CSS rotation is clockwise)
                                    }}
                                    transition={{ duration: 1, type: "spring", bounce: 0.4 }}
                                >
                                    <div className="relative w-48 sm:w-60 h-16 sm:h-20 bg-gradient-to-t from-stone-900 via-stone-700 to-stone-800 rounded-l-full border-4 border-stone-900 shadow-2xl transform translate-x-10 translate-y-8">
                                        <div className="absolute left-0 top-[-4px] bottom-[-4px] w-8 bg-stone-950 rounded-l-full border-y-4 border-l-4 border-stone-900"></div>
                                        {/* Firing smoke animation */}
                                        <AnimatePresence>
                                            {cannonState === 'shooting' && (
                                                <motion.div
                                                    initial={{ opacity: 1, scale: 0 }}
                                                    animate={{ opacity: 0, scale: 3, x: -100 }}
                                                    exit={{ opacity: 0 }}
                                                    transition={{ duration: 0.8 }}
                                                    className="absolute left-[-50px] top-1/2 transform -translate-y-1/2 w-20 h-20 bg-white/80 rounded-full blur-lg"
                                                />
                                            )}
                                            {cannonState === 'misfire' && (
                                                <motion.div
                                                    initial={{ opacity: 0, scale: 0 }}
                                                    animate={{ opacity: 1, scale: 1.5, x: -20, y: -20 }}
                                                    exit={{ opacity: 0 }}
                                                    transition={{ duration: 1 }}
                                                    className="absolute left-[-20px] top-0 w-16 h-16 bg-slate-800/80 rounded-full blur-md"
                                                />
                                            )}
                                        </AnimatePresence>

                                        {/* Cannonball */}
                                        <AnimatePresence>
                                            {cannonState === 'shooting' && (
                                                <motion.div
                                                    initial={{ x: 0 }}
                                                    animate={{ x: -800, y: 100 }} // Simple trajectory
                                                    transition={{ duration: 1.5, ease: "easeOut" }}
                                                    className="absolute left-0 top-1/2 transform -translate-y-1/2 w-10 h-10 bg-black rounded-full shadow-lg"
                                                />
                                            )}
                                        </AnimatePresence>
                                    </div>
                                </motion.div>

                                {/* Math Graphic Overlay for the Angle */}
                                <div className="absolute top-0 right-[20%] w-[300px] h-[300px] z-50 transform -translate-x-[20%] pointer-events-none">
                                    <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-[0_0_5px_rgba(255,255,255,0.8)] filter">
                                        {/* Center is at (50, 80) mapping to right pivot */}
                                        {/* Baseline (horizontal axis representing the ground / 0 degrees) */}
                                        {/* Since cannon is facing left, let's draw arm1 pointing left.
                                            Center: 80, 80. Left arm goes to 20, 80.
                                            Dynamic arm goes up/left based on angle.
                                            If angle=0, arm goes left.
                                            Wait, our standard math was 0=right.
                                            Let's use a standard 50,80 center.
                                            Base arm points left: 50 -> 10.
                                            Actually, let's keep it simple: draw abstract geometry. 
                                        */}
                                        <line x1="50" y1="80" x2="10" y2="80" stroke="#fcd34d" strokeWidth="2.5" strokeDasharray="3,3" />

                                        {/* Dynamic Angle Arm */}
                                        {/* 0 deg = left (180 math). 90 deg = up (90 math). 180 = right (0 math).
                                            Let's just use mathematical visual representation pointing RIGHT as standard, 
                                            and let the user learn the generic shape of the angle regardless of cannon bearing.
                                        */}
                                        <g transform="translate(-10, -30) scale(1.2)">
                                            {/* We will draw the math angle clearly floating above the cannon */}
                                            {/* Box background for clarity */}
                                            <rect x="35" y="35" width="60" height="55" rx="5" fill="rgba(15, 23, 42, 0.6)" stroke="#475569" strokeWidth="1" />

                                            {/* Vertex = 50, 80. Baseline to 90. */}
                                            <line x1="50" y1="80" x2="90" y2="80" stroke="white" strokeWidth="3" strokeLinecap="round" />
                                            {/* Variable arm */}
                                            <line x1="50" y1="80" x2={getAngleCoordinates(questionData.angleValue, 40).x} y2={getAngleCoordinates(questionData.angleValue, 40).y} stroke="white" strokeWidth="3" strokeLinecap="round" />

                                            {/* Arc or square markup */}
                                            <path d={arcPath} fill="none" stroke="#fcd34d" strokeWidth="2" />

                                            {/* Label the angle visibly during debugging? No, hide it! */}
                                        </g>
                                    </svg>
                                </div>

                                {/* Bins / Buttons - we put them visually AT the bottom of the screen instead of here */}
                            </div>

                            {/* Angle Type Buttons */}
                            <div className="w-full max-w-3xl flex flex-col sm:flex-row gap-4 sm:gap-6 relative z-50 px-4">
                                <AnimatePresence>
                                    {questionData.options.map((option) => (
                                        <motion.button
                                            key={option.id}
                                            whileHover={{ scale: 1.05, y: -5 }}
                                            whileTap={{ scale: 0.95 }}
                                            animate={shakeOptionId === option.id ? { x: [-10, 10, -10, 10, 0] } : {}}
                                            onClick={() => checkAnswer(option.id)}
                                            disabled={feedback !== null}
                                            className={`
                                                flex-1 py-8 px-4 rounded-3xl border-[6px] relative overflow-hidden transition-all flex flex-col items-center justify-center
                                                shadow-[0_10px_30px_rgba(0,0,0,0.5)] outline outline-2 outline-black/30 bg-slate-100
                                                ${shakeOptionId === option.id
                                                    ? 'border-red-500 bg-red-100'
                                                    : (feedback === 'correct' && option.id === questionData.angleType)
                                                        ? 'border-green-500 bg-green-100'
                                                        : 'border-slate-400 hover:border-amber-400'
                                                }
                                            `}
                                        >
                                            {/* Wood texture */}
                                            <div className="absolute inset-0 opacity-40 bg-[url('https://www.transparenttextures.com/patterns/wood-pattern.png')] mix-blend-multiply pointer-events-none"></div>

                                            {/* Icon representing the angle visually */}
                                            <div className={`mb-3 w-16 h-16 rounded-full border-4 flex items-center justify-center bg-white ${option.color}`}>
                                                <svg viewBox="0 0 100 100" className="w-10 h-10 stroke-current">
                                                    <line x1="30" y1="70" x2="80" y2="70" strokeWidth="8" strokeLinecap="round" />
                                                    {option.id === 'acute' && <line x1="30" y1="70" x2="60" y2="20" strokeWidth="8" strokeLinecap="round" />}
                                                    {option.id === 'right' && <line x1="30" y1="70" x2="30" y2="20" strokeWidth="8" strokeLinecap="round" />}
                                                    {option.id === 'obtuse' && <line x1="40" y1="70" x2="10" y2="30" strokeWidth="8" strokeLinecap="round" />}
                                                </svg>
                                            </div>

                                            <span className={`text-2xl sm:text-3xl font-black drop-shadow-md z-10 ${option.id === 'acute' ? 'text-amber-800' : option.id === 'right' ? 'text-blue-800' : 'text-purple-800'}`}>
                                                {option.label}
                                            </span>
                                        </motion.button>
                                    ))}
                                </AnimatePresence>
                            </div>

                            {/* Feedback Overlay Message centered */}
                            <div className="absolute top-[40%] left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full max-w-xl px-4 z-50 pointer-events-none">
                                <AnimatePresence mode="wait">
                                    {feedback === 'correct' && (
                                        <motion.div
                                            key="correct"
                                            initial={{ scale: 0.5, opacity: 0, y: 30 }}
                                            animate={{ scale: 1, opacity: 1, y: 0 }}
                                            exit={{ scale: 0.5, opacity: 0, y: -30 }}
                                            className="bg-green-900/95 backdrop-blur-md border-4 border-green-500 text-green-100 px-6 py-4 rounded-[2rem] text-center shadow-[0_0_50px_rgba(34,197,94,0.6)] flex items-center justify-center gap-4"
                                        >
                                            <span className="text-4xl drop-shadow-md">🎯</span>
                                            <p className="text-xl sm:text-3xl font-black drop-shadow-md">إصابة دقيقة!</p>
                                        </motion.div>
                                    )}

                                    {feedback === 'wrong' && (
                                        <motion.div
                                            key="wrong"
                                            initial={{ scale: 0.8, opacity: 0 }}
                                            animate={{ scale: 1, opacity: 1 }}
                                            exit={{ scale: 0.8, opacity: 0 }}
                                            className="bg-red-900/95 backdrop-blur-md border-4 border-red-500 text-red-100 px-6 py-4 rounded-[2rem] text-center shadow-[0_0_50px_rgba(239,68,68,0.6)] flex flex-col items-center justify-center gap-2"
                                        >
                                            <div className="flex items-center gap-4">
                                                <span className="text-4xl drop-shadow-md">💨</span>
                                                <p className="text-xl sm:text-2xl font-black drop-shadow-md">الزاوية غير صحيحة، ركز أكثر!</p>
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
