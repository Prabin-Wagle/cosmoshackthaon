import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Shield, Eye, EyeOff } from 'lucide-react';
import axiosClient from '../api/axiosClient';

export default function ChangePassword() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const [showOldPassword, setShowOldPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const [formData, setFormData] = useState({
        old_password: '',
        new_password: '',
        confirm_password: '',
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value,
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        // Validate passwords match
        if (formData.new_password !== formData.confirm_password) {
            setError('New passwords do not match');
            return;
        }

        // Validate password strength
        if (formData.new_password.length < 6) {
            setError('New password must be at least 6 characters long');
            return;
        }

        setLoading(true);

        try {
            const formDataToSend = new FormData();
            formDataToSend.append('old_password', formData.old_password);
            formDataToSend.append('new_password', formData.new_password);

            const response = await axiosClient.post(`/api/users/change_password.php`, formDataToSend);

            if (response.data.status === 'success') {
                setSuccess(response.data.message);
                // Clear form
                setFormData({
                    old_password: '',
                    new_password: '',
                    confirm_password: '',
                });
                // Redirect to dashboard after 2 seconds
                setTimeout(() => {
                    navigate('/dashboard');
                }, 2000);
            } else {
                setError(response.data.message);
            }
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to change password. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-950 dark:to-gray-900 flex items-center justify-center px-4 transition-colors duration-500">
            <div className="max-w-md w-full">
                <div className="text-center mb-10 animate-in fade-in slide-in-from-top-4 duration-700">
                    <div className="flex justify-center mb-6">
                        <div className="p-4 rounded-3xl bg-blue-600/10 dark:bg-blue-600/20 shadow-inner">
                            <Shield className="h-16 w-16 text-blue-600 dark:text-blue-500" />
                        </div>
                    </div>
                    <h1 className="text-4xl font-black text-gray-900 dark:text-white tracking-tight">Change Password</h1>
                    <p className="text-gray-600 dark:text-gray-400 mt-3 font-medium">Update your account security</p>
                </div>

                <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-xl p-8 border border-gray-100 dark:border-gray-800 animate-in fade-in slide-in-from-bottom-4 duration-700">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label className="block text-xs font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-3">
                                Current Password
                            </label>
                            <div className="relative group">
                                <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 dark:text-gray-500 group-focus-within:text-blue-600 transition-colors" />
                                <input
                                    type={showOldPassword ? "text" : "password"}
                                    name="old_password"
                                    value={formData.old_password}
                                    onChange={handleChange}
                                    className="w-full pl-12 pr-12 py-4 bg-gray-50 dark:bg-gray-800/50 border-2 border-transparent focus:border-blue-600/20 dark:focus:border-blue-600/20 rounded-2xl text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600 focus:ring-4 focus:ring-blue-600/10 transition-all outline-none"
                                    placeholder="••••••••"
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowOldPassword(!showOldPassword)}
                                    className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-blue-600 transition-colors"
                                >
                                    {showOldPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-3">
                                New Password
                            </label>
                            <div className="relative group">
                                <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 dark:text-gray-500 group-focus-within:text-blue-600 transition-colors" />
                                <input
                                    type={showNewPassword ? "text" : "password"}
                                    name="new_password"
                                    value={formData.new_password}
                                    onChange={handleChange}
                                    className="w-full pl-12 pr-12 py-4 bg-gray-50 dark:bg-gray-800/50 border-2 border-transparent focus:border-blue-600/20 dark:focus:border-blue-600/20 rounded-2xl text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600 focus:ring-4 focus:ring-blue-600/10 transition-all outline-none"
                                    placeholder="••••••••"
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowNewPassword(!showNewPassword)}
                                    className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-blue-600 transition-colors"
                                >
                                    {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-3">
                                Confirm New Password
                            </label>
                            <div className="relative group">
                                <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 dark:text-gray-500 group-focus-within:text-blue-600 transition-colors" />
                                <input
                                    type={showConfirmPassword ? "text" : "password"}
                                    name="confirm_password"
                                    value={formData.confirm_password}
                                    onChange={handleChange}
                                    className="w-full pl-12 pr-12 py-4 bg-gray-50 dark:bg-gray-800/50 border-2 border-transparent focus:border-blue-600/20 dark:focus:border-blue-600/20 rounded-2xl text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600 focus:ring-4 focus:ring-blue-600/10 transition-all outline-none"
                                    placeholder="••••••••"
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                    className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-blue-600 transition-colors"
                                >
                                    {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </div>

                        {error && (
                            <div className="p-4 bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-900/50 rounded-2xl animate-in shake duration-500">
                                <p className="text-sm font-bold text-red-600 dark:text-red-400">{error}</p>
                            </div>
                        )}

                        {success && (
                            <div className="p-4 bg-green-50 dark:bg-green-950/30 border border-green-100 dark:border-green-900/50 rounded-2xl animate-in zoom-in duration-500">
                                <p className="text-sm font-bold text-green-600 dark:text-green-400">{success}</p>
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-blue-600 dark:bg-blue-600 text-white py-4 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-blue-700 dark:hover:bg-blue-500 transition-all shadow-lg shadow-blue-600/20 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
                        >
                            {loading ? 'Changing Password...' : 'Change Password'}
                        </button>
                    </form>

                    <div className="mt-8 text-center">
                        <button
                            onClick={() => navigate('/dashboard')}
                            className="text-xs font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                        >
                            <span className="mr-2">←</span> Back to Dashboard
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
