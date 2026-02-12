import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, X } from 'lucide-react';
import axios from 'axios';
import { DashboardLayout } from '../components/DashboardLayout';
import { useAuth } from '../context/AuthContext';

const API_URL = 'https://notelibraryapp.com/api/admin/testSeriesCollection.php';

interface TestSeriesCollection {
    id: number;
    title: string;
    competitive_exam: 'IOE' | 'CEE' | 'OTHER';
    description: string;
    price: number | null;
    discount_price: number | null;
    image_url: string | null;
    created_at: string;
    updated_at: string;
}

const COMPETITIVE_EXAMS = ['IOE', 'CEE', 'OTHER'] as const;

export default function TestSeriesCollectionManager() {
    const { token } = useAuth();
    const [collections, setCollections] = useState<TestSeriesCollection[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingCollection, setEditingCollection] = useState<TestSeriesCollection | null>(null);
    const [loading, setLoading] = useState(false);

    const [formData, setFormData] = useState({
        title: '',
        description: '',
        competitive_exam: '' as '' | 'IOE' | 'CEE' | 'OTHER',
        image_url: '',
        price: '',
        discount_price: ''
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

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        const payload = {
            title: formData.title,
            description: formData.description,
            competitive_exam: formData.competitive_exam,
            image_url: formData.image_url || null,
            price: formData.price ? parseFloat(formData.price) : 0,
            discount_price: formData.discount_price ? parseFloat(formData.discount_price) : null
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

    const handleEdit = (collection: TestSeriesCollection) => {
        setEditingCollection(collection);
        setFormData({
            title: collection.title,
            description: collection.description,
            competitive_exam: collection.competitive_exam,
            image_url: collection.image_url || '',
            price: collection.price?.toString() || '',
            discount_price: collection.discount_price?.toString() || ''
        });
        setIsModalOpen(true);
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Are you sure you want to delete this collection? All test series in it will also be deleted.')) {
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
            competitive_exam: '',
            image_url: '',
            price: '',
            discount_price: ''
        });
        setEditingCollection(null);
    };

    return (
        <DashboardLayout>
            <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Test Series Collections</h1>
                        <p className="text-gray-600 mt-1">Organize premium test series by competitive exam</p>
                    </div>
                    <button
                        onClick={() => {
                            resetForm();
                            setIsModalOpen(true);
                        }}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        <Plus size={20} />
                        Create Collection
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {collections.map(collection => (
                        <div key={collection.id} className="bg-white rounded-lg shadow-md overflow-hidden">
                            {collection.image_url && (
                                <img
                                    src={collection.image_url}
                                    alt={collection.title}
                                    className="w-full h-40 object-cover"
                                />
                            )}
                            <div className="p-4">
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full font-medium">
                                        {collection.competitive_exam}
                                    </span>
                                </div>
                                <h3 className="text-lg font-semibold text-gray-900 mb-1">{collection.title}</h3>
                                <p className="text-gray-600 text-sm mb-3 line-clamp-2">{collection.description}</p>

                                <div className="flex items-center gap-2 mb-4">
                                    {collection.discount_price !== null && collection.discount_price >= 0 ? (
                                        <>
                                            <span className="text-lg font-bold text-green-600">
                                                {collection.discount_price === 0 ? 'FREE' : `NPR ${collection.discount_price.toFixed(2)}`}
                                            </span>
                                            {collection.discount_price < (collection.price || 0) && (
                                                <span className="text-sm text-gray-400 line-through">
                                                    NPR {collection.price?.toFixed(2)}
                                                </span>
                                            )}
                                        </>
                                    ) : (
                                        <span className="text-lg font-bold text-green-600">
                                            {collection.price === 0 ? 'FREE' : `NPR ${collection.price?.toFixed(2)}`}
                                        </span>
                                    )}
                                </div>

                                <div className="flex gap-2">
                                    <button
                                        onClick={() => handleEdit(collection)}
                                        className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors text-sm"
                                    >
                                        <Edit2 size={14} />
                                        Edit
                                    </button>
                                    <button
                                        onClick={() => handleDelete(collection.id)}
                                        className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors text-sm"
                                    >
                                        <Trash2 size={14} />
                                        Delete
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}

                    {collections.length === 0 && (
                        <div className="col-span-full text-center py-12 bg-white rounded-lg shadow-md">
                            <p className="text-gray-500 text-lg">No collections found. Create your first collection!</p>
                        </div>
                    )}
                </div>

                {isModalOpen && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                        <div className="bg-white rounded-lg max-w-lg w-full max-h-[90vh] overflow-y-auto">
                            <div className="flex justify-between items-center p-6 border-b">
                                <h2 className="text-2xl font-bold text-gray-900">
                                    {editingCollection ? 'Edit Collection' : 'Create Collection'}
                                </h2>
                                <button
                                    onClick={() => {
                                        setIsModalOpen(false);
                                        resetForm();
                                    }}
                                    className="text-gray-500 hover:text-gray-700"
                                >
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

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Competitive Exam</label>
                                        <select
                                            name="competitive_exam"
                                            value={formData.competitive_exam}
                                            onChange={handleInputChange}
                                            required
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        >
                                            <option value="">Select competitive exam</option>
                                            {COMPETITIVE_EXAMS.map(exam => (
                                                <option key={exam} value={exam}>{exam}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Image URL</label>
                                        <input
                                            type="url"
                                            name="image_url"
                                            value={formData.image_url}
                                            onChange={handleInputChange}
                                            placeholder="https://example.com/banner.png"
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Price</label>
                                        <input
                                            type="number"
                                            name="price"
                                            value={formData.price}
                                            onChange={handleInputChange}
                                            required
                                            min="0"
                                            step="0.01"
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Discount Price (optional)</label>
                                        <input
                                            type="number"
                                            name="discount_price"
                                            value={formData.discount_price}
                                            onChange={handleInputChange}
                                            min="0"
                                            step="0.01"
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        />
                                    </div>
                                </div>

                                <div className="flex gap-3 pt-4">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setIsModalOpen(false);
                                            resetForm();
                                        }}
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
