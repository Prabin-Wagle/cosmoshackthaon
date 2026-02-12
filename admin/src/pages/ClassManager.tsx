import { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { Plus, Trash2, RefreshCw, X, FolderPlus, Layers, Edit2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { DashboardLayout } from '../components/DashboardLayout';

const API_URL = 'https://notelibraryapp.com/api/admin/classTable.php';

interface TableInfo {
    table: string;
    class: string;
    faculty: string;
}

interface Subject {
    id: number;
    subject_name: string;
    units?: string; // Stored as JSON string
    has_units?: number; // 1 for yes, 0 for no
}

interface CompetitiveExam {
    id: number;
    exam_name: string;
}

export default function ClassManager() {
    const { token } = useAuth();
    const [tables, setTables] = useState<TableInfo[]>([]);
    const [exams, setExams] = useState<CompetitiveExam[]>([]);
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);

    // Create Class Form
    const [newClass, setNewClass] = useState('');
    const [newFaculty, setNewFaculty] = useState('');

    // Selected Class for Subjects
    const [selectedTable, setSelectedTable] = useState<TableInfo | null>(null);
    const [tableSubjects, setTableSubjects] = useState<Subject[]>([]);
    const [newSubject, setNewSubject] = useState('');
    const [expandedSubjectId, setExpandedSubjectId] = useState<number | null>(null);
    const [newUnit, setNewUnit] = useState('');
    const [editingUnitIndex, setEditingUnitIndex] = useState<number | null>(null);
    const [editingUnitValue, setEditingUnitValue] = useState('');
    const [enableUnitsForNewSubject, setEnableUnitsForNewSubject] = useState(true);
    const [updatingUnits, setUpdatingUnits] = useState<number | null>(null);

    // Competitive Exam Form
    const [newExam, setNewExam] = useState('');
    const [examError, setExamError] = useState('');

    useEffect(() => {
        fetchInitialData();
    }, [token]);

    const fetchInitialData = async () => {
        if (!token) return;
        setLoading(true);
        try {
            await Promise.all([fetchTables(), fetchExams()]);
        } finally {
            setLoading(false);
        }
    };

    const fetchTables = async () => {
        try {
            const response = await axios.get(API_URL, {
                params: { action: 'list_tables' },
                headers: { Authorization: `Bearer ${token}` }
            });
            if (response.data.success) {
                // Parse table names to class/faculty
                // Assuming format: classX_facultyname or classX_none
                const parsedTables = response.data.tables.map((t: string) => {
                    const parts = t.split('_');
                    // Simple heuristic: Part 0 is class, rest is faculty
                    // Need to match backend logic for cleaner display if possible
                    let className = parts[0];
                    if (className.toLowerCase().startsWith('class')) {
                        className = 'Class ' + className.substring(5);
                    } else {
                        className = className.charAt(0).toUpperCase() + className.slice(1);
                    }

                    const facultyName = parts.slice(1).join(' ') || 'None';
                    return { table: t, class: className, faculty: facultyName.charAt(0).toUpperCase() + facultyName.slice(1) };
                }).filter((t: TableInfo) => t.table.startsWith('class')); // Filter to show only class tables if mixed DB
                setTables(parsedTables);
            }
        } catch (error) {
            console.error('Failed to fetch tables', error);
        }
    };

    const fetchExams = async () => {
        try {
            // Using subjects.php for exams list as classTable.php GET action=exams wasn't explicit, 
            // but checking the file content: classTable.php DOES NOT handle 'exams' action in GET for reading list (it has list_tables).
            // Actually, subjects.php has action=exams. Let's try to check classTable.php again. 
            // Wait, classTable.php doesn't have GET action='exams'.
            // However, it has POST action='add_exam' and 'delete_exam'.
            // We need to fetch exams. Using subjects.php for fetching seems safer or I can rely on GlobalData if I had access, but let's fetch fresh.
            // Let's assume we can use subjects.php for fetching or update classTable.php.
            // For now, I'll validly use `subjects.php?action=exams`.
            const response = await axios.get('https://notelibraryapp.com/api/admin/subjects.php', {
                params: { action: 'exams' },
                headers: { Authorization: `Bearer ${token}` }
            });
            if (response.data.success) {
                setExams(response.data.exams);
                setExamError('');
            }
        } catch (error) {
            console.error('Failed to fetch exams', error);
            setExamError('Network error. Please try again.');
        }
    };

    const fetchSubjects = async (table: string) => {
        try {


            // Let's retry with subjects.php which supports raw table name
            const subResponse = await axios.get('https://notelibraryapp.com/api/admin/subjects.php', {
                params: { action: 'subjects', table: table },
                headers: { Authorization: `Bearer ${token}` }
            });

            if (subResponse.data.success) {
                setTableSubjects(subResponse.data.subjects);
            }
        } catch (error) {
            console.error('Failed to fetch subjects', error);
        }
    };

    // --- Actions ---

    const handleAddClass = async () => {
        if (!newClass) return;
        try {
            await axios.post(API_URL, {
                action: 'create_table',
                class_name: newClass,
                faculty_name: newFaculty || 'none'
            }, { headers: { Authorization: `Bearer ${token}` } });

            setNewClass('');
            setNewFaculty('');
            fetchTables();
            toast.success('Class created successfully');
        } catch (error) {
            toast.error('Failed to create class');
        }
    };

    const handleDeleteTable = async (tableName: string) => {
        if (!confirm(`Are you sure you want to delete ${tableName}? This will delete all subjects in it.`)) return;
        try {
            await axios.post(API_URL, {
                action: 'delete_table',
                table_name: tableName
            }, { headers: { Authorization: `Bearer ${token}` } });
            fetchTables();
            if (selectedTable?.table === tableName) {
                setSelectedTable(null);
                setTableSubjects([]);
            }
            toast.success('Table deleted');
        } catch (error) {
            toast.error('Failed to delete table');
        }
    }

    const handleSelectClass = (table: TableInfo) => {
        setSelectedTable(table);
        fetchSubjects(table.table);
    };

    const handleAddSubject = async () => {
        if (!selectedTable) {
            toast.error('Please select a class first.');
            return;
        }
        if (!newSubject.trim()) {
            toast.error('Please enter a subject name.');
            return;
        }

        try {
            const response = await axios.post('https://notelibraryapp.com/api/admin/subjects.php', {
                action: 'add_subject',
                table: selectedTable.table,
                subject_name: newSubject.trim(),
                has_units: enableUnitsForNewSubject ? 1 : 0
            }, { headers: { Authorization: `Bearer ${token}` } });

            if (response.data.success) {
                setNewSubject('');
                setEnableUnitsForNewSubject(true); // Always default to true for next one
                fetchSubjects(selectedTable.table);
                toast.success('Subject added');
            } else {
                toast.error(`Failed to add subject: ${response.data.message || 'Unknown error'}`);
            }
        } catch (error: any) {
            console.error('Failed to add subject', error);
            const msg = error.response?.data?.message || error.message || 'Network error';
            toast.error(`Error adding subject: ${msg}`);
        }
    };

    const handleDeleteSubject = async (subjectId: number) => {
        if (!selectedTable || !confirm('Are you sure you want to delete this subject? All its units and data will be lost.')) return;
        try {
            await axios.post('https://notelibraryapp.com/api/admin/subjects.php', {
                action: 'delete_subject',
                table: selectedTable.table,
                subject_id: subjectId
            }, { headers: { Authorization: `Bearer ${token}` } });
            fetchSubjects(selectedTable.table);
            toast.success('Subject deleted');
        } catch (error) {
            console.error('Failed to delete subject', error);
            toast.error('Failed to delete subject');
        }
    };

    const handleUpdateUnits = async (subjectId: number, currentUnits: string[]) => {
        if (!selectedTable) return;
        setUpdatingUnits(subjectId);
        try {
            const response = await axios.post('https://notelibraryapp.com/api/admin/subjects.php', {
                action: 'update_units',
                table: selectedTable.table,
                subject_id: subjectId,
                units: currentUnits
            }, { headers: { Authorization: `Bearer ${token}` } });

            if (response.data.success) {
                fetchSubjects(selectedTable.table);
                toast.success('Units updated');
            } else {
                console.error('Update Units failed:', response.data);
                toast.error(`Error: ${response.data.message || 'Failed to update units'}`);
            }
        } catch (error: any) {
            console.error('Failed to update units', error);
            const msg = error.response?.data?.message || error.message || 'Server error';
            toast.error(`Network/Server Error: ${msg}`);
        } finally {
            setUpdatingUnits(null);
        }
    };

    const handleToggleUnitSupport = async (subject: Subject) => {
        if (!selectedTable) return;

        // Coerce to number to handle potential string types from PHP
        const currentStatus = Number(subject.has_units === undefined ? 1 : subject.has_units);
        const newStatus = currentStatus === 0 ? 1 : 0;

        try {
            const response = await axios.post('https://notelibraryapp.com/api/admin/subjects.php', {
                action: 'toggle_units_support',
                table: selectedTable.table,
                subject_id: subject.id,
                has_units: newStatus
            }, { headers: { Authorization: `Bearer ${token}` } });

            if (response.data.success) {
                fetchSubjects(selectedTable.table);
                toast.success(`Unit system ${newStatus === 1 ? 'enabled' : 'disabled'}`);
            } else {
                console.error('Toggle failed:', response.data);
                toast.error(`Error: ${response.data.message || 'Failed to toggle unit support'}`);
            }
        } catch (error: any) {
            console.error('Failed to toggle unit support', error);
            const msg = error.response?.data?.message || error.message || 'Server error';
            toast.error(`Error toggling unit support: ${msg}`);
        }
    };

    const addUnit = (subject: Subject) => {
        if (!newUnit.trim()) return;
        const currentUnits = JSON.parse(subject.units || '[]');
        if (currentUnits.includes(newUnit.trim())) {
            toast.error('Unit already exists');
            return;
        }
        const updatedUnits = [...currentUnits, newUnit.trim()];
        handleUpdateUnits(subject.id, updatedUnits);
        setNewUnit('');
    };

    const removeUnit = (subject: Subject, unitToRemove: string) => {
        if (!confirm(`Are you sure you want to delete the unit "${unitToRemove}"?`)) return;
        const currentUnits = JSON.parse(subject.units || '[]');
        const updatedUnits = currentUnits.filter((u: string) => u !== unitToRemove);
        handleUpdateUnits(subject.id, updatedUnits);
    };

    const startEditingUnit = (index: number, value: string) => {
        setEditingUnitIndex(index);
        setEditingUnitValue(value);
    };

    const saveEditedUnit = (subject: Subject, index: number) => {
        const newValue = editingUnitValue.trim();
        if (!newValue) return;

        const currentUnits = JSON.parse(subject.units || '[]');

        // Duplicate check: check if newValue exists in other positions
        const isDuplicate = currentUnits.some((u: string, i: number) => i !== index && u === newValue);
        if (isDuplicate) {
            toast.error('This unit name already exists.');
            return;
        }

        currentUnits[index] = newValue;
        handleUpdateUnits(subject.id, currentUnits);
        setEditingUnitIndex(null);
        setEditingUnitValue('');
    };

    const handleAddExam = async () => {
        if (!newExam) return;
        try {
            // Using subjects.php because classTable.php doesn't handle exam actions
            await axios.post('https://notelibraryapp.com/api/admin/subjects.php', {
                action: 'add_exam',
                exam_name: newExam
            }, { headers: { Authorization: `Bearer ${token}` } });
            setNewExam('');
            fetchExams();
            toast.success('Exam added');
        } catch (error) {
            toast.error('Failed to add exam');
        }
    };

    const handleDeleteExam = async (examId: number) => {
        if (!confirm('Delete this exam?')) return;
        try {
            // Using subjects.php because classTable.php doesn't handle exam actions
            await axios.post('https://notelibraryapp.com/api/admin/subjects.php', {
                action: 'delete_exam',
                exam_id: examId
            }, { headers: { Authorization: `Bearer ${token}` } });
            fetchExams();
            toast.success('Exam deleted');
        } catch (error) {
            toast.error('Failed to delete exam');
        }
    };

    return (
        <DashboardLayout>
            <div className="p-6 space-y-6">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900">Subjects Management</h1>
                    <p className="text-gray-600">Manage classes, faculties, subjects and competitive exams</p>
                </div>

                <div className="space-y-6">
                    {/* Top Row: Class Creation & List */}
                    <div className="grid grid-cols-1 lg:grid-cols-1 gap-6">
                        {/* Create Class Card */}
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                            <div className="flex flex-col sm:flex-row gap-4 items-end">
                                <div className="flex-1 w-full">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Class Name</label>
                                    <input
                                        type="text"
                                        value={newClass}
                                        onChange={(e) => setNewClass(e.target.value)}
                                        placeholder="e.g., Class 10"
                                        className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                                    />
                                </div>
                                <div className="flex-1 w-full">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Faculty Name</label>
                                    <input
                                        type="text"
                                        value={newFaculty}
                                        onChange={(e) => setNewFaculty(e.target.value)}
                                        placeholder="e.g., Science"
                                        className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                                    />
                                </div>
                                <button
                                    onClick={handleAddClass}
                                    className="px-6 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors flex items-center gap-2 whitespace-nowrap"
                                >
                                    <Plus size={18} /> Add Class
                                </button>
                            </div>
                        </div>

                        {/* Classes List */}
                        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                                <h2 className="text-lg font-semibold text-gray-900">Classes</h2>
                                <button onClick={() => { fetchTables(); setRefreshing(true); setTimeout(() => setRefreshing(false), 500); }} className={`p-2 text-gray-500 hover:text-indigo-600 transition-colors ${refreshing ? 'animate-spin' : ''}`}>
                                    <RefreshCw size={18} />
                                </button>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead className="bg-gray-50 text-gray-600 text-sm font-medium">
                                        <tr>
                                            <th className="px-6 py-3">Name</th>
                                            <th className="px-6 py-3">Faculty</th>
                                            <th className="px-6 py-3">Database Table</th>
                                            <th className="px-6 py-3 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {tables.length === 0 ? (
                                            <tr>
                                                <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                                                    No classes found. Create one above.
                                                </td>
                                            </tr>
                                        ) : (
                                            tables.map((t) => (
                                                <tr
                                                    key={t.table}
                                                    onClick={() => handleSelectClass(t)}
                                                    className={`group hover:bg-gray-50 cursor-pointer transition-colors ${selectedTable?.table === t.table ? 'bg-indigo-50 hover:bg-indigo-100' : ''}`}
                                                >
                                                    <td className="px-6 py-4 font-medium text-gray-900">{t.class}</td>
                                                    <td className="px-6 py-4 text-gray-600">{t.faculty}</td>
                                                    <td className="px-6 py-4 text-gray-400 text-xs font-mono">{t.table}</td>
                                                    <td className="px-6 py-4 text-right">
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); handleDeleteTable(t.table); }}
                                                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                    {/* Bottom Row: Subjects & Exams */}
                    <div className="grid grid-cols-1 lg:grid-cols-1 gap-6">
                        {/* Subjects Card */}
                        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col min-h-[600px]">
                            <div className="p-5 border-b border-gray-100 bg-white flex justify-between items-center">
                                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                                    <FolderPlus size={18} className="text-indigo-600" />
                                    {selectedTable ? `${selectedTable.class} - ${selectedTable.faculty} Subjects` : 'Class Subjects'}
                                </h3>
                                {selectedTable && (
                                    <button onClick={() => fetchSubjects(selectedTable.table)} className="text-gray-400 hover:text-indigo-600"><RefreshCw size={14} /></button>
                                )}
                            </div>

                            <div className="p-6 bg-gray-50 border-b border-gray-100">
                                {selectedTable ? (
                                    <div className="flex flex-col md:flex-row gap-6 items-start md:items-center">
                                        <div className="flex-1 w-full space-y-2">
                                            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">Add New Subject</label>
                                            <div className="flex gap-2">
                                                <input
                                                    type="text"
                                                    value={newSubject}
                                                    onChange={(e) => setNewSubject(e.target.value)}
                                                    placeholder={`Enter subject name...`}
                                                    className="flex-1 px-4 py-2.5 bg-white text-sm rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                                />
                                            </div>
                                        </div>

                                        <button
                                            onClick={handleAddSubject}
                                            className="w-full md:w-auto mt-auto px-8 py-2.5 bg-indigo-600 text-white text-sm font-bold rounded-lg hover:bg-indigo-700 transition-all shadow-md active:scale-95"
                                        >
                                            ADD SUBJECT
                                        </button>
                                    </div>
                                ) : (
                                    <div className="text-center py-4 bg-white rounded-lg border border-dashed border-gray-300">
                                        <p className="text-sm text-gray-500 font-medium">Please select a class from the table above to manage subjects.</p>
                                    </div>
                                )}
                            </div>

                            <div className="flex-1 overflow-y-auto p-6 bg-gray-50/30">
                                {!selectedTable ? (
                                    <div className="h-full flex flex-col items-center justify-center text-gray-400 p-12 text-center">
                                        <FolderPlus size={64} className="mb-4 opacity-10" />
                                        <p className="text-lg font-medium opacity-50">Select a class to view subjects</p>
                                    </div>
                                ) : tableSubjects.length === 0 ? (
                                    <div className="text-center py-20 text-gray-400 italic">No subjects added to this class yet.</div>
                                ) : (
                                    <div className="columns-1 md:columns-2 lg:columns-3 gap-6">
                                        {tableSubjects.map(sub => {
                                            const units: string[] = JSON.parse(sub.units || '[]');
                                            const isExpanded = expandedSubjectId === sub.id;

                                            return (
                                                <div key={sub.id} className={`break-inside-avoid mb-6 flex flex-col bg-white border rounded-xl overflow-hidden transition-all duration-300 ${isExpanded ? 'ring-2 ring-indigo-500 shadow-xl scale-[1.02] z-10' : 'hover:border-indigo-300 hover:shadow-md'}`}>
                                                    <div
                                                        className={`flex flex-col p-4 cursor-pointer ${isExpanded ? 'bg-indigo-50/50' : ''}`}
                                                        onClick={() => setExpandedSubjectId(isExpanded ? null : sub.id)}
                                                    >
                                                        <div className="flex justify-between items-start mb-2">
                                                            <div className="flex flex-col">
                                                                <span className="text-xs font-bold text-indigo-600 uppercase tracking-tighter mb-1">Subject</span>
                                                                <span className="text-base font-bold text-gray-800 line-clamp-1">{sub.subject_name}</span>
                                                            </div>
                                                            <div className="flex items-center gap-1">
                                                                <button
                                                                    onClick={(e) => { e.stopPropagation(); handleDeleteSubject(sub.id); }}
                                                                    className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                                                >
                                                                    <X size={18} />
                                                                </button>
                                                            </div>
                                                        </div>

                                                        <div className="flex items-center justify-between mt-4">
                                                            <div className="flex items-center gap-2">
                                                                {Number(sub.has_units) !== 0 ? (
                                                                    <span className="text-[10px] bg-indigo-600 text-white px-2 py-0.5 rounded-full font-black uppercase tracking-widest">{units.length} UNITS</span>
                                                                ) : (
                                                                    <span className="text-[10px] bg-gray-100 text-gray-400 px-2 py-0.5 rounded-full font-black uppercase tracking-widest">NO UNITS</span>
                                                                )}
                                                            </div>
                                                            <div
                                                                className={`flex items-center gap-1 px-2 py-1 rounded-md ${Number(sub.has_units) === 0 ? 'text-gray-400 bg-gray-50' : 'text-indigo-600 bg-indigo-50'}`}
                                                            >
                                                                <Layers size={14} />
                                                                <span className="text-[10px] font-bold uppercase">{Number(sub.has_units) === 0 ? 'Disabled' : 'Enabled'}</span>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {isExpanded && (
                                                        <div className="flex-1 p-4 border-t border-gray-100 bg-white flex flex-col min-h-[300px]">
                                                            {/* Prominent Toggle for existing subject */}
                                                            <div className="mb-6 p-4 bg-gray-50 rounded-xl border border-gray-100">
                                                                <div className="flex items-center justify-between">
                                                                    <div>
                                                                        <p className="text-sm font-bold text-gray-700">Unit System</p>
                                                                        <p className="text-xs text-gray-500 font-medium">Enable or disable units for this subject</p>
                                                                    </div>
                                                                    <div className="flex bg-white p-1 rounded-lg border border-gray-100 shadow-sm">
                                                                        <button
                                                                            onClick={(e) => { e.stopPropagation(); if (Number(sub.has_units) === 0) handleToggleUnitSupport(sub); }}
                                                                            className={`px-4 py-1.5 text-xs font-black rounded-md transition-all ${Number(sub.has_units) !== 0 ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-400 hover:text-gray-600'}`}
                                                                        >
                                                                            TRUE
                                                                        </button>
                                                                        <button
                                                                            onClick={(e) => { e.stopPropagation(); if (Number(sub.has_units) !== 0) handleToggleUnitSupport(sub); }}
                                                                            className={`px-4 py-1.5 text-xs font-black rounded-md transition-all ${Number(sub.has_units) === 0 ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-400 hover:text-gray-600'}`}
                                                                        >
                                                                            FALSE
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            {Number(sub.has_units) !== 0 ? (
                                                                <>
                                                                    <div className="flex gap-2 mb-4">
                                                                        <input
                                                                            type="text"
                                                                            value={newUnit}
                                                                            onChange={(e) => setNewUnit(e.target.value)}
                                                                            placeholder="New Unit name..."
                                                                            className="flex-1 px-3 py-2 text-sm rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 outline-none"
                                                                            onKeyDown={(e) => e.key === 'Enter' && addUnit(sub)}
                                                                        />
                                                                        <button
                                                                            disabled={updatingUnits === sub.id}
                                                                            onClick={() => addUnit(sub)}
                                                                            className="px-4 py-2 bg-indigo-600 text-white text-sm font-bold rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
                                                                        >
                                                                            {updatingUnits === sub.id ? '...' : 'ADD'}
                                                                        </button>
                                                                    </div>

                                                                    <div className="flex-1 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                                                                        {units.length === 0 ? (
                                                                            <div className="flex flex-col items-center justify-center h-full py-8 text-gray-300 italic text-sm">
                                                                                <Layers size={24} className="mb-2 opacity-50" />
                                                                                No units added yet
                                                                            </div>
                                                                        ) : (
                                                                            units.map((unit, idx) => (
                                                                                <div key={idx} className="flex justify-between items-center px-3 py-2.5 bg-gray-50/50 rounded-lg group hover:bg-indigo-50/30 transition-colors">
                                                                                    {editingUnitIndex === idx ? (
                                                                                        <div className="flex-1 flex gap-2">
                                                                                            <input
                                                                                                type="text"
                                                                                                value={editingUnitValue}
                                                                                                onChange={(e) => setEditingUnitValue(e.target.value)}
                                                                                                className="flex-1 px-2 py-1 text-sm border rounded outline-none"
                                                                                                autoFocus
                                                                                                onKeyDown={(e) => e.key === 'Enter' && saveEditedUnit(sub, idx)}
                                                                                            />
                                                                                            <button onClick={() => saveEditedUnit(sub, idx)} className="text-green-600 font-bold text-xs uppercase">Save</button>
                                                                                            <button onClick={() => setEditingUnitIndex(null)} className="text-gray-400 font-bold text-xs uppercase">Cancel</button>
                                                                                        </div>
                                                                                    ) : (
                                                                                        <>
                                                                                            <span className="text-sm font-medium text-gray-600 truncate mr-2" title={unit}>
                                                                                                {unit}
                                                                                            </span>
                                                                                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                                                <button
                                                                                                    onClick={(e) => { e.stopPropagation(); startEditingUnit(idx, unit); }}
                                                                                                    className="p-1 text-gray-400 hover:text-indigo-600"
                                                                                                >
                                                                                                    <Edit2 size={14} />
                                                                                                </button>
                                                                                                <button
                                                                                                    disabled={updatingUnits === sub.id}
                                                                                                    onClick={(e) => { e.stopPropagation(); removeUnit(sub, unit); }}
                                                                                                    className="p-1 text-gray-400 hover:text-red-500"
                                                                                                >
                                                                                                    <Trash2 size={14} />
                                                                                                </button>
                                                                                            </div>
                                                                                        </>
                                                                                    )}
                                                                                </div>
                                                                            ))
                                                                        )}
                                                                    </div>
                                                                </>
                                                            ) : (
                                                                <div className="flex-1 flex flex-col items-center justify-center text-center p-6 bg-gray-50 rounded-xl">
                                                                    <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center mb-3">
                                                                        <Layers size={24} className="text-gray-400" />
                                                                    </div>
                                                                    <p className="text-sm text-gray-500 font-bold mb-1">Unit System Disabled</p>
                                                                    <p className="text-xs text-gray-400 mb-4">You cannot manage units for this subject unless the system is enabled.</p>
                                                                    <button
                                                                        onClick={() => handleToggleUnitSupport(sub)}
                                                                        className="px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-lg hover:bg-indigo-700 transition-all shadow-md"
                                                                    >
                                                                        ENABLE UNIT SYSTEM
                                                                    </button>
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Competitive Exams Card */}
                        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                            <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-white">
                                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                                    <Plus size={18} className="text-indigo-600" />
                                    Competitive Exams
                                </h3>
                                <button onClick={fetchExams} className="text-gray-400 hover:text-indigo-600 transition-colors"><RefreshCw size={14} /></button>
                            </div>
                            <div className="p-6 bg-gray-50 border-b border-gray-100">
                                <div className="flex flex-col md:flex-row gap-4 items-end">
                                    <div className="flex-1 w-full">
                                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">New Exam Name</label>
                                        <input
                                            type="text"
                                            value={newExam}
                                            onChange={(e) => setNewExam(e.target.value)}
                                            placeholder="e.g. IOE, MBBS, Entrance"
                                            className="w-full px-4 py-2.5 bg-white text-sm rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                        />
                                    </div>
                                    <button
                                        onClick={handleAddExam}
                                        className="w-full md:w-auto px-8 py-2.5 bg-slate-900 text-white text-sm font-bold rounded-lg hover:bg-slate-800 transition-colors uppercase tracking-widest"
                                    >
                                        ADD EXAM
                                    </button>
                                </div>
                                {examError && <p className="text-xs text-red-500 mt-2 flex items-center gap-1"><X size={10} /> {examError}</p>}
                            </div>
                            <div className="p-6">
                                {exams.length === 0 ? (
                                    <div className="text-center py-10 text-gray-400 italic">No competitive exams added yet.</div>
                                ) : (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                        {exams.map(exam => (
                                            <div key={exam.id} className="flex justify-between items-center px-4 py-3 bg-white border border-gray-100 rounded-xl group hover:border-indigo-300 hover:shadow-sm transition-all">
                                                <span className="text-sm font-bold text-gray-700">{exam.exam_name}</span>
                                                <button onClick={() => handleDeleteExam(exam.id)} className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
