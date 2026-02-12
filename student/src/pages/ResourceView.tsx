import { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ExternalLink, FileText, Loader2 } from 'lucide-react';
import type { Resource, ResourceType, Subject } from '../types/resources';
import { RESOURCE_TYPES } from '../types/resources';
import { useAuth } from '../contexts/AuthContext';
import { fetchAllSubjectResources } from '../utils/api';
import CryptoJS from 'crypto-js';

const ENCRYPTION_KEY = 'NoteLibrarySecur3_2026_SecretKey';
const ENCRYPTION_IV = '1234567890123456';

export default function ResourceView() {
    const { subjectName, resourceType } = useParams<{ subjectName: string; resourceType: string }>();
    const navigate = useNavigate();
    const location = useLocation();
    const { token, user } = useAuth();
    const stateData = location.state as { subject: Subject; resources: Resource[] } | null;

    const [resources, setResources] = useState<Resource[]>(stateData?.resources || []);
    const [loading, setLoading] = useState(!stateData?.resources);

    useEffect(() => {
        if (!stateData?.resources && subjectName) {
            const loadFallback = async () => {
                setLoading(true);
                try {
                    const decodedSubject = decodeURIComponent(subjectName);
                    const resourcesMap = await fetchAllSubjectResources(
                        user?.class || '',
                        user?.faculty || '',
                        decodedSubject
                    );

                    const type = resourceType as ResourceType;
                    if (resourcesMap[type]) {
                        setResources(resourcesMap[type]);
                    }
                } catch (error) {
                    console.error('Failed to load fallback resources:', error);
                } finally {
                    setLoading(false);
                }
            };
            loadFallback();
        }
    }, [subjectName, resourceType, user]);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Loader2 className="h-12 w-12 animate-spin text-blue-600 dark:text-blue-400" />
            </div>
        );
    }

    if (!resources || resources.length === 0) {
        return (
            <div className="text-center py-20 bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm animate-in fade-in zoom-in duration-500">
                <div className="text-6xl mb-4">🔍</div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">No Resources Found</h3>
                <p className="text-gray-500 dark:text-gray-400 mb-8 font-medium">The resources you're looking for aren't available right now.</p>
                <button
                    onClick={() => navigate(-1)}
                    className="px-8 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-bold transition-all shadow-lg shadow-blue-600/20 active:scale-95"
                >
                    Go Back
                </button>
            </div>
        );
    }

    const config = RESOURCE_TYPES.find(rt => rt.type === resourceType as ResourceType);
    const decodedSubjectName = decodeURIComponent(subjectName || '');

    const getColorClasses = (color: string) => {
        const colorMap: Record<string, { bg: string; text: string; icon: string; button: string }> = {
            blue: { bg: 'bg-blue-50 dark:bg-blue-900/30', text: 'text-blue-600 dark:text-blue-400', icon: 'bg-blue-100 dark:bg-blue-900/40', button: 'bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-500' },
            green: { bg: 'bg-green-50 dark:bg-green-900/30', text: 'text-green-600 dark:text-green-400', icon: 'bg-green-100 dark:bg-green-900/40', button: 'bg-green-600 hover:bg-green-700 dark:bg-green-600 dark:hover:bg-green-500' },
            purple: { bg: 'bg-purple-50 dark:bg-purple-900/30', text: 'text-purple-600 dark:text-purple-400', icon: 'bg-purple-100 dark:bg-purple-900/40', button: 'bg-purple-600 hover:bg-purple-700 dark:bg-purple-600 dark:hover:bg-purple-500' },
            orange: { bg: 'bg-orange-50 dark:bg-orange-900/30', text: 'text-orange-600 dark:text-orange-400', icon: 'bg-orange-100 dark:bg-orange-900/40', button: 'bg-orange-600 hover:bg-orange-700 dark:bg-orange-600 dark:hover:bg-orange-500' },
            pink: { bg: 'bg-pink-50 dark:bg-pink-900/30', text: 'text-pink-600 dark:text-pink-400', icon: 'bg-pink-100 dark:bg-pink-900/40', button: 'bg-pink-600 hover:bg-pink-700 dark:bg-pink-600 dark:hover:bg-pink-500' },
            indigo: { bg: 'bg-indigo-50 dark:bg-indigo-900/30', text: 'text-indigo-600 dark:text-indigo-400', icon: 'bg-indigo-100 dark:bg-indigo-900/40', button: 'bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-600 dark:hover:bg-indigo-500' },
            yellow: { bg: 'bg-yellow-50 dark:bg-yellow-900/30', text: 'text-yellow-600 dark:text-yellow-400', icon: 'bg-yellow-100 dark:bg-yellow-900/40', button: 'bg-yellow-600 hover:bg-yellow-700 dark:bg-yellow-600 dark:hover:bg-yellow-500' },
            teal: { bg: 'bg-teal-50 dark:bg-teal-900/30', text: 'text-teal-600 dark:text-teal-400', icon: 'bg-teal-100 dark:bg-teal-900/40', button: 'bg-teal-600 hover:bg-teal-700 dark:bg-teal-600 dark:hover:bg-teal-500' },
            cyan: { bg: 'bg-cyan-50 dark:bg-cyan-900/30', text: 'text-cyan-600 dark:text-cyan-400', icon: 'bg-cyan-100 dark:bg-cyan-900/40', button: 'bg-cyan-600 hover:bg-cyan-700 dark:bg-cyan-600 dark:hover:bg-cyan-500' }
        };
        return colorMap[color] || colorMap.blue;
    };

    const colors = getColorClasses(config?.color || 'blue');

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="animate-in fade-in slide-in-from-top-4 duration-500">
                <button
                    onClick={() => navigate(-1)}
                    className="flex items-center text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-6 transition-colors font-medium group"
                >
                    <ArrowLeft className="h-4 w-4 mr-2 group-hover:-translate-x-1 transition-transform" />
                    Back to {decodedSubjectName}
                </button>

                <div className={`rounded-2xl p-8 text-white shadow-lg transition-all ${colors.button.split(' ').find(c => c.startsWith('bg-'))}`}>
                    <div className="flex items-center space-x-5 mb-3">
                        <span className="text-5xl filter drop-shadow-md">{config?.icon}</span>
                        <h1 className="text-3xl font-black tracking-tight">{config?.label}</h1>
                    </div>
                    <p className="text-white/90 font-bold uppercase tracking-widest text-[10px] ml-16">
                        {decodedSubjectName} • {resources.length} {resources.length === 1 ? 'Resource' : 'Resources'}
                    </p>
                </div>
            </div>

            {/* Resources List */}
            <div className="grid grid-cols-1 gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                {resources.map((resource) => (
                    <div
                        key={resource.id}
                        className="bg-white dark:bg-gray-900 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800 p-6 transition-all hover:shadow-xl dark:shadow-blue-900/5 group"
                    >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                            <div className="flex-1">
                                <div className="flex items-center space-x-4 mb-2">
                                    <div className={`p-3.5 rounded-2xl transition-colors ${colors.icon}`}>
                                        <FileText className={`h-6 w-6 ${colors.text}`} />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-black text-gray-900 dark:text-white leading-tight group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors uppercase tracking-tight">
                                            {resource.chapterName}
                                        </h3>
                                        <p className={`text-xs font-black uppercase tracking-widest mt-1 ${colors.text}`}>
                                            {resource.chapter}
                                        </p>
                                    </div>
                                </div>

                                {resource.exam_type && (
                                    <div className="mt-4 flex items-center space-x-4 text-sm text-gray-500">
                                        <span className="bg-gray-100 dark:bg-gray-800 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest transition-colors">
                                            {resource.exam_type}
                                        </span>
                                    </div>
                                )}
                            </div>

                            <div className="flex flex-wrap items-center gap-3 sm:ml-4">
                                {resource.upload_mode === 'manual' || (resource.driveLink && resource.driveLink.toLowerCase().includes('.pdf')) ? (
                                    <button
                                        onClick={() => {
                                            let url = '';
                                            if (resource.upload_mode === 'manual') {
                                                const payload = JSON.stringify({
                                                    path: resource.file_data || '',
                                                    token: token,
                                                    t: Date.now()
                                                });

                                                const key = CryptoJS.enc.Utf8.parse(ENCRYPTION_KEY);
                                                const iv = CryptoJS.enc.Utf8.parse(ENCRYPTION_IV);
                                                const encrypted = CryptoJS.AES.encrypt(payload, key, {
                                                    iv: iv,
                                                    mode: CryptoJS.mode.CBC,
                                                    padding: CryptoJS.pad.Pkcs7
                                                }).toString();

                                                url = `https://notelibraryapp.com/api/users/serve_file.php?d=${encodeURIComponent(encrypted)}`;
                                            } else {
                                                url = resource.driveLink || '';
                                            }

                                            navigate('/resource/pdf', {
                                                state: {
                                                    fileUrl: url,
                                                    title: resource.chapterName,
                                                    backUrl: location.pathname,
                                                    resourceId: resource.id,
                                                    resourceType: resourceType || resource.resource_type || 'note',
                                                    subject: decodedSubjectName || resource.subjectName || resource.subject
                                                }
                                            });
                                        }}
                                        className={`inline-flex items-center px-6 py-3 rounded-xl text-white text-sm font-bold transition-all shadow-md active:scale-95 ${colors.button}`}
                                    >
                                        <FileText className="h-4 w-4 mr-2" />
                                        Open PDF
                                    </button>
                                ) : resource.driveLink && (
                                    <button
                                        onClick={() => navigate('/resource/embed', {
                                            state: {
                                                resource,
                                                title: resource.chapterName
                                            }
                                        })}
                                        className={`inline-flex items-center px-6 py-3 rounded-xl text-white text-sm font-bold transition-all shadow-md active:scale-95 ${colors.button}`}
                                    >
                                        <ExternalLink className="h-4 w-4 mr-2" />
                                        Open Link
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div >
    );
}
