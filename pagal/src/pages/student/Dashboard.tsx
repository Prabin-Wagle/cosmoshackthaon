import React from 'react';
import { LayoutDashboard, BookOpen, ShoppingBag, AlertTriangle, Settings, LogOut } from 'lucide-react';

const StudentDashboard = () => {
  return (
    <div className="p-6">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Student Portal</h1>
        <p className="text-slate-500">Welcome back, Engineering Student!</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
          <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center text-indigo-600 mb-4">
            <LayoutDashboard size={24} />
          </div>
          <h3 className="text-lg font-semibold text-slate-800">My Progress</h3>
          <p className="text-slate-500 text-sm mt-2">Track your semester performance and attendance.</p>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
          <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center text-emerald-600 mb-4">
            <BookOpen size={24} />
          </div>
          <h3 className="text-lg font-semibold text-slate-800">Resources</h3>
          <p className="text-slate-500 text-sm mt-2">Access NCIT notes, books, and engineering resources.</p>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
          <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center text-amber-600 mb-4">
            <ShoppingBag size={24} />
          </div>
          <h3 className="text-lg font-semibold text-slate-800">Store</h3>
          <p className="text-slate-500 text-sm mt-2">Purchase books and equipment with ease.</p>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
          <div className="w-12 h-12 bg-rose-100 rounded-xl flex items-center justify-center text-rose-600 mb-4">
            <AlertTriangle size={24} />
          </div>
          <h3 className="text-lg font-semibold text-slate-800">Exam Traps</h3>
          <p className="text-slate-500 text-sm mt-2">Common pitfalls and tricky questions to watch out for.</p>
        </div>
      </div>
    </div>
  );
};

export default StudentDashboard;
