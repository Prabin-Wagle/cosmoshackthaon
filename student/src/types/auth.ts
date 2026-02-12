export interface User {
  id: string;
  name: string;
  username: string;
  email: string;
  phNo: string;
  province: string;
  district: string;
  city: string;
  class: string;
  faculty: string;
  competition: string;
  role: string;
  profile_picture?: string | null;
}

export interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<{ success: boolean; status?: string; email?: string; message?: string }>;
  googleLogin: (email: string, name: string) => Promise<{ success: boolean; status?: string; message?: string }>;
  register: (data: RegisterFormData) => Promise<boolean>;
  logout: () => void;
  updateUser: (userData: Partial<User>, newToken?: string) => void;
  isAuthenticated: boolean;
}

export interface RegisterFormData {
  name: string;
  username: string;
  email: string;
  phNo: string;
  province: string;
  district: string;
  city: string;
  password: string;
  class: string;
  faculty: string;
  competition: string;
}
