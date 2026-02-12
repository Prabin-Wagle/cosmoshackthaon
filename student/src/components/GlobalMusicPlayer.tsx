import { useState, useEffect, useRef, useCallback } from 'react';
import { Music, Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, X, ChevronUp, ChevronDown, Repeat, Repeat1 } from 'lucide-react';
import axiosClient from '../api/axiosClient';

interface Track {
    title: string;
    artist: string;
    url: string;
}

interface GlobalMusicPlayerProps {
    hideButton?: boolean;
}

export default function GlobalMusicPlayer({ hideButton = false }: GlobalMusicPlayerProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [isMinimized, setIsMinimized] = useState(true);
    const [tracks, setTracks] = useState<Track[]>([]);
    const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [volume, setVolume] = useState(0.5);
    const [isMuted, setIsMuted] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [isLooping, setIsLooping] = useState(false);
    const [loading, setLoading] = useState(true);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    useEffect(() => {
        fetchTracks();
    }, []);

    // Keyboard shortcuts: Ctrl+Space = play/pause, Ctrl+Left/Right = prev/next track
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Only trigger if not typing in an input/textarea
            const target = e.target as HTMLElement;
            if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
                return;
            }

            if (e.ctrlKey) {
                if (e.code === 'Space') {
                    e.preventDefault();
                    togglePlayPause();
                } else if (e.code === 'ArrowRight') {
                    e.preventDefault();
                    handleNextTrack();
                } else if (e.code === 'ArrowLeft') {
                    e.preventDefault();
                    handlePrevTrack();
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isPlaying, tracks]);

    const fetchTracks = async () => {
        try {
            setLoading(true);
            const response = await axiosClient.get('/api/get_lofi_songs.php');
            if (response.data.status === 'success' && response.data.data.length > 0) {
                setTracks(response.data.data);
            } else {
                // Fallback tracks
                setTracks([
                    { title: 'Late Night Study', artist: 'Lofi Relax', url: 'https://cdn.pixabay.com/audio/2022/05/27/audio_1808f3030e.mp3' },
                    { title: 'Rainy Day Lofi', artist: 'Ambiance', url: 'https://cdn.pixabay.com/audio/2023/10/25/audio_73f0808a3d.mp3' },
                    { title: 'Theta Waves', artist: 'Deep Focus', url: 'https://cdn.pixabay.com/audio/2022/03/24/audio_386236317b.mp3' }
                ]);
            }
        } catch (error) {
            console.error('Failed to fetch tracks:', error);
            setTracks([
                { title: 'Late Night Study', artist: 'Lofi Relax', url: 'https://cdn.pixabay.com/audio/2022/05/27/audio_1808f3030e.mp3' },
                { title: 'Rainy Day Lofi', artist: 'Ambiance', url: 'https://cdn.pixabay.com/audio/2023/10/25/audio_73f0808a3d.mp3' },
                { title: 'Theta Waves', artist: 'Deep Focus', url: 'https://cdn.pixabay.com/audio/2022/03/24/audio_386236317b.mp3' }
            ]);
        } finally {
            setLoading(false);
        }
    };

    const togglePlayPause = useCallback(() => {
        if (tracks.length === 0) return;
        setIsPlaying(prev => !prev);
        if (!isOpen) setIsOpen(true);
    }, [tracks, isOpen]);

    useEffect(() => {
        if (audioRef.current) {
            audioRef.current.volume = isMuted ? 0 : volume;
        }
    }, [volume, isMuted]);

    useEffect(() => {
        if (isPlaying && audioRef.current) {
            audioRef.current.play().catch(() => setIsPlaying(false));
        } else if (audioRef.current) {
            audioRef.current.pause();
        }
    }, [isPlaying, currentTrackIndex]);

    const handleNextTrack = () => {
        if (tracks.length === 0) return;
        setCurrentTrackIndex((prev) => (prev + 1) % tracks.length);
    };

    const handlePrevTrack = () => {
        if (tracks.length === 0) return;
        setCurrentTrackIndex((prev) => (prev - 1 + tracks.length) % tracks.length);
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const currentTrack = tracks[currentTrackIndex];

    if (loading || tracks.length === 0) return null;

    return (
        <>
            {/* Audio Element */}
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

            {/* Floating Button (when closed and not hidden) */}
            {!isOpen && !hideButton && (
                <button
                    onClick={() => setIsOpen(true)}
                    className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center shadow-2xl shadow-green-500/30 hover:scale-110 transition-all group"
                    title="Open Music Player (Ctrl+Space to play/pause)"
                >
                    <Music size={24} className="text-white" />
                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-white rounded-full flex items-center justify-center">
                        <span className="text-[8px] font-black text-green-600">♪</span>
                    </div>
                </button>
            )}

            {/* Player Widget */}
            {isOpen && (
                <div className={`fixed bottom-6 right-6 z-50 bg-gray-900/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl transition-all duration-300 ${isMinimized ? 'w-72' : 'w-80'}`}>
                    {/* Header */}
                    <div className="flex items-center justify-between p-3 border-b border-white/5">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
                                <Music size={14} className="text-white" />
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-white uppercase tracking-wider">Music</p>
                                <p className="text-[8px] text-gray-500 font-bold">Ctrl+Space / ←→</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-1">
                            <button
                                onClick={() => setIsMinimized(!isMinimized)}
                                className="p-1.5 text-gray-500 hover:text-white rounded transition-colors"
                            >
                                {isMinimized ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                            </button>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="p-1.5 text-gray-500 hover:text-red-500 rounded transition-colors"
                            >
                                <X size={14} />
                            </button>
                        </div>
                    </div>

                    {/* Track Info */}
                    <div className="p-4">
                        <div className="flex items-center gap-3 mb-4">
                            <div className={`w-12 h-12 rounded-xl bg-gradient-to-br from-green-500/20 to-emerald-600/20 flex items-center justify-center border border-white/10 ${isPlaying ? 'animate-pulse' : ''}`}>
                                <Music size={20} className={isPlaying ? 'text-green-500' : 'text-gray-500'} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-black text-white truncate">{currentTrack?.title || 'No Track'}</p>
                                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider truncate">{currentTrack?.artist || 'Unknown'}</p>
                            </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="mb-4">
                            <div className="relative h-1 bg-white/10 rounded-full overflow-hidden cursor-pointer"
                                onClick={(e) => {
                                    const rect = e.currentTarget.getBoundingClientRect();
                                    const percent = (e.clientX - rect.left) / rect.width;
                                    if (audioRef.current) {
                                        audioRef.current.currentTime = percent * duration;
                                    }
                                }}
                            >
                                <div
                                    className="absolute inset-y-0 left-0 bg-green-500 transition-all"
                                    style={{ width: `${(currentTime / (duration || 1)) * 100}%` }}
                                />
                            </div>
                            <div className="flex justify-between text-[9px] text-gray-500 font-bold mt-1">
                                <span>{formatTime(currentTime)}</span>
                                <span>{formatTime(duration)}</span>
                            </div>
                        </div>

                        {/* Controls */}
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <button onClick={handlePrevTrack} className="p-2 text-gray-400 hover:text-white transition-colors">
                                    <SkipBack size={16} fill="currentColor" />
                                </button>
                                <button
                                    onClick={togglePlayPause}
                                    className="w-10 h-10 rounded-full bg-white flex items-center justify-center hover:scale-105 transition-transform"
                                >
                                    {isPlaying ? <Pause size={18} fill="black" className="text-black" /> : <Play size={18} fill="black" className="text-black translate-x-0.5" />}
                                </button>
                                <button onClick={handleNextTrack} className="p-2 text-gray-400 hover:text-white transition-colors">
                                    <SkipForward size={16} fill="currentColor" />
                                </button>
                            </div>

                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setIsLooping(!isLooping)}
                                    className={`p-2 rounded transition-colors ${isLooping ? 'text-green-500' : 'text-gray-500 hover:text-white'}`}
                                >
                                    {isLooping ? <Repeat1 size={14} /> : <Repeat size={14} />}
                                </button>
                                <button
                                    onClick={() => setIsMuted(!isMuted)}
                                    className={`p-2 rounded transition-colors ${isMuted ? 'text-red-500' : 'text-gray-500 hover:text-white'}`}
                                >
                                    {isMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
                                </button>
                                <input
                                    type="range"
                                    min="0"
                                    max="1"
                                    step="0.01"
                                    value={isMuted ? 0 : volume}
                                    onChange={(e) => {
                                        setVolume(parseFloat(e.target.value));
                                        setIsMuted(false);
                                    }}
                                    className="w-16 h-1 rounded-lg appearance-none cursor-pointer accent-green-500 bg-white/10"
                                    style={{
                                        background: `linear-gradient(to right, #22c55e ${(isMuted ? 0 : volume) * 100}%, rgba(255,255,255,0.1) ${(isMuted ? 0 : volume) * 100}%)`
                                    }}
                                />
                            </div>
                        </div>

                        {/* Expanded: Track List */}
                        {!isMinimized && (
                            <div className="mt-4 pt-4 border-t border-white/5 max-h-40 overflow-y-auto space-y-1">
                                {tracks.map((track, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => {
                                            setCurrentTrackIndex(idx);
                                            setIsPlaying(true);
                                        }}
                                        className={`w-full flex items-center gap-3 p-2 rounded-lg text-left transition-all ${currentTrackIndex === idx
                                            ? 'bg-green-500/10 text-green-500'
                                            : 'text-gray-400 hover:bg-white/5 hover:text-white'
                                            }`}
                                    >
                                        <Music size={12} />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs font-bold truncate">{track.title}</p>
                                            <p className="text-[9px] opacity-60 truncate">{track.artist}</p>
                                        </div>
                                        {currentTrackIndex === idx && isPlaying && (
                                            <div className="flex gap-0.5 items-end h-3">
                                                <div className="w-0.5 h-full bg-green-500 animate-bounce" style={{ animationDelay: '0ms' }} />
                                                <div className="w-0.5 h-2/3 bg-green-500 animate-bounce" style={{ animationDelay: '150ms' }} />
                                                <div className="w-0.5 h-4/5 bg-green-500 animate-bounce" style={{ animationDelay: '300ms' }} />
                                            </div>
                                        )}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </>
    );
}
