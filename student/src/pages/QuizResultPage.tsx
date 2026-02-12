import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axiosClient from '../api/axiosClient';
import { LatexRenderer } from '../components/latexRender';
import { ChevronLeft, Check, X, AlertTriangle, Send, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import CryptoJS from 'crypto-js';

const ENCRYPTION_KEY = 'NoteLibrarySecur3_2026_SecretKey';
const ENCRYPTION_IV = '1234567890123456';

interface AttemptDetail {
    index: number;
    selected: number;
    bookmarked: boolean;
    correct: boolean;
    question: string;
    imageLink?: string | null;
    options: string[];
    correctOption: number;
    explanation?: string | null;
}

interface AttemptSummary {
    id: number;
    quiz_id: number;
    collection_id: number;
    attempt_number: number;
    score: number;
    total_questions: number;
    correct_count: number;
    incorrect_count: number;
    attempt_date: string;
    attempt_json: AttemptDetail[];
    analytics_json: {
        units: Record<string, { total: number; attempted: number; correct: number; wrong: number }>;
        chapters: Record<string, { total: number; attempted: number; correct: number; wrong: number }>;
    };
}

const QuizResultPage: React.FC = () => {
    const { attemptId } = useParams<{ attemptId: string }>();
    const navigate = useNavigate();
    const [summary, setSummary] = useState<AttemptSummary | null>(null);
    const [quizTitle, setQuizTitle] = useState("");
    const [filter, setFilter] = useState<'all' | 'wrong' | 'bookmarked'>('all');
    const [loading, setLoading] = useState(true);
    const [reportingId, setReportingId] = useState<number | null>(null);
    const [reportMessage, setReportMessage] = useState("");
    const [isReporting, setIsReporting] = useState(false);

    const token = localStorage.getItem('token');

    useEffect(() => {
        if (!token) {
            navigate('/login');
            return;
        }
        fetchAllData();
    }, [attemptId]);

    const fetchAllData = async () => {
        setLoading(true);
        try {
            const res = await axiosClient.get(`/api/student_quiz/get_attempt_details.php?attempt_id=${attemptId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (res.data.status === 'true') {
                let finalData: any = {};

                // --- FULL PAYLOAD DECRYPTION ---
                if (res.data.encrypted && res.data.payload) {
                    try {
                        const key = CryptoJS.enc.Utf8.parse(ENCRYPTION_KEY);
                        const iv = CryptoJS.enc.Utf8.parse(ENCRYPTION_IV);
                        const decrypted = CryptoJS.AES.decrypt(res.data.payload, key, {
                            iv: iv,
                            mode: CryptoJS.mode.CBC,
                            padding: CryptoJS.pad.Pkcs7
                        });
                        const decryptedText = decrypted.toString(CryptoJS.enc.Utf8);
                        finalData = JSON.parse(decryptedText);
                    } catch (e) {
                        console.error("Decryption failed:", e);
                        toast.error("Security decryption failed");
                        navigate(-1);
                        return;
                    }
                } else {
                    finalData = {
                        summary: res.data.summary,
                        details: res.data.details
                    };
                }

                setSummary(finalData.summary);
                const qRes = await axiosClient.get(`/api/student_quiz/get_quiz_data.php?quiz_id=${finalData.summary.quiz_id}`);
                if (qRes.data.status === 'true') {
                    setQuizTitle(qRes.data.data.title);
                }
            } else {
                toast.error(res.data.message || "Failed to load result");
                navigate(-1);
            }
        } catch (err) {
            console.error("Result fetch error:", err);
            toast.error("Server error");
            navigate(-1);
        } finally {
            setLoading(false);
        }
    };

    const handleReportQuestion = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!reportMessage.trim()) {
            toast.error("Please provide a reason for reporting");
            return;
        }

        setIsReporting(true);
        try {
            const currentQ = summary?.attempt_json.find((_, idx) => idx === reportingId);
            const subject = `Report: Question #${(reportingId || 0) + 1} in ${quizTitle}`;
            const fullMessage = `
User reported a question.
Question Index: ${currentQ?.index}
Question Text: ${currentQ?.question}
User Reason: ${reportMessage}
Attempt ID: ${attemptId}
            `.trim();

            const formData = new FormData();
            formData.append('subject', subject);
            formData.append('message', fullMessage);

            const response = await fetch('https://notelibraryapp.com/api/support/submit_ticket.php', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            });

            const data = await response.json();

            if (data.status === 'success') {
                toast.success('Report submitted and ticket created successfully!');
                setReportingId(null);
                setReportMessage("");
            } else {
                toast.error(data.message || 'Failed to submit report');
            }
        } catch (err) {
            console.error("Report error:", err);
            toast.error("Failed to submit report");
        } finally {
            setIsReporting(false);
        }
    };
    if (loading) return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-blue-400"></div>
        </div>
    );

    if (!summary) return null;

    const filteredQuestions = (summary.attempt_json || []).filter(q => {
        if (filter === 'wrong') return !q.correct && q.selected !== -1;
        if (filter === 'bookmarked') return q.bookmarked;
        return true;
    });

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pb-12 transition-colors duration-300">
            <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 sticky top-0 z-10 shadow-sm">
                <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
                    <button
                        onClick={() => navigate(summary.collection_id ? `/test-series/collection/${summary.collection_id}` : '/test-series')}
                        className="flex items-center text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                    >
                        <ChevronLeft size={20} className="mr-1" />
                        <span className="text-sm text-[10px] font-black uppercase tracking-widest">Back to Dashboard</span>
                    </button>
                    <div className="text-right">
                        <div className="text-sm text-gray-500 dark:text-gray-400">Total Score</div>
                        <div className="text-lg font-bold text-gray-900 dark:text-white">{summary.score.toFixed(1)}</div>
                    </div>
                </div>
            </div>

            <div className="max-w-4xl mx-auto px-4 pt-8">
                <div className="mb-8">
                    <div className="inline-block bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 px-3 py-1 rounded text-xs mb-3 font-medium">
                        Attempt #{summary.attempt_number}
                    </div>
                    <h1 className="text-2xl font-bold mb-2 text-gray-900 dark:text-white">{quizTitle || "Quiz Result"}</h1>
                    <p className="text-gray-600 dark:text-gray-400 text-sm mb-6">
                        Completed on {new Date(summary.attempt_date).toLocaleDateString()}
                    </p>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div className="bg-blue-50 dark:bg-blue-900/10 p-4 rounded-xl border border-blue-100 dark:border-blue-900/20">
                            <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">Score</div>
                            <div className="text-xl font-bold text-blue-600 dark:text-blue-400">{summary.score.toFixed(1)}</div>
                        </div>
                        <div className="bg-green-50 dark:bg-green-900/10 p-4 rounded-xl border border-green-100 dark:border-green-900/20">
                            <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">Correct</div>
                            <div className="text-xl font-bold text-green-600 dark:text-green-400">{summary.correct_count}</div>
                        </div>
                        <div className="bg-red-50 dark:bg-red-900/10 p-4 rounded-xl border border-red-100 dark:border-red-900/20">
                            <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">Wrong</div>
                            <div className="text-xl font-bold text-red-600 dark:text-red-400">{summary.incorrect_count}</div>
                        </div>
                        <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-xl border border-gray-100 dark:border-gray-800">
                            <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">Accuracy</div>
                            <div className="text-xl font-bold text-gray-900 dark:text-white">{Math.round((summary.correct_count / summary.total_questions) * 100)}%</div>
                        </div>
                    </div>
                </div>

                {/* Units Analytics */}
                <div className="mb-10">
                    <h2 className="text-lg font-bold mb-4 text-gray-900 dark:text-white">Performance by Unit</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {summary.analytics_json?.units && Object.entries(summary.analytics_json.units).map(([unit, data]) => (
                            <div key={unit} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-5 rounded-2xl shadow-sm">
                                <div className="flex justify-between items-center mb-3">
                                    <span className="font-bold text-gray-900 dark:text-white">{unit}</span>
                                    <span className="text-xs font-black text-blue-600 bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded">
                                        {Math.round((data.correct / data.total) * 100)}% Match
                                    </span>
                                </div>
                                <div className="grid grid-cols-3 gap-2 text-center">
                                    <div className="bg-gray-50 dark:bg-gray-800/50 p-2 rounded-xl">
                                        <div className="text-[10px] text-gray-400 uppercase">Total</div>
                                        <div className="font-bold dark:text-white">{data.total}</div>
                                    </div>
                                    <div className="bg-green-50 dark:bg-green-900/10 p-2 rounded-xl">
                                        <div className="text-[10px] text-green-600 uppercase">Correct</div>
                                        <div className="font-bold text-green-600 dark:text-green-400">{data.correct}</div>
                                    </div>
                                    <div className="bg-red-50 dark:bg-red-900/10 p-2 rounded-xl">
                                        <div className="text-[10px] text-red-600 uppercase">Wrong</div>
                                        <div className="font-bold text-red-600 dark:text-red-400">{data.wrong}</div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Filters */}
                <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2">
                    <button
                        onClick={() => setFilter('all')}
                        className={`px-4 py-2 rounded-full text-xs font-bold transition-all whitespace-nowrap ${filter === 'all' ? 'bg-gray-900 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}
                    >
                        All Questions
                    </button>
                    <button
                        onClick={() => setFilter('wrong')}
                        className={`px-4 py-2 rounded-full text-xs font-bold transition-all whitespace-nowrap ${filter === 'wrong' ? 'bg-red-600 text-white' : 'bg-white text-red-600 border border-red-100 hover:bg-red-50'}`}
                    >
                        Wrong Questions ({summary.incorrect_count})
                    </button>
                    <button
                        onClick={() => setFilter('bookmarked')}
                        className={`px-4 py-2 rounded-full text-xs font-bold transition-all whitespace-nowrap ${filter === 'bookmarked' ? 'bg-yellow-500 text-white' : 'bg-white text-yellow-600 border border-yellow-100 hover:bg-yellow-50'}`}
                    >
                        Bookmarked
                    </button>
                </div>

                <div className="space-y-6">
                    {filteredQuestions.map((q: AttemptDetail, idx: number) => {
                        return (
                            <div key={idx} className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-6 shadow-sm">
                                <div className="flex items-start gap-4 mb-4">
                                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold shrink-0 ${q.correct ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' :
                                        q.selected === -1 ? 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400' :
                                            'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                                        }`}>
                                        {q.index + 1}
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex justify-between items-start gap-4 mb-2">
                                            <div className="text-base font-semibold text-gray-900 dark:text-white transition-colors">
                                                <LatexRenderer>{q.question}</LatexRenderer>
                                            </div>
                                            <button
                                                onClick={() => setReportingId(idx)}
                                                className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"
                                                title="Report Question"
                                            >
                                                <AlertTriangle size={18} />
                                            </button>
                                        </div>
                                        {q.imageLink && (
                                            <div className="mb-4 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/30 p-2">
                                                <img src={q.imageLink} alt="Question" className="max-w-full mx-auto" />
                                            </div>
                                        )}

                                        <div className="space-y-2">
                                            {q.options.map((opt: string, optIdx: number) => {
                                                const isSelected = q.selected === optIdx;
                                                const isCorrect = q.correctOption === optIdx;

                                                let bgClass = "bg-white dark:bg-gray-800/20 border-gray-200 dark:border-gray-800";
                                                if (isCorrect) bgClass = "bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-800/50";
                                                if (isSelected && !isCorrect) bgClass = "bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-800/50";

                                                return (
                                                    <div key={optIdx} className={`p-4 rounded-xl border ${bgClass} flex items-center gap-3 transition-all`}>
                                                        <div className={`w-8 h-8 rounded shrink-0 flex items-center justify-center text-xs font-bold transition-colors ${isCorrect ? 'bg-green-600 text-white shadow-sm' :
                                                            isSelected ? 'bg-red-600 text-white shadow-sm' :
                                                                'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                                                            }`}>
                                                            {String.fromCharCode(65 + optIdx)}
                                                        </div>
                                                        <div className={`flex-1 text-sm font-medium ${isCorrect ? 'text-green-900 dark:text-green-300' : isSelected ? 'text-red-900 dark:text-red-300' : 'text-gray-700 dark:text-gray-300'}`}>
                                                            <LatexRenderer>{opt}</LatexRenderer>
                                                        </div>
                                                        {isCorrect && <Check size={18} className="text-green-600 dark:text-green-400 shrink-0" />}
                                                        {isSelected && !isCorrect && <X size={18} className="text-red-600 dark:text-red-400 shrink-0" />}
                                                    </div>
                                                );
                                            })}
                                        </div>

                                        {q.explanation && (
                                            <div className="mt-6 p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800">
                                                <div className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Explanation</div>
                                                <div className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                                                    <LatexRenderer>{q.explanation}</LatexRenderer>
                                                </div>
                                            </div>
                                        )}

                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Footer Actions */}
                <div className="mt-8 text-center flex flex-col sm:flex-row items-center justify-center gap-4">
                    <button
                        onClick={() => navigate(`/test-series/quiz/${summary.quiz_id}`)}
                        className="px-8 py-3.5 bg-gray-900 dark:bg-blue-600 text-white rounded-xl hover:bg-gray-800 dark:hover:bg-blue-700 font-bold transition-all shadow-lg dark:shadow-blue-900/20 active:scale-95 w-full sm:w-auto"
                    >
                        Retake Quiz
                    </button>
                    <button
                        onClick={() => navigate(summary.collection_id ? `/test-series/collection/${summary.collection_id}` : '/test-series')}
                        className="px-8 py-3.5 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 font-bold transition-all active:scale-95 w-full sm:w-auto"
                    >
                        View Other Quizzes
                    </button>
                </div>
            </div>

            {/* Report Modal */}
            {reportingId !== null && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white dark:bg-gray-900 rounded-3xl w-full max-w-md p-8 shadow-2xl border border-gray-100 dark:border-gray-800 animate-in zoom-in duration-300">
                        <div className="flex items-center gap-4 mb-6">
                            <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-2xl text-red-600 dark:text-red-400">
                                <AlertTriangle size={24} />
                            </div>
                            <div>
                                <h3 className="text-xl font-black text-gray-900 dark:text-white">Report Question</h3>
                                <p className="text-xs text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider">Question #{(reportingId || 0) + 1}</p>
                            </div>
                        </div>

                        <form onSubmit={handleReportQuestion} className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-xs font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest ml-1">Reason for reporting</label>
                                <textarea
                                    value={reportMessage}
                                    onChange={(e) => setReportMessage(e.target.value)}
                                    placeholder="Explain the issue with this question (e.g., wrong answer, spelling mistake, etc.)"
                                    rows={4}
                                    className="w-full px-5 py-4 bg-gray-50 dark:bg-gray-800/50 border-none rounded-2xl focus:ring-2 focus:ring-red-500 transition-all text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 resize-none font-medium"
                                    required
                                />
                            </div>

                            <div className="flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setReportingId(null)}
                                    className="flex-1 py-4 text-gray-500 dark:text-gray-400 font-black uppercase tracking-widest text-[10px] hover:bg-gray-100 dark:hover:bg-gray-800 rounded-2xl transition-all"
                                    disabled={isReporting}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isReporting}
                                    className="flex-3 py-4 bg-red-600 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-red-700 transition-all shadow-lg shadow-red-600/20 active:scale-95 flex items-center justify-center gap-2"
                                >
                                    {isReporting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                                    <span>Submit Report</span>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default QuizResultPage;
