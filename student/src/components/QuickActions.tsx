import { useNavigate } from 'react-router-dom';
import { Play, BookOpen, MessageSquare, User } from 'lucide-react';

export default function QuickActions() {
    const navigate = useNavigate();

    const actions = [
        { label: 'Test Series', icon: Play, path: '/test-series', color: 'blue' },
        { label: 'Study Notes', icon: BookOpen, path: '/subjects', color: 'indigo' },
        { label: 'My Profile', icon: User, path: '/profile', color: 'emerald' },
        { label: 'Support', icon: MessageSquare, path: '/contact', color: 'amber' },
    ];

    return (
        <div className="grid grid-cols-2 gap-4">
            {actions.map((action, i) => (
                <button
                    key={i}
                    onClick={() => navigate(action.path)}
                    className="group flex items-center gap-4 p-5 bg-white dark:bg-gray-900 rounded-[2rem] border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all text-left"
                >
                    <div className={`w-12 h-12 rounded-2xl bg-${action.color}-50 dark:bg-${action.color}-900/20 flex items-center justify-center text-${action.color}-600 dark:text-${action.color}-400 group-hover:scale-110 transition-transform`}>
                        {<action.icon size={24} />}
                    </div>
                    <div>
                        <span className="text-xs font-black uppercase tracking-wider text-gray-900 dark:text-white group-hover:text-blue-600 transition-colors block">
                            {action.label}
                        </span>
                        <span className="text-[9px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mt-0.5 block">
                            Quick Access
                        </span>
                    </div>
                </button>
            ))}
        </div>
    );
}

