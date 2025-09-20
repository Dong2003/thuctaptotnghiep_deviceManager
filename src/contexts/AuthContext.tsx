import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, AuthState, onAuthStateChange, getAuthErrorMessage } from '../lib/authService';
import { logAuthAction } from '../lib/services/auditLogService';

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, displayName: string, role: 'center' | 'ward' | 'user', wardId?: string) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (data: { displayName?: string; wardId?: string; wardName?: string }) => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  error: string | null;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChange((user) => {
      setUser(user);
      setIsAuthenticated(!!user);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async (email: string, password: string): Promise<void> => {
    try {
      setError(null);
      setLoading(true);
      const { login: loginService } = await import('../lib/authService');
      await loginService({ email, password });
    } catch (err: any) {
      const errorMessage = getAuthErrorMessage(err);
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const register = async (
    email: string, 
    password: string, 
    displayName: string, 
    role: 'center' | 'ward' | 'user',
    wardId?: string
  ): Promise<void> => {
    try {
      setError(null);
      setLoading(true);
      const { register: registerService } = await import('../lib/authService');
      await registerService({ 
        email, 
        password, 
        displayName, 
        role, 
        wardId 
      });
    } catch (err: any) {
      const errorMessage = getAuthErrorMessage(err);
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const logout = async (): Promise<void> => {
    try {
      setError(null);
      setLoading(true);
      
      // Log logout action before actually logging out
      if (user) {
        try {
          await logAuthAction(
            user.id,
            user.email,
            user.displayName,
            user.role,
            'logout',
            {
              ipAddress: 'unknown',
              userAgent: navigator.userAgent,
              timestamp: new Date().toISOString()
            }
          );
        } catch (auditError) {
          console.error('Failed to log logout action:', auditError);
          // Don't throw error to avoid breaking logout flow
        }
      }
      
      const { logout: logoutService } = await import('../lib/authService');
      await logoutService();
    } catch (err: any) {
      const errorMessage = getAuthErrorMessage(err);
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = async (data: { displayName?: string; wardId?: string; wardName?: string }): Promise<void> => {
    try {
      setError(null);
      if (!user) throw new Error('No user logged in');
      
      const { updateAuthUserProfile  } = await import('../lib/authService');
      await updateAuthUserProfile (user.id, data);
    } catch (err: any) {
      const errorMessage = getAuthErrorMessage(err);
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  const changePassword = async (currentPassword: string, newPassword: string): Promise<void> => {
    try {
      setError(null);
      const { changePassword: changePasswordService } = await import('../lib/authService');
      await changePasswordService(currentPassword, newPassword);
    } catch (err: any) {
      const errorMessage = getAuthErrorMessage(err);
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  const resetPassword = async (email: string): Promise<void> => {
    try {
      setError(null);
      const { resetPassword: resetPasswordService } = await import('../lib/authService');
      await resetPasswordService(email);
    } catch (err: any) {
      const errorMessage = getAuthErrorMessage(err);
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  const clearError = () => setError(null);

  const value: AuthContextType = {
    user,
    isAuthenticated,
    loading,
    login,
    register,
    logout,
    updateProfile,
    changePassword,
    resetPassword,
    error,
    clearError,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Hook for checking if user has specific role
export const useRole = (requiredRole?: 'center' | 'ward' | 'user') => {
  const { user, isAuthenticated } = useAuth();
  
  if (!isAuthenticated || !user) {
    return { hasRole: false, isAuthorized: false };
  }
  
  if (!requiredRole) {
    return { hasRole: true, isAuthorized: true };
  }
  
  const hasRole = user.role === requiredRole;
  const isAuthorized = hasRole;
  
  return { hasRole, isAuthorized };
};

// Hook for checking if user belongs to specific ward
export const useWard = (wardId?: string) => {
  const { user, isAuthenticated } = useAuth();
  
  if (!isAuthenticated || !user) {
    return { belongsToWard: false, isAuthorized: false };
  }
  
  if (!wardId) {
    return { belongsToWard: true, isAuthorized: true };
  }
  
  const belongsToWard = user.wardId === wardId;
  const isAuthorized = belongsToWard || user.role === 'center';
  
  return { belongsToWard, isAuthorized };
};
