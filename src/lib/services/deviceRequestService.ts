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
  onSnapshot, Unsubscribe,
} from "firebase/firestore";
import { db } from "../firebase";

export interface DeviceRequest {
  id: string;
  deviceName: string;
  deviceType: 'camera' | 'sensor' | 'router' | 'other';
  quantity: number;
  reason: string;
  wardId: string;
  wardName: string;
  requestedBy: string;
  status: 'pending' | 'approved' | 'rejected' | 'completed' | 'delivering' | 'received';
  approvedBy?: string;
  approvedAt?: Date;
  allocatedBy?: string;
  allocatedAt?: Date;
  deviceSerialNumbers?: string[];
  deviceQuantities?: Record<string, number>; // Lưu số lượng cho từng thiết bị
  deliveredAt?: Date;
  receivedAt?: Date;
  receivedBy?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface WardData {
  id: string;
  name: string;
  code: string;
  district: string;
  city: string;
  address: string;
  phone?: string;
  email?: string;
  population?: number;
  area?: number;
  description?: string;
  contactPerson: string; // thêm trường này
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}


export interface CreateDeviceRequestData {
  deviceName: string;
  deviceType: 'camera' | 'sensor' | 'router' | 'other';
  quantity: number;
  reason: string;
  wardId: string;
  wardName: string;
  notes?: string;
}

export interface UpdateDeviceRequestData {
  status?: 'approved' | 'rejected' | 'completed' | 'delivering' | 'received';
  approvedBy?: string;
  approvedAt?: Date;
  allocatedBy?: string;
  allocatedAt?: Date;
  deviceSerialNumbers?: string[];
  deviceQuantities?: Record<string, number>; // Lưu số lượng cho từng thiết bị
  deliveredAt?: Date;
  receivedAt?: Date;
  receivedBy?: string;
  notes?: string;
}

// ------------------ WARD ------------------ //
export const getWardById = async (wardId: string): Promise<WardData | null> => {
  try {
    const docRef = doc(db, "wards", wardId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as WardData;
    }
    return null;
  } catch (error: any) {
    console.error("Failed to get ward:", error);
    return null;
  }
};

// ------------------ DEVICE TYPE ------------------ //
export const getDeviceTypeDisplayName = (deviceType: string) => {
  switch (deviceType) {
    case 'camera': return 'Camera';
    case 'sensor': return 'Cảm biến';
    case 'router': return 'Router';
    case 'other': return 'Khác';
    default: return deviceType; 
  }
};

// ------------------ CRUD DEVICE REQUEST ------------------ //
export const createDeviceRequest = async (
  data: CreateDeviceRequestData,
  requestedBy: string
): Promise<string> => {
  try {
    const requestData = {
      ...data,
      requestedBy,
      status: 'pending' as const,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const docRef = await addDoc(collection(db, 'deviceRequests'), requestData);
    return docRef.id;
  } catch (error: any) {
    throw new Error(error.message || 'Failed to create device request');
  }
};

export const getDeviceRequest = async (requestId: string): Promise<DeviceRequest | null> => {
  try {
    const docRef = doc(db, 'deviceRequests', requestId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        ...data,
        approvedAt: data.approvedAt?.toDate(),
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
      } as DeviceRequest;
    }
    return null;
  } catch (error: any) {
    throw new Error(error.message || 'Failed to get device request');
  }
};

export const getDeviceRequests = async (
  wardId?: string,
  status?: string,
  limitCount: number = 50
): Promise<DeviceRequest[]> => {
  try {
    // Tạo query constraints mà không có orderBy để tránh lỗi composite index
    const constraints: any[] = [limit(limitCount)];

    if (wardId) {
      constraints.push(where('wardId', '==', wardId));
    }

    if (status) {
      constraints.push(where('status', '==', status));
    }

    const q = query(collection(db, 'deviceRequests'), ...constraints);
    const querySnapshot = await getDocs(q);
    
    const requests = querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        approvedAt: data.approvedAt?.toDate(),
        allocatedAt: data.allocatedAt?.toDate(),
        deliveredAt: data.deliveredAt?.toDate(),
        receivedAt: data.receivedAt?.toDate(),
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
      } as DeviceRequest;
    });

    // Sort trong JavaScript thay vì Firestore để tránh lỗi composite index
    return requests.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  } catch (error: any) {
    throw new Error(error.message || 'Failed to get device requests');
  }
};

export const updateDeviceRequest = async (
  requestId: string,
  data: UpdateDeviceRequestData
): Promise<void> => {
  try {
    const requestRef = doc(db, 'deviceRequests', requestId);
    const updateData: any = { ...data, updatedAt: new Date() };

    if (data.status === 'approved' || data.status === 'rejected') {
      updateData.approvedAt = new Date();
    }

    if (data.status === 'completed') {
      updateData.allocatedAt = new Date();
    }

    if (data.status === 'delivering') {
      updateData.deliveredAt = new Date();
    }

    if (data.status === 'received') {
      updateData.receivedAt = new Date();
    }

    await updateDoc(requestRef, updateData);
  } catch (error: any) {
    throw new Error(error.message || 'Failed to update device request');
  }
};

export const deleteDeviceRequest = async (requestId: string): Promise<void> => {
  try {
    await deleteDoc(doc(db, 'deviceRequests', requestId));
  } catch (error: any) {
    throw new Error(error.message || 'Failed to delete device request');
  }
};

// ------------------ STATS ------------------ //
export const getDeviceRequestStats = async (wardId?: string) => {
  try {
    const requests = await getDeviceRequests(wardId);

    const stats = {
      total: requests.length,
      pending: requests.filter(r => r.status === 'pending').length,
      approved: requests.filter(r => r.status === 'approved').length,
      rejected: requests.filter(r => r.status === 'rejected').length,
      completed: requests.filter(r => r.status === 'completed').length,
      byType: requests.reduce((acc, request) => {
        acc[request.deviceType] = (acc[request.deviceType] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
    };

    return stats;
  } catch (error: any) {
    throw new Error(error.message || 'Failed to get device request statistics');
  }
};
export const getDeviceRequestsRealtime = (
  wardId: string,
  callback: (requests: DeviceRequest[]) => void
): Unsubscribe => {
  const q = query(
    collection(db, "deviceRequests"),
    where("wardId", "==", wardId),
    orderBy("createdAt", "desc")
  );

  const unsubscribe = onSnapshot(q, (snapshot) => {
    const list: DeviceRequest[] = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        approvedAt: data.approvedAt?.toDate?.() || undefined,
        createdAt: data.createdAt?.toDate?.() || new Date(),
        updatedAt: data.updatedAt?.toDate?.() || new Date(),
      } as DeviceRequest;
    });
    callback(list);
  });

  return unsubscribe;
};