import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { Plus, FileText, Globe, Lock, Trash2, ExternalLink, Search, Filter } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { DashboardLayout } from '../components/DashboardLayout';
import { PdfViewerModal } from '../components/PdfViewerModal';

interface SubjectData {
    subject_name: string;
    units: string; // JSON string
    has_units: number;
}

interface Resource {
    id: number;
    faculty: string;
    subject: string;
    unit: string;
    resource_type: string;
    chapter_name: string;
    upload_mode: 'link' | 'manual';
    file_data: string;
    visibility: number;
    created_at: string;
}

export default function ResourceManager() {
    const { token } = useAuth();
    const [classes, setClasses] = useState<string[]>([]);
    const [faculties, setFaculties] = useState<string[]>([]);
    const [availableSubjects, setAvailableSubjects] = useState<SubjectData[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [uploadMode, setUploadMode] = useState<'link' | 'manual'>('link');
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const [resources, setResources] = useState<Resource[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [viewerState, setViewerState] = useState<{ isOpen: boolean; url: string; title: string }>({
        isOpen: false,
        url: '',
        title: ''
    });

    // Form states
    const [formData, setFormData] = useState({
        chapter_name: '',
        drive_link: '',
        subject: '',
        class_level: '',
        faculty: '',
        visibility: 'true',
        image: '',
        unit: '',
        description: '' // Resource Type
    });

    const currentSubjectData = availableSubjects.find(s => s.subject_name === formData.subject);
    const unitsList: string[] = currentSubjectData?.units ? JSON.parse(currentSubjectData.units) : [];
    const hasUnitsEnabled = currentSubjectData && (Number(currentSubjectData.has_units) === 1);

    useEffect(() => {
        fetchAdminMetadata();
    }, [token]);

    const fetchAdminMetadata = async () => {
        if (!token) return;
        try {
            const response = await axios.get('https://notelibraryapp.com/api/admin/subjects.php', {
                params: { action: 'init' },
                headers: { Authorization: `Bearer ${token}` }
            });
            if (response.data.success) {
                const filteredClasses = response.data.classes.filter((c: string) => c.toLowerCase() !== 'none');
                setClasses(filteredClasses);
                setFaculties(response.data.faculties.filter((f: string) => f.toLowerCase() !== 'none'));

                // Auto-select first class if available and fetch its resources
                if (filteredClasses.length > 0) {
                    setFormData(prev => ({ ...prev, class_level: filteredClasses[0] }));
                }
            }
        } catch (error) {
            console.error('Failed to fetch admin metadata:', error);
        }
    };

    const fetchResources = async () => {
        if (!token || !formData.class_level) return;
        setIsLoading(true);
        try {
            const response = await axios.get('https://notelibraryapp.com/api/admin/resources.php', {
                params: { action: 'list', class_level: formData.class_level },
                headers: { Authorization: `Bearer ${token}` }
            });
            if (response.data.success) {
                setResources(response.data.resources);
            }
        } catch (error) {
            console.error('Failed to fetch resources:', error);
            toast.error('Failed to load resources');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchResources();
    }, [formData.class_level, token]);

    useEffect(() => {
        const fetchSubjects = async () => {
            const formClass = formData.class_level;
            const formFaculty = formData.faculty || 'None';

            if (formClass) {
                const normalizedClass = formClass.toLowerCase().replace(/\s+/g, '');
                const normalizedFaculty = formFaculty ? formFaculty.toLowerCase().replace(/\s+/g, '_') : 'none';
                const tableName = `${normalizedClass}_${normalizedFaculty}`;

                try {
                    const response = await axios.get('https://notelibraryapp.com/api/admin/subjects.php', {
                        params: { action: 'subjects', table: tableName },
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    if (response.data.success) {
                        setAvailableSubjects(response.data.subjects);
                    } else {
                        setAvailableSubjects([]);
                    }
                } catch (error) {
                    console.error('Failed to fetch subjects:', error);
                    setAvailableSubjects([]);
                }
            } else {
                setAvailableSubjects([]);
            }
        };

        if (isModalOpen) fetchSubjects();
    }, [formData.class_level, formData.faculty, token, isModalOpen]);

    const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => {
            const next = { ...prev, [name]: value };
            if (name === 'class_level' && ['Class 8', 'Class 9', 'Class 10'].includes(value)) {
                next.faculty = 'None';
            }
            if (name === 'subject') {
                next.unit = '';
            }
            return next;
        });
    };

    const resetForm = () => {
        setFormData(prev => ({
            ...prev,
            chapter_name: '',
            drive_link: '',
            subject: '',
            unit: '',
            description: ''
        }));
        setSelectedFiles([]);
        setUploadMode('link');
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const files = Array.from(e.target.files);
            if (files.length > 50) {
                toast.error('Maximum 50 files allowed');
                e.target.value = '';
                return;
            }
            setSelectedFiles(files);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!token) return;

        const data = new FormData();
        Object.entries(formData).forEach(([key, value]) => {
            data.append(key, value);
        });
        data.append('upload_mode', uploadMode);

        if (uploadMode === 'manual') {
            if (selectedFiles.length === 0) {
                toast.error('Please select files for manual upload');
                return;
            }
            selectedFiles.forEach(file => {
                data.append('files[]', file);
            });
        } else if (!formData.drive_link || !formData.chapter_name) {
            toast.error('Please provide a Chapter Name and Google Drive link');
            return;
        }

        try {
            const response = await axios.post('https://notelibraryapp.com/api/admin/resources.php', data, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.data.success) {
                toast.success(response.data.message);
                setIsModalOpen(false);
                resetForm();
                fetchResources();
            } else {
                toast.error(response.data.message);
            }
        } catch (error: any) {
            console.error('Upload failed:', error);
            toast.error(error.response?.data?.message || 'Failed to save resource');
        }
    };

    const toggleVisibility = async (id: number, currentVisibility: number) => {
        if (!token) return;
        try {
            const response = await axios.post('https://notelibraryapp.com/api/admin/resources.php', {
                action: 'toggle_visibility',
                id,
                class_level: formData.class_level,
                visibility: currentVisibility === 1 ? 0 : 1
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (response.data.success) {
                toast.success('Visibility updated');
                fetchResources();
            }
        } catch (error) {
            toast.error('Failed to update visibility');
        }
    };

    const [selectedIds, setSelectedIds] = useState<number[]>([]);

    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            setSelectedIds(filteredResources.map(r => r.id));
        } else {
            setSelectedIds([]);
        }
    };

    const handleSelectOne = (id: number) => {
        setSelectedIds(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const deleteResources = async (ids: number[]) => {
        if (!window.confirm(`Are you sure you want to delete ${ids.length} item(s)?`)) return;
        if (!token) return;
        try {
            const response = await axios.post('https://notelibraryapp.com/api/admin/resources.php', {
                action: 'delete',
                ids,
                class_level: formData.class_level
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (response.data.success) {
                toast.success(response.data.message);
                setSelectedIds([]);
                fetchResources();
            }
        } catch (error) {
            toast.error('Failed to delete resource(s)');
        }
    };

    const filteredResources = resources.filter(res =>
        res.chapter_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        res.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
        res.resource_type.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <DashboardLayout>
            <div className="space-y-6">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-800">Resource Manager</h1>
                        <p className="text-sm text-gray-500 mt-1">Manage and upload study materials for students</p>
                    </div>
                    <div className="flex items-center gap-3">
                        {selectedIds.length > 0 && (
                            <button
                                onClick={() => deleteResources(selectedIds)}
                                className="px-4 py-2 bg-red-100 text-red-700 rounded-md hover:bg-red-200 flex items-center gap-2 font-semibold transition-all border border-red-200"
                            >
                                <Trash2 size={18} />
                                Delete Selected ({selectedIds.length})
                            </button>
                        )}
                        <button
                            onClick={() => setIsModalOpen(true)}
                            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 flex items-center gap-2 shadow-sm transition-all"
                        >
                            <Plus size={20} />
                            Add Resource
                        </button>
                    </div>
                </div>

                {/* Filters & Search */}
                <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex flex-col md:flex-row gap-4 items-center">
                    <div className="flex items-center gap-3 px-2">
                        <input
                            type="checkbox"
                            checked={filteredResources.length > 0 && selectedIds.length === filteredResources.length}
                            onChange={handleSelectAll}
                            className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        <span className="text-sm font-medium text-gray-600">All</span>
                    </div>
                    <div className="flex-1 relative w-full">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input
                            type="text"
                            placeholder="Search by chapter, subject, or type..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10 w-full rounded-lg border-gray-200 focus:border-indigo-500 focus:ring-indigo-500 text-sm"
                        />
                    </div>
                    <div className="flex items-center gap-3 w-full md:w-auto">
                        <Filter className="text-gray-400" size={18} />
                        <select
                            name="class_level"
                            value={formData.class_level}
                            onChange={(e) => {
                                handleFormChange(e);
                                setSelectedIds([]); // Reset selection on class change
                            }}
                            className="rounded-lg border-gray-200 focus:border-indigo-500 focus:ring-indigo-500 text-sm min-w-[140px]"
                        >
                            {classes.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                    </div>
                </div>

                {/* Resource List */}
                {isLoading ? (
                    <div className="flex justify-center py-12">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                    </div>
                ) : filteredResources.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filteredResources.map((res) => (
                            <div key={res.id} className={`bg-white rounded-xl border transition-all overflow-hidden group relative ${selectedIds.includes(res.id) ? 'border-indigo-500 ring-2 ring-indigo-50 shadow-md' : 'border-gray-100 shadow-sm hover:shadow-md'}`}>
                                <div className="absolute top-4 left-4 z-10">
                                    <input
                                        type="checkbox"
                                        checked={selectedIds.includes(res.id)}
                                        onChange={() => handleSelectOne(res.id)}
                                        className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer shadow-sm"
                                    />
                                </div>
                                <div className="p-4 pl-12">
                                    <div className="flex justify-between items-start mb-3">
                                        <div className="p-2 bg-indigo-50 rounded-lg">
                                            <FileText size={20} className="text-indigo-600" />
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <button
                                                onClick={() => toggleVisibility(res.id, res.visibility)}
                                                className={`p-1.5 rounded-md transition-colors ${res.visibility === 1 ? 'text-green-600 hover:bg-green-50' : 'text-gray-400 hover:bg-gray-100'}`}
                                                title={res.visibility === 1 ? 'Public' : 'Hidden'}
                                            >
                                                {res.visibility === 1 ? <Globe size={18} /> : <Lock size={18} />}
                                            </button>
                                            <button
                                                onClick={() => deleteResources([res.id])}
                                                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </div>
                                    <h3 className="font-semibold text-gray-800 line-clamp-1 mb-1">{res.chapter_name}</h3>
                                    <div className="flex flex-wrap gap-2 mb-4">
                                        <span className="text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 bg-gray-100 text-gray-600 rounded">
                                            {res.subject}
                                        </span>
                                        <span className="text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 bg-indigo-100 text-indigo-600 rounded">
                                            {res.resource_type}
                                        </span>
                                        {res.unit !== 'General' && (
                                            <span className="text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded">
                                                {res.unit}
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex items-center justify-between pt-3 border-t border-gray-50">
                                        <span className="text-xs text-gray-400">
                                            {res.upload_mode === 'link' ? 'Remote Link' : 'Secure Storage'}
                                        </span>
                                        <button
                                            onClick={() => {
                                                const url = res.upload_mode === 'link' ? res.file_data : `https://notelibraryapp.com/api/admin/serve_file.php?path=${encodeURIComponent(res.file_data)}&token=${token}`;
                                                // Check if it's likely a PDF or a manual upload (which we know are PDFs/files)
                                                if (url.toLowerCase().includes('.pdf') || res.upload_mode === 'manual') {
                                                    setViewerState({ isOpen: true, url, title: res.chapter_name });
                                                } else {
                                                    window.open(url, '_blank');
                                                }
                                            }}
                                            className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 bg-indigo-50 px-3 py-1.5 rounded-lg transition-colors"
                                        >
                                            View <ExternalLink size={12} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="bg-white p-12 rounded-xl border border-dashed border-gray-200 text-center">
                        <div className="flex justify-center mb-4">
                            <div className="p-4 bg-gray-50 rounded-full">
                                <FileText size={40} className="text-gray-300" />
                            </div>
                        </div>
                        <h2 className="text-lg font-semibold text-gray-800">No resources found</h2>
                        <p className="text-gray-500 mt-2 max-w-sm mx-auto">Try selecting a different class or adding your first resource using the button above.</p>
                    </div>
                )}
            </div>

            {/* Existing Modal - Same as before but with fetchResources() on success */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-8 shadow-2xl animate-in fade-in zoom-in duration-200">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-2xl font-bold text-gray-800">Add New Resource</h2>
                            <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-full text-gray-500 transition-colors">
                                <Plus size={24} className="rotate-45" />
                            </button>
                        </div>

                        <div className="flex bg-gray-100 p-1.5 rounded-xl mb-8">
                            <button
                                type="button"
                                onClick={() => setUploadMode('link')}
                                className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all ${uploadMode === 'link' ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
                            >
                                Google Drive Link
                            </button>
                            <button
                                type="button"
                                onClick={() => setUploadMode('manual')}
                                className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all ${uploadMode === 'manual' ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
                            >
                                Manual Upload
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">Class Level</label>
                                    <select disabled name="class_level" value={formData.class_level} className="w-full rounded-lg border-gray-200 bg-gray-50 cursor-not-allowed">
                                        <option value={formData.class_level}>{formData.class_level}</option>
                                    </select>
                                </div>

                                {!['Class 8', 'Class 9', 'Class 10'].includes(formData.class_level) && (
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-2">Faculty</label>
                                        <select required name="faculty" value={formData.faculty} onChange={handleFormChange} className="w-full rounded-lg border-gray-200 focus:border-indigo-500 focus:ring-indigo-500">
                                            <option value="">Select Faculty</option>
                                            {faculties.map(f => <option key={f} value={f}>{f}</option>)}
                                        </select>
                                    </div>
                                )}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">Subject</label>
                                    <select required name="subject" value={formData.subject} onChange={handleFormChange} className="w-full rounded-lg border-gray-200 focus:border-indigo-500 focus:ring-indigo-500">
                                        <option value="">Select Subject</option>
                                        {availableSubjects.map(s => <option key={s.subject_name} value={s.subject_name}>{s.subject_name}</option>)}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">Unit (Optional)</label>
                                    <select
                                        name="unit"
                                        value={formData.unit}
                                        onChange={handleFormChange}
                                        disabled={!hasUnitsEnabled || !formData.subject}
                                        className="w-full rounded-lg border-gray-200 focus:border-indigo-500 focus:ring-indigo-500 disabled:bg-gray-50 disabled:text-gray-400"
                                    >
                                        <option value="">None / General</option>
                                        {hasUnitsEnabled && unitsList.map(u => (
                                            <option key={u} value={u}>{u}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">Resource Type (e.g. Notes, MIQs)</label>
                                <textarea
                                    required
                                    name="description"
                                    value={formData.description}
                                    onChange={handleFormChange}
                                    rows={2}
                                    placeholder="Briefly describe what this is..."
                                    className="w-full rounded-lg border-gray-200 focus:border-indigo-500 focus:ring-indigo-500"
                                ></textarea>
                            </div>

                            {uploadMode === 'link' && (
                                <div className="space-y-6 animate-in slide-in-from-top-2 duration-200">
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-2">Chapter/Title Name</label>
                                        <input required type="text" name="chapter_name" value={formData.chapter_name} onChange={handleFormChange} placeholder="Enter resource title" className="w-full rounded-lg border-gray-200 focus:border-indigo-500 focus:ring-indigo-500" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-2">Google Drive URL</label>
                                        <input required type="url" name="drive_link" value={formData.drive_link} onChange={handleFormChange} placeholder="https://drive.google.com/..." className="w-full rounded-lg border-gray-200 focus:border-indigo-500 focus:ring-indigo-500" />
                                    </div>
                                </div>
                            )}

                            {uploadMode === 'manual' && (
                                <div className="space-y-4 animate-in slide-in-from-top-2 duration-200">
                                    <div className="p-8 border-2 border-dashed border-gray-200 rounded-2xl text-center bg-gray-50 group-hover:border-indigo-300 transition-colors">
                                        <label className="block">
                                            <span className="sr-only">Choose files</span>
                                            <input
                                                type="file"
                                                multiple
                                                onChange={handleFileChange}
                                                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2.5 file:px-6 file:rounded-xl file:border-0 file:text-sm file:font-bold file:bg-indigo-600 file:text-white hover:file:bg-indigo-700 cursor-pointer"
                                            />
                                        </label>
                                        <p className="mt-3 text-xs text-gray-500">Filenames will be used as Chapter Names automatically. Max 50 files.</p>
                                    </div>
                                    {selectedFiles.length > 0 && (
                                        <div className="flex items-center gap-2 px-4 py-3 bg-indigo-50 text-indigo-700 rounded-xl text-sm font-semibold">
                                            <FileText size={18} /> {selectedFiles.length} files staged for upload
                                        </div>
                                    )}
                                </div>
                            )}

                            <div className="flex justify-end gap-3 pt-6 border-t border-gray-100">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-2.5 text-sm font-bold text-gray-700 hover:bg-gray-100 rounded-xl transition-colors">Cancel</button>
                                <button type="submit" className="px-8 py-2.5 bg-indigo-600 text-white text-sm font-bold rounded-xl hover:bg-indigo-700 shadow-md shadow-indigo-200 transition-all">Save Resource</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <PdfViewerModal
                isOpen={viewerState.isOpen}
                onClose={() => setViewerState(prev => ({ ...prev, isOpen: false }))}
                fileUrl={viewerState.url}
                title={viewerState.title}
            />
        </DashboardLayout>
    );
}
