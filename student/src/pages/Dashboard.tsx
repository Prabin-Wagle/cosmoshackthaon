import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Flame, FileText, EyeOff } from 'lucide-react';
import axiosClient from '../api/axiosClient';
import PomodoroTimer from '../components/PomodoroTimer';
import { Play } from 'lucide-react';
import QuickActions from '../components/QuickActions';
import FocusFlow from '../components/FocusFlow';
import QuoteOfTheDay from '../components/QuoteOfTheDay';

interface Stats {
  streak: number;
  activeQuizzes?: Array<{
    id: number;
    title: string;
    start_time: string;
    end_time: string;
    mode: 'LIVE';
  }> | null;
}

interface ReadingHistory {
  id: number;
  resource_id: number;
  resource_type: string;
  title: string;
  subject: string;
  url: string;
  last_read: string;
}

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<Stats | null>(null);
  const [history, setHistory] = useState<ReadingHistory[]>([]);
  const [dismissedHistory, setDismissedHistory] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [statsRes, historyRes] = await Promise.all([
          axiosClient.get(`/api/users/get_dashboard_stats.php`, { params: { user_id: user?.id } }),
          axiosClient.get(`/api/users/get_reading_history.php`, { params: { limit: 4 } })
        ]);

        if (statsRes.data.status === 'success') {
          setStats(statsRes.data);
        }
        if (historyRes.data.status === 'true') {
          setHistory(historyRes.data.data);
        }
      } catch (error) {
        console.error('Dashboard data fetch failed:', error);
      } finally {
        setLoading(false);
      }
    };

    if (user?.id) fetchDashboardData();
  }, [user?.id]);

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-gray-500 font-bold uppercase tracking-widest text-[10px]">Synchronizing your brain...</p>
      </div>
    </div>
  );

  return (
    <div className="space-y-8 pb-20 animate-in fade-in duration-700">
      {/* Top Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">Dashboard</h1>
        </div>

        <div className="flex items-center gap-3">
          {/* Streak Display */}
          <div className="flex items-center gap-2 bg-orange-50 dark:bg-orange-950/20 px-4 py-2 rounded-2xl border border-orange-100 dark:border-orange-900/30 group">
            <Flame size={20} className="text-orange-500 group-hover:animate-bounce" />
            <div className="flex flex-col">
              <span className="text-[10px] font-black uppercase tracking-widest text-orange-600 dark:text-orange-400 leading-none">{stats?.streak || 0} DAY</span>
              <span className="text-[8px] font-bold text-orange-400 dark:text-orange-600 uppercase tracking-widest mt-0.5">STREAK</span>
            </div>
          </div>

          <div className="h-10 w-[1px] bg-gray-100 dark:bg-gray-800 mx-2" />

          <div className="hidden sm:flex items-center gap-3 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 px-4 py-2 rounded-2xl shadow-sm">
            <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 font-black text-xs uppercase overflow-hidden border-2 border-white dark:border-gray-800">
              {user?.profile_picture ? (
                <img
                  src={user.profile_picture.startsWith('http') ? user.profile_picture : `https://notelibraryapp.com${user.profile_picture}`}
                  alt=""
                  className="w-full h-full object-cover"
                />
              ) : (
                user?.name.charAt(0)
              )}
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest text-gray-900 dark:text-white truncate">
              {user?.name.split(' ')[0]}
            </span>
          </div>
        </div>
      </div>


      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Quiz Alerts, Motivation, Quick Actions */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          {/* Recently Viewed (Notification Style) */}
          {history.length > 0 && !dismissedHistory && (
            <div className="animate-in fade-in slide-in-from-top-4 duration-1000 relative">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 dark:text-gray-500">Pick up where you left off</h2>
                <button
                  onClick={() => setDismissedHistory(true)}
                  className="flex items-center gap-1.5 px-3 py-1 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full text-gray-400 dark:text-gray-500 transition-all group/hide"
                  title="Hide History"
                >
                  <EyeOff size={10} className="group-hover/hide:scale-110 transition-transform" />
                  <span className="text-[9px] font-black uppercase tracking-widest">Hide</span>
                </button>
              </div>
              <div className="flex">
                {(() => {
                  const item = history[0];
                  const Icon = item.resource_type === 'notice' ? Play : FileText;
                  const colorClass = item.resource_type === 'book' ? 'text-red-500 bg-red-500/10' :
                    item.resource_type === 'notice' ? 'text-blue-500 bg-blue-500/10' :
                      'text-green-500 bg-green-500/10';

                  const handleHistoryNavigate = () => {
                    if (item.resource_type === 'notice') {
                      navigate('/notices');
                    } else if (item.resource_type === 'book') {
                      navigate('/books');
                    } else {
                      navigate(`/subjects/${encodeURIComponent(item.subject)}/${item.resource_type}`);
                    }
                  };

                  return (
                    <button
                      onClick={handleHistoryNavigate}
                      className="flex items-center gap-4 p-4 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl hover:shadow-xl transition-all text-left group w-full sm:max-w-sm"
                    >
                      <div className={`p-2.5 rounded-xl ${colorClass} group-hover:scale-110 transition-transform`}>
                        <Icon size={18} />
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-xs font-black text-gray-900 dark:text-white truncate uppercase tracking-tight leading-none mb-1">
                          {item.title}
                        </h3>
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest truncate">
                            {item.subject || item.resource_type}
                          </span>
                          <span className="w-1 h-1 bg-gray-300 dark:bg-gray-700 rounded-full" />
                          <span className="text-[9px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest group-hover:underline">
                            Resume
                          </span>
                        </div>
                      </div>
                    </button>
                  );
                })()}
              </div>
            </div>
          )}

          {/* Upcoming/Active Quiz Alerts */}
          {stats?.activeQuizzes && stats.activeQuizzes.length > 0 && (() => {
            const validQuizzes = stats.activeQuizzes.filter((quiz) => {
              const endTime = new Date(quiz.end_time.replace(' ', 'T'));
              return new Date() <= endTime;
            });

            if (validQuizzes.length === 0) return null;

            const isSingle = validQuizzes.length === 1;

            return (
              <div className={isSingle ? '' : 'grid grid-cols-1 md:grid-cols-2 gap-4'}>
                {validQuizzes.map((quiz) => {
                  const startTime = new Date(quiz.start_time.replace(' ', 'T'));
                  const endTime = new Date(quiz.end_time.replace(' ', 'T'));
                  const now = new Date();

                  const isActive = now >= startTime && now <= endTime;

                  const statusConfig = isActive
                    ? { bg: 'bg-red-600', text: 'Quiz Active', sub: 'In Progress', pulse: true }
                    : { bg: 'bg-indigo-600', text: 'Upcoming', sub: 'Scheduled', pulse: false };

                  return (
                    <div
                      key={quiz.id}
                      className={`bg-gradient-to-r ${isActive ? 'from-red-600/10 via-red-500/5 to-red-600/10 border-red-100 dark:border-red-900/40' : 'from-indigo-600/10 via-indigo-500/5 to-indigo-600/10 border-indigo-100 dark:border-indigo-900/40'} border rounded-2xl ${isSingle ? 'p-6 rounded-3xl' : 'p-4'} text-center animate-in slide-in-from-top-4 duration-700 shadow-sm transition-all hover:shadow-md`}
                    >
                      <div className="flex items-center justify-center gap-2 mb-2">
                        <div className={`flex items-center gap-1.5 ${statusConfig.bg} text-white px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest ${statusConfig.pulse ? 'animate-pulse' : ''}`}>
                          <span className={`w-1 h-1 bg-white rounded-full ${statusConfig.pulse ? 'animate-ping' : ''}`} />
                          {statusConfig.text}
                        </div>
                        <span className={`text-[9px] font-bold uppercase tracking-widest ${isActive ? 'text-red-500' : 'text-indigo-500'}`}>
                          {statusConfig.sub}
                        </span>
                      </div>
                      <p className={`${isSingle ? 'text-lg md:text-xl' : 'text-sm md:text-base'} font-black text-gray-900 dark:text-white mb-2 leading-tight truncate`}>
                        {quiz.title}
                      </p>
                      <div className="flex flex-col items-center gap-2">
                        <div className={`flex items-center justify-center gap-2 text-gray-500 dark:text-gray-400 font-bold uppercase tracking-widest ${isSingle ? 'text-[9px]' : 'text-[8px]'}`}>
                          <span>{startTime.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })}</span>
                          <span className="w-1 h-1 bg-gray-300 dark:bg-gray-700 rounded-full" />
                          <span className={isActive ? 'text-red-600 dark:text-red-400' : 'text-indigo-600 dark:text-indigo-400'}>
                            {isActive
                              ? `Ends ${endTime.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: true })}`
                              : `Starts ${startTime.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: true })}`
                            }
                          </span>
                        </div>

                        {isActive && (
                          <button
                            onClick={() => navigate(`/test-series/quiz/${quiz.id}`)}
                            className={`flex items-center gap-2 ${isSingle ? 'px-5 py-2' : 'px-3 py-1.5'} bg-red-600 hover:bg-red-700 text-white rounded-xl font-black uppercase tracking-widest ${isSingle ? 'text-[9px]' : 'text-[8px]'} transition-all shadow-lg shadow-red-600/20 hover:-translate-y-0.5`}
                          >
                            <Play size={isSingle ? 12 : 10} fill="white" />
                            Take Quiz
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}

          {/* Motivation & Quick Actions move here when no quizzes or below quizzes */}
          <QuoteOfTheDay />
          <QuickActions />
        </div>

        {/* Right Column: Pomodoro Timer (Always Top Right) */}
        <div className="lg:col-span-4 sticky top-6 self-start">
          <PomodoroTimer />
        </div>
      </div>

      <FocusFlow />
    </div>
  );
}
