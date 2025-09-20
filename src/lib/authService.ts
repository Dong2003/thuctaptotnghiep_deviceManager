import { Avatar } from '@/components/ui/avatar';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser,
  updateProfile,
  sendPasswordResetEmail,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
} from "firebase/auth";
import { doc, setDoc, getDoc, updateDoc } from "firebase/firestore";
import { auth, db } from "./firebase";
import { getSystemSettings } from '@/lib/services/systemSettingsService';
import { banUser, incrementFailedLogin, resetFailedLogin } from '@/lib/services/userService';

export type UserRole = 'center' | 'ward' | 'user';

export interface User {
  id: string;
  email: string;
  displayName: string;
  role: UserRole;
  wardId?: string; // For ward and user roles
  wardName?: string; // thêm trường này
  isActive: boolean; // thêm trường này để kiểm tra trạng thái
  createdAt: Date;
  updatedAt: Date;
  avatar?: string; // thêm trường này
  isActive?: boolean; // thêm trường này
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials {
  email: string;
  password: string;
  displayName: string;
  role: UserRole;
  wardId?: string;
}

export interface UpdateProfileData {
  displayName?: string;
  wardId?: string;
}

// Convert Firebase user to our User type
const convertFirebaseUser = async (firebaseUser: FirebaseUser): Promise<User | null> => {
<<<<<<< HEAD
  try {
    const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
    if (userDoc.exists()) {
      const userData = userDoc.data();
      return {
        id: firebaseUser.uid,
        email: firebaseUser.email!,
        displayName: firebaseUser.displayName || userData.displayName || '',
        role: userData.role || 'user',
        wardId: userData.wardId,
        avatar: userData.avatar,
        createdAt: userData.createdAt?.toDate() || new Date(),
        updatedAt: userData.updatedAt?.toDate() || new Date(),
      };
=======
  const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
  if (userDoc.exists()) {
    const userData = userDoc.data();
    
    // Kiểm tra trạng thái tài khoản
    if (userData.isActive === false) {
      // Nếu tài khoản bị cấm, đăng xuất người dùng
      await signOut(auth);
      throw new Error('Tài khoản của bạn đã bị vô hiệu hóa. Vui lòng liên hệ quản trị viên.');
>>>>>>> admin
    }
    
    return {
      id: firebaseUser.uid,
      email: firebaseUser.email!,
      displayName: firebaseUser.displayName || userData.displayName || '',
      role: userData.role || 'user',
      wardId: userData.wardId,
      wardName: userData.wardName,
      isActive: userData.isActive !== false, // Mặc định là true nếu không có giá trị
      createdAt: userData.createdAt?.toDate() || new Date(),
      updatedAt: userData.updatedAt?.toDate() || new Date(),
    };
  }
  return null;
};

// Authentication functions
export const login = async (credentials: LoginCredentials): Promise<User> => {
  try {
    const userCredential = await signInWithEmailAndPassword(
      auth,
      credentials.email,
      credentials.password
    );
    
    const user = await convertFirebaseUser(userCredential.user);
    if (!user) {
      throw new Error('User data not found');
    }
    
    // Kiểm tra lại trạng thái tài khoản sau khi convert
    if (!user.isActive) {
      await signOut(auth);
      throw new Error('Tài khoản bạn đã bị cấm');
    }
    // Reset failed attempts on successful login
    await resetFailedLogin(user.id);
    return user;
  } catch (error: any) {
    // On failure: increment failed attempts and potentially ban
    try {
      const settings = await getSystemSettings();
      const attempts = await incrementFailedLogin(credentials.email);
      if (attempts >= settings.maxFailedLogins) {
        // Ban the user (set isActive=false)
        // Need userId, so lookup by email
        // Note: We'll query users collection by email
        const { getDocs, collection, query, where } = await import('firebase/firestore');
        const { db } = await import('./firebase');
        const snap = await getDocs(query(collection(db, 'users'), where('email', '==', credentials.email)));
        if (!snap.empty) {
          await banUser(snap.docs[0].id);
        }
      }
    } catch (_) {
      // swallow secondary errors
    }
    throw new Error(error.message || 'Login failed');
  }
};

export const register = async (credentials: RegisterCredentials): Promise<User> => {
  try {
    // Create user with email and password
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      credentials.email,
      credentials.password
    );
    
    // Update display name
    await updateProfile(userCredential.user, {
      displayName: credentials.displayName,
    });
    
    // Create user document in Firestore
    const userData = {
      email: credentials.email,
      displayName: credentials.displayName,
      role: credentials.role,
      wardId: credentials.wardId || null,
      isActive: true, // Tài khoản mới mặc định là hoạt động
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    await setDoc(doc(db, 'users', userCredential.user.uid), userData);
    
    return {
      id: userCredential.user.uid,
      email: credentials.email,
      displayName: credentials.displayName,
      role: credentials.role,
      wardId: credentials.wardId,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  } catch (error: any) {
    throw new Error(error.message || 'Registration failed');
  }
};

export const logout = async (): Promise<void> => {
  try {
    await signOut(auth);
  } catch (error: any) {
    throw new Error(error.message || 'Logout failed');
  }
};

export const getCurrentUser = async (): Promise<User | null> => {
  if (!auth.currentUser) return null;
  return await convertFirebaseUser(auth.currentUser);
};

export const updateAuthUserProfile = async (userId: string, data: UpdateProfileData): Promise<void> => {
  try {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      ...data,
      updatedAt: new Date(),
    });
    
    // Update Firebase Auth display name if provided
    if (data.displayName && auth.currentUser) {
      await updateProfile(auth.currentUser, {
        displayName: data.displayName,
      });
    }
  } catch (error: any) {
    throw new Error(error.message || 'Profile update failed');
  }
};

export const changePassword = async (currentPassword: string, newPassword: string): Promise<void> => {
  try {
    const user = auth.currentUser;
    if (!user || !user.email) {
      throw new Error('No authenticated user');
    }
    
    // Re-authenticate user
    const credential = EmailAuthProvider.credential(user.email, currentPassword);
    await reauthenticateWithCredential(user, credential);
    
    // Update password
    await updatePassword(user, newPassword);
  } catch (error: any) {
    throw new Error(error.message || 'Password change failed');
  }
};

export const resetPassword = async (email: string): Promise<void> => {
  try {
    await sendPasswordResetEmail(auth, email);
  } catch (error: any) {
    throw new Error(error.message || 'Password reset failed');
  }
};

// Auth state listener
export const onAuthStateChange = (callback: (user: User | null) => void) => {
  return onAuthStateChanged(auth, async (firebaseUser) => {
    if (firebaseUser) {
      try {
        const user = await convertFirebaseUser(firebaseUser);
        callback(user);
      } catch (error: any) {
        // Nếu có lỗi (ví dụ: tài khoản bị vô hiệu hóa), callback với null
        console.error('Auth state change error:', error);
        callback(null);
      }
    } else {
      callback(null);
    }
  });
};

export const getRoleDisplayName = (role: UserRole): string => {
  switch (role) {
    case 'center':
      return 'Trung tâm chuyển đổi số';
    case 'ward':
      return 'Phường';
    case 'user':
      return 'Người dùng';
    default:
      return 'Không xác định';
  }
};

// Error handling helper
export const getAuthErrorMessage = (error: any): string => {
  // Kiểm tra thông báo lỗi tùy chỉnh trước
  if (error.message && (error.message.includes('vô hiệu hóa') || error.message.includes('bị cấm'))) {
    return error.message;
  }
  
  // Map theo code nếu có
  switch (error.code) {
    case 'auth/invalid-credential':
      return 'Sai Email hoặc Mật khẩu vui lòng nhập lại.';
    case 'auth/user-not-found':
      return 'Không tìm thấy tài khoản với email này';
    case 'auth/wrong-password':
      return 'Sai Email hoặc Mật khẩu vui lòng nhập lại.';
    case 'auth/email-already-in-use':
      return 'Email này đã được sử dụng';
    case 'auth/weak-password':
      return 'Mật khẩu quá yếu';
    case 'auth/invalid-email':
      return 'Email không hợp lệ';
    case 'auth/too-many-requests':
      return 'Quá nhiều yêu cầu. Vui lòng thử lại sau';
    case 'auth/network-request-failed':
      return 'Lỗi kết nối mạng';
    default:
      break;
  }
  // Fallback: dò nội dung message của Firebase
  const msg: string = error?.message || '';
  if (msg.includes('auth/invalid-credential') || msg.includes('auth/wrong-password')) {
    return 'Sai Email hoặc Mật khẩu vui lòng nhập lại.';
  }
  if (msg.includes('auth/user-not-found')) {
    return 'Không tìm thấy tài khoản với email này';
  }
  if (msg.includes('auth/invalid-email')) {
    return 'Email không hợp lệ';
  }
  if (msg.includes('auth/too-many-requests')) {
    return 'Quá nhiều yêu cầu. Vui lòng thử lại sau';
  }
  return msg || 'Có lỗi xảy ra';
};
