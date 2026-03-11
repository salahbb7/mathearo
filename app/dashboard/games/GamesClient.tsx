'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { GAMES } from '@/lib/constants';
import { type Difficulty, getDifficultyLabel, getDifficultyColor } from '@/lib/difficulty';

type Student = {
    _id: string;
    name: string;
    grade: string;
};

type ClassGroup = {
    _id: string;
    name: string;
};

export default function GamesClient({ students, classes, plan, userName }: { students: Student[], classes: ClassGroup[], plan: string, userName: string }) {
    const router = useRouter();
    const [selectedGame, setSelectedGame] = useState<string | null>(null);
    const [selectedClass, setSelectedClass] = useState<string>('');
    const [selectedStudentId, setSelectedStudentId] = useState<string>('');
    const [selectedDifficulty, setSelectedDifficulty] = useState<Difficulty>('medium');
    const [gameImages, setGameImages] = useState<Record<string, string>>({});

    // Fetch per-game images
    useEffect(() => {
        fetch('/api/game-meta')
            .then(r => r.json())
            .then(data => setGameImages(data as Record<string, string>))
            .catch(() => {});
    }, []);

    useEffect(() => {
        const lastClass = localStorage.getItem('lastSelectedClass');
        if (lastClass && classes.some(c => c.name === lastClass)) {
            setSelectedClass(lastClass);
        } else if (classes.length > 0) {
            setSelectedClass(classes[0].name);
        }
    }, [classes]);

    const handleClassChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newClass = e.target.value;
        setSelectedClass(newClass);
        setSelectedStudentId('');
        if (newClass) {
            localStorage.setItem('lastSelectedClass', newClass);
        }
    };

    const buildUrl = (gameId: string, studentId?: string) => {
        const params = new URLSearchParams();
        params.set('difficulty', selectedDifficulty);
        if (studentId) params.set('studentId', studentId);
        return `/dashboard/games/${gameId}?${params.toString()}`;
    };

    const startGame = () => {
        if (!selectedGame) return;

        if (plan === 'test') {
            const params = new URLSearchParams({ studentName: 'تجربة', difficulty: selectedDifficulty });
            router.push(`/dashboard/games/${selectedGame}?${params.toString()}`);
            return;
        }

        if (!selectedStudentId) return;
        router.push(buildUrl(selectedGame, selectedStudentId));
    };

    const handleOpenGameModal = (gameId: string) => {
        if (plan === 'test') {
            const params = new URLSearchParams({ studentName: 'تجربة', difficulty: selectedDifficulty });
            router.push(`/dashboard/games/${gameId}?${params.toString()}`);
            return;
        }
        setSelectedGame(gameId);
    };

    const filteredStudents = students.filter(s => s.grade === selectedClass);

    const difficulties: { value: Difficulty; emoji: string }[] = [
        { value: 'easy', emoji: '🟢' },
        { value: 'medium', emoji: '🟡' },
        { value: 'hard', emoji: '🔴' },
    ];

    return (
        <div className="space-y-8 animate-in fade-in" dir="rtl">
            <header>
                <h2 className="text-3xl font-extrabold text-gray-900 border-r-4 border-indigo-500 pr-4">مكتبة الألعاب</h2>
                <p className="mt-2 text-gray-500 text-sm">اختر اللعبة المناسبة ثم حدد الطالب الذي سيلعب.</p>
            </header>

            {/* Difficulty Selector */}
            <div className="flex items-center gap-3 flex-wrap">
                <span className="font-semibold text-slate-600 text-sm">مستوى الصعوبة:</span>
                {difficulties.map(d => (
                    <button
                        key={d.value}
                        onClick={() => setSelectedDifficulty(d.value)}
                        className={`px-4 py-1.5 rounded-full text-sm font-bold border transition-all ${
                            selectedDifficulty === d.value
                                ? getDifficultyColor(d.value) + ' ring-2 ring-offset-1 ring-current'
                                : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'
                        }`}
                    >
                        {d.emoji} {getDifficultyLabel(d.value)}
                    </button>
                ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {GAMES.map(g => {
                    const imgUrl = gameImages[g.id];
                    return (
                        <div key={g.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col hover:shadow-md transition">
                            {/* Card image area */}
                            <div className={`h-32 ${g.color} flex items-center justify-center relative overflow-hidden`}>
                                {imgUrl ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={`${imgUrl}?v=${encodeURIComponent(imgUrl)}`} alt={g.name} className="object-cover w-full h-full" />
                                ) : (
                                    <span className="text-4xl">🎮</span>
                                )}
                            </div>
                            <div className="p-5 flex-1 flex flex-col">
                                <h3 className="text-lg font-bold mb-1">{g.name}</h3>
                                <p className="text-gray-500 text-sm mb-4 flex-1">{g.desc}</p>
                                <button
                                    onClick={() => handleOpenGameModal(g.id)}
                                    className="w-full py-2 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 transition"
                                >
                                    ابدأ اللعبة
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>

            {selectedGame && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white p-8 rounded-2xl max-w-sm w-full shadow-2xl animate-in zoom-in-95">
                        <h3 className="text-2xl font-bold mb-2">من سيلعب الآن؟</h3>

                        {/* Difficulty reminder */}
                        <p className="text-sm text-slate-500 mb-5">
                            مستوى الصعوبة المختار:&nbsp;
                            <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-bold border ${getDifficultyColor(selectedDifficulty)}`}>
                                {getDifficultyLabel(selectedDifficulty)}
                            </span>
                        </p>

                        {classes.length === 0 ? (
                            <div className="text-red-500 mb-4">يجب إضافة صفوف أولاً في صفحة إدارة الطلاب.</div>
                        ) : (
                            <>
                                <div className="mb-4">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">اختر الصف</label>
                                    <select value={selectedClass} onChange={handleClassChange} className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-indigo-500">
                                        <option value="">-- اختر صفاً --</option>
                                        {classes.map(c => <option key={c._id} value={c.name}>{c.name}</option>)}
                                    </select>
                                </div>

                                {selectedClass && (
                                    <div className="mb-6">
                                        <label className="block text-sm font-medium text-gray-700 mb-1">اختر الطالب</label>
                                        <select value={selectedStudentId} onChange={e => setSelectedStudentId(e.target.value)} className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-indigo-500">
                                            <option value="">-- اختر طالباً --</option>
                                            {filteredStudents.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
                                        </select>
                                    </div>
                                )}
                            </>
                        )}

                        <div className="flex gap-4">
                            <button onClick={() => { setSelectedGame(null); setSelectedStudentId(''); }} className="flex-1 py-3 bg-gray-100 text-gray-700 font-bold rounded-lg hover:bg-gray-200 transition">
                                إلغاء
                            </button>
                            <button onClick={startGame} disabled={!selectedStudentId} className="flex-1 py-3 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 transition disabled:opacity-50">
                                انطلق! 🚀
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
