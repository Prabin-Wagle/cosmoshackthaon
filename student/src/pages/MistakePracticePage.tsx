import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosClient from '../api/axiosClient';
import { LatexRenderer } from '../components/latexRender';
import { ChevronLeft, Check, X, Shield, Sparkles, AlertTriangle, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import Turnstile from 'react-turnstile';

const TURNSTILE_SITE_KEY = '0x4AAAAAACU4jsSvr7a6OSp7';

interface Mistake {
    mistake_id: number;
    quiz_id: number;
    quiz_title: string;
    question_index: number;
    originalIndex: number; // For server-side validation mapping
    question: {
        question: string;
        imageLink?: string | null;
        options: string[];
        correctOption: number; // Will be stripped in practice mode, but kept in type for display mode
        explanation?: string | null;
        unitId?: string;
    };
}

const MistakePracticePage: React.FC = () => {
    const navigate = useNavigate();
    const [mistakes, setMistakes] = useState<Mistake[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [loading, setLoading] = useState(true);
    const [selectedOption, setSelectedOption] = useState<number | null>(null);
    const [showFeedback, setShowFeedback] = useState(false);
    const [resolving, setResolving] = useState(false);
    const [quizSessionId, setQuizSessionId] = useState<string>('');
    const [captchaVerified, setCaptchaVerified] = useState(false);
    const [verifyingAnswer, setVerifyingAnswer] = useState(false);
    const [verifiedAnswer, setVerifiedAnswer] = useState<any>(null);

    const token = localStorage.getItem('token');

    useEffect(() => {
        if (!token) {
            navigate('/login');
            return;
        }
    }, []);

    const fetchMistakes = async (captchaToken: string) => {
        setLoading(true);
        try {
            const res = await axiosClient.get(`/api/student_quiz/get_mistakes.php?mode=practice&turnstile_token=${encodeURIComponent(captchaToken)}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.data.status === 'true') {
                setMistakes(res.data.mistakes);
                if (res.data.quiz_session_id) {
                    setQuizSessionId(res.data.quiz_session_id);
                }
            } else {
                toast.error(res.data.message || "Failed to load mistakes");
                setCaptchaVerified(false); // Reset captcha on error
            }
        } catch (err) {
            console.error(err);
            toast.error("Server error");
        } finally {
            setLoading(false);
        }
    };

    const handleOptionSelect = async (optIdx: number) => {
        if (showFeedback || verifyingAnswer) return;

        setSelectedOption(optIdx);
        setVerifyingAnswer(true);

        const currentMistake = mistakes[currentIndex];

        try {
            // SECURITY: Verify answer server-side
            const verifyRes = await axiosClient.post('/api/student_quiz/verify_answer.php', {
                quiz_session_id: quizSessionId,
                question_index: currentMistake.originalIndex,
                selected_option: optIdx
            });

            if (verifyRes.data.status === 'true') {
                const data = verifyRes.data.data;
                setVerifiedAnswer(data);
                setShowFeedback(true);

                if (data.is_correct) {
                    // Correct! Resolve mistake
                    setResolving(true);
                    const res = await axiosClient.post('/api/student_quiz/resolve_mistake.php',
                        { mistake_id: currentMistake.mistake_id },
                        { headers: { Authorization: `Bearer ${token}` } }
                    );

                    if (res.data.status === 'true') {
                        toast.success("Mistake mastered!", { icon: '✨' });
                    }
                } else {
                    toast.error("Not quite yet. Keep practicing!", { icon: '📚' });
                }
            }
        } catch (err) {
            console.error(err);
            toast.error("Verification failed");
        } finally {
            setVerifyingAnswer(false);
        }
    };

    const nextMistake = () => {
        if (currentIndex < mistakes.length - 1) {
            setCurrentIndex(currentIndex + 1);
            setSelectedOption(null);
            setShowFeedback(false);
        } else {
            toast.success("You've reviewed all current mistakes!");
            navigate(-1);
        }
    };

    if (!captchaVerified) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-950 dark:to-gray-900 p-4">
                <div className="max-w-md w-full text-center">
                    <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl border border-gray-100 dark:border-gray-700 p-8 space-y-6">
                        <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
                            <Shield size={28} className="text-white" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-black text-gray-900 dark:text-white mb-2">Practice Security</h2>
                            <p className="text-gray-500 dark:text-gray-400 text-sm">
                                Complete the verification to review your mistakes
                            </p>
                        </div>

                        <div className="flex justify-center">
                            <Turnstile
                                sitekey={TURNSTILE_SITE_KEY}
                                onVerify={(token: string) => {
                                    setCaptchaVerified(true);
                                    fetchMistakes(token);
                                }}
                                onError={() => {
                                    toast.error('Verification failed. Please try again.');
                                }}
                                theme="auto"
                            />
                        </div>

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
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
    );

    if (mistakes.length === 0) return (
        // ... (existing empty state)
        <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-950 px-4 text-center">
            <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-6">
                <Shield size={40} className="text-green-600 dark:text-green-400" />
            </div>
            <h1 className="text-2xl font-bold mb-2 text-gray-900 dark:text-white">Mistake Free!</h1>
            <p className="text-gray-600 dark:text-gray-400 max-w-md">
                You don't have any pending mistakes to practice. Great job maintaining your performance!
            </p>
            <button
                onClick={() => navigate(-1)}
                className="mt-8 px-6 py-2 bg-gray-900 dark:bg-blue-600 text-white rounded-lg font-bold"
            >
                Return to Dashboard
            </button>
        </div>
    );

    const currentMistake = mistakes[currentIndex];
    const q = currentMistake.question;

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pb-12 transition-colors duration-300">
            <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 sticky top-0 z-10">
                <div className="max-w-3x1 mx-auto px-4 py-4 flex items-center justify-between">
                    <button
                        onClick={() => navigate(-1)}
                        className="flex items-center text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                    >
                        <ChevronLeft size={20} className="mr-1" />
                        <span className="text-sm font-bold uppercase tracking-tight">Exit Practice</span>
                    </button>
                    <div className="flex items-center gap-2">
                        <Sparkles size={18} className="text-amber-500" />
                        <span className="text-sm font-bold text-gray-900 dark:text-white">
                            Mistake {currentIndex + 1} of {mistakes.length}
                        </span>
                    </div>
                </div>
            </div>

            <div className="max-w-3xl mx-auto px-4 pt-8">
                <div className="mb-6">
                    <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/20 p-4 rounded-xl flex items-center gap-3">
                        <AlertTriangle size={20} className="text-blue-600 shrink-0" />
                        <div>
                            <div className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">Origin Quiz</div>
                            <div className="text-sm font-semibold text-gray-900 dark:text-white">{currentMistake.quiz_title}</div>
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 md:p-8 shadow-sm">
                    {q.unitId && (
                        <div className="inline-block bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 px-3 py-1 rounded-md text-[10px] font-black uppercase tracking-widest mb-4">
                            {q.unitId}
                        </div>
                    )}

                    <div className="text-xl font-bold mb-8 text-gray-900 dark:text-white leading-relaxed">
                        <LatexRenderer>{q.question}</LatexRenderer>
                    </div>

                    {q.imageLink && (
                        <div className="mb-8 rounded-xl overflow-hidden border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/30 p-2">
                            <img src={q.imageLink} alt="Question" className="max-w-full mx-auto" />
                        </div>
                    )}

                    <div className="space-y-3">
                        {q.options.map((opt, optIdx) => {
                            const isSelected = selectedOption === optIdx;
                            const isCorrect = verifiedAnswer?.correct_option === optIdx;
                            const isWrongSelection = isSelected && verifiedAnswer && !verifiedAnswer.is_correct;

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
                                    onClick={() => handleOptionSelect(optIdx)}
                                    disabled={showFeedback || verifyingAnswer}
                                    className={`w-full text-left p-5 rounded-2xl border transition-all duration-200 flex items-center gap-4 ${stateClass}`}
                                >
                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm ${showFeedback && isCorrect ? 'bg-green-500 text-white' :
                                        showFeedback && isWrongSelection ? 'bg-red-500 text-white' :
                                            isSelected ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-500'
                                        }`}>
                                        {String.fromCharCode(65 + optIdx)}
                                    </div>
                                    <div className={`flex-1 font-medium ${showFeedback && isCorrect ? 'text-green-900 dark:text-green-300' :
                                        showFeedback && isWrongSelection ? 'text-red-900 dark:text-red-300' :
                                            'text-gray-700 dark:text-gray-300'
                                        }`}>
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
                        <div className="mt-8 p-6 rounded-2xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800 animate-in fade-in slide-in-from-top-4 duration-500">
                            <div className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">
                                {resolving ? 'Mastering Mistake...' : 'Secure Explanation'}
                            </div>
                            <div className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                                <LatexRenderer>{verifiedAnswer?.explanation || 'No explanation available.'}</LatexRenderer>
                            </div>
                        </div>
                    )}
                </div>

                {showFeedback && (
                    <div className="mt-8 flex justify-center">
                        <button
                            onClick={nextMistake}
                            className="px-10 py-4 bg-gray-900 dark:bg-blue-600 text-white rounded-2xl font-bold flex items-center gap-2 shadow-xl hover:scale-105 transition-transform active:scale-95"
                        >
                            {currentIndex < mistakes.length - 1 ? 'Next Mistake' : 'Finish Session'}
                            <ChevronLeft size={20} className="rotate-180" />
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default MistakePracticePage;
