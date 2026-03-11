'use client';

import React, { useState, useEffect } from 'react';
import { addStudent, deleteStudent } from '@/app/actions/students';
import { addClass, deleteClass } from '@/app/actions/classes';

type Student = {
    _id: string;
    name: string;
    grade: string;
};

type ClassGroup = {
    _id: string;
    name: string;
};

export default function StudentsClient({ initialStudents, initialClasses, plan }: { initialStudents: Student[], initialClasses: ClassGroup[], plan: string }) {
    const [isPending, startTransition] = React.useTransition();
    const [error, setError] = useState('');
    const [selectedClass, setSelectedClass] = useState<string>('');

    useEffect(() => {
        const lastClass = localStorage.getItem('lastSelectedClass');
        if (lastClass && initialClasses.some(c => c.name === lastClass)) {
            setSelectedClass(lastClass);
        } else if (initialClasses.length > 0) {
            setSelectedClass(initialClasses[0].name);
        }
    }, [initialClasses]);

    const handleSelectClass = (className: string) => {
        setSelectedClass(className);
        localStorage.setItem('lastSelectedClass', className);
    };

    const handleAddClass = async (formData: FormData) => {
        startTransition(async () => {
            try {
                setError('');
                await addClass(formData);
                const className = formData.get('name') as string;
                handleSelectClass(className);
            } catch (e: any) {
                setError(e.message || 'حدث خطأ أثناء إضافة الصف');
            }
        });
    };

    const handleDeleteClass = async (id: string) => {
        if (!confirm('هل أنت متأكد من حذف هذا الصف؟ سيتم حذف جميع الطلاب فيه.')) return;
        startTransition(async () => {
            await deleteClass(id);
            // If the deleted class was the selected one, clear selection
            const deletedClass = initialClasses.find(c => c._id === id);
            if (deletedClass && selectedClass === deletedClass.name) {
                setSelectedClass('');
                localStorage.removeItem('lastSelectedClass');
            }
        });
    };

    const handleAddStudent = async (formData: FormData) => {
        if (!selectedClass) {
            setError('يرجى اختيار الصف أولاً');
            return;
        }
        formData.append('grade', selectedClass);
        startTransition(async () => {
            try {
                setError('');
                await addStudent(formData);
            } catch (e: any) {
                setError(e.message || 'حدث خطأ أثناء إضافة الطالب');
            }
        });
    };

    const handleDeleteStudent = async (id: string) => {
        if (!confirm('هل أنت متأكد من حذف هذا الطالب؟')) return;
        startTransition(async () => {
            await deleteStudent(id);
        });
    };

    const filteredStudents = initialStudents.filter(s => s.grade === selectedClass);

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom">
            <header>
                <h2 className="text-3xl font-extrabold text-gray-900 border-r-4 border-indigo-500 pr-4">إدارة الطلاب</h2>
                <p className="mt-2 text-gray-500 text-sm">أضف صفوف ثم قم بإضافة طلاب إلى كل صف.</p>
                {plan === 'test' && (
                    <div className="mt-4 p-4 bg-amber-50 border-r-4 border-amber-400 text-amber-800 text-sm font-bold flex items-center gap-3">
                        <span>🧪 باقة تجريبية: لا يمكنك إضافة طلاب وصفوف. لتفعيل الباقة الكاملة، يرجى التواصل مع الإدارة.</span>
                    </div>
                )}
            </header>

            {error && <div className="p-4 bg-red-100 text-red-700 rounded-lg">{error}</div>}

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                {/* Classes Section */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 h-fit lg:col-span-1">
                    <h3 className="text-xl font-bold mb-4">إدارة الصفوف</h3>
                    <form action={handleAddClass} className="space-y-4 mb-6">
                        <div>
                            <input type="text" name="name" required className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-indigo-500" placeholder="اسم الصف الجديد" />
                        </div>
                        <button type="submit" disabled={isPending || plan === 'test'} className="w-full py-2 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 transition disabled:opacity-50 text-sm">
                            {isPending ? 'جاري الإضافة...' : 'إضافة صف'}
                        </button>
                    </form>

                    <div className="space-y-2 max-h-96 overflow-y-auto">
                        {initialClasses.length === 0 ? (
                            <p className="text-gray-500 text-sm text-center py-2">لا يوجد صفوف بعد</p>
                        ) : (
                            initialClasses.map(c => (
                                <div
                                    key={c._id}
                                    className={`flex items-center justify-between p-3 rounded-lg border transition cursor-pointer ${selectedClass === c.name ? 'border-indigo-500 bg-indigo-50 text-indigo-700 font-bold' : 'border-gray-200 hover:bg-gray-50'}`}
                                    onClick={() => handleSelectClass(c.name)}
                                >
                                    <span>{c.name}</span>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); handleDeleteClass(c._id); }}
                                        className="text-red-500 hover:text-red-700 p-1"
                                        title="حذف الصف"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Students Section */}
                <div className="lg:col-span-3 space-y-6">
                    {selectedClass ? (
                        <>
                            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between gap-4">
                                <div>
                                    <h3 className="text-xl font-bold">إضافة طالب في <span className="text-indigo-600">{selectedClass}</span></h3>
                                </div>
                                <form action={handleAddStudent} className="flex gap-4 flex-1 max-w-lg">
                                    <input type="text" name="name" required className="flex-1 p-3 border rounded-lg focus:ring-2 focus:ring-indigo-500" placeholder="اسم الطالب" />
                                    <button type="submit" disabled={isPending || plan === 'test'} className="px-6 py-3 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 transition disabled:opacity-50 whitespace-nowrap">
                                        إضافة
                                    </button>
                                </form>
                            </div>

                            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                                <table className="w-full text-right">
                                    <thead className="bg-gray-50 border-b">
                                        <tr>
                                            <th className="p-4 text-sm font-semibold text-gray-600">اسم الطالب</th>
                                            <th className="p-4 text-sm font-semibold text-gray-600 w-32">الإجراءات</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {filteredStudents.length === 0 ? (
                                            <tr>
                                                <td colSpan={2} className="p-8 text-center text-gray-500">لا يوجد طلاب في هذا الصف</td>
                                            </tr>
                                        ) : (
                                            filteredStudents.map((s) => (
                                                <tr key={s._id} className="hover:bg-gray-50 transition">
                                                    <td className="p-4 font-medium text-gray-900">{s.name}</td>
                                                    <td className="p-4">
                                                        <button onClick={() => handleDeleteStudent(s._id)} className="text-red-500 hover:text-red-700 text-sm bg-red-50 px-3 py-1 rounded-md transition">حذف</button>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </>
                    ) : (
                        <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 text-center text-gray-500">
                            يرجى إضافة أو اختيار صف أولاً لإدارة الطلاب
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
