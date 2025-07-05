import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import axios from 'axios';

// Types
interface User {
  id: number;
  name: string;
  email: string;
  role: 'admin' | 'dept_head';
  department?: string;
  created_at: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; message?: string }>;
  signup: (userData: SignupData) => Promise<{ success: boolean; message?: string }>;
  logout: () => void;
  refreshToken: () => Promise<boolean>;
  hasRole: (role: string) => boolean;
  canAccessDepartment: (department?: string) => boolean;
}

interface SignupData {
  name: string;
  email: string;
  password: string;
  role: 'admin' | 'dept_head';
  department?: string;
}

interface AuthResponse {
  access_token: string;
  refresh_token: string;
  user: User;
}

// Create context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Auth provider component
interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [refreshTokenValue, setRefreshTokenValue] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Base API URL
  const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

  // Initialize auth state from localStorage
  useEffect(() => {
    const initializeAuth = () => {
      try {
        const storedToken = localStorage.getItem('access_token');
        const storedRefreshToken = localStorage.getItem('refresh_token');
        const storedUser = localStorage.getItem('user');

        if (storedToken && storedUser) {
          setToken(storedToken);
          setRefreshTokenValue(storedRefreshToken);
          setUser(JSON.parse(storedUser));
          
          // Set default auth header for axios
          axios.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
        // Clear invalid data
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('user');
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, []);

  // Logout function (memoized)
  const logout = useCallback(() => {
    // Clear localStorage
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
    
    // Clear state
    setToken(null);
    setRefreshTokenValue(null);
    setUser(null);
    
    // Clear axios default auth header
    delete axios.defaults.headers.common['Authorization'];
    
    // Optional: Call logout endpoint
    try {
      axios.post(`${API_BASE_URL}/auth/logout`).catch(() => {
        // Ignore errors on logout endpoint call
      });
    } catch (error) {
      // Ignore errors
    }
  }, [API_BASE_URL]);

  // Refresh token function (memoized)
  const refreshToken = useCallback(async (): Promise<boolean> => {
    if (!refreshTokenValue) {
      return false;
    }

    try {
      const response = await axios.post(
        `${API_BASE_URL}/auth/refresh`,
        {},
        {
          headers: {
            Authorization: `Bearer ${refreshTokenValue}`,
          },
        }
      );

      if (response.data.success) {
        const newToken = response.data.data.access_token;
        
        // Update stored token
        localStorage.setItem('access_token', newToken);
        setToken(newToken);
        
        // Update axios default header
        axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
        
        return true;
      }
    } catch (error) {
      console.error('Token refresh failed:', error);
    }

    return false;
  }, [refreshTokenValue, API_BASE_URL]);

  // Setup axios interceptors for token management
  useEffect(() => {
    const setupInterceptors = () => {
      // Request interceptor to add token
      const requestInterceptor = axios.interceptors.request.use(
        (config) => {
          if (token) {
            config.headers.Authorization = `Bearer ${token}`;
          }
          return config;
        },
        (error) => Promise.reject(error)
      );

      // Response interceptor to handle token expiration
      const responseInterceptor = axios.interceptors.response.use(
        (response) => response,
        async (error) => {
          const originalRequest = error.config;

          if (error.response?.status === 401 && !originalRequest._retry && refreshTokenValue) {
            originalRequest._retry = true;

            try {
              const refreshSuccess = await refreshToken();
              if (refreshSuccess) {
                // Retry the original request with new token
                return axios(originalRequest);
              } else {
                // Refresh failed, logout user
                logout();
              }
            } catch (refreshError) {
              logout();
            }
          }

          return Promise.reject(error);
        }
      );

      // Cleanup function
      return () => {
        axios.interceptors.request.eject(requestInterceptor);
        axios.interceptors.response.eject(responseInterceptor);
      };
    };

    const cleanup = setupInterceptors();
    return cleanup;
  }, [token, refreshTokenValue, logout, refreshToken]);

  // Login function
  const login = async (email: string, password: string): Promise<{ success: boolean; message?: string }> => {
    setIsLoading(true);
    
    try {
      const response = await axios.post(`${API_BASE_URL}/auth/login`, {
        email,
        password,
      });

      if (response.data.success) {
        const authData: AuthResponse = response.data.data;
        
        // Store tokens and user data
        localStorage.setItem('access_token', authData.access_token);
        localStorage.setItem('refresh_token', authData.refresh_token);
        localStorage.setItem('user', JSON.stringify(authData.user));
        
        // Update state
        setToken(authData.access_token);
        setRefreshTokenValue(authData.refresh_token);
        setUser(authData.user);
        
        // Set default auth header
        axios.defaults.headers.common['Authorization'] = `Bearer ${authData.access_token}`;
        
        return { success: true };
      } else {
        return { success: false, message: response.data.message || 'Login failed' };
      }
    } catch (error: any) {
      const message = error.response?.data?.message || 'Login failed. Please try again.';
      return { success: false, message };
    } finally {
      setIsLoading(false);
    }
  };

  // Signup function
  const signup = async (userData: SignupData): Promise<{ success: boolean; message?: string }> => {
    setIsLoading(true);
    
    try {
      const response = await axios.post(`${API_BASE_URL}/auth/signup`, userData);

      if (response.data.success) {
        const authData: AuthResponse = response.data.data;
        
        // Store tokens and user data
        localStorage.setItem('access_token', authData.access_token);
        localStorage.setItem('refresh_token', authData.refresh_token);
        localStorage.setItem('user', JSON.stringify(authData.user));
        
        // Update state
        setToken(authData.access_token);
        setRefreshTokenValue(authData.refresh_token);
        setUser(authData.user);
        
        // Set default auth header
        axios.defaults.headers.common['Authorization'] = `Bearer ${authData.access_token}`;
        
        return { success: true };
      } else {
        return { success: false, message: response.data.message || 'Signup failed' };
      }
    } catch (error: any) {
      const message = error.response?.data?.message || 'Signup failed. Please try again.';
      return { success: false, message };
    } finally {
      setIsLoading(false);
    }
  };

  // Role-based access control functions
  const hasRole = (role: string): boolean => {
    if (!user) return false;
    
    // Admin has access to all roles
    if (user.role === 'admin') return true;
    
    return user.role === role;
  };

  const canAccessDepartment = (department?: string): boolean => {
    if (!user) return false;
    
    // Admin can access all departments
    if (user.role === 'admin') return true;
    
    // Department heads can only access their own department
    if (user.role === 'dept_head') {
      return !department || user.department === department;
    }
    
    return false;
  };

  // Computed values
  const isAuthenticated = !!user && !!token;

  // Context value
  const contextValue: AuthContextType = {
    user,
    token,
    isAuthenticated,
    isLoading,
    login,
    signup,
    logout,
    refreshToken,
    hasRole,
    canAccessDepartment,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use auth context
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Higher-order component for role-based access
interface WithAuthProps {
  requiredRole?: string;
  requiredDepartment?: string;
  fallback?: React.ComponentType;
}

export const withAuth = <P extends object>(
  Component: React.ComponentType<P>,
  options: WithAuthProps = {}
) => {
  const { requiredRole, requiredDepartment, fallback: Fallback } = options;

  return (props: P) => {
    const { isAuthenticated, hasRole, canAccessDepartment, isLoading } = useAuth();

    if (isLoading) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
        </div>
      );
    }

    if (!isAuthenticated) {
      if (Fallback) {
        return <Fallback />;
      }
      return null;
    }

    if (requiredRole && !hasRole(requiredRole)) {
      if (Fallback) {
        return <Fallback />;
      }
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h2>
            <p className="text-gray-600">You don't have permission to access this page.</p>
          </div>
        </div>
      );
    }

    if (requiredDepartment && !canAccessDepartment(requiredDepartment)) {
      if (Fallback) {
        return <Fallback />;
      }
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h2>
            <p className="text-gray-600">You don't have permission to access this department's data.</p>
          </div>
        </div>
      );
    }

    return <Component {...props} />;
  };
};

export default AuthContext;