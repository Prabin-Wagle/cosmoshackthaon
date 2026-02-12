import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Shield } from 'lucide-react';
import axiosClient from '../../api/axiosClient';

export default function VerifyOTP() {
    const navigate = useNavigate();
    const location = useLocation();
    const email = location.state?.email || '';

    const [otp, setOtp] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        setLoading(true);

        if (!email) {
            setError('Email not found. Please register again.');
            setLoading(false);
            return;
        }

        try {
            const formData = new FormData();
            formData.append('email', email);
            formData.append('otp', otp);

            const response = await axiosClient.post(`/api/users/verify_otp.php`, formData);

            if (response.data.status === 'success') {
                setSuccess(response.data.message);
                // Store token if provided
                if (response.data.token) {
                    localStorage.setItem('token', response.data.token);
                }
                // Redirect to login page after 2 seconds
                setTimeout(() => {
                    navigate('/login');
                }, 2000);
            } else {
                setError(response.data.message);
            }
        } catch (err: any) {
            setError(err.response?.data?.message || 'OTP verification failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center px-4">
            <div className="max-w-md w-full">
                <div className="text-center mb-8">
                    <div className="flex justify-center mb-4">
                        <div className="p-2 rounded-3xl bg-white shadow-inner border border-gray-100">
                            <img
                                src="https://notelibraryapp.com/p.jpg"
                                alt="NoteLibrary"
                                className="h-16 w-16 rounded-2xl object-cover"
                            />
                        </div>
                    </div>
                    <h1 className="text-3xl font-bold text-gray-900">Verify Your Email</h1>
                    <p className="text-gray-600 mt-2">
                        We've sent a verification code to <span className="font-medium">{email}</span>
                    </p>
                </div>

                <div className="bg-white rounded-xl shadow-lg p-8 border border-gray-200">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Verification Code
                            </label>
                            <div className="relative">
                                <Shield className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                                <input
                                    type="text"
                                    value={otp}
                                    onChange={(e) => setOtp(e.target.value)}
                                    className="w-full pl-11 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-center text-2xl tracking-widest"
                                    placeholder="000000"
                                    maxLength={6}
                                    required
                                />
                            </div>
                            <p className="text-xs text-gray-500 mt-2">
                                Enter the 6-digit code sent to your email
                            </p>
                        </div>

                        {error && (
                            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                                <p className="text-sm text-red-600">{error}</p>
                            </div>
                        )}

                        {success && (
                            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                                <p className="text-sm text-green-600">{success}</p>
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? 'Verifying...' : 'Verify Email'}
                        </button>
                    </form>

                    <div className="mt-6 text-center space-y-2">
                        <p className="text-sm text-gray-600">
                            Didn't receive the code?{' '}
                            <button className="text-blue-600 hover:text-blue-700 font-medium">
                                Resend Code
                            </button>
                        </p>
                        <Link
                            to="/login"
                            className="block text-sm text-blue-600 hover:text-blue-700 font-medium"
                        >
                            Back to Login
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
