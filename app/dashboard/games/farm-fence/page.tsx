'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Difficulty } from '@/lib/difficulty';
import confetti from 'canvas-confetti';
import { motion, AnimatePresence } from 'framer-motion';

export default function FarmFenceGamePage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const studentId = searchParams.get('studentId');
    const isTeacher = searchParams.get('teacher') === 'true';
    const difficulty = (searchParams.get('difficulty') || 'medium') as Difficulty;
    // Length range: easy 3-7, medium 3-10, hard 3-15
    const maxLength = difficulty === 'easy' ? 7 : difficulty === 'hard' ? 15 : 10;

    const [gameStarted, setGameStarted] = useState(false);
    const [studentName, setStudentName] = useState('');

    const [questionData, setQuestionData] = useState<{
        length: number;
        width: number;
        perimeter: number;
        options: { id: string; value: number; isCorrect: boolean }[];
    } | null>(null);

    const [score, setScore] = useState(0);
    const [questionNumber, setQuestionNumber] = useState(0);
    const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
    const [shakeScreen, setShakeScreen] = useState(false);
    const [startTime, setStartTime] = useState<number>(0);
    const [shakeOptionId, setShakeOptionId] = useState<string | null>(null);

    // Animation state
    const [showFence, setShowFence] = useState(false);
    const [fenceBroken, setFenceBroken] = useState(false);

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
        const length = Math.floor(Math.random() * (maxLength - 2)) + 3;
        // Usually rectangle, sometimes square
        const width = Math.random() > 0.8 ? length : Math.floor(Math.random() * (maxLength - 2)) + 2;

        const perimeter = (length + width) * 2;
        const area = length * width; // Area for distractor
        const halfPerimeter = length + width; // Only adding 2 sides distractor

        const distractors = [
            area,
            halfPerimeter,
            perimeter + 2,
            perimeter - 2,
            area + 2
        ];

        const uniqueDistractors = [...new Set(distractors)].filter(d => d !== perimeter && d > 0);
        const selectedDistractors = uniqueDistractors.sort(() => 0.5 - Math.random()).slice(0, 2);

        const possibleAnswers = [
            { id: 'correct', value: perimeter, isCorrect: true },
            { id: 'd1', value: selectedDistractors[0], isCorrect: false },
            { id: 'd2', value: selectedDistractors[1], isCorrect: false }
        ];

        // Shuffle options
        for (let i = possibleAnswers.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [possibleAnswers[i], possibleAnswers[j]] = [possibleAnswers[j], possibleAnswers[i]];
        }

        setQuestionData({
            length,
            width,
            perimeter,
            options: possibleAnswers,
        });

        setShowFence(false);
        setFenceBroken(false);
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
            setShowFence(true); // Animate fence building

            // Celebration
            const duration = 2500;
            const end = Date.now() + duration;

            (function frame() {
                confetti({
                    particleCount: 5,
                    angle: 60,
                    spread: 55,
                    origin: { x: 0 },
                    colors: ['#4ADE80', '#22C55E', '#16A34A'],
                    shapes: ['square'],
                });
                confetti({
                    particleCount: 5,
                    angle: 120,
                    spread: 55,
                    origin: { x: 1 },
                    colors: ['#4ADE80', '#22C55E', '#16A34A'],
                    shapes: ['square'],
                });

                if (Date.now() < end) {
                    requestAnimationFrame(frame);
                }
            }());

            setTimeout(() => {
                nextQuestion(true);
            }, 3500);
        } else {
            setFeedback('wrong');
            setShakeScreen(true);
            setShakeOptionId(option.id);
            setFenceBroken(true);
            playSound(settings.errorSoundUrl);

            setTimeout(() => {
                setShakeScreen(false);
                setShakeOptionId(null);
                setFenceBroken(false);
                setFeedback(null);
            }, 2000); // give time to read explanation
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
                        gameType: 'farm-fence',
                    }),
                });
            }

            router.push(`/results?score=${finalScore}&total=${totalQuestions}&time=${timeSpent}&gameId=farm-fence${studentId ? `&studentId=${studentId}` : ''}`);
        } catch (error) {
            console.error('Error saving score:', error);
            alert('حدث خطأ في حفظ النتيجة');
        }
    };

    // Helper to format number
    const formatNumber = (num: number) => {
        return num.toLocaleString('en-US');
    };

    if (!gameStarted) {
        return (
            <div className="min-h-screen flex items-center justify-center p-4 bg-green-50 relative overflow-hidden font-sans" dir="rtl">
                {/* Grass Background */}
                <div className="absolute inset-0 opacity-30 bg-[url('https://www.transparenttextures.com/patterns/cartographer.png')] mix-blend-multiply pointer-events-none"></div>

                <div className="max-w-lg w-full relative z-10">
                    <div className="bg-lime-50/90 backdrop-blur-md rounded-3xl shadow-[0_20px_60px_rgba(0,0,0,0.2)] p-8 text-center flex flex-col items-center border-[8px] border-green-600 outline outline-4 outline-green-800/20 outline-offset-4">
                        <div className="mb-4 text-8xl drop-shadow-xl">
                            🚜
                        </div>
                        <h1 className="text-4xl sm:text-5xl font-black text-green-800 mb-4 tracking-tight drop-shadow-sm">
                            سياج المزرعة
                        </h1>
                        <p className="text-xl text-green-700 mb-8 font-bold leading-relaxed">
                            ساعد المزارع في حساب محيط الحقل لبناء السياج المثالي للحيوانات! 🐑
                        </p>

                        <div className="mb-6 w-full">
                            <label htmlFor="name" className="block text-green-800 font-bold mb-2 text-right">
                                اسم المزارع الذكي:
                            </label>
                            <input
                                type="text"
                                id="name"
                                value={studentName}
                                onChange={(e) => setStudentName(e.target.value)}
                                className="w-full px-4 py-3 bg-white border-2 border-green-300 rounded-xl focus:border-green-600 focus:outline-none transition-all text-green-900 placeholder-green-400 text-center text-xl font-bold shadow-inner"
                                placeholder="اكتب اسمك هنا"
                                required
                            />
                        </div>

                        <button
                            onClick={startGame}
                            className="w-full bg-gradient-to-b from-green-600 to-green-800 hover:from-green-500 hover:to-green-700 text-white font-black text-2xl py-4 rounded-xl shadow-[0_6px_0_#14532d] active:shadow-[0_0px_0_#14532d] active:translate-y-2 transform transition-all border-2 border-green-900 flex items-center justify-center gap-3"
                        >
                            <span>هيا إلى المزرعة!</span>
                            <span>🌻</span>
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-sky-200 relative overflow-hidden" dir="rtl">
            {/* Sky Clouds Background */}
            <div className="absolute inset-0 opacity-40 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] pointer-events-none"></div>

            {/* Farm Land Shape at bottom */}
            <div className="absolute bottom-0 w-full h-[40%] bg-emerald-500 rounded-t-[50%] shadow-[inset_0_15px_40px_rgba(6,78,59,0.3)]"></div>

            <div className="max-w-5xl w-full relative z-10 py-10">
                <motion.div
                    animate={shakeScreen ? { x: [-10, 10, -10, 10, 0] } : {}}
                    transition={{ duration: 0.4 }}
                    className="bg-white/95 backdrop-blur-md border-[6px] border-emerald-600 rounded-[2.5rem] shadow-[0_20px_60px_rgba(0,0,0,0.2)] p-6 sm:p-10 relative"
                >
                    {/* Progress Header */}
                    <div className="mb-6 sm:mb-8">
                        <div className="flex justify-between items-center mb-4 text-center sm:text-right flex-col sm:flex-row gap-4">
                            <div className="order-2 sm:order-1 text-right flex-1 w-full">
                                <span className="block text-lg sm:text-lg font-bold text-emerald-700 mb-1">
                                    الحقل {questionNumber} من {totalQuestions}
                                </span>
                                <span className="block text-2xl font-black text-emerald-600">
                                    النجاحات: {score} 🌟
                                </span>
                            </div>
                            <div className="order-1 sm:order-2 text-4xl sm:text-5xl drop-shadow bg-lime-100 p-4 rounded-3xl border-2 border-lime-300">
                                👨‍🌾
                            </div>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden border border-slate-200">
                            <motion.div
                                className="bg-gradient-to-r from-lime-400 to-green-500 h-full rounded-full relative"
                                initial={{ width: 0 }}
                                animate={{ width: `${(questionNumber / totalQuestions) * 100}%` }}
                                transition={{ duration: 0.5 }}
                            >
                                <div className="absolute inset-0 bg-white/20 animate-[pulse_2s_ease-in-out_infinite]"></div>
                            </motion.div>
                        </div>
                    </div>

                    {questionData && (
                        <>
                            <div className="text-center mb-8">
                                <h2 className="text-2xl sm:text-3xl font-black text-emerald-900 leading-tight mb-3">
                                    كم متراً من الخشب نحتاج لبناء سياج يحيط بالمزرعة كاملة؟
                                </h2>
                                <span className="text-emerald-700 text-xl block font-bold mt-2">
                                    تلميح: المحيط يعبر عن المسافة الخارجية حول الشكل!
                                </span>
                            </div>

                            {/* Farm Area (Rectangle / Square) */}
                            <div className="flex justify-center items-center mb-10 py-8">
                                <div className="relative flex items-center justify-center p-8">

                                    {/* Dimensions Labels */}
                                    <div className="absolute -top-10 flex flex-col items-center">
                                        <span className="text-lg text-emerald-800 font-bold mb-1">الطول</span>
                                        <span className="bg-white border-2 border-emerald-400 text-emerald-700 font-black text-2xl py-1 px-4 rounded-xl shadow-sm" dir="ltr">{formatNumber(questionData.length)} م</span>
                                    </div>
                                    <div className="absolute -right-6 flex flex-col items-center">
                                        <span className="bg-white border-2 border-emerald-400 text-emerald-700 font-black text-2xl py-1 px-4 rounded-xl shadow-sm" dir="ltr">{formatNumber(questionData.width)} م</span>
                                        <span className="text-lg text-emerald-800 font-bold mt-1">العرض</span>
                                    </div>

                                    {/* Grass Area */}
                                    <motion.div
                                        className="bg-lime-400/80 border-4 border-lime-600 rounded-xl relative shadow-inner overflow-hidden flex items-center justify-center min-w-[200px]"
                                        style={{
                                            width: `${Math.max(200, questionData.length * 30)}px`,
                                            height: `${Math.max(150, questionData.width * 30)}px`,
                                            backgroundImage: "url('https://www.transparenttextures.com/patterns/cartographer.png')"
                                        }}
                                        animate={fenceBroken ? { rotate: [-2, 2, -2, 2, 0] } : {}}
                                        transition={{ duration: 0.4 }}
                                    >
                                        {/* Cute Sheep */}
                                        <div className="text-6xl drop-shadow-md relative z-10">
                                            🐑
                                        </div>
                                        {questionData.length * questionData.width > 30 && (
                                            <div className="text-5xl drop-shadow-md absolute top-4 left-4 z-10 opacity-80 scale-x-[-1]">
                                                🐑
                                            </div>
                                        )}
                                        {questionData.length * questionData.width > 50 && (
                                            <div className="text-5xl drop-shadow-md absolute bottom-4 right-4 z-10 opacity-70">
                                                🐑
                                            </div>
                                        )}

                                        {/* Wooden Fence Built Container Overlay */}
                                        <AnimatePresence>
                                            {(showFence || fenceBroken) && (
                                                <motion.div
                                                    initial={{ opacity: 0 }}
                                                    animate={{ opacity: 1 }}
                                                    exit={{ opacity: 0 }}
                                                    className={`absolute inset-0 outline-8 outline-offset-[-4px] ${fenceBroken ? 'outline-red-500/50 outline-dashed' : 'outline-amber-800 outline-double'} rounded-xl z-20 pointer-events-none`}
                                                    style={{ border: showFence ? '8px solid #92400e' : fenceBroken ? '4px dashed #ef4444' : 'none' }}
                                                />
                                            )}
                                        </AnimatePresence>
                                    </motion.div>

                                </div>
                            </div>

                            {/* Answer Buttons (Wooden Fence Planks) */}
                            <div className="bg-emerald-50 p-6 sm:p-8 rounded-[2rem] shadow-inner border-t-[12px] border-emerald-100 max-w-4xl mx-auto relative overflow-hidden">
                                <h3 className="text-emerald-800 text-center font-bold mb-6 text-xl">اختر طول السياج المناسب لإحاطة المزرعة:</h3>

                                <div className="flex flex-col sm:flex-row flex-wrap justify-center gap-4 sm:gap-6 w-full" dir="ltr">
                                    <AnimatePresence>
                                        {questionData.options.map((option) => (
                                            <motion.button
                                                key={option.id}
                                                whileHover={{ scale: 1.05, y: -5 }}
                                                whileTap={{ scale: 0.95 }}
                                                animate={shakeOptionId === option.id ? { x: [-10, 10, -10, 10, 0] } : {}}
                                                onClick={() => checkAnswer(option)}
                                                disabled={feedback !== null}
                                                className={`
                                                    flex-1 min-w-[140px] h-20 sm:h-24 rounded-tl-xl rounded-tr-xl rounded-b-md relative
                                                    flex items-center justify-center transition-all disabled:opacity-90 outline outline-2 outline-black/10
                                                    ${shakeOptionId === option.id
                                                        ? 'bg-red-600 text-white shadow-[0_8px_0_#7f1d1d]'
                                                        : (feedback === 'correct' && option.isCorrect)
                                                            ? 'bg-green-600 text-white shadow-[0_8px_0_#14532d]'
                                                            : 'bg-amber-600 hover:bg-amber-500 text-amber-50 shadow-[0_8px_0_#78350f]'
                                                    }
                                                `}
                                                style={{ backgroundImage: "url('https://www.transparenttextures.com/patterns/wood-pattern.png')", backgroundBlendMode: 'overlay' }}
                                            >
                                                {/* Planks styling */}
                                                <div className="absolute inset-y-0 left-4 w-1 bg-black/10"></div>
                                                <div className="absolute inset-y-0 right-4 w-1 bg-black/10"></div>
                                                <div className="absolute top-4 inset-x-0 h-1 bg-black/10"></div>
                                                <div className="absolute bottom-4 inset-x-0 h-1 bg-black/10"></div>

                                                <span className="text-4xl sm:text-5xl font-black tracking-tight drop-shadow-[0_2px_2px_rgba(0,0,0,0.5)] font-mono z-10" dir="ltr">
                                                    {formatNumber(option.value)}
                                                </span>
                                            </motion.button>
                                        ))}
                                    </AnimatePresence>
                                </div>
                            </div>

                            {/* Feedback Overlay Message */}
                            <div className="h-16 sm:h-24 flex items-center justify-center mt-6">
                                <AnimatePresence mode="wait">
                                    {feedback === 'correct' && (
                                        <motion.div
                                            key="correct"
                                            initial={{ scale: 0.5, opacity: 0, y: 30 }}
                                            animate={{ scale: 1, opacity: 1, y: 0 }}
                                            exit={{ scale: 0.5, opacity: 0, y: -30 }}
                                            className="bg-green-100 border-4 border-green-500 text-green-800 px-6 py-4 rounded-[2rem] text-center shadow-xl w-full max-w-xl flex items-center justify-center gap-4 z-30"
                                        >
                                            <span className="text-4xl">🚧</span>
                                            <p className="text-xl sm:text-2xl font-black">المزرعة آمنة الآن! 🚜</p>
                                        </motion.div>
                                    )}

                                    {feedback === 'wrong' && (
                                        <motion.div
                                            key="wrong"
                                            initial={{ scale: 0.8, opacity: 0 }}
                                            animate={{ scale: 1, opacity: 1 }}
                                            exit={{ scale: 0.8, opacity: 0 }}
                                            className="bg-red-100 border-4 border-red-500 text-red-800 px-6 py-4 rounded-[2rem] text-center shadow-xl w-full max-w-xl flex items-center justify-center gap-4 z-30"
                                        >
                                            <span className="text-4xl">⚠️</span>
                                            <p className="text-xl sm:text-2xl font-black">السياج غير مكتمل، احسب جميع الأضلاع!</p>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </>
                    )}
                </motion.div>
            </div>
        </div>
    );
}
