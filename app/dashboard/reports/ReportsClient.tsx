'use client';

import React, { useState } from 'react';
import { GAMES } from '@/lib/constants';

type Session = {
    _id: string;
    gameName: string;
    studentId: { _id: string, name: string, grade: string } | null;
    score: number;
    totalQuestions: number;
    date: string;
};

export default function ReportsClient({ initialSessions }: { initialSessions: Session[] }) {
    const [filterGame, setFilterGame] = useState('');
    const [filterStudent, setFilterStudent] = useState('');
    const [filterClass, setFilterClass] = useState('');
    const [filterScore, setFilterScore] = useState('');
    const [sortOrder, setSortOrder] = useState('date-desc');

    // Create a mapping of game IDs to Arabic names
    const gameIdToName = GAMES.reduce((acc, game) => {
        acc[game.id] = game.name;
        return acc;
    }, {} as Record<string, string>);

    // Extract unique classes for dropdown
    const uniqueClasses = Array.from(new Set(initialSessions.map(s => s.studentId?.grade).filter(Boolean))).sort();

    const filtered = initialSessions
        .filter(s => {
            const sName = s.studentId?.name?.toLowerCase() || '';
            const sClass = s.studentId?.grade || '';
            const sScorePercent = (s.score / s.totalQuestions) * 100;

            const nameMatch = filterStudent ? sName.includes(filterStudent.toLowerCase()) : true;
            const classMatch = filterClass ? sClass === filterClass : true;
            const gameMatch = filterGame ? s.gameName === filterGame : true;

            let scoreMatch = true;
            if (filterScore === 'perfect') scoreMatch = sScorePercent === 100;
            else if (filterScore === 'excellent') scoreMatch = sScorePercent >= 90;
            else if (filterScore === 'good') scoreMatch = sScorePercent >= 70;
            else if (filterScore === 'passing') scoreMatch = sScorePercent >= 50;
            else if (filterScore === 'failing') scoreMatch = sScorePercent < 50;

            return nameMatch && classMatch && gameMatch && scoreMatch;
        })
        .sort((a, b) => {
            if (sortOrder === 'date-desc') return new Date(b.date).getTime() - new Date(a.date).getTime();
            if (sortOrder === 'date-asc') return new Date(a.date).getTime() - new Date(b.date).getTime();
            if (sortOrder === 'name-asc') return (a.studentId?.name || '').localeCompare(b.studentId?.name || '', 'ar');
            if (sortOrder === 'score-desc') return b.score - a.score;
            if (sortOrder === 'class-asc') return (a.studentId?.grade || '').localeCompare(b.studentId?.grade || '', 'ar');
            return 0;
        });

    return (
        <div className="space-y-8 animate-in fade-in">
            <header>
                <h2 className="text-3xl font-extrabold text-gray-900 border-r-4 border-indigo-500 pr-4">التقارير والنتائج</h2>
                <p className="mt-2 text-gray-500 text-sm">تابع نتائج طلابك في كل لعبة بسهولة.</p>
            </header>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 mb-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                <div className="flex flex-col">
                    <label className="block text-sm font-medium mb-1">اسم الطالب</label>
                    <input
                        type="text"
                        placeholder="بحث..."
                        className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm"
                        value={filterStudent}
                        onChange={e => setFilterStudent(e.target.value)}
                    />
                </div>

                <div className="flex flex-col">
                    <label className="block text-sm font-medium mb-1">الصف</label>
                    <select
                        className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white text-sm"
                        value={filterClass}
                        onChange={e => setFilterClass(e.target.value)}
                    >
                        <option value="">كافة الصفوف</option>
                        {uniqueClasses.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                </div>

                <div className="flex flex-col">
                    <label className="block text-sm font-medium mb-1">اللعبة</label>
                    <select
                        className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white text-sm"
                        value={filterGame}
                        onChange={e => setFilterGame(e.target.value)}
                    >
                        <option value="">كافة الألعاب</option>
                        {GAMES.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                    </select>
                </div>

                <div className="flex flex-col">
                    <label className="block text-sm font-medium mb-1">النتيجة</label>
                    <select
                        className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white text-sm"
                        value={filterScore}
                        onChange={e => setFilterScore(e.target.value)}
                    >
                        <option value="">كافة النتائج</option>
                        <option value="perfect">درجة كاملة (100%)</option>
                        <option value="excellent">ممتاز ({'>'}= 90%)</option>
                        <option value="good">جيد ({'>'}= 70%)</option>
                        <option value="passing">مقبول ({'>'}= 50%)</option>
                        <option value="failing">يحتاج مساعدة ({'<'} 50%)</option>
                    </select>
                </div>

                <div className="flex flex-col">
                    <label className="block text-sm font-medium mb-1">ترتيب حسب</label>
                    <select
                        className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white text-sm"
                        value={sortOrder}
                        onChange={e => setSortOrder(e.target.value)}
                    >
                        <option value="date-desc">التاريخ (الأحدث)</option>
                        <option value="date-asc">التاريخ (الأقدم)</option>
                        <option value="name-asc">اسم الطالب (أ-ي)</option>
                        <option value="score-desc">النتيجة (الأعلى)</option>
                        <option value="class-asc">الصف (أ-ي)</option>
                    </select>
                </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <table className="w-full text-right">
                    <thead className="bg-gray-50 border-b">
                        <tr>
                            <th className="p-4 text-sm font-semibold text-gray-600">اسم الطالب</th>
                            <th className="p-4 text-sm font-semibold text-gray-600">الصف</th>
                            <th className="p-4 text-sm font-semibold text-gray-600">اللعبة</th>
                            <th className="p-4 text-sm font-semibold text-gray-600">النتيجة</th>
                            <th className="p-4 text-sm font-semibold text-gray-600">التاريخ</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {filtered.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="p-8 text-center text-gray-500">لا توجد نتائج مطابقة</td>
                            </tr>
                        ) : (
                            filtered.map((s) => (
                                <tr key={s._id} className="hover:bg-gray-50 transition">
                                    <td className="p-4 font-bold text-gray-900">{s.studentId?.name || 'غير معروف'}</td>
                                    <td className="p-4">
                                        <span className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-xs font-bold border border-blue-100">
                                            {s.studentId?.grade || 'بدون صف'}
                                        </span>
                                    </td>
                                    <td className="p-4 text-gray-600 font-bold">{gameIdToName[s.gameName] || s.gameName}</td>
                                    <td className="p-4 font-mono font-bold text-indigo-600">{s.score} / {s.totalQuestions}</td>
                                    <td className="p-4 text-gray-500 text-sm">{new Date(s.date).toLocaleString('ar-EG')}</td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
