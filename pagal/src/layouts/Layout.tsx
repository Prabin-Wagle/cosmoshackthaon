import React from 'react';
import { Link, Outlet } from 'react-router-dom';
import { Home, BookOpen, ShoppingBag, ShieldCheck, Github } from 'lucide-react';

const Layout = () => {
    return (
        <div className="min-h-screen bg-slate-50 flex">
            {/* Sidebar */}
            <aside className="w-64 bg-white border-r border-slate-200 flex flex-col">
                <div className="p-6 border-b border-slate-100">
                    <Link to="/" className="flex items-center gap-2 group">
                        <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white group-hover:rotate-12 transition-transform">
                            <BookOpen size={24} />
                        </div>
                        <span className="font-bold text-xl text-slate-800">EngrLMS</span>
                    </Link>
                </div>

                <nav className="flex-1 p-4 space-y-2">
                    <div className="px-3 pb-2">
                        <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400">Main Menu</h3>
                    </div>
                    <Link to="/" className="flex items-center gap-3 px-3 py-2 text-slate-600 hover:bg-slate-50 hover:text-indigo-600 rounded-lg transition-colors">
                        <Home size={18} />
                        <span className="font-medium">Dashboard</span>
                    </Link>
                    <Link to="/resources" className="flex items-center gap-3 px-3 py-2 text-slate-600 hover:bg-slate-50 hover:text-indigo-600 rounded-lg transition-colors">
                        <BookOpen size={18} />
                        <span className="font-medium">Resources</span>
                    </Link>
                    <Link to="/store" className="flex items-center gap-3 px-3 py-2 text-slate-600 hover:bg-slate-50 hover:text-indigo-600 rounded-lg transition-colors">
                        <ShoppingBag size={18} />
                        <span className="font-medium">Store</span>
                    </Link>

                    <div className="pt-6 px-3 pb-2">
                        <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400">Admin Only</h3>
                    </div>
                    <Link to="/admin" className="flex items-center gap-3 px-3 py-2 text-slate-600 hover:bg-slate-50 hover:text-rose-600 rounded-lg transition-colors">
                        <ShieldCheck size={18} />
                        <span className="font-medium">Admin Portal</span>
                    </Link>
                </nav>

                <div className="p-4 border-t border-slate-100">
                    <a
                        href="https://github.com/Prabin-Wagle/cosmoshackthaon"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-2 w-full p-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors"
                    >
                        <Github size={16} />
                        <span className="text-sm font-medium">GitHub Repository</span>
                    </a>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-auto">
                <Outlet />
            </main>
        </div>
    );
};

export default Layout;
