import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axiosClient from '../api/axiosClient';
import { ChevronLeft, ArrowRight, Clock, Lock, ShieldCheck, ShoppingCart, Trophy, Timer, Info, Users, BookOpen, Search } from 'lucide-react';
import PaymentModal from '../components/TestSeries/PaymentModal';
import LiveLeaderboardModal from '../components/LiveLeaderboardModal';
import toast from 'react-hot-toast';

interface Quiz {
    id: number;
    quiz_title: string;
    time_limit: number;
    negative_marking: number;
    mode: string;
    start_time: string | null;
    end_time: string | null;
    user_attempt_count: number;
    latest_attempt_id?: number | null;
    total_questions?: number;
    total_marks?: number;
}

interface LeaderboardEntry {
    rank: number;
    name: string;
    profile_image: string | null;
    score: number;
    total_time: number;
}

const CollectionContentPage: React.FC = () => {
    const { collectionId } = useParams<{ collectionId: string }>();
    const navigate = useNavigate();
    const [quizzes, setQuizzes] = useState<Quiz[]>([]);
    const [loading, setLoading] = useState(true);
    const [hasAccess, setHasAccess] = useState(true);
    const [collectionTitle, setCollectionTitle] = useState('Test Collection');
    const [collectionPrice, setCollectionPrice] = useState(0);
    const [isPaymentOpen, setIsPaymentOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState<'live' | 'practice'>('practice');
    const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
    const [leaderboardLoading, setLeaderboardLoading] = useState(false);

    // Leaderboard Modal State
    const [isLeaderboardOpen, setIsLeaderboardOpen] = useState(false);
    const [selectedQuiz, setSelectedQuiz] = useState<{ id: number; title: string } | null>(null);

    const token = localStorage.getItem('token');

    useEffect(() => {
        if (!token) {
            navigate('/login');
            return;
        }
        fetchQuizzes();
    }, [collectionId]);

    const fetchQuizzes = async () => {
        setLoading(true);
        try {
            const colResponse = await axiosClient.get(`/api/datafetch/get_test_series_collections.php`);
            if (colResponse.data.status === 'true') {
                const currentPool = colResponse.data.data.find((c: any) => c.id === Number(collectionId));
                if (currentPool) {
                    setCollectionTitle(currentPool.title);
                    setCollectionPrice(currentPool.discount_price !== null ? currentPool.discount_price : currentPool.price);
                }
            }

            const response = await axiosClient.get(`/api/student_quiz/get_collection_content.php?collection_id=${collectionId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (response.data.status === 'true') {
                const quizList = response.data.data;
                setQuizzes(quizList);
                setHasAccess(response.data.has_access);

                // Fetch leaderboard for the active live quiz if one exists
                const liveNow = quizList.find((q: any) => {
                    const now = new Date();
                    const start = q.start_time ? new Date(q.start_time.replace(' ', 'T')) : null;
                    const end = q.end_time ? new Date(q.end_time.replace(' ', 'T')) : null;
                    return q.mode === 'LIVE' && start && end && now >= start && now <= end;
                });
                if (liveNow) fetchLeaderboard(liveNow.id);
            } else {
                toast.error(response.data.message || 'Failed to load content');
            }
        } catch (err) {
            toast.error('An error occurred');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const fetchLeaderboard = async (quizId: number) => {
        setLeaderboardLoading(true);
        try {
            const res = await axiosClient.get(`/api/student_quiz/get_leaderboard.php?quiz_id=${quizId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.data.status === 'true') {
                setLeaderboard(res.data.data);
            }
        } catch (err) {
            console.error("Leaderboard fetch error:", err);
        } finally {
            setLeaderboardLoading(false);
        }
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}m ${secs}s`;
    };

    const handleEnroll = async () => {
        if (collectionPrice === 0) {
            const loadingToast = toast.loading('Enrolling in free series...');
            try {
                const response = await axiosClient.post('/api/payment/enroll_free.php', {
                    collection_id: Number(collectionId)
                }, {
                    headers: { Authorization: `Bearer ${token}` }
                });

                if (response.data.status === 'true') {
                    toast.success(response.data.message || 'Enrolled successfully!', { id: loadingToast, duration: 5000 });
                    fetchQuizzes();
                } else {
                    toast.error(response.data.message || 'Enrollment failed', { id: loadingToast });
                }
            } catch (error) {
                console.error(error);
                toast.error('An error occurred during enrollment', { id: loadingToast });
            }
        } else {
            setIsPaymentOpen(true);
        }
    };

    const handleStartExam = (quizId: number) => {
        if (!hasAccess) {
            if (collectionPrice === 0) {
                handleEnroll();
            } else {
                setIsPaymentOpen(true);
                toast.error('Purchase required to start this exam');
            }
            return;
        }
        navigate(`/test-series/quiz/${quizId}`);
    };

    const handleViewLeaderboard = (quiz: Quiz) => {
        setSelectedQuiz({ id: quiz.id, title: quiz.quiz_title });
        setIsLeaderboardOpen(true);
    };

    const now = new Date();

    // 1. LIVE CHALLENGES TAB DATA
    const liveQuizzes = quizzes.filter(q => q.mode === 'LIVE');

    const activeLive = liveQuizzes.find(q => {
        const start = q.start_time ? new Date(q.start_time.replace(' ', 'T')) : null;
        const end = q.end_time ? new Date(q.end_time.replace(' ', 'T')) : null;
        return start && end && now >= start && now <= end;
    });

    const upcomingLiveNear = liveQuizzes.find(q => {
        const start = q.start_time ? new Date(q.start_time.replace(' ', 'T')) : null;
        if (!start) return false;
        const diff = start.getTime() - now.getTime();
        return diff > 0 && diff <= 12 * 60 * 60 * 1000;
    });

    const showLiveHero = activeLive || upcomingLiveNear;
    const displayLive = activeLive || upcomingLiveNear;

    const pastLiveQuizzes = liveQuizzes.filter(q => {
        const end = q.end_time ? new Date(q.end_time.replace(' ', 'T')) : null;
        return end && now > end && q.id !== activeLive?.id;
    });

    // 2. PRACTICE RESOURCES TAB DATA
    const practiceQuizzes = quizzes.filter(q => q.mode === 'NORMAL')
        .filter(q => q.quiz_title.toLowerCase().includes(searchQuery.toLowerCase()));

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-blue-400"></div>
        </div>
    );

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-950 transition-colors duration-300">
            <div className="max-w-6xl mx-auto px-4 py-8">
                {/* Header Section */}
                <div className="mb-10">
                    <button
                        onClick={() => navigate('/test-series')}
                        className="flex items-center text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white mb-6 group transition-all"
                    >
                        <ChevronLeft size={20} className="mr-1 group-hover:-translate-x-1 transition-transform" />
                        <span className="text-sm font-bold">Back to Collections</span>
                    </button>

                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                        <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                                <h1 className="text-4xl font-black text-gray-900 dark:text-white tracking-tight">{collectionTitle}</h1>
                                {!hasAccess && (
                                    <span className="px-2.5 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 text-[10px] font-black uppercase rounded-lg border border-amber-200 dark:border-amber-700/50 tracking-widest">Locked</span>
                                )}
                            </div>
                            <p className="text-gray-500 dark:text-gray-400 max-w-2xl font-medium">
                                Choose between high-stakes <span className="text-blue-600 dark:text-blue-400 font-bold">Live Challenges</span> or flexible <span className="text-purple-600 dark:text-purple-400 font-bold">Practice Resources</span> to master your exams.
                            </p>
                        </div>

                        {/* Custom Tab Switcher */}
                        <div className="flex bg-gray-200/50 dark:bg-gray-800/50 p-1.5 rounded-2xl border border-gray-100 dark:border-gray-700/50 backdrop-blur-sm self-start shrink-0">
                            <button
                                onClick={() => setActiveTab('practice')}
                                className={`flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-black transition-all ${activeTab === 'practice'
                                    ? 'bg-white dark:bg-gray-700 text-purple-600 dark:text-white shadow-lg'
                                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}
                            >
                                <BookOpen size={18} />
                                PRACTICE ROOM
                            </button>
                            <button
                                onClick={() => setActiveTab('live')}
                                className={`flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-black transition-all ${activeTab === 'live'
                                    ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-white shadow-lg'
                                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}
                            >
                                <Users size={18} />
                                LIVE QUIZ
                            </button>
                        </div>
                    </div>
                </div>

                {!hasAccess && (
                    <div className="mb-12 bg-gradient-to-br from-indigo-600 via-blue-600 to-indigo-700 rounded-[2.5rem] p-10 text-white flex flex-col md:flex-row items-center justify-between gap-8 shadow-2xl relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-12 opacity-10 group-hover:scale-110 transition-transform duration-700">
                            <ShoppingCart size={180} />
                        </div>
                        <div className="relative z-10">
                            <h2 className="text-3xl font-black mb-3 leading-tight tracking-tight">Accelerate Your Learning</h2>
                            <p className="text-indigo-100 max-w-md text-lg font-medium opacity-90">Unlock all {quizzes.length} professional tests, detailed analytics, and global ranking benefits today.</p>
                        </div>
                        <button
                            onClick={handleEnroll}
                            className="relative z-10 px-10 py-5 bg-white text-blue-600 rounded-2xl font-black hover:bg-gray-50 transition-all shadow-xl active:scale-95 flex items-center gap-2 whitespace-nowrap text-lg ring-4 ring-white/20"
                        >
                            ENROLL NOW - {collectionPrice === 0 ? 'FREE' : `Rs. ${collectionPrice}`}
                            <ArrowRight size={22} />
                        </button>
                    </div>
                )}

                <div className="space-y-16">
                    {activeTab === 'live' ? (
                        <div className="space-y-16 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            {/* ENHANCED LIVE HERO SECTION */}
                            {(showLiveHero && displayLive) ? (
                                <section>
                                    <div className="flex items-center gap-3 mb-8">
                                        <div className="p-2.5 bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 rounded-2xl ring-4 ring-red-50 dark:ring-red-900/10">
                                            <Timer size={24} />
                                        </div>
                                        <div className="flex flex-col">
                                            <h2 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight uppercase">Ongoing Live Battle</h2>
                                            <div className="flex items-center gap-2">
                                                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                                                <span className="text-[10px] font-black text-red-500 tracking-widest uppercase">Live Activity Detected</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="bg-slate-950 rounded-[3rem] p-1 md:p-1.5 shadow-2xl shadow-blue-900/20 group relative overflow-hidden border border-white/5">
                                        <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-950 rounded-[2.9rem] p-8 md:p-12 relative overflow-hidden">
                                            {/* Abstract Background Design */}
                                            <div className="absolute top-0 right-0 w-full h-full bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-blue-500/10 via-transparent to-transparent opacity-40"></div>
                                            <div className="absolute -left-40 -bottom-40 w-96 h-96 bg-indigo-600/10 rounded-full blur-[100px]"></div>

                                            <div className="relative z-10 grid lg:grid-cols-5 gap-12 items-center">
                                                <div className="lg:col-span-3">
                                                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500/10 rounded-full border border-blue-500/20 mb-6 backdrop-blur-md">
                                                        <Trophy size={16} className="text-blue-400" />
                                                        <span className="text-xs font-black text-blue-400 tracking-wider">PREMIUM LIVE EXAM</span>
                                                    </div>
                                                    <h3 className="text-4xl md:text-5xl font-black text-white mb-8 leading-[1.1] tracking-tight">
                                                        {displayLive.quiz_title}
                                                    </h3>

                                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-10">
                                                        <div className="bg-white/5 border border-white/10 rounded-3xl p-5 backdrop-blur-sm group-hover:bg-white/10 transition-colors">
                                                            <Clock className="text-blue-400 mb-3" size={20} />
                                                            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Time Limit</div>
                                                            <div className="text-xl font-black text-white">{displayLive.time_limit}M</div>
                                                        </div>
                                                        <div className="bg-white/5 border border-white/10 rounded-3xl p-5 backdrop-blur-sm group-hover:bg-white/10 transition-colors">
                                                            <Users className="text-emerald-400 mb-3" size={20} />
                                                            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Total Items</div>
                                                            <div className="text-xl font-black text-white">100?</div>
                                                        </div>
                                                        <div className="bg-white/5 border border-white/10 rounded-3xl p-5 backdrop-blur-sm group-hover:bg-white/10 transition-colors">
                                                            <ShieldCheck className="text-purple-400 mb-3" size={20} />
                                                            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Negative</div>
                                                            <div className="text-xl font-black text-white">{displayLive.negative_marking} Mark</div>
                                                        </div>
                                                        <div className="bg-white/5 border border-white/10 rounded-3xl p-5 backdrop-blur-sm group-hover:bg-white/10 transition-colors">
                                                            <Timer className="text-amber-400 mb-3" size={20} />
                                                            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Mode</div>
                                                            <div className="text-xl font-black text-white uppercase tracking-tighter">Live</div>
                                                        </div>
                                                    </div>

                                                    <div className="flex flex-col sm:flex-row gap-4">
                                                        <button
                                                            onClick={() => handleStartExam(displayLive.id)}
                                                            disabled={!activeLive}
                                                            className={`px-12 py-5 rounded-[1.5rem] font-black transition-all shadow-[0_20px_40px_rgba(0,0,0,0.5)] active:scale-95 flex items-center justify-center gap-3 text-lg ${activeLive ? 'bg-white text-slate-950 hover:bg-gray-100' : 'bg-white/10 text-white/40 cursor-not-allowed border border-white/10'}`}
                                                        >
                                                            {activeLive ? 'START EXAM NOW' : 'SOON...'}
                                                            <ArrowRight size={24} />
                                                        </button>
                                                        <div className="flex items-center gap-3 px-6 text-gray-400">
                                                            <Info size={18} />
                                                            <span className="text-xs font-medium">
                                                                {activeLive
                                                                    ? `Automatic submission at ${displayLive.end_time?.split(' ')[1] || '...'}`
                                                                    : `Starts at ${displayLive.start_time?.split(' ')[1] || '...'}`
                                                                }
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="lg:col-span-2">
                                                    <div className="bg-white/5 backdrop-blur-xl rounded-[2.5rem] p-8 border border-white/10 ring-1 ring-white/5 shadow-2xl relative">
                                                        <div className="absolute -top-4 -right-4 bg-yellow-400 text-yellow-950 px-4 py-2 rounded-2xl font-black text-xs shadow-lg rotate-12 flex items-center gap-2">
                                                            <Trophy size={14} /> TOP PERFORMERS
                                                        </div>
                                                        <h4 className="text-xl font-black text-white mb-6 flex items-center gap-3">
                                                            Live Ranking
                                                        </h4>

                                                        <div className="space-y-4">
                                                            {leaderboardLoading ? (
                                                                <div className="space-y-4 animate-pulse">
                                                                    {[1, 2, 3, 4, 5].map(i => (
                                                                        <div key={i} className="h-16 bg-white/5 rounded-2xl border border-white/5"></div>
                                                                    ))}
                                                                </div>
                                                            ) : leaderboard.length > 0 ? (
                                                                leaderboard.slice(0, 5).map((entry: LeaderboardEntry, i: number) => (
                                                                    <div key={i} className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5 hover:bg-white/10 transition-colors group/row">
                                                                        <div className="flex items-center gap-4">
                                                                            <span className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black ${i === 0 ? 'bg-yellow-400 text-yellow-950' : i === 1 ? 'bg-slate-300 text-slate-900' : i === 2 ? 'bg-orange-400 text-orange-950' : 'bg-white/10 text-white'}`}>
                                                                                {entry.rank}
                                                                            </span>
                                                                            <div>
                                                                                <div className="text-sm font-bold text-white group-hover/row:text-blue-400 transition-colors">{entry.name}</div>
                                                                                <div className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">{formatTime(entry.total_time)}</div>
                                                                            </div>
                                                                        </div>
                                                                        <div className="text-right">
                                                                            <div className="text-lg font-black text-white">{entry.score.toFixed(1)}</div>
                                                                        </div>
                                                                    </div>
                                                                ))
                                                            ) : (
                                                                <div className="h-80 flex flex-col items-center justify-center text-white/20 border-2 border-dashed border-white/5 rounded-[2rem]">
                                                                    <Trophy size={48} className="mb-4 opacity-20" />
                                                                    <p className="font-black text-xs tracking-widest uppercase">No finishers yet</p>
                                                                    <p className="text-[10px] mt-1">Be the first to claim the throne!</p>
                                                                </div>
                                                            )}

                                                            <button
                                                                onClick={() => handleViewLeaderboard(displayLive)}
                                                                className="w-full py-4 mt-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl text-[11px] font-black text-blue-400 tracking-widest uppercase transition-all"
                                                            >
                                                                VIEW FULL LEADERBOARD
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </section>
                            ) : null}

                            {/* PAST LIVE CHALLENGES & RESULTS */}
                            <section>
                                <div className="flex items-center justify-between mb-8">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2.5 bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 rounded-2xl ring-4 ring-blue-50 dark:ring-blue-900/10">
                                            <Trophy size={20} />
                                        </div>
                                        <h2 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight uppercase">History & Rankings</h2>
                                    </div>
                                </div>

                                {pastLiveQuizzes.length === 0 ? (
                                    <div className="text-center py-20 bg-white dark:bg-gray-900/30 rounded-[2.5rem] border-2 border-dashed border-gray-100 dark:border-gray-800">
                                        <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">No past records available</p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                        {pastLiveQuizzes.map((quiz) => {
                                            const isAttempted = quiz.user_attempt_count > 0;
                                            return (
                                                <div key={quiz.id} className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-[2.5rem] p-8 hover:shadow-2xl transition-all group relative overflow-hidden">
                                                    {isAttempted && (
                                                        <div className="absolute top-0 right-0 p-6">
                                                            <div className="px-3 py-1 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5">
                                                                <ShieldCheck size={12} /> PARTICIPATED
                                                            </div>
                                                        </div>
                                                    )}
                                                    <h3 className="text-xl font-black text-gray-900 dark:text-white mb-2 leading-tight pr-12 line-clamp-2">
                                                        {quiz.quiz_title}
                                                    </h3>
                                                    <div className="flex items-center gap-1.5 text-gray-400 text-xs font-bold mb-8">
                                                        <Clock size={14} />
                                                        <span>Ended: {quiz.end_time?.split(' ')[0]}</span>
                                                    </div>

                                                    <div className="flex flex-col gap-3">
                                                        <button
                                                            onClick={() => handleViewLeaderboard(quiz)}
                                                            className="w-full py-4 bg-gray-900 dark:bg-blue-600 text-white rounded-2xl font-black text-xs tracking-widest uppercase hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2"
                                                        >
                                                            <Users size={16} /> VIEW LEADERBOARD
                                                        </button>
                                                        {isAttempted && quiz.latest_attempt_id && (
                                                            <button
                                                                onClick={() => navigate(`/test-series/result/${quiz.latest_attempt_id}`)}
                                                                className="w-full py-4 border-2 border-gray-100 dark:border-gray-800 text-gray-700 dark:text-gray-300 rounded-2xl font-black text-xs tracking-widest uppercase hover:bg-gray-50 dark:hover:bg-gray-800 transition-all"
                                                            >
                                                                MY PERFORMANCE
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </section>
                        </div>
                    ) : (
                        <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            {/* PRACTICE RESOURCES SECTION */}
                            <section>
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2.5 bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400 rounded-2xl ring-4 ring-purple-50 dark:ring-purple-900/10">
                                            <BookOpen size={24} />
                                        </div>
                                        <div>
                                            <h2 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight uppercase">Study & Practice</h2>
                                            <p className="text-xs font-bold text-gray-400 tracking-widest uppercase">Self-paced learning materials</p>
                                        </div>
                                    </div>

                                    <div className="relative w-full md:w-80">
                                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                        <input
                                            type="text"
                                            placeholder="Search sets..."
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            className="w-full pl-12 pr-5 py-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-gray-900 dark:text-white rounded-[1.5rem] text-sm focus:ring-4 focus:ring-purple-500/10 outline-none transition-all placeholder:font-black placeholder:uppercase placeholder:text-[10px] placeholder:tracking-widest"
                                        />
                                    </div>
                                </div>

                                {practiceQuizzes.length === 0 ? (
                                    <div className="text-center py-20 bg-white dark:bg-gray-900/30 rounded-[3rem] border-2 border-dashed border-gray-100 dark:border-gray-800">
                                        <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">No resources found</p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                                        {practiceQuizzes.map((quiz) => (
                                            <div key={quiz.id} className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-[2.5rem] p-8 hover:shadow-[0_20px_50px_rgba(0,0,0,0.05)] hover:-translate-y-2 transition-all group overflow-hidden relative">
                                                <div className="flex justify-between items-start mb-6">
                                                    <span className="px-3 py-1 bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 rounded-lg text-[10px] font-black uppercase tracking-widest">PRACTICE SET</span>
                                                    {!hasAccess && <Lock size={16} className="text-gray-200 dark:text-gray-700" />}
                                                </div>
                                                <h3 className="text-xl font-black text-gray-900 dark:text-white mb-6 leading-tight group-hover:text-blue-600 transition-colors">
                                                    {quiz.quiz_title}
                                                </h3>

                                                <div className="flex items-center gap-6 text-[10px] text-gray-400 font-black tracking-widest uppercase mb-8 pb-6 border-b border-gray-50 dark:border-gray-800">
                                                    <div className="flex items-center gap-2">
                                                        <Clock size={14} className="text-purple-400" />
                                                        <span>{quiz.time_limit} MINS</span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <ShieldCheck size={14} className="text-emerald-400" />
                                                        <span>{quiz.negative_marking > 0 ? "STRICT" : "RELAXED"}</span>
                                                    </div>
                                                </div>

                                                <div className="flex flex-col gap-3">
                                                    <button
                                                        onClick={() => hasAccess ? handleStartExam(quiz.id) : handleEnroll()}
                                                        className={`w-full py-4 rounded-2xl font-black uppercase tracking-widest text-xs transition-all flex items-center justify-center gap-2 ${hasAccess
                                                            ? 'bg-gray-900 dark:bg-white text-white dark:text-slate-950 hover:bg-black dark:hover:bg-gray-100 shadow-xl active:scale-95'
                                                            : 'bg-gray-50 dark:bg-gray-800 text-gray-300 dark:text-gray-600 cursor-not-allowed'}`}
                                                    >
                                                        {hasAccess ? (quiz.user_attempt_count > 0 ? 'RETAKE EXAM' : 'CHALLENGE SET') : 'ENROLL TO UNLOCK'}
                                                        <ArrowRight size={18} />
                                                    </button>

                                                    {quiz.user_attempt_count > 0 && (
                                                        <div className="grid grid-cols-2 gap-2">
                                                            {quiz.latest_attempt_id && (
                                                                <button
                                                                    onClick={() => navigate(`/test-series/result/${quiz.latest_attempt_id}`)}
                                                                    className="py-3.5 border border-blue-100 dark:border-blue-900/30 text-blue-600 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-900/10 rounded-xl font-black text-[10px] tracking-widest uppercase hover:bg-blue-100 dark:hover:bg-blue-900/20 transition-all whitespace-nowrap"
                                                                >
                                                                    LATEST RESULT
                                                                </button>
                                                            )}
                                                            <button
                                                                onClick={() => navigate(`/test-series/history/${quiz.id}`)}
                                                                className="py-3.5 border border-gray-100 dark:border-gray-800 text-gray-500 dark:text-gray-400 rounded-xl font-black text-[10px] tracking-widest uppercase hover:bg-gray-50 dark:hover:bg-gray-800 transition-all whitespace-nowrap"
                                                            >
                                                                HISTORY
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </section>
                        </div>
                    )}
                </div>

                {/* MODALS */}
                {isPaymentOpen && (
                    <PaymentModal
                        isOpen={isPaymentOpen}
                        onClose={() => setIsPaymentOpen(false)}
                        collectionId={Number(collectionId)}
                        collectionTitle={collectionTitle}
                        price={collectionPrice}
                        onSuccess={fetchQuizzes}
                    />
                )}

                {isLeaderboardOpen && selectedQuiz && (
                    <LiveLeaderboardModal
                        isOpen={isLeaderboardOpen}
                        onClose={() => setIsLeaderboardOpen(false)}
                        quizId={selectedQuiz.id}
                        quizTitle={selectedQuiz.title}
                    />
                )}
            </div>
        </div>
    );
};

export default CollectionContentPage;
