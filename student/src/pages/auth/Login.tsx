import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { User, Lock, Eye, EyeOff } from 'lucide-react';
import { GoogleLogin } from '@react-oauth/google';
import { jwtDecode } from 'jwt-decode';
import { useAuth } from '../../contexts/AuthContext';

export default function Login() {
  const navigate = useNavigate();
  // Changed to 'identifier' to match the logic (can be username or email)
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, googleLogin } = useAuth();

  const handleGoogleSuccess = async (credentialResponse: any) => {
    try {
      if (credentialResponse.credential) {
        const decoded: any = jwtDecode(credentialResponse.credential);
        const { email, name } = decoded;

        const result = await googleLogin(email, name);

        if (result.success) {
          if (result.status === 'success') {
            navigate('/dashboard');
          } else if (result.status === 'registration_needed') {
            // Redirect to register with pre-filled data
            navigate('/register', { state: { email, name, isGoogle: true } });
          }
        } else {
          setError(result.message || 'Google login failed');
        }
      }
    } catch (err) {
      console.error('Google login error:', err);
      setError('Failed to process Google login');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Pass identifier (username/email) and password to context
      const result = await login(identifier, password);
      if (result.success) {
        navigate('/dashboard');
      } else if (result.status === 'verification_needed') {
        navigate('/verify-otp', { state: { email: result.email } });
      } else {
        setError(result.message || 'Invalid username/email or password');
      }
    } catch (err: any) {
      setError(err.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-950 dark:to-gray-900 flex items-center justify-center px-4 transition-colors duration-500">
      <div className="max-w-md w-full">
        <div className="text-center mb-10 animate-in fade-in slide-in-from-top-4 duration-700">
          <div className="flex justify-center mb-6">
            <div className="p-2 rounded-3xl bg-white dark:bg-gray-800 shadow-inner border border-gray-100 dark:border-gray-800">
              <img
                src="https://notelibraryapp.com/p.jpg"
                alt="NoteLibrary"
                className="h-16 w-16 rounded-2xl object-cover"
              />
            </div>
          </div>
          <h1 className="text-4xl font-black text-gray-900 dark:text-white tracking-tight">Student Portal</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-3 font-medium">Sign in to your account</p>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-xl p-8 border border-gray-100 dark:border-gray-800 animate-in fade-in slide-in-from-bottom-4 duration-700">
          {/* Google Login Button */}
          <div className="mb-6 flex justify-center">
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={() => setError('Google Login Failed')}
              useOneTap={false}
            />
          </div>

          <div className="relative mb-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200 dark:border-gray-800"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-white dark:bg-gray-900 text-gray-500 dark:text-gray-400 font-bold uppercase tracking-widest text-[10px]">Or continue with</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">

            {/* Username/Email Input */}
            <div>
              <label className="block text-xs font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-3">
                Email or Username
              </label>
              <div className="relative group">
                <User className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 dark:text-gray-500 group-focus-within:text-blue-600 transition-colors" />
                <input
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 bg-gray-50 dark:bg-gray-800/50 border-2 border-transparent focus:border-blue-600/20 dark:focus:border-blue-600/20 rounded-2xl text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600 focus:ring-4 focus:ring-blue-600/10 transition-all outline-none"
                  placeholder="Username or Email"
                  required
                />
              </div>
            </div>

            {/* Password Input with Forgot Link */}
            <div>
              <div className="flex justify-between items-center mb-3">
                <label className="block text-xs font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest">
                  Password
                </label>
                <Link
                  to="/forgot-password"
                  className="text-[10px] font-black uppercase tracking-widest text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
                >
                  Forgot Password?
                </Link>
              </div>
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 dark:text-gray-500 group-focus-within:text-blue-600 transition-colors" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-12 pr-12 py-4 bg-gray-50 dark:bg-gray-800/50 border-2 border-transparent focus:border-blue-600/20 dark:focus:border-blue-600/20 rounded-2xl text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600 focus:ring-4 focus:ring-blue-600/10 transition-all outline-none"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-blue-600 transition-colors"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="p-4 bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-900/50 rounded-2xl animate-in shake duration-500">
                <p className="text-sm font-bold text-red-600 dark:text-red-400">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 dark:bg-blue-600 text-white py-4 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-blue-700 dark:hover:bg-blue-500 transition-all shadow-lg shadow-blue-600/20 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
            >
              {loading ? 'Signing In...' : 'Sign In'}
            </button>
          </form>

          <div className="mt-8 text-center">
            <Link
              to="/register"
              className="text-xs font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            >
              Don't have an account? <span className="text-blue-600 dark:text-blue-400">Register</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}