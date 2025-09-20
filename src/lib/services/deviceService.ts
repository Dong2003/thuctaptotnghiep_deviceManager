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
  startAfter,
  Timestamp,
  deleteField ,
  onSnapshot,
  QueryConstraint,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { db, storage } from "../firebase";
import { UserProfile } from './userService';
export interface Device {
  id: string;
  name: string;
  type?: string; 
  status: 'active' | 'inactive' | 'maintenance' | 'error';
  location: string;
  wardId: string;
  wardName: string;
  vendor?: string;
  description?: string;
  specifications?: {
    cpu?: string;
    ram?: string;
    storage?: string;
    gpu?: string;
    os?: string;
    brand?: string;
    model?: string;
    serialNumber?: string;
    ipAddress?: string;
    macAddress?: string;
  };
  installationDate: Date;
  lastMaintenance?: Date;
  nextMaintenance?: Date;
  images?: string[];
  createdBy: string;
  assignedTo?: string;
  assignedToName?: string;
  createdAt: Date;
  updatedAt: Date;
}
export interface CreateDeviceData {
  name: string;
  type?: string; 
  location: string;
  wardId: string;
  wardName: string;
  vendor?: string; // Nhà cung cấp
  description?: string;
  specifications?: {
    cpu?: string;
    ram?: string;
    storage?: string;
    gpu?: string;
    os?: string;
    brand?: string;
    model?: string;
    serialNumber?: string;
    ipAddress?: string;
    macAddress?: string;
  };
  installationDate: Date;
  images?: string[];
}

export interface UpdateDeviceData {
  name?: string;
  type?: string;
  status?: 'active' | 'inactive' | 'maintenance' | 'error';
  location?: string;
  wardId?: string;
  wardName?: string;
  vendor?: string;
  description?: string;
  specifications?: {
    cpu?: string;
    ram?: string;
    storage?: string;
    gpu?: string;
    os?: string;
    brand?: string;
    model?: string;
    serialNumber?: string;
    ipAddress?: string;
    macAddress?: string;
  };
  lastMaintenance?: Date | string;
  nextMaintenance?: Date | string;
  images?: string[];
  assignedTo?: string;
  assignedToName?: string;
}

// Device CRUD operations
export const createDevice = async (data: CreateDeviceData, createdBy: string): Promise<string> => {
  try {
    const deviceData = {
      ...data,
      status: 'active' as const,
      createdBy,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    const docRef = await addDoc(collection(db, 'devices'), deviceData);
    return docRef.id;
  } catch (error: any) {
    throw new Error(error.message || 'Failed to create device');
  }
};


const buildDeviceConstraints = (
  wardId?: string,
  onlyUnassigned?: boolean,
  limitCount: number = 50
): QueryConstraint[] => {
  const constraints: QueryConstraint[] = [];

  // Chỉ thêm where conditions, không thêm orderBy để tránh lỗi composite index
  if (wardId) {
    constraints.push(where("wardId", "==", wardId));
  }
  
  if (onlyUnassigned) {
    constraints.push(where("assignedTo", "==", null));
  }

  // Thêm limit nhưng không orderBy để tránh lỗi composite index
  constraints.push(limit(limitCount));

  return constraints;
};

export const getDevices = async (
  wardId?: string,
  onlyUnassigned?: boolean,
  limitCount: number = 50
): Promise<Device[]> => {
  try {
    const constraints = buildDeviceConstraints(wardId, onlyUnassigned, limitCount);
    const q = query(collection(db, "devices"), ...constraints);
    const snapshot = await getDocs(q);

    const devices = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        name: data.name || "Unknown",
        type: data.type,
        status: data.status || "inactive",
        location: data.location || "",
        wardId: data.wardId || "",
        wardName: data.wardName || "",
        vendor: data.vendor,
        description: data.description,
        specifications: data.specifications,
        installationDate: data.installationDate?.toDate() || new Date(),
        lastMaintenance: data.lastMaintenance?.toDate(),
        nextMaintenance: data.nextMaintenance?.toDate(),
        images: data.images || [],
        createdBy: data.createdBy || "",
        assignedTo: data.assignedTo,
        assignedToName: data.assignedToName,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
      } as Device;
    });

    // Sort trong JavaScript thay vì Firestore để tránh lỗi composite index
    return devices.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  } catch (error: any) {
    throw new Error(error.message || "Failed to get devices");
  }
};

export const listenDevices = (
  callback: (devices: { available: Device[], inUse: Device[] }) => void,
  wardId?: string,
  limitCount: number = 50
) => {
  const constraints = [
    limit(limitCount),
    wardId ? where("wardId", "==", wardId) : undefined
  ].filter(Boolean) as QueryConstraint[];

  const q = query(collection(db, "devices"), ...constraints);

  const unsubscribe = onSnapshot(q, snapshot => {
    const allDevices: Device[] = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        name: data.name || "Unknown",
        type: data.type,
        status: data.status || "inactive",
        location: data.location || "",
        wardId: data.wardId || "",
        wardName: data.wardName || "",
        vendor: data.vendor,
        description: data.description,
        specifications: data.specifications,
        installationDate: data.installationDate?.toDate() || new Date(),
        lastMaintenance: data.lastMaintenance?.toDate(),
        nextMaintenance: data.nextMaintenance?.toDate(),
        images: data.images || [],
        createdBy: data.createdBy || "",
        assignedTo: data.assignedTo,
        assignedToName: data.assignedToName,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
      } as Device;
    });

    // Sort trong JavaScript thay vì Firestore
    const sortedDevices = allDevices.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    // Phân loại
    const available = sortedDevices.filter(d => !d.assignedTo);
    const inUse = sortedDevices.filter(d => d.assignedTo);

    callback({ available, inUse });
  }, error => {
    console.error("Realtime listener error:", error);
  });

  return unsubscribe;
};

export const getDevice = async (deviceId: string): Promise<Device | null> => {
  try {
    const docRef = doc(db, 'devices', deviceId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        ...data,
        installationDate: data.installationDate?.toDate() || new Date(),
        lastMaintenance: data.lastMaintenance?.toDate(),
        nextMaintenance: data.nextMaintenance?.toDate(),
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
      } as Device;
    }
    return null;
  } catch (error: any) {
    throw new Error(error.message || 'Failed to get device');
  }
};


export const updateDevice = async (deviceId: string, data: UpdateDeviceData): Promise<void> => {
  try {
    console.log("🔹 [updateDevice] raw payload:", data);

    const deviceRef = doc(db, "devices", deviceId);

    let updateData: any = { ...data };

    // 🔹 Convert string/Date -> Firestore Timestamp
    const convertDate = (value: any) => {
      if (!value) return null;
      return value instanceof Date ? Timestamp.fromDate(value) : Timestamp.fromDate(new Date(value));
    };

    updateData.installationDate = convertDate(updateData.installationDate);
    updateData.lastMaintenance = convertDate(updateData.lastMaintenance);
    updateData.nextMaintenance = convertDate(updateData.nextMaintenance);

    updateData.updatedAt = new Date();

    // 🔹 Loại bỏ các field undefined (Firestore không cho phép)
    Object.keys(updateData).forEach((key) => {
      if (updateData[key] === undefined) {
        delete updateData[key];
      }
    });

    console.log("🔹 [updateDevice] final updateData:", updateData);

    await updateDoc(deviceRef, updateData);

    console.log("✅ [updateDevice] Update successful!");
  } catch (error: any) {
    console.error("❌ [updateDevice] Update failed:", error);
    throw new Error(error.message || "Failed to update device");
  }
};



export const deleteDevice = async (deviceId: string): Promise<void> => {
  try {
    // Get device to delete associated images
    const device = await getDevice(deviceId);
    if (device?.images) {
      await Promise.all(
        device.images.map(async (imageUrl) => {
          try {
            const imageRef = ref(storage, imageUrl);
            await deleteObject(imageRef);
          } catch (error) {
            console.warn('Failed to delete image:', error);
          }
        })
      );
    }
    
    await deleteDoc(doc(db, 'devices', deviceId));
  } catch (error: any) {
    throw new Error(error.message || 'Failed to delete device');
  }
};


// Statistics
export const getDeviceStats = async (wardId?: string) => {
  try {
    const devices = await getDevices(wardId);
    
    const stats = {
      total: devices.length,
      active: devices.filter(d => d.status === 'active').length,
      inactive: devices.filter(d => d.status === 'inactive').length,
      maintenance: devices.filter(d => d.status === 'maintenance').length,
      error: devices.filter(d => d.status === 'error').length,
      byType: devices.reduce((acc, device) => {
        acc[device.type] = (acc[device.type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
    };
    
    return stats;
  } catch (error: any) {
    throw new Error(error.message || 'Failed to get device statistics');
  }
};
export const getUsersWard = async (
  role?: string,
  wardId?: string,
  isActive?: boolean,
  limitCount: number = 50
): Promise<UserProfile[]> => {
  try {
    const constraints: any[] = [orderBy('createdAt', 'desc'), limit(limitCount)];

    if (role) constraints.push(where('role', '==', role));
    if (wardId) constraints.push(where('wardId', '==', wardId));
    if (isActive !== undefined) constraints.push(where('isActive', '==', isActive));

    const q = query(collection(db, 'userProfiles'), ...constraints);

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
        lastLoginAt: data.lastLoginAt?.toDate(),
      } as UserProfile;
    });
  } catch (error: any) {
    throw new Error(error.message || 'Failed to get users');
  }
};
