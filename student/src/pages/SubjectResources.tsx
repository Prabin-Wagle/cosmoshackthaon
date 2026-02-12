import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { fetchSubjects, fetchCompetitiveSubjects } from '../utils/api';
import type { Subject } from '../types/resources';
import { BookOpen, GraduationCap, School, Loader2 } from 'lucide-react';

type ViewMode = 'selection' | 'class' | 'competitive';

export default function SubjectResources() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState<ViewMode>('selection');

    useEffect(() => {
        // Determine initial view mode
        if (user) {
            if (!user.competition || user.competition === 'None') {
                setViewMode('class');
            } else {
                setViewMode('selection');
            }
        }
    }, [user]);

    useEffect(() => {
        const loadSubjects = async () => {
            if (!user) return;

            // Don't load if we are in selection mode
            if (viewMode === 'selection') {
                setLoading(false);
                return;
            }

            setLoading(true);
            try {
                let data: Subject[] = [];
                if (viewMode === 'class') {
                    if (user.class && user.faculty) {
                        data = await fetchSubjects(user.class, user.faculty);
                    }
                } else if (viewMode === 'competitive') {
                    if (user.competition && user.competition !== 'None') {
                        data = await fetchCompetitiveSubjects(user.competition);
                    }
                }
                setSubjects(data);
            } catch (error) {
                console.error('Failed to load subjects:', error);
            } finally {
                setLoading(false);
            }
        };

        loadSubjects();
    }, [user, viewMode]);

    const handleSubjectClick = (subject: Subject) => {
        // Navigate to different routes based on view mode
        if (viewMode === 'competitive') {
            navigate(`/competitive/${encodeURIComponent(subject.subject_name)}`, { state: { subject } });
        } else {
            navigate(`/subjects/${encodeURIComponent(subject.subject_name)}`, { state: { subject } });
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="text-center">
                    <Loader2 className="h-12 w-12 animate-spin text-blue-600 dark:text-blue-400 mx-auto mb-4" />
                    <p className="text-gray-600 dark:text-gray-400 font-medium">Loading study materials...</p>
                </div>
            </div>
        );
    }

    // Selection View
    if (viewMode === 'selection') {
        return (
            <div className="space-y-8 animate-in fade-in duration-500">
                <div className="text-center">
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">Study Materials</h1>
                    <p className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto font-medium">
                        Select which curriculum you want to study today.
                    </p>
                </div>

                <div className={`grid grid-cols-1 ${user?.competition && user.competition.trim() !== '' && user.competition.trim().toLowerCase() !== 'none' ? 'md:grid-cols-3' : 'md:grid-cols-2'} gap-6 max-w-6xl mx-auto`}>
                    {/* Class Curriculum Card */}
                    <div
                        onClick={() => setViewMode('class')}
                        className="bg-white dark:bg-gray-900 p-8 rounded-2xl shadow-sm border-2 border-transparent hover:border-blue-500 dark:hover:border-blue-500 hover:shadow-xl dark:shadow-blue-900/10 transition-all cursor-pointer group"
                    >
                        <div className="bg-blue-50 dark:bg-blue-900/30 w-16 h-16 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                            <School className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                        </div>
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Class Curriculum</h2>
                        <p className="text-gray-600 dark:text-gray-400 mb-4 font-medium leading-relaxed">
                            Access notes and resources for {user?.class} - {user?.faculty}.
                        </p>
                        <span className="text-blue-600 dark:text-blue-400 font-bold group-hover:translate-x-1 inline-block transition-transform">
                            View Subjects →
                        </span>
                    </div>

                    {user?.competition && user.competition.trim() !== '' && user.competition.trim().toLowerCase() !== 'none' && (
                        <div
                            onClick={() => setViewMode('competitive')}
                            className="bg-white dark:bg-gray-900 p-8 rounded-2xl shadow-sm border-2 border-transparent hover:border-purple-500 dark:hover:border-purple-500 hover:shadow-xl dark:shadow-purple-900/10 transition-all cursor-pointer group"
                        >
                            <div className="bg-purple-50 dark:bg-purple-900/30 w-16 h-16 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                                <GraduationCap className="h-8 w-8 text-purple-600 dark:text-purple-400" />
                            </div>
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{user?.competition} Preparation</h2>
                            <p className="text-gray-600 dark:text-gray-400 mb-4 font-medium leading-relaxed">
                                Specialized resources and practice materials for {user?.competition}.
                            </p>
                            <span className="text-purple-600 dark:text-purple-400 font-bold group-hover:translate-x-1 inline-block transition-transform">
                                Start Preparing →
                            </span>
                        </div>
                    )}

                    {/* Books Card */}
                    <div
                        onClick={() => navigate('/books')}
                        className="bg-white dark:bg-gray-900 p-8 rounded-2xl shadow-sm border-2 border-transparent hover:border-red-500 dark:hover:border-red-500 hover:shadow-xl dark:shadow-red-900/10 transition-all cursor-pointer group"
                    >
                        <div className="bg-red-50 dark:bg-red-900/30 w-16 h-16 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                            <BookOpen className="h-8 w-8 text-red-600 dark:text-red-400" />
                        </div>
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Books</h2>
                        <p className="text-gray-600 dark:text-gray-400 mb-4 font-medium leading-relaxed">
                            Access textbooks and reference books for {user?.class} - {user?.faculty}.
                        </p>
                        <span className="text-red-600 dark:text-red-400 font-bold group-hover:translate-x-1 inline-block transition-transform">
                            View Books →
                        </span>
                    </div>
                </div>
            </div>
        );
    }

    // Subject List View (Class or Competitive)
    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                        {viewMode === 'class' ? `${user?.class} Subjects` : `${user?.competition} Subjects`}
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400 mt-1 font-medium">
                        Select a subject to view available resources
                    </p>
                </div>
                {user?.competition && user.competition !== 'None' && (
                    <button
                        onClick={() => setViewMode('selection')}
                        className="text-sm font-bold text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors bg-gray-100 dark:bg-gray-800 px-4 py-2 rounded-lg"
                    >
                        Change Curriculum
                    </button>
                )}
            </div>

            {subjects.length === 0 ? (
                <div className="text-center py-20 bg-white dark:bg-gray-900 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800">
                    <div className="text-6xl mb-4">📚</div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                        No Subjects Found
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400 font-medium">
                        We couldn't find any subjects for your selection.
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {subjects.map((subject) => (
                        <div
                            key={subject.id || subject.subject_name}
                            onClick={() => handleSubjectClick(subject)}
                            className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-6 cursor-pointer
                     transition-all duration-300 hover:shadow-xl hover:-translate-y-1 hover:border-blue-500/50 dark:hover:border-blue-500/50 group"
                        >
                            <div className="flex items-start justify-between mb-4">
                                <div className={`p-3.5 rounded-xl transition-colors ${viewMode === 'competitive' ? 'bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400' : 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'}`}>
                                    <BookOpen className="h-6 w-6" />
                                </div>
                                {subject.subject_code && (
                                    <span className="text-[10px] font-black text-gray-500 dark:text-gray-500 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded uppercase tracking-wider">
                                        {subject.subject_code}
                                    </span>
                                )}
                            </div>

                            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors leading-tight">
                                {subject.subject_name}
                            </h3>

                            <div className="flex items-center text-sm font-bold text-gray-400 dark:text-gray-500 mt-6 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                <span>View Resources</span>
                                <span className="ml-2 group-hover:translate-x-2 transition-transform">→</span>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
