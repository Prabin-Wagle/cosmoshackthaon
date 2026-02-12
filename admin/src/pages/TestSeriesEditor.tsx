import { useState, useEffect, ChangeEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { ChevronLeft, Save, Sparkles, Upload, Check, Trash2, Edit2, AlertTriangle } from 'lucide-react';
import { DashboardLayout } from '../components/DashboardLayout';
import { useAuth } from '../context/AuthContext';
import { LatexRenderer } from '../components/LatexRenderer';
import toast from 'react-hot-toast';

const API_URL = 'https://notelibraryapp.com/api/admin/testSeries.php';
const COLLECTION_API_URL = 'https://notelibraryapp.com/api/admin/testSeriesCollection.php';
const UPLOAD_API_URL = 'https://notelibraryapp.com/api/admin/upload_question_image.php';
const SYNC_API_URL = 'https://notelibraryapp.com/api/admin/syncQuestionBank.php';
const OPENROUTER_API_KEY = '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';

const AI_MODELS = [
    { id: 'google/gemini-2.0-flash-exp:free', name: 'Google: Gemini 2.0 Flash Experimental' },
    { id: 'mistralai/devstral-2512:free', name: 'Mistral: Devstral 2 2512' },
    { id: 'amazon/nova-2-lite-v1:free', name: 'Amazon: Nova 2 Lite' },
    { id: 'qwen/qwen3-235b-a22b:free', name: 'Qwen: Qwen3 235B A22B' },
    { id: 'qwen/qwen3-coder:free', name: 'Qwen: Qwen3 Coder 480B A35B' },
    { id: 'qwen/qwen3-4b:free', name: 'Qwen: Qwen3 4B' },
    { id: 'meta-llama/llama-3.3-70b-instruct:free', name: 'Meta: Llama 3.3 70B Instruct' },
    { id: 'meta-llama/llama-3.2-3b-instruct:free', name: 'Meta: Llama 3.2 3B Instruct' },
    { id: 'nousresearch/hermes-3-llama-3.1-405b:free', name: 'Nous: Hermes 3 405B Instruct' },
    { id: 'google/gemma-3-27b-it:free', name: 'Google: Gemma 3 27B' },
    { id: 'google/gemma-3-12b-it:free', name: 'Google: Gemma 3 12B' },
    { id: 'google/gemma-3-4b-it:free', name: 'Google: Gemma 3 4B' },
    { id: 'google/gemma-3n-e4b-it:free', name: 'Google: Gemma 3n 4B' },
    { id: 'google/gemma-3n-e2b-it:free', name: 'Google: Gemma 3n 2B' },
    { id: 'mistralai/mistral-small-3.1-24b-instruct:free', name: 'Mistral: Mistral Small 3.1 24B' },
    { id: 'mistralai/mistral-7b-instruct:free', name: 'Mistral: Mistral 7B Instruct' },
    { id: 'moonshotai/kimi-k2:free', name: 'MoonshotAI: Kimi K2' },
    { id: 'cognitivecomputations/dolphin-mistral-24b-venice-edition:free', name: 'Venice: Uncensored' },
    { id: 'nvidia/nemotron-nano-12b-v2-vl:free', name: 'NVIDIA: Nemotron Nano 12B VL' },
    { id: 'nvidia/nemotron-nano-9b-v2:free', name: 'NVIDIA: Nemotron Nano 9B V2' },
    { id: 'alibaba/tongyi-deepresearch-30b-a3b:free', name: 'Tongyi DeepResearch 30B' },
    { id: 'meituan/longcat-flash-chat:free', name: 'Meituan: LongCat Flash Chat' },
    { id: 'openai/gpt-oss-120b:free', name: 'OpenAI: gpt-oss-120b' },
    { id: 'openai/gpt-oss-20b:free', name: 'OpenAI: gpt-oss-20b' },
    { id: 'z-ai/glm-4.5-air:free', name: 'Z.AI: GLM 4.5 Air' },
    { id: 'allenai/olmo-3-32b-think:free', name: 'AllenAI: Olmo 3 32B Think' },
    { id: 'kwaipilot/kat-coder-pro:free', name: 'Kwaipilot: KAT-Coder-Pro V1' },
    { id: 'arcee-ai/trinity-mini:free', name: 'Arcee AI: Trinity Mini' },
    { id: 'tngtech/tng-r1t-chimera:free', name: 'TNG: R1T Chimera' },
    { id: 'tngtech/deepseek-r1t-chimera:free', name: 'TNG: DeepSeek R1T Chimera' },
    { id: 'tngtech/deepseek-r1t2-chimera:free', name: 'TNG: DeepSeek R1T2 Chimera' },
];

interface TestSeriesCollection {
    id: number;
    title: string;
    competitive_exam: 'IOE' | 'CEE' | 'OTHER';
}

interface QuizQuestion {
    id?: string;
    questionId: string;
    questionNo: number | string;
    question: string;
    imageLink?: string | null;
    options: (string | number)[];
    correctOption: number;
    marks: number;
    unitId?: string | null;
    chapterId?: string | null;
    explanation?: string | null;
}

export default function TestSeriesEditor() {
    const { token } = useAuth();
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();
    const isEditing = !!id;

    const [collections, setCollections] = useState<TestSeriesCollection[]>([]);
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(isEditing);

    const [formData, setFormData] = useState({
        collection_id: 0,
        quiz_title: '',
        time_limit: 60,
        negative_marking: 0,
        mode: 'NORMAL' as 'LIVE' | 'NORMAL',
        start_time: '',
        end_time: ''
    });

    const [jsonInput, setJsonInput] = useState('');
    const [questions, setQuestions] = useState<QuizQuestion[]>([]);
    const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
    const [editedQuestionData, setEditedQuestionData] = useState<QuizQuestion | null>(null);
    const [uploadingImage, setUploadingImage] = useState(false);
    const [parseSuccess, setParseSuccess] = useState<string | null>(null);
    const [parseError, setParseError] = useState<string | null>(null);
    const [isValidated, setIsValidated] = useState(false);
    const [generatingAI, setGeneratingAI] = useState(false);
    const [syncingBank, setSyncingBank] = useState(false);
    const [selectedModel, setSelectedModel] = useState(AI_MODELS[0].id);

    useEffect(() => {
        fetchCollections();
        if (isEditing) {
            fetchTestData();
        }
    }, [id]);

    const fetchCollections = async () => {
        try {
            const response = await axios.get(COLLECTION_API_URL, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (response.data.success) {
                setCollections(response.data.data);
            }
        } catch (error) {
            console.error('Error fetching collections:', error);
            toast.error('Error fetching collections');
        }
    };

    const safeParseQuizJson = (jsonString: any): QuizQuestion[] => {
        if (!jsonString) return [];
        if (Array.isArray(jsonString)) return jsonString;
        try {
            if (typeof jsonString === 'string' && jsonString.trim().startsWith('[')) {
                return JSON.parse(jsonString);
            }
            const decoded = atob(jsonString);
            return JSON.parse(decoded);
        } catch (e) {
            console.error('Error parsing quiz JSON:', e);
            try { return JSON.parse(jsonString); } catch (e2) { return []; }
        }
    };

    const fetchTestData = async () => {
        setFetching(true);
        try {
            const response = await axios.get(`${API_URL}?id=${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (response.data.success) {
                const test = response.data.data[0];
                if (test) {
                    const parsedQuestions = safeParseQuizJson(test.quiz_json);
                    setFormData({
                        collection_id: test.collection_id,
                        quiz_title: test.quiz_title,
                        time_limit: test.time_limit,
                        negative_marking: test.negative_marking,
                        mode: test.mode,
                        start_time: test.start_time || '',
                        end_time: test.end_time || ''
                    });
                    setQuestions(parsedQuestions.map((q, i) => ({ ...q, id: `question-${Date.now()}-${i}` })));
                    setJsonInput(JSON.stringify(parsedQuestions, null, 2));
                }
            }
        } catch (error) {
            console.error('Error fetching test data:', error);
            toast.error('Error fetching test data');
        } finally {
            setFetching(false);
        }
    };

    const validateQuizJson = (jsonString: string): { valid: boolean; questions: QuizQuestion[]; error?: string } => {
        let parsed: any;
        try {
            const trimmed = jsonString.trim();
            if (!trimmed) return { valid: false, questions: [], error: 'Please enter JSON content' };

            try {
                parsed = JSON.parse(trimmed);
            } catch (e) {
                try {
                    parsed = JSON.parse(`[${trimmed}]`);
                } catch (e2) {
                    return { valid: false, questions: [], error: 'Invalid JSON syntax' };
                }
            }
        } catch (err) {
            return { valid: false, questions: [], error: 'Invalid JSON format' };
        }

        let questionsList: any[] = [];
        if (Array.isArray(parsed)) {
            questionsList = parsed;
        } else if (typeof parsed === 'object' && parsed !== null) {
            if (Array.isArray(parsed.questions)) {
                questionsList = parsed.questions;
            } else {
                questionsList = [parsed];
            }
        }

        if (!Array.isArray(questionsList) || questionsList.length === 0) {
            return { valid: false, questions: [], error: 'Could not find a list of questions in the provided JSON' };
        }

        const validatedQuestions: QuizQuestion[] = [];

        for (let i = 0; i < questionsList.length; i++) {
            const q = questionsList[i];
            const qNum = q.questionNo ?? (i + 1);

            // Support both 'questionText' and 'question' fields
            const questionText = q.questionText || q.question;

            if (!questionText || typeof questionText !== 'string') {
                return { valid: false, questions: [], error: `Question ${qNum}: 'question' field is missing or not a string.` };
            }

            // Validate options array
            if (!Array.isArray(q.options) || !q.options.every((opt: any) => typeof opt === 'string' || typeof opt === 'number')) {
                return { valid: false, questions: [], error: `Question ${qNum}: 'options' must be an array of strings or numbers.` };
            }
            if (q.options.length < 2) {
                return { valid: false, questions: [], error: `Question ${qNum}: Must have at least 2 options.` };
            }

            // Validate correctOption
            if (typeof q.correctOption !== 'number') {
                return { valid: false, questions: [], error: `Question ${qNum}: 'correctOption' must be a number (0-based index).` };
            }
            if (q.correctOption < 0 || q.correctOption >= q.options.length) {
                return { valid: false, questions: [], error: `Question ${qNum}: 'correctOption' ${q.correctOption} is out of bounds (0-${q.options.length - 1}).` };
            }

            // Validate imageLink - accept null, undefined, or valid HTTPS URL string
            let normalizedImageLink: string | null = null;
            if (q.imageLink !== null && q.imageLink !== undefined && q.imageLink !== '') {
                if (typeof q.imageLink !== 'string') {
                    return { valid: false, questions: [], error: `Question ${qNum}: 'imageLink' must be a string URL or null.` };
                }
                // Validate that it's a proper HTTPS URL (or HTTP for local dev)
                const urlPattern = /^https?:\/\/.+/i;
                if (!urlPattern.test(q.imageLink)) {
                    return { valid: false, questions: [], error: `Question ${qNum}: 'imageLink' must be a valid HTTP/HTTPS URL.` };
                }
                normalizedImageLink = q.imageLink;
            }

            // Validate marks if present
            if (q.marks !== undefined && q.marks !== null && typeof q.marks !== 'number') {
                return { valid: false, questions: [], error: `Question ${qNum}: 'marks' must be a number.` };
            }

            // Validate explanation if present (string or null allowed)
            if (q.explanation !== undefined && q.explanation !== null && typeof q.explanation !== 'string') {
                return { valid: false, questions: [], error: `Question ${qNum}: 'explanation' must be a string or null.` };
            }

            // Validate unitId if present (string or null allowed)
            if (q.unitId !== undefined && q.unitId !== null && typeof q.unitId !== 'string') {
                return { valid: false, questions: [], error: `Question ${qNum}: 'unitId' must be a string or null.` };
            }

            // Validate chapterId if present (string or null allowed)
            if (q.chapterId !== undefined && q.chapterId !== null && typeof q.chapterId !== 'string') {
                return { valid: false, questions: [], error: `Question ${qNum}: 'chapterId' must be a string or null.` };
            }

            // Build validated question with all required fields, defaulting missing optional fields to null
            validatedQuestions.push({
                id: `question-${Date.now()}-${i}`,
                questionId: q.questionId || `QID_${Date.now()}_${i}`,
                questionNo: qNum,
                question: questionText,
                imageLink: normalizedImageLink,
                options: q.options.map((opt: any) => String(opt)), // Normalize all options to strings
                correctOption: q.correctOption,
                marks: typeof q.marks === 'number' ? q.marks : 1,
                unitId: typeof q.unitId === 'string' ? q.unitId : null,
                chapterId: typeof q.chapterId === 'string' ? q.chapterId : null,
                explanation: typeof q.explanation === 'string' ? q.explanation : null
            });
        }

        return { valid: true, questions: validatedQuestions };
    };

    const handleCheckQuestions = () => {
        setParseError(null);
        setParseSuccess(null);
        const result = validateQuizJson(jsonInput);
        if (result.valid) {
            // Track what fields were added/normalized
            const addedFields: string[] = [];
            let parsed: any;
            try {
                parsed = JSON.parse(jsonInput.trim());
                if (!Array.isArray(parsed)) {
                    parsed = parsed.questions || [parsed];
                }
            } catch {
                parsed = [];
            }

            // Check what fields were missing in original JSON
            if (Array.isArray(parsed) && parsed.length > 0) {
                const sample = parsed[0];
                if (!('imageLink' in sample)) addedFields.push('imageLink');
                if (!('unitId' in sample)) addedFields.push('unitId');
                if (!('chapterId' in sample)) addedFields.push('chapterId');
                if (!('explanation' in sample)) addedFields.push('explanation');
                if (!('questionId' in sample)) addedFields.push('questionId');
            }

            // Update the JSON input with the corrected/normalized JSON (without the internal 'id' field)
            const correctedJson = result.questions.map(({ id, ...rest }) => rest);
            setJsonInput(JSON.stringify(correctedJson, null, 2));

            // Build success message
            let successMsg = `✓ JSON Valid: ${result.questions.length} questions found. Ready to parse.`;
            if (addedFields.length > 0) {
                successMsg += ` Added missing fields: ${addedFields.join(', ')} (set to null where needed).`;
            }

            setParseSuccess(successMsg);
            setIsValidated(true);
        } else {
            setParseError(result.error || 'Invalid JSON');
            setIsValidated(false);
        }
    };

    const parseQuestions = () => {
        setParseError(null);
        setParseSuccess(null);
        const result = validateQuizJson(jsonInput);
        if (result.valid) {
            setQuestions(result.questions);
            // Update the JSON input with the corrected/normalized JSON (without the internal 'id' field)
            const correctedJson = result.questions.map(({ id, ...rest }) => rest);
            setJsonInput(JSON.stringify(correctedJson, null, 2));
            setParseSuccess(`Successfully loaded ${result.questions.length} questions. JSON has been normalized.`);
        } else {
            setParseError(result.error || 'Invalid JSON');
        }
    };


    const handleSyncToBank = async () => {
        if (!questions || questions.length === 0) {
            toast.error('No questions to sync. Please parse JSON first.');
            return;
        }

        const confirmSync = window.confirm('This will upload all questions to the global Question Bank. Duplicates will be updated. Continue?');
        if (!confirmSync) return;

        setSyncingBank(true);
        try {
            // Remove internal IDs before sending
            const questionsForApi = questions.map(({ id, ...rest }) => rest);

            const response = await axios.post(SYNC_API_URL, {
                questions: questionsForApi
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (response.data.success) {
                const { inserted, updated, unchanged } = response.data.stats || { inserted: 0, updated: 0, unchanged: 0 };
                toast.success(`Upload Complete: ${inserted} New, ${updated} Updated, ${unchanged} Unchanged`, { duration: 5000 });
            } else {
                toast.error(response.data.message || 'Failed to sync');
            }
        } catch (error: any) {
            console.error('Error syncing to bank:', error);
            toast.error(error.response?.data?.message || 'Error syncing to bank');
        } finally {
            setSyncingBank(false);
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;

        if (name === 'collection_id') {
            const selectedId = parseInt(value);
            const selectedCol = collections.find(c => Number(c.id) === selectedId);

            let newTimeLimit = 60;
            let newNegativeMarking = 0;

            if (selectedCol) {
                const exam = selectedCol.competitive_exam?.toUpperCase();
                if (exam === 'CEE') {
                    newTimeLimit = 180;
                    newNegativeMarking = 0.25;
                } else if (exam === 'IOE') {
                    newTimeLimit = 120;
                    newNegativeMarking = 0.10;
                }
            }

            setFormData(prev => ({
                ...prev,
                collection_id: selectedId,
                time_limit: newTimeLimit,
                negative_marking: newNegativeMarking
            }));

        } else {
            setFormData(prev => ({
                ...prev,
                [name]: name === 'time_limit' ? (value === '' ? 0 : parseInt(value)) :
                    name === 'negative_marking' ? (value === '' ? 0 : parseFloat(value)) : value
            }));
        }
    };

    const handleEditQuestion = (question: QuizQuestion) => {
        setEditingQuestionId(question.id || null);
        setEditedQuestionData({ ...question });
    };

    const handleQuestionChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        if (editedQuestionData) {
            const { name, value } = e.target;

            if (name.startsWith("option-")) {
                const optionIndex = parseInt(name.split("-")[1], 10);
                const newOptions = [...editedQuestionData.options];
                newOptions[optionIndex] = value;
                setEditedQuestionData({ ...editedQuestionData, options: newOptions });
            } else {
                setEditedQuestionData({
                    ...editedQuestionData,
                    [name]: name === 'correctOption' ? parseInt(value, 10) :
                        name === 'marks' ? (value === '' ? 0 : parseFloat(value)) : value,
                });
            }
        }
    };

    const handleSaveQuestion = () => {
        if (editedQuestionData) {
            const updatedQuestions = questions.map(q =>
                q.id === editedQuestionData.id ? editedQuestionData : q
            );
            setQuestions(updatedQuestions);

            // Sync with JSON input
            const questionsForJson = updatedQuestions.map(({ id, ...rest }) => rest);
            setJsonInput(JSON.stringify(questionsForJson, null, 2));

            setEditingQuestionId(null);
            setEditedQuestionData(null);
        }
    };

    const handleImageSelect = async (e: ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0] && editedQuestionData) {
            const file = e.target.files[0];
            setUploadingImage(true);

            // Create custom filename: quizid_questionno_image format
            const ext = file.name.split('.').pop() || 'jpg';
            const quizPrefix = id || 'new';
            const customFileName = `${quizPrefix}_${editedQuestionData.questionNo}_image.${ext}`;

            const formDataUpload = new FormData();
            formDataUpload.append('image', file);
            formDataUpload.append('customFileName', customFileName);

            try {
                const response = await fetch(UPLOAD_API_URL, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}` },
                    body: formDataUpload
                });

                const result = await response.json();
                if (result.success) {
                    setEditedQuestionData({
                        ...editedQuestionData,
                        imageLink: result.url
                    });
                    toast.success('Image uploaded successfully');
                } else {
                    toast.error('Upload failed: ' + result.message);
                }
            } catch (error) {
                console.error('Error uploading image:', error);
                toast.error('Error uploading image');
            } finally {
                setUploadingImage(false);
            }
        }
    };

    const generateExplanationWithAI = async () => {
        if (!editedQuestionData) return;

        setGeneratingAI(true);
        try {
            const correctAnswer = editedQuestionData.options[editedQuestionData.correctOption];
            const prompt = `You are an educational assistant. Generate a clear, concise explanation (2-3 sentences) for why the following answer is correct for a competitive exam question.

Question: ${editedQuestionData.question}

Options:
${editedQuestionData.options.map((opt, i) => `${i + 1}. ${opt}`).join('\n')}

Correct Answer: ${correctAnswer}

Provide only the explanation, no extra text or formatting.`;

            const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
                    'HTTP-Referer': window.location.origin,
                    'X-Title': 'Note Library Quiz Manager'
                },
                body: JSON.stringify({
                    model: selectedModel,
                    messages: [{ role: 'user', content: prompt }]
                })
            });

            const data = await response.json();
            const explanation = data.choices?.[0]?.message?.content || '';

            if (explanation) {
                setEditedQuestionData(prev => prev ? { ...prev, explanation: explanation.trim() } : null);
                toast.success('Explanation generated successfully');
            } else {
                toast.error('Failed to generate explanation. Please try again.');
            }
        } catch (error) {
            console.error('Error generating explanation:', error);
            toast.error('Error generating explanation with AI');
        } finally {
            setGeneratingAI(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (editingQuestionId) {
            toast.error('Please save the question you are currently editing first');
            return;
        }
        if (formData.collection_id === 0) {
            toast.error('Please select a collection');
            return;
        }
        if (questions.length === 0) {
            toast.error('Please add at least one question');
            return;
        }

        setLoading(true);

        const questionsForApi = questions.map(({ id, ...rest }) => rest);

        const payload = {
            collection_id: formData.collection_id,
            quiz_title: formData.quiz_title,
            time_limit: formData.time_limit,
            negative_marking: formData.negative_marking,
            mode: formData.mode,
            start_time: formData.mode === 'LIVE' ? formData.start_time : null,
            end_time: formData.mode === 'LIVE' ? formData.end_time : null,
            quiz_json: questionsForApi
        };

        try {
            if (isEditing) {
                await axios.put(API_URL, { ...payload, id: id }, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                toast.success('Test series updated successfully');
            } else {
                await axios.post(API_URL, payload, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                toast.success('Test series created successfully');
            }
            navigate('/test-series');
        } catch (error: any) {
            console.error('Error saving test series:', error);
            toast.error(error.response?.data?.message || 'Error saving test series');
        } finally {
            setLoading(false);
        }
    };

    if (fetching) {
        return (
            <DashboardLayout>
                <div className="flex items-center justify-center min-h-[60vh]">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <div className="p-6 max-w-[95%] mx-auto pb-32">
                {/* Header Section */}
                <div className="flex items-center gap-4 mb-6">
                    <button
                        onClick={() => navigate('/test-series')}
                        className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                    >
                        <ChevronLeft size={24} className="text-gray-600" />
                    </button>
                    <h1 className="text-3xl font-bold text-gray-900">
                        {isEditing ? 'Edit Test Series' : 'Create Test Series'}
                    </h1>
                </div>

                <form onSubmit={handleSubmit} className="space-y-8">
                    {/* General Information Section */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-6">
                        <h2 className="text-xl font-bold text-gray-900 border-b pb-3">General Information</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Collection *</label>
                                <select
                                    name="collection_id"
                                    value={formData.collection_id}
                                    onChange={handleInputChange}
                                    required
                                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                                >
                                    <option value={0}>Select a collection</option>
                                    {collections.map(col => (
                                        <option key={col.id} value={col.id}>{col.title} ({col.competitive_exam})</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                                <input
                                    type="text"
                                    name="quiz_title"
                                    value={formData.quiz_title}
                                    onChange={handleInputChange}
                                    required
                                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                                    placeholder="e.g. Weekly Mock Test 01"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Time Limit (minutes) *</label>
                                <input
                                    type="number"
                                    name="time_limit"
                                    value={formData.time_limit}
                                    onChange={handleInputChange}
                                    required
                                    min="1"
                                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Negative Marking: {(formData.negative_marking || 0).toFixed(2)}
                                </label>
                                <input
                                    type="range"
                                    name="negative_marking"
                                    value={formData.negative_marking || 0}
                                    onChange={handleInputChange}
                                    min="0"
                                    max="0.5"
                                    step="0.05"
                                    className="w-full mt-3 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                                />
                            </div>
                        </div>

                        <div className="bg-gray-50 p-6 rounded-xl border border-gray-100">
                            <label className="block text-sm font-medium text-gray-700 mb-4">Test Mode</label>
                            <div className="flex gap-8 mb-6">
                                <label className="flex items-center gap-3 cursor-pointer group">
                                    <div className="relative flex items-center">
                                        <input
                                            type="radio"
                                            name="mode"
                                            value="NORMAL"
                                            checked={formData.mode === 'NORMAL'}
                                            onChange={handleInputChange}
                                            className="w-5 h-5 text-blue-600 border-gray-300 focus:ring-blue-500"
                                        />
                                    </div>
                                    <div>
                                        <span className="font-bold text-gray-900 group-hover:text-blue-600 transition-colors">Normal</span>
                                        <p className="text-xs text-gray-500">Available to students anytime</p>
                                    </div>
                                </label>
                                <label className="flex items-center gap-3 cursor-pointer group">
                                    <div className="relative flex items-center">
                                        <input
                                            type="radio"
                                            name="mode"
                                            value="LIVE"
                                            checked={formData.mode === 'LIVE'}
                                            onChange={handleInputChange}
                                            className="w-5 h-5 text-blue-600 border-gray-300 focus:ring-blue-500"
                                        />
                                    </div>
                                    <div>
                                        <span className="font-bold text-gray-900 group-hover:text-blue-600 transition-colors">Live</span>
                                        <p className="text-xs text-gray-500">Scheduled for a specific window</p>
                                    </div>
                                </label>
                            </div>

                            {formData.mode === 'LIVE' && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-top-2 duration-300">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Start Time *</label>
                                        <input
                                            type="datetime-local"
                                            name="start_time"
                                            value={formData.start_time}
                                            onChange={handleInputChange}
                                            required={formData.mode === 'LIVE'}
                                            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">End Time *</label>
                                        <input
                                            type="datetime-local"
                                            name="end_time"
                                            value={formData.end_time}
                                            onChange={handleInputChange}
                                            required={formData.mode === 'LIVE'}
                                            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-6">
                        <div className="flex justify-between items-center border-b pb-3">
                            <h2 className="text-xl font-bold text-gray-900">Questions Management</h2>
                            <div className="flex gap-3">
                                <button
                                    type="button"
                                    onClick={handleCheckQuestions}
                                    className="px-4 py-2 bg-yellow-50 border border-yellow-200 text-yellow-700 rounded-lg hover:bg-yellow-100 transition-colors text-sm font-bold flex items-center gap-2"
                                >
                                    <Check size={16} />
                                    Check JSON
                                </button>
                                <button
                                    type="button"
                                    onClick={parseQuestions}
                                    disabled={!isValidated}
                                    className={`px-4 py-2 rounded-lg transition-all text-sm font-bold flex items-center gap-2 ${isValidated ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-200' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}
                                >
                                    <Save size={16} />
                                    Parse Questions
                                </button>
                                <button
                                    type="button"
                                    onClick={handleSyncToBank}
                                    disabled={questions.length === 0 || syncingBank}
                                    className="px-4 py-2 bg-indigo-50 border border-indigo-200 text-indigo-700 rounded-lg hover:bg-indigo-100 transition-colors text-sm font-bold flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <Sparkles size={16} />
                                    {syncingBank ? 'Uploading...' : 'Upload to Bank'}
                                </button>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Import JSON Data</label>
                            <textarea
                                className="w-full h-[500px] p-4 border border-gray-300 rounded-xl font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-gray-50"
                                value={jsonInput}
                                onChange={(e) => { setJsonInput(e.target.value); setIsValidated(false); }}
                                placeholder={`[
  {
    "questionId": "CEE_BOT_00123",
    "questionNo": 1,
    "questionText": "Question text here...",
    "options": ["Option 1", "Option 2", "Option 3", "Option 4"],
    "correctOption": 0,
    "marks": 1,
    "unitId": "UNIT_1",
    "chapterId": "CH_1",
    "explanation": "Explanation here..."
  }
]`}
                            />
                        </div>

                        {(parseSuccess || parseError) && (
                            <div className={`p-4 rounded-lg flex items-start gap-3 border ${parseSuccess ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
                                {parseSuccess ? <Check size={20} className="shrink-0" /> : <AlertTriangle size={20} className="shrink-0" />}
                                <p className="text-sm font-medium">{parseSuccess || parseError}</p>
                            </div>
                        )}

                        {questions.length > 0 && (
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <h3 className="font-bold text-gray-900">{questions.length} Questions Loaded</h3>
                                    <button
                                        type="button"
                                        onClick={() => { if (confirm('Clear all questions?')) setQuestions([]); }}
                                        className="text-red-600 hover:text-red-700 text-sm font-bold flex items-center gap-1"
                                    >
                                        <Trash2 size={14} />
                                        Clear All
                                    </button>
                                </div>
                                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                                    {questions.map((question) => (
                                        <div key={question.id} className="bg-white border border-gray-200 rounded-xl p-5 hover:border-blue-300 transition-colors shadow-sm">
                                            {editingQuestionId === question.id && editedQuestionData ? (
                                                <div className="space-y-4">
                                                    <div className="grid grid-cols-2 gap-4">
                                                        <div>
                                                            <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-1">Question ID</label>
                                                            <input
                                                                type="text"
                                                                name="questionId"
                                                                value={editedQuestionData.questionId}
                                                                onChange={handleQuestionChange}
                                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-gray-50"
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-1">Question No</label>
                                                            <input
                                                                type="text"
                                                                name="questionNo"
                                                                value={editedQuestionData.questionNo}
                                                                onChange={handleQuestionChange}
                                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-gray-50"
                                                            />
                                                        </div>
                                                    </div>

                                                    <div>
                                                        <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-1 text-blue-600">Question Text (LaTeX Support)</label>
                                                        <textarea
                                                            name="question"
                                                            value={editedQuestionData.question}
                                                            onChange={handleQuestionChange}
                                                            rows={3}
                                                            className="w-full px-3 py-2 border border-blue-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                                                        />
                                                    </div>

                                                    <div className="grid grid-cols-2 gap-4">
                                                        <div>
                                                            <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-1">Unit ID</label>
                                                            <input
                                                                type="text"
                                                                name="unitId"
                                                                value={editedQuestionData.unitId || ''}
                                                                onChange={handleQuestionChange}
                                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-1">Chapter ID</label>
                                                            <input
                                                                type="text"
                                                                name="chapterId"
                                                                value={editedQuestionData.chapterId || ''}
                                                                onChange={handleQuestionChange}
                                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                                            />
                                                        </div>
                                                    </div>

                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                        <div className="space-y-3">
                                                            <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-1">Options</label>
                                                            {editedQuestionData.options.map((opt, i) => (
                                                                <div key={i} className="flex gap-2">
                                                                    <div className={`w-10 h-10 flex items-center justify-center rounded-lg font-bold shrink-0 ${editedQuestionData.correctOption === i ? 'bg-green-100 text-green-700 border-green-200' : 'bg-gray-100 text-gray-500 border-gray-200'}`}>
                                                                        {String.fromCharCode(65 + i)}
                                                                    </div>
                                                                    <input
                                                                        type="text"
                                                                        name={`option-${i}`}
                                                                        value={opt}
                                                                        onChange={handleQuestionChange}
                                                                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                                                        placeholder={`Option ${i + 1}`}
                                                                    />
                                                                </div>
                                                            ))}
                                                        </div>

                                                        <div className="space-y-4">
                                                            <div>
                                                                <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-1">Correct Identity</label>
                                                                <select
                                                                    name="correctOption"
                                                                    value={editedQuestionData.correctOption}
                                                                    onChange={handleQuestionChange}
                                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
                                                                >
                                                                    {editedQuestionData.options.map((_, i) => (
                                                                        <option key={i} value={i}>Option {String.fromCharCode(65 + i)} is correct</option>
                                                                    ))}
                                                                </select>
                                                            </div>

                                                            <div>
                                                                <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-1">Marks per Question</label>
                                                                <input
                                                                    type="number"
                                                                    name="marks"
                                                                    value={editedQuestionData.marks}
                                                                    onChange={handleQuestionChange}
                                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                                                />
                                                            </div>

                                                            <div>
                                                                <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-1">Question Image</label>
                                                                <div className="flex items-center gap-3">
                                                                    <label className="cursor-pointer bg-blue-50 text-blue-600 px-4 py-2 rounded-lg text-xs font-bold hover:bg-blue-100 transition-colors flex items-center gap-2 border border-blue-200">
                                                                        <Upload size={14} />
                                                                        {uploadingImage ? 'Uploading...' : 'Upload Image'}
                                                                        <input type="file" accept="image/*" onChange={handleImageSelect} className="hidden" />
                                                                    </label>
                                                                    {editedQuestionData.imageLink && (
                                                                        <button type="button" onClick={() => setEditedQuestionData({ ...editedQuestionData, imageLink: null })} className="text-red-500 hover:text-red-600 text-[10px] font-bold">Remove</button>
                                                                    )}
                                                                </div>
                                                                {editedQuestionData.imageLink && (
                                                                    <img src={editedQuestionData.imageLink} alt="" className="mt-2 max-h-24 rounded-lg shadow-sm border p-1 bg-white" />
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="bg-purple-50 p-4 rounded-xl border border-purple-100">
                                                        <label className="block text-xs font-black text-purple-700 uppercase tracking-widest mb-2 flex items-center gap-2">
                                                            <Sparkles size={14} />
                                                            Explanation & AI Generator
                                                        </label>
                                                        <textarea
                                                            name="explanation"
                                                            value={editedQuestionData.explanation || ''}
                                                            onChange={handleQuestionChange}
                                                            rows={3}
                                                            className="w-full px-3 py-2 border border-purple-200 rounded-lg text-sm mb-3 focus:ring-2 focus:ring-purple-500 outline-none"
                                                            placeholder="Why is this answer correct? Use AI to generate if needed..."
                                                        />
                                                        <div className="flex gap-3">
                                                            <select
                                                                value={selectedModel}
                                                                onChange={(e) => setSelectedModel(e.target.value)}
                                                                className="flex-1 px-3 py-2 border border-purple-200 rounded-lg text-xs bg-white"
                                                            >
                                                                {AI_MODELS.map(model => (
                                                                    <option key={model.id} value={model.id}>{model.name}</option>
                                                                ))}
                                                            </select>
                                                            <button
                                                                type="button"
                                                                onClick={generateExplanationWithAI}
                                                                disabled={generatingAI}
                                                                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 flex items-center gap-2 text-xs font-bold transition-all shadow-lg shadow-purple-200"
                                                            >
                                                                <Sparkles size={14} />
                                                                {generatingAI ? 'Generating...' : 'AI Generate'}
                                                            </button>
                                                        </div>
                                                    </div>

                                                    <div className="flex justify-end gap-3 pt-4 border-t">
                                                        <button type="button" onClick={() => { setEditingQuestionId(null); setEditedQuestionData(null); }} className="px-6 py-2 text-gray-500 hover:text-gray-700 text-sm font-bold transition-colors">Cancel</button>
                                                        <button type="button" onClick={handleSaveQuestion} className="px-8 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-bold shadow-lg shadow-green-100 transition-all">Save Changes</button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="group/item">
                                                    <div className="flex justify-between items-start mb-4">
                                                        <div className="flex items-center gap-3">
                                                            <span className="w-10 h-10 flex items-center justify-center bg-gray-900 text-white rounded-lg font-black text-sm">#{question.questionNo}</span>
                                                            <div className="text-[10px] font-black uppercase tracking-widest text-gray-400">ID: {question.questionId}</div>
                                                        </div>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleEditQuestion(question)}
                                                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors flex items-center gap-2 text-xs font-bold"
                                                        >
                                                            <Edit2 size={14} />
                                                            Quick Edit
                                                        </button>
                                                    </div>
                                                    <div className="text-lg font-bold text-gray-900 mb-6 leading-relaxed bg-gray-50 p-4 rounded-xl border border-gray-100 italic">
                                                        <LatexRenderer>{question.question}</LatexRenderer>
                                                    </div>
                                                    {question.imageLink && (
                                                        <div className="mb-6 rounded-xl overflow-hidden shadow-md max-w-sm border-4 border-white ring-1 ring-gray-100">
                                                            <img src={question.imageLink} alt="" className="w-full" />
                                                        </div>
                                                    )}
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                        {question.options.map((opt, i) => (
                                                            <div key={i} className={`flex items-center gap-4 p-4 rounded-xl border transition-all ${i === question.correctOption ? 'bg-green-50 border-green-200' : 'bg-white border-gray-100'}`}>
                                                                <div className={`w-9 h-9 flex items-center justify-center rounded-lg font-black text-sm ${i === question.correctOption ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-500'}`}>
                                                                    {String.fromCharCode(65 + i)}
                                                                </div>
                                                                <div className={`text-sm font-bold ${i === question.correctOption ? 'text-green-800' : 'text-gray-700'}`}>
                                                                    <LatexRenderer>{opt}</LatexRenderer>
                                                                </div>
                                                                {i === question.correctOption && <Check className="ml-auto text-green-600" size={18} />}
                                                            </div>
                                                        ))}
                                                    </div>
                                                    {question.explanation && (
                                                        <div className="mt-6 p-4 bg-yellow-50 rounded-xl border border-yellow-100">
                                                            <span className="text-[9px] font-black text-yellow-700 uppercase tracking-[.2em] mb-2 block">Correct Reasoning</span>
                                                            <p className="text-sm text-yellow-950 italic font-medium leading-relaxed">{question.explanation}</p>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="fixed bottom-0 left-64 right-0 bg-white/95 backdrop-blur-md p-4 border-t border-gray-200 shadow-2xl shadow-blue-900/10 flex justify-end gap-4 z-40">
                        <button
                            type="button"
                            onClick={() => navigate('/test-series')}
                            className="px-8 py-3.5 text-gray-600 hover:bg-gray-100 rounded-xl font-bold transition-all"
                        >
                            Discard Changes
                        </button>
                        <button
                            type="submit"
                            disabled={loading || formData.collection_id === 0 || questions.length === 0}
                            className="px-12 py-3.5 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-xl shadow-blue-500/20 active:scale-95 flex items-center gap-3"
                        >
                            {loading ? (
                                <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div> Saving...</>
                            ) : (
                                <><Save size={20} /> {isEditing ? 'Update Test Series' : 'Publish Test Series'}</>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </DashboardLayout>
    );
}
