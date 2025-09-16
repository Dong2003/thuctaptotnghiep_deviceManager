import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  setDoc,
} from "firebase/firestore";
import { db } from "../firebase";

export interface UserProfile {
  id: string;
  email: string;
  displayName: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  avatar?: string;
  role: 'center' | 'ward' | 'user';
  wardId?: string;
  wardName?: string;
  isActive: boolean;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserSettings {
  id: string;
  userId: string;
  theme: 'light' | 'dark' | 'system';
  language: 'vi' | 'en';
  notifications: {
    email: boolean;
    push: boolean;
    sms: boolean;
  };
  dashboard: {
    defaultView: 'overview' | 'devices' | 'incidents' | 'reports';
    refreshInterval: number; // in minutes
    showCharts: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface UpdateUserProfileData {
  displayName?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  avatar?: string;
  wardId?: string;
  wardName?: string;
}

export interface UpdateUserSettingsData {
  theme?: 'light' | 'dark' | 'system';
  language?: 'vi' | 'en';
  notifications?: {
    email?: boolean;
    push?: boolean;
    sms?: boolean;
  };
  dashboard?: {
    defaultView?: 'overview' | 'devices' | 'incidents' | 'reports';
    refreshInterval?: number;
    showCharts?: boolean;
  };
}

// User Profile operations
export const createUserProfile = async (
  userId: string,
  email: string,
  displayName: string,
  role: 'center' | 'ward' | 'user',
  wardId?: string,
  wardName?: string
): Promise<string> => {
  try {
    const userProfileData = {
      userId,
      email,
      displayName,
      role,
      wardId: wardId || null,
      wardName: wardName || null,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    const docRef = await addDoc(collection(db, 'userProfiles'), userProfileData);
    
    // Create default settings
    await createUserSettings(userId);
    
    return docRef.id;
  } catch (error: any) {
    throw new Error(error.message || 'Failed to create user profile');
  }
};

export const getUserProfile = async (userId: string): Promise<UserProfile | null> => {
  try {
    const q = query(collection(db, 'userProfiles'), where('userId', '==', userId));
    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
      const doc = querySnapshot.docs[0];
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        lastLoginAt: data.lastLoginAt?.toDate(),
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
      } as UserProfile;
    }
    return null;
  } catch (error: any) {
    throw new Error(error.message || 'Failed to get user profile');
  }
};

export const updateUserProfile = async (
  userId: string,
  data: UpdateUserProfileData
): Promise<void> => {
  try {
    const userDocRef = doc(db, 'users', userId);
    await updateDoc(userDocRef, {
      ...data,
      updatedAt: new Date(),
    });
  } catch (error: any) {
    throw new Error(error.message || 'Failed to update user profile');
  }
};

export const updateLastLogin = async (userId: string): Promise<void> => {
  try {
    const userDocRef = doc(db, 'users', userId);
    await updateDoc(userDocRef, {
      lastLoginAt: new Date(),
      updatedAt: new Date(),
    });
  } catch (error: any) {
    console.error('Failed to update last login:', error);
  }
};

// User Settings operations
export const createUserSettings = async (userId: string): Promise<string> => {
  try {
    const settingsData = {
      userId,
      theme: 'system' as const,
      language: 'vi' as const,
      notifications: {
        email: true,
        push: true,
        sms: false,
      },
      dashboard: {
        defaultView: 'overview' as const,
        refreshInterval: 5,
        showCharts: true,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    const docRef = await addDoc(collection(db, 'userSettings'), settingsData);
    return docRef.id;
  } catch (error: any) {
    throw new Error(error.message || 'Failed to create user settings');
  }
};

export const getUserSettings = async (userId: string): Promise<UserSettings | null> => {
  try {
    const q = query(collection(db, 'userSettings'), where('userId', '==', userId));
    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
      const doc = querySnapshot.docs[0];
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
      } as UserSettings;
    }
    return null;
  } catch (error: any) {
    throw new Error(error.message || 'Failed to get user settings');
  }
};

export const updateUserSettings = async (
  userId: string,
  data: UpdateUserSettingsData
): Promise<void> => {
  try {
    const q = query(collection(db, 'userSettings'), where('userId', '==', userId));
    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
      const docRef = querySnapshot.docs[0].ref;
      await updateDoc(docRef, {
        ...data,
        updatedAt: new Date(),
      });
    } else {
      throw new Error('User settings not found');
    }
  } catch (error: any) {
    throw new Error(error.message || 'Failed to update user settings');
  }
};

// User management operations
export const getUsers = async (
  role?: string,
  wardId?: string,
  isActive?: boolean,
  limitCount: number = 50
): Promise<UserProfile[]> => {
  try {
    let q = query(collection(db, 'users'), orderBy('createdAt', 'desc'), limit(limitCount));
    
    if (role) {
      q = query(q, where('role', '==', role));
    }
    
    if (wardId) {
      q = query(q, where('wardId', '==', wardId));
    }
    
    if (isActive !== undefined) {
      q = query(q, where('isActive', '==', isActive));
    }
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        lastLoginAt: data.lastLoginAt?.toDate(),
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
      } as UserProfile;
    });
  } catch (error: any) {
    throw new Error(error.message || 'Failed to get users');
  }
};

// Create user with Firebase Auth and Firestore profile
export const createUser = async (
  email: string,
  password: string,
  displayName: string,
  role: 'center' | 'ward' | 'user',
  wardId?: string,
  wardName?: string,
  additionalData?: {
    firstName?: string;
    lastName?: string;
    phone?: string;
  }
): Promise<UserProfile> => {
  try {
    // Import Firebase Auth functions
    const { createUserWithEmailAndPassword, updateProfile } = await import('firebase/auth');
    const { auth } = await import('../firebase');
    
    // Create user with email and password
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    
    // Update display name
    await updateProfile(userCredential.user, {
      displayName: displayName,
    });
    
    // Create user document in Firestore
    const userData = {
      email: email,
      displayName: displayName,
      firstName: additionalData?.firstName || '',
      lastName: additionalData?.lastName || '',
      phone: additionalData?.phone || '',
      role: role,
      wardId: wardId || null,
      wardName: wardName || null,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    await setDoc(doc(db, 'users', userCredential.user.uid), userData);
    
    // Create user profile
    await createUserProfile(
      userCredential.user.uid,
      email,
      displayName,
      role,
      wardId,
      wardName
    );
    
    return {
      id: userCredential.user.uid,
      ...userData,
    } as UserProfile;
  } catch (error: any) {
    throw new Error(error.message || 'Failed to create user');
  }
};

export const deactivateUser = async (userId: string): Promise<void> => {
  try {
    const userDocRef = doc(db, 'users', userId);
    await updateDoc(userDocRef, {
      isActive: false,
      updatedAt: new Date(),
    });
  } catch (error: any) {
    throw new Error(error.message || 'Failed to deactivate user');
  }
};

export const activateUser = async (userId: string): Promise<void> => {
  try {
    const userDocRef = doc(db, 'users', userId);
    await updateDoc(userDocRef, {
      isActive: true,
      updatedAt: new Date(),
    });
  } catch (error: any) {
    throw new Error(error.message || 'Failed to activate user');
  }
};

// Statistics
export const getUserStats = async (wardId?: string) => {
  try {
    const users = await getUsers(undefined, wardId);
    
    const stats = {
      total: users.length,
      active: users.filter(u => u.isActive).length,
      inactive: users.filter(u => !u.isActive).length,
      byRole: users.reduce((acc, user) => {
        acc[user.role] = (acc[user.role] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      recentLogins: users.filter(u => 
        u.lastLoginAt && 
        u.lastLoginAt.getTime() > Date.now() - 7 * 24 * 60 * 60 * 1000 // Last 7 days
      ).length,
    };
    
    return stats;
  } catch (error: any) {
    throw new Error(error.message || 'Failed to get user statistics');
  }
};

// Search users
export const searchUsers = async (searchTerm: string, wardId?: string): Promise<UserProfile[]> => {
  try {
    const users = await getUsers(undefined, wardId);
    const searchLower = searchTerm.toLowerCase();
    
    return users.filter(user => 
      user.displayName.toLowerCase().includes(searchLower) ||
      user.email.toLowerCase().includes(searchLower) ||
      (user.firstName && user.firstName.toLowerCase().includes(searchLower)) ||
      (user.lastName && user.lastName.toLowerCase().includes(searchLower))
    );
  } catch (error: any) {
    throw new Error(error.message || 'Failed to search users');
  }
};

// Helper functions
export const getFullName = (user: UserProfile): string => {
  if (user.firstName && user.lastName) {
    return `${user.firstName} ${user.lastName}`;
  }
  return user.displayName;
};

export const getUserRoleDisplayName = (role: string): string => {
  switch (role) {
    case 'center': return 'Trung tâm chuyển đổi số';
    case 'ward': return 'Phường';
    case 'user': return 'Người dùng';
    default: return 'Không xác định';
  }
};

export const getUserRoleColor = (role: string): string => {
  switch (role) {
    case 'center': return 'bg-purple-100 text-purple-800';
    case 'ward': return 'bg-blue-100 text-blue-800';
    case 'user': return 'bg-green-100 text-green-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};

export const getUserStatusColor = (isActive: boolean): string => {
  return isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800';
};
