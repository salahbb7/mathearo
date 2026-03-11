'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Difficulty } from '@/lib/difficulty';
import confetti from 'canvas-confetti';
import { motion, AnimatePresence } from 'framer-motion';

const FRACTIONS = [
    { text: '1/2', num: 1, den: 2 },
    { text: '1/3', num: 1, den: 3 },
    { text: '2/3', num: 2, den: 3 },
    { text: '1/4', num: 1, den: 4 },
    { text: '3/4', num: 3, den: 4 },
];

const PizzaSVG = ({ num, den, isCorrect }: { num: number; den: number; isCorrect: boolean }) => {
    const cx = 100, cy = 100, r = 90;

    const polarToCartesian = (centerX: number, centerY: number, radius: number, angleInDegrees: number) => {
        const angleInRadians = (angleInDegrees - 90) * Math.PI / 180.0;
        return {
            x: centerX + (radius * Math.cos(angleInRadians)),
            y: centerY + (radius * Math.sin(angleInRadians))
        };
    };

    const getPieSlice = (startAngle: number, endAngle: number) => {
        const start = polarToCartesian(cx, cy, r, endAngle);
        const end = polarToCartesian(cx, cy, r, startAngle);
        const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
        if (endAngle - startAngle === 360) {
            // Full circle special case
            return `M ${cx}, ${cy - r} A ${r},${r} 0 1,1 ${cx - 0.01},${cy - r} Z`;
        }
        return [
            "M", cx, cy,
            "L", start.x, start.y,
            "A", r, r, 0, largeArcFlag, 0, end.x, end.y,
            "Z"
        ].join(" ");
    };

    const sliceAngle = 360 / den;
    const slices = [];

    for (let i = 0; i < den; i++) {
        const isVisible = i < num;
        const startAngle = i * sliceAngle;
        const endAngle = (i + 1) * sliceAngle;

        // Pepperoni positions
        const midAngle = startAngle + sliceAngle / 2;
        const pep1 = polarToCartesian(cx, cy, r * 0.4, midAngle - 10);
        const pep2 = polarToCartesian(cx, cy, r * 0.7, midAngle + 15);
        const pep3 = polarToCartesian(cx, cy, r * 0.55, midAngle - 30);

        slices.push(
            <motion.g
                key={i}
                initial={false}
                animate={isCorrect && isVisible ? { scale: [1, 1.05, 1], rotate: [0, 2, -2, 0] } : {}}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                style={{ transformOrigin: '100px 100px' }}
            >
                <path
                    d={getPieSlice(startAngle, endAngle)}
                    fill={isVisible ? "#FBBF24" : "rgba(0,0,0,0.03)"}
                    stroke={isVisible ? "#D97706" : "rgba(0,0,0,0.08)"}
                    strokeWidth={isVisible ? "4" : "2"}
                    strokeDasharray={isVisible ? "0" : "5,5"}
                    strokeLinejoin="round"
                />
                {/* Draw outer crust specifically */}
                {isVisible && (
                    <path
                        d={`M ${polarToCartesian(cx, cy, r, endAngle).x} ${polarToCartesian(cx, cy, r, endAngle).y} A ${r} ${r} 0 ${endAngle - startAngle <= 180 ? '0' : '1'} 0 ${polarToCartesian(cx, cy, r, startAngle).x} ${polarToCartesian(cx, cy, r, startAngle).y}`}
                        fill="none"
                        stroke="#B45309"
                        strokeWidth="12"
                        strokeLinejoin="round"
                        strokeLinecap="round"
                    />
                )}
                {/* Add random pepperonis if visible */}
                {isVisible && (
                    <>
                        <circle cx={pep1.x} cy={pep1.y} r="8" fill="#DC2626" />
                        <circle cx={pep2.x} cy={pep2.y} r="10" fill="#DC2626" />
                        {sliceAngle > 90 && <circle cx={pep3.x} cy={pep3.y} r="7" fill="#DC2626" />}
                    </>
                )}
            </motion.g>
        );
    }

    return (
        <svg width="100%" height="100%" viewBox="0 0 200 200" className="drop-shadow-2xl overflow-visible">
            <defs>
                <radialGradient id="shadow" cx="50%" cy="50%" r="50%">
                    <stop offset="70%" stopColor="rgba(0,0,0,0.2)" />
                    <stop offset="100%" stopColor="rgba(0,0,0,0)" />
                </radialGradient>
            </defs>
            {/* Pizza Shadow */}
            <circle cx="100" cy="105" r="95" fill="url(#shadow)" />

            {/* The Slices */}
            {slices}
        </svg>
    );
};

export default function FractionPizzaGamePage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const studentId = searchParams.get('studentId');
  const isTeacher = searchParams.get('teacher') === 'true';
    const difficulty = (searchParams.get('difficulty') || 'medium') as Difficulty;
    const [gameStarted, setGameStarted] = useState(false);
    const [studentName, setStudentName] = useState('');

    const [targetFraction, setTargetFraction] = useState({ text: '1/2', num: 1, den: 2 });
    const [options, setOptions] = useState<{ id: string; text: string; num: number; den: number }[]>([]);

    const [score, setScore] = useState(0);
    const [questionNumber, setQuestionNumber] = useState(0);
    const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
    const [shakeScreen, setShakeScreen] = useState(false);
    const [startTime, setStartTime] = useState<number>(0);
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
        // Pick random target
        const target = FRACTIONS[Math.floor(Math.random() * FRACTIONS.length)];

        // Pick 2 distractors
        const distractors = FRACTIONS.filter(f => f.text !== target.text);
        const shuffledDistractors = distractors.sort(() => 0.5 - Math.random()).slice(0, 2);

        const possibleAnswers = [target, ...shuffledDistractors].map(opt => ({ ...opt, id: Math.random().toString() }));

        // Shuffle options
        for (let i = possibleAnswers.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [possibleAnswers[i], possibleAnswers[j]] = [possibleAnswers[j], possibleAnswers[i]];
        }

        setTargetFraction(target);
        setOptions(possibleAnswers);
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


    const checkAnswer = (option: { id: string; text: string }) => {
        if (feedback !== null) return;

        if (option.text === targetFraction.text) {
            setFeedback('correct');
            setScore(prev => prev + 1);
            playSound(settings.successSoundUrl);

            confetti({
                particleCount: 120,
                spread: 70,
                origin: { y: 0.6 },
                colors: ['#FBBF24', '#DC2626', '#10B981'],
                shapes: ['circle', 'square'],
            });

            setTimeout(() => {
                nextQuestion(true);
            }, 2000);
        } else {
            setFeedback('wrong');
            setShakeScreen(true);
            setShakeOptionId(option.id);
            playSound(settings.errorSoundUrl);

            setTimeout(() => {
                setShakeScreen(false);
                setShakeOptionId(null);
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
                    gameType: 'fraction-pizza',
                }),
            }); }

            router.push(`/results?score=${finalScore}&total=${totalQuestions}&time=${timeSpent}&gameId=fraction-pizza${studentId ? `&studentId=${studentId}` : ''}`);
        } catch (error) {
            console.error('Error saving score:', error);
            alert('حدث خطأ في حفظ النتيجة');
        }
    };

    if (!gameStarted) {
        return (
            <div className="min-h-screen flex items-center justify-center p-4 bg-amber-50 relative overflow-hidden" dir="rtl">
                {/* Checkered pattern background */}
                <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'repeating-linear-gradient(45deg, #ef4444 25%, transparent 25%, transparent 75%, #ef4444 75%, #ef4444), repeating-linear-gradient(45deg, #ef4444 25%, #fecaca 25%, #fecaca 75%, #ef4444 75%, #ef4444)', backgroundPosition: '0 0, 20px 20px', backgroundSize: '40px 40px' }}></div>

                <div className="max-w-lg w-full relative z-10">
                    <div className="bg-white/95 backdrop-blur-md rounded-3xl shadow-2xl p-8 text-center flex flex-col items-center border-[6px] border-amber-500">
                        <div className="mb-4 text-7xl drop-shadow-lg transform -rotate-12">
                            🍕
                        </div>
                        <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-red-600 to-amber-600 mb-4">
                            بيتزا الكسور
                        </h1>
                        <p className="text-xl text-slate-700 mb-8 font-bold">
                            تعلم الكسور مع شرائح البيتزا اللذيذة! 👩‍🍳
                        </p>

                        <div className="mb-6 w-full">
                            <label htmlFor="name" className="block text-slate-700 font-bold mb-2 text-right">
                                اسم الطاهي:
                            </label>
                            <input
                                type="text"
                                id="name"
                                value={studentName}
                                onChange={(e) => setStudentName(e.target.value)}
                                className="w-full px-4 py-3 bg-amber-50 border-2 border-amber-300 rounded-xl focus:border-red-500 focus:bg-white focus:outline-none transition-all text-slate-800 placeholder-amber-700/50 text-center text-xl font-bold shadow-inner"
                                placeholder="اكتب اسمك هنا"
                                required
                            />
                        </div>

                        <button
                            onClick={startGame}
                            className="w-full bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-black text-2xl py-4 rounded-xl shadow-[0_6px_0_#991b1b] active:shadow-[0_0px_0_#991b1b] active:translate-y-2 transform transition-all"
                        >
                            👩‍🍳 ابدأ الخبز
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-amber-50 relative overflow-hidden" dir="rtl">

            {/* Checkered pattern background */}
            <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'repeating-linear-gradient(45deg, #ef4444 25%, transparent 25%, transparent 75%, #ef4444 75%, #ef4444), repeating-linear-gradient(45deg, #ef4444 25%, #fecaca 25%, #fecaca 75%, #ef4444 75%, #ef4444)', backgroundPosition: '0 0, 20px 20px', backgroundSize: '40px 40px' }}></div>

            <div className="max-w-4xl w-full relative z-10">
                <motion.div
                    animate={shakeScreen ? { x: [-10, 10, -10, 10, 0] } : {}}
                    transition={{ duration: 0.4 }}
                    className="bg-white/95 backdrop-blur-md border-[6px] border-amber-500 rounded-3xl shadow-2xl p-6 sm:p-10"
                >

                    {/* Progress Header */}
                    <div className="mb-8">
                        <div className="flex justify-between items-center mb-4 text-center sm:text-right">
                            <div className="text-4xl sm:text-5xl drop-shadow">🍕</div>
                            <div className="text-right flex-1 px-4">
                                <span className="block text-lg sm:text-xl font-black text-slate-700 mb-1">
                                    الطلب {questionNumber} من {totalQuestions}
                                </span>
                                <span className="block text-2xl font-extrabold text-amber-600">
                                    النقاط: {score} ⭐
                                </span>
                            </div>
                        </div>
                        <div className="w-full bg-red-100 rounded-full h-4 shadow-inner overflow-hidden border border-red-200">
                            <motion.div
                                className="bg-gradient-to-r from-red-500 to-amber-500 h-full rounded-full relative"
                                initial={{ width: 0 }}
                                animate={{ width: `${(questionNumber / totalQuestions) * 100}%` }}
                                transition={{ duration: 0.5 }}
                            >
                                <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
                            </motion.div>
                        </div>
                    </div>

                    <div className="text-center mb-8">
                        <h2 className="text-2xl sm:text-4xl font-black text-slate-800 drop-shadow-sm">
                            ما هو الكسر الذي يمثل الجزء المتبقي من البيتزا؟
                        </h2>
                    </div>

                    {/* Pizza Display Area */}
                    <div className="flex justify-center items-center mb-10 h-64 sm:h-80 relative">
                        <div className="w-64 h-64 sm:w-80 sm:h-80 relative">
                            <PizzaSVG
                                num={targetFraction.num}
                                den={targetFraction.den}
                                isCorrect={feedback === 'correct'}
                            />

                            {/* Yummy Animation Pop-up */}
                            <AnimatePresence>
                                {feedback === 'correct' && (
                                    <motion.div
                                        initial={{ y: 20, opacity: 0, scale: 0.5 }}
                                        animate={{ y: -60, opacity: 1, scale: 1.5, rotate: -10 }}
                                        exit={{ opacity: 0 }}
                                        className="absolute inset-0 flex items-center justify-center pointer-events-none z-20"
                                    >
                                        <span className="text-5xl font-black text-white drop-shadow-[0_4px_4px_rgba(220,38,38,0.8)]" style={{ WebkitTextStroke: '2px #DC2626' }}>
                                            لذيذ! 😋
                                        </span>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>

                    {/* Options */}
                    <div className="flex flex-wrap justify-center gap-4 sm:gap-8 mb-6">
                        <AnimatePresence>
                            {options.map((option) => (
                                <motion.button
                                    key={option.id}
                                    whileHover={{ scale: 1.05, y: -5 }}
                                    whileTap={{ scale: 0.95 }}
                                    animate={shakeOptionId === option.id ? { x: [-10, 10, -10, 10, 0] } : {}}
                                    onClick={() => checkAnswer(option)}
                                    disabled={feedback !== null}
                                    className={`
                    w-28 h-28 sm:w-40 sm:h-40 rounded-3xl relative
                    flex items-center justify-center transition-all disabled:opacity-90
                    shadow-[0_8px_0_rgba(180,83,9,0.3)] active:shadow-[0_0px_0_rgba(180,83,9,0.3)] active:translate-y-2
                    border-4
                    ${shakeOptionId === option.id
                                            ? 'bg-red-100 border-red-500 text-red-600'
                                            : (feedback === 'correct' && option.text === targetFraction.text)
                                                ? 'bg-green-100 border-green-500 text-green-700'
                                                : 'bg-white hover:bg-amber-50 border-amber-400 text-amber-700'
                                        }
                  `}
                                >
                                    <span className="text-5xl sm:text-7xl font-black drop-shadow-sm font-sans" dir="ltr">
                                        {option.text}
                                    </span>
                                </motion.button>
                            ))}
                        </AnimatePresence>
                    </div>

                    {/* Feedback Text Area */}
                    <div className="h-20 flex items-center justify-center">
                        <AnimatePresence mode="wait">
                            {feedback === 'correct' && (
                                <motion.div
                                    key="correct"
                                    initial={{ scale: 0.5, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    exit={{ scale: 0.5, opacity: 0 }}
                                    className="bg-green-100 border-4 border-green-500 text-green-700 px-8 py-4 rounded-2xl text-center shadow-xl w-full max-w-md"
                                >
                                    <p className="text-2xl sm:text-3xl font-black">لذيذ! إجابة صحيحة 🍕</p>
                                </motion.div>
                            )}

                            {feedback === 'wrong' && (
                                <motion.div
                                    key="wrong"
                                    initial={{ scale: 0.8, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    exit={{ scale: 0.8, opacity: 0 }}
                                    className="bg-red-100 border-4 border-red-500 text-red-700 px-8 py-4 rounded-2xl text-center shadow-xl w-full max-w-md"
                                >
                                    <p className="text-2xl sm:text-3xl font-black">حاول مرة أخرى! ❌</p>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                </motion.div>
            </div>
        </div>
    );
}
