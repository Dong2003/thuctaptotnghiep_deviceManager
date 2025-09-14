// Re-export types and functions from authService for backward compatibility
export type { UserRole, User, AuthState, LoginCredentials, RegisterCredentials, UpdateProfileData } from './authService';
export {
  login,
  register,
  logout,
  getCurrentUser,
  updateAuthUserProfile as updateUserProfile,
  changePassword,
  resetPassword,
  onAuthStateChange,
  getRoleDisplayName,
  getAuthErrorMessage,
} from './authService';

// Legacy mock users for testing (can be removed when fully migrated to Firebase)
export const mockUsers = [
  {
    id: '1',
    username: 'center_admin',
    password: 'admin123',
    role: 'center' as const,
    name: 'Quản trị viên Trung tâm',
  },
  {
    id: '2',
    username: 'ward_ba_dinh',
    password: 'ward123',
    role: 'ward' as const,
    name: 'Phường Ba Đình',
    wardId: 'ward_1',
  },
  {
    id: '3',
    username: 'ward_hoan_kiem',
    password: 'ward123',
    role: 'ward' as const,
    name: 'Phường Hoàn Kiếm',
    wardId: 'ward_2',
  },
  {
    id: '4',
    username: 'user_nguyen_van_a',
    password: 'user123',
    role: 'user' as const,
    name: 'Nguyễn Văn A',
    wardId: 'ward_1',
  },
  {
    id: '5',
    username: 'user_tran_thi_b',
    password: 'user123',
    role: 'user' as const,
    name: 'Trần Thị B',
    wardId: 'ward_2',
  },
];

// Legacy functions for backward compatibility (deprecated - use authService instead)
export const legacyLogin = (username: string, password: string) => {
  const user = mockUsers.find(u => u.username === username && u.password === password);
  if (user) {
    localStorage.setItem('auth_user', JSON.stringify(user));
    return user;
  }
  return null;
};

export const legacyLogout = (): void => {
  localStorage.removeItem('auth_user');
};

export const legacyGetCurrentUser = () => {
  const userData = localStorage.getItem('auth_user');
  return userData ? JSON.parse(userData) : null;
};