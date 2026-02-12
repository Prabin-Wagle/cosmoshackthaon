import { useTheme } from '../contexts/ThemeContext';
import { Sun, Moon, Monitor } from 'lucide-react';

export default function ThemeSwitcher() {
    const { theme, setTheme } = useTheme();

    const themes = [
        { id: 'system', icon: Monitor, label: 'System' },
        { id: 'light', icon: Sun, label: 'Light' },
        { id: 'dark', icon: Moon, label: 'Dark' },
    ] as const;

    return (
        <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg border border-gray-200 dark:border-gray-700">
            {themes.map(({ id, icon: Icon, label }) => (
                <button
                    key={id}
                    onClick={() => setTheme(id)}
                    className={`p-1.5 rounded-md transition-all duration-200 group relative ${theme === id
                        ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm'
                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-gray-700/50'
                        }`}
                    title={label}
                >
                    <Icon size={14} className="relative z-10" />
                    <span className="sr-only">{label}</span>

                    {/* Tooltip on hover */}
                    <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 text-[10px] font-medium text-white bg-gray-900 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
                        {label}
                    </span>
                </button>
            ))}
        </div>
    );
}
