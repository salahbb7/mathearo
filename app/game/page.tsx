'use client';

import Image from 'next/image';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import confetti from 'canvas-confetti';

type QuestionType = 'double' | 'half';

interface Question {
    number: number;
    type: QuestionType;
    correctAnswer: number;
}

export default function GamePage() {
    const router = useRouter();
    const [studentName, setStudentName] = useState('');
    const [gameStarted, setGameStarted] = useState(false);
    const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
    const [userAnswer, setUserAnswer] = useState('');
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

    // Generate random question
    const generateQuestion = (): Question => {
        const type: QuestionType = Math.random() > 0.5 ? 'double' : 'half';
        let number: number;

        if (type === 'double') {
            number = Math.floor(Math.random() * 50) + 1; // 1-50
            return {
                number,
                type,
                correctAnswer: number * 2,
            };
        } else {
            number = (Math.floor(Math.random() * 25) + 1) * 2; // Even numbers 2-50
            return {
                number,
                type,
                correctAnswer: number / 2,
            };
        }
    };

    const startGame = () => {
        if (!studentName.trim()) {
            alert('يرجى إدخال اسمك أولاً');
            return;
        }
        setGameStarted(true);
        setScore(0);
        setQuestionNumber(1);
        setStartTime(Date.now());
        setCurrentQuestion(generateQuestion());
    };

    const checkAnswer = () => {
        if (!currentQuestion || !userAnswer) return;

        const isCorrect = parseInt(userAnswer) === currentQuestion.correctAnswer;

        if (isCorrect) {
            setFeedback('correct');
            setScore(score + 1);
            playSound(settings.successSoundUrl);

            // Confetti effect
            confetti({
                particleCount: 100,
                spread: 70,
                origin: { y: 0.6 },
            });

            setTimeout(() => {
                nextQuestion();
            }, 1500);
        } else {
            setFeedback('wrong');
            setShake(true);
            playSound(settings.errorSoundUrl);

            setTimeout(() => {
                setShake(false);
                setFeedback(null);
                setUserAnswer('');
            }, 1000);
        }
    };

    const nextQuestion = () => {
        setFeedback(null);
        setUserAnswer('');

        if (questionNumber >= totalQuestions) {
            finishGame();
        } else {
            setQuestionNumber(questionNumber + 1);
            setCurrentQuestion(generateQuestion());
        }
    };

    const finishGame = async () => {
        const timeSpent = Math.floor((Date.now() - startTime) / 1000);

        try {
            await fetch('/api/scores', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    studentName,
                    score,
                    totalQuestions,
                    timeSpent,
                }),
            });

            router.push(`/results?score=${score}&total=${totalQuestions}&time=${timeSpent}&gameId=game`);
        } catch (error) {
            console.error('Error saving score:', error);
            alert('حدث خطأ في حفظ النتيجة');
        }
    };

    if (!gameStarted) {
        return (
            <div className="min-h-screen flex items-center justify-center p-4">
                <div className="max-w-lg w-full">
                    <div className="bg-white/95 backdrop-blur-sm rounded-3xl shadow-2xl p-8 text-center flex flex-col items-center">
                        <div className="mb-4 relative w-32 h-32">
                            <Image
                                src="/logo.png"
                                alt="شعار"
                                fill
                                className="object-contain"
                            />
                        </div>
                        <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-red-500 mb-4">
                            آلة الضعف والنصف
                        </h1>
                        <p className="text-xl text-gray-700 mb-8">
                            استعد لاختبار مهاراتك في الرياضيات! 🚀
                        </p>

                        <div className="mb-6">
                            <label htmlFor="name" className="block text-gray-700 font-bold mb-2 text-right">
                                ما اسمك؟
                            </label>
                            <input
                                type="text"
                                id="name"
                                value={studentName}
                                onChange={(e) => setStudentName(e.target.value)}
                                className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-orange-500 focus:outline-none transition-colors text-gray-800 text-center text-xl font-bold"
                                placeholder="اكتب اسمك هنا"
                                required
                            />
                        </div>

                        <button
                            onClick={startGame}
                            className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-bold text-2xl py-4 rounded-xl shadow-lg transform hover:scale-105 transition-all duration-200"
                        >
                            🎯 ابدأ اللعبة
                        </button>

                        <div className="mt-6 p-4 bg-yellow-50 rounded-xl border border-yellow-200">
                            <p className="text-sm text-yellow-800 font-bold">
                                📝 ستجيب على {totalQuestions} أسئلة
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (!currentQuestion) return null;

    const questionText =
        currentQuestion.type === 'double'
            ? `ما هو ضِعف العدد ${currentQuestion.number}؟`
            : `ما هو نِصف العدد ${currentQuestion.number}؟`;

    return (
        <div className="min-h-screen flex items-center justify-center p-4">
            <div className="max-w-2xl w-full">
                <div className={`bg-white/95 backdrop-blur-sm rounded-3xl shadow-2xl p-8 ${shake ? 'shake' : ''}`}>
                    {/* Progress */}
                    <div className="mb-6">
                        <div className="flex justify-between items-center mb-4">
                            {/* Logo */}
                            <div className="relative w-16 h-16">
                                <Image
                                    src="/logo.png"
                                    alt="شعار"
                                    fill
                                    className="object-contain"
                                />
                            </div>

                            <div className="text-right">
                                <span className="block text-lg font-bold text-gray-700">
                                    السؤال {questionNumber} من {totalQuestions}
                                </span>
                                <span className="block text-lg font-bold text-green-600">
                                    النقاط: {score} 🏆
                                </span>
                            </div>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-3">
                            <div
                                className="bg-gradient-to-r from-orange-500 to-red-500 h-3 rounded-full transition-all duration-300"
                                style={{ width: `${(questionNumber / totalQuestions) * 100}%` }}
                            />
                        </div>
                    </div>

                    {/* Machine */}
                    <div className="mb-8">
                        <div className="relative">
                            {/* Machine Placeholder */}
                            <div className="bg-gradient-to-br from-orange-400 to-orange-600 rounded-3xl p-12 shadow-2xl border-8 border-orange-700 relative overflow-hidden">
                                {/* Decorative elements */}
                                <div className="absolute top-4 left-4 w-8 h-8 bg-yellow-300 rounded-full animate-pulse" />
                                <div className="absolute top-4 right-4 w-8 h-8 bg-yellow-300 rounded-full animate-pulse" />
                                <div className="absolute bottom-4 left-4 w-6 h-6 bg-red-500 rounded-full" />
                                <div className="absolute bottom-4 right-4 w-6 h-6 bg-red-500 rounded-full" />

                                {/* Input Number Display */}
                                <div className="bg-white/90 rounded-2xl p-8 text-center mb-4">
                                    <div className="text-6xl font-extrabold text-orange-600">
                                        {currentQuestion.number}
                                    </div>
                                </div>

                                {/* Machine Label */}
                                <div className="text-center">
                                    <div className="bg-yellow-400 text-gray-800 font-extrabold text-xl px-6 py-2 rounded-full inline-block shadow-lg">
                                        {currentQuestion.type === 'double' ? '× 2' : '÷ 2'}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Question */}
                    <div className="text-center mb-6">
                        <h2 className="text-3xl font-extrabold text-gray-800 mb-4">
                            {questionText}
                        </h2>
                    </div>

                    {/* Answer Input */}
                    <div className="mb-6">
                        <input
                            type="number"
                            value={userAnswer}
                            onChange={(e) => setUserAnswer(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && checkAnswer()}
                            className="w-full px-6 py-4 border-4 border-gray-300 rounded-2xl focus:border-orange-500 focus:outline-none transition-colors text-gray-800 text-center text-3xl font-bold"
                            placeholder="؟"
                            disabled={feedback !== null}
                            autoFocus
                        />
                    </div>

                    {/* Feedback */}
                    {feedback === 'correct' && (
                        <div className="bg-green-100 border-4 border-green-500 text-green-800 p-6 rounded-2xl mb-6 text-center bounce-in">
                            <p className="text-3xl font-extrabold">إجابة ممتازة! 🎉</p>
                            <p className="text-xl mt-2">أحسنت يا بطل!</p>
                        </div>
                    )}

                    {feedback === 'wrong' && (
                        <div className="bg-red-100 border-4 border-red-500 text-red-800 p-6 rounded-2xl mb-6 text-center">
                            <p className="text-3xl font-extrabold">حاول مجدداً ❌</p>
                        </div>
                    )}

                    {/* Submit Button */}
                    {feedback === null && (
                        <button
                            onClick={checkAnswer}
                            disabled={!userAnswer}
                            className="w-full bg-gradient-to-r from-green-500 to-teal-500 hover:from-green-600 hover:to-teal-600 text-white font-bold text-2xl py-4 rounded-xl shadow-lg transform hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            ✓ تحقق من الإجابة
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
