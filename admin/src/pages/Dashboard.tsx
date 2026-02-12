import { useState, useEffect } from 'react';
import { DashboardLayout } from '../components/DashboardLayout';
import { useAuth } from '../context/AuthContext';
import {
  TrendingUp,
  Users as UsersIcon,
  UserCheck,
  UserX,
  Loader2,
  BookOpen,
  Video,
  FileText,
  Bell,
  CreditCard,
  ArrowUpRight,
  Calendar,
  Clock,
  DollarSign,
  CheckCircle,
  XCircle,
  AlertCircle
} from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart
} from 'recharts';

interface DashboardStats {
  users: {
    total: number;
    active: number;
    blocked: number;
    dailySignups: { date: string; count: number }[];
    monthlySignups: { month: string; count: number }[];
  };
  payments: {
    pending: number;
    approved: number;
    rejected: number;
    total: number;
    revenue: number;
    recentPayments: { date: string; count: number; revenue: number }[];
    monthlyRevenue: { month: string; revenue: number; requests: number }[];
  };
}

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
};

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-NP', {
    style: 'currency',
    currency: 'NPR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
};

const formatNumber = (num: number) => {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toString();
};

export const Dashboard = () => {
  const { user, token } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      const response = await fetch('https://notelibraryapp.com/api/admin/getDashboardStats.php', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const result = await response.json();
      if (result.status === 'success') {
        setStats(result.data);
      }
    } catch (err) {
      console.error('Error fetching dashboard stats:', err);
    } finally {
      setLoading(false);
    }
  };

  const userStats = [
    { label: 'Total Users', value: stats?.users.total || 0, icon: UsersIcon, gradient: 'from-blue-500 to-blue-600', iconBg: 'bg-blue-500' },
    { label: 'Active Users', value: stats?.users.active || 0, icon: UserCheck, gradient: 'from-emerald-500 to-emerald-600', iconBg: 'bg-emerald-500' },
    { label: 'Blocked Users', value: stats?.users.blocked || 0, icon: UserX, gradient: 'from-rose-500 to-rose-600', iconBg: 'bg-rose-500' },
  ];

  const paymentStats = [
    { label: 'Pending', value: stats?.payments.pending || 0, icon: AlertCircle, color: 'text-amber-600', bg: 'bg-amber-100' },
    { label: 'Approved', value: stats?.payments.approved || 0, icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-100' },
    { label: 'Rejected', value: stats?.payments.rejected || 0, icon: XCircle, color: 'text-rose-600', bg: 'bg-rose-100' },
  ];

  const quickActions = [
    { label: 'Users', icon: UsersIcon, link: '/users', color: 'text-blue-600 bg-blue-50 hover:bg-blue-100' },
    { label: 'Videos', icon: Video, link: '/videos', color: 'text-purple-600 bg-purple-50 hover:bg-purple-100' },
    { label: 'Books', icon: BookOpen, link: '/books', color: 'text-amber-600 bg-amber-50 hover:bg-amber-100' },
    { label: 'Notices', icon: Bell, link: '/notices', color: 'text-rose-600 bg-rose-50 hover:bg-rose-100' },
    { label: 'Resources', icon: FileText, link: '/resources', color: 'text-teal-600 bg-teal-50 hover:bg-teal-100' },
    { label: 'Payments', icon: CreditCard, link: '/payments', color: 'text-indigo-600 bg-indigo-50 hover:bg-indigo-100' },
  ];

  const last7Days = stats?.users.dailySignups.slice(-7) || [];

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex flex-col justify-center items-center py-24 space-y-4">
          <div className="relative">
            <div className="w-16 h-16 rounded-full border-4 border-blue-100 animate-pulse"></div>
            <Loader2 className="w-16 h-16 animate-spin text-blue-600 absolute top-0 left-0" />
          </div>
          <p className="text-slate-500 font-medium">Loading dashboard...</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
              {getGreeting()}, {user?.name?.split(' ')[0]}!
            </h1>
            <p className="text-slate-500 mt-1 flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Clock className="w-4 h-4" />
            Last updated: {new Date().toLocaleTimeString()}
          </div>
        </div>

        {/* User Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {userStats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <div key={index} className="relative overflow-hidden bg-white rounded-xl p-5 border border-slate-200 shadow-sm hover:shadow-md transition-all group">
                <div className="absolute top-0 right-0 w-24 h-24 transform translate-x-6 -translate-y-6">
                  <div className={`w-full h-full rounded-full bg-gradient-to-br ${stat.gradient} opacity-10 group-hover:opacity-20 transition-opacity`}></div>
                </div>
                <div className="relative z-10 flex items-center gap-4">
                  <div className={`${stat.iconBg} w-12 h-12 rounded-xl flex items-center justify-center shadow-lg`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">{stat.label}</p>
                    <p className="text-2xl font-bold text-slate-900">{formatNumber(stat.value)}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Revenue Overview */}
        <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl p-5 text-white">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <DollarSign className="w-5 h-5" />
              Total Revenue
            </h2>
            <Link to="/payments" className="text-white/80 hover:text-white text-sm flex items-center gap-1">
              View <ArrowUpRight className="w-4 h-4" />
            </Link>
          </div>
          <p className="text-4xl font-bold mb-4">{formatCurrency(stats?.payments.revenue || 0)}</p>
          <div className="grid grid-cols-3 gap-2">
            {paymentStats.map((item, index) => {
              const Icon = item.icon;
              return (
                <div key={index} className="bg-white/20 backdrop-blur-sm rounded-lg p-3 text-center">
                  <Icon className="w-5 h-5 mx-auto mb-1" />
                  <p className="text-xl font-bold">{item.value}</p>
                  <p className="text-xs opacity-80">{item.label}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
            {quickActions.map((action, index) => {
              const Icon = action.icon;
              return (
                <Link key={index} to={action.link} className={`flex flex-col items-center gap-2 p-3 rounded-xl ${action.color} transition-all hover:scale-105`}>
                  <Icon className="w-5 h-5" />
                  <span className="text-xs font-medium">{action.label}</span>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Daily Signups Chart */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                  <TrendingUp className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-slate-900">User Signups</h2>
                  <p className="text-xs text-slate-500">Last 7 days</p>
                </div>
              </div>
              <Link to="/users" className="text-blue-600 hover:text-blue-700 text-sm flex items-center gap-1">
                View <ArrowUpRight className="w-4 h-4" />
              </Link>
            </div>

            {/* Line Chart */}
            {last7Days.length > 0 ? (
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={last7Days.map(d => ({
                      name: new Date(d.date).toLocaleDateString('en-US', { weekday: 'short' }),
                      value: d.count
                    }))}
                    margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="colorBlue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#64748b' }} />
                    <YAxis tick={{ fontSize: 12, fill: '#64748b' }} allowDecimals={false} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#fff',
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                      }}
                      labelStyle={{ fontWeight: 600 }}
                    />
                    <Area
                      type="monotone"
                      dataKey="value"
                      stroke="#3b82f6"
                      strokeWidth={2.5}
                      fill="url(#colorBlue)"
                      dot={{ r: 4, fill: '#fff', stroke: '#3b82f6', strokeWidth: 2 }}
                      activeDot={{ r: 6, fill: '#3b82f6', stroke: '#fff', strokeWidth: 2 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-48 flex items-center justify-center text-slate-400">
                <p>No data available</p>
              </div>
            )}
          </div>

          {/* Monthly Revenue Chart */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center">
                  <DollarSign className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-slate-900">Monthly Revenue</h2>
                  <p className="text-xs text-slate-500">Last 6 months</p>
                </div>
              </div>
            </div>

            {/* Line Chart */}
            {stats?.payments.monthlyRevenue && stats.payments.monthlyRevenue.length > 0 ? (
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={stats.payments.monthlyRevenue.map(m => ({
                      name: new Date(m.month + '-01').toLocaleDateString('en-US', { month: 'short' }),
                      value: m.revenue
                    }))}
                    margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="colorGreen" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#64748b' }} />
                    <YAxis tick={{ fontSize: 12, fill: '#64748b' }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#fff',
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                      }}
                      labelStyle={{ fontWeight: 600 }}
                      formatter={(value) => [`Rs. ${(typeof value === 'number' ? value : 0).toLocaleString()}`, 'Revenue']}
                    />
                    <Area
                      type="monotone"
                      dataKey="value"
                      stroke="#10b981"
                      strokeWidth={2.5}
                      fill="url(#colorGreen)"
                      dot={{ r: 4, fill: '#fff', stroke: '#10b981', strokeWidth: 2 }}
                      activeDot={{ r: 6, fill: '#10b981', stroke: '#fff', strokeWidth: 2 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-48 flex items-center justify-center text-slate-400">
                <p>No revenue data</p>
              </div>
            )}
          </div>
        </div>

        {/* Account Info */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Account Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="flex items-center justify-between py-3 px-4 bg-slate-50 rounded-lg">
              <span className="text-slate-500 text-sm">Name</span>
              <span className="font-medium text-slate-900">{user?.name}</span>
            </div>
            <div className="flex items-center justify-between py-3 px-4 bg-slate-50 rounded-lg">
              <span className="text-slate-500 text-sm">Email</span>
              <span className="font-medium text-slate-900 text-sm truncate max-w-[150px]">{user?.email}</span>
            </div>
            <div className="flex items-center justify-between py-3 px-4 bg-slate-50 rounded-lg">
              <span className="text-slate-500 text-sm">Role</span>
              <span className="px-2 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 capitalize">{user?.role}</span>
            </div>
            <div className="flex items-center justify-between py-3 px-4 bg-slate-50 rounded-lg">
              <span className="text-slate-500 text-sm">Status</span>
              <span className="flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                Active
              </span>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};
