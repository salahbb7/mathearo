'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Difficulty } from '@/lib/difficulty';
import confetti from 'canvas-confetti';
import { motion, AnimatePresence } from 'framer-motion';

const Candy = ({ isPopping, delay }: { isPopping?: boolean; delay: number }) => {
    return (
        <motion.div
            initial={false}
            animate={isPopping ? { scale: [1, 1.5, 0], opacity: [1, 1, 0] } : { scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, delay: isPopping ? delay : 0 }}
            className="w-10 h-10 sm:w-14 sm:h-14 relative flex items-center justify-center m-1 sm:m-2"
        >
            <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-md overflow-visible">
                {/* Left Wrapper */}
                <path d="M30 50 Q10 20 5 50 Q10 80 30 50" fill="#F472B6" />
                {/* Right Wrapper */}
                <path d="M70 50 Q90 20 95 50 Q90 80 70 50" fill="#A855F7" />
                {/* Candy Body */}
                <circle cx="50" cy="50" r="25" fill="url(#candyGrad)" stroke="#FFFFFF" strokeWidth="2" />
                {/* Swirl / Highlight */}
                <path d="M 35 40 Q 50 25 65 40" fill="none" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" opacity="0.6" />
                <defs>
                    <linearGradient id="candyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#F472B6" />
                        <stop offset="100%" stopColor="#A855F7" />
                    </linearGradient>
                </defs>
            </svg>
        </motion.div>
    );
};

export default function CandyFactoryGamePage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const studentId = searchParams.get('studentId');
    const isTeacher = searchParams.get('teacher') === 'true';
    const difficulty = (searchParams.get('difficulty') || 'medium') as Difficulty;
    // Grid size range: easy 2-4, medium 2-5, hard 2-8
    const maxGrid = difficulty === 'easy' ? 3 : difficulty === 'hard' ? 7 : 4;

    const [gameStarted, setGameStarted] = useState(false);
    const [studentName, setStudentName] = useState('');

    const [grid, setGrid] = useState({ rows: 3, cols: 4 });
    const [options, setOptions] = useState<{ id: string; text: string; isCorrect: boolean }[]>([]);

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
        const r = Math.floor(Math.random() * maxGrid) + 2;
        const c = Math.floor(Math.random() * maxGrid) + 2;

        const correctText = `${r} × ${c} = ${r * c}`;
        const distractors = [
            `${r} + ${c} = ${r + c}`, // Common mistake: adding instead of multiplying
            `${r} × ${c === 5 ? c - 1 : c + 1} = ${r * (c === 5 ? c - 1 : c + 1)}`, // Off by one column
            `${r === 5 ? r - 1 : r + 1} × ${c} = ${c * (r === 5 ? r - 1 : r + 1)}`  // Off by one row
        ];

        // Ensure distractor isn't somehow correct (though logic above prevents it)
        const uniqueDistractors = distractors.filter(d => d !== correctText);

        // Pick 2 distractors
        const selectedDistractors = uniqueDistractors.sort(() => 0.5 - Math.random()).slice(0, 2);

        const possibleAnswers = [
            { id: 'correct', text: correctText, isCorrect: true },
            { id: 'd1', text: selectedDistractors[0], isCorrect: false },
            { id: 'd2', text: selectedDistractors[1], isCorrect: false }
        ];

        // Shuffle options
        for (let i = possibleAnswers.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [possibleAnswers[i], possibleAnswers[j]] = [possibleAnswers[j], possibleAnswers[i]];
        }

        setGrid({ rows: r, cols: c });
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

    const checkAnswer = (option: { id: string; text: string; isCorrect: boolean }) => {
        if (feedback !== null) return;

        if (option.isCorrect) {
            setFeedback('correct');
            setScore(prev => prev + 1);
            playSound(settings.successSoundUrl);

            confetti({
                particleCount: 150,
                spread: 80,
                origin: { y: 0.6 },
                colors: ['#F472B6', '#A855F7', '#38BDF8', '#FDE047'],
                shapes: ['circle'],
            });

            setTimeout(() => {
                nextQuestion(true);
            }, 2500); // 2.5s to allow pop animation to finish
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
                        gameType: 'candy-factory',
                    }),
                });
            }

            router.push(`/results?score=${finalScore}&total=${totalQuestions}&time=${timeSpent}&gameId=candy-factory${studentId ? `&studentId=${studentId}` : ''}`);
        } catch (error) {
            console.error('Error saving score:', error);
            alert('حدث خطأ في حفظ النتيجة');
        }
    };

    if (!gameStarted) {
        return (
            <div className="min-h-screen flex items-center justify-center p-4 bg-fuchsia-50 relative overflow-hidden" dir="rtl">
                {/* Decorative Background */}
                <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 10px 10px, #a855f7 2px, transparent 0)', backgroundSize: '40px 40px' }}></div>

                <div className="max-w-lg w-full relative z-10">
                    <div className="bg-white/95 backdrop-blur-md rounded-3xl shadow-2xl p-8 text-center flex flex-col items-center border-[6px] border-fuchsia-400">
                        <div className="mb-4 text-7xl drop-shadow-lg transform rotate-12 -translate-y-4">
                            🍬
                        </div>
                        <h1 className="text-4xl sm:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-600 to-pink-500 mb-4 tracking-tight">
                            مصنع الحلوى
                        </h1>
                        <p className="text-xl text-slate-700 mb-8 font-bold leading-relaxed">
                            تعلم الضرب بجمع صفوف وأعمدة الحلوى اللذيذة! 👩‍🍳👨‍🍳
                        </p>

                        <div className="mb-6 w-full">
                            <label htmlFor="name" className="block text-slate-700 font-bold mb-2 text-right">
                                اسم العامل في المصنع:
                            </label>
                            <input
                                type="text"
                                id="name"
                                value={studentName}
                                onChange={(e) => setStudentName(e.target.value)}
                                className="w-full px-4 py-3 bg-fuchsia-50 border-2 border-fuchsia-300 rounded-xl focus:border-pink-500 focus:bg-white focus:outline-none transition-all text-slate-800 placeholder-fuchsia-700/50 text-center text-xl font-bold shadow-inner"
                                placeholder="اكتب اسمك هنا"
                                required
                            />
                        </div>

                        <button
                            onClick={startGame}
                            className="w-full bg-gradient-to-r from-fuchsia-500 to-pink-500 hover:from-fuchsia-600 hover:to-pink-600 text-white font-black text-2xl py-4 rounded-xl shadow-[0_6px_0_#9d174d] active:shadow-[0_0px_0_#9d174d] active:translate-y-2 transform transition-all flex items-center justify-center gap-3"
                        >
                            <span>ابدأ العمل</span>
                            <span>⚙️</span>
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-fuchsia-50 relative overflow-hidden" dir="rtl">
            {/* Decorative Background */}
            <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 10px 10px, #a855f7 2px, transparent 0)', backgroundSize: '40px 40px' }}></div>

            {/* Conveyor Belt Element at Bottom */}
            <div className="absolute bottom-0 w-full h-12 bg-gray-800">
                <div className="w-full h-full opacity-30" style={{ backgroundImage: 'repeating-linear-gradient(90deg, #1f2937, #1f2937 20px, #374151 20px, #374151 40px)' }}></div>
                <div className="absolute top-0 w-full h-1 bg-gray-900 border-b border-gray-700"></div>
            </div>

            <div className="max-w-4xl w-full relative z-10 py-10">
                <motion.div
                    animate={shakeScreen ? { x: [-10, 10, -10, 10, 0] } : {}}
                    transition={{ duration: 0.4 }}
                    className="bg-white/95 backdrop-blur-md border-[6px] border-fuchsia-400 rounded-3xl shadow-2xl p-6 sm:p-10"
                >
                    {/* Progress Header */}
                    <div className="mb-4 sm:mb-8">
                        <div className="flex justify-between items-center mb-4 text-center sm:text-right flex-col sm:flex-row gap-4">
                            <div className="order-2 sm:order-1 text-right flex-1 w-full">
                                <span className="block text-lg sm:text-xl font-black text-slate-700 mb-1">
                                    المهمة {questionNumber} من {totalQuestions}
                                </span>
                                <span className="block text-2xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-600 to-pink-500">
                                    الإنتاج: {score} 🌟
                                </span>
                            </div>
                            <div className="order-1 sm:order-2 text-4xl sm:text-5xl drop-shadow bg-fuchsia-100 p-3 rounded-2xl border-2 border-fuchsia-200">
                                🏭
                            </div>
                        </div>
                        <div className="w-full bg-fuchsia-100 rounded-full h-4 shadow-inner overflow-hidden border border-fuchsia-200">
                            <motion.div
                                className="bg-gradient-to-r from-fuchsia-500 to-pink-500 h-full rounded-full relative"
                                initial={{ width: 0 }}
                                animate={{ width: `${(questionNumber / totalQuestions) * 100}%` }}
                                transition={{ duration: 0.5 }}
                            >
                                <div className="absolute inset-0 bg-white/20 animate-[pulse_2s_ease-in-out_infinite]"></div>
                            </motion.div>
                        </div>
                    </div>

                    <div className="text-center mb-6 sm:mb-8">
                        <h2 className="text-2xl sm:text-3xl font-black text-slate-800 drop-shadow-sm leading-tight">
                            كم قطعة حلوى في الصينية؟ <br />
                        </h2>
                        <span className="text-fuchsia-600 text-xl sm:text-2xl mt-3 block font-bold">
                            اختر جملة الضرب الصحيحة!
                        </span>
                    </div>

                    {/* Candies Grid Area (The Tray) */}
                    <div className="flex justify-center items-center mb-8 overflow-x-auto py-2">
                        <motion.div
                            animate={shakeScreen ? { rotate: [-2, 2, -2, 2, 0] } : {}}
                            transition={{ duration: 0.4 }}
                            className="bg-slate-800 p-3 sm:p-6 rounded-[2rem] shadow-[inset_0_-8px_0_rgba(0,0,0,0.5),0_15px_30px_rgba(0,0,0,0.3)] border-4 border-slate-700 relative min-w-[200px]"
                        >
                            {/* Inner tray highlight */}
                            <div className="absolute inset-0 rounded-[1.75rem] border border-slate-600/50 pointer-events-none"></div>

                            <div
                                className="grid gap-1 sm:gap-2 justify-items-center relative z-10"
                                style={{
                                    gridTemplateColumns: `repeat(${grid.cols}, minmax(0, 1fr))`
                                }}
                                dir="ltr"
                            >
                                {Array.from({ length: grid.rows * grid.cols }).map((_, i) => (
                                    <Candy
                                        key={i}
                                        isPopping={feedback === 'correct'}
                                        delay={i * 0.05}
                                    />
                                ))}
                            </div>
                        </motion.div>
                    </div>

                    {/* Options */}
                    <div className="flex flex-col sm:flex-row flex-wrap justify-center gap-3 sm:gap-6 mb-6">
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
                                        flex-1 min-w-[180px] h-16 sm:h-24 rounded-2xl relative
                                        flex items-center justify-center transition-all disabled:opacity-90
                                        shadow-[0_6px_0_rgba(0,0,0,0.15)] active:shadow-[0_0px_0_rgba(0,0,0,0.15)] active:translate-y-2
                                        border-4
                                        ${shakeOptionId === option.id
                                            ? 'bg-red-50 border-red-500 text-red-600'
                                            : (feedback === 'correct' && option.isCorrect)
                                                ? 'bg-green-50 border-green-500 text-green-700'
                                                : 'bg-white hover:bg-fuchsia-50 border-fuchsia-300 text-fuchsia-800 shadow-[0_6px_0_rgba(217,70,239,0.3)] active:shadow-[0_0px_0_rgba(217,70,239,0.3)]'
                                        }
                                    `}
                                >
                                    <span className="text-2xl sm:text-4xl font-extrabold tracking-widest font-mono" dir="ltr">
                                        {option.text}
                                    </span>
                                </motion.button>
                            ))}
                        </AnimatePresence>
                    </div>

                    {/* Feedback Text Area */}
                    <div className="h-16 sm:h-20 flex items-center justify-center mt-4">
                        <AnimatePresence mode="wait">
                            {feedback === 'correct' && (
                                <motion.div
                                    key="correct"
                                    initial={{ scale: 0.5, opacity: 0, y: 20 }}
                                    animate={{ scale: 1, opacity: 1, y: 0 }}
                                    exit={{ scale: 0.5, opacity: 0, y: -20 }}
                                    className="bg-green-100 border-4 border-green-500 text-green-700 px-4 py-2 sm:px-6 sm:py-3 rounded-2xl text-center shadow-lg w-full max-w-lg"
                                >
                                    <p className="text-lg sm:text-2xl font-black">إجابة صحيحة! مصنعك يعمل بامتياز 🍬</p>
                                </motion.div>
                            )}

                            {feedback === 'wrong' && (
                                <motion.div
                                    key="wrong"
                                    initial={{ scale: 0.8, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    exit={{ scale: 0.8, opacity: 0 }}
                                    className="bg-red-100 border-4 border-red-500 text-red-700 px-4 py-2 sm:px-6 sm:py-3 rounded-2xl text-center shadow-lg w-full max-w-lg"
                                >
                                    <p className="text-lg sm:text-2xl font-black">عد الصفوف والأعمدة مرة أخرى!</p>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                </motion.div>
            </div>
        </div>
    );
}
