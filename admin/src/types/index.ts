export interface User {
  id: number;
  name: string;
  username?: string;
  email: string;
  phNo?: string;
  district?: string;
  city?: string;
  class?: string;
  faculty?: string;
  competition?: string;
  is_verified?: number;
  role: 'admin' | 'student';
  email_sent?: number;
  blocked?: number;
  banned_until?: string | null;
  profile_picture?: string | null;
  province?: string;
  createdAt?: string;
}

export interface LoginResponse {
  success: boolean;
  message: string;
  user?: User;
  token?: string;
}

export interface UsersResponse {
  success: boolean;
  message?: string;
  users?: User[];
}

export interface BlockUserResponse {
  success: boolean;
  message: string;
}

export interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface Subject {
  id: string; // or number, keeping it flexible as API returns strings often
  subject_name: string;
}

export interface CompetitiveExam {
  id: string;
  exam_name: string;
}

