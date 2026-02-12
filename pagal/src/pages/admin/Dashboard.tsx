import React from 'react';
import { Users, BookMarked, BarChart3, ShieldCheck } from 'lucide-react';

const AdminDashboard = () => {
    return (
        <div className="p-6 bg-slate-50 min-height-screen">
            <header className="mb-8">
                <h1 className="text-3xl font-bold text-slate-900 font-mono tracking-tight">ADMIN CONSOLE</h1>
                <p className="text-slate-500 italic">System Overview and Management</p>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-slate-900 text-white p-6 rounded-xl">
                    <div className="flex justify-between items-center mb-4">
                        <Users size={20} className="text-indigo-400" />
                        <span className="text-xs font-bold uppercase tracking-widest text-indigo-400">Total Students</span>
                    </div>
                    <div className="text-4xl font-bold">1,248</div>
                </div>

                <div className="bg-slate-900 text-white p-6 rounded-xl">
                    <div className="flex justify-between items-center mb-4">
                        <BookMarked size={20} className="text-emerald-400" />
                        <span className="text-xs font-bold uppercase tracking-widest text-emerald-400">Resources</span>
                    </div>
                    <div className="text-4xl font-bold">452</div>
                </div>

                <div className="bg-slate-900 text-white p-6 rounded-xl">
                    <div className="flex justify-between items-center mb-4">
                        <BarChart3 size={20} className="text-amber-400" />
                        <span className="text-xs font-bold uppercase tracking-widest text-amber-400">Sales</span>
                    </div>
                    <div className="text-4xl font-bold">$12.4k</div>
                </div>

                <div className="bg-slate-900 text-white p-6 rounded-xl">
                    <div className="flex justify-between items-center mb-4">
                        <ShieldCheck size={20} className="text-rose-400" />
                        <span className="text-xs font-bold uppercase tracking-widest text-rose-400">Security</span>
                    </div>
                    <div className="text-4xl font-bold">ACTIVE</div>
                </div>
            </div>
        </div>
    );
};

export default AdminDashboard;
