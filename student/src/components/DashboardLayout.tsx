import { ReactNode, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import ThemeSwitcher from './ThemeSwitcher';
import ConfirmationModal from './ConfirmationModal';
import { LogOut, BookOpen, User, Home, Library, Bell, Menu, X, ChevronRight, LifeBuoy, Ticket, Sparkles } from 'lucide-react';

interface DashboardLayoutProps {
  children: ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const { user, logout } = useAuth();
  useTheme(); // Initialize theme context if needed
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const isActive = (path: string) => {
    if (path === '/dashboard') {
      return location.pathname === '/dashboard';
    }
    return location.pathname.startsWith(path);
  };

  const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: Home },
    { name: 'Test Series', path: '/test-series', icon: BookOpen },
    { name: 'Smart Practice', path: '/smart-practice', icon: Sparkles },
    { name: 'Study Materials', path: '/subjects', icon: Library },
    { name: 'Notices', path: '/notices', icon: Bell },
    { name: 'Profile', path: '/profile', icon: User },
    { name: 'Contact Us', path: '/contact', icon: LifeBuoy },
    { name: 'Support Tickets', path: '/support-tickets', icon: Ticket },
  ];

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 transition-colors duration-300">
      {/* Brand Logo */}
      <div className="p-6 flex items-center gap-3">
        <div className="bg-white dark:bg-gray-800 p-1.5 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
          <img
            src="https://notelibraryapp.com/p.jpg"
            alt="NoteLibrary"
            className="h-8 w-8 rounded-lg object-cover"
          />
        </div>
        <div className="flex flex-col">
          <span className="text-xl font-bold text-gray-900 dark:text-white leading-tight">Note Library</span>
          <span className="text-[10px] uppercase tracking-widest text-blue-600 font-bold">Student Portal</span>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-4 space-y-1 mt-4">
        {navItems.map((item) => {
          const active = isActive(item.path);
          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => setIsSidebarOpen(false)}
              className={`flex items-center justify-between px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200 group ${active
                ? 'bg-blue-600 text-white shadow-md shadow-blue-100 dark:shadow-none'
                : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
                }`}
            >
              <div className="flex items-center gap-3">
                <item.icon className="h-5 w-5" />
                <span>{item.name}</span>
              </div>
              {active && <ChevronRight size={14} />}
            </Link>
          );
        })}
      </nav>

      {/* Bottom Profile & Actions */}
      <div className="p-4 border-t border-gray-100 dark:border-gray-800 space-y-4">
        {/* User Info Card */}
        <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-gray-800 flex items-center justify-center text-blue-600 dark:text-gray-500 font-bold overflow-hidden border-2 border-white dark:border-gray-700">
            {user?.profile_picture ? (
              <img
                src={user.profile_picture.startsWith('http') ? user.profile_picture : `https://notelibraryapp.com${user.profile_picture}`}
                alt=""
                className="w-full h-full object-cover"
              />
            ) : (
              <User size={20} />
            )}
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-sm font-bold text-gray-900 dark:text-white truncate">{user?.name}</span>
            <span className="text-[10px] text-gray-400 truncate">{user?.email}</span>
          </div>
        </div>

        {/* Theme & Logout Actions */}
        <div className="flex items-center justify-between px-2">
          <div className="flex flex-col">
            <span className="text-[10px] uppercase font-bold text-gray-400 tracking-tighter mb-1.5">Theme</span>
            <ThemeSwitcher />
          </div>
          <button
            onClick={() => setShowLogoutConfirm(true)}
            className="p-3 text-gray-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-xl transition-all group"
            title="Logout"
          >
            <LogOut className="h-6 w-6 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </div>

      <ConfirmationModal
        isOpen={showLogoutConfirm}
        onClose={() => setShowLogoutConfirm(false)}
        onConfirm={logout}
        title="Sign Out"
        message="Are you sure you want to sign out of your account? You will need to login again to access your materials."
        confirmText="Sign Out"
        type="danger"
      />
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 flex transition-colors duration-300">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:block w-72 h-screen fixed top-0 left-0 z-40">
        <SidebarContent />
      </aside>

      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 w-full bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 z-30 px-4 h-16 flex items-center justify-between transition-colors duration-300">
        <div className="flex items-center gap-3">
          <img
            src="https://notelibraryapp.com/p.jpg"
            alt="NoteLibrary"
            className="h-8 w-8 rounded-lg object-cover shadow-sm border border-gray-100 dark:border-gray-800"
          />
          <span className="text-lg font-bold text-gray-900 dark:text-white">Note Library</span>
        </div>
        <button
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="p-2 text-gray-500 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
        >
          {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsSidebarOpen(false)}></div>
          <div className="relative w-72 h-full animate-in slide-in-from-left duration-300">
            <SidebarContent />
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 lg:ml-72 min-w-0 transition-all duration-300">
        <main className="p-4 lg:p-10 mt-16 lg:mt-0 max-w-[1600px] mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
