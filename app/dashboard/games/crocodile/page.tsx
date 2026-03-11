'use client';

import Image from 'next/image';
import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getDifficultyMax, Difficulty } from '@/lib/difficulty';
import confetti from 'canvas-confetti';
import { motion, AnimatePresence } from 'framer-motion';

export default function CrocodileGamePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const studentId = searchParams.get('studentId');
  const isTeacher = searchParams.get('teacher') === 'true';
  const difficulty = (searchParams.get('difficulty') || 'medium') as Difficulty;
  const [gameStarted, setGameStarted] = useState(false);
  const [studentName, setStudentName] = useState('');
  const [numA, setNumA] = useState(0);
  const [numB, setNumB] = useState(0);
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

  // Fetch game settings
  useEffect(() => {
    fetch('/api/settings')
      .then((res) => res.json())
      .then((data) => setSettings(data))
      .catch((err) => console.error('Error loading settings:', err));
  }, []);

  // Play sound
  const playSound = (url: string) => {
    if (url) {
      const audio = new Audio(url);
      audio.play().catch((err) => console.error('Error playing sound:', err));
    }
  };

  const generateNumbers = () => {
    const maxNum = getDifficultyMax(difficulty);
    const a = Math.floor(Math.random() * maxNum) + 1;
    const b = Math.floor(Math.random() * maxNum) + 1;
    setNumA(a);
    setNumB(b);
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
    generateNumbers();
  };

  useEffect(() => {
    if ((studentId || isTeacher) && !gameStarted) {
      setGameStarted(true);
      setScore(0);
      setQuestionNumber(1);
      setStartTime(Date.now());
      generateNumbers();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentId, isTeacher, gameStarted]);


  const checkAnswer = (sign: string) => {
    if (feedback !== null) return; // Prevent double clicks

    // Note: RTL UI means element A is visually on the right, B is on the left
    // However logically we can compare numA (right) to numB (left).
    // Let's do Standard Left-to-Right logic internally but ensure operators reflect Arabic read direction (Right to Left).
    // If we read Arabic RTL: NumA (Right) is compared to NumB (Left).
    // So sign ">" means NumA > NumB (NumA أكبر من NumB).
    // sign "<" means NumA < NumB (NumA أصغر من NumB).

    let isCorrect = false;

    if (sign === '>' && numA > numB) isCorrect = true;
    if (sign === '<' && numA < numB) isCorrect = true;
    if (sign === '=' && numA === numB) isCorrect = true;

    if (isCorrect) {
      setFeedback('correct');
      setScore(prev => prev + 1);
      playSound(settings.successSoundUrl);

      // Confetti effect using canvas-confetti
      confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444'],
      });

      setTimeout(() => {
        nextQuestion(true);
      }, 2000);
    } else {
      setFeedback('wrong');
      setShake(true);
      playSound(settings.errorSoundUrl);

      setTimeout(() => {
        setShake(false);
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
      generateNumbers();
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
          gameType: 'crocodile' // unique identifier for the game
        }),
      }); }

      router.push(`/results?score=${finalScore}&total=${totalQuestions}&time=${timeSpent}&gameId=crocodile${studentId ? `&studentId=${studentId}` : ''}`);
    } catch (error) {
      console.error('Error saving score:', error);
      alert('حدث خطأ في حفظ النتيجة');
    }
  };

  if (!gameStarted) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" dir="rtl">
        <div className="max-w-lg w-full">
          <div className="bg-white/95 backdrop-blur-sm rounded-3xl shadow-2xl p-8 text-center flex flex-col items-center">
            <div className="mb-4 text-7xl">
              🐊
            </div>
            <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-green-500 to-emerald-500 mb-4">
              التمساح الجائع
            </h1>
            <p className="text-xl text-gray-700 mb-8">
              ساعد التمساح ليأكل العدد الأكبر! 🐊
            </p>

            <div className="mb-6 w-full">
              <label htmlFor="name" className="block text-gray-700 font-bold mb-2 text-right">
                ما اسمك؟
              </label>
              <input
                type="text"
                id="name"
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-green-500 focus:outline-none transition-colors text-gray-800 text-center text-xl font-bold"
                placeholder="اكتب اسمك هنا"
                required
              />
            </div>

            <button
              onClick={startGame}
              className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-bold text-2xl py-4 rounded-xl shadow-lg transform hover:scale-105 transition-all duration-200"
            >
              🎯 ابدأ اللعبة
            </button>

            <div className="mt-6 p-4 bg-green-50 rounded-xl border border-green-200 w-full">
              <p className="text-sm text-green-800 font-bold">
                📝 ستجيب على {totalQuestions} أسئلة
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-green-100 to-emerald-200" dir="rtl">
      <div className="max-w-4xl w-full">
        <motion.div
          animate={shake ? { x: [-10, 10, -10, 10, 0] } : {}}
          transition={{ duration: 0.4 }}
          className="bg-white/95 backdrop-blur-sm rounded-3xl shadow-2xl p-8"
        >
          {/* Progress Header */}
          <div className="mb-8">
            <div className="flex justify-between items-center mb-4 text-center sm:text-right">
              <div className="text-5xl">🐊</div>
              <div className="text-right flex-1 px-4">
                <span className="block text-xl font-bold text-gray-700 mb-1">
                  السؤال {questionNumber} من {totalQuestions}
                </span>
                <span className="block text-2xl font-extrabold text-green-600">
                  النقاط: {score} 🏆
                </span>
              </div>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-4 shadow-inner">
              <motion.div
                className="bg-gradient-to-r from-green-400 to-green-600 h-4 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${(questionNumber / totalQuestions) * 100}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
          </div>

          {/* Game Board */}
          <div className="mb-10 flex flex-row items-center justify-center gap-4 sm:gap-8">
            {/* Number A (Right in RTL) */}
            <motion.div
              key={`numA-${questionNumber}`}
              initial={{ scale: 0, rotate: -20 }}
              animate={{ scale: 1, rotate: 0 }}
              className="w-24 h-24 sm:w-40 sm:h-40 bg-gradient-to-br from-blue-400 to-blue-600 rounded-3xl shadow-xl flex items-center justify-center border-4 border-blue-200"
            >
              <span className="text-5xl sm:text-7xl font-extrabold text-white drop-shadow-lg">
                {numA}
              </span>
            </motion.div>

            {/* Sign Wait Area */}
            <div className="w-20 h-20 sm:w-28 sm:h-28 rounded-full border-4 border-dashed border-gray-400 bg-gray-50 flex items-center justify-center shadow-inner relative">
              <AnimatePresence>
                {feedback === 'correct' && (
                  <motion.div
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0, opacity: 0 }}
                    className="text-5xl sm:text-6xl font-extrabold text-green-600 absolute"
                  >
                    {numA > numB ? '>' : numA < numB ? '<' : '='}
                  </motion.div>
                )}
              </AnimatePresence>
              {feedback === null && (
                <span className="text-gray-300 text-3xl sm:text-4xl">؟</span>
              )}
            </div>

            {/* Number B (Left in RTL) */}
            <motion.div
              key={`numB-${questionNumber}`}
              initial={{ scale: 0, rotate: 20 }}
              animate={{ scale: 1, rotate: 0 }}
              className="w-24 h-24 sm:w-40 sm:h-40 bg-gradient-to-br from-purple-400 to-purple-600 rounded-3xl shadow-xl flex items-center justify-center border-4 border-purple-200"
            >
              <span className="text-5xl sm:text-7xl font-extrabold text-white drop-shadow-lg">
                {numB}
              </span>
            </motion.div>
          </div>

          {/* Controls */}
          <div className="grid grid-cols-3 gap-4 mb-8 max-w-2xl mx-auto">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => checkAnswer('>')}
              disabled={feedback !== null}
              className="bg-yellow-400 hover:bg-yellow-500 text-yellow-900 border-b-8 border-yellow-600 rounded-2xl py-6 sm:py-8 text-4xl sm:text-6xl font-extrabold disabled:opacity-50 transition-colors shadow-lg"
            >
              <span className="sr-only">أكبر من</span>
              &gt;
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => checkAnswer('=')}
              disabled={feedback !== null}
              className="bg-cyan-400 hover:bg-cyan-500 text-cyan-900 border-b-8 border-cyan-600 rounded-2xl py-6 sm:py-8 text-4xl sm:text-6xl font-extrabold disabled:opacity-50 transition-colors shadow-lg"
            >
              <span className="sr-only">يساوي</span>
              =
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => checkAnswer('<')}
              disabled={feedback !== null}
              className="bg-pink-400 hover:bg-pink-500 text-pink-900 border-b-8 border-pink-600 rounded-2xl py-6 sm:py-8 text-4xl sm:text-6xl font-extrabold disabled:opacity-50 transition-colors shadow-lg"
            >
              <span className="sr-only">أصغر من</span>
              &lt;
            </motion.button>
          </div>

          {/* Feedback Message */}
          <AnimatePresence>
            {feedback === 'correct' && (
              <motion.div
                initial={{ y: 50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -50, opacity: 0 }}
                className="bg-green-100 border-4 border-green-500 text-green-800 p-6 rounded-2xl text-center shadow-lg"
              >
                <p className="text-3xl font-extrabold">رائع! التمساح شبعان 🐊🎉</p>
              </motion.div>
            )}

            {feedback === 'wrong' && (
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                className="bg-red-100 border-4 border-red-500 text-red-800 p-6 rounded-2xl text-center shadow-lg"
              >
                <p className="text-3xl font-extrabold">أوه! حاول مرة أخرى ❌</p>
              </motion.div>
            )}
          </AnimatePresence>

        </motion.div>
      </div>
    </div>
  );
}
