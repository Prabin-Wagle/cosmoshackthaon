import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axiosClient from '../api/axiosClient';
import { LatexRenderer } from '../components/latexRender';
import { Clock, ChevronLeft, ChevronRight, CheckCircle, Bookmark, Timer, LogOut, ArrowRight, LayoutGrid, X, Shield, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import Turnstile from 'react-turnstile';

const TURNSTILE_SITE_KEY = '0x4AAAAAACU4jsSvr7a6OSp7';

interface Question {
    questionId: string;
    questionNo: number | string;
    question: string;
    options: string[];
    correctOption: number;
    marks: number;
    explanation: string;
    imageLink?: string | null;
    unitId?: string | null;
    chapterId?: string | null;
    originalIndex: number;
    shuffledOptions?: number[];
}

interface QuizData {
    id: number;
    title: string;
    time_limit: number;
    negative_marking: number;
    questions: Question[];
    mode?: string;
    start_time?: string | null;
    end_time?: string | null;
    server_time?: string;
    attempt_count?: number;
}



const QuizPlayerPage: React.FC = () => {
    const { quizId } = useParams<{ quizId: string }>();
    const collectionId = new URLSearchParams(window.location.search).get('collectionId');
    const navigate = useNavigate();

    const [quizData, setQuizData] = useState<QuizData | null>(null);
    const [loading, setLoading] = useState(true);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [selectedOptions, setSelectedOptions] = useState<{ [key: number]: number }>({});
    const [timeLeft, setTimeLeft] = useState(0);
    const [hasStarted, setHasStarted] = useState(false);
    const [bookmarkedQuestions, setBookmarkedQuestions] = useState<Set<number>>(new Set());
    const [submitting, setSubmitting] = useState(false);

    // Per-question timer - use object to track all times at once
    const [questionTimes, setQuestionTimes] = useState<{ [key: number]: number }>({});

    const [hasAttempted, setHasAttempted] = useState(false);
    const [warningShown, setWarningShown] = useState(false);
    const [showMobileSidebar, setShowMobileSidebar] = useState(false);
    const [isTimeUp, setIsTimeUp] = useState(false);
    const [readonly, setReadonly] = useState(false);

    const [captchaVerified, setCaptchaVerified] = useState(false);
    const [captchaError, setCaptchaError] = useState(false);
    const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
    const [quizSessionId, setQuizSessionId] = useState<string | null>(null);
    const [tabSwitchCount, setTabSwitchCount] = useState(0);
    const [showWarningModal, setShowWarningModal] = useState(false);
    const [totalQuestions, setTotalQuestions] = useState(0);
    const [allAnswers, setAllAnswers] = useState<{ [key: number]: number }>({});
    const [currentPage, setCurrentPage] = useState(1);

    const isExiting = useRef(false);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const questionTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const token = localStorage.getItem('token');

    useEffect(() => {
        if (!token) {
            navigate('/login');
            return;
        }
        // Only load quiz after CAPTCHA is verified
        if (captchaVerified && turnstileToken) {
            window.disableSecurity = false;
            loadQuiz(turnstileToken);
        } else {
            window.disableSecurity = true;
        }
    }, [quizId, captchaVerified, turnstileToken]);

    const loadQuiz = async (captchaToken: string) => {
        setLoading(true);
        try {
            const url = `/api/student_quiz/get_quiz_data.php?quiz_id=${quizId}&turnstile_token=${encodeURIComponent(captchaToken)}&session_id=${quizSessionId || ''}`;
            const res = await axiosClient.get(url, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (res.data.status === 'true') {
                const data = res.data.data;
                const dataWithIndices = {
                    ...data,
                    questions: data.questions.map((q: any, idx: number) => ({ ...q, originalIndex: idx }))
                };
                setQuizData(dataWithIndices);
                setTotalQuestions(data.total_questions);
                setQuizSessionId(data.quiz_session_id);

                // Sync time for LIVE quizzes or use time_limit
                if (data.mode === 'LIVE' && data.start_time && data.end_time) {
                    const now = new Date().getTime();
                    const endTs = new Date(data.end_time.replace(' ', 'T')).getTime();
                    const configSeconds = data.time_limit * 60;
                    const globalRemaining = Math.floor((endTs - now) / 1000);
                    setTimeLeft(Math.min(configSeconds, globalRemaining > 0 ? globalRemaining : 0));
                } else {
                    setTimeLeft(data.time_limit * 60);
                }

                if (data.mode === 'LIVE' && data.attempt_count > 0) {
                    setHasAttempted(true);
                }
            } else {
                toast.error(res.data.message || "Failed to load quiz");
                if (res.data.message?.includes('expired') || res.data.message?.includes('session')) {
                    setTimeout(() => window.location.reload(), 2000);
                }
            }
        } catch (err) {
            console.error("Load error:", err);
            toast.error("Server error");
        } finally {
            setLoading(false);
        }
    };

    // Tab switch detection
    useEffect(() => {
        if (!hasStarted || isTimeUp) return;

        const handleVisibilityChange = async () => {
            if (document.hidden) {
                setTabSwitchCount(prev => {
                    const newCount = prev + 1;
                    if (newCount >= 3) {
                        toast.error("Security Violation: Quiz restarting due to multiple tab switches.");
                        if (quizSessionId) {
                            axiosClient.post('/api/student_quiz/delete_quiz_session.php',
                                { session_id: quizSessionId },
                                { headers: { Authorization: `Bearer ${token}` } }
                            ).catch(() => { });
                        }
                        setTimeout(() => window.location.reload(), 2000);
                    } else {
                        setShowWarningModal(true);
                    }
                    return newCount;
                });
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, [hasStarted, isTimeUp, quizSessionId, token]);

    // Overall quiz timer
    useEffect(() => {
        // Run timer if:
        // 1. Quiz has been started by user
        // 2. OR it's a LIVE quiz and it's already past start time (ongoing)
        const isLiveOngoing = quizData?.mode === 'LIVE' && quizData.start_time && new Date().getTime() >= new Date(quizData.start_time.replace(' ', 'T')).getTime();

        if ((hasStarted || isLiveOngoing) && timeLeft > 0) {
            timerRef.current = setInterval(() => {
                setTimeLeft(prev => {
                    if (prev === 300 && !warningShown) {
                        toast("5 minutes remaining!", { icon: '⏰', duration: 5000 });
                        setWarningShown(true);
                    }
                    if (prev <= 1) {
                        // Time's up logic
                        setTimeLeft(0);
                        setIsTimeUp(true);
                        setReadonly(true);
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        }
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [hasStarted, timeLeft, quizData]);

    // Per-question timer - runs continuously
    useEffect(() => {
        if (!hasStarted) return;

        questionTimerRef.current = setInterval(() => {
            setQuestionTimes(prev => ({
                ...prev,
                [currentQuestionIndex]: (prev[currentQuestionIndex] || 0) + 1
            }));
        }, 1000);

        return () => {
            if (questionTimerRef.current) clearInterval(questionTimerRef.current);
        };
    }, [currentQuestionIndex, hasStarted]);

    // Save progress to localStorage
    useEffect(() => {
        if (!quizData || submitting || isExiting.current) return;

        const state = {
            questions: quizData.questions,
            selectedOptions,
            bookmarkedQuestions: Array.from(bookmarkedQuestions),
            questionTimes,
            currentQuestionIndex,
            hasStarted,
            timeLeft,
            readonly,
            quizSessionId,
            lastSaved: new Date().getTime()
        };

        localStorage.setItem(`quiz_progress_${quizId}`, JSON.stringify(state));
    }, [selectedOptions, bookmarkedQuestions, questionTimes, currentQuestionIndex, hasStarted, timeLeft, quizData, submitting, quizId, readonly, quizSessionId]);

    // Sync currentPage with currentQuestionIndex
    useEffect(() => {
        if (quizData?.questions) {
            const pageOfQuestion = Math.ceil((currentQuestionIndex + 1) / 25);
            if (pageOfQuestion !== (currentPage || 1)) {
                setCurrentPage(pageOfQuestion);
            }
        }
    }, [currentQuestionIndex, quizData, currentPage]);

    const handleQuestionChange = (newIndex: number) => {
        setCurrentQuestionIndex(newIndex);
    };

    const handleOptionSelect = (qIdx: number, optIdx: number) => {
        if (readonly) {
            toast.error("Time expired. You can only view questions now.");
            return;
        }

        const answerObj = { ...allAnswers, [qIdx]: optIdx };
        setAllAnswers(answerObj);

        // Also update selectedOptions for the current page view
        setSelectedOptions(prev => ({
            ...prev,
            [qIdx]: optIdx
        }));
    };

    // Bookmark functionality moved inline

    const handleExit = async () => {
        const confirmed = window.confirm("Are you sure you want to exit? Your progress will be lost.");
        if (confirmed) {
            if (quizSessionId) {
                try {
                    await axiosClient.post('/api/student_quiz/delete_quiz_session.php',
                        { session_id: quizSessionId },
                        { headers: { Authorization: `Bearer ${token}` } }
                    );
                } catch (err) {
                    console.error("Session delete error:", err);
                }
            }
            isExiting.current = true;
            localStorage.removeItem(`quiz_progress_${quizId}`);
            if (collectionId) {
                navigate(`/test-series/collection/${collectionId}`);
            } else {
                navigate('/test-series');
            }
        }
    };

    const handleBackToLibrary = () => {
        isExiting.current = true;
        localStorage.removeItem(`quiz_progress_${quizId}`);
        if (collectionId) {
            navigate(`/test-series/collection/${collectionId}`);
        } else {
            navigate('/test-series');
        }
    };

    const handleSubmit = async (isAuto = false) => {
        if (!quizData || submitting) return;

        // 10% attempt rule check
        const answeredCount = Object.keys(allAnswers).length;
        const minRequired = Math.ceil(totalQuestions * 0.1);

        if (!isAuto && answeredCount < minRequired) {
            toast.error(`You must attempt at least 10% of questions (${minRequired}) to submit.`);
            return;
        }

        if (!isAuto) {
            const confirmed = window.confirm(`You have answered ${answeredCount} out of ${totalQuestions} questions. Submit your test?`);
            if (!confirmed) return;
        }

        // Build responses using allAnswers
        const responses = Object.keys(allAnswers).map(qIdx => {
            return {
                index: parseInt(qIdx),
                selected: allAnswers[parseInt(qIdx)],
                bookmarked: bookmarkedQuestions.has(parseInt(qIdx)),
                time_spent: questionTimes[parseInt(qIdx)] || 0
            };
        });

        setSubmitting(true);
        const loadingToast = toast.loading("Submitting...");

        try {
            const resultData = {
                quiz_id: quizId,
                collection_id: collectionId ? parseInt(collectionId) : null,
                quiz_session_id: quizSessionId,
                total_questions: totalQuestions,
                responses: responses
            };

            const response = await axiosClient.post('/api/student_quiz/store_quiz_result.php', resultData, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (response.data.status === 'true') {
                toast.success("Submitted!", { id: loadingToast });
                isExiting.current = true;
                localStorage.removeItem(`quiz_progress_${quizId}`);
                navigate(`/test-series/result/${response.data.attempt_id}`);
            } else {
                toast.error(response.data.message || "Failed", { id: loadingToast });
            }
        } catch (err) {
            console.error("Submit error:", err);
            toast.error("Connection error", { id: loadingToast });
        } finally {
            setSubmitting(false);
        }
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const getStatusColor = (idx: number) => {
        if (selectedOptions[idx] !== undefined) return 'bg-green-500 dark:bg-green-600 text-white border-transparent';
        if (bookmarkedQuestions.has(idx)) return 'bg-yellow-500 dark:bg-yellow-600 text-white border-transparent';
        return 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-gray-900 dark:hover:border-blue-500';
    };

    // CAPTCHA Verification Screen - must pass before quiz loads
    if (!captchaVerified) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-950 dark:to-gray-900 p-4">
                <div className="max-w-md w-full text-center">
                    <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl border border-gray-100 dark:border-gray-700 p-8 space-y-6 animate-in fade-in zoom-in duration-500">
                        <div className={`w-16 h-16 mx-auto rounded-2xl flex items-center justify-center shadow-lg transition-all duration-500 ${captchaError ? 'bg-red-500 shadow-red-500/30' : 'bg-gradient-to-br from-blue-500 to-indigo-600 shadow-blue-500/30'}`}>
                            <Shield size={28} className="text-white" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-black text-gray-900 dark:text-white mb-2">
                                {captchaError ? 'Verification Failed' : 'Security Check'}
                            </h2>
                            <p className="text-gray-500 dark:text-gray-400 text-sm">
                                {captchaError
                                    ? 'A security error occurred. Please refresh the page to try again.'
                                    : 'Complete the verification below to start your quiz'}
                            </p>
                        </div>

                        {!captchaError ? (
                            <div className="flex justify-center">
                                <Turnstile
                                    sitekey={TURNSTILE_SITE_KEY}
                                    onVerify={(token: string) => {
                                        setTurnstileToken(token);
                                        setCaptchaVerified(true);
                                        setLoading(true);
                                    }}
                                    onError={() => {
                                        setCaptchaError(true);
                                        toast.error('Verification failed. Please refresh.');
                                    }}
                                    theme="auto"
                                />
                            </div>
                        ) : (
                            <button
                                onClick={() => window.location.reload()}
                                className="w-full py-4 bg-gray-900 dark:bg-gray-700 text-white rounded-xl font-bold hover:bg-black transition-all active:scale-95"
                            >
                                Refresh Page
                            </button>
                        )}

                        <p className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-widest font-bold">
                            Protected by Cloudflare Turnstile
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
            <div className="text-center space-y-4">
                <Loader2 size={32} className="animate-spin text-blue-500 mx-auto" />
                <p className="text-sm text-gray-500 dark:text-gray-400 font-bold">Loading secure quiz...</p>
            </div>
        </div>
    );

    if (!quizData) return <div>Quiz not found.</div>;

    const currentQ = quizData.questions[currentQuestionIndex];

    if (!currentQ) {
        return <div className="p-8">Question data missing</div>;
    }

    const currentQuestionTime = questionTimes[currentQuestionIndex] || 0;

    return (
        <div className="h-screen bg-white dark:bg-gray-950 flex flex-col overflow-hidden transition-colors duration-300">
            {!hasStarted ? (
                <div className="flex-1 flex items-center justify-center p-6 bg-gradient-to-b from-gray-50 to-white dark:from-gray-950 dark:to-gray-900">
                    <div className="max-w-md w-full text-center">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 text-[10px] font-bold uppercase tracking-widest mb-6 border border-blue-100 dark:border-blue-900/30">
                            Ready to Begin
                        </div>
                        <h1 className="text-3xl font-black mb-4 text-gray-900 dark:text-white leading-tight">{quizData.title}</h1>
                        <p className="text-gray-500 dark:text-gray-400 mb-8 text-sm leading-relaxed px-4">
                            Ensure a stable connection. For LIVE quizzes, the timer syncs with the exam schedule even if you refresh.
                        </p>

                        <div className="grid grid-cols-2 gap-4 mb-8">
                            <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm transition-all hover:border-blue-200 dark:hover:border-blue-900/50 group">
                                <div className="text-[9px] text-gray-400 dark:text-gray-500 mb-1 uppercase tracking-widest font-black group-hover:text-blue-500 transition-colors">Time Limit</div>
                                <div className="text-3xl font-black text-gray-900 dark:text-white tabular-nums">
                                    {timeLeft < 60 ? `${timeLeft}s` : `${Math.floor(timeLeft / 60)}m`}
                                </div>
                            </div>
                            <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm transition-all hover:border-blue-200 dark:hover:border-blue-900/50 group">
                                <div className="text-[9px] text-gray-400 dark:text-gray-500 mb-1 uppercase tracking-widest font-black group-hover:text-blue-500 transition-colors">Questions</div>
                                <div className="text-3xl font-black text-gray-900 dark:text-white tabular-nums">{quizData.questions.length}</div>
                            </div>
                        </div>

                        {/* Rules & Regulations Section */}
                        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm mb-8 text-left">
                            <h3 className="text-sm font-black text-gray-900 dark:text-white mb-4 uppercase tracking-widest flex items-center gap-2">
                                <Shield size={16} className="text-blue-500" />
                                Rules & Regulations
                            </h3>
                            <ul className="space-y-3 text-xs text-gray-500 dark:text-gray-400 font-medium">
                                <li className="flex gap-2">
                                    <span className="text-blue-500 font-bold">•</span>
                                    <span>Tab switching is strictly prohibited. You get 3 warnings before the quiz restarts.</span>
                                </li>
                                <li className="flex gap-2">
                                    <span className="text-blue-500 font-bold">•</span>
                                    <span>You must answer at least 10% of the questions to submit the examination.</span>
                                </li>
                                <li className="flex gap-2">
                                    <span className="text-blue-500 font-bold">•</span>
                                    <span>Questions are presented in blocks of 25. Use the pagination buttons at the bottom.</span>
                                </li>
                            </ul>
                        </div>

                        {hasAttempted ? (
                            <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30 rounded-xl mb-6">
                                <p className="text-red-600 dark:text-red-400 text-xs font-bold font-sans">
                                    You have already attempted this Live Quiz. Only one attempt is allowed.
                                </p>
                            </div>
                        ) : (
                            <button
                                onClick={() => setHasStarted(true)}
                                className="w-full py-4 bg-blue-600 dark:bg-blue-600 text-white rounded-xl hover:bg-blue-700 dark:hover:bg-blue-700 font-bold mb-4 transition-all shadow-xl shadow-blue-200 dark:shadow-blue-900/20 active:scale-95 flex items-center justify-center gap-2 group"
                            >
                                <span>START EXAMINATION</span>
                                <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                            </button>
                        )}

                        <div className="flex flex-col gap-4">
                            <button
                                onClick={handleBackToLibrary}
                                className="text-sm font-bold text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors flex items-center justify-center gap-1"
                            >
                                <ChevronLeft size={16} />
                                <span>Back to Library</span>
                            </button>
                        </div>
                    </div>
                </div>
            ) : (
                <>
                    <header className="px-6 py-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between sticky top-0 bg-white/80 dark:bg-gray-950/80 backdrop-blur-md z-30 transition-colors">
                        <div className="flex items-center gap-4">
                            <button
                                onClick={handleExit}
                                className="flex items-center gap-1.5 px-2 py-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg text-gray-500 hover:text-red-600 transition-all group"
                                title="Exit Quiz"
                            >
                                <LogOut size={16} className="sm:w-[18px] sm:h-[18px] group-hover:-translate-x-1 transition-transform" />
                                <span className="text-[9px] sm:text-xs font-bold uppercase tracking-wider hidden xs:inline">Exit</span>
                            </button>
                            <div className="h-6 w-px bg-gray-200 dark:bg-gray-800"></div>
                            <div className="hidden xs:block">
                                <h2 className="text-sm font-black text-gray-900 dark:text-white truncate max-w-[120px] sm:max-w-[200px]">{quizData.title}</h2>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 sm:gap-3">
                            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800">
                                <Timer size={14} className="text-gray-400" />
                                <span className="text-xs font-bold tabular-nums text-gray-600 dark:text-gray-400">{formatTime(currentQuestionTime)}</span>
                            </div>
                            <div className={`flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl font-black border transition-all shadow-sm ${timeLeft < 300 ? 'bg-red-500 text-white border-red-600 animate-pulse' : 'bg-gray-900 dark:bg-blue-600 text-white border-gray-900 dark:border-blue-700'
                                }`}>
                                <Clock size={14} className="sm:w-[16px] sm:h-[16px]" />
                                <span className="text-xs sm:text-sm tabular-nums tracking-tighter">{formatTime(timeLeft)}</span>
                            </div>
                            <button
                                onClick={() => handleSubmit(false)}
                                disabled={submitting}
                                className="px-3 sm:px-5 py-2 sm:py-2.5 bg-green-500 hover:bg-green-600 text-white rounded-lg sm:rounded-xl text-[9px] sm:text-[10px] font-black uppercase tracking-widest disabled:opacity-50 transition-all shadow-lg shadow-green-500/20 active:scale-95 flex items-center gap-1.5"
                            >
                                {submitting ? '...' : (
                                    <>
                                        <CheckCircle size={14} className="sm:w-[14px] sm:h-[14px]" />
                                        <span>Finish</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </header>

                    <main className="flex-1 flex overflow-hidden">
                        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-6 sm:py-12 pb-24 sm:pb-32">
                            <div className="space-y-12">
                                {(() => {
                                    // Desktop Block View
                                    const startIndex = (currentPage - 1) * 25;
                                    const currentQuestions = quizData.questions.slice(startIndex, startIndex + 25);

                                    // Mobile Single Question
                                    const mobileQuestion = quizData.questions[currentQuestionIndex];
                                    const mGlobalIdx = mobileQuestion?.originalIndex;
                                    const mIsBookmarked = bookmarkedQuestions.has(mGlobalIdx);

                                    return (
                                        <>
                                            {/* Desktop List View */}
                                            <div className="hidden lg:block space-y-12">
                                                {currentQuestions.map((q, idx) => {
                                                    const qGlobalIdx = q.originalIndex;
                                                    const isBookmarked = bookmarkedQuestions.has(qGlobalIdx);

                                                    return (
                                                        <div key={q.questionId || idx} id={`question-${qGlobalIdx}`} className="mb-12 p-6 sm:p-8 bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm scroll-mt-24">
                                                            <div className="flex items-center justify-between mb-6">
                                                                <div className="flex items-center gap-3">
                                                                    <span className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white">Q{q.questionNo}</span>
                                                                    <div className="flex items-center gap-2">
                                                                        <span className="bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider">
                                                                            {q.marks} Marks
                                                                        </span>
                                                                        {q.unitId && (
                                                                            <span className="bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider">
                                                                                {q.unitId}
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                                <button
                                                                    onClick={() => {
                                                                        setBookmarkedQuestions(prev => {
                                                                            const next = new Set(prev);
                                                                            if (next.has(qGlobalIdx)) next.delete(qGlobalIdx);
                                                                            else next.add(qGlobalIdx);
                                                                            return next;
                                                                        });
                                                                    }}
                                                                    className={`p-2 rounded-lg border transition-all ${isBookmarked
                                                                        ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 border-yellow-300'
                                                                        : 'text-gray-400 border-gray-200 hover:bg-gray-50'
                                                                        }`}
                                                                >
                                                                    <Bookmark size={18} fill={isBookmarked ? "currentColor" : "none"} />
                                                                </button>
                                                            </div>

                                                            <div className="text-base sm:text-lg font-bold text-gray-900 dark:text-white mb-6 leading-relaxed">
                                                                <LatexRenderer>{q.question}</LatexRenderer>
                                                            </div>

                                                            {q.imageLink && (
                                                                <div className="mb-6 rounded-xl overflow-hidden bg-gray-50 dark:bg-gray-900 p-4 border border-gray-100 dark:border-gray-800">
                                                                    <img src={q.imageLink} alt="Question" className="max-w-full mx-auto max-h-[300px] object-contain" />
                                                                </div>
                                                            )}

                                                            <div className="space-y-3">
                                                                {q.options.map((opt, optIdx) => {
                                                                    const isSelected = selectedOptions[qGlobalIdx] === optIdx;
                                                                    return (
                                                                        <button
                                                                            key={optIdx}
                                                                            onClick={() => handleOptionSelect(qGlobalIdx, optIdx)}
                                                                            className={`w-full text-left p-4 rounded-xl border-2 transition-all flex items-center gap-4 group ${isSelected
                                                                                ? 'bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-500/20'
                                                                                : 'bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800 text-gray-700 dark:text-gray-300 hover:border-blue-400'
                                                                                }`}
                                                                        >
                                                                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black shrink-0 ${isSelected ? 'bg-white text-blue-600' : 'bg-gray-100 dark:bg-gray-800'
                                                                                }`}>
                                                                                {String.fromCharCode(65 + optIdx)}
                                                                            </div>
                                                                            <div className="flex-1 font-bold text-sm sm:text-base">
                                                                                <LatexRenderer>{opt}</LatexRenderer>
                                                                            </div>
                                                                        </button>
                                                                    );
                                                                })}
                                                            </div>
                                                        </div>
                                                    );
                                                })}

                                                {/* Desktop Pagination Controls */}
                                                <div className="flex items-center justify-between mt-12 mb-24">
                                                    <button
                                                        onClick={() => {
                                                            setCurrentPage(prev => Math.max(1, prev - 1));
                                                            window.scrollTo({ top: 0, behavior: 'smooth' });
                                                        }}
                                                        disabled={currentPage <= 1 || loading}
                                                        className="px-6 py-3 rounded-2xl border border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-400 font-bold hover:bg-gray-50 dark:hover:bg-gray-900 disabled:opacity-30 transition-all flex items-center gap-2"
                                                    >
                                                        <ChevronLeft size={20} />
                                                        <span>Previous 25 Questions</span>
                                                    </button>

                                                    <div className="text-gray-400 font-bold text-sm">
                                                        Page {currentPage} of {Math.ceil(totalQuestions / 25)}
                                                    </div>

                                                    <button
                                                        onClick={() => {
                                                            setCurrentPage(prev => Math.min(Math.ceil(totalQuestions / 25), prev + 1));
                                                            window.scrollTo({ top: 0, behavior: 'smooth' });
                                                        }}
                                                        disabled={currentPage >= Math.ceil(totalQuestions / 25) || loading}
                                                        className="px-6 py-3 rounded-2xl bg-gray-900 dark:bg-blue-600 text-white font-bold hover:opacity-90 disabled:opacity-30 transition-all flex items-center gap-2 shadow-xl shadow-blue-500/20"
                                                    >
                                                        <span>Next 25 Questions</span>
                                                        <ChevronRight size={20} />
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Mobile Single Question View */}
                                            <div className="lg:hidden">
                                                {mobileQuestion && (
                                                    <div id={`question-mobile-${mGlobalIdx}`} className="p-6 bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm">
                                                        <div className="flex items-center justify-between mb-6">
                                                            <div className="flex items-center gap-3">
                                                                <span className="text-2xl font-black text-gray-900 dark:text-white">Q{mobileQuestion.questionNo}</span>
                                                                <span className="bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider">
                                                                    {mobileQuestion.marks} Marks
                                                                </span>
                                                            </div>
                                                            <button
                                                                onClick={() => {
                                                                    setBookmarkedQuestions(prev => {
                                                                        const next = new Set(prev);
                                                                        if (next.has(mGlobalIdx)) next.delete(mGlobalIdx);
                                                                        else next.add(mGlobalIdx);
                                                                        return next;
                                                                    });
                                                                }}
                                                                className={`p-2 rounded-lg border transition-all ${mIsBookmarked
                                                                    ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 border-yellow-300'
                                                                    : 'text-gray-400 border-gray-200'
                                                                    }`}
                                                            >
                                                                <Bookmark size={18} fill={mIsBookmarked ? "currentColor" : "none"} />
                                                            </button>
                                                        </div>

                                                        <div className="text-base font-bold text-gray-900 dark:text-white mb-6 leading-relaxed">
                                                            <LatexRenderer>{mobileQuestion.question}</LatexRenderer>
                                                        </div>

                                                        {mobileQuestion.imageLink && (
                                                            <div className="mb-6 rounded-xl overflow-hidden bg-gray-50 dark:bg-gray-900 p-4">
                                                                <img src={mobileQuestion.imageLink} alt="Question" className="max-w-full mx-auto max-h-[250px] object-contain" />
                                                            </div>
                                                        )}

                                                        <div className="space-y-2 pb-12">
                                                            {mobileQuestion.options.map((opt, optIdx) => {
                                                                const isSelected = selectedOptions[mGlobalIdx] === optIdx;
                                                                return (
                                                                    <button
                                                                        key={optIdx}
                                                                        onClick={() => handleOptionSelect(mGlobalIdx, optIdx)}
                                                                        className={`w-full text-left p-4 rounded-xl border-2 transition-all flex items-center gap-4 group ${isSelected
                                                                            ? 'bg-blue-600 text-white border-blue-600 shadow-lg'
                                                                            : 'bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800 text-gray-700 dark:text-gray-300'
                                                                            }`}
                                                                    >
                                                                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-black shrink-0 ${isSelected ? 'bg-white text-blue-600' : 'bg-gray-100 dark:bg-gray-800'
                                                                            }`}>
                                                                            {String.fromCharCode(65 + optIdx)}
                                                                        </div>
                                                                        <div className="flex-1 font-bold text-sm">
                                                                            <LatexRenderer>{opt}</LatexRenderer>
                                                                        </div>
                                                                    </button>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </>
                                    );
                                })()}
                            </div>
                        </div>

                        {/* Mobile Bottom Navigation Bar */}
                        <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white/80 dark:bg-gray-950/80 backdrop-blur-md border-t border-gray-200 dark:border-gray-800 p-4 flex items-center justify-between gap-4 z-40">
                            <button
                                onClick={() => handleQuestionChange(Math.max(0, currentQuestionIndex - 1))}
                                disabled={currentQuestionIndex === 0}
                                className="flex-1 flex items-center justify-center py-3 rounded-xl border border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-400 font-black text-xs uppercase tracking-widest disabled:opacity-20 transition-all active:scale-95"
                            >
                                <ChevronLeft size={18} className="mr-1" />
                                <span>Prev</span>
                            </button>
                            <button
                                onClick={() => {
                                    if (currentQuestionIndex < quizData.questions.length - 1) {
                                        handleQuestionChange(currentQuestionIndex + 1);
                                    } else {
                                        handleSubmit(false);
                                    }
                                }}
                                className="flex-1 flex items-center justify-center py-3 bg-blue-600 text-white rounded-xl font-black text-xs uppercase tracking-widest transition-all active:scale-95 shadow-lg shadow-blue-500/20"
                            >
                                <span>{currentQuestionIndex === quizData.questions.length - 1 ? 'Finish' : 'Next'}</span>
                                <ChevronRight size={18} className="ml-1" />
                            </button>
                        </div>

                        {/* Mobile Sidebar Toggle Button */}
                        <div className="lg:hidden fixed bottom-24 right-6 z-50">
                            <button
                                onClick={() => setShowMobileSidebar(true)}
                                className="w-14 h-14 bg-gray-900 dark:bg-gray-800 text-white rounded-full shadow-2xl flex items-center justify-center active:scale-95 transition-all border border-white/10"
                            >
                                <LayoutGrid size={24} />
                            </button>
                        </div>

                        {/* Backdrop for mobile sidebar */}
                        {
                            showMobileSidebar && (
                                <div
                                    className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
                                    onClick={() => setShowMobileSidebar(false)}
                                ></div>
                            )
                        }

                        <aside className={`
                            w-72 border-l border-gray-200 dark:border-gray-800 flex flex-col bg-white dark:bg-gray-950 transition-all z-50
                            fixed inset-y-0 right-0 lg:static lg:translate-x-0
                            ${showMobileSidebar ? 'translate-x-0' : 'translate-x-full lg:flex'}
                            shadow-[-10px_0_30px_rgba(0,0,0,0.1)] lg:shadow-none
                        `}>
                            <div className="p-6 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 flex justify-between items-center transition-colors">
                                <h3 className="text-[10px] font-black text-gray-500 dark:text-gray-500 uppercase tracking-widest">Question Grid</h3>
                                <button className="lg:hidden text-gray-400" onClick={() => setShowMobileSidebar(false)}>
                                    <X size={18} />
                                </button>
                            </div>

                            <div className="lg:hidden px-6 py-4 border-b border-gray-200 dark:border-gray-800 flex items-center gap-3">
                                <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 flex-1">
                                    <Timer size={14} className="text-gray-400" />
                                    <span className="text-xs font-bold tabular-nums text-gray-600 dark:text-gray-400">{formatTime(currentQuestionTime)}</span>
                                </div>
                            </div>

                            <div className="p-6 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 transition-colors">
                                <div>
                                    <div className="flex justify-between items-end mb-2">
                                        <span className="text-[9px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">Global Progress</span>
                                        <div className="text-xs font-black text-gray-900 dark:text-white flex items-center gap-1">
                                            <span className="text-blue-600 dark:text-blue-400">{Object.keys(allAnswers).length}</span>
                                            <span className="text-gray-300 dark:text-gray-700">/</span>
                                            <span>{totalQuestions}</span>
                                        </div>
                                    </div>
                                    <div className="h-1.5 w-full bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-blue-600 transition-all duration-500 ease-out shadow-[0_0_8px_rgba(37,99,235,0.4)]"
                                            style={{ width: `${(Object.keys(allAnswers).length / totalQuestions) * 100}%` }}
                                        ></div>
                                    </div>
                                </div>
                            </div>

                            <div className="p-6 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 hidden lg:block transition-colors">
                                <div className="flex flex-col gap-2 text-[10px] font-bold uppercase tracking-wider">
                                    <div className="flex items-center gap-3">
                                        <div className="w-3 h-3 rounded-full bg-green-500 shadow-sm shadow-green-500/20"></div>
                                        <span className="text-gray-600 dark:text-gray-400">Answered</span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="w-3 h-3 rounded-full bg-yellow-500 shadow-sm shadow-yellow-500/20"></div>
                                        <span className="text-gray-600 dark:text-gray-400">Bookmarked</span>
                                    </div>
                                </div>
                            </div>
                            <div className="flex-1 overflow-y-auto p-6">
                                {(() => {
                                    const startIndex = (currentPage - 1) * 25;
                                    const pageQuestions = quizData.questions.slice(startIndex, startIndex + 25);
                                    return (
                                        <div className="mb-4">
                                            <div className="flex items-center justify-between mb-4">
                                                <div className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest">
                                                    Block {currentPage} ({pageQuestions.length} Questions)
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <button
                                                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                                        disabled={currentPage <= 1}
                                                        className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded disabled:opacity-30 text-gray-500"
                                                    >
                                                        <ChevronLeft size={14} />
                                                    </button>
                                                    <span className="text-[10px] font-bold text-gray-400">{currentPage}/{Math.ceil(totalQuestions / 25)}</span>
                                                    <button
                                                        onClick={() => setCurrentPage(prev => Math.min(Math.ceil(totalQuestions / 25), prev + 1))}
                                                        disabled={currentPage >= Math.ceil(totalQuestions / 25)}
                                                        className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded disabled:opacity-30 text-gray-500"
                                                    >
                                                        <ChevronRight size={14} />
                                                    </button>
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-5 gap-2">
                                                {pageQuestions.map((q, _) => {
                                                    const qGlobalIdx = q.originalIndex;
                                                    const isActive = currentQuestionIndex === qGlobalIdx;

                                                    return (
                                                        <button
                                                            key={qGlobalIdx}
                                                            onClick={() => {
                                                                handleQuestionChange(qGlobalIdx);
                                                                const el = document.getElementById(`question-${qGlobalIdx}`);
                                                                if (el) el.scrollIntoView({ behavior: 'smooth' });
                                                                setShowMobileSidebar(false);
                                                            }}
                                                            className={`w-11 h-11 rounded-xl flex items-center justify-center text-xs font-black transition-all ${getStatusColor(qGlobalIdx)} ${isActive ? 'ring-2 ring-blue-600 ring-offset-2 dark:ring-offset-gray-950' : ''}`}
                                                        >
                                                            {q.questionNo}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    );
                                })()}
                            </div>

                        </aside>
                    </main >
                </>
            )}

            {/* Time Finished Modal */}
            {isTimeUp && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-gray-950/80 backdrop-blur-sm">
                    <div className="bg-white dark:bg-gray-900 rounded-3xl p-8 max-w-sm w-full shadow-2xl border border-gray-100 dark:border-gray-800 text-center animate-in zoom-in duration-300">
                        <div className="w-16 h-16 bg-red-50 dark:bg-red-900/20 text-red-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                            <Clock size={32} className="animate-pulse" />
                        </div>
                        <h2 className="text-2xl font-black text-gray-900 dark:text-white mb-2">Time is Up!</h2>
                        <p className="text-gray-500 dark:text-gray-400 text-sm mb-8">
                            Your examination time has concluded. You can either submit your responses now or take a moment to review them.
                        </p>
                        <div className="flex flex-col gap-3">
                            <button
                                onClick={() => handleSubmit(true)}
                                className="w-full py-4 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20 active:scale-95"
                            >
                                Submit Exam Now
                            </button>
                            <button
                                onClick={() => setIsTimeUp(false)}
                                className="w-full py-4 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-xl font-bold hover:bg-gray-200 dark:hover:bg-gray-700 transition-all active:scale-95"
                            >
                                Review Questions
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Warning Modal for Tab Switching */}
            {showWarningModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
                    <div className="bg-white dark:bg-gray-900 rounded-3xl p-8 max-w-sm w-full border border-gray-200 dark:border-gray-800 shadow-2xl animate-in fade-in zoom-in duration-300">
                        <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-full flex items-center justify-center mb-6 mx-auto">
                            <Shield size={32} />
                        </div>
                        <h3 className="text-xl font-black text-gray-900 dark:text-white text-center mb-2">Security Warning!</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 text-center mb-8 font-medium">
                            Tab switching is strictly prohibited during the examination. This is warning <span className="text-red-600 font-bold">{tabSwitchCount}</span> of 3.
                        </p>
                        <button
                            onClick={() => setShowWarningModal(false)}
                            className="w-full bg-gray-900 dark:bg-blue-600 text-white py-4 rounded-xl font-black uppercase tracking-widest text-xs shadow-lg active:scale-95 transition-all"
                        >
                            I Understand, Continue
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default QuizPlayerPage;
