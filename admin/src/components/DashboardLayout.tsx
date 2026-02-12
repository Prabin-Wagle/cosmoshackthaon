import { ReactNode, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LayoutDashboard, Users, LogOut, Menu, X, FileEdit, Video, List, Target, ListChecks, Book, Layers, AlertTriangle, Ticket, CreditCard, Database } from 'lucide-react';

interface DashboardLayoutProps {
    children: ReactNode;
}

export const DashboardLayout = ({ children }: DashboardLayoutProps) => {
    const { user, logout } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();

    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const navSections = [
        {
            label: 'Overview',
            items: [
                { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
                { path: '/users', label: 'Users', icon: Users },
                { path: '/payments', label: 'Payments', icon: CreditCard },
            ]
        },
        {
            label: 'Academic Content',
            items: [
                { path: '/video-playlists', label: 'Video Playlists', icon: List },
                { path: '/videos', label: 'Videos', icon: Video },
                { path: '/books', label: 'Books', icon: Book },
                { path: '/resources', label: 'Resources', icon: Layers },
            ]
        },
        {
            label: 'Test Series',
            items: [
                { path: '/test-series', label: 'Test Series', icon: Target },
                { path: '/test-series-collections', label: 'Test Series Collections', icon: ListChecks },
                { path: '/question-bank', label: 'Question Bank', icon: Database },
            ]
        },
        {
            label: 'Interactions',
            items: [
                { path: '/notices', label: 'Notices', icon: FileEdit },
                { path: '/tickets', label: 'Tickets', icon: Ticket },
                { path: '/partners', label: 'Partners', icon: Users },
            ]
        },
        {
            label: 'System',
            items: [
                { path: '/classmanager', label: 'Class Manager', icon: List },
            ]
        }
    ];

    const isActive = (path: string) => location.pathname === path;

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Mobile Header */}
            <div className="lg:hidden fixed top-0 left-0 right-0 bg-white border-b border-slate-200 z-50 px-4 py-3">
                <button
                    onClick={() => setSidebarOpen(!sidebarOpen)}
                    className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                >
                    {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                </button>
            </div>

            {/* Sidebar */}
            <aside
                className={`fixed top-0 left-0 h-full w-64 bg-slate-900 text-white transform transition-transform duration-300 ease-in-out z-40 flex flex-col ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'
                    } lg:translate-x-0`}
            >
                {/* Header */}
                <div className="p-6 border-b border-slate-700 flex-shrink-0">
                    <h1 className="text-lg md:text-xl lg:text-2xl font-bold">Note Library Admin</h1>
                    <p className="text-slate-400 text-xs md:text-sm mt-1">Welcome, {user?.name}</p>
                </div>

                {/* Navigation Links */}
                <nav className="p-4 space-y-6 flex-1 overflow-y-auto scrollbar-hide py-6">
                    {navSections.map((section) => (
                        <div key={section.label} className="space-y-2">
                            <h3 className="px-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                                {section.label}
                            </h3>
                            <div className="space-y-1">
                                {section.items.map((item) => {
                                    const Icon = item.icon;
                                    return (
                                        <Link
                                            key={item.path}
                                            to={item.path}
                                            onClick={() => setSidebarOpen(false)}
                                            className={`flex items-center gap-3 px-4 py-2 rounded-lg transition-all duration-200 ${isActive(item.path)
                                                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                                                : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                                                }`}
                                        >
                                            <Icon className={`w-4 h-4 ${isActive(item.path) ? 'text-white' : 'text-slate-400'}`} />
                                            <span className="font-medium text-sm">{item.label}</span>
                                        </Link>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </nav>

                {/* Logout Button */}
                <div className="p-4 border-t border-slate-700 flex-shrink-0">
                    <button
                        onClick={() => setShowLogoutConfirm(true)}
                        className="flex items-center gap-3 px-3 py-2 md:px-4 md:py-3 rounded-lg text-slate-300 hover:bg-red-500/10 hover:text-red-400 transition-colors w-full"
                    >
                        <LogOut className="w-4 h-4 md:w-5 md:h-5" />
                        <span className="font-medium text-sm md:text-base">Logout</span>
                    </button>
                </div>
            </aside>

            {/* Mobile Sidebar Overlay */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* === FIXED LOGOUT CONFIRMATION MODAL === */}
            {showLogoutConfirm && (
                <div
                    className="fixed inset-0 z-[100] flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm p-4"
                >
                    <div
                        className="bg-white rounded-xl shadow-2xl w-full relative"
                        style={{ maxWidth: '400px' }} // Forces the modal to be small (Fixes the stretch issue)
                    >
                        {/* Close X Button */}
                        <button
                            onClick={() => setShowLogoutConfirm(false)}
                            className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
                        >
                            <X className="w-5 h-5" />
                        </button>

                        <div className="p-6 text-center">
                            {/* Icon Circle */}
                            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
                                <AlertTriangle className="h-6 w-6 text-red-600" />
                            </div>

                            <h3 className="text-lg font-bold text-slate-900 mb-2">Confirm Logout</h3>
                            <p className="text-slate-500 text-sm mb-6">Are you sure you want to end your session?</p>

                            <div className="flex gap-3 justify-center">
                                <button
                                    onClick={() => setShowLogoutConfirm(false)}
                                    className="px-4 py-2 text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg font-medium text-sm transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleLogout}
                                    className="px-4 py-2 text-white bg-red-600 hover:bg-red-700 rounded-lg font-medium text-sm transition-colors shadow-sm"
                                    style={{ backgroundColor: '#dc2626', color: '#fff' }} // Force color (Fixes invisible button)
                                >
                                    Yes, Logout
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Main Content */}
            <main className="lg:ml-64 pt-16 lg:pt-0">
                <div className="p-4 md:p-6 lg:p-8">{children}</div>
            </main>
        </div>
    );
};