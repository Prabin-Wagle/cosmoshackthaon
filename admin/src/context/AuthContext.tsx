import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import axios from 'axios';
import { User, LoginResponse, AuthContextType } from '../types';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const API_BASE_URL = 'https://notelibraryapp.com/api/admin';

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const storedUser = localStorage.getItem('adminUser');
    const storedToken = localStorage.getItem('adminToken');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    if (storedToken) {
      setToken(storedToken);
    }
    setIsLoading(false);
  }, []);

  // Axios interceptor to handle 401 Unauthorized globally
  useEffect(() => {
    const interceptor = axios.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response && error.response.status === 401) {
          // Token expired or invalid
          logout();
        }
        return Promise.reject(error);
      }
    );

    return () => {
      axios.interceptors.response.eject(interceptor);
    };
  }, []); // Empty dependency array relying on logout (which is stable) or recreation is fine


  const login = async (email: string, password: string) => {
    try {
      const response = await axios.post<LoginResponse>(
        `${API_BASE_URL}/login.php`,
        { email, password }
      );

      if (response.data.success && response.data.user && response.data.token) {
        setUser(response.data.user);
        setToken(response.data.token);
        localStorage.setItem('adminUser', JSON.stringify(response.data.user));
        localStorage.setItem('adminToken', response.data.token);
      } else {
        throw new Error(response.data.message || 'Login failed');
      }
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.data?.message) {
        throw new Error(error.response.data.message);
      }
      throw new Error('Network error. Please try again.');
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('adminUser');
    localStorage.removeItem('adminToken');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        login,
        logout,
        isAuthenticated: !!user,
        isLoading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
