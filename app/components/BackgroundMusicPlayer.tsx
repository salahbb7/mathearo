'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const BG_MUSIC_SRC = '/uploads/background%20music%20.mp3';

export default function BackgroundMusicPlayer() {
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const [volume, setVolume] = useState(50);
    const [muted, setMuted] = useState(false);
    const [playing, setPlaying] = useState(false);
    const [open, setOpen] = useState(false);
    // "waiting" = autoplay blocked, waiting for first user gesture
    const [waitingForGesture, setWaitingForGesture] = useState(false);

    // ── 1. Fetch teacher-configured volume ──────────────────────────────
    useEffect(() => {
        fetch('/api/settings')
            .then((r) => r.json())
            .then((data) => {
                const vol = typeof data.backgroundMusicVolume === 'number'
                    ? data.backgroundMusicVolume
                    : 50;
                setVolume(vol);
                if (audioRef.current) {
                    audioRef.current.volume = vol / 100;
                }
            })
            .catch(() => { });
    }, []);

    // ── 2. Create audio element & attempt immediate autoplay ────────────
    useEffect(() => {
        const audio = new Audio(BG_MUSIC_SRC);
        audio.loop = true;
        audio.preload = 'auto';
        audio.volume = volume / 100;
        audioRef.current = audio;

        // Try to auto-play immediately
        audio.play()
            .then(() => {
                setPlaying(true);
                setWaitingForGesture(false);
            })
            .catch(() => {
                // Blocked by browser autoplay policy — unlock on first gesture
                setWaitingForGesture(true);

                const unlock = () => {
                    audio.play()
                        .then(() => {
                            setPlaying(true);
                            setWaitingForGesture(false);
                        })
                        .catch(() => { });
                    // Remove all listeners once triggered
                    document.removeEventListener('click', unlock);
                    document.removeEventListener('keydown', unlock);
                    document.removeEventListener('touchstart', unlock);
                    document.removeEventListener('pointerdown', unlock);
                };

                document.addEventListener('click', unlock);
                document.addEventListener('keydown', unlock);
                document.addEventListener('touchstart', unlock);
                document.addEventListener('pointerdown', unlock);
            });

        return () => {
            audio.pause();
            audio.src = '';
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // ── 3. Sync volume & mute to audio element ──────────────────────────
    useEffect(() => {
        if (audioRef.current) {
            audioRef.current.volume = muted ? 0 : volume / 100;
        }
    }, [volume, muted]);

    // ── 4. Manual play/pause toggle ────────────────────────────────────
    const togglePlay = () => {
        if (!audioRef.current) return;
        if (playing) {
            audioRef.current.pause();
            setPlaying(false);
        } else {
            audioRef.current.play()
                .then(() => {
                    setPlaying(true);
                    setWaitingForGesture(false);
                })
                .catch(() => { });
        }
    };

    const icon = waitingForGesture
        ? '🎵'
        : !playing
            ? '⏸'
            : muted || volume === 0
                ? '🔇'
                : volume < 50
                    ? '🔉'
                    : '🔊';

    return (
        <div className="fixed bottom-6 left-6 z-[9999] flex flex-col items-start gap-2">

            {/* ── "Tap anywhere to enable music" nudge ── */}
            <AnimatePresence>
                {waitingForGesture && !open && (
                    <motion.div
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -10 }}
                        className="bg-slate-900/90 backdrop-blur-md border border-sky-500/60 text-sky-200 text-xs font-bold px-3 py-2 rounded-xl shadow-lg whitespace-nowrap"
                        dir="rtl"
                    >
                        🎵 انقر في أي مكان لتشغيل الموسيقى
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ── Expanded control panel ── */}
            <AnimatePresence>
                {open && (
                    <motion.div
                        initial={{ opacity: 0, y: 12, scale: 0.92 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 12, scale: 0.92 }}
                        transition={{ type: 'spring', stiffness: 320, damping: 28 }}
                        className="bg-slate-900/95 backdrop-blur-xl border border-slate-600/80 rounded-2xl p-4 shadow-2xl w-60 space-y-3"
                        dir="rtl"
                    >
                        {/* Title + play/pause */}
                        <div className="flex items-center justify-between">
                            <p className="text-white text-sm font-bold">🎵 الموسيقى الخلفية</p>
                            <button
                                onClick={togglePlay}
                                className={`text-xs font-bold px-2.5 py-1 rounded-lg transition-all border ${playing
                                        ? 'bg-sky-500 border-sky-400 text-white'
                                        : 'bg-slate-700 border-slate-600 text-slate-300 hover:bg-slate-600'
                                    }`}
                            >
                                {playing ? '⏸ إيقاف' : '▶ تشغيل'}
                            </button>
                        </div>

                        {/* Status */}
                        {waitingForGesture && (
                            <p className="text-amber-400 text-xs text-center font-semibold">
                                ⚡ انقر في أي مكان لبدء التشغيل التلقائي
                            </p>
                        )}

                        {/* Volume slider */}
                        <div className="space-y-1.5">
                            <div className="flex items-center gap-2">
                                <span className="text-base select-none">🔇</span>
                                <input
                                    type="range"
                                    min={0}
                                    max={100}
                                    step={1}
                                    value={volume}
                                    onChange={(e) => {
                                        const v = Number(e.target.value);
                                        setVolume(v);
                                        if (v > 0 && muted) setMuted(false);
                                    }}
                                    className="flex-1 accent-sky-400 cursor-pointer h-1.5"
                                />
                                <span className="text-base select-none">🔊</span>
                            </div>
                            {/* Fill bar */}
                            <div className="relative h-1.5 bg-slate-700 rounded-full overflow-hidden">
                                <div
                                    className="h-full rounded-full transition-all duration-100"
                                    style={{
                                        width: `${playing && !muted ? volume : 0}%`,
                                        background: 'linear-gradient(90deg, #38bdf8, #818cf8)',
                                    }}
                                />
                            </div>
                        </div>

                        {/* Volume % + mute */}
                        <div className="flex items-center justify-between">
                            <span className="text-sky-300 font-mono font-bold text-sm">
                                {playing ? `${muted ? 'مكتوم' : volume + '%'}` : 'متوقف'}
                            </span>
                            <button
                                onClick={() => setMuted((m) => !m)}
                                className={`text-xs px-3 py-1 rounded-lg font-bold transition-all border ${muted
                                        ? 'bg-red-700/80 border-red-600 text-red-100'
                                        : 'bg-slate-700 border-slate-600 text-slate-300 hover:bg-slate-600'
                                    }`}
                            >
                                {muted ? '🔊 رفع الكتم' : '🔇 كتم'}
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ── Floating toggle button ── */}
            <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.92 }}
                onClick={() => setOpen((o) => !o)}
                title="الموسيقى الخلفية"
                className={`
                    w-12 h-12 rounded-full flex items-center justify-center text-xl
                    shadow-lg border-2 transition-all duration-200 select-none relative
                    ${open
                        ? 'bg-sky-500 border-sky-300 shadow-sky-500/40'
                        : playing
                            ? 'bg-slate-800/90 border-sky-500/70 shadow-sky-500/20'
                            : 'bg-slate-800/90 border-slate-600 hover:border-sky-500'
                    }
                `}
            >
                {/* Pulsing ring while playing */}
                {playing && !muted && (
                    <span className="absolute inset-0 rounded-full border-2 border-sky-400/50 animate-ping" />
                )}
                {icon}
            </motion.button>
        </div>
    );
}
