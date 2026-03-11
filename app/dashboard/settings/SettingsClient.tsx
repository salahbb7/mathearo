'use client';

import React, { useState, useEffect, useRef } from 'react';
import { updateSettings } from '@/app/actions/settings';

type TeacherSettingsType = {
    successSoundUrl?: string;
    errorSoundUrl?: string;
};

export default function SettingsClient({ initialSettings }: { initialSettings: TeacherSettingsType }) {
    const [isPending, startTransition] = React.useTransition();
    const [message, setMessage] = useState('');

    // ── Background music volume (read from & saved to GameSettings via /api/settings) ──
    const [musicVolume, setMusicVolume] = useState<number>(50);
    const [volumeLoaded, setVolumeLoaded] = useState(false);
    const [isPreviewPlaying, setIsPreviewPlaying] = useState(false);
    const previewAudioRef = useRef<HTMLAudioElement | null>(null);

    // Fetch the current game-wide volume on mount
    useEffect(() => {
        fetch('/api/settings')
            .then((r) => r.json())
            .then((data) => {
                setMusicVolume(data.backgroundMusicVolume ?? 50);
                setVolumeLoaded(true);
            })
            .catch(() => setVolumeLoaded(true));
    }, []);

    // Keep preview audio volume in sync with slider
    useEffect(() => {
        if (previewAudioRef.current) {
            previewAudioRef.current.volume = musicVolume / 100;
        }
    }, [musicVolume]);

    const togglePreview = () => {
        if (!previewAudioRef.current) {
            const audio = new Audio('/uploads/background music .mp3');
            audio.loop = true;
            audio.volume = musicVolume / 100;
            audio.play().catch(() => { });
            previewAudioRef.current = audio;
            setIsPreviewPlaying(true);
        } else if (isPreviewPlaying) {
            previewAudioRef.current.pause();
            setIsPreviewPlaying(false);
        } else {
            previewAudioRef.current.play().catch(() => { });
            setIsPreviewPlaying(true);
        }
    };

    // Stop preview on unmount
    useEffect(() => {
        return () => {
            previewAudioRef.current?.pause();
        };
    }, []);

    const submitAction = async (formData: FormData) => {
        startTransition(async () => {
            // 1. Save teacher-specific sounds (success/error) via server action
            await updateSettings(formData);

            // 2. Save the music volume to the global GameSettings via /api/settings
            const gameFormData = new FormData();
            gameFormData.set('backgroundMusicVolume', String(musicVolume));
            await fetch('/api/settings', {
                method: 'POST',
                body: gameFormData,
            });

            setMessage('تم حفظ الإعدادات بنجاح! ✅');
            setTimeout(() => setMessage(''), 3000);
        });
    };

    return (
        <div className="max-w-xl mx-auto space-y-8 animate-in fade-in" dir="rtl">
            <header>
                <h2 className="text-3xl font-extrabold text-gray-900 border-r-4 border-indigo-500 pr-4">
                    الإعدادات
                </h2>
                <p className="mt-2 text-gray-500 text-sm">تخصيص الأصوات لكل مدرس.</p>
            </header>

            {message && (
                <div className="p-4 bg-green-100 text-green-800 rounded-xl font-semibold text-center border border-green-300 shadow-sm">
                    {message}
                </div>
            )}

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <form action={submitAction} className="space-y-6">

                    {/* ── Success Sound ── */}
                    <div>
                        <label className="block text-sm font-medium mb-1">
                            🎉 ملف صوت الإجابة الصحيحة
                        </label>
                        <input
                            type="file"
                            accept="audio/*"
                            name="successSoundUrl"
                            className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-indigo-500 text-right"
                        />
                        {initialSettings?.successSoundUrl ? (
                            <div className="mt-2">
                                <p className="text-xs text-gray-500 mb-1">
                                    الملف الحالي (سيبقى كما هو إن لم تختر ملفاً جديداً):
                                </p>
                                <audio controls src={initialSettings.successSoundUrl} className="w-full h-9" />
                            </div>
                        ) : (
                            <p className="text-xs text-gray-400 mt-1">يُستخدم الصوت الافتراضي حالياً.</p>
                        )}
                    </div>

                    {/* ── Error Sound ── */}
                    <div>
                        <label className="block text-sm font-medium mb-1">
                            ❌ ملف صوت الإجابة الخاطئة
                        </label>
                        <input
                            type="file"
                            accept="audio/*"
                            name="errorSoundUrl"
                            className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-indigo-500 text-right"
                        />
                        {initialSettings?.errorSoundUrl ? (
                            <div className="mt-2">
                                <p className="text-xs text-gray-500 mb-1">
                                    الملف الحالي (سيبقى كما هو إن لم تختر ملفاً جديداً):
                                </p>
                                <audio controls src={initialSettings.errorSoundUrl} className="w-full h-9" />
                            </div>
                        ) : (
                            <p className="text-xs text-gray-400 mt-1">يُستخدم الصوت الافتراضي حالياً.</p>
                        )}
                    </div>

                    {/* ── Background Music Volume ── */}
                    <div className="rounded-2xl border-2 border-indigo-200 bg-gradient-to-br from-indigo-50 to-sky-50 p-5 space-y-4">
                        <div className="flex items-center justify-between">
                            <label className="text-base font-bold text-indigo-900">
                                🎵 مستوى صوت الموسيقى الخلفية
                            </label>
                            {/* Preview toggle */}
                            <button
                                type="button"
                                onClick={togglePreview}
                                className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg transition-all border ${isPreviewPlaying
                                        ? 'bg-indigo-600 text-white border-indigo-700 shadow-md'
                                        : 'bg-white text-indigo-600 border-indigo-300 hover:bg-indigo-50'
                                    }`}
                            >
                                {isPreviewPlaying ? '⏸ إيقاف المعاينة' : '▶ معاينة'}
                            </button>
                        </div>

                        {/* Music file label */}
                        <div className="flex items-center gap-2 text-xs text-gray-500 bg-white/70 rounded-lg px-3 py-2 border border-indigo-100">
                            <span>🎶</span>
                            <span className="font-mono text-indigo-700 font-semibold">
                                /uploads/background music .mp3
                            </span>
                        </div>

                        {/* Volume Slider */}
                        {volumeLoaded ? (
                            <div className="space-y-2">
                                <div className="flex items-center gap-3">
                                    <span className="text-xl select-none">🔇</span>
                                    <input
                                        type="range"
                                        min={0}
                                        max={100}
                                        step={1}
                                        value={musicVolume}
                                        onChange={(e) => setMusicVolume(Number(e.target.value))}
                                        className="flex-1 accent-indigo-600 cursor-pointer h-2"
                                        id="bgMusicVolume"
                                    />
                                    <span className="text-xl select-none">🔊</span>
                                </div>
                                {/* Visual volume bar */}
                                <div className="relative h-2 bg-indigo-100 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-gradient-to-r from-indigo-400 to-sky-500 rounded-full transition-all duration-100"
                                        style={{ width: `${musicVolume}%` }}
                                    />
                                </div>
                                <div className="flex justify-between items-center">
                                    <p className="text-xs text-gray-400">
                                        اضبط مستوى صوت الموسيقى التي تعزف في خلفية الألعاب.
                                    </p>
                                    <span className="text-lg font-black text-indigo-700 bg-white border-2 border-indigo-200 rounded-xl px-3 py-1 shadow-sm min-w-[56px] text-center">
                                        {musicVolume}%
                                    </span>
                                </div>
                            </div>
                        ) : (
                            <div className="h-10 bg-indigo-100 rounded-lg animate-pulse" />
                        )}
                    </div>

                    {/* ── Save Button ── */}
                    <button
                        type="submit"
                        disabled={isPending}
                        className="w-full py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 active:bg-indigo-800 transition-all disabled:opacity-50 shadow-md text-lg"
                    >
                        {isPending ? '⏳ جاري الحفظ...' : '💾 حفظ الإعدادات'}
                    </button>
                </form>
            </div>
        </div>
    );
}
