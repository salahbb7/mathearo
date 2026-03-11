'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { GAMES } from '@/lib/constants';
import { type Difficulty, getDifficultyLabel, getDifficultyColor } from '@/lib/difficulty';

interface User {
    _id: string;
    name: string;
    email: string;
    role: string;
    isActive: boolean;
    plan: 'test' | 'pro';
    statistics?: {
        classCount: number;
        studentCount: number;
        classes: { name: string; studentCount: number }[];
    };
}

type Tab = 'teachers' | 'settings' | 'game-images';

export default function SuperAdminPage() {
    const { data: session, status } = useSession();
    const router = useRouter();

    const [activeTab, setActiveTab] = useState<Tab>('teachers');
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Modal state
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [userForm, setUserForm] = useState({ name: '', email: '', password: '', role: 'teacher', plan: 'test' });

    // Settings tab state
    const [settingsForm, setSettingsForm] = useState({ whatsappNumber: '', difficulty: 'medium' as Difficulty });
    const [settingsSaving, setSettingsSaving] = useState(false);

    // Game images tab state
    const [gameImages, setGameImages] = useState<Record<string, string>>({});
    const [uploadingGame, setUploadingGame] = useState<string | null>(null);
    const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

    useEffect(() => {
        if (status === 'unauthenticated') {
            router.push('/login');
        } else if (status === 'authenticated' && session?.user?.role !== 'superadmin') {
            router.push('/dashboard');
        } else if (status === 'authenticated') {
            fetchUsers();
            fetchSettings();
            fetchGameImages();
        }
    }, [status, session, router]);

    const fetchSettings = async () => {
        try {
            const res = await fetch('/api/settings');
            const data = await res.json();
            setSettingsForm({
                whatsappNumber: data.whatsappNumber || '',
                difficulty: data.difficulty || 'medium',
            });
        } catch (e) {
            console.error('Error fetching settings:', e);
        }
    };

    const fetchGameImages = async () => {
        try {
            const res = await fetch('/api/game-meta');
            const data = await res.json();
            setGameImages(data);
        } catch (e) {
            console.error('Error fetching game images:', e);
        }
    };

    const handleSettingsSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSettingsSaving(true);
        try {
            const fd = new FormData();
            fd.append('whatsappNumber', settingsForm.whatsappNumber);
            fd.append('difficulty', settingsForm.difficulty);
            const res = await fetch('/api/settings', { method: 'POST', body: fd });
            if (!res.ok) throw new Error('فشل الحفظ');
            alert('✅ تم حفظ الإعدادات بنجاح');
        } catch (e) {
            alert('❌ حدث خطأ أثناء الحفظ');
        } finally {
            setSettingsSaving(false);
        }
    };

    const handleGameImageUpload = async (gameId: string, file: File) => {
        setUploadingGame(gameId);
        try {
            const fd = new FormData();
            fd.append('gameId', gameId);
            fd.append('image', file);
            const res = await fetch('/api/game-meta', { method: 'POST', body: fd });
            const data = await res.json();
            setGameImages(prev => ({ ...prev, [gameId]: data.imageUrl }));
        } catch (e) {
            alert('❌ فشل رفع الصورة');
        } finally {
            setUploadingGame(null);
        }
    };

    const fetchUsers = async () => {
        try {
            setLoading(true);
            const res = await fetch('/api/users');
            const data = await res.json();
            setUsers(data);
        } catch (error) {
            console.error('Error fetching users:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleToggleActive = async (id: string, currentStatus: boolean) => {
        try {
            const res = await fetch(`/api/users/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ isActive: !currentStatus }),
            });
            if (res.ok) {
                fetchUsers();
            } else {
                alert('❌ فشل تغيير حالة المعلم');
            }
        } catch (error) {
            console.error('Error toggling active status:', error);
        }
    };

    const handleUserSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            const url = editingUser ? `/api/users/${editingUser._id}` : '/api/users';
            const method = editingUser ? 'PUT' : 'POST';

            const payload: any = {
                name: userForm.name,
                email: userForm.email,
                role: userForm.role,
                plan: userForm.plan,
            };
            if (userForm.password) {
                payload.password = userForm.password;
            }

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.error || 'فشلت العملية');
            }

            alert(editingUser ? '✅ تم تعديل بيانات المعلم بنجاح' : '✅ تم إضافة المعلم بنجاح');
            setIsModalOpen(false);
            setEditingUser(null);
            setUserForm({ name: '', email: '', password: '', role: 'teacher', plan: 'test' });
            fetchUsers();
        } catch (error) {
            console.error('Error saving teacher:', error);
            alert(error instanceof Error ? error.message : 'حدث خطأ غير معروف');
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteUser = async (id: string) => {
        if (!confirm('هل أنت متأكد من حذف هذا المعلم؟ قد يؤدي هذا إلى حذف بياناته المرتبطة لاحقاً.')) return;

        try {
            const res = await fetch(`/api/users/${id}`, { method: 'DELETE' });
            if (res.ok) {
                alert('✅ تم حذف المعلم بنجاح');
                fetchUsers();
            } else {
                alert('❌ فشل الحذف');
            }
        } catch (error) {
            console.error('Error deleting teacher:', error);
        }
    };

    if (status === 'loading' || loading) {
        return (
            <div className="flex items-center justify-center min-h-[50vh]">
                <div className="text-2xl font-bold text-slate-500 animate-pulse">⏳ جاري تحميل البيانات...</div>
            </div>
        );
    }

    if (!session || session?.user?.role !== 'superadmin') return null;

    const tabs: { id: Tab; label: string; icon: string }[] = [
        { id: 'teachers', label: 'إدارة المعلمين', icon: '👨‍🏫' },
        { id: 'settings', label: 'إعدادات النظام', icon: '⚙️' },
        { id: 'game-images', label: 'صور الألعاب', icon: '🖼️' },
    ];

    return (
        <div className="bg-white rounded-3xl shadow-xl p-6 md:p-10 border border-slate-100" dir="rtl">
            <div className="mb-8 border-b pb-6">
                <h1 className="text-3xl font-black text-slate-900 flex items-center gap-3 mb-6">
                    <span className="text-4xl text-emerald-500">🛡️</span>
                    لوحة الإدارة العليا
                </h1>
                {/* Tab bar */}
                <div className="flex gap-2 flex-wrap">
                    {tabs.map(t => (
                        <button
                            key={t.id}
                            onClick={() => setActiveTab(t.id)}
                            className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all ${
                                activeTab === t.id
                                    ? 'bg-emerald-500 text-white shadow-md'
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                        >
                            {t.icon} {t.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* ── Teachers Tab ── */}
            {activeTab === 'teachers' && (<>
            <div className="flex justify-end mb-6">
                <button
                    onClick={() => {
                        setEditingUser(null);
                        setUserForm({ name: '', email: '', password: '', role: 'teacher', plan: 'test' });
                        setIsModalOpen(true);
                    }}
                    className="bg-gradient-to-l from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-bold py-3 px-6 rounded-2xl shadow-lg shadow-emerald-500/30 transition-all active:scale-95 flex items-center gap-2"
                >
                    ➕ إضافة معلم جديد
                </button>
            </div>

            <div className="overflow-x-auto bg-slate-50 rounded-2xl border border-slate-200">
                <table className="w-full text-right text-slate-700">
                    <thead className="bg-slate-200 text-slate-800 font-bold">
                        <tr>
                            <th className="px-6 py-4 rounded-tr-xl">المعلم</th>
                            <th className="px-6 py-4">التحليلات (الصفوف والطلاب)</th>
                            <th className="px-6 py-4 text-center">الحالة</th>
                            <th className="px-6 py-4 text-center">باقة الاشتراك</th>
                            <th className="px-6 py-4 text-center">الصلاحية</th>
                            <th className="px-6 py-4 text-center rounded-tl-xl">الإجراءات</th>
                        </tr>
                    </thead>
                    <tbody>
                        {users.map((user) => (
                            <tr key={user._id} className="border-b border-slate-200 hover:bg-white transition-colors">
                                <td className="px-6 py-4">
                                    <div className="font-bold text-slate-900">{user.name}</div>
                                    <div className="text-xs text-slate-500 font-mono" dir="ltr">{user.email}</div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex flex-wrap gap-2">
                                        <span className="bg-indigo-50 text-indigo-700 px-2 py-1 rounded-lg text-xs font-bold border border-indigo-100">
                                            📚 {user.statistics?.classCount || 0} صفوف
                                        </span>
                                        <span className="bg-emerald-50 text-emerald-700 px-2 py-1 rounded-lg text-xs font-bold border border-emerald-100">
                                            👥 {user.statistics?.studentCount || 0} طلاب
                                        </span>
                                    </div>
                                    <div className="mt-2 flex flex-wrap gap-1">
                                        {user.statistics?.classes.map((cls, idx) => (
                                            <span key={idx} className="text-[10px] bg-white border border-slate-200 px-1.5 py-0.5 rounded shadow-sm text-slate-600">
                                                {cls.name} ({cls.studentCount})
                                            </span>
                                        ))}
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-center">
                                    <button
                                        onClick={() => handleToggleActive(user._id, user.isActive)}
                                        className={`px-4 py-1.5 rounded-full text-xs font-bold border transition-all ${user.isActive ? 'bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-200' : 'bg-red-100 text-red-800 border-red-200 hover:bg-red-200'}`}
                                    >
                                        {user.isActive ? '✅ نشط' : '❌ معطل'}
                                    </button>
                                </td>
                                <td className="px-6 py-4 text-center">
                                    <span className={`px-4 py-1.5 rounded-full text-xs font-bold border ${user.plan === 'pro' ? 'bg-purple-100 text-purple-800 border-purple-200' : 'bg-slate-100 text-slate-800 border-slate-200'}`}>
                                        {user.plan === 'pro' ? '💎 باقة احترافية' : '🧪 باقة تجريبية'}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-center">
                                    <span className={`px-4 py-1.5 rounded-full text-xs font-bold border ${user.role === 'superadmin' ? 'bg-amber-100 text-amber-800 border-amber-200' : 'bg-blue-100 text-blue-800 border-blue-200'}`}>
                                        {user.role === 'superadmin' ? 'إدارة عليا' : 'معلم'}
                                    </span>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex justify-center gap-3">
                                        <button
                                            onClick={() => {
                                                setEditingUser(user);
                                                setUserForm({ name: user.name, email: user.email, password: '', role: user.role, plan: user.plan || 'test' });
                                                setIsModalOpen(true);
                                            }}
                                            className="text-amber-600 hover:bg-amber-50 p-2 rounded-xl transition-colors font-bold text-sm flex items-center gap-1"
                                            title="تعديل"
                                        >
                                            ✏️ تعديل
                                        </button>
                                        <button
                                            onClick={() => handleDeleteUser(user._id)}
                                            className="text-red-500 hover:bg-red-50 p-2 rounded-xl transition-colors font-bold text-sm flex items-center gap-1"
                                            title="حذف"
                                            disabled={user.email === session?.user?.email}
                                        >
                                            🗑️ حذف
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {users.length === 0 && (
                            <tr>
                                <td colSpan={4} className="px-6 py-12 text-center text-slate-500 font-bold">
                                    لا يوجد معلمين مسجلين في النظام.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            </>)}

            {/* ── Settings Tab ── */}
            {activeTab === 'settings' && (
                <div className="max-w-lg">
                    <h2 className="text-2xl font-black text-slate-900 mb-6">⚙️ إعدادات النظام</h2>
                    <form onSubmit={handleSettingsSave} className="space-y-6 bg-slate-50 p-6 rounded-2xl border border-slate-200">
                        <div>
                            <label className="block font-bold text-slate-700 mb-2">رقم واتساب للتواصل</label>
                            <input
                                type="text"
                                value={settingsForm.whatsappNumber}
                                onChange={e => setSettingsForm({ ...settingsForm, whatsappNumber: e.target.value })}
                                className="w-full border-2 border-slate-200 bg-white rounded-xl px-4 py-3 font-mono focus:border-emerald-500 focus:outline-none"
                                placeholder="96871776166"
                                dir="ltr"
                            />
                            <p className="text-xs text-slate-400 mt-1">أدخل الرقم بصيغة دولية بدون +</p>
                        </div>
                        <div>
                            <label className="block font-bold text-slate-700 mb-3">مستوى الصعوبة الافتراضي للألعاب</label>
                            <div className="flex gap-3">
                                {(['easy', 'medium', 'hard'] as Difficulty[]).map(d => (
                                    <button
                                        key={d}
                                        type="button"
                                        onClick={() => setSettingsForm({ ...settingsForm, difficulty: d })}
                                        className={`flex-1 py-3 rounded-xl font-bold text-sm border-2 transition-all ${
                                            settingsForm.difficulty === d
                                                ? getDifficultyColor(d) + ' border-current'
                                                : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-100'
                                        }`}
                                    >
                                        {getDifficultyLabel(d)}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <button
                            type="submit"
                            disabled={settingsSaving}
                            className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3 rounded-xl transition-all disabled:opacity-50"
                        >
                            {settingsSaving ? '⏳ جاري الحفظ...' : '💾 حفظ الإعدادات'}
                        </button>
                    </form>
                </div>
            )}

            {/* ── Game Images Tab ── */}
            {activeTab === 'game-images' && (
                <div>
                    <h2 className="text-2xl font-black text-slate-900 mb-6">🖼️ إدارة صور الألعاب</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {GAMES.map(g => {
                            const imgUrl = gameImages[g.id];
                            return (
                                <div key={g.id} className="bg-slate-50 rounded-2xl border border-slate-200 overflow-hidden">
                                    {/* Image preview */}
                                    <div className={`h-28 ${g.color} relative flex items-center justify-center overflow-hidden`}>
                                        {imgUrl ? (
                                            // eslint-disable-next-line @next/next/no-img-element
                                            <img key={imgUrl} src={`${imgUrl}?t=${Date.now()}`} alt={g.name} className="object-cover w-full h-full" />
                                        ) : (
                                            <span className="text-3xl">🎮</span>
                                        )}
                                    </div>
                                    <div className="p-3">
                                        <p className="font-bold text-slate-800 text-sm mb-2 truncate">{g.name}</p>
                                        <input
                                            ref={el => { fileInputRefs.current[g.id] = el; }}
                                            type="file"
                                            accept="image/*"
                                            className="hidden"
                                            onChange={e => {
                                                const file = e.target.files?.[0];
                                                if (file) handleGameImageUpload(g.id, file);
                                            }}
                                        />
                                        <button
                                            onClick={() => fileInputRefs.current[g.id]?.click()}
                                            disabled={uploadingGame === g.id}
                                            className="w-full py-1.5 text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-lg hover:bg-indigo-100 transition disabled:opacity-50"
                                        >
                                            {uploadingGame === g.id ? '⏳ جاري الرفع...' : '📤 رفع صورة'}
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Teacher Form Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center p-4 z-50 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-white rounded-[2rem] p-8 max-w-lg w-full shadow-2xl animate-in zoom-in-95 duration-200 border-2 border-emerald-100">
                        <h3 className="text-2xl font-black mb-6 text-slate-900 border-b-2 border-slate-100 pb-4 flex items-center gap-3">
                            <span className="text-3xl">👨‍🏫</span>
                            {editingUser ? 'تعديل بيانات معلم' : 'إضافة معلم جديد'}
                        </h3>
                        <form onSubmit={handleUserSubmit} className="space-y-5">
                            <div>
                                <label className="block text-slate-700 font-bold mb-2">اسم المعلم بالكامل</label>
                                <input
                                    type="text"
                                    value={userForm.name}
                                    onChange={e => setUserForm({ ...userForm, name: e.target.value })}
                                    className="w-full border-2 border-slate-200 bg-slate-50 rounded-xl px-4 py-3 focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/20 focus:outline-none transition-all font-bold"
                                    required
                                    placeholder="مثال: أحمد عبد الله"
                                />
                            </div>
                            <div>
                                <label className="block text-slate-700 font-bold mb-2">البريد الإلكتروني للوصول</label>
                                <input
                                    type="email"
                                    value={userForm.email}
                                    onChange={e => setUserForm({ ...userForm, email: e.target.value })}
                                    className="w-full border-2 border-slate-200 bg-slate-50 rounded-xl px-4 py-3 focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/20 focus:outline-none transition-all font-mono text-left"
                                    required
                                    dir="ltr"
                                    placeholder="teacher@school.com"
                                />
                            </div>
                            <div>
                                <label className="block text-slate-700 font-bold mb-2">
                                    {editingUser ? 'كلمة المرور الجديدة (اختياري)' : 'كلمة المرور'}
                                </label>
                                <input
                                    type="password"
                                    value={userForm.password}
                                    onChange={e => setUserForm({ ...userForm, password: e.target.value })}
                                    className="w-full border-2 border-slate-200 bg-slate-50 rounded-xl px-4 py-3 focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/20 focus:outline-none transition-all font-mono text-left"
                                    required={!editingUser}
                                    dir="ltr"
                                    placeholder={editingUser ? '••••••••' : 'اكتب كلمة المرور هنا'}
                                />
                                {editingUser && (
                                    <p className="text-slate-400 text-sm mt-2 font-medium">اترك هذا الحقل فارغاً إذا كنت لا تود تغيير كلمة المرور.</p>
                                )}
                            </div>
                            <div>
                                <label className="block text-slate-700 font-bold mb-2">تحديد الصلاحيات</label>
                                <select
                                    value={userForm.role}
                                    onChange={e => setUserForm({ ...userForm, role: e.target.value })}
                                    className="w-full border-2 border-slate-200 bg-slate-50 rounded-xl px-4 py-3 focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/20 focus:outline-none transition-all font-bold text-slate-900"
                                >
                                    <option value="superadmin">الإدارة العليا (وصول كامل)</option>
                                    <option value="teacher">معلم (إدارة الطلاب فقط)</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-slate-700 font-bold mb-2">نوع باقة الاشتراك</label>
                                <select
                                    value={userForm.plan}
                                    onChange={e => setUserForm({ ...userForm, plan: e.target.value as any })}
                                    className="w-full border-2 border-slate-200 bg-slate-50 rounded-xl px-4 py-3 focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/20 focus:outline-none transition-all font-bold text-slate-900"
                                >
                                    <option value="test">🧪 باقة تجريبية (محدودة)</option>
                                    <option value="pro">💎 باقة احترافية (كاملة)</option>
                                </select>
                            </div>
                            <div className="flex gap-4 pt-4 border-t-2 border-slate-100">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold py-4 rounded-xl transition-all active:scale-95"
                                >
                                    إلغاء التغييرات
                                </button>
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="flex-[2] bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-4 rounded-xl shadow-lg shadow-emerald-500/30 transition-all active:scale-95 disabled:opacity-50"
                                >
                                    {saving ? '⏳ جاري الحفظ...' : '💾 حفظ بيانات المعلم'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
