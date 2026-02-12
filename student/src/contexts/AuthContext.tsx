import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import type { User, AuthContextType, RegisterFormData } from '../types/auth';
import axiosClient from '../api/axiosClient';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Load user from localStorage on mount
  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    const storedToken = localStorage.getItem('token');

    if (storedUser && storedToken) {
      setUser(JSON.parse(storedUser));
      setToken(storedToken);
    }
    setLoading(false);
  }, []);

  const login = async (email: string, password: string): Promise<{ success: boolean; status?: string; email?: string; message?: string }> => {
    try {
      const formData = new FormData();
      formData.append('email', email);
      formData.append('password', password);

      const response = await axiosClient.post(`/api/users/login.php`, formData);

      if (response.data.status === 'success' && response.data.user && response.data.token) {
        setUser(response.data.user);
        setToken(response.data.token);
        localStorage.setItem('user', JSON.stringify(response.data.user));
        localStorage.setItem('token', response.data.token);
        return { success: true, status: 'success' };
      } else if (response.data.status === 'verification_needed') {
        return { success: false, status: 'verification_needed', email: response.data.email, message: response.data.message };
      }
      return { success: false, message: response.data.message || 'Invalid username/email or password' };
    } catch (error: any) {
      console.error('Login error:', error);
      return { success: false, message: error.response?.data?.message || 'Login failed. Please try again.' };
    }
  };

  const googleLogin = async (email: string, name: string): Promise<{ success: boolean; status?: string; message?: string }> => {
    try {
      const formData = new FormData();
      formData.append('email', email);
      formData.append('name', name);

      const response = await axiosClient.post(`/api/users/google_login.php`, formData);

      if (response.data.status === 'success' && response.data.user && response.data.token) {
        setUser(response.data.user);
        setToken(response.data.token);
        localStorage.setItem('user', JSON.stringify(response.data.user));
        localStorage.setItem('token', response.data.token);
        return { success: true, status: 'success' };
      } else if (response.data.status === 'registration_needed') {
        return { success: true, status: 'registration_needed' };
      }

      return { success: false, message: response.data.message };
    } catch (error: any) {
      console.error('Google login error:', error);
      return { success: false, message: error.response?.data?.message || 'Google login failed' };
    }
  };

  const register = async (data: RegisterFormData): Promise<boolean> => {
    try {
      const formData = new FormData();
      Object.entries(data).forEach(([key, value]) => {
        formData.append(key, value);
      });

      const response = await axiosClient.post(`/api/users/register.php`, formData);

      if (response.data.status === 'success') {
        // Don't auto-login, user needs to verify OTP first
        return true;
      }
      return false;
    } catch (error) {
      console.error('Register error:', error);
      return false;
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('user');
    localStorage.removeItem('token');
  };

  const updateUser = (userData: Partial<User>, newToken?: string) => {
    if (newToken) {
      setToken(newToken);
      localStorage.setItem('token', newToken);
    }
    setUser(prev => {
      if (!prev) return null;
      const updated = { ...prev, ...userData };
      localStorage.setItem('user', JSON.stringify(updated));
      return updated;
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, token, login, googleLogin, register, logout, updateUser, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
