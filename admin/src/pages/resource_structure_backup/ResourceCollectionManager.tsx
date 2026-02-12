import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, X, FolderOpen } from 'lucide-react';
import axios from 'axios';
import { DashboardLayout } from '../components/DashboardLayout';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const API_URL = 'https://notelibraryapp.com/api/admin/resourceCollection.php';

interface ResourceCollection {
    id: number;
    title: string;
    description: string;
    image_url: string | null;
    created_at: string;
    updated_at: string;
}

export default function ResourceCollectionManager() {
    const { token } = useAuth();
    const navigate = useNavigate();
    const [collections, setCollections] = useState<ResourceCollection[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingCollection, setEditingCollection] = useState<ResourceCollection | null>(null);
    const [loading, setLoading] = useState(false);

    const [formData, setFormData] = useState({
        title: '',
        description: '',
        image_url: ''
    });

    useEffect(() => {
        fetchCollections();
    }, []);

    const fetchCollections = async () => {
        try {
            const response = await axios.get(API_URL, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (response.data.success) {
                setCollections(response.data.data);
            }
        } catch (error) {
            console.error('Error fetching collections:', error);
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        const payload = {
            title: formData.title,
            description: formData.description,
            image_url: formData.image_url || null
        };

        try {
            if (editingCollection) {
                await axios.put(API_URL, { ...payload, id: editingCollection.id }, {
                    headers: { Authorization: `Bearer ${token}` }
                });
            } else {
                await axios.post(API_URL, payload, {
                    headers: { Authorization: `Bearer ${token}` }
                });
            }

            await fetchCollections();
            resetForm();
            setIsModalOpen(false);
        } catch (error) {
            console.error('Error saving collection:', error);
            alert('Error saving collection');
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (collection: ResourceCollection) => {
        setEditingCollection(collection);
        setFormData({
            title: collection.title,
            description: collection.description,
            image_url: collection.image_url || ''
        });
        setIsModalOpen(true);
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Are you sure you want to delete this collection? All data inside it will be lost.')) {
            return;
        }

        try {
            await axios.delete(`${API_URL}?id=${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            await fetchCollections();
        } catch (error) {
            console.error('Error deleting collection:', error);
            alert('Error deleting collection');
        }
    };

    const resetForm = () => {
        setFormData({
            title: '',
            description: '',
            image_url: ''
        });
        setEditingCollection(null);
    };

    return (
        <DashboardLayout>
            <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Resource Collections (Classes)</h1>
                        <p className="text-gray-600 mt-1">Manage notes and study materials by Class</p>
                    </div>
                    <button
                        onClick={() => {
                            resetForm();
                            setIsModalOpen(true);
                        }}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        <Plus size={20} />
                        Add New Class
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {collections.map(collection => (
                        <div key={collection.id} className="bg-white rounded-lg shadow-md overflow-hidden flex flex-col">
                            {collection.image_url ? (
                                <img
                                    src={collection.image_url}
                                    alt={collection.title}
                                    className="w-full h-40 object-cover"
                                />
                            ) : (
                                <div className="w-full h-40 bg-gray-100 flex items-center justify-center text-gray-400">
                                    <FolderOpen size={48} />
                                </div>
                            )}
                            <div className="p-4 flex-grow flex flex-col">
                                <h3 className="text-lg font-semibold text-gray-900 mb-1">{collection.title}</h3>
                                <p className="text-gray-600 text-sm mb-4 line-clamp-2 flex-grow">{collection.description}</p>

                                <div className="flex gap-2">
                                    <button
                                        onClick={() => navigate(`/resource-management/${collection.id}`, { state: { collectionName: collection.title } })}
                                        className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-blue-50 text-blue-700 rounded hover:bg-blue-100 transition-colors text-sm font-medium"
                                    >
                                        <FolderOpen size={14} />
                                        Open
                                    </button>
                                    <button
                                        onClick={() => handleEdit(collection)}
                                        className="flex items-center justify-center p-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors text-sm"
                                    >
                                        <Edit2 size={14} />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(collection.id)}
                                        className="flex items-center justify-center p-2 bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors text-sm"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}

                    {collections.length === 0 && (
                        <div className="col-span-full text-center py-12 bg-white rounded-lg shadow-md">
                            <p className="text-gray-500 text-lg">No resource collections found. Create your first collection!</p>
                        </div>
                    )}
                </div>

                {isModalOpen && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                        <div className="bg-white rounded-lg max-w-lg w-full">
                            <div className="flex justify-between items-center p-6 border-b">
                                <h2 className="text-2xl font-bold text-gray-900">
                                    {editingCollection ? 'Edit Collection' : 'Create Collection'}
                                </h2>
                                <button onClick={() => setIsModalOpen(false)} className="text-gray-500 hover:text-gray-700">
                                    <X size={24} />
                                </button>
                            </div>

                            <form onSubmit={handleSubmit} className="p-6 space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                                    <input
                                        type="text"
                                        name="title"
                                        value={formData.title}
                                        onChange={handleInputChange}
                                        required
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                                    <textarea
                                        name="description"
                                        value={formData.description}
                                        onChange={handleInputChange}
                                        rows={3}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Image URL</label>
                                    <input
                                        type="url"
                                        name="image_url"
                                        value={formData.image_url}
                                        onChange={handleInputChange}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    />
                                </div>

                                <div className="flex gap-3 pt-4">
                                    <button
                                        type="button"
                                        onClick={() => setIsModalOpen(false)}
                                        className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                                    >
                                        {loading ? 'Saving...' : editingCollection ? 'Update' : 'Create'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
}
