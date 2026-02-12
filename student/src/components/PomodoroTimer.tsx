import { useState, useEffect, useCallback, useRef } from 'react';
import { Play, Pause, RotateCcw, Timer, Coffee, Zap, Music, Maximize2, Minimize2, SkipBack, SkipForward, Volume2, ListMusic, Repeat, Repeat1, GripVertical } from 'lucide-react';
import { FullScreen, useFullScreenHandle } from "react-full-screen";
import axiosClient from '../api/axiosClient';

type TimerType = 'focus' | 'break';

interface LofiTrack {
    title: string;
    artist: string;
    url: string;
}

export default function PomodoroTimer() {
    const [timerType, setTimerType] = useState<TimerType>('focus');
    const [focusHours, setFocusHours] = useState(0);
    const [focusMinutes, setFocusMinutes] = useState(25);
    const [breakHours, setBreakHours] = useState(0);
    const [breakMinutes, setBreakMinutes] = useState(5);

    const [timeLeft, setTimeLeft] = useState(25 * 60);
    const [isActive, setIsActive] = useState(false);
    const [showMusic, setShowMusic] = useState(false);
    const [isFullScreen, setIsFullScreen] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [fsBackground, setFsBackground] = useState('bg-[#090b10]');
    const [bgType, setBgType] = useState<'color' | 'video'>('color');
    const [videoUrl, setVideoUrl] = useState('');
    const [showPlaylist, setShowPlaylist] = useState(false);
    const handle = useFullScreenHandle();

    // Body scroll locking
    useEffect(() => {
        if (isFullScreen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
            setBgType('color'); // Reset to color on exit for performance
        }
        return () => { document.body.style.overflow = 'unset'; };
    }, [isFullScreen]);

    // ... (rest of the state/functions)

    // Helper for theme selection
    const handleThemeChange = (theme: { class?: string, type: 'color' | 'video', url?: string }) => {
        setBgType(theme.type);
        if (theme.type === 'color' && theme.class) {
            setFsBackground(theme.class);
        } else if (theme.type === 'video' && theme.url) {
            setVideoUrl(theme.url);
        }
    };

    // --- Music Player State ---
    const [tracks, setTracks] = useState<LofiTrack[]>([]);
    const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
    const [isMusicPlaying, setIsMusicPlaying] = useState(false);
    const [volume, setVolume] = useState(0.5);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [loadingTracks, setLoadingTracks] = useState(true);
    const [isLooping, setIsLooping] = useState(false);
    const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    useEffect(() => {
        fetchTracks();
    }, []);

    const fetchTracks = async () => {
        try {
            setLoadingTracks(true);
            const response = await axiosClient.get('/api/get_lofi_songs.php');
            if (response.data.status === 'success' && response.data.data.length > 0) {
                setTracks(response.data.data);
            }
        } catch (error) {
            console.error('Failed to fetch lofi tracks:', error);
            // High-quality stable fallbacks
            setTracks([
                { title: 'Late Night Study', artist: 'Lofi Relax', url: 'https://cdn.pixabay.com/audio/2022/05/27/audio_1808f3030e.mp3' },
                { title: 'Rainy Day Lofi', artist: 'Ambiance', url: 'https://cdn.pixabay.com/audio/2023/10/25/audio_73f0808a3d.mp3' },
                { title: 'Theta Waves (432Hz)', artist: 'Deep Focus', url: 'https://cdn.pixabay.com/audio/2022/03/24/audio_386236317b.mp3' }
            ]);
        } finally {
            setLoadingTracks(false);
        }
    };

    const getDuration = (type: TimerType) => {
        if (type === 'focus') return (focusHours * 3600) + (focusMinutes * 60);
        return (breakHours * 3600) + (breakMinutes * 60);
    };

    const configs = {
        focus: { label: 'Focus Session', color: 'blue', icon: Zap },
        break: { label: 'Break Time', color: 'emerald', icon: Coffee },
    };

    const toggleTimerType = useCallback(() => {
        const nextType = timerType === 'focus' ? 'break' : 'focus';
        setTimerType(nextType);
        setTimeLeft(getDuration(nextType));
        setIsActive(false);
    }, [timerType, focusHours, focusMinutes, breakHours, breakMinutes]);

    useEffect(() => {
        let interval: any = null;
        if (isActive && timeLeft > 0) {
            interval = setInterval(() => {
                setTimeLeft((prev) => prev - 1);
            }, 1000);
        } else if (timeLeft === 0) {
            setIsActive(false);
            const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
            audio.play().catch(() => { });
            if (window.confirm(`${configs[timerType].label} finished! Switch to ${timerType === 'focus' ? 'Break' : 'Focus'}?`)) {
                toggleTimerType();
            }
        }
        return () => clearInterval(interval);
    }, [isActive, timeLeft]);

    // --- Music Controller Functions ---
    const handleVolumeChange = (newVolume: number) => {
        setVolume(newVolume);
        if (audioRef.current) {
            audioRef.current.volume = newVolume;
        }
    };

    useEffect(() => {
        if (audioRef.current) {
            audioRef.current.volume = volume;
            audioRef.current.onplay = () => {
                if (audioRef.current) audioRef.current.volume = volume;
            };
        }
    }, [volume, currentTrackIndex]);

    useEffect(() => {
        if (isMusicPlaying) {
            audioRef.current?.play().catch(() => setIsMusicPlaying(false));
        } else {
            audioRef.current?.pause();
        }
    }, [isMusicPlaying, currentTrackIndex]);

    const handleDragStart = (index: number) => {
        setDraggedIndex(index);
    };

    const handleDragOver = (e: React.DragEvent, index: number) => {
        e.preventDefault();
        if (draggedIndex === null || draggedIndex === index) return;

        const newTracks = [...tracks];
        const item = newTracks[draggedIndex];
        newTracks.splice(draggedIndex, 1);
        newTracks.splice(index, 0, item);

        setDraggedIndex(index);
        setTracks(newTracks);

        // Adjust currentTrackIndex if current playing track was moved
        if (currentTrackIndex === draggedIndex) {
            setCurrentTrackIndex(index);
        } else if (currentTrackIndex > draggedIndex && currentTrackIndex <= index) {
            setCurrentTrackIndex(currentTrackIndex - 1);
        } else if (currentTrackIndex < draggedIndex && currentTrackIndex >= index) {
            setCurrentTrackIndex(currentTrackIndex + 1);
        }
    };

    const handleDragEnd = () => {
        setDraggedIndex(null);
    };

    const handleNextTrack = () => {
        if (tracks.length === 0) return;
        setCurrentTrackIndex((prev) => (prev + 1) % tracks.length);
    };

    const handlePrevTrack = () => {
        if (tracks.length === 0) return;
        setCurrentTrackIndex((prev) => (prev - 1 + tracks.length) % tracks.length);
    };

    const formatTime = (seconds: number) => {
        const hrs = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        if (hrs > 0) {
            return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        }
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const currentDuration = getDuration(timerType);
    const progress = (timeLeft / (currentDuration || 1)) * 100;
    const activeConfig = configs[timerType];

    const handleTimeChange = (timer: 'focus' | 'break', unit: 'h' | 'm', value: string) => {
        const val = Math.max(0, parseInt(value) || 0);
        if (timer === 'focus') {
            if (unit === 'h') setFocusHours(Math.min(val, 23));
            else setFocusMinutes(Math.min(val, 59));
        } else {
            if (unit === 'h') setBreakHours(Math.min(val, 23));
            else setBreakMinutes(Math.min(val, 59));
        }
        setIsActive(false);
    };

    useEffect(() => {
        if (!isActive) {
            setTimeLeft(getDuration(timerType));
        }
    }, [focusHours, focusMinutes, breakHours, breakMinutes, timerType]);

    const currentTrack = tracks[currentTrackIndex];

    return (
        <FullScreen handle={handle} onChange={(state) => setIsFullScreen(state)}>
            <div className={`bg-[#0c0e12] dark:bg-[#090b10] rounded-[2.5rem] p-6 lg:p-8 border border-white/5 shadow-2xl relative overflow-hidden h-full flex flex-col group ${isFullScreen ? 'w-screen h-screen rounded-none' : ''}`}>
                <style>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 4px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: rgba(255, 255, 255, 0.02);
                    border-radius: 10px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: rgba(34, 197, 94, 0.2);
                    border-radius: 10px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: rgba(34, 197, 94, 0.5);
                }
            `}</style>
                {currentTrack && (
                    <audio
                        ref={audioRef}
                        src={currentTrack.url}
                        onEnded={isLooping ? undefined : handleNextTrack}
                        loop={isLooping}
                        preload="auto"
                        onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
                        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
                    />
                )}

                <div className="relative z-10 flex flex-col h-full">
                    <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setTimerType(timerType === 'focus' ? 'break' : 'focus')}
                                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${timerType === 'focus'
                                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                                    : 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20'
                                    }`}
                            >
                                {timerType}
                            </button>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setShowSettings(!showSettings)}
                                className={`p-3 rounded-xl transition-all ${showSettings ? 'bg-orange-500 text-white' : 'bg-white/5 text-gray-400'}`}
                            >
                                <Timer size={18} />
                            </button>
                            <button
                                onClick={() => handle.enter()}
                                className="p-3 bg-white/5 text-gray-400 hover:text-blue-500 rounded-xl transition-all"
                            >
                                <Maximize2 size={18} />
                            </button>
                            <button
                                onClick={() => setShowMusic(!showMusic)}
                                className={`p-3 rounded-xl transition-all shrink-0 ${showMusic ? 'bg-green-500 text-white' : 'bg-white/5 text-gray-400'}`}
                            >
                                <Music size={18} />
                            </button>
                        </div>
                    </div>

                    <div className="flex flex-col items-center justify-center flex-1 space-y-8">
                        {showSettings ? (
                            <div className="w-full space-y-6 animate-in fade-in zoom-in-95 duration-300">
                                <div className="space-y-4">
                                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest text-center">Focus Duration</p>
                                    <div className="flex justify-center gap-4">
                                        <div className="text-center">
                                            <input type="number" value={focusHours} onChange={(e) => handleTimeChange('focus', 'h', e.target.value)} className="w-16 bg-white/5 border-b-2 border-blue-500 text-2xl font-black text-center text-white focus:outline-none rounded-t-lg" />
                                            <p className="text-[8px] text-gray-500 mt-1 uppercase font-bold">Hrs</p>
                                        </div>
                                        <div className="text-center">
                                            <input type="number" value={focusMinutes} onChange={(e) => handleTimeChange('focus', 'm', e.target.value)} className="w-16 bg-white/5 border-b-2 border-blue-500 text-2xl font-black text-center text-white focus:outline-none rounded-t-lg" />
                                            <p className="text-[8px] text-gray-500 mt-1 uppercase font-bold">Min</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest text-center">Break Duration</p>
                                    <div className="flex justify-center gap-4">
                                        <div className="text-center">
                                            <input type="number" value={breakHours} onChange={(e) => handleTimeChange('break', 'h', e.target.value)} className="w-16 bg-white/5 border-b-2 border-emerald-500 text-2xl font-black text-center text-white focus:outline-none rounded-t-lg" />
                                            <p className="text-[8px] text-gray-500 mt-1 uppercase font-bold">Hrs</p>
                                        </div>
                                        <div className="text-center">
                                            <input type="number" value={breakMinutes} onChange={(e) => handleTimeChange('break', 'm', e.target.value)} className="w-16 bg-white/5 border-b-2 border-emerald-500 text-2xl font-black text-center text-white focus:outline-none rounded-t-lg" />
                                            <p className="text-[8px] text-gray-500 mt-1 uppercase font-bold">Min</p>
                                        </div>
                                    </div>
                                </div>
                                <button onClick={() => setShowSettings(false)} className="w-full py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all">
                                    Save Settings
                                </button>
                            </div>
                        ) : (
                            <div className="relative inline-block scale-[0.85] sm:scale-100 transition-transform">
                                <div className={`absolute -inset-4 bg-${activeConfig.color}-500/10 rounded-full blur-2xl animate-pulse`} />
                                <svg className="w-48 h-48 transform -rotate-90 relative">
                                    <circle cx="96" cy="96" r="90" stroke="currentColor" strokeWidth="4" fill="transparent" className="text-white/5" />
                                    <circle
                                        cx="96" cy="96" r="90" stroke="currentColor" strokeWidth="4" fill="transparent"
                                        strokeDasharray={565} strokeDashoffset={565 - (565 * progress) / 100}
                                        className={`text-${activeConfig.color}-500 transition-all duration-1000 ease-linear shadow-[0_0_15px_rgba(59,130,246,0.5)]`}
                                        strokeLinecap="round"
                                    />
                                </svg>
                                <div className="absolute inset-0 flex flex-col items-center justify-center">
                                    <span className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em] mb-1">Focus Active</span>
                                    <span className="text-5xl font-black text-white tracking-widest tabular-nums">{formatTime(timeLeft)}</span>
                                    <span className={`text-[9px] font-black text-${activeConfig.color}-500 uppercase tracking-widest mt-2 px-3 py-1 bg-${activeConfig.color}-500/10 rounded-full`}>
                                        {activeConfig.label}
                                    </span>
                                </div>
                            </div>
                        )}

                        <div className="w-full space-y-6">
                            {showMusic ? (
                                <div className="bg-white/5 rounded-3xl p-4 border border-white/5 animate-in zoom-in-95 duration-300">
                                    {loadingTracks ? (
                                        <div className="flex items-center justify-center p-4">
                                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-500"></div>
                                        </div>
                                    ) : currentTrack ? (
                                        <div className="flex flex-col gap-4">
                                            <div className="flex items-center gap-4">
                                                <button
                                                    onClick={() => setShowPlaylist(!showPlaylist)}
                                                    className="w-12 h-12 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-green-500/20 group relative overflow-hidden"
                                                >
                                                    <Music size={20} className={`text-white relative z-10 ${isMusicPlaying ? 'animate-bounce' : ''}`} />
                                                    <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                                                </button>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-[11px] font-black text-white truncate uppercase tracking-wider">{currentTrack.title}</p>
                                                    <p className="text-[9px] text-gray-500 font-bold uppercase tracking-widest truncate">{currentTrack.artist}</p>
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <button onClick={handlePrevTrack} className="p-2 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-all">
                                                        <SkipBack size={16} fill="currentColor" />
                                                    </button>
                                                    <button
                                                        onClick={() => setIsMusicPlaying(!isMusicPlaying)}
                                                        className="w-10 h-10 bg-white text-black rounded-full flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-xl"
                                                    >
                                                        {isMusicPlaying ? <Pause size={18} fill="black" /> : <Play size={18} className="translate-x-0.5" fill="black" />}
                                                    </button>
                                                    <button onClick={handleNextTrack} className="p-2 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-all">
                                                        <SkipForward size={16} fill="currentColor" />
                                                    </button>
                                                    <button
                                                        onClick={() => setIsLooping(!isLooping)}
                                                        className={`p-2 rounded-lg transition-all ${isLooping ? 'text-green-500' : 'text-gray-400 hover:text-white'}`}
                                                    >
                                                        {isLooping ? <Repeat1 size={16} /> : <Repeat size={16} />}
                                                    </button>
                                                </div>
                                            </div>

                                            {showPlaylist && (
                                                <div className="max-h-56 overflow-y-auto space-y-1 custom-scrollbar animate-in slide-in-from-top-2 pr-1">
                                                    {tracks.map((track, idx) => (
                                                        <div
                                                            key={`${track.url}-${idx}`}
                                                            draggable
                                                            onDragStart={() => handleDragStart(idx)}
                                                            onDragOver={(e) => handleDragOver(e, idx)}
                                                            onDragEnd={handleDragEnd}
                                                            className={`w-full flex items-center gap-2 p-2 rounded-xl transition-all cursor-move group/item ${currentTrackIndex === idx ? 'bg-white/10' : 'hover:bg-white/5'}`}
                                                        >
                                                            <GripVertical size={12} className="text-white/10 group-hover/item:text-white/30 transition-colors" />
                                                            <button
                                                                onClick={() => {
                                                                    setCurrentTrackIndex(idx);
                                                                    setIsMusicPlaying(true);
                                                                }}
                                                                className="flex-1 flex items-center gap-2 text-left truncate"
                                                            >
                                                                <Music size={12} className={currentTrackIndex === idx ? 'text-green-500' : 'text-white/20'} />
                                                                <p className={`text-[10px] font-bold truncate ${currentTrackIndex === idx ? 'text-green-500' : 'text-white'}`}>{track.title}</p>
                                                            </button>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}

                                            <div className="flex items-center gap-3 mr-6">
                                                <Volume2 size={12} className="text-gray-500" />
                                                <input
                                                    type="range"
                                                    min="0"
                                                    max="1"
                                                    step="0.01"
                                                    value={volume}
                                                    onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                                                    className="flex-1 h-1 rounded-lg appearance-none cursor-pointer accent-green-500 bg-white/10"
                                                    style={{
                                                        background: `linear-gradient(to right, #22c55e ${volume * 100}%, rgba(255,255,255,0.1) ${volume * 100}%)`
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    ) : (
                                        <p className="text-[9px] text-gray-500 text-center uppercase font-bold tracking-widest">No tracks available</p>
                                    )}
                                </div>
                            ) : (
                                <div className="bg-gray-50 dark:bg-gray-800/50 rounded-3xl p-4 border border-dashed border-gray-100 dark:border-gray-800 flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-white dark:bg-gray-800 flex items-center justify-center text-gray-400">
                                        <Music size={18} />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-gray-900 dark:text-white uppercase tracking-wider leading-none">Focus Music</p>
                                        <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest mt-1">Custom Lo-fi Engine</p>
                                    </div>
                                </div>
                            )}

                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => setIsActive(!isActive)}
                                    className={`flex-1 flex items-center justify-center gap-3 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] sm:text-xs transition-all shadow-xl hover:-translate-y-1 ${isActive
                                        ? 'bg-white text-gray-900'
                                        : `bg-${activeConfig.color}-600 text-white shadow-${activeConfig.color}-600/30`
                                        }`}
                                >
                                    {isActive ? <><Pause size={18} /> PAUSE</> : <><Play size={16} /> START FOCUS</>}
                                </button>
                                <button
                                    onClick={() => {
                                        setIsActive(false);
                                        setTimeLeft(getDuration(timerType));
                                    }}
                                    className="p-4 bg-white/5 text-gray-400 hover:text-white rounded-2xl transition-all"
                                >
                                    <RotateCcw size={18} />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {isFullScreen && (
                    <div className={`fixed inset-0 z-[100] ${bgType === 'color' ? fsBackground : 'bg-black'} flex flex-col items-center justify-center animate-in fade-in duration-500 overflow-hidden select-none`}>

                        {/* Video Background */}
                        {bgType === 'video' && videoUrl && (
                            <video
                                autoPlay
                                loop
                                muted
                                playsInline
                                className="absolute inset-0 w-full h-full object-cover opacity-60 transition-opacity duration-1000"
                                src={videoUrl}
                            />
                        )}

                        {/* Background Accents (Only for color mode) */}
                        {bgType === 'color' && (
                            <div className="absolute inset-0 overflow-hidden opacity-30 pointer-events-none">
                                <div className={`absolute -top-[10%] -left-[10%] w-[40%] h-[40%] rounded-full blur-[120px] bg-${activeConfig.color}-500/20 animate-pulse`} />
                                <div className={`absolute -bottom-[10%] -right-[10%] w-[40%] h-[40%] rounded-full blur-[120px] bg-${activeConfig.color}-400/10 animate-pulse delay-1000`} />
                            </div>
                        )}

                        {/* Top Controls: Background Picker & Minimize (Scaled Down) */}
                        <div className="absolute top-6 left-0 right-0 px-8 flex items-center justify-between z-50">
                            <div className="flex items-center gap-2 bg-black/20 backdrop-blur-xl p-1.5 rounded-2xl border border-white/10">
                                {[
                                    { class: 'bg-[#090b10]', label: 'Space', type: 'color' as const },
                                    { class: 'bg-[#064e3b]', label: 'Forest', type: 'color' as const },
                                    { class: 'bg-[#451a03]', label: 'Sunset', type: 'color' as const },
                                    { label: 'Rain', type: 'video' as const, url: 'https://player.vimeo.com/external/517614068.hd.mp4?s=6a57582b173cc62b32f91567954955615795495&profile_id=175', iconColor: 'bg-blue-400' },
                                    { label: 'Study', type: 'video' as const, url: 'https://player.vimeo.com/external/494665487.hd.mp4?s=4bbcc62b32f91567954955615795495&profile_id=175', iconColor: 'bg-indigo-400' },
                                    { label: 'Galaxy', type: 'video' as const, url: 'https://player.vimeo.com/external/369796464.hd.mp4?s=4bbcc62b32f91567954955615795495&profile_id=175', iconColor: 'bg-purple-500' },
                                ].map((bg, i) => (
                                    <button
                                        key={i}
                                        onClick={() => handleThemeChange(bg)}
                                        className={`w-6 h-6 rounded-full border-2 transition-all hover:scale-110 ${bg.type === 'color' ? bg.class : bg.iconColor} ${(bg.type === 'color' && fsBackground === bg.class) || (bg.type === 'video' && videoUrl === bg.url) ? 'border-white scale-110 shadow-lg' : 'border-transparent'}`}
                                        title={bg.label}
                                    />
                                ))}
                            </div>
                            <button
                                onClick={() => handle.exit()}
                                className="p-3 bg-white/5 backdrop-blur-xl text-white/50 hover:text-red-500 rounded-xl transition-all hover:scale-110 active:scale-95 border border-white/10"
                            >
                                <Minimize2 size={20} />
                            </button>
                        </div>

                        {/* Main Content: Timer (Scaled Down) */}
                        <div className="relative z-10 flex flex-col items-center justify-center space-y-8 max-w-2xl w-full px-6 flex-1 pt-8">
                            <div className="text-center space-y-1">
                                <span className="text-[10px] font-black text-white/30 uppercase tracking-[0.8em] block">
                                    Focus Integrated
                                </span>
                                <h2 className="text-2xl font-black text-white tracking-tight">
                                    {activeConfig.label}
                                </h2>
                            </div>

                            <div className="relative group/timer transition-all duration-700 hover:scale-[1.02]">
                                <div className={`absolute inset-0 bg-${activeConfig.color}-500/20 rounded-full blur-[80px] opacity-20 group-hover/timer:opacity-40 transition-opacity`} />

                                <svg className="w-64 h-64 sm:w-80 sm:h-80 transform -rotate-90 relative">
                                    <circle cx="50%" cy="50%" r="46%" stroke="currentColor" strokeWidth="2" fill="transparent" className="text-white/5" />
                                    <circle
                                        cx="50%" cy="50%" r="46%" stroke="currentColor" strokeWidth="8" fill="transparent"
                                        strokeDasharray="283%" strokeDashoffset={`${283 - (283 * progress) / 100}%`}
                                        className={`text-${activeConfig.color}-500 transition-all duration-1000 ease-linear shadow-[0_0_15px_rgba(59,130,246,0.4)]`}
                                        strokeLinecap="round"
                                    />
                                </svg>

                                <div className="absolute inset-0 flex flex-col items-center justify-center">
                                    <span className="text-7xl sm:text-8xl font-black text-white tracking-tighter tabular-nums drop-shadow-2xl">
                                        {formatTime(timeLeft)}
                                    </span>
                                </div>
                            </div>

                            <div className="flex items-center gap-4 w-full max-w-xs">
                                <button
                                    onClick={() => setIsActive(!isActive)}
                                    className={`flex-1 flex items-center justify-center gap-3 py-6 rounded-[2rem] font-black uppercase tracking-widest text-sm transition-all shadow-2xl hover:-translate-y-1 active:scale-95 ${isActive
                                        ? 'bg-white text-black'
                                        : `bg-${activeConfig.color}-600 text-white shadow-${activeConfig.color}-600/40`
                                        }`}
                                >
                                    {isActive ? <><Pause size={24} /> PAUSE</> : <><Play size={24} /> START</>}
                                </button>
                                <button
                                    onClick={() => {
                                        setIsActive(false);
                                        setTimeLeft(getDuration(timerType));
                                    }}
                                    className="p-6 bg-white/5 text-white/40 hover:text-white rounded-[2rem] transition-all hover:bg-white/10 active:scale-90 border border-white/5 shadow-xl"
                                >
                                    <RotateCcw size={24} />
                                </button>
                            </div>
                        </div>

                        {/* Floating Music Widget (Bottom Right - Scaled Down) */}
                        {currentTrack && (
                            <div className={`absolute bottom-8 right-8 w-80 bg-black/60 backdrop-blur-3xl border border-white/10 rounded-[2rem] shadow-2xl animate-in slide-in-from-bottom-5 duration-700 z-50 group/widget overflow-hidden transition-all ${showPlaylist ? 'h-[28rem]' : 'h-auto'}`}>
                                {/* Playlist Overlay - Spotify Stack Style */}
                                {showPlaylist && (
                                    <div className="absolute inset-0 bg-black/95 z-50 animate-in fade-in duration-300 flex flex-col pt-12 pb-6 px-4">
                                        <div className="flex items-center justify-between mb-4 px-2">
                                            <div className="space-y-0.5">
                                                <h3 className="text-[10px] font-black text-green-500 uppercase tracking-[0.2em]">Queue</h3>
                                                <p className="text-[8px] text-white/30 font-bold uppercase tracking-widest">Next in Stack</p>
                                            </div>
                                            <button onClick={() => setShowPlaylist(false)} className="p-2 bg-white/5 rounded-lg text-white/40 hover:text-white transition-colors">
                                                <Minimize2 size={14} />
                                            </button>
                                        </div>
                                        <div className="flex-1 overflow-y-auto space-y-2 custom-scrollbar pr-1 pb-4">
                                            {tracks.map((track, idx) => (
                                                <div
                                                    key={`${track.url}-${idx}`}
                                                    draggable
                                                    onDragStart={() => handleDragStart(idx)}
                                                    onDragOver={(e) => handleDragOver(e, idx)}
                                                    onDragEnd={handleDragEnd}
                                                    className={`w-full flex items-center gap-3 p-3 rounded-2xl transition-all cursor-move group/track relative overflow-hidden ${currentTrackIndex === idx ? 'bg-green-500/10 border border-green-500/20' : 'hover:bg-white/5 border border-transparent'}`}
                                                >
                                                    {currentTrackIndex === idx && (
                                                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-green-500" />
                                                    )}
                                                    <GripVertical size={14} className="text-white/10 group-hover/track:text-white/30 transition-colors shrink-0" />
                                                    <button
                                                        onClick={() => {
                                                            setCurrentTrackIndex(idx);
                                                            setIsMusicPlaying(true);
                                                            setShowPlaylist(false);
                                                        }}
                                                        className="flex-1 flex items-center gap-4 min-w-0"
                                                    >
                                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${currentTrackIndex === idx ? 'bg-green-500 shadow-lg shadow-green-500/20' : 'bg-white/5'}`}>
                                                            <Music size={16} className={currentTrackIndex === idx ? 'text-black' : 'text-white/20'} />
                                                        </div>
                                                        <div className="flex-1 text-left min-w-0">
                                                            <p className={`text-xs font-black truncate uppercase tracking-tight ${currentTrackIndex === idx ? 'text-green-500' : 'text-white'}`}>{track.title}</p>
                                                            <p className={`text-[9px] font-bold uppercase tracking-widest truncate ${currentTrackIndex === idx ? 'text-white/40' : 'text-white/20'}`}>{track.artist}</p>
                                                        </div>
                                                    </button>
                                                    {currentTrackIndex === idx && (
                                                        <div className="flex gap-0.5 items-end h-3 mb-1 pr-2">
                                                            <div className="w-0.5 h-full bg-green-500 animate-music-bar-1" />
                                                            <div className="w-0.5 h-2/3 bg-green-500 animate-music-bar-2" />
                                                            <div className="w-0.5 h-4/5 bg-green-500 animate-music-bar-3" />
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <div className="p-5">
                                    <div className="flex gap-4">
                                        {/* Artwork Icon (Scaled Down) */}
                                        <button
                                            onClick={() => setShowPlaylist(!showPlaylist)}
                                            className="w-20 h-20 rounded-2xl bg-gradient-to-br from-white/10 to-white/5 border border-white/10 flex items-center justify-center shadow-inner relative overflow-hidden shrink-0 group/art"
                                        >
                                            <div className={`absolute inset-0 bg-gradient-to-br from-${activeConfig.color}-500 to-${activeConfig.color}-700 opacity-20`} />
                                            <Music size={32} className={`text-white transition-all duration-1000 ${isMusicPlaying ? 'scale-110 drop-shadow-[0_0_10px_white]' : 'opacity-40'}`} />
                                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/art:opacity-100 transition-opacity flex items-center justify-center">
                                                <Music size={20} className="text-white/40" />
                                            </div>
                                        </button>

                                        <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                                            <div className="space-y-0.5">
                                                <h4 className="text-sm font-black text-white truncate uppercase tracking-tight">
                                                    {currentTrack.title}
                                                </h4>
                                                <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest truncate">
                                                    {currentTrack.artist}
                                                </p>
                                            </div>

                                            {/* Widget Progress Bar (Refined) */}
                                            <div className="space-y-2">
                                                <div className="relative h-1 bg-white/10 rounded-full overflow-hidden">
                                                    <div
                                                        className="absolute inset-y-0 left-0 bg-white group-hover/widget:bg-green-500 transition-all duration-300"
                                                        style={{ width: `${(currentTime / (duration || 1)) * 100}%` }}
                                                    />
                                                </div>
                                                <div className="flex justify-between items-center text-[8px] font-black text-white/20 tracking-widest leading-none">
                                                    <span>{Math.floor(currentTime / 60)}:{(Math.floor(currentTime % 60)).toString().padStart(2, '0')}</span>
                                                    <span>{duration ? `${Math.floor(duration / 60)}:${(Math.floor(duration % 60)).toString().padStart(2, '0')}` : '0:00'}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Control Section (Scaled Down) */}
                                    <div className="mt-5 flex items-center justify-between px-1">
                                        <div className="flex items-center gap-4">
                                            <button onClick={handlePrevTrack} className="text-white/40 hover:text-white transition-all hover:scale-110 active:scale-90">
                                                <SkipBack size={18} fill="currentColor" />
                                            </button>
                                            <button
                                                onClick={() => setIsMusicPlaying(!isMusicPlaying)}
                                                className="w-10 h-10 bg-white text-black rounded-full flex items-center justify-center hover:scale-110 active:scale-95 transition-all shadow-xl"
                                            >
                                                {isMusicPlaying ? <Pause size={20} fill="black" /> : <Play size={20} className="translate-x-0.5" fill="black" />}
                                            </button>
                                            <button onClick={handleNextTrack} className="text-white/40 hover:text-white transition-all hover:scale-110 active:scale-90">
                                                <SkipForward size={18} fill="currentColor" />
                                            </button>
                                            <button
                                                onClick={() => setIsLooping(!isLooping)}
                                                className={`p-2 rounded-lg transition-all ${isLooping ? 'text-green-500' : 'text-white/40 hover:text-white hover:bg-white/5'}`}
                                                title={isLooping ? 'Disable Loop' : 'Enable Loop'}
                                            >
                                                {isLooping ? <Repeat1 size={18} /> : <Repeat size={18} />}
                                            </button>
                                            <button
                                                onClick={() => setShowPlaylist(!showPlaylist)}
                                                className={`p-2 rounded-lg transition-all ${showPlaylist ? 'bg-green-500 text-black shadow-lg shadow-green-500/20' : 'text-white/40 hover:text-white hover:bg-white/5'}`}
                                                title="Queue"
                                            >
                                                <ListMusic size={18} />
                                            </button>
                                        </div>
                                        <div className="flex items-center gap-2 w-28 mr-6">
                                            <Volume2 size={14} className="text-white/20" />
                                            <input
                                                type="range" min="0" max="1" step="0.01" value={volume}
                                                onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                                                className="flex-1 h-1 rounded-lg appearance-none cursor-pointer accent-white hover:accent-green-500 transition-all opacity-80 hover:opacity-100"
                                                style={{
                                                    background: `linear-gradient(to right, white ${volume * 100}%, rgba(255,255,255,0.1) ${volume * 100}%)`
                                                }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </FullScreen>
    );
}
