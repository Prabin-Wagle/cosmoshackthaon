import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosClient from '../api/axiosClient';
import { LatexRenderer } from '../components/latexRender';
import {
    ChevronDown, ChevronUp, Check, X, Clock, Play, Bookmark, XCircle,
    BookmarkMinus, Settings, Shuffle, ChevronLeft, Shield, Loader2
} from 'lucide-react';
import toast from 'react-hot-toast';
import Turnstile from 'react-turnstile';
import ConfirmationModal from '../components/ConfirmationModal';

const TURNSTILE_SITE_KEY = '0x4AAAAAACU4jsSvr7a6OSp7';

interface Question {
    question: string;
    imageLink?: string | null;
    options: string[];
    correctOption: number;
    explanation?: string | null;
    marks?: number;
}

interface PracticeItem {
    id: number;
    type: 'wrong' | 'bookmarked';
    quiz_id: number;
    quiz_title: string;
    question_index: number;
    originalIndex: number; // For server-side validation mapping
    marks: number;
    unit_id: string;
    question: Question;
    is_latest_set?: boolean;
}

const SmartPracticeBuilderPage: React.FC = () => {
    const navigate = useNavigate();
    const token = localStorage.getItem('token');

    // Data states
    const [wrongItems, setWrongItems] = useState<PracticeItem[]>([]);
    const [bookmarkedItems, setBookmarkedItems] = useState<PracticeItem[]>([]);
    const [loading, setLoading] = useState(true);

    // UI states
    const [activeTab, setActiveTab] = useState<'wrong' | 'bookmarked'>('wrong');
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [showPracticeConfig, setShowPracticeConfig] = useState(false);

    // Practice config states
    const [practiceCount, setPracticeCount] = useState<number>(10);
    const [practiceUnits, setPracticeUnits] = useState<Set<string>>(new Set());
    const [practiceMarks, setPracticeMarks] = useState<'1' | '2' | 'random'>('random');
    const [practiceSource, setPracticeSource] = useState<'wrong' | 'bookmarked' | 'both'>('wrong');
    const [showAllWrongs, setShowAllWrongs] = useState(false);
    const [practiceFilter, setPracticeFilter] = useState<'latest' | 'all'>('latest');

    // Quiz states
    const [phase, setPhase] = useState<'browse' | 'quiz' | 'results'>('browse');
    const [quizItems, setQuizItems] = useState<PracticeItem[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [userAnswers, setUserAnswers] = useState<Record<number, number>>({});
    const [showFeedback, setShowFeedback] = useState(false);
    const [timeLimit, setTimeLimit] = useState<number>(0);
    const [timeRemaining, setTimeRemaining] = useState<number | null>(null);

    const [quizSessionId, setQuizSessionId] = useState<string>('');
    const [verifyingAnswer, setVerifyingAnswer] = useState(false);
    const [verifiedAnswers, setVerifiedAnswers] = useState<Record<number, any>>({});
    const [poolVerifiedAnswers, setPoolVerifiedAnswers] = useState<Record<string, any>>({});
    const [captchaVerified, setCaptchaVerified] = useState(false);
    const [verifyingPoolId, setVerifyingPoolId] = useState<string | null>(null);
    const [bookmarkToDelete, setBookmarkToDelete] = useState<number | null>(null);

    useEffect(() => {
        if (!token) {
            navigate('/login');
            return;
        }
        fetchPracticePool();
    }, []);

    useEffect(() => {
        if (phase !== 'quiz' || timeRemaining === null || timeRemaining <= 0) return;

        const interval = setInterval(() => {
            setTimeRemaining(prev => {
                if (prev && prev <= 1) {
                    clearInterval(interval);
                    setPhase('results');
                    return 0;
                }
                return prev ? prev - 1 : 0;
            });
        }, 1000);

        return () => clearInterval(interval);
    }, [phase, timeRemaining]);

    const fetchPracticePool = async () => {
        setLoading(true);
        try {
            const res = await axiosClient.get('/api/student_quiz/get_practice_pool.php?mode=practice', {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.data.status === 'true') {
                setWrongItems(res.data.wrong || []);
                setBookmarkedItems(res.data.bookmarked || []);
                if (res.data.quiz_session_id) {
                    setQuizSessionId(res.data.quiz_session_id);
                }

                const allUnits = new Set<string>();
                [...(res.data.wrong || []), ...(res.data.bookmarked || [])].forEach((item: PracticeItem) => {
                    allUnits.add(item.unit_id);
                });
                setPracticeUnits(allUnits);
            } else {
                toast.error(res.data.message || "Failed to load practice pool");
            }
        } catch (err) {
            console.error(err);
            toast.error("Server error");
        } finally {
            setLoading(false);
        }
    };

    const removeBookmark = async (bookmarkId: number) => {
        try {
            const res = await axiosClient.post('/api/student_quiz/remove_bookmark.php',
                { bookmark_id: bookmarkId },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            if (res.data.status === 'true') {
                setBookmarkedItems(prev => prev.filter(b => b.id !== bookmarkId));
                toast.success("Bookmark removed");
            }
        } catch (err) {
            console.error(err);
            toast.error("Failed to remove bookmark");
        }
    };

    const resolveMistake = async (mistakeId: number) => {
        try {
            const res = await axiosClient.post('/api/student_quiz/resolve_mistake.php',
                { mistake_id: mistakeId },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            if (res.data.status === 'true') {
                setWrongItems(prev => prev.filter(w => w.id !== mistakeId));
            }
        } catch (err) {
            console.error(err);
        }
    };

    const fetchPoolAnswer = async (item: PracticeItem) => {
        const key = `${item.type}-${item.id}`;
        if (poolVerifiedAnswers[key] || verifyingPoolId === key) return;

        setVerifyingPoolId(key);
        try {
            const res = await axiosClient.post('/api/student_quiz/verify_answer.php', {
                quiz_session_id: quizSessionId,
                question_index: item.originalIndex,
                selected_option: -1
            });

            if (res.data.status === 'true') {
                setPoolVerifiedAnswers(prev => ({ ...prev, [key]: res.data.data }));
            }
        } catch (err) {
            console.error(err);
            toast.error("Failed to fetch answer");
        } finally {
            setVerifyingPoolId(null);
        }
    };

    const currentItems = activeTab === 'wrong'
        ? (showAllWrongs ? wrongItems : wrongItems.filter(i => i.is_latest_set))
        : bookmarkedItems;

    const allUnits = useMemo(() => {
        return Array.from(new Set([...wrongItems, ...bookmarkedItems].map(i => i.unit_id)));
    }, [wrongItems, bookmarkedItems]);

    const totalAvailable = useMemo(() => {
        let count = 0;
        if (practiceSource === 'wrong' || practiceSource === 'both') {
            const pool = practiceFilter === 'latest' ? wrongItems.filter(i => i.is_latest_set) : wrongItems;
            count += pool.length;
        }
        if (practiceSource === 'bookmarked' || practiceSource === 'both') count += bookmarkedItems.length;
        return count;
    }, [wrongItems, bookmarkedItems, practiceSource, practiceFilter]);

    // Default practiceCount to max available when source changes
    useEffect(() => {
        if (totalAvailable > 0) {
            setPracticeCount(totalAvailable);
        }
    }, [totalAvailable]);


    const toggleExpand = (item: PracticeItem) => {
        const key = `${item.type}-${item.id}`;
        const isExpanding = expandedId !== key;
        setExpandedId(isExpanding ? key : null);
        if (isExpanding) {
            fetchPoolAnswer(item);
        }
    };

    const startPractice = () => {
        let pool: PracticeItem[] = [];

        if (practiceSource === 'wrong' || practiceSource === 'both') {
            const wrongPool = practiceFilter === 'latest' ? wrongItems.filter(i => i.is_latest_set) : wrongItems;
            pool.push(...wrongPool);
        }
        if (practiceSource === 'bookmarked' || practiceSource === 'both') {
            pool.push(...bookmarkedItems);
        }

        pool = pool.filter(item => practiceUnits.has(item.unit_id));

        if (practiceMarks !== 'random') {
            pool = pool.filter(item => String(item.marks) === practiceMarks);
        }

        pool = pool.sort(() => Math.random() - 0.5).slice(0, practiceCount);

        if (pool.length === 0) {
            toast.error("No questions match your criteria");
            return;
        }

        setQuizItems(pool);
        setCurrentIndex(0);
        setUserAnswers({});
        setShowFeedback(false);
        setShowPracticeConfig(false);
        setPhase('quiz');

        if (timeLimit > 0) {
            setTimeRemaining(timeLimit * 60);
        }
    };

    const handleAnswer = async (optIdx: number) => {
        if (showFeedback || verifyingAnswer) return;

        setUserAnswers(prev => ({ ...prev, [currentIndex]: optIdx }));
        setVerifyingAnswer(true);

        const currentItem = quizItems[currentIndex];

        try {
            const res = await axiosClient.post('/api/student_quiz/verify_answer.php', {
                quiz_session_id: quizSessionId,
                question_index: currentItem.originalIndex,
                selected_option: optIdx
            });

            if (res.data.status === 'true') {
                const data = res.data.data;
                setVerifiedAnswers(prev => ({ ...prev, [currentIndex]: data }));
                setShowFeedback(true);

                if (currentItem.type === 'wrong' && data.is_correct) {
                    await resolveMistake(currentItem.id);
                    toast.success("Mistake mastered!", { icon: '✨' });
                }
            }
        } catch (err) {
            console.error(err);
            toast.error("Verification failed");
        } finally {
            setVerifyingAnswer(false);
        }
    };

    const nextQuestion = () => {
        if (currentIndex < quizItems.length - 1) {
            setCurrentIndex(prev => prev + 1);
            setShowFeedback(false);
        } else {
            setPhase('results');
        }
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
    );

    // --- Results Phase ---
    if (phase === 'results') {
        const correctCount = quizItems.filter((_, idx) =>
            verifiedAnswers[idx]?.is_correct === true
        ).length;

        return (
            <div className="py-8">
                <div className="max-w-3xl mx-auto">
                    <div className="bg-white dark:bg-gray-900 rounded-2xl p-8 border border-gray-200 dark:border-gray-800 text-center mb-8">
                        <div className="w-24 h-24 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
                            <Check size={40} className="text-blue-600" />
                        </div>
                        <h1 className="text-3xl font-black mb-2 text-gray-900 dark:text-white">Practice Complete!</h1>
                        <p className="text-5xl font-black text-blue-600 my-4">{correctCount}/{quizItems.length}</p>
                        <p className="text-gray-600 dark:text-gray-400">Questions Correct</p>
                    </div>
                    <button
                        onClick={() => { setPhase('browse'); fetchPracticePool(); }}
                        className="w-full py-4 bg-gray-900 dark:bg-blue-600 text-white rounded-xl font-bold"
                    >
                        Back to Browse
                    </button>
                </div>
            </div>
        );
    }

    // --- Quiz Phase ---
    if (phase === 'quiz') {
        const currentItem = quizItems[currentIndex];
        const q = currentItem.question;
        const selectedAnswer = userAnswers[currentIndex];

        return (
            <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pb-12">
                <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 sticky top-0 z-10">
                    <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
                        <button onClick={() => setPhase('browse')} className="flex items-center text-gray-600 dark:text-gray-400">
                            <ChevronLeft size={20} className="mr-1" />
                            <span className="text-sm font-bold uppercase">Exit</span>
                        </button>
                        <div className="flex items-center gap-4">
                            {timeRemaining !== null && timeRemaining > 0 && (
                                <div className="flex items-center gap-2 text-amber-600">
                                    <Clock size={18} />
                                    <span className="font-mono font-bold">{formatTime(timeRemaining)}</span>
                                </div>
                            )}
                            <span className="text-sm font-bold text-gray-900 dark:text-white">
                                {currentIndex + 1}/{quizItems.length}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="max-w-3xl mx-auto px-4 pt-8">
                    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 md:p-8">
                        <div className="flex gap-2 mb-4">
                            <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${currentItem.type === 'wrong' ? 'bg-red-100 text-red-600 dark:bg-red-900/20' : 'bg-amber-100 text-amber-600 dark:bg-amber-900/20'}`}>
                                {currentItem.type === 'wrong' ? 'Wrong' : 'Bookmarked'}
                            </span>
                            <span className="px-2 py-1 rounded bg-gray-100 dark:bg-gray-800 text-[10px] font-bold uppercase text-gray-600 dark:text-gray-400">
                                {currentItem.unit_id}
                            </span>
                            <span className="px-2 py-1 rounded bg-gray-100 dark:bg-gray-800 text-[10px] font-bold uppercase text-gray-600 dark:text-gray-400">
                                {currentItem.marks}M
                            </span>
                        </div>

                        <div className="text-xl font-bold mb-8 text-gray-900 dark:text-white">
                            <LatexRenderer>{q.question}</LatexRenderer>
                        </div>

                        {q.imageLink && (
                            <div className="mb-8 rounded-xl overflow-hidden border border-gray-100 dark:border-gray-800">
                                <img src={q.imageLink} alt="Question" className="max-w-full mx-auto" />
                            </div>
                        )}

                        <div className="space-y-3">
                            {q.options.map((opt, optIdx) => {
                                const isSelected = selectedAnswer === optIdx;
                                const isCorrect = verifiedAnswers[currentIndex]?.correct_option === optIdx;
                                const isWrongSelection = isSelected && verifiedAnswers[currentIndex] && !verifiedAnswers[currentIndex].is_correct;

                                let stateClass = "border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-800/20";
                                if (showFeedback) {
                                    if (isCorrect) stateClass = "border-green-500 bg-green-50 dark:bg-green-900/20 ring-1 ring-green-500";
                                    else if (isWrongSelection) stateClass = "border-red-500 bg-red-50 dark:bg-red-900/20 ring-1 ring-red-500";
                                } else if (isSelected) {
                                    stateClass = "border-blue-500 bg-blue-50 dark:bg-blue-900/20";
                                }

                                return (
                                    <button
                                        key={optIdx}
                                        onClick={() => handleAnswer(optIdx)}
                                        disabled={showFeedback || verifyingAnswer}
                                        className={`w-full text-left p-5 rounded-2xl border transition-all flex items-center gap-4 ${stateClass}`}
                                    >
                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm ${showFeedback && isCorrect ? 'bg-green-500 text-white' :
                                            showFeedback && isWrongSelection ? 'bg-red-500 text-white' :
                                                isSelected ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-500'
                                            }`}>
                                            {String.fromCharCode(65 + optIdx)}
                                        </div>
                                        <div className="flex-1 font-medium text-gray-700 dark:text-gray-300">
                                            <LatexRenderer>{opt}</LatexRenderer>
                                        </div>
                                        {verifyingAnswer && isSelected && <Loader2 size={18} className="animate-spin text-blue-500" />}
                                        {showFeedback && isCorrect && <Check size={20} className="text-green-600" />}
                                        {showFeedback && isWrongSelection && <X size={20} className="text-red-600" />}
                                    </button>
                                );
                            })}
                        </div>

                        {showFeedback && (
                            <div className="mt-8 p-6 rounded-2xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800 animate-in fade-in slide-in-from-top-4">
                                <div className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Secure Explanation</div>
                                <div className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                                    <LatexRenderer>{verifiedAnswers[currentIndex]?.explanation || "No explanation available."}</LatexRenderer>
                                </div>
                            </div>
                        )}
                    </div>

                    {showFeedback && (
                        <div className="mt-8 flex justify-center">
                            <button
                                onClick={nextQuestion}
                                className="px-10 py-4 bg-gray-900 dark:bg-blue-600 text-white rounded-2xl font-bold flex items-center gap-2"
                            >
                                {currentIndex < quizItems.length - 1 ? 'Next Question' : 'View Results'}
                                <ChevronLeft size={20} className="rotate-180" />
                            </button>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // --- Browse Phase ---
    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Page Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">
                        Smart Practice
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">Review and practice your marked questions</p>
                </div>
                <button
                    onClick={() => setShowPracticeConfig(true)}
                    disabled={totalAvailable === 0}
                    className="px-6 py-3 rounded-xl bg-blue-600 text-white font-bold flex items-center gap-2 hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <Play size={18} />
                    Start Practice
                </button>
            </div>

            {/* Tabs */}
            <div className="flex gap-2">
                <button
                    onClick={() => setActiveTab('wrong')}
                    className={`flex-1 py-3 px-4 rounded-xl font-bold flex items-center justify-center gap-2 transition ${activeTab === 'wrong'
                        ? 'bg-red-100 dark:bg-red-900/20 text-red-600'
                        : 'bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-800'
                        }`}
                >
                    <XCircle size={18} />
                    Wrong ({wrongItems.length})
                </button>
                <button
                    onClick={() => setActiveTab('bookmarked')}
                    className={`flex-1 py-3 px-4 rounded-xl font-bold flex items-center justify-center gap-2 transition ${activeTab === 'bookmarked'
                        ? 'bg-amber-100 dark:bg-amber-900/20 text-amber-600'
                        : 'bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-800'
                        }`}
                >
                    <Bookmark size={18} />
                    Bookmarked ({bookmarkedItems.length})
                </button>
            </div>

            {/* Wrong Filter Toggle */}
            {activeTab === 'wrong' && (
                <div className="flex items-center justify-between px-2 bg-gray-50 dark:bg-gray-800/50 p-3 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700">
                    <div className="flex flex-col">
                        <span className="text-[10px] font-black uppercase tracking-wider text-gray-400">Mistake View</span>
                        <span className="text-xs font-bold text-gray-700 dark:text-gray-300">
                            {showAllWrongs ? 'Showing All Mistakes' : 'Showing Latest 3 Sets'}
                        </span>
                    </div>
                    <button
                        onClick={() => setShowAllWrongs(!showAllWrongs)}
                        className={`text-[9px] font-black uppercase tracking-widest px-4 py-2 rounded-xl transition-all ${showAllWrongs
                            ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20 active:scale-95'
                            : 'bg-white dark:bg-gray-950 text-gray-500 border border-gray-200 dark:border-gray-800 hover:border-blue-400 active:scale-95'
                            }`}
                    >
                        {showAllWrongs ? 'Switch to Latest' : 'Show All History'}
                    </button>
                </div>
            )}

            {/* Empty State */}
            {currentItems.length === 0 && (
                <div className="text-center py-12">
                    <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                        {activeTab === 'wrong' ? <XCircle size={28} className="text-gray-400" /> : <Bookmark size={28} className="text-gray-400" />}
                    </div>
                    <p className="text-gray-500 dark:text-gray-400">
                        {activeTab === 'wrong' ? 'No wrong questions yet!' : 'No bookmarked questions yet!'}
                    </p>
                </div>
            )}

            {/* Question Cards */}
            <div className="space-y-3">
                {currentItems.map((item) => {
                    const key = `${item.type}-${item.id}`;
                    const isExpanded = expandedId === key;
                    const q = item.question;

                    return (
                        <div key={key} className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
                            <button
                                onClick={() => toggleExpand(item)}
                                className="w-full p-4 flex items-center justify-between text-left hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                            >
                                <div className="flex-1 min-w-0">
                                    <div className="text-sm font-medium text-gray-900 dark:text-white line-clamp-2 leading-relaxed">
                                        <LatexRenderer>{q.question}</LatexRenderer>
                                    </div>
                                    <div className="flex gap-2 mt-2">
                                        <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-500 uppercase tracking-widest">
                                            {item.unit_id}
                                        </span>
                                        <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 uppercase tracking-widest">
                                            {item.marks}M
                                        </span>
                                    </div>
                                </div>
                                {isExpanded ? <ChevronUp size={18} className="text-blue-600 shrink-0" /> : <ChevronDown size={18} className="text-gray-400 shrink-0" />}
                            </button>

                            {isExpanded && (
                                <div className="px-5 pb-5 border-t border-gray-100 dark:border-gray-800 pt-5 animate-in slide-in-from-top-2 duration-300">
                                    {q.imageLink && (
                                        <div className="mb-5 rounded-xl overflow-hidden border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/30 p-2">
                                            <img src={q.imageLink} alt="Question" className="max-w-full mx-auto" />
                                        </div>
                                    )}

                                    <div className="space-y-4">
                                        {/* Options Display */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
                                            {q.options.map((opt, optIdx) => {
                                                const isCorrect = poolVerifiedAnswers[key]?.correct_option === optIdx;
                                                return (
                                                    <div
                                                        key={optIdx}
                                                        className={`p-4 rounded-xl border text-sm flex items-center gap-3 transition-colors ${isCorrect
                                                            ? 'border-green-500 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 ring-1 ring-green-500'
                                                            : 'border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30 text-gray-600 dark:text-gray-400'
                                                            }`}
                                                    >
                                                        <div className={`w-6 h-6 rounded flex items-center justify-center font-bold text-[10px] ${isCorrect ? 'bg-green-500 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-500'
                                                            }`}>
                                                            {String.fromCharCode(65 + optIdx)}
                                                        </div>
                                                        <div className="flex-1 font-medium">
                                                            <LatexRenderer>{opt}</LatexRenderer>
                                                        </div>
                                                        {isCorrect && <Check size={14} className="text-green-600" />}
                                                    </div>
                                                );
                                            })}
                                        </div>

                                        {verifyingPoolId === key && !poolVerifiedAnswers[key] ? (
                                            <div className="flex items-center justify-center p-8 bg-gray-50 dark:bg-gray-800/30 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700">
                                                <div className="flex flex-col items-center gap-3">
                                                    <Loader2 size={24} className="animate-spin text-blue-600" />
                                                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Revealing Secure Answer</span>
                                                </div>
                                            </div>
                                        ) : poolVerifiedAnswers[key] ? (
                                            <div className="p-5 bg-blue-50/50 dark:bg-blue-900/10 rounded-2xl border border-blue-100/50 dark:border-blue-900/20 animate-in fade-in zoom-in-95 duration-500">
                                                <div className="flex items-start gap-4">
                                                    <div className="mt-1 w-7 h-7 rounded-xl bg-blue-600 flex items-center justify-center text-white shrink-0 shadow-lg shadow-blue-600/20">
                                                        <Shield size={14} strokeWidth={3} />
                                                    </div>
                                                    <div className="min-w-0 flex-1">
                                                        <div className="flex items-center gap-2 mb-2">
                                                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-600 dark:text-blue-400">
                                                                Explanation & Analysis
                                                            </span>
                                                            <span className="w-1 h-1 bg-blue-200 dark:bg-blue-800 rounded-full" />
                                                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Verified Solution</span>
                                                        </div>
                                                        <div className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed font-medium">
                                                            <LatexRenderer>{poolVerifiedAnswers[key].explanation || "No explanation provided for this question."}</LatexRenderer>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="text-center p-4 bg-red-50 dark:bg-red-900/10 rounded-xl text-red-600 text-xs font-bold">
                                                Failed to load answer. Try closing and opening again.
                                            </div>
                                        )}
                                    </div>

                                    {item.type === 'bookmarked' && (
                                        <div className="mt-5 pt-5 border-t border-gray-50 dark:border-gray-800">
                                            <button
                                                onClick={(e) => { e.stopPropagation(); setBookmarkToDelete(item.id); }}
                                                className="w-full py-3 px-4 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 text-gray-600 dark:text-gray-400 font-bold text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-red-50 hover:text-red-600 hover:border-red-100 transition-all group"
                                            >
                                                <BookmarkMinus size={14} className="group-hover:scale-110 transition-transform" />
                                                Remove from Bookmarks
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            <ConfirmationModal
                isOpen={bookmarkToDelete !== null}
                onClose={() => setBookmarkToDelete(null)}
                onConfirm={() => bookmarkToDelete && removeBookmark(bookmarkToDelete)}
                title="Remove Bookmark?"
                message="Are you sure you want to remove this question from your bookmarks? You can always bookmark it again from the original quiz."
                confirmText="Remove"
                type="danger"
            />

            {/* Practice Config Modal */}
            {showPracticeConfig && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-gray-900 rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
                        <div className="p-6">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                    <Settings size={20} />
                                    Practice Setup
                                </h2>
                                <button onClick={() => setShowPracticeConfig(false)} className="text-gray-400 hover:text-gray-600">
                                    <X size={24} />
                                </button>
                            </div>

                            {/* Source */}
                            <div className="mb-6">
                                <label className="text-[10px] font-bold uppercase text-gray-400 mb-2 block">Question Source</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {[
                                        { value: 'wrong', label: 'Wrong', icon: XCircle },
                                        { value: 'bookmarked', label: 'Bookmarked', icon: Bookmark },
                                        { value: 'both', label: 'Both', icon: Shuffle }
                                    ].map(opt => (
                                        <button
                                            key={opt.value}
                                            onClick={() => setPracticeSource(opt.value as 'wrong' | 'bookmarked' | 'both')}
                                            className={`p-3 rounded-xl border text-sm font-bold flex flex-col items-center gap-1 ${practiceSource === opt.value
                                                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-600'
                                                : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400'
                                                }`}
                                        >
                                            <opt.icon size={18} />
                                            {opt.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Practice Filter (Latest vs All) */}
                            {practiceSource !== 'bookmarked' && (
                                <div className="mb-6">
                                    <label className="text-[10px] font-bold uppercase text-gray-400 mb-2 block">Mistake Range</label>
                                    <div className="grid grid-cols-2 gap-2">
                                        {[
                                            { value: 'latest', label: 'Latest 3 Sets', icon: Clock },
                                            { value: 'all', label: 'All Mistakes', icon: Shuffle }
                                        ].map(opt => (
                                            <button
                                                key={opt.value}
                                                onClick={() => setPracticeFilter(opt.value as 'latest' | 'all')}
                                                className={`p-3 rounded-xl border text-sm font-bold flex flex-col items-center gap-1.5 transition-all ${practiceFilter === opt.value
                                                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-600'
                                                    : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300'
                                                    }`}
                                            >
                                                <opt.icon size={18} />
                                                {opt.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Count */}
                            <div className="mb-6">
                                <label className="text-[10px] font-bold uppercase text-gray-400 mb-2 block">
                                    Number of Questions (max {totalAvailable})
                                </label>
                                <input
                                    type="number"
                                    min={1}
                                    max={totalAvailable}
                                    value={practiceCount}
                                    onChange={(e) => {
                                        const val = parseInt(e.target.value) || 1;
                                        setPracticeCount(Math.min(Math.max(1, val), totalAvailable));
                                    }}
                                    className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-bold text-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                    placeholder="Enter number..."
                                />
                                {practiceCount > totalAvailable && (
                                    <p className="text-red-500 text-xs mt-1">Maximum {totalAvailable} questions available</p>
                                )}
                            </div>

                            {/* Marks Filter */}
                            <div className="mb-6">
                                <label className="text-[10px] font-bold uppercase text-gray-400 mb-2 block">Marks Filter</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {[
                                        { value: '1', label: '1 Mark' },
                                        { value: '2', label: '2 Marks' },
                                        { value: 'random', label: 'Random' }
                                    ].map(opt => (
                                        <button
                                            key={opt.value}
                                            onClick={() => setPracticeMarks(opt.value as '1' | '2' | 'random')}
                                            className={`py-2 px-3 rounded-lg text-sm font-bold ${practiceMarks === opt.value
                                                ? 'bg-blue-600 text-white'
                                                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                                                }`}
                                        >
                                            {opt.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Units */}
                            <div className="mb-6">
                                <label className="text-[10px] font-bold uppercase text-gray-400 mb-2 block">Units</label>
                                <div className="space-y-2 max-h-32 overflow-y-auto">
                                    {allUnits.map(unit => (
                                        <label key={unit} className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={practiceUnits.has(unit)}
                                                onChange={(e) => {
                                                    const newUnits = new Set(practiceUnits);
                                                    if (e.target.checked) newUnits.add(unit);
                                                    else newUnits.delete(unit);
                                                    setPracticeUnits(newUnits);
                                                }}
                                                className="rounded"
                                            />
                                            <span className="text-sm text-gray-700 dark:text-gray-300 truncate">{unit}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            {/* Time Limit */}
                            <div className="mb-6">
                                <label className="text-[10px] font-bold uppercase text-gray-400 mb-2 block">Time Limit</label>
                                <div className="flex gap-2">
                                    {[0, 5, 10, 15, 30].map(mins => (
                                        <button
                                            key={mins}
                                            onClick={() => setTimeLimit(mins)}
                                            className={`flex-1 py-2 rounded-lg text-sm font-bold ${timeLimit === mins
                                                ? 'bg-blue-600 text-white'
                                                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                                                }`}
                                        >
                                            {mins === 0 ? 'None' : `${mins}m`}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Start Button */}
                            <div className="space-y-4 mb-6">
                                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block">Security Verification</label>
                                {!captchaVerified ? (
                                    <div className="flex justify-center p-4 bg-gray-50 dark:bg-gray-900/50 rounded-2xl border border-gray-100 dark:border-gray-800">
                                        <Turnstile
                                            sitekey={TURNSTILE_SITE_KEY}
                                            onVerify={() => setCaptchaVerified(true)}
                                            theme="auto"
                                        />
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-3 p-4 bg-green-50 dark:bg-green-900/20 rounded-2xl border border-green-100 dark:border-green-900/30 text-green-600 dark:text-green-400">
                                        <Shield size={20} />
                                        <span className="text-sm font-bold">Verification Successful</span>
                                    </div>
                                )}
                            </div>

                            <button
                                onClick={startPractice}
                                disabled={totalAvailable === 0 || !captchaVerified}
                                className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-bold flex items-center justify-center gap-2"
                            >
                                <Play size={20} />
                                Start Secure Practice
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SmartPracticeBuilderPage;
