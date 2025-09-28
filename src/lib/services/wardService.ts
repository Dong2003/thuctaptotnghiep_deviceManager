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
  QueryConstraint,
} from "firebase/firestore";
import { db } from "../firebase";
import { WardRoom } from "./wardRoomService";
export interface Ward {
  id: string;
  name: string;
  code: string;
  district: string;
  city: string;
  address: string;
  phone?: string;
  email?: string;
  population?: number;
  area?: number; // in km²
  contactPerson: string; // thêm trường này
  description?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface WardUser {
  id: string;
  wardId: string;
  wardName: string;
  userId: string;
  userName: string;
  userEmail: string;
  role: 'ward' | 'user'
  roomId?: string;     // phòng ban đang thuộc
  roomName?: string;
  contactPerson: string; // thêm trường này
  isActive: boolean;
  joinedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

// export interface WardRoom {
//   id: string;
//   wardId: string;
//   name: string;
//   description?: string;
//   isActive: boolean;
//   createdAt: Date;
//   updatedAt: Date;
// }


export interface CreateWardData {
  name: string;
  code: string;
  district: string;
  city: string;
  contactPerson: string; // thêm trường này
  address: string;
  phone?: string;
  email?: string;
  population?: number;
  area?: number;
  description?: string;
}

export interface UpdateWardData {
  name?: string;
  code?: string;
  district?: string;
  city?: string;
  address?: string;
  phone?: string;
  email?: string;
  population?: number;
  contactPerson: string; // thêm trường này
  area?: number;
  description?: string;
  isActive?: boolean;
}

export const DEFAULT_ROOMS = [
  "Phòng văn hóa xã hội",
  "Phòng kinh tế",
  "Trung tâm phục vụ hành chính công",
  "Văn phòng UBND - HDND",
];

// Ward CRUD operations
export const createWard = async (data: CreateWardData): Promise<string> => {
  try {
    const wardData = {
      ...data,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Tạo ward
    const docRef = await addDoc(collection(db, "wards"), wardData);

    // Tạo phòng mặc định
    for (const roomName of DEFAULT_ROOMS) {
      const roomData = {
        wardId: docRef.id,
        name: roomName,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      await addDoc(collection(db, "wardRooms"), roomData);
    }

    return docRef.id;
  } catch (error: any) {
    throw new Error(error.message || "Failed to create ward");
  }
};

export const getWard = async (wardId: string): Promise<Ward | null> => {
  try {
    const docRef = doc(db, 'wards', wardId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        ...data,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
      } as Ward;
    }
    return null;
  } catch (error: any) {
    throw new Error(error.message || 'Failed to get ward');
  }
};

// export const getWards = async (isActive?: boolean): Promise<Ward[]> => {
//   try {
//     let q = query(collection(db, 'wards'), orderBy('name', 'asc'));
    
//     if (isActive !== undefined) {
//       q = query(q, where('isActive', '==', isActive));
//     }
    
//     const querySnapshot = await getDocs(q);
//     return querySnapshot.docs.map(doc => {
//       const data = doc.data();
//       return {
//         id: doc.id,
//         ...data,
//         createdAt: data.createdAt?.toDate() || new Date(),
//         updatedAt: data.updatedAt?.toDate() || new Date(),
//       } as Ward;
//     });
//   } catch (error: any) {
//     throw new Error(error.message || 'Failed to get wards');
//   }
// };
export const getWards = async (isActive?: boolean): Promise<Ward[]> => {
  try {
    const querySnapshot = await getDocs(collection(db, 'wards'));
    let wards = querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
      } as Ward;
    });

    if (isActive !== undefined) {
      wards = wards.filter(w => w.isActive === isActive);
    }

    // Sắp xếp theo name
    wards.sort((a, b) => a.name.localeCompare(b.name));

    return wards;
  } catch (error: any) {
    throw new Error(error.message || 'Failed to get wards');
  }
};


export const updateWard = async (wardId: string, data: UpdateWardData): Promise<void> => {
  try {
    const wardRef = doc(db, 'wards', wardId);
    await updateDoc(wardRef, {
      ...data,
      updatedAt: new Date(),
    });
  } catch (error: any) {
    throw new Error(error.message || 'Failed to update ward');
  }
};

export const deleteWard = async (wardId: string): Promise<void> => {
  try {
    // Check if ward has associated devices or users
    const devicesQuery = query(collection(db, 'devices'), where('wardId', '==', wardId), limit(1));
    const devicesSnapshot = await getDocs(devicesQuery);
    
    if (!devicesSnapshot.empty) {
      throw new Error('Cannot delete ward with associated devices');
    }
    
    const usersQuery = query(collection(db, 'wardUsers'), where('wardId', '==', wardId), limit(1));
    const usersSnapshot = await getDocs(usersQuery);
    
    if (!usersSnapshot.empty) {
      throw new Error('Cannot delete ward with associated users');
    }
    
    await deleteDoc(doc(db, 'wards', wardId));
  } catch (error: any) {
    throw new Error(error.message || 'Failed to delete ward');
  }
};

// Ward User operations
export const addWardUser = async (
  wardId: string,
  wardName: string,
  userId: string,
  userName: string,
  userEmail: string,
  

  role: 'ward' | 'user',
    roomId: string = "",
  roomName: string = ""
): Promise<string> => {
  try {
    const wardUserData = {
      wardId,
      wardName,
      userId,
      userName,
      userEmail,
      role,
      roomId ,
      roomName  ,
      isActive: true,
      joinedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    const docRef = await addDoc(collection(db, 'wardUsers'), wardUserData);
    return docRef.id;
  } catch (error: any) {
    throw new Error(error.message || 'Failed to add ward user');
  }
};

// export const getWardUsers = async (wardId: string): Promise<WardUser[]> => {
//   try {
//     const q = query(
//       collection(db, 'wardUsers'),
//       where('wardId', '==', wardId),
//       where('isActive', '==', true),
//       orderBy('joinedAt', 'desc')
//     );
    
//     const querySnapshot = await getDocs(q);
//     return querySnapshot.docs.map(doc => {
//       const data = doc.data();
//       return {
//         id: doc.id,
//         ...data,
//         joinedAt: data.joinedAt?.toDate() || new Date(),
//         createdAt: data.createdAt?.toDate() || new Date(),
//         updatedAt: data.updatedAt?.toDate() || new Date(),
//       } as WardUser;
//     });
//   } catch (error: any) {
//     throw new Error(error.message || 'Failed to get ward users');
//   }
// };
export const getWardUsers = async (wardId?: string): Promise<WardUser[]> => {
  try {
    const constraints: QueryConstraint[] = [];
    if (wardId) constraints.push(where("wardId", "==", wardId));
    const q = query(collection(db, "wardUsers"), ...constraints);
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    } as WardUser));
  } catch (error: any) {
    console.error("getWardUsers error:", error);
    return [];
  }
};

export const updateWardUserRole = async (
  wardUserId: string,
  role: 'ward' | 'user'
): Promise<void> => {
  try {
    const wardUserRef = doc(db, 'wardUsers', wardUserId);
    await updateDoc(wardUserRef, {
      role,
      updatedAt: new Date(),
    });
  } catch (error: any) {
    throw new Error(error.message || 'Failed to update ward user role');
  }
};

export const updateWardUser = async (
  wardId: string,
  wardUserId: string,
  data: Partial<WardUser>
): Promise<void> => {
  try {
    const wardUserRef = doc(db, 'wardUsers', wardUserId);
    await updateDoc(wardUserRef, {
      ...data,
      updatedAt: new Date(),
    });
  } catch (error: any) {
    throw new Error(error.message || 'Failed to update ward user');
  }
};

export const deleteWardUser = async (wardId: string, wardUserId: string): Promise<void> => {
  try {
    const wardUserRef = doc(db, 'wardUsers', wardUserId);
    await deleteDoc(wardUserRef);
  } catch (error: any) {
    throw new Error(error.message || 'Failed to delete ward user');
  }
};

export const removeWardUser = async (wardUserId: string): Promise<void> => {
  try {
    const wardUserRef = doc(db, 'wardUsers', wardUserId);
    await updateDoc(wardUserRef, {
      isActive: false,
      updatedAt: new Date(),
    });
  } catch (error: any) {
    throw new Error(error.message || 'Failed to remove ward user');
  }
};

// Statistics
export const getWardStats = async (wardId: string) => {
  try {
    // Get device count
    const devicesQuery = query(collection(db, 'devices'), where('wardId', '==', wardId));
    const devicesSnapshot = await getDocs(devicesQuery);
    const deviceCount = devicesSnapshot.size;
    
    // Get active device count
    const activeDevicesQuery = query(
      collection(db, 'devices'),
      where('wardId', '==', wardId),
      where('status', '==', 'active')
    );
    const activeDevicesSnapshot = await getDocs(activeDevicesQuery);
    const activeDeviceCount = activeDevicesSnapshot.size;
    
    // Get incident count
    const incidentsQuery = query(collection(db, 'incidents'), where('wardId', '==', wardId));
    const incidentsSnapshot = await getDocs(incidentsQuery);
    const incidentCount = incidentsSnapshot.size;
    
    // Get open incident count
    const openIncidentsQuery = query(
      collection(db, 'incidents'),
      where('wardId', '==', wardId),
      where('status', 'in', ['reported', 'investigating', 'in_progress'])
    );
    const openIncidentsSnapshot = await getDocs(openIncidentsQuery);
    const openIncidentCount = openIncidentsSnapshot.size;
    
    // Get user count
    const usersQuery = query(
      collection(db, 'wardUsers'),
      where('wardId', '==', wardId),
      where('isActive', '==', true)
    );
    const usersSnapshot = await getDocs(usersQuery);
    const userCount = usersSnapshot.size;
    
    return {
      deviceCount,
      activeDeviceCount,
      incidentCount,
      openIncidentCount,
      userCount,
      deviceHealthPercentage: deviceCount > 0 ? Math.round((activeDeviceCount / deviceCount) * 100) : 0,
      incidentResolutionPercentage: incidentCount > 0 ? Math.round(((incidentCount - openIncidentCount) / incidentCount) * 100) : 0,
    };
  } catch (error: any) {
    throw new Error(error.message || 'Failed to get ward statistics');
  }
};

// Search and filter
export const searchWards = async (searchTerm: string): Promise<Ward[]> => {
  try {
    const wards = await getWards(true);
    const searchLower = searchTerm.toLowerCase();
    
    return wards.filter(ward => 
      ward.name.toLowerCase().includes(searchLower) ||
      ward.code.toLowerCase().includes(searchLower) ||
      ward.district.toLowerCase().includes(searchLower) ||
      ward.city.toLowerCase().includes(searchLower)
    );
  } catch (error: any) {
    throw new Error(error.message || 'Failed to search wards');
  }
};

// Helper functions
export const getWardDisplayName = (ward: Ward): string => {
  const parts = [ward.name, ward.district, ward.city].filter(Boolean);
  return parts.join(', ');
};


export const getWardRoleDisplayName = (role: string): string => {
  switch (role) {
    case 'ward': return 'Quản lý Ward';
    case 'user': return 'Người dùng thiết bị';
    default: return 'Không xác định';
  }
};

export const getRoleColor = (role: string): string => {
  switch (role) {
    case 'ward': return 'bg-blue-100 text-blue-800';
    case 'user': return 'bg-green-100 text-green-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};

export const assignUserToRoom = async (
  wardUserId: string,
  roomId: string,
  roomName: string
): Promise<void> => {
  try {
    const wardUserRef = doc(db, "wardUsers", wardUserId);
    await updateDoc(wardUserRef, {
      roomId,
      roomName,
      updatedAt: new Date(),
    });
  } catch (error: any) {
    throw new Error(error.message || "Failed to assign user to room");
  }
};
export const getWardRooms = async (wardId: string): Promise<WardRoom[]> => {
  const ref = collection(db, "wardRooms");
  const q = query(ref, where("wardId", "==", wardId));
  const snap = await getDocs(q);

  return snap.docs.map(doc => ({
    id: doc.id,
    ...(doc.data() as Omit<WardRoom, "id">),
  }));
};

export const getUsersInRoom = async (roomId: string): Promise<WardUser[]> => {
  const q = query(collection(db, "wardUsers"), where("roomId", "==", roomId));
  const snap = await getDocs(q);
  return snap.docs.map(
    (doc) =>
      ({
        id: doc.id,
        ...doc.data(),
      } as WardUser)
  );
};
export const getUnassignedUsers = async (wardId: string): Promise<WardUser[]> => {
  const q = query(
    collection(db, "wardUsers"),
    where("wardId", "==", wardId),
    where("roomId", "==", "")
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as WardUser));
};
