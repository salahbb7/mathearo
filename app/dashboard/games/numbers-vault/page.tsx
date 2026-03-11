'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Difficulty } from '@/lib/difficulty';
import confetti from 'canvas-confetti';
import { motion, AnimatePresence } from 'framer-motion';

// simplified Arabic number to word converter
function numberToArabicWords(num: number): string {
    if (num === 0) return 'صفر';

    const ones = ['', 'واحد', 'اثنان', 'ثلاثة', 'أربعة', 'خمسة', 'ستة', 'سبعة', 'ثمانية', 'تسعة'];
    const tens = ['', 'عشرة', 'عشرون', 'ثلاثون', 'أربعون', 'خمسون', 'ستون', 'سبعون', 'ثمانون', 'تسعون'];
    const teens = ['عشرة', 'أحد عشر', 'اثنا عشر', 'ثلاثة عشر', 'أربعة عشر', 'خمسة عشر', 'ستة عشر', 'سبعة عشر', 'ثمانية عشر', 'تسعة عشر'];
    const hundreds = ['', 'مائة', 'مائتان', 'ثلاثمائة', 'أربعمائة', 'خمسمائة', 'ستمائة', 'سبعمائة', 'ثمانمائة', 'تسعمائة'];

    const getParts = (n: number) => {
        let h = Math.floor(n / 100);
        let rem = n % 100;
        let parts = [];

        if (h > 0) parts.push(hundreds[h]);

        if (rem > 0) {
            if (rem < 10) {
                parts.push(ones[rem]);
            } else if (rem >= 10 && rem < 20) {
                parts.push(teens[rem - 10]);
            } else {
                let t = Math.floor(rem / 10);
                let o = rem % 10;
                if (o > 0) {
                    parts.push(ones[o] + ' و' + tens[t]);
                } else {
                    parts.push(tens[t]);
                }
            }
        }
        return parts.join(' و');
    };

    let thousands = Math.floor(num / 1000);
    let units = num % 1000;

    let result = [];

    if (thousands > 0) {
        if (thousands === 1) result.push('ألف');
        else if (thousands === 2) result.push('ألفان');
        else if (thousands >= 3 && thousands <= 10) {
            result.push(getParts(thousands) + ' آلاف');
        } else {
            result.push(getParts(thousands) + ' ألفاً');
        }
    }

    if (units > 0) {
        let p = getParts(units);
        if (p) result.push(p);
    }

    return result.join(' و');
}

export default function NumbersVaultGamePage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const studentId = searchParams.get('studentId');
  const isTeacher = searchParams.get('teacher') === 'true';
    const difficulty = (searchParams.get('difficulty') || 'medium') as Difficulty;
    const [gameStarted, setGameStarted] = useState(false);
    const [studentName, setStudentName] = useState('');

    const [targetNumber, setTargetNumber] = useState<number>(0);
    const [targetWords, setTargetWords] = useState<string>('');
    const [typedCode, setTypedCode] = useState<string>('');

    const [score, setScore] = useState(0);
    const [questionNumber, setQuestionNumber] = useState(0);
    const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
    const [vaultOpen, setVaultOpen] = useState(false);
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
        setFeedback(null);
        setVaultOpen(false);
        setTypedCode('');

        // Number range scales with difficulty
        let rnd = 0;
        if (difficulty === 'easy') {
            // hundreds only: 101-999
            rnd = Math.floor(Math.random() * 899) + 101;
        } else if (difficulty === 'hard') {
            // hundred thousands: 100,000-999,999
            rnd = Math.floor(Math.random() * 899999) + 100000;
        } else {
            // medium: mix hundreds and thousands
            const roll = Math.random();
            if (roll < 0.4) {
                rnd = Math.floor(Math.random() * 899) + 101;
            } else {
                rnd = Math.floor(Math.random() * 98999) + 1000;
            }
        }

        setTargetNumber(rnd);
        setTargetWords(numberToArabicWords(rnd));
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


    const handleKeyClick = (numStr: string) => {
        if (feedback !== null) return;
        if (typedCode.length < 6) {
            setTypedCode(prev => prev + numStr);
        }
    };

    const handleClear = () => {
        if (feedback !== null) return;
        setTypedCode(prev => prev.slice(0, -1));
    };

    const handleClearAll = () => {
        if (feedback !== null) return;
        setTypedCode('');
    };

    const handleSubmit = () => {
        if (feedback !== null || !typedCode) return;
        const answer = parseInt(typedCode, 10);

        if (answer === targetNumber) {
            setFeedback('correct');
            setVaultOpen(true);
            setScore(prev => prev + 1);
            playSound(settings.successSoundUrl);

            confetti({
                particleCount: 200,
                spread: 120,
                origin: { y: 0.5 },
                colors: ['#fbbf24', '#f59e0b', '#d97706', '#ffffff'],
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
                setTypedCode('');
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
                    gameType: 'numbers-vault',
                }),
            }); }

            router.push(`/results?score=${finalScore}&total=${totalQuestions}&time=${timeSpent}&gameId=numbers-vault${studentId ? `&studentId=${studentId}` : ''}`);
        } catch (error) {
            console.error('Error saving score:', error);
            alert('حدث خطأ في حفظ النتيجة');
        }
    };

    if (!gameStarted) {
        return (
            <div className="min-h-screen flex items-center justify-center p-4 bg-slate-900 relative overflow-hidden" dir="rtl">
                {/* Vault Theme Background */}
                <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(15,23,42,0.9),rgba(2,6,23,1)),url('https://www.transparenttextures.com/patterns/brushed-alum.png')]"></div>

                {/* Vault Door Art in Background */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] border-[40px] border-slate-700/30 rounded-full opacity-20 pointer-events-none"></div>

                <div className="max-w-lg w-full relative z-10">
                    <div className="bg-slate-800/95 backdrop-blur-md rounded-3xl shadow-[0_20px_60px_rgba(0,0,0,0.8)] p-8 text-center flex flex-col items-center border-[8px] border-slate-600 relative overflow-hidden">

                        {/* Metallic Rivets */}
                        <div className="absolute top-3 right-3 w-4 h-4 rounded-full bg-slate-400 border-2 border-slate-500 shadow-inner"></div>
                        <div className="absolute top-3 left-3 w-4 h-4 rounded-full bg-slate-400 border-2 border-slate-500 shadow-inner"></div>
                        <div className="absolute bottom-3 right-3 w-4 h-4 rounded-full bg-slate-400 border-2 border-slate-500 shadow-inner"></div>
                        <div className="absolute bottom-3 left-3 w-4 h-4 rounded-full bg-slate-400 border-2 border-slate-500 shadow-inner"></div>

                        <div className="mb-4 text-8xl drop-shadow-[0_0_20px_rgba(251,191,36,0.6)]">
                            🏦
                        </div>
                        <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-300 to-amber-600 mb-4 drop-shadow-sm">
                            خزنة الأرقام الكبيرة
                        </h1>
                        <p className="text-xl text-slate-300 mb-8 font-bold">
                            حول الكلمات إلى أرقام وافتح الخزنة المليئة بالذهب! 💰
                        </p>

                        <div className="mb-6 w-full">
                            <label htmlFor="name" className="block text-slate-400 font-bold mb-2 text-right text-lg">
                                اسم مدير البنك:
                            </label>
                            <input
                                type="text"
                                id="name"
                                value={studentName}
                                onChange={(e) => setStudentName(e.target.value)}
                                className="w-full px-4 py-4 bg-slate-900 border-2 border-slate-600 rounded-xl focus:border-amber-500 focus:outline-none transition-all text-amber-400 placeholder-slate-600 text-center text-xl font-mono shadow-inner tracking-widest"
                                placeholder="أدخل اسمك"
                                required
                            />
                        </div>

                        <button
                            onClick={startGame}
                            className="w-full bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white font-black text-2xl py-5 rounded-xl shadow-[0_6px_0_#064e3b] active:shadow-[0_0px_0_#064e3b] active:translate-y-2 transform transition-all border border-emerald-400/30 uppercase tracking-widest"
                        >
                            دخول القبو 🔓
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex flex-col items-center justify-start pt-24 sm:pt-28 pb-8 px-4 sm:px-8 bg-slate-900 relative overflow-hidden font-sans" dir="rtl">

            {/* Dark Metallic Texture Background */}
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/black-scales.png')] opacity-30 pointer-events-none"></div>

            {/* Ambient Lighting */}
            <div className={`absolute top-0 left-0 right-0 h-64 transition-colors duration-500 pointer-events-none ${feedback === 'wrong' ? 'bg-red-500/20' : 'bg-transparent'}`}></div>

            {/* HUD */}
            <div className="fixed top-6 left-0 w-full px-6 flex justify-between items-start z-30 pointer-events-none">
                <div className="bg-slate-800/90 backdrop-blur-sm rounded-lg p-3 sm:p-4 border-2 border-slate-600 shadow-xl flex flex-col pointer-events-auto">
                    <span className="text-xl sm:text-2xl font-black text-slate-300">مستوى الأمان {questionNumber}/{totalQuestions}</span>
                    <span className="text-lg sm:text-xl font-bold text-amber-500 tracking-widest">الرصيد: {score} 🏆</span>
                </div>
            </div>

            {/* Instruction Header */}
            <motion.div
                initial={{ y: -50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="mb-6 z-20 w-full max-w-4xl pt-4"
            >
                <div className="bg-slate-800/90 backdrop-blur-md rounded-2xl p-6 shadow-[0_10px_30px_rgba(0,0,0,0.8)] border-b-4 border-amber-500 text-center relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-amber-400 to-transparent opacity-50"></div>
                    <h2 className="text-xl sm:text-3xl font-bold text-slate-300 mb-2">
                        أدخل الرقم السري لفتح الخزنة:
                    </h2>
                    <h3 className="text-2xl sm:text-4xl font-black text-amber-400 drop-shadow-[0_0_10px_rgba(251,191,36,0.5)] leading-relaxed">
                        "{targetWords}"
                    </h3>
                </div>
            </motion.div>

            {/* Vault Area */}
            <div className="w-full max-w-5xl flex flex-col lg:flex-row items-center justify-center gap-8 lg:gap-16 relative z-10 mt-4">

                {/* The Vault Door Display */}
                <motion.div
                    className="relative w-72 h-72 sm:w-96 sm:h-96 shrink-0"
                    animate={shake ? { x: [-10, 10, -10, 10, 0] } : {}}
                    transition={{ duration: 0.4 }}
                >
                    {/* Vault Frame */}
                    <div className="absolute inset-0 bg-slate-800 rounded-full border-[12px] border-slate-600 shadow-[0_20px_50px_rgba(0,0,0,0.8),inset_0_10px_30px_rgba(0,0,0,0.8)] flex items-center justify-center overflow-hidden">

                        {/* Gold Coins Inside (Visible when open) */}
                        <div className="absolute inset-0 flex items-center justify-center text-7xl opacity-0 transition-opacity duration-1000 bg-yellow-900/50" style={{ opacity: vaultOpen ? 1 : 0 }}>
                            💰🪙💰<br />🪙💰🪙<br />💰🪙💰
                        </div>

                        {/* Left Door */}
                        <motion.div
                            className="absolute left-0 top-0 bottom-0 w-1/2 bg-slate-400 border-r-4 border-slate-500 shadow-[inset_-10px_0_20px_rgba(0,0,0,0.5)] origin-left flex items-center justify-end"
                            animate={{ rotateY: vaultOpen ? 120 : 0 }}
                            transition={{ duration: 1.5, type: "spring", bounce: 0.2 }}
                            style={{ perspective: 1000 }}
                        >
                            <div className="w-8 h-8 bg-slate-600 rounded-full mr-4 border-2 border-slate-700 shadow-inner"></div>
                            {/* Texture overlay */}
                            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/brushed-alum.png')] opacity-30 mix-blend-overlay"></div>
                        </motion.div>

                        {/* Right Door */}
                        <motion.div
                            className="absolute right-0 top-0 bottom-0 w-1/2 bg-slate-400 border-l-4 border-slate-500 shadow-[inset_10px_0_20px_rgba(0,0,0,0.5)] origin-right flex items-center justify-start"
                            animate={{ rotateY: vaultOpen ? -120 : 0 }}
                            transition={{ duration: 1.5, type: "spring", bounce: 0.2 }}
                            style={{ perspective: 1000 }}
                        >
                            {/* Steering Wheel / Handle */}
                            <motion.div
                                className="w-24 h-24 border-8 border-slate-700 rounded-full ml-4 shadow-xl flex items-center justify-center relative z-20"
                                animate={{ rotate: vaultOpen ? 360 : 0 }}
                                transition={{ duration: 1.2, ease: "easeOut" }}
                            >
                                <div className="absolute w-full h-2 bg-slate-700"></div>
                                <div className="absolute w-full h-2 bg-slate-700 rotate-90"></div>
                                <div className="absolute w-full h-2 bg-slate-700 rotate-45"></div>
                                <div className="absolute w-full h-2 bg-slate-700 -rotate-45"></div>
                                <div className="w-8 h-8 bg-slate-800 rounded-full z-10 border-2 border-slate-600"></div>
                            </motion.div>
                            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/brushed-alum.png')] opacity-30 mix-blend-overlay"></div>
                        </motion.div>
                    </div>

                    {/* Red Alarm Light Effect */}
                    <AnimatePresence>
                        {feedback === 'wrong' && (
                            <motion.div
                                className="absolute -top-6 left-1/2 -translate-x-1/2 w-16 h-12 bg-red-600 rounded-t-full shadow-[0_0_50px_rgba(220,38,38,1)] border-b-4 border-slate-800"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: [0, 1, 0, 1, 0], scale: [1, 1.1, 1, 1.1, 1] }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 1 }}
                            />
                        )}
                    </AnimatePresence>
                </motion.div>

                {/* Keypad & LCD Display Board */}
                <div className="bg-slate-800 p-6 sm:p-8 rounded-3xl border-[6px] border-slate-700 shadow-[0_20px_40px_rgba(0,0,0,0.8)] w-full max-w-sm shrink-0">

                    {/* LCD Screen */}
                    <div className="mb-6 bg-emerald-900 border-4 border-slate-900 rounded-xl p-4 shadow-[inset_0_5px_15px_rgba(0,0,0,0.8)] flex flex-col">
                        <span className="text-emerald-700/50 text-xs font-mono mb-1 tracking-widest">SECURE VAULT SYSTEM v9.9</span>
                        <div className={`h-12 w-full flex items-center justify-end font-mono text-4xl tracking-[0.2em] font-bold ${typedCode.length > 0 ? 'text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.8)]' : 'text-emerald-800'}`}>
                            {typedCode || '------'}
                            {typedCode.length < 6 && <span className="animate-pulse ml-1 text-emerald-400">_</span>}
                        </div>
                    </div>

                    {/* Keypad Grid */}
                    <div className="grid grid-cols-3 gap-3 sm:gap-4 mb-4" dir="ltr">
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                            <motion.button
                                key={num}
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.9 }}
                                onClick={() => handleKeyClick(num.toString())}
                                disabled={feedback !== null || typedCode.length >= 6}
                                className="bg-slate-600 hover:bg-slate-500 text-white border-b-4 border-slate-800 rounded-xl py-4 sm:py-5 text-2xl font-black font-mono shadow-md disabled:opacity-50 transition-colors"
                            >
                                {num}
                            </motion.button>
                        ))}

                        {/* Clear One */}
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={handleClear}
                            disabled={feedback !== null || typedCode.length === 0}
                            className="bg-orange-600 hover:bg-orange-500 text-white border-b-4 border-orange-800 rounded-xl py-4 sm:py-5 text-lg font-black shadow-md disabled:opacity-50 transition-colors col-span-1"
                        >
                            مسح
                        </motion.button>

                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => handleKeyClick('0')}
                            disabled={feedback !== null || typedCode.length >= 6}
                            className="bg-slate-600 hover:bg-slate-500 text-white border-b-4 border-slate-800 rounded-xl py-4 sm:py-5 text-2xl font-black font-mono shadow-md disabled:opacity-50 transition-colors col-span-1"
                        >
                            0
                        </motion.button>

                        {/* Clear All */}
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={handleClearAll}
                            disabled={feedback !== null || typedCode.length === 0}
                            className="bg-rose-600 hover:bg-rose-500 text-white border-b-4 border-rose-800 rounded-xl py-4 sm:py-5 text-lg font-black shadow-md disabled:opacity-50 transition-colors col-span-1"
                            style={{ fontSize: '0.9rem' }}
                        >
                            X
                        </motion.button>
                    </div>

                    {/* Submit Button */}
                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={handleSubmit}
                        disabled={feedback !== null || typedCode.length === 0}
                        className="w-full bg-emerald-600 hover:bg-emerald-500 border-b-[6px] border-emerald-800 text-white text-3xl font-black py-5 rounded-xl shadow-lg disabled:opacity-50 transition-colors uppercase tracking-widest mt-2"
                    >
                        افتح الخزنة
                    </motion.button>
                </div>
            </div>

            {/* Feedback Pop-up Overlay */}
            <AnimatePresence>
                {feedback && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm pointer-events-none"
                    >
                        <motion.div
                            initial={{ scale: 0.5, y: 50 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.5, opacity: 0 }}
                            className={`max-w-xl w-full rounded-2xl p-8 text-center shadow-[0_20px_50px_rgba(0,0,0,0.9)] border-[4px] pointer-events-auto ${feedback === 'correct' ? 'bg-slate-800 border-amber-500' : 'bg-slate-800 border-red-500'}`}
                        >
                            <div className="text-7xl sm:text-8xl mb-6 drop-shadow-md flex justify-center gap-4">
                                {feedback === 'correct' ? '💰🔓💰' : '🚨🛑🚨'}
                            </div>
                            <h2 className={`text-3xl sm:text-5xl font-black mb-4 leading-tight ${feedback === 'correct' ? 'text-amber-400' : 'text-red-500'}`}>
                                {feedback === 'correct' ? 'تم فتح الخزنة بنجاح! 💰' : 'الرقم السري خاطئ!'}
                            </h2>
                            {feedback === 'wrong' && (
                                <p className="text-xl font-bold mt-4 text-slate-300 bg-slate-900 border border-slate-700 rounded-lg p-4 inline-block">
                                    الرقم الصحيح هو: <span className="text-amber-400 text-2xl mr-2 break-all">{targetNumber}</span>
                                </p>
                            )}
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

        </div>
    );
}
