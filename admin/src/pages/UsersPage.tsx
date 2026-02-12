import { useState, useEffect } from 'react';
import { DashboardLayout } from '../components/DashboardLayout';
import { User, UsersResponse } from '../types';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { Loader2, AlertCircle, Eye, X, ShieldAlert, Trash2, User as UserIcon, MapPin, Mail, Phone, BookOpen, GraduationCap, Trophy, AlertTriangle, RefreshCcw } from 'lucide-react';
import toast from 'react-hot-toast';

const API_BASE_URL = 'https://notelibraryapp.com/api/admin';

export const UsersPage = () => {
  const { token } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  // Block/Ban State
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [blockDuration, setBlockDuration] = useState('permanent');
  const [blockConfirmStep, setBlockConfirmStep] = useState(1);
  const [isBlocking, setIsBlocking] = useState(false);

  // Delete State
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmStep, setDeleteConfirmStep] = useState(1);
  const [isDeleting, setIsDeleting] = useState(false);

  // Confirmation State
  const [confirmationInput, setConfirmationInput] = useState('');

  const fetchUsers = async () => {
    if (!token) {
      setError('Authentication token not found');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const response = await axios.get<UsersResponse>(`${API_BASE_URL}/getUsers.php`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.data.success && response.data.users) {
        setUsers(response.data.users);
        setError('');
      } else {
        setError(response.data.message || 'Failed to fetch users');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleBlockAction = async (user: User, action: 'block' | 'unblock') => {
    if (!token) return;
    setIsBlocking(true);
    try {
      const formData = new FormData();
      formData.append('user_id', user.id.toString());
      formData.append('action', action);
      if (action === 'block') {
        formData.append('duration', blockDuration);
      }

      const response = await axios.post(`${API_BASE_URL}/block_user.php`, formData, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.data.success) {
        toast.success(response.data.message);
        setShowBlockModal(false);
        setBlockConfirmStep(1);
        setConfirmationInput('');
        fetchUsers();
      } else {
        toast.error(response.data.message);
      }
    } catch (err) {
      toast.error('Failed to update user status');
    } finally {
      setIsBlocking(false);
    }
  };

  const handleDeleteUser = async (user: User) => {
    if (!token) return;
    setIsDeleting(true);
    try {
      const formData = new FormData();
      formData.append('user_id', user.id.toString());

      const response = await axios.post(`${API_BASE_URL}/delete_user.php`, formData, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.data.success) {
        toast.success('User deleted permanently');
        setShowDeleteModal(false);
        setDeleteConfirmStep(1);
        setConfirmationInput('');
        setSelectedUser(null);
        fetchUsers();
      } else {
        toast.error(response.data.message);
      }
    } catch (err) {
      toast.error('Failed to delete user');
    } finally {
      setIsDeleting(false);
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getUserStatus = (user: User) => {
    const isBlocked = Number(user.blocked) === 1;
    if (!isBlocked) return { type: 'active', label: 'Active' };

    if (!user.banned_until) return { type: 'banned', label: 'Banned Permanently' };

    const isPast = new Date(user.banned_until) < new Date();
    return {
      type: isPast ? 'expired' : 'banned',
      label: isPast ? 'Ban Expired (Locked)' : `Banned until ${new Date(user.banned_until).toLocaleDateString()}`
    };
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Users Management</h1>
            <p className="text-slate-600 mt-2">Manage and monitor all students</p>
          </div>
          <button
            onClick={fetchUsers}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors disabled:bg-slate-400"
          >
            <RefreshCcw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-slate-900" />
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase">User</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Details</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Created At</th>
                    <th className="px-6 py-3 text-center text-xs font-semibold text-slate-600 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {users.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                        No users found
                      </td>
                    </tr>
                  ) : (
                    users.map((user) => (
                      <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center overflow-hidden border border-slate-200">
                              {user.profile_picture ? (
                                <img
                                  src={user.profile_picture.startsWith('http') ? user.profile_picture : `https://notelibraryapp.com${user.profile_picture}`}
                                  className="w-full h-full object-cover"
                                  alt=""
                                />
                              ) : (
                                <UserIcon className="text-slate-400 w-5 h-5" />
                              )}
                            </div>
                            <div className="flex flex-col">
                              <span className="text-sm font-bold text-slate-900">{user.name}</span>
                              <span className="text-xs text-slate-500 font-medium">@{user.username || 'n/a'}</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex flex-col text-sm">
                            <span className="text-slate-900 font-medium">{user.email}</span>
                            <span className="text-slate-500 text-xs">{user.phNo || '-'}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex flex-col">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold w-fit ${user.is_verified ? 'text-green-600 bg-green-50' : 'text-slate-400 bg-slate-50'}`}>
                              {user.is_verified ? 'VERIFIED' : 'PENDING'}
                            </span>
                            {getUserStatus(user).type !== 'active' && (
                              <span className={`inline-flex items-center mt-1 px-2 py-0.5 rounded text-[10px] font-bold w-fit border ${getUserStatus(user).type === 'expired' ? 'bg-amber-50 text-amber-600 border-amber-100' : 'bg-red-50 text-red-600 border-red-100'}`}>
                                {getUserStatus(user).label.toUpperCase()}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 font-medium">
                          {formatDate(user.createdAt)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <button
                            onClick={() => setSelectedUser(user)}
                            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                            title="Detailed Profile"
                          >
                            <Eye className="w-5 h-5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Profile Detail Modal */}
      {selectedUser && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="bg-slate-900 p-8 relative">
              <button
                onClick={() => setSelectedUser(null)}
                className="absolute top-6 right-6 text-slate-400 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-xl"
              >
                <X className="w-6 h-6" />
              </button>

              <div className="flex flex-col md:flex-row items-center gap-6">
                <div className="h-24 w-24 rounded-3xl bg-white/10 p-1 flex items-center justify-center overflow-hidden border-2 border-white/20">
                  {selectedUser.profile_picture ? (
                    <img src={selectedUser.profile_picture.startsWith('http') ? selectedUser.profile_picture : `https://notelibraryapp.com${selectedUser.profile_picture}`} className="w-full h-full object-cover rounded-2xl" alt="" />
                  ) : (
                    <UserIcon className="text-white w-12 h-12 opacity-50" />
                  )}
                </div>
                <div className="text-center md:text-left">
                  <h2 className="text-3xl font-black text-white">{selectedUser.name}</h2>
                  <p className="text-blue-400 font-bold tracking-wider">@{selectedUser.username || 'username'}</p>
                  <div className="flex flex-wrap justify-center md:justify-start gap-4 mt-4">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter border ${selectedUser.is_verified ? 'bg-green-500/20 text-green-400 border-green-500/30' : 'bg-amber-500/20 text-amber-400 border-amber-500/30'}`}>
                      {selectedUser.is_verified ? 'Verified User' : 'Unverified Account'}
                    </span>
                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter border ${selectedUser.role === 'admin' ? 'bg-purple-500/20 text-purple-400 border-purple-500/30' : 'bg-blue-500/20 text-blue-400 border-blue-500/30'}`}>
                      {selectedUser.role} Account
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-8 overflow-y-auto bg-white flex-1">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Contact Info</h4>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 text-slate-600">
                      <Mail size={16} className="text-slate-400" />
                      <span className="text-sm font-medium">{selectedUser.email}</span>
                    </div>
                    <div className="flex items-center gap-3 text-slate-600">
                      <Phone size={16} className="text-slate-400" />
                      <span className="text-sm font-medium">{selectedUser.phNo || 'No phone'}</span>
                    </div>
                    <div className="flex items-center gap-3 text-slate-600">
                      <MapPin size={16} className="text-slate-400" />
                      <span className="text-sm font-medium">{selectedUser.city ? `${selectedUser.city}, ` : ''}{selectedUser.district || 'No location'}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Academic</h4>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 text-slate-600">
                      <BookOpen size={16} className="text-slate-400" />
                      <span className="text-sm font-medium">Level: {selectedUser.class || 'N/A'}</span>
                    </div>
                    <div className="flex items-center gap-3 text-slate-600">
                      <GraduationCap size={16} className="text-slate-400" />
                      <span className="text-sm font-medium">Faculty: {selectedUser.faculty || 'N/A'}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Simple Moderation */}
              <div className="mt-12 pt-8 border-t border-slate-100 flex flex-wrap gap-4">
                <button
                  onClick={() => {
                    if (getUserStatus(selectedUser).type !== 'active') {
                      handleBlockAction(selectedUser, 'unblock');
                    } else {
                      setBlockConfirmStep(1);
                      setShowBlockModal(true);
                    }
                  }}
                  className={`px-6 py-2 rounded-lg font-bold text-xs uppercase tracking-wider transition-colors ${getUserStatus(selectedUser).type !== 'active' ? 'bg-green-600 text-white hover:bg-green-700' : 'bg-slate-900 text-white hover:bg-black'}`}
                >
                  {getUserStatus(selectedUser).type !== 'active' ? 'Remove Restriction' : 'Restrict Account'}
                </button>
                <button
                  onClick={() => {
                    setDeleteConfirmStep(1);
                    setShowDeleteModal(true);
                  }}
                  className="px-6 py-2 bg-red-50 text-red-600 font-bold text-xs uppercase tracking-wider rounded-lg hover:bg-red-100 transition-colors"
                >
                  Delete Permanently
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Block Modal (Double Confirmation) */}
      {showBlockModal && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in zoom-in-95 duration-200">
          <div className="bg-white rounded-[40px] shadow-2xl w-full max-w-lg p-8 relative border-[12px] border-slate-100 overflow-hidden">
            <div className="absolute -top-10 -right-10 p-12 bg-slate-50 rounded-full opacity-50">
              <ShieldAlert className="w-24 h-24 text-slate-200" />
            </div>

            <div className="relative">
              <h3 className="text-3xl font-black text-slate-900 mb-2">
                {blockConfirmStep === 1 ? 'Ban Duration' : 'Hold on! Confirm Ban?'}
              </h3>
              <p className="text-slate-500 font-medium mb-8">
                {blockConfirmStep === 1
                  ? 'How long should this student be restricted from the platform?'
                  : `You are about to ban ${selectedUser?.name} for ${blockDuration}. This will invalidate their current session.`
                }
              </p>

              {blockConfirmStep === 1 ? (
                <div className="grid grid-cols-2 gap-2 mb-8">
                  {[
                    { val: '1h', label: '1 Hour' },
                    { val: '24h', label: '1 Day' },
                    { val: '7d', label: '1 Week' },
                    { val: '30d', label: '1 Month' },
                    { val: 'permanent', label: 'Permanent' }
                  ].map((dur) => (
                    <button
                      key={dur.val}
                      onClick={() => setBlockDuration(dur.val)}
                      className={`px-4 py-3 rounded-xl font-bold text-[10px] uppercase tracking-wider border-2 transition-all ${blockDuration === dur.val ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-400 border-slate-50 hover:border-slate-200'}`}
                    >
                      {dur.label}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="space-y-4 mb-8">
                  <div className="bg-red-50 p-4 rounded-2xl border border-red-100">
                    <p className="text-[10px] font-bold text-red-800 uppercase tracking-widest text-center">Double Verification - Type CONFIRM</p>
                  </div>
                  <input
                    type="text"
                    value={confirmationInput}
                    onChange={(e) => setConfirmationInput(e.target.value)}
                    placeholder="Type CONFIRM here"
                    className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-center font-bold text-slate-900 focus:border-slate-300 focus:outline-none transition-all"
                  />
                </div>
              )}

              <div className="flex flex-col gap-3">
                {blockConfirmStep === 1 ? (
                  <button
                    onClick={() => setBlockConfirmStep(2)}
                    className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold text-sm uppercase tracking-widest hover:bg-blue-700 transition-all"
                  >
                    Next Step
                  </button>
                ) : (
                  <button
                    disabled={confirmationInput !== 'CONFIRM' || isBlocking}
                    onClick={() => handleBlockAction(selectedUser!, 'block')}
                    className="w-full py-4 bg-red-600 text-white rounded-2xl font-bold text-sm uppercase tracking-widest disabled:opacity-50 disabled:cursor-not-allowed hover:bg-red-700 transition-all flex items-center justify-center gap-3"
                  >
                    {isBlocking ? <Loader2 className="animate-spin w-4 h-4" /> : <ShieldAlert size={16} />}
                    Confirm Restriction
                  </button>
                )}
                <button
                  onClick={() => {
                    setShowBlockModal(false);
                    setConfirmationInput('');
                  }}
                  className="w-full py-4 text-slate-400 font-bold text-xs uppercase tracking-widest hover:text-slate-600 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal (Double Confirmation) */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-[100] bg-red-600/20 backdrop-blur-xl flex items-center justify-center p-4">
          <div className="bg-white rounded-[40px] shadow-2xl w-full max-w-lg p-8 border-[12px] border-red-50">
            <div className="flex flex-col items-center text-center">
              <div className="w-20 h-20 bg-red-100 text-red-600 rounded-3xl flex items-center justify-center mb-6 animate-pulse">
                <Trash2 size={40} />
              </div>

              <h3 className="text-3xl font-black text-slate-900 mb-2">
                {deleteConfirmStep === 1 ? 'Permanent Delete?' : 'CRITICAL WARNING!'}
              </h3>
              <p className="text-slate-500 font-medium mb-10">
                {deleteConfirmStep === 1
                  ? `Are you absolutely sure you want to erase ${selectedUser?.name}? This cannot be undone.`
                  : 'Deleting this user will also purge their library activity, quiz logs, and subscription data. Are you 100% sure?'
                }
              </p>

              {deleteConfirmStep === 2 && (
                <div className="space-y-4 mb-8 w-full">
                  <div className="bg-red-50 p-4 rounded-2xl border border-red-100">
                    <p className="text-xs font-bold text-red-800 uppercase tracking-widest text-center">Type CONFIRM to delete</p>
                  </div>
                  <input
                    type="text"
                    value={confirmationInput}
                    onChange={(e) => setConfirmationInput(e.target.value)}
                    placeholder="Type CONFIRM here"
                    className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-center font-bold text-slate-900 focus:border-slate-300 focus:outline-none transition-all"
                  />
                </div>
              )}

              <div className="flex flex-col gap-3 w-full">
                {deleteConfirmStep === 1 ? (
                  <button
                    onClick={() => setDeleteConfirmStep(2)}
                    className="w-full py-4 bg-red-600 text-white rounded-2xl font-bold text-sm uppercase tracking-widest hover:bg-red-700 transition-all shadow-lg shadow-red-500/20"
                  >
                    Understand & Proceed
                  </button>
                ) : (
                  <button
                    disabled={confirmationInput !== 'CONFIRM' || isDeleting}
                    onClick={() => handleDeleteUser(selectedUser!)}
                    className="w-full py-4 bg-red-600 text-white rounded-2xl font-bold text-sm uppercase tracking-widest disabled:opacity-50 disabled:cursor-not-allowed hover:bg-red-700 transition-all flex items-center justify-center gap-3"
                  >
                    {isDeleting ? <Loader2 className="animate-spin w-4 h-4" /> : <Trash2 size={16} />}
                    Execute Wipe
                  </button>
                )}
                <button
                  onClick={() => {
                    setShowDeleteModal(false);
                    setConfirmationInput('');
                  }}
                  className="w-full py-4 text-slate-400 font-bold text-xs uppercase tracking-widest hover:text-slate-600 transition-colors"
                >
                  Abort
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};
