import { useState, useEffect } from 'react';
import { useParams, useLocation, Link } from 'react-router-dom';
import {
    ChevronRight, Home, Plus, Edit2, Trash2,
    FileText, Upload, Folder, Bookmark,
    X, ExternalLink
} from 'lucide-react';
import axios from 'axios';
import { DashboardLayout } from '../components/DashboardLayout';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const HIERARCHY_API = 'https://notelibraryapp.com/api/admin/resourceHierarchy.php';
const UPLOAD_API = 'https://notelibraryapp.com/api/admin/resourceUpload.php';

interface Item {
    id: number;
    title: string;
    file_path?: string;
}

export default function ResourceContentManager() {
    const { token } = useAuth();
    const { subjectId } = useParams();
    const location = useLocation();

    const [units, setUnits] = useState<Item[]>([]);
    const [selectedUnit, setSelectedUnit] = useState<Item | null>(null);
    const [chapters, setChapters] = useState<Item[]>([]);
    const [selectedChapter, setSelectedChapter] = useState<Item | null>(null);
    const [documents, setDocuments] = useState<Item[]>([]);
    const [loading, setLoading] = useState(false);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalType, setModalType] = useState<'unit' | 'chapter'>('unit');
    const [editingItem, setEditingItem] = useState<Item | null>(null);
    const [formData, setFormData] = useState({ title: '' });

    // Upload State
    const [isUploadOpen, setIsUploadOpen] = useState(false);
    const [uploadFile, setUploadFile] = useState<File | null>(null);
    const [uploadTitle, setUploadTitle] = useState('');
    const [uploading, setUploading] = useState(false);

    const subjectName = location.state?.subjectName || 'Subject';
    const facultyName = location.state?.facultyName || '';

    useEffect(() => {
        if (subjectId) fetchUnits();
    }, [subjectId]);

    const fetchUnits = async () => {
        setLoading(true);
        try {
            const response = await axios.get(`${HIERARCHY_API}?type=unit&parentId=${subjectId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (response.data.success) setUnits(response.data.data);
        } catch (error) {
            toast.error('Failed to fetch units');
        } finally {
            setLoading(false);
        }
    };

    const fetchChapters = async (unitId: number) => {
        try {
            const response = await axios.get(`${HIERARCHY_API}?type=chapter&parentId=${unitId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (response.data.success) setChapters(response.data.data);
        } catch (error) {
            toast.error('Failed to fetch chapters');
        }
    };

    const fetchDocuments = async (chapterId: number) => {
        try {
            const response = await axios.get(`${HIERARCHY_API}?type=document&parentId=${chapterId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (response.data.success) setDocuments(response.data.data);
        } catch (error) {
            toast.error('Failed to fetch documents');
        }
    };

    const handleSelectUnit = (unit: Item) => {
        setSelectedUnit(unit);
        setSelectedChapter(null);
        setDocuments([]);
        fetchChapters(unit.id);
    };

    const handleSelectChapter = (chapter: Item) => {
        setSelectedChapter(chapter);
        fetchDocuments(chapter.id);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const pid = modalType === 'unit' ? subjectId : selectedUnit?.id;

        try {
            if (editingItem) {
                await axios.put(HIERARCHY_API,
                    { id: editingItem.id, title: formData.title },
                    { params: { type: modalType }, headers: { Authorization: `Bearer ${token}` } }
                );
            } else {
                await axios.post(HIERARCHY_API,
                    { title: formData.title, parentId: pid },
                    { params: { type: modalType }, headers: { Authorization: `Bearer ${token}` } }
                );
            }

            if (modalType === 'unit') fetchUnits();
            else if (selectedUnit) fetchChapters(selectedUnit.id);

            setIsModalOpen(false);
            setEditingItem(null);
            setFormData({ title: '' });
            toast.success('Successfully saved');
        } catch (error) {
            toast.error('Operation failed');
        }
    };

    const handleDelete = async (type: 'unit' | 'chapter' | 'document', id: number) => {
        if (!confirm('Are you sure?')) return;
        try {
            await axios.delete(`${HIERARCHY_API}?type=${type}&id=${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success('Deleted successfully');
            if (type === 'unit') {
                fetchUnits();
                if (selectedUnit?.id === id) { setSelectedUnit(null); setChapters([]); }
            } else if (type === 'chapter') {
                if (selectedUnit) fetchChapters(selectedUnit.id);
                if (selectedChapter?.id === id) { setSelectedChapter(null); setDocuments([]); }
            } else if (selectedChapter) {
                fetchDocuments(selectedChapter.id);
            }
        } catch (error) {
            toast.error('Delete failed');
        }
    };

    const handleUpload = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!uploadFile || !selectedChapter) return;

        setUploading(true);
        const form = new FormData();
        form.append('file', uploadFile);
        form.append('title', uploadTitle);
        form.append('chapter_id', selectedChapter.id.toString());

        const collectionName = location.state?.collectionName || '';

        // Construct path metadata for folder structure
        const pathData = [collectionName, facultyName, subjectName, selectedUnit?.title || '', selectedChapter.title];
        form.append('path_data', JSON.stringify(pathData.filter(p => p !== '')));

        try {
            const response = await axios.post(UPLOAD_API, form, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                    Authorization: `Bearer ${token}`
                }
            });
            if (response.data.success) {
                toast.success('File uploaded successfully');
                setIsUploadOpen(false);
                setUploadFile(null);
                setUploadTitle('');
                fetchDocuments(selectedChapter.id);
            }
        } catch (error) {
            toast.error('Upload failed');
        } finally {
            setUploading(false);
        }
    };

    return (
        <DashboardLayout>
            <div className="p-6">
                <nav className="flex items-center space-x-2 text-sm text-gray-600 mb-6 font-medium bg-white p-3 rounded-lg shadow-sm">
                    <Link to="/resource-management" className="hover:text-blue-600 flex items-center">
                        <Home size={16} className="mr-1" />
                        Classes
                    </Link>
                    <ChevronRight size={14} className="text-gray-400" />
                    <button onClick={() => window.history.back()} className="hover:text-blue-600">{facultyName}</button>
                    <ChevronRight size={14} className="text-gray-400" />
                    <span className="text-gray-900 font-bold">{subjectName}</span>
                </nav>

                <div className="flex flex-col gap-6">
                    {/* Units & Chapters Row */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Units */}
                        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                            <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                                <h2 className="font-bold text-gray-900 flex items-center gap-2">
                                    <Bookmark className="text-green-600" size={18} />
                                    Units
                                </h2>
                                <button onClick={() => { setModalType('unit'); setEditingItem(null); setFormData({ title: '' }); setIsModalOpen(true); }} className="p-1.5 bg-blue-600 text-white rounded hover:bg-blue-700">
                                    <Plus size={16} />
                                </button>
                            </div>
                            <div className="divide-y divide-gray-50 max-h-[300px] overflow-y-auto">
                                {units.map(u => (
                                    <div key={u.id} onClick={() => handleSelectUnit(u)} className={`p-3 flex items-center justify-between cursor-pointer ${selectedUnit?.id === u.id ? 'bg-green-50' : 'hover:bg-gray-50'}`}>
                                        <span className="text-sm font-semibold text-gray-700">{u.title}</span>
                                        <div className="flex gap-1">
                                            <button onClick={(e) => { e.stopPropagation(); setModalType('unit'); setEditingItem(u); setFormData({ title: u.title }); setIsModalOpen(true); }} className="p-1 text-gray-400 hover:text-blue-600"><Edit2 size={14} /></button>
                                            <button onClick={(e) => { e.stopPropagation(); handleDelete('unit', u.id); }} className="p-1 text-gray-400 hover:text-red-600"><Trash2 size={14} /></button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Chapters */}
                        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                            <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                                <h2 className="font-bold text-gray-900 flex items-center gap-2">
                                    <Folder className="text-yellow-600" size={18} />
                                    Chapters
                                </h2>
                                {selectedUnit && (
                                    <button onClick={() => { setModalType('chapter'); setEditingItem(null); setFormData({ title: '' }); setIsModalOpen(true); }} className="p-1.5 bg-blue-600 text-white rounded hover:bg-blue-700">
                                        <Plus size={16} />
                                    </button>
                                )}
                            </div>
                            <div className="divide-y divide-gray-50 max-h-[300px] overflow-y-auto">
                                {!selectedUnit ? <div className="p-6 text-center text-gray-400 text-sm italic">Select a Unit first</div> :
                                    chapters.map(c => (
                                        <div key={c.id} onClick={() => handleSelectChapter(c)} className={`p-3 flex items-center justify-between cursor-pointer ${selectedChapter?.id === c.id ? 'bg-yellow-50' : 'hover:bg-gray-50'}`}>
                                            <span className="text-sm font-semibold text-gray-700">{c.title}</span>
                                            <div className="flex gap-1">
                                                <button onClick={(e) => { e.stopPropagation(); setModalType('chapter'); setEditingItem(c); setFormData({ title: c.title }); setIsModalOpen(true); }} className="p-1 text-gray-400 hover:text-blue-600"><Edit2 size={14} /></button>
                                                <button onClick={(e) => { e.stopPropagation(); handleDelete('chapter', c.id); }} className="p-1 text-gray-400 hover:text-red-600"><Trash2 size={14} /></button>
                                            </div>
                                        </div>
                                    ))}
                            </div>
                        </div>
                    </div>

                    {/* PDF Documents Section */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-3">
                                <FileText className="text-red-600" />
                                Content & PDF Notes {selectedChapter && `(${selectedChapter.title})`}
                            </h2>
                            {selectedChapter && (
                                <button onClick={() => { setUploadTitle(''); setUploadFile(null); setIsUploadOpen(true); }} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
                                    <Upload size={18} />
                                    Upload PDF
                                </button>
                            )}
                        </div>
                        <div className="p-6">
                            {!selectedChapter ? (
                                <div className="text-center py-12 text-gray-400 italic">Select a Chapter to manage PDF notes</div>
                            ) : documents.length === 0 ? (
                                <div className="text-center py-12 text-gray-500 bg-gray-50 rounded-lg border-2 border-dashed">No PDF documents uploaded yet.</div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {documents.map(doc => (
                                        <div key={doc.id} className="p-4 border border-gray-100 rounded-xl bg-white shadow-sm hover:shadow-md transition-shadow flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 bg-red-50 rounded-lg"><FileText className="text-red-600" size={20} /></div>
                                                <span className="font-semibold text-gray-800 text-sm">{doc.title}</span>
                                            </div>
                                            <div className="flex gap-2">
                                                <a href={`https://notelibraryapp.com/api/get_resource.php?id=${doc.id}`} target="_blank" className="p-2 text-blue-600 hover:bg-blue-50 rounded text-xs flex items-center gap-1">
                                                    <ExternalLink size={16} /> View
                                                </a>
                                                <button onClick={() => handleDelete('document', doc.id)} className="p-2 text-red-500 hover:bg-red-50 rounded"><Trash2 size={16} /></button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Entity Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-lg p-6 max-w-sm w-full shadow-2xl">
                        <h2 className="text-xl font-bold mb-4">{editingItem ? 'Edit' : 'Add'} {modalType.toUpperCase()}</h2>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <input type="text" value={formData.title} onChange={e => setFormData({ title: e.target.value })} required autoFocus className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder={`Enter ${modalType} title...`} />
                            <div className="flex gap-2">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50 text-sm font-medium">Cancel</button>
                                <button type="submit" className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium">Save</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Upload Modal */}
            {isUploadOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-lg p-6 max-w-md w-full shadow-2xl">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold">Upload PDF Note</h2>
                            <button onClick={() => setIsUploadOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={24} /></button>
                        </div>
                        <form onSubmit={handleUpload} className="space-y-5">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Note Title</label>
                                <input type="text" value={uploadTitle} onChange={e => setUploadTitle(e.target.value)} required placeholder="e.g. Mechanics Lecture Notes" className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 outline-none" />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Select File (PDF only)</label>
                                <div className="border-2 border-dashed border-gray-200 rounded-lg p-4 text-center hover:border-green-400 transition-colors">
                                    <input type="file" accept=".pdf" onChange={e => setUploadFile(e.target.files?.[0] || null)} required className="w-full text-sm" />
                                </div>
                            </div>
                            <div className="flex gap-3">
                                <button type="button" onClick={() => setIsUploadOpen(false)} className="flex-1 px-4 py-2 border border-gray-300 rounded-lg font-medium">Cancel</button>
                                <button type="submit" disabled={uploading} className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg font-bold disabled:opacity-50 shadow-md">
                                    {uploading ? 'Uploading...' : 'Upload Now'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </DashboardLayout>
    );
}
