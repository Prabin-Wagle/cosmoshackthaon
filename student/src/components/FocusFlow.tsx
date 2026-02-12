import { useState, useEffect, useMemo } from 'react';
import {
    CheckCircle2, Circle, Plus, Loader2, ChevronLeft, ChevronRight,
    Trash2, Edit3, LayoutGrid, List, CalendarDays
} from 'lucide-react';
import axiosClient from '../api/axiosClient';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'react-hot-toast';

interface Target {
    id: number;
    label: string;
    progress: number;
    is_completed: number;
    target_date: string;
}

type ViewMode = 'weekly' | 'monthly';

export default function FocusFlow() {
    const { user } = useAuth();
    const [targets, setTargets] = useState<Target[]>([]);
    const [loading, setLoading] = useState(true);
    const [newTarget, setNewTarget] = useState('');
    const [isAdding, setIsAdding] = useState(false);
    const [viewDate, setViewDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [viewMode, setViewMode] = useState<ViewMode>('weekly');
    const [editingId, setEditingId] = useState<number | null>(null);
    const [editLabel, setEditLabel] = useState('');

    // --- Date Logic ---
    const weekDays = useMemo(() => {
        const days = [];
        const start = new Date(viewDate);
        const day = viewDate.getDay();
        const diff = viewDate.getDate() - day + (day === 0 ? -6 : 1);
        start.setDate(diff);

        for (let i = 0; i < 7; i++) {
            const d = new Date(start);
            d.setDate(start.getDate() + i);
            days.push(d);
        }
        return days;
    }, [viewDate]);

    const monthDays = useMemo(() => {
        const year = viewDate.getFullYear();
        const month = viewDate.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);

        const days = [];
        // Monday start padding
        const startPadding = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1;
        for (let i = 0; i < startPadding; i++) {
            const d = new Date(year, month, 1 - (startPadding - i));
            days.push({ date: d, isCurrentMonth: false });
        }

        for (let i = 1; i <= lastDay.getDate(); i++) {
            days.push({ date: new Date(year, month, i), isCurrentMonth: true });
        }

        const endPadding = 42 - days.length;
        for (let i = 1; i <= endPadding; i++) {
            days.push({ date: new Date(year, month + 1, i), isCurrentMonth: false });
        }

        return days;
    }, [viewDate]);

    const isPastDate = (date: Date) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return date < today;
    };

    const isSameDay = (d1: Date, d2: Date) => {
        return d1.toDateString() === d2.toDateString();
    };

    const getDayTasks = (date: Date) => {
        const dateStr = date.toISOString().split('T')[0];
        return targets.filter(t => t.target_date === dateStr);
    };

    // --- API Interactions ---
    const fetchTargets = async () => {
        setLoading(true);
        try {
            const response = await axiosClient.get(`/api/users/targets.php`, {
                params: {
                    user_id: user?.id,
                    start_date: monthDays[0].date.toISOString().split('T')[0],
                    end_date: monthDays[monthDays.length - 1].date.toISOString().split('T')[0]
                }
            });
            if (response.data.status === 'success') {
                const normalized = response.data.targets.map((t: any) => ({
                    ...t,
                    is_completed: Number(t.is_completed),
                    progress: Number(t.progress)
                }));
                setTargets(normalized);
            }
        } catch (error) {
            console.error('Failed to fetch targets:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (user?.id) fetchTargets();
    }, [user?.id, viewDate]);

    const handleAction = async (action: string, data: any) => {
        try {
            const formData = new FormData();
            formData.append('user_id', user?.id || '');
            formData.append('action', action);
            Object.keys(data).forEach(key => formData.append(key, data[key]));

            const response = await axiosClient.post(`/api/users/targets.php`, formData);
            if (response.data.status === 'success') {
                fetchTargets();
                return true;
            }
            return false;
        } catch (error) {
            toast.error(`Failed to ${action} task`);
            return false;
        }
    };

    // --- Handlers ---
    const onAddTask = async (e: React.FormEvent, date?: Date) => {
        e.preventDefault();
        const targetDate = date || selectedDate;
        if (!newTarget.trim()) return;
        if (isPastDate(targetDate)) {
            toast.error("Cannot add tasks to past dates!");
            return;
        }

        const success = await handleAction('add', {
            label: newTarget,
            target_date: targetDate.toISOString().split('T')[0]
        });
        if (success) {
            setNewTarget('');
            setIsAdding(false);
        }
    };

    const onToggleComplete = (target: Target) => {
        if (isPastDate(new Date(target.target_date))) return;
        handleAction('update', {
            id: target.id,
            progress: Number(target.progress) >= 100 ? 0 : 100
        });
    };

    const onDelete = (id: number) => {
        if (window.confirm('Are you sure you want to delete this objective?')) {
            handleAction('delete', { id });
        }
    };

    const onStartEdit = (target: Target) => {
        if (isPastDate(new Date(target.target_date))) return;
        setEditingId(target.id);
        setEditLabel(target.label);
    };

    const onSaveEdit = async () => {
        if (!editLabel.trim() || editingId === null) return;
        const success = await handleAction('rename', {
            id: editingId,
            label: editLabel
        });
        if (success) {
            setEditingId(null);
            setEditLabel('');
        }
    };

    // --- Render Helpers ---
    const filteredTargets = targets.filter(t => t.target_date === selectedDate.toISOString().split('T')[0]);

    return (
        <div className="bg-white dark:bg-[#0f1115] rounded-[2.5rem] p-8 border border-gray-100 dark:border-white/5 shadow-2xl transition-all duration-500 overflow-hidden group relative">
            {loading && (
                <div className="absolute inset-0 bg-white/50 dark:bg-[#0f1115]/50 backdrop-blur-sm z-50 flex items-center justify-center animate-in fade-in duration-300">
                    <div className="flex flex-col items-center gap-4">
                        <Loader2 size={40} className="text-blue-600 animate-spin" />
                        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-600 animate-pulse">Syncing Flow...</span>
                    </div>
                </div>
            )}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-10">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-blue-600 rounded-2xl text-white shadow-xl shadow-blue-600/20">
                        <LayoutGrid size={24} className="animate-pulse" />
                    </div>
                    <div>
                        <h3 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">Focus Flow</h3>
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-[0.3em] mt-0.5">Notion-Inspired Planning</p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    {/* View Switcher */}
                    <div className="flex bg-gray-50 dark:bg-white/5 p-1 rounded-xl border border-gray-100 dark:border-white/5">
                        <button
                            onClick={() => setViewMode('weekly')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'weekly'
                                ? 'bg-white dark:bg-white/10 text-blue-600 shadow-sm'
                                : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-200'
                                }`}
                        >
                            <List size={14} />
                            <span>Weekly</span>
                        </button>
                        <button
                            onClick={() => setViewMode('monthly')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'monthly'
                                ? 'bg-white dark:bg-white/10 text-blue-600 shadow-sm'
                                : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-200'
                                }`}
                        >
                            <LayoutGrid size={14} />
                            <span>Monthly</span>
                        </button>
                    </div>

                    <div className="flex items-center gap-1.5 bg-gray-50/50 dark:bg-white/5 p-1.5 rounded-xl border border-gray-100 dark:border-white/5">
                        <button onClick={() => {
                            const next = new Date(viewDate);
                            if (viewMode === 'monthly') next.setMonth(viewDate.getMonth() - 1);
                            else next.setDate(viewDate.getDate() - 7);
                            setViewDate(next);
                        }} className="p-2 hover:bg-white dark:hover:bg-white/10 rounded-lg text-gray-400 hover:text-blue-600 transition-all">
                            <ChevronLeft size={18} />
                        </button>

                        <div className="px-3 min-w-[120px] text-center">
                            <span className="text-[11px] font-black uppercase tracking-widest text-gray-700 dark:text-gray-200">
                                {viewDate.toLocaleDateString(undefined, {
                                    month: viewMode === 'monthly' ? 'long' : 'short',
                                    year: 'numeric',
                                    day: viewMode === 'monthly' ? undefined : 'numeric'
                                })}
                            </span>
                        </div>

                        <button onClick={() => {
                            const next = new Date(viewDate);
                            if (viewMode === 'monthly') next.setMonth(viewDate.getMonth() + 1);
                            else next.setDate(viewDate.getDate() + 7);
                            setViewDate(next);
                        }} className="p-2 hover:bg-white dark:hover:bg-white/10 rounded-lg text-gray-400 hover:text-blue-600 transition-all">
                            <ChevronRight size={18} />
                        </button>
                    </div>
                </div>
            </div>

            {viewMode === 'monthly' ? (
                /* --- FULL NOTION CALENDAR VIEW --- */
                <div className="animate-in fade-in duration-500">
                    <div className="grid grid-cols-7 gap-px bg-gray-100 dark:bg-white/5 border border-gray-100 dark:border-white/5 rounded-[2rem] overflow-hidden shadow-inner">
                        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d, i) => (
                            <div key={i} className="bg-gray-50/50 dark:bg-[#161920] py-4 text-center text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100 dark:border-white/5">
                                {d}
                            </div>
                        ))}
                        {monthDays.map((md, i) => {
                            const isSelected = isSameDay(md.date, selectedDate);
                            const isToday = isSameDay(md.date, new Date());
                            const dayTasks = getDayTasks(md.date);

                            return (
                                <div
                                    key={i}
                                    onClick={() => setSelectedDate(md.date)}
                                    className={`relative min-h-[120px] md:min-h-[160px] p-2 transition-all cursor-pointer flex flex-col group/day ${md.isCurrentMonth ? 'bg-white dark:bg-[#0f1115]' : 'bg-gray-50/30 dark:bg-[#0c0e12] opacity-30 select-none pointer-events-none'
                                        } ${isSelected ? 'ring-2 ring-inset ring-blue-600 z-10' : 'hover:bg-gray-50/50 dark:hover:bg-white/[0.02]'}`}
                                >
                                    <div className="flex items-center justify-between mb-2">
                                        <span className={`text-xs font-black ${isToday ? 'bg-blue-600 text-white w-6 h-6 flex items-center justify-center rounded-full shadow-lg shadow-blue-600/20' : 'text-gray-400'
                                            }`}>
                                            {md.date.getDate()}
                                        </span>
                                        {md.isCurrentMonth && (
                                            <button
                                                onClick={(e) => { e.stopPropagation(); setSelectedDate(md.date); setIsAdding(true); }}
                                                className="opacity-0 group-hover/day:opacity-100 p-1 hover:bg-blue-50 dark:hover:bg-blue-900/20 text-blue-600 rounded-lg transition-all"
                                            >
                                                <Plus size={14} />
                                            </button>
                                        )}
                                    </div>

                                    <div className="flex-1 space-y-1 overflow-y-auto no-scrollbar pb-1">
                                        {dayTasks.map(task => (
                                            <div
                                                key={task.id}
                                                onClick={(e) => { e.stopPropagation(); onToggleComplete(task); }}
                                                className={`group/task px-2 py-1.5 rounded-lg border text-[9px] font-bold truncate transition-all ${task.is_completed
                                                    ? 'bg-emerald-500/5 border-emerald-500/10 text-emerald-600/70 line-through'
                                                    : 'bg-blue-500/5 border-blue-500/10 text-blue-600 hover:border-blue-500/30'
                                                    }`}
                                            >
                                                <div className="flex items-center gap-1.5">
                                                    <div className={`w-1 h-1 rounded-full shrink-0 ${task.is_completed ? 'bg-emerald-500' : 'bg-blue-500'}`} />
                                                    {task.label}
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    {isSelected && md.isCurrentMonth && (
                                        <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-white dark:from-[#0f1115] to-transparent pointer-events-none">
                                            <div className="h-1 w-1/2 mx-auto bg-blue-600 rounded-full" />
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    {/* Integrated Task Editor within Calendar context */}
                    <div className="mt-8 animate-in slide-in-from-bottom-4 duration-500">
                        <div className="bg-gray-50/50 dark:bg-white/5 rounded-[2.5rem] p-8 border border-gray-100 dark:border-white/5">
                            <div className="flex items-center justify-between mb-8">
                                <div className="flex items-center gap-3">
                                    <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-gray-400">
                                        Detailed Focus
                                    </h4>
                                    <div className="px-3 py-1 bg-blue-600/10 text-blue-600 text-[10px] font-black rounded-lg uppercase tracking-widest">
                                        {selectedDate.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}
                                    </div>
                                </div>
                                {!isPastDate(selectedDate) && (
                                    <button
                                        onClick={() => setIsAdding(true)}
                                        className="flex items-center gap-2 text-blue-600 hover:opacity-70 transition-opacity"
                                    >
                                        <Plus size={16} />
                                        <span className="text-[10px] font-black uppercase tracking-widest">Define Goal</span>
                                    </button>
                                )}
                            </div>

                            {isAdding && (
                                <form onSubmit={(e) => onAddTask(e)} className="mb-6 animate-in zoom-in-95 duration-300">
                                    <input
                                        autoFocus
                                        value={newTarget}
                                        onChange={(e) => setNewTarget(e.target.value)}
                                        onBlur={() => !newTarget && setIsAdding(false)}
                                        placeholder="What's the primary objective?"
                                        className="w-full px-6 py-5 bg-white dark:bg-[#161920] border-2 border-dashed border-blue-200 dark:border-blue-900/30 rounded-[2rem] text-sm font-bold text-gray-900 dark:text-white focus:outline-none focus:border-solid focus:border-blue-600 transition-all shadow-sm"
                                    />
                                </form>
                            )}

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {filteredTargets.map(target => (
                                    <div
                                        key={target.id}
                                        className={`group relative p-5 rounded-[2rem] border transition-all duration-300 ${target.is_completed ? 'bg-emerald-500/5 border-emerald-500/10' : 'bg-white dark:bg-[#161920] border-gray-100 dark:border-white/5 hover:border-blue-600/20 shadow-sm hover:shadow-md'
                                            }`}
                                    >
                                        <div className="flex items-center gap-4">
                                            <button
                                                onClick={() => onToggleComplete(target)}
                                                className={`transition-all duration-500 ${isPastDate(new Date(target.target_date)) ? 'cursor-default' : 'hover:scale-110'}`}
                                            >
                                                {target.is_completed ? (
                                                    <div className="bg-emerald-500 text-white rounded-full p-1 shadow-lg shadow-emerald-500/20">
                                                        <CheckCircle2 size={20} />
                                                    </div>
                                                ) : (
                                                    <div className="text-gray-300 dark:text-gray-700 hover:text-blue-500 transition-colors">
                                                        <Circle size={24} strokeWidth={2} />
                                                    </div>
                                                )}
                                            </button>
                                            <div className="flex-1 min-w-0">
                                                {editingId === target.id ? (
                                                    <div className="flex items-center gap-2">
                                                        <input
                                                            autoFocus
                                                            value={editLabel}
                                                            onChange={(e) => setEditLabel(e.target.value)}
                                                            onKeyDown={(e) => e.key === 'Enter' && onSaveEdit()}
                                                            onBlur={() => onSaveEdit()}
                                                            className="w-full bg-white dark:bg-[#161920] border-b border-blue-600 text-[11px] font-bold text-gray-900 dark:text-white focus:outline-none"
                                                        />
                                                    </div>
                                                ) : (
                                                    <h5 className={`text-[11px] font-bold truncate ${target.is_completed ? 'text-gray-400 line-through' : 'text-gray-900 dark:text-gray-200'}`}>
                                                        {target.label}
                                                    </h5>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                                                <button
                                                    onClick={() => onStartEdit(target)}
                                                    className="p-2 hover:bg-blue-50 dark:hover:bg-blue-900/20 text-gray-400 hover:text-blue-500 rounded-xl transition-all"
                                                >
                                                    <Edit3 size={14} />
                                                </button>
                                                <button
                                                    onClick={() => onDelete(target.id)}
                                                    className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-500 rounded-xl transition-all"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                {filteredTargets.length === 0 && !isAdding && (
                                    <div className="col-span-full py-10 text-center opacity-30">
                                        <CalendarDays className="mx-auto mb-3 text-gray-400" size={32} />
                                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Rest & Recharge</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                /* --- WEEKLY CARDS VIEW --- */
                <div className="animate-in slide-in-from-left-4 duration-500">
                    <div className="flex gap-4 mb-12 overflow-x-auto pb-6 scrollbar-hide no-scrollbar scroll-smooth">
                        {weekDays.map((day, i) => {
                            const isToday = isSameDay(day, new Date());
                            const isSelected = isSameDay(day, selectedDate);
                            const dayTasks = getDayTasks(day);
                            const completedCount = dayTasks.filter(t => t.is_completed).length;

                            return (
                                <div
                                    key={i}
                                    onClick={() => setSelectedDate(day)}
                                    className={`relative min-w-[100px] md:min-w-[140px] flex-shrink-0 aspect-[1/1.2] rounded-[2.5rem] flex flex-col items-center justify-center transition-all cursor-pointer border-2 ${isSelected
                                        ? 'bg-blue-600 border-blue-600 text-white shadow-[0_20px_40px_-10px_rgba(37,99,235,0.4)] scale-105 z-10'
                                        : isToday
                                            ? 'bg-white dark:bg-blue-900/10 border-blue-200 dark:border-blue-900/30 text-blue-600'
                                            : 'bg-gray-50 dark:bg-white/[0.03] border-transparent text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-white/10'
                                        }`}
                                >
                                    <span className="text-[11px] font-black uppercase tracking-[0.2em] mb-1">{day.toLocaleDateString(undefined, { weekday: 'short' })}</span>
                                    <span className="text-3xl font-black mb-2">{day.getDate()}</span>
                                    {dayTasks.length > 0 && (
                                        <div className="flex flex-col items-center gap-1.5">
                                            <div className="flex gap-1">
                                                {[...Array(Math.min(dayTasks.length, 3))].map((_, idx) => (
                                                    <div key={idx} className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white shadow-[0_0_8px_white]' : idx < completedCount ? 'bg-emerald-500' : 'bg-blue-600'}`} />
                                                ))}
                                            </div>
                                            <span className={`text-[9px] font-black uppercase tracking-widest ${isSelected ? 'text-white/60' : 'text-gray-400'}`}>
                                                {dayTasks.length} {dayTasks.length === 1 ? 'OBJECTIVE' : 'OBJECTIVES'}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    <div className="space-y-4 max-h-[500px] overflow-y-auto no-scrollbar pr-2">
                        <div className="flex items-center justify-between mb-4 sticky top-0 bg-white dark:bg-[#0f1115] z-10 py-2">
                            <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-gray-400">
                                {isSameDay(selectedDate, new Date()) ? "Today's" : "Day's"} Priority &middot; {selectedDate.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}
                            </h4>
                            {!isPastDate(selectedDate) && (
                                <button
                                    onClick={() => setIsAdding(true)}
                                    className="p-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/30"
                                >
                                    <Plus size={18} />
                                </button>
                            )}
                        </div>

                        {isAdding && (
                            <form onSubmit={(e) => onAddTask(e)} className="animate-in slide-in-from-top-4 duration-500">
                                <input
                                    autoFocus
                                    value={newTarget}
                                    onChange={(e) => setNewTarget(e.target.value)}
                                    placeholder="Define your focus..."
                                    className="w-full pl-6 pr-6 py-6 bg-blue-50/30 dark:bg-blue-900/10 border-2 border-dashed border-blue-200 dark:border-blue-900/30 rounded-[2rem] text-sm font-bold text-gray-900 dark:text-white focus:outline-none focus:border-solid focus:border-blue-600 transition-all"
                                />
                            </form>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {filteredTargets.map(target => (
                                <div
                                    key={target.id}
                                    className={`group relative p-6 rounded-[2.5rem] flex items-center justify-between gap-6 border transition-all duration-300 ${target.is_completed ? 'bg-emerald-600/5 border-emerald-600/10' : 'bg-gray-50/50 dark:bg-white/[0.03] border-gray-100 dark:border-white/5 hover:border-blue-600/30 shadow-sm hover:shadow-md'
                                        }`}
                                >
                                    <div className="flex items-center gap-5 flex-1 min-w-0">
                                        <button
                                            onClick={() => onToggleComplete(target)}
                                            className="shrink-0 transition-transform active:scale-90"
                                        >
                                            {target.is_completed ? (
                                                <div className="bg-emerald-500 text-white rounded-full p-1.5 shadow-lg shadow-emerald-500/20">
                                                    <CheckCircle2 size={24} />
                                                </div>
                                            ) : (
                                                <div className="text-gray-300 dark:text-gray-700 hover:text-blue-500 transition-colors">
                                                    <Circle size={32} strokeWidth={1.5} />
                                                </div>
                                            )}
                                        </button>
                                        <div className="flex-1 truncate">
                                            {editingId === target.id ? (
                                                <input
                                                    autoFocus
                                                    value={editLabel}
                                                    onChange={(e) => setEditLabel(e.target.value)}
                                                    onKeyDown={(e) => e.key === 'Enter' && onSaveEdit()}
                                                    onBlur={() => onSaveEdit()}
                                                    className="w-full bg-transparent border-b border-blue-600 text-sm font-black text-gray-900 dark:text-white focus:outline-none"
                                                />
                                            ) : (
                                                <>
                                                    <h5 className={`text-sm font-black tracking-tight ${target.is_completed ? 'text-gray-400 line-through decoration-emerald-500/30' : 'text-gray-900 dark:text-gray-200'}`}>
                                                        {target.label}
                                                    </h5>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <span className={`text-[8px] font-black uppercase tracking-widest ${target.is_completed ? 'text-emerald-500' : 'text-blue-600/50'}`}>
                                                            {target.is_completed ? 'Completed' : 'Priority Goal'}
                                                        </span>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                                        <button
                                            onClick={() => onStartEdit(target)}
                                            className="p-3 hover:bg-blue-50 dark:hover:bg-blue-900/20 text-gray-400 hover:text-blue-500 rounded-2xl transition-all"
                                        >
                                            <Edit3 size={18} />
                                        </button>
                                        <button
                                            onClick={() => onDelete(target.id)}
                                            className="p-3 hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-500 rounded-2xl transition-all"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
