import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom';
import {
    ChevronRight, Home, Plus, Edit2, Trash2,
    Layers, BookOpen
} from 'lucide-react';
import axios from 'axios';
import { DashboardLayout } from '../components/DashboardLayout';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const HIERARCHY_API = 'https://notelibraryapp.com/api/admin/resourceHierarchy.php';

interface Item {
    id: number;
    title: string;
}

export default function ResourceStructureManager() {
    const { token } = useAuth();
    const { collectionId } = useParams();
    const navigate = useNavigate();
    const location = useLocation();

    const collectionName = location.state?.collectionName || 'Class';

    const [faculties, setFaculties] = useState<Item[]>([]);
    const [selectedFaculty, setSelectedFaculty] = useState<Item | null>(null);
    const [subjects, setSubjects] = useState<Item[]>([]);
    const [loading, setLoading] = useState(false);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalType, setModalType] = useState<'faculty' | 'subject'>('faculty');
    const [editingItem, setEditingItem] = useState<Item | null>(null);
    const [formData, setFormData] = useState({ title: '' });

    useEffect(() => {
        if (collectionId) fetchFaculties();
    }, [collectionId]);

    const fetchFaculties = async () => {
        setLoading(true);
        try {
            const response = await axios.get(`${HIERARCHY_API}?type=faculty&parentId=${collectionId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (response.data.success) {
                setFaculties(response.data.data);
            }
        } catch (error) {
            toast.error('Failed to fetch faculties');
        } finally {
            setLoading(false);
        }
    };

    const fetchSubjects = async (facultyId: number) => {
        try {
            const response = await axios.get(`${HIERARCHY_API}?type=subject&parentId=${facultyId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (response.data.success) {
                setSubjects(response.data.data);
            }
        } catch (error) {
            toast.error('Failed to fetch subjects');
        }
    };

    const handleSelectFaculty = (faculty: Item) => {
        setSelectedFaculty(faculty);
        fetchSubjects(faculty.id);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const pid = modalType === 'faculty' ? collectionId : selectedFaculty?.id;

        try {
            if (editingItem) {
                await axios.put(HIERARCHY_API,
                    { id: editingItem.id, title: formData.title },
                    { params: { type: modalType }, headers: { Authorization: `Bearer ${token}` } }
                );
                toast.success('Updated successfully');
            } else {
                await axios.post(HIERARCHY_API,
                    { title: formData.title, parentId: pid },
                    { params: { type: modalType }, headers: { Authorization: `Bearer ${token}` } }
                );
                toast.success('Created successfully');
            }

            if (modalType === 'faculty') fetchFaculties();
            else if (selectedFaculty) fetchSubjects(selectedFaculty.id);

            setIsModalOpen(false);
            setEditingItem(null);
            setFormData({ title: '' });
        } catch (error) {
            toast.error('Operation failed');
        }
    };

    const handleDelete = async (type: 'faculty' | 'subject', id: number) => {
        if (!confirm('Are you sure? This will delete all items inside.')) return;
        try {
            await axios.delete(`${HIERARCHY_API}?type=${type}&id=${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success('Deleted successfully');
            if (type === 'faculty') {
                fetchFaculties();
                if (selectedFaculty?.id === id) {
                    setSelectedFaculty(null);
                    setSubjects([]);
                }
            } else if (selectedFaculty) {
                fetchSubjects(selectedFaculty.id);
            }
        } catch (error) {
            toast.error('Delete failed');
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
                    <span className="text-gray-900 font-bold">Faculties & Subjects</span>
                </nav>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Faculties Section */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                                <Layers className="text-purple-600" />
                                Faculties
                            </h2>
                            <button
                                onClick={() => { setModalType('faculty'); setEditingItem(null); setFormData({ title: '' }); setIsModalOpen(true); }}
                                className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                            >
                                <Plus size={20} />
                            </button>
                        </div>
                        <div className="divide-y divide-gray-50 max-h-[600px] overflow-y-auto">
                            {faculties.map(f => (
                                <div
                                    key={f.id}
                                    onClick={() => handleSelectFaculty(f)}
                                    className={`p-4 flex items-center justify-between cursor-pointer transition-all ${selectedFaculty?.id === f.id ? 'bg-blue-50 border-l-4 border-blue-600' : 'hover:bg-gray-50 border-l-4 border-transparent'}`}
                                >
                                    <span className="font-semibold text-gray-800">{f.title}</span>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={(e) => { e.stopPropagation(); setModalType('faculty'); setEditingItem(f); setFormData({ title: f.title }); setIsModalOpen(true); }}
                                            className="p-1.5 text-gray-400 hover:text-blue-600"
                                        >
                                            <Edit2 size={16} />
                                        </button>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleDelete('faculty', f.id); }}
                                            className="p-1.5 text-gray-400 hover:text-red-600"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                            {faculties.length === 0 && !loading && (
                                <div className="p-8 text-center text-gray-500 italic">No faculties found. Create one to begin.</div>
                            )}
                        </div>
                    </div>

                    {/* Subjects Section */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                                <BookOpen className="text-blue-600" />
                                Subjects {selectedFaculty && `(${selectedFaculty.title})`}
                            </h2>
                            {selectedFaculty && (
                                <button
                                    onClick={() => { setModalType('subject'); setEditingItem(null); setFormData({ title: '' }); setIsModalOpen(true); }}
                                    className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                                >
                                    <Plus size={20} />
                                </button>
                            )}
                        </div>
                        <div className="divide-y divide-gray-50 max-h-[600px] overflow-y-auto">
                            {!selectedFaculty ? (
                                <div className="p-12 text-center text-gray-400">Select a faculty to see subjects</div>
                            ) : subjects.length === 0 ? (
                                <div className="p-8 text-center text-gray-500 italic">No subjects found for this faculty.</div>
                            ) : (
                                subjects.map(s => (
                                    <div
                                        key={s.id}
                                        className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors group"
                                    >
                                        <span className="font-semibold text-gray-800">{s.title}</span>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => navigate(`/resource-management/subject/${s.id}`, {
                                                    state: {
                                                        subjectName: s.title,
                                                        facultyName: selectedFaculty.title,
                                                        collectionName: collectionName
                                                    }
                                                })}
                                                className="px-3 py-1 bg-green-50 text-green-700 text-sm rounded-md font-medium hover:bg-green-100 flex items-center gap-1"
                                            >
                                                Manage Content <ChevronRight size={14} />
                                            </button>
                                            <button
                                                onClick={() => { setModalType('subject'); setEditingItem(s); setFormData({ title: s.title }); setIsModalOpen(true); }}
                                                className="p-1.5 text-gray-400 hover:text-blue-600 opacity-0 group-hover:opacity-100"
                                            >
                                                <Edit2 size={16} />
                                            </button>
                                            <button
                                                onClick={() => handleDelete('subject', s.id)}
                                                className="p-1.5 text-gray-400 hover:text-red-600 opacity-0 group-hover:opacity-100"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {isModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-lg p-6 max-w-sm w-full">
                        <h2 className="text-xl font-bold mb-4">{editingItem ? 'Edit' : 'Add'} {modalType === 'faculty' ? 'Faculty' : 'Subject'}</h2>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Title</label>
                                <input
                                    type="text"
                                    value={formData.title}
                                    onChange={e => setFormData({ title: e.target.value })}
                                    required
                                    autoFocus
                                    className="mt-1 w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                                />
                            </div>
                            <div className="flex gap-3 mt-6">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50">Cancel</button>
                                <button type="submit" className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Save</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </DashboardLayout>
    );
}
