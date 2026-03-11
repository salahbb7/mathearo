'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Difficulty } from '@/lib/difficulty';
import confetti from 'canvas-confetti';
import { motion, AnimatePresence } from 'framer-motion';

export default function RoundingCoasterGamePage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const studentId = searchParams.get('studentId');
  const isTeacher = searchParams.get('teacher') === 'true';
    const difficulty = (searchParams.get('difficulty') || 'medium') as Difficulty;
    const [gameStarted, setGameStarted] = useState(false);
    const [studentName, setStudentName] = useState('');

    type QuestionData = {
        targetNumber: number;
        lowerBound: number;
        higherBound: number;
        correctAnswer: number;
        typeText: string;
    };

    const [questionData, setQuestionData] = useState<QuestionData | null>(null);
    const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);

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
        setFeedback(null);
        setSelectedAnswer(null);

        // Mode range scales with difficulty: easy=10 only, medium=10&100, hard=all
        const modeCount = difficulty === 'easy' ? 1 : difficulty === 'hard' ? 3 : 2;
        const mode = Math.floor(Math.random() * modeCount); // 0: 10, 1: 100, 2: 1000
        let target = 0;
        let factor = 10;
        let typeText = 'أقرب عشرة';

        if (mode === 0) {
            factor = 10;
            typeText = 'أقرب عشرة';
            do { target = Math.floor(Math.random() * 89) + 11; } while (target % factor === 0);
        } else if (mode === 1) {
            factor = 100;
            typeText = 'أقرب مئة';
            do { target = Math.floor(Math.random() * 899) + 101; } while (target % factor === 0);
        } else {
            factor = 1000;
            typeText = 'أقرب ألف';
            do { target = Math.floor(Math.random() * 8999) + 1001; } while (target % factor === 0);
        }

        const lowerBound = Math.floor(target / factor) * factor;
        const higherBound = lowerBound + factor;
        const correctAnswer = Math.round(target / factor) * factor;

        setQuestionData({
            targetNumber: target,
            lowerBound,
            higherBound,
            correctAnswer,
            typeText
        });
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


    const checkAnswer = (selectedOpt: number) => {
        if (feedback !== null || !questionData) return;

        setSelectedAnswer(selectedOpt);

        if (selectedOpt === questionData.correctAnswer) {
            setFeedback('correct');
            setScore(prev => prev + 1);
            playSound(settings.successSoundUrl);

            confetti({
                particleCount: 150,
                spread: 80,
                origin: { y: 0.6 },
                colors: ['#0ea5e9', '#38bdf8', '#bae6fd', '#0284c7'],
            });

            setTimeout(() => {
                nextQuestion(true);
            }, 3000);
        } else {
            setFeedback('wrong');
            setShake(true);
            playSound(settings.errorSoundUrl);

            setTimeout(() => {
                setFeedback(null);
                setSelectedAnswer(null);
                setShake(false);
            }, 1500);
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
            if (!isTeacher) { await fetch('/api/scores', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    studentName: studentName || 'Student',
                    studentId: studentId || undefined,
                    score: finalScore,
                    totalQuestions,
                    timeSpent,
                    gameType: 'rounding-coaster',
                }),
            }); }

            router.push(`/results?score=${finalScore}&total=${totalQuestions}&time=${timeSpent}&gameId=rounding-coaster${studentId ? `&studentId=${studentId}` : ''}`);
        } catch (error) {
            console.error('Error saving score:', error);
            alert('حدث خطأ في حفظ النتيجة');
        }
    };

    if (!gameStarted) {
        return (
            <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-b from-sky-300 to-indigo-400 relative overflow-hidden" dir="rtl">
                {/* Background Decorations */}
                <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/arches.png')] mix-blend-overlay"></div>
                <div className="absolute top-10 left-10 text-6xl opacity-30 transform -rotate-12">🎢</div>
                <div className="absolute bottom-32 right-20 text-7xl opacity-30 transform rotate-12">🚂</div>
                <div className="absolute top-40 right-10 text-5xl opacity-30">☁️</div>
                <div className="absolute bottom-20 left-20 text-6xl opacity-30">🏔️</div>

                <div className="max-w-lg w-full relative z-10">
                    <div className="bg-white/95 backdrop-blur-md rounded-3xl shadow-[0_20px_60px_rgba(0,0,0,0.5)] p-8 text-center flex flex-col items-center border-[5px] border-sky-500">
                        <div className="mb-4 text-8xl drop-shadow-[0_0_15px_rgba(14,165,233,0.5)]">
                            🎢
                        </div>
                        <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-sky-600 to-indigo-600 mb-4 drop-shadow-sm">
                            قطار التقريب السريع
                        </h1>
                        <p className="text-xl text-sky-900 mb-8 font-bold">
                            اركب القطار وتعلم تقريب الأرقام بطريقة ممتعة! 🚂💨
                        </p>

                        <div className="mb-6 w-full">
                            <label htmlFor="name" className="block text-sky-800 font-bold mb-2 text-right text-lg">
                                ما اسمك أيها السائق البطل؟
                            </label>
                            <input
                                type="text"
                                id="name"
                                value={studentName}
                                onChange={(e) => setStudentName(e.target.value)}
                                className="w-full px-4 py-4 bg-sky-50 border-2 border-sky-300 rounded-xl focus:border-sky-500 focus:outline-none transition-all text-sky-900 placeholder-sky-400/80 text-center text-xl font-black shadow-inner"
                                placeholder="اكتب اسمك هنا"
                                required
                            />
                        </div>

                        <button
                            onClick={startGame}
                            className="w-full bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-black text-2xl py-5 rounded-xl shadow-[0_6px_0_#1e3a8a] active:shadow-[0_0px_0_#1e3a8a] active:translate-y-2 transform transition-all border border-sky-300/50"
                        >
                            انطلق بالقطار 🚂
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex flex-col items-center justify-start pt-24 sm:pt-28 pb-8 px-4 sm:px-8 bg-gradient-to-b from-cyan-300 via-sky-400 to-indigo-500 relative overflow-hidden" dir="rtl">

            {/* Background elements */}
            <div className="absolute top-10 left-10 text-6xl opacity-40">☁️</div>
            <div className="absolute top-24 right-20 text-7xl opacity-40">☁️</div>
            <div className="absolute top-48 left-1/4 text-5xl opacity-40">☀️</div>

            {/* Mountains in background */}
            <div className="absolute bottom-0 left-0 right-0 h-64 flex justify-between items-end opacity-20 pointer-events-none z-0">
                <div className="w-0 h-0 border-l-[300px] border-l-transparent border-b-[400px] border-b-slate-800 border-r-[300px] border-r-transparent -ml-32"></div>
                <div className="w-0 h-0 border-l-[400px] border-l-transparent border-b-[500px] border-b-slate-900 border-r-[400px] border-r-transparent"></div>
                <div className="w-0 h-0 border-l-[250px] border-l-transparent border-b-[350px] border-b-slate-700 border-r-[250px] border-r-transparent -mr-20"></div>
            </div>

            {/* HUD */}
            <div className="fixed top-6 left-0 w-full px-6 flex justify-between items-start z-30 pointer-events-none">
                <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-4 border-4 border-sky-300 shadow-xl flex flex-col pointer-events-auto">
                    <span className="text-2xl font-black text-sky-800">المحطة {questionNumber}/{totalQuestions}</span>
                    <span className="text-xl font-bold text-sky-600">النقاط: {score} 🏆</span>
                </div>
            </div>

            {questionData && (
                <>
                    {/* Question Title Header */}
                    <motion.div
                        initial={{ y: -50, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        className="mb-8 z-20 w-full max-w-4xl pt-8"
                    >
                        <div className="bg-indigo-900/80 backdrop-blur-md rounded-3xl p-6 sm:px-12 shadow-[0_10px_30px_rgba(0,0,0,0.4)] border-4 border-indigo-400/50 text-center">
                            <h2 className="text-2xl sm:text-4xl font-black text-white drop-shadow-lg leading-tight">
                                قرّب العدد <span className="text-amber-400 text-5xl inline-block mx-2">{questionData.targetNumber}</span> لـ {questionData.typeText}
                                <br />
                                <span className="text-sky-300 text-xl sm:text-2xl mt-2 block">إلى أين سيتجه القطار؟</span>
                            </h2>
                        </div>
                    </motion.div>

                    {/* Rollercoaster Area */}
                    <div className="w-full max-w-5xl flex flex-col items-center justify-center relative mt-16 sm:mt-24 z-10 h-64 sm:h-80">

                        {/* Track SVG */}
                        <svg className="absolute w-[90%] sm:w-[800px] h-[300px] top-10 pointer-events-none" viewBox="0 0 800 300" preserveAspectRatio="none">
                            {/* Track Supports */}
                            <line x1="100" y1="200" x2="100" y2="300" stroke="#334155" strokeWidth="8" />
                            <line x1="700" y1="200" x2="700" y2="300" stroke="#334155" strokeWidth="8" />
                            <line x1="400" y1="50" x2="400" y2="300" stroke="#334155" strokeWidth="8" />
                            <line x1="250" y1="120" x2="250" y2="300" stroke="#334155" strokeWidth="6" opacity="0.6" />
                            <line x1="550" y1="120" x2="550" y2="300" stroke="#334155" strokeWidth="6" opacity="0.6" />

                            {/* Main Track Arc */}
                            <path d="M 50,200 Q 400,-100 750,200" fill="none" stroke="#64748b" strokeWidth="24" strokeLinecap="round" />
                            <path d="M 50,200 Q 400,-100 750,200" fill="none" stroke="#94a3b8" strokeWidth="16" strokeLinecap="round" />
                            <path d="M 50,200 Q 400,-100 750,200" fill="none" stroke="#e2e8f0" strokeWidth="4" strokeLinecap="round" strokeDasharray="10, 10" />
                        </svg>

                        {/* Station Left (Lower Bound in RTL means wait: if RTL, Left visually is Right logically?
                            Let's keep Left visually = Lower Bound, Right visually = Higher Bound for clarity.
                            RTL flips layout, so we force LTR for the positions or just place them absolutely.
                            We use absolute positioning so it doesn't matter.
                            Left station: 10%. Right station: 90%.
                        */}
                        <div className="absolute left-[5%] sm:left-[10%] top-[220px] sm:top-[250px] w-32 h-20 bg-emerald-600 border-4 border-emerald-800 rounded-lg shadow-xl flex items-center justify-center z-0 flex-col">
                            <div className="text-white font-bold text-sm bg-emerald-800 px-2 rounded -mt-6 mb-1">المحطة 1</div>
                            <span className="text-3xl font-black text-white">{questionData.lowerBound}</span>
                        </div>

                        <div className="absolute right-[5%] sm:right-[10%] top-[220px] sm:top-[250px] w-32 h-20 bg-rose-600 border-4 border-rose-800 rounded-lg shadow-xl flex items-center justify-center z-0 flex-col">
                            <div className="text-white font-bold text-sm bg-rose-800 px-2 rounded -mt-6 mb-1">المحطة 2</div>
                            <span className="text-3xl font-black text-white">{questionData.higherBound}</span>
                        </div>

                        {/* The Cart */}
                        <motion.div
                            className="absolute top-[30px] sm:top-[60px] text-7xl sm:text-8xl drop-shadow-[0_10px_10px_rgba(0,0,0,0.5)] z-20"
                            animate={
                                selectedAnswer !== null
                                    ? {
                                        x: selectedAnswer === questionData.lowerBound ? -300 : 300,
                                        y: selectedAnswer === questionData.lowerBound ? 150 : 150,
                                        rotate: selectedAnswer === questionData.lowerBound ? -30 : 30,
                                    }
                                    : shake
                                        ? { x: [-10, 10, -10, 10, 0] }
                                        : { x: 0, y: 0, rotate: 0 }
                            }
                            transition={
                                selectedAnswer !== null
                                    ? { duration: 1, type: "spring", bounce: 0.2 }
                                    : { duration: 0.4 }
                            }
                        >
                            🚄
                            <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-white/90 font-black text-2xl px-4 py-1 rounded-full border-2 border-slate-300 shadow-md">
                                {questionData.targetNumber}
                            </div>
                        </motion.div>
                    </div>

                    {/* Answer Options Controls */}
                    <div className="mt-20 sm:mt-24 flex gap-8 justify-center w-full z-20 px-4 mb-20">
                        {/* We use specific buttons for lower and higher */}
                        <motion.button
                            whileHover={{ scale: 1.05, y: -5 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => checkAnswer(questionData.lowerBound)}
                            disabled={feedback !== null}
                            className={`w-40 sm:w-56 py-6 sm:py-8 ${selectedAnswer === questionData.lowerBound && feedback === 'correct' ? 'bg-emerald-500 border-emerald-700' :
                                selectedAnswer === questionData.lowerBound && feedback === 'wrong' ? 'bg-red-500 border-red-700' :
                                    'bg-sky-600 hover:bg-sky-500 border-sky-800'
                                } border-b-[8px] text-white text-4xl sm:text-5xl font-black rounded-3xl shadow-[0_15px_30px_rgba(0,0,0,0.4)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors`}
                        >
                            <span className="drop-shadow-md">{questionData.lowerBound}</span>
                        </motion.button>

                        <motion.button
                            whileHover={{ scale: 1.05, y: -5 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => checkAnswer(questionData.higherBound)}
                            disabled={feedback !== null}
                            className={`w-40 sm:w-56 py-6 sm:py-8 ${selectedAnswer === questionData.higherBound && feedback === 'correct' ? 'bg-emerald-500 border-emerald-700' :
                                selectedAnswer === questionData.higherBound && feedback === 'wrong' ? 'bg-red-500 border-red-700' :
                                    'bg-indigo-600 hover:bg-indigo-500 border-indigo-800'
                                } border-b-[8px] text-white text-4xl sm:text-5xl font-black rounded-3xl shadow-[0_15px_30px_rgba(0,0,0,0.4)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors`}
                        >
                            <span className="drop-shadow-md">{questionData.higherBound}</span>
                        </motion.button>
                    </div>

                    {/* Feedback Pop-up Overlay */}
                    <AnimatePresence>
                        {feedback && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm pointer-events-none"
                            >
                                <motion.div
                                    initial={{ scale: 0.5, y: 50 }}
                                    animate={{ scale: 1, y: 0 }}
                                    exit={{ scale: 0.5, opacity: 0 }}
                                    className={`max-w-lg w-full rounded-3xl p-8 text-center shadow-[0_20px_50px_rgba(0,0,0,0.5)] border-[6px] pointer-events-auto ${feedback === 'correct' ? 'bg-gradient-to-br from-emerald-100 to-green-50 border-emerald-500 text-emerald-800' : 'bg-gradient-to-br from-red-100 to-rose-50 border-red-500 text-red-800'}`}
                                >
                                    <div className="text-8xl mb-4 drop-shadow-md">
                                        {feedback === 'correct' ? '🎢✅' : '🚨🚂'}
                                    </div>
                                    <h2 className="text-3xl sm:text-5xl font-black mb-4 leading-tight">
                                        {feedback === 'correct' ? 'إجابة صحيحة! وصل القطار بأمان 🎢' : 'أوه! تأكد من الرقم الكريم والبخيل!'}
                                    </h2>
                                    {feedback === 'wrong' && (
                                        <p className="text-xl font-bold mt-2 text-red-600">القاعدة: 0,1,2,3,4 بخيل | 5,6,7,8,9 كريم</p>
                                    )}
                                </motion.div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </>
            )}

        </div>
    );
}
