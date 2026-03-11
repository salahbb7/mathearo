'use client';

import { useEffect, useState } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

interface Score {
    id: string;
    studentName: string;
    score: number;
    totalQuestions: number;
    timeSpent: number;
    createdAt: string;
}

interface Settings {
    successSoundUrl: string;
    errorSoundUrl: string;
    backgroundMusicUrl: string;
}

interface User {
    id: string;
    name: string;
    email: string;
    role: string;
}

export default function AdminPage() {
    const { data: session, status } = useSession();
    const router = useRouter();

    // Data States
    const [scores, setScores] = useState<Score[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [settings, setSettings] = useState<Settings>({
        successSoundUrl: '',
        errorSoundUrl: '',
        backgroundMusicUrl: '',
    });

    // UI States
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [activeTab, setActiveTab] = useState<'scores' | 'settings' | 'users'>('scores');
    const [selectedFiles, setSelectedFiles] = useState<{
        successSound?: File;
        errorSound?: File;
        backgroundMusic?: File;
    }>({});
    const [formKey, setFormKey] = useState(0);

    // User Modal State
    const [isUserModalOpen, setIsUserModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [userForm, setUserForm] = useState({ name: '', email: '', password: '', role: 'teacher' });

    useEffect(() => {
        if (status === 'unauthenticated') {
            router.push('/login');
        } else if (status === 'authenticated' && session?.user?.role !== 'admin') {
            router.push('/dashboard/students');
        }
    }, [status, session, router]);

    useEffect(() => {
        if (status === 'authenticated') {
            fetchScores();
            fetchSettings();
            fetchUsers();
        }
    }, [status]);

    const fetchScores = async () => {
        try {
            const res = await fetch('/api/scores');
            const data = await res.json() as Score[];
            setScores(data);
        } catch (error) {
            console.error('Error fetching scores:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchSettings = async () => {
        try {
            const res = await fetch('/api/settings');
            const data = await res.json() as Settings;
            setSettings(data);
        } catch (error) {
            console.error('Error fetching settings:', error);
        }
    };

    const fetchUsers = async () => {
        try {
            const res = await fetch('/api/users');
            const data = await res.json() as User[];
            setUsers(data);
        } catch (error) {
            console.error('Error fetching users:', error);
        }
    };

    const handleSaveSettings = async () => {
        setSaving(true);
        try {
            const formData = new FormData();
            if (selectedFiles.successSound) formData.append('successSound', selectedFiles.successSound);
            if (selectedFiles.errorSound) formData.append('errorSound', selectedFiles.errorSound);
            if (selectedFiles.backgroundMusic) formData.append('backgroundMusic', selectedFiles.backgroundMusic);

            const res = await fetch('/api/settings', {
                method: 'POST',
                body: formData,
            });

            if (res.ok) {
                const updatedSettings = await res.json() as Settings;
                setSettings(updatedSettings);
                setSelectedFiles({});
                setFormKey(prev => prev + 1);
                alert('✅ تم حفظ الإعدادات بنجاح!');
            } else {
                throw new Error('Failed to save');
            }
        } catch (error) {
            console.error('Error saving settings:', error);
            alert('❌ حدث خطأ في حفظ الإعدادات');
        } finally {
            setSaving(false);
        }
    };

    const handleUserSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);

        try {
            const url = editingUser ? `/api/users/${editingUser.id}` : '/api/users';
            const method = editingUser ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(userForm),
            });

            if (!res.ok) {
                const error = await res.json() as { error?: string };
                throw new Error(error.error || 'فشلت العملية');
            }

            alert(editingUser ? '✅ تم تعديل المستخدم بنجاح' : '✅ تم إضافة المستخدم بنجاح');
            setIsUserModalOpen(false);
            setEditingUser(null);
            setUserForm({ name: '', email: '', password: '', role: 'teacher' });
            fetchUsers();
        } catch (error) {
            console.error('Error saving user:', error);
            alert(error instanceof Error ? error.message : 'حدث خطأ');
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteUser = async (id: string) => {
        if (!confirm('هل أنت متأكد من حذف هذا المستخدم؟')) return;

        try {
            const res = await fetch(`/api/users/${id}`, { method: 'DELETE' });
            if (res.ok) {
                alert('✅ تم الحذف بنجاح');
                fetchUsers();
            } else {
                alert('❌ فشل الحذف');
            }
        } catch (error) {
            console.error('Error deleting user:', error);
        }
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('ar-EG', {
            year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit',
        });
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return mins > 0 ? `${mins}د ${secs}ث` : `${secs}ث`;
    };

    if (status === 'loading' || loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-white text-2xl font-bold">⏳ جاري التحميل...</div>
            </div>
        );
    }

    if (!session) return null;

    return (
        <div className="min-h-screen p-4 md:p-8">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="bg-white/95 backdrop-blur-sm rounded-3xl shadow-2xl p-6 md:p-8 mb-6">
                    <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                        <div className="flex items-center gap-4">
                            <div className="relative w-16 h-16">
                                <Image
                                    src="/logo.png"
                                    alt="شعار"
                                    fill
                                    className="object-contain"
                                />
                            </div>
                            <div>
                                <h1 className="text-3xl md:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-600">
                                    لوحة التحكم 👨‍🏫
                                </h1>
                                <p className="text-gray-600 mt-2">مرحباً، {session.user?.name || 'المعلم'}</p>
                            </div>
                        </div>
                        <button
                            onClick={() => signOut({ callbackUrl: '/' })}
                            className="bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white font-bold px-6 py-3 rounded-xl shadow-lg transform hover:scale-105 transition-all duration-200"
                        >
                            🚪 تسجيل الخروج
                        </button>
                    </div>

                    {/* Tabs */}
                    <div className="flex gap-4 mt-8 border-b border-gray-200 pb-1">
                        <button
                            onClick={() => setActiveTab('scores')}
                            className={`pb-3 px-4 font-bold text-lg transition-colors ${activeTab === 'scores' ? 'text-purple-600 border-b-4 border-purple-600' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            📊 النتائج
                        </button>
                        <button
                            onClick={() => setActiveTab('users')}
                            className={`pb-3 px-4 font-bold text-lg transition-colors ${activeTab === 'users' ? 'text-purple-600 border-b-4 border-purple-600' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            👥 المستخدمين
                        </button>
                        <button
                            onClick={() => setActiveTab('settings')}
                            className={`pb-3 px-4 font-bold text-lg transition-colors ${activeTab === 'settings' ? 'text-purple-600 border-b-4 border-purple-600' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            🎵 الإعدادات
                        </button>
                    </div>
                </div>

                {/* Content */}
                {activeTab === 'scores' && (
                    <div className="bg-white/95 backdrop-blur-sm rounded-3xl shadow-2xl p-6 md:p-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <h2 className="text-2xl font-extrabold text-gray-800 mb-6 flex items-center gap-2">📊 نتائج الطلاب</h2>
                        {scores.length === 0 ? (
                            <div className="text-center py-12">
                                <div className="text-6xl mb-4">📝</div>
                                <p className="text-gray-600 text-lg">لا توجد نتائج بعد.</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="bg-gradient-to-r from-purple-500 to-pink-500 text-white">
                                            <th className="px-4 py-3 text-right rounded-tr-xl">#</th>
                                            <th className="px-4 py-3 text-right">اسم الطالب</th>
                                            <th className="px-4 py-3 text-center">النتيجة</th>
                                            <th className="px-4 py-3 text-center">النسبة</th>
                                            <th className="px-4 py-3 text-center">الوقت</th>
                                            <th className="px-4 py-3 text-right rounded-tl-xl">التاريخ</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {scores.map((score, index) => {
                                            const percentage = Math.round((score.score / score.totalQuestions) * 100);
                                            const bgColor = percentage >= 80 ? 'bg-green-50' : percentage >= 60 ? 'bg-blue-50' : 'bg-red-50';
                                            return (
                                                <tr key={score.id} className={`${bgColor} border-b border-gray-200 hover:bg-opacity-70 transition-colors`}>
                                                    <td className="px-4 py-3 font-bold text-gray-700">{index + 1}</td>
                                                    <td className="px-4 py-3 font-bold text-gray-800">{score.studentName}</td>
                                                    <td className="px-4 py-3 text-center font-bold text-lg">{score.score} / {score.totalQuestions}</td>
                                                    <td className="px-4 py-3 text-center">
                                                        <span className={`inline-block px-3 py-1 rounded-full font-bold ${percentage >= 80 ? 'bg-green-500 text-white' : percentage >= 60 ? 'bg-blue-500 text-white' : 'bg-red-500 text-white'}`}>
                                                            {percentage}%
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3 text-center font-mono">{formatTime(score.timeSpent)}</td>
                                                    <td className="px-4 py-3 text-sm text-gray-600">{formatDate(score.createdAt)}</td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'users' && (
                    <div className="bg-white/95 backdrop-blur-sm rounded-3xl shadow-2xl p-6 md:p-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-2xl font-extrabold text-gray-800 flex items-center gap-2">👥 إدارة المستخدمين</h2>
                            <button
                                onClick={() => {
                                    setEditingUser(null);
                                    setUserForm({ name: '', email: '', password: '', role: 'teacher' });
                                    setIsUserModalOpen(true);
                                }}
                                className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-xl shadow-md transition-colors flex items-center gap-2"
                            >
                                ➕ إضافة مستخدم
                            </button>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white">
                                        <th className="px-4 py-3 text-right rounded-tr-xl">الاسم</th>
                                        <th className="px-4 py-3 text-right">البريد الإلكتروني</th>
                                        <th className="px-4 py-3 text-center">الصلاحية</th>
                                        <th className="px-4 py-3 text-center rounded-tl-xl">إجراءات</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {users.map((user) => (
                                        <tr key={user.id} className="border-b border-gray-200 hover:bg-gray-50 transition-colors">
                                            <td className="px-4 py-3 font-bold text-gray-800">{user.name}</td>
                                            <td className="px-4 py-3 text-gray-600 font-mono" dir="ltr">{user.email}</td>
                                            <td className="px-4 py-3 text-center">
                                                <span className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-sm font-bold border border-purple-200">
                                                    {user.role === 'admin' ? 'مدير' : 'معلم'}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <div className="flex justify-center gap-2">
                                                    <button
                                                        onClick={() => {
                                                            setEditingUser(user);
                                                            setUserForm({ name: user.name, email: user.email, password: '', role: user.role });
                                                            setIsUserModalOpen(true);
                                                        }}
                                                        className="bg-yellow-400 hover:bg-yellow-500 text-yellow-900 p-2 rounded-lg shadow-sm transition-colors"
                                                        title="تعديل"
                                                    >
                                                        ✏️
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteUser(user.id)}
                                                        className="bg-red-400 hover:bg-red-500 text-white p-2 rounded-lg shadow-sm transition-colors"
                                                        title="حذف"
                                                    >
                                                        🗑️
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* User Modal */}
                        {isUserModalOpen && (
                            <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
                                <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl animate-in zoom-in duration-200">
                                    <h3 className="text-2xl font-bold mb-6 text-gray-800 border-b pb-2">
                                        {editingUser ? 'تعديل مستخدم' : 'إضافة مستخدم جديد'}
                                    </h3>
                                    <form onSubmit={handleUserSubmit} className="space-y-4">
                                        <div>
                                            <label className="block text-gray-700 font-bold mb-1">الاسم</label>
                                            <input
                                                type="text"
                                                value={userForm.name}
                                                onChange={e => setUserForm({ ...userForm, name: e.target.value })}
                                                className="w-full border-2 border-gray-300 rounded-xl px-4 py-2 focus:border-purple-500 focus:outline-none"
                                                required
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-gray-700 font-bold mb-1">البريد الإلكتروني</label>
                                            <input
                                                type="email"
                                                value={userForm.email}
                                                onChange={e => setUserForm({ ...userForm, email: e.target.value })}
                                                className="w-full border-2 border-gray-300 rounded-xl px-4 py-2 focus:border-purple-500 focus:outline-none"
                                                required
                                                dir="ltr"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-gray-700 font-bold mb-1">
                                                {editingUser ? 'كلمة المرور (اتركها فارغة للإبقاء عليها)' : 'كلمة المرور'}
                                            </label>
                                            <input
                                                type="password"
                                                value={userForm.password}
                                                onChange={e => setUserForm({ ...userForm, password: e.target.value })}
                                                className="w-full border-2 border-gray-300 rounded-xl px-4 py-2 focus:border-purple-500 focus:outline-none"
                                                required={!editingUser}
                                                dir="ltr"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-gray-700 font-bold mb-1">الصلاحية</label>
                                            <select
                                                value={userForm.role}
                                                onChange={e => setUserForm({ ...userForm, role: e.target.value })}
                                                className="w-full border-2 border-gray-300 rounded-xl px-4 py-2 focus:border-purple-500 focus:outline-none"
                                            >
                                                <option value="admin">مدير</option>
                                                <option value="teacher">معلم</option>
                                            </select>
                                        </div>
                                        <div className="flex gap-3 mt-6">
                                            <button
                                                type="submit"
                                                disabled={saving}
                                                className="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 rounded-xl shadow-lg transition-colors"
                                            >
                                                {saving ? 'جاري الحفظ...' : 'حفظ'}
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setIsUserModalOpen(false)}
                                                className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-3 rounded-xl transition-colors"
                                            >
                                                إلغاء
                                            </button>
                                        </div>
                                    </form>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'settings' && (
                    <div className="bg-white/95 backdrop-blur-sm rounded-3xl shadow-2xl p-6 md:p-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <h2 className="text-2xl font-extrabold text-gray-800 mb-6 flex items-center gap-2">🎵 إعدادات الصوت</h2>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-gray-700 font-bold mb-2">صوت الإجابة الصحيحة</label>
                                <input
                                    key={`success-${formKey}`}
                                    type="file"
                                    accept="audio/*"
                                    onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) setSelectedFiles({ ...selectedFiles, successSound: file });
                                    }}
                                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-green-500 focus:outline-none transition-colors text-gray-800"
                                />
                                {settings.successSoundUrl && (
                                    <div className="mt-2">
                                        <p className="text-sm text-gray-600 mb-1">الملف الحالي:</p>
                                        <audio controls src={settings.successSoundUrl} className="w-full h-8" />
                                    </div>
                                )}
                            </div>
                            <div>
                                <label className="block text-gray-700 font-bold mb-2">صوت الإجابة الخاطئة</label>
                                <input
                                    key={`error-${formKey}`}
                                    type="file"
                                    accept="audio/*"
                                    onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) setSelectedFiles({ ...selectedFiles, errorSound: file });
                                    }}
                                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-red-500 focus:outline-none transition-colors text-gray-800"
                                />
                                {settings.errorSoundUrl && (
                                    <div className="mt-2">
                                        <p className="text-sm text-gray-600 mb-1">الملف الحالي:</p>
                                        <audio controls src={settings.errorSoundUrl} className="w-full h-8" />
                                    </div>
                                )}
                            </div>
                            <div>
                                <label className="block text-gray-700 font-bold mb-2">موسيقى الخلفية</label>
                                <input
                                    key={`background-${formKey}`}
                                    type="file"
                                    accept="audio/*"
                                    onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) setSelectedFiles({ ...selectedFiles, backgroundMusic: file });
                                    }}
                                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-purple-500 focus:outline-none transition-colors text-gray-800"
                                />
                                {settings.backgroundMusicUrl && (
                                    <div className="mt-2">
                                        <p className="text-sm text-gray-600 mb-1">الملف الحالي:</p>
                                        <audio controls src={settings.backgroundMusicUrl} className="w-full h-8" />
                                    </div>
                                )}
                            </div>
                            <button
                                onClick={handleSaveSettings}
                                disabled={saving}
                                className="w-full bg-gradient-to-r from-green-500 to-teal-500 hover:from-green-600 hover:to-teal-600 text-white font-bold text-lg py-3 rounded-xl shadow-lg transform hover:scale-105 transition-all duration-200 disabled:opacity-50"
                            >
                                {saving ? '⏳ جاري الحفظ...' : '💾 حفظ الإعدادات'}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div >
    );
}
