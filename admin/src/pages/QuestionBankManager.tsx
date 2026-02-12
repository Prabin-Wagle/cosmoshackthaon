import { useState, useEffect, ChangeEvent } from 'react';
import axios from 'axios';
import { DashboardLayout } from '../components/DashboardLayout';
import { useAuth } from '../context/AuthContext';
import { LatexRenderer } from '../components/LatexRenderer';
import { Plus, Trash2, Edit2, Search, Upload, Save, X } from 'lucide-react';
import toast from 'react-hot-toast';

const API_URL = 'https://notelibraryapp.com/api/admin/questionBank.php';
const UPLOAD_API_URL = 'https://notelibraryapp.com/api/admin/upload_question_image.php';

interface Unit {
    id: string; // Table name e.g. qb_physics
    name: string; // Display name e.g. Physics
}

interface Question {
    id: number;
    question_uid: string;
    chapter: string;
    question_text: string;
    options: string[];
    correct_option: number;
    marks: number;
    explanation: string;
    image_link: string | null;
}

export default function QuestionBankManager() {
    const { token } = useAuth();
    const [units, setUnits] = useState<Unit[]>([]);
    const [selectedUnit, setSelectedUnit] = useState<string>('');
    const [questions, setQuestions] = useState<Question[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
    const [formData, setFormData] = useState<Partial<Question>>({
        question_uid: '',
        question_text: '',
        options: ['', '', '', ''],
        correct_option: 0,
        marks: 1,
        chapter: '',
        explanation: '',
        image_link: null
    });
    const [uploadingImage, setUploadingImage] = useState(false);

    // New Unit State
    const [newUnitName, setNewUnitName] = useState('');

    // Generator State
    const [isGeneratorOpen, setIsGeneratorOpen] = useState(false);
    const [generatorConfig, setGeneratorConfig] = useState<Record<string, number>>({});
    const [generatedJson, setGeneratedJson] = useState('');
    const [showGeneratedResult, setShowGeneratedResult] = useState(false);

    useEffect(() => {
        fetchUnits();
    }, []);

    useEffect(() => {
        if (selectedUnit) {
            fetchQuestions();
        } else {
            setQuestions([]);
        }
    }, [selectedUnit]);

    const fetchUnits = async () => {
        try {
            const res = await axios.get(`${API_URL}?action=list_units`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.data.success) {
                setUnits(res.data.data);
                if (res.data.data.length > 0 && !selectedUnit) {
                    setSelectedUnit(res.data.data[0].id);
                }
            }
        } catch (error) {
            console.error(error);
            toast.error('Failed to load units');
        }
    };

    const fetchQuestions = async () => {
        setLoading(true);
        try {
            const res = await axios.get(`${API_URL}?action=list_questions&unit=${selectedUnit}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.data.success) {
                setQuestions(res.data.data);
            }
        } catch (error) {
            console.error(error);
            toast.error('Failed to load questions');
        } finally {
            setLoading(false);
        }
    };

    const handleGenerateSet = async () => {
        setLoading(true);
        try {
            // Filter out 0 counts
            const config: Record<string, number> = {};
            let hasValue = false;
            Object.entries(generatorConfig).forEach(([unit, count]) => {
                if (count > 0) {
                    config[unit] = count;
                    hasValue = true;
                }
            });

            if (!hasValue) {
                toast.error("Please enter at least one question count");
                setLoading(false);
                return;
            }

            const res = await axios.post(`${API_URL}?action=generate_random_set`, { config }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (res.data.success) {
                setGeneratedJson(JSON.stringify(res.data.data, null, 2));
                setShowGeneratedResult(true);
                setIsGeneratorOpen(false);
                toast.success(`Generated set with ${res.data.data.length} questions`);
            }
        } catch (error) {
            console.error(error);
            toast.error('Failed to generate set');
        } finally {
            setLoading(false);
        }
    };

    const copyToClipboard = () => {
        navigator.clipboard.writeText(generatedJson);
        toast.success('JSON copied to clipboard!');
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Are you sure you want to delete this question?')) return;
        try {
            const res = await axios.delete(`${API_URL}?unit=${selectedUnit}&id=${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.data.success) {
                toast.success('Question deleted');
                setQuestions(prev => prev.filter(q => q.id !== id));
            }
        } catch (error) {
            console.error(error);
            toast.error('Failed to delete question');
        }
    };

    const openModal = (question?: Question) => {
        if (question) {
            setEditingQuestion(question);
            setFormData({ ...question });
        } else {
            setEditingQuestion(null);
            setFormData({
                question_uid: `Q_${Date.now()}`,
                question_text: '',
                options: ['', '', '', ''],
                correct_option: 0,
                marks: 1,
                chapter: '',
                explanation: '',
                image_link: null
            });
        }
        setIsModalOpen(true);
    };

    const handleFormChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        if (name.startsWith('option_')) {
            const index = parseInt(name.split('_')[1]);
            const newOptions = [...(formData.options || [])];
            newOptions[index] = value;
            setFormData({ ...formData, options: newOptions });
        } else {
            setFormData({ ...formData, [name]: value });
        }
    };

    const handleImageUpload = async (e: ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setUploadingImage(true);
            const data = new FormData();
            data.append('image', file);
            data.append('customFileName', `qb_${Date.now()}_img.${file.name.split('.').pop()}`);

            try {
                const res = await axios.post(UPLOAD_API_URL, data, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (res.data.success) {
                    setFormData({ ...formData, image_link: res.data.url });
                    toast.success('Image uploaded');
                }
            } catch (error) {
                toast.error('Image upload failed');
            } finally {
                setUploadingImage(false);
            }
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        let unitToSave = selectedUnit;

        // Handle creating new unit on the fly if strictly typed new name (simplified logic here: usually just map existing)
        // If we want to support "Add New Unit", we might need to handle it.
        // For now, assume saving to selectedUnit.

        if (!unitToSave && !newUnitName) {
            toast.error('Please select a unit');
            return;
        }

        // Prepare table name if new unit
        if (newUnitName) {
            // Just pass the unit name, backend handles qb_ prefix logic
            unitToSave = newUnitName;
        }

        try {
            const payload = {
                ...formData,
                unit: unitToSave,
                id: editingQuestion?.id
            };

            const res = await axios.post(API_URL, payload, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (res.data.success) {
                toast.success(editingQuestion ? 'Question updated' : 'Question added');
                setIsModalOpen(false);
                setNewUnitName('');
                fetchUnits(); // Refresh units in case a new one was created
                if (selectedUnit === unitToSave || !selectedUnit) {
                    // Logic to switch to new unit or refresh current
                    if (newUnitName) setSelectedUnit('qb_' + newUnitName.toLowerCase().replace(/[^a-z0-9_]/g, ''));
                    else fetchQuestions();
                } else {
                    fetchQuestions();
                }
            }
        } catch (error: any) {
            console.error(error);
            toast.error(error.response?.data?.message || 'Failed to save question');
        }
    };

    const filteredQuestions = questions.filter(q =>
        q.question_text.toLowerCase().includes(searchTerm.toLowerCase()) ||
        q.question_uid.toLowerCase().includes(searchTerm.toLowerCase()) ||
        q.chapter?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <DashboardLayout>
            <div className="p-6 max-w-7xl mx-auto pb-20">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Question Bank</h1>
                        <p className="text-gray-500">Manage and edit your global question repository</p>
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={() => {
                                // Initialize config with 0 for all units
                                const initialConfig: Record<string, number> = {};
                                units.forEach(u => initialConfig[u.name] = 0);
                                setGeneratorConfig(initialConfig);
                                setIsGeneratorOpen(true);
                            }}
                            className="bg-purple-600 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-purple-700 shadow-lg shadow-purple-200 transition-all"
                        >
                            <Search size={18} /> Generate Random Set
                        </button>
                        <button
                            onClick={() => openModal()}
                            className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all"
                        >
                            <Plus size={18} /> Add Question
                        </button>
                    </div>
                </div>

                {/* Filters */}
                <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm mb-6 flex flex-col md:flex-row gap-4 items-center justify-between">
                    <div className="flex items-center gap-4 w-full md:w-auto">
                        <label className="font-bold text-gray-700 text-sm whitespace-nowrap">Select Unit:</label>
                        <select
                            value={selectedUnit}
                            onChange={(e) => setSelectedUnit(e.target.value)}
                            className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full md:w-64 p-2.5"
                        >
                            {units.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                        </select>

                        {/* Simple way to create new unit */}
                        <div className="relative group">
                            <span className="text-xs text-gray-400 cursor-help border-b border-dotted ml-2">Want to add new unit?</span>
                            <div className="absolute hidden group-hover:block bg-black text-white text-xs p-2 rounded z-10 w-48 -top-8 left-10">
                                Click "Add Question" and type a new Unit name in the modal.
                            </div>
                        </div>
                    </div>

                    <div className="relative w-full md:w-64">
                        <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                            <Search size={16} className="text-gray-400" />
                        </div>
                        <input
                            type="text"
                            className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full pl-10 p-2.5"
                            placeholder="Search questions..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                {/* Table */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                    {loading ? (
                        <div className="p-12 text-center text-gray-500">Loading questions...</div>
                    ) : questions.length === 0 ? (
                        <div className="p-12 text-center text-gray-500">No questions found in this unit.</div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left text-gray-500">
                                <thead className="text-xs text-gray-700 uppercase bg-gray-50 border-b">
                                    <tr>
                                        <th className="px-6 py-3">ID</th>
                                        <th className="px-6 py-3 w-1/2">Question</th>
                                        <th className="px-6 py-3">Chapter</th>
                                        <th className="px-6 py-3">Marks</th>
                                        <th className="px-6 py-3 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredQuestions.map((q) => (
                                        <tr key={q.id} className="bg-white border-b hover:bg-gray-50">
                                            <td className="px-6 py-4 font-bold text-gray-900">{q.question_uid}</td>
                                            <td className="px-6 py-4">
                                                <div className="line-clamp-2 max-h-16 overflow-hidden">
                                                    <LatexRenderer>{q.question_text}</LatexRenderer>
                                                </div>
                                                {q.image_link && <span className="text-[10px] text-blue-600 font-bold bg-blue-50 px-1.5 py-0.5 rounded mt-1 inline-block">Image</span>}
                                            </td>
                                            <td className="px-6 py-4">{q.chapter}</td>
                                            <td className="px-6 py-4">{q.marks}</td>
                                            <td className="px-6 py-4 text-right">
                                                <button onClick={() => openModal(q)} className="text-blue-600 hover:text-blue-900 font-bold mr-3"><Edit2 size={16} /></button>
                                                <button onClick={() => handleDelete(q.id)} className="text-red-600 hover:text-red-900 font-bold"><Trash2 size={16} /></button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl">
                        <form onSubmit={handleSubmit}>
                            <div className="p-6 border-b flex justify-between items-center sticky top-0 bg-white z-10 backdrop-blur-lg bg-white/90">
                                <h2 className="text-xl font-bold text-gray-900">
                                    {editingQuestion ? 'Edit Question' : 'Add New Question'}
                                </h2>
                                <button type="button" onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                                    <X size={24} />
                                </button>
                            </div>

                            <div className="p-6 space-y-6">
                                {/* Unit Selection for New Question */}
                                {!editingQuestion && (
                                    <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 mb-4">
                                        <label className="block text-sm font-bold text-blue-900 mb-1">Target Unit</label>
                                        <div className="flex gap-4">
                                            <select
                                                className="flex-1 border p-2 rounded-lg"
                                                value={selectedUnit}
                                                onChange={(e) => { setSelectedUnit(e.target.value); setNewUnitName(''); }}
                                                disabled={!!newUnitName}
                                            >
                                                <option value="">Select Existing Unit</option>
                                                {units.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                                            </select>
                                            <div className="flex items-center text-sm text-gray-500 font-bold">OR</div>
                                            <input
                                                type="text"
                                                placeholder="Create New Unit (e.g. Biology)"
                                                className="flex-1 border p-2 rounded-lg"
                                                value={newUnitName}
                                                onChange={(e) => setNewUnitName(e.target.value)}
                                            />
                                        </div>
                                    </div>
                                )}

                                <div className="grid grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-1">Unique ID</label>
                                        <input name="question_uid" value={formData.question_uid} onChange={(e: any) => setFormData({ ...formData, question_uid: e.target.value })} className="w-full border p-2 rounded-lg" required />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-1">Chapter</label>
                                        <input name="chapter" value={formData.chapter} onChange={(e: any) => setFormData({ ...formData, chapter: e.target.value })} className="w-full border p-2 rounded-lg" placeholder="e.g. WAVES" />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Question Text (LaTeX supported)</label>
                                    <textarea name="question_text" rows={3} value={formData.question_text} onChange={(e: any) => setFormData({ ...formData, question_text: e.target.value })} className="w-full border p-2 rounded-lg" required />
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Image</label>
                                    <div className="flex gap-4 items-center">
                                        <label className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg cursor-pointer font-bold text-sm flex items-center gap-2">
                                            <Upload size={16} />
                                            {uploadingImage ? 'Uploading...' : 'Upload Image'}
                                            <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
                                        </label>
                                        {formData.image_link && (
                                            <div className="flex items-center gap-2 bg-green-50 px-3 py-1 rounded border border-green-200">
                                                <span className="text-xs text-green-700 truncate max-w-[200px]">{formData.image_link}</span>
                                                <button type="button" onClick={() => setFormData({ ...formData, image_link: null })} className="text-red-500 font-bold ml-2">x</button>
                                            </div>
                                        )}
                                    </div>
                                    {formData.image_link && <img src={formData.image_link} className="mt-2 h-20 rounded border" />}
                                </div>

                                <div className="space-y-3">
                                    <label className="block text-sm font-bold text-gray-700">Options</label>
                                    {formData.options?.map((opt, i) => (
                                        <div key={i} className="flex gap-2 items-center">
                                            <span className="font-bold w-6">{String.fromCharCode(65 + i)}</span>
                                            <input
                                                name={`option_${i}`}
                                                value={opt}
                                                onChange={handleFormChange}
                                                className={`flex-1 border p-2 rounded-lg ${formData.correct_option === i ? 'border-green-500 ring-1 ring-green-500' : ''}`}
                                                placeholder={`Option ${i + 1}`}
                                                required
                                            />
                                            <input
                                                type="radio"
                                                name="correct_option"
                                                checked={formData.correct_option === i}
                                                onChange={() => setFormData({ ...formData, correct_option: i })}
                                                className="w-5 h-5 text-green-600 focus:ring-green-500"
                                            />
                                        </div>
                                    ))}
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Explanation</label>
                                    <textarea name="explanation" rows={2} value={formData.explanation} onChange={(e: any) => setFormData({ ...formData, explanation: e.target.value })} className="w-full border p-2 rounded-lg" />
                                </div>

                                <div className="flex items-center gap-4">
                                    <div className="w-1/3">
                                        <label className="block text-sm font-bold text-gray-700 mb-1">Marks</label>
                                        <input type="number" name="marks" value={formData.marks} onChange={(e: any) => setFormData({ ...formData, marks: parseFloat(e.target.value) })} className="w-full border p-2 rounded-lg" required step="0.5" />
                                    </div>
                                </div>

                            </div>

                            <div className="p-6 border-t bg-gray-50 rounded-b-2xl flex justify-end gap-3">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-2 text-gray-600 font-bold hover:bg-gray-200 rounded-lg">Cancel</button>
                                <button type="submit" disabled={loading} className="px-6 py-2 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 shadow-lg shadow-green-200">
                                    {loading ? 'Saving...' : 'Save Question'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            {/* Generator Modal */}
            {isGeneratorOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
                        <div className="p-6 border-b flex justify-between items-center bg-purple-50">
                            <h2 className="text-xl font-bold text-purple-900">Generate Random Set</h2>
                            <button onClick={() => setIsGeneratorOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={24} /></button>
                        </div>
                        <div className="p-6 max-h-[60vh] overflow-y-auto">
                            <p className="text-sm text-gray-600 mb-4">Enter the number of questions you want from each unit:</p>
                            <div className="space-y-3">
                                {units.map(unit => (
                                    <div key={unit.id} className="flex justify-between items-center bg-gray-50 p-3 rounded-lg border">
                                        <span className="font-bold text-gray-700">{unit.name}</span>
                                        <input
                                            type="number"
                                            min="0"
                                            className="w-20 p-2 border rounded-lg text-center font-bold text-purple-600 focus:ring-purple-500"
                                            value={generatorConfig[unit.name] || 0}
                                            onChange={(e) => setGeneratorConfig({
                                                ...generatorConfig,
                                                [unit.name]: parseInt(e.target.value) || 0
                                            })}
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="p-6 border-t bg-gray-50 flex justify-end gap-3">
                            <button onClick={() => setIsGeneratorOpen(false)} className="px-4 py-2 text-gray-600 font-bold hover:bg-gray-200 rounded-lg">Cancel</button>
                            <button
                                onClick={handleGenerateSet}
                                disabled={loading}
                                className="px-6 py-2 bg-purple-600 text-white font-bold rounded-lg hover:bg-purple-700 shadow-lg shadow-purple-200 flex items-center gap-2"
                            >
                                {loading && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>}
                                Generate Set
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Result JSON Modal */}
            {showGeneratedResult && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl w-full max-w-4xl shadow-2xl h-[80vh] flex flex-col">
                        <div className="p-6 border-b flex justify-between items-center bg-green-50">
                            <div className="flex items-center gap-3">
                                <h2 className="text-xl font-bold text-green-900">Set Generated Successfully</h2>
                                <span className="bg-green-200 text-green-800 text-xs px-2 py-1 rounded-full font-bold">Ready to Copy</span>
                            </div>
                            <button onClick={() => setShowGeneratedResult(false)} className="text-gray-400 hover:text-gray-600"><X size={24} /></button>
                        </div>
                        <div className="p-0 flex-1 relative">
                            <textarea
                                className="w-full h-full p-6 font-mono text-xs bg-gray-50 resize-none outline-none"
                                value={generatedJson}
                                readOnly
                            />
                            <button
                                onClick={copyToClipboard}
                                className="absolute top-4 right-4 bg-white border border-gray-200 shadow-lg px-4 py-2 rounded-lg text-sm font-bold text-blue-600 hover:bg-blue-50 flex items-center gap-2"
                            >
                                <Save size={16} /> Copy to Clipboard
                            </button>
                        </div>
                        <div className="p-4 border-t bg-white flex justify-end">
                            <button onClick={() => setShowGeneratedResult(false)} className="px-6 py-2 bg-gray-800 text-white font-bold rounded-lg hover:bg-gray-900">Close</button>
                        </div>
                    </div>
                </div>
            )}

        </DashboardLayout>
    );
}
