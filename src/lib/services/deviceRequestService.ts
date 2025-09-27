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
  onSnapshot, 
  Unsubscribe,
  writeBatch,
} from "firebase/firestore";
import { db } from "../firebase";

export interface DeviceRequest {
  id: string;
  deviceName: string;
  deviceType: string;
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
  // Notification fields
  hasNewUpdate?: boolean;
  lastUpdateBy?: string;
  lastUpdateByName?: string;
  lastUpdateByRole?: string; // Thêm role để hook có thể kiểm tra
  lastUpdateAt?: Date;
  // Soft delete fields
  isDeleted?: boolean;
  deletedBy?: string;
  deletedByRole?: string;
  deletedAt?: Date;
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
  deviceType: string;
  quantity: number;
  reason: string;
  wardId: string;
  wardName: string;
  notes?: string;
}

export interface UpdateDeviceRequestData {
  status?: 'pending' | 'approved' | 'rejected' | 'completed' | 'delivering' | 'received';
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
    case 'pc': return 'Máy tính để bàn';
    case 'laptop': return 'Laptop';
    case 'camera': return 'Camera';
    case 'router': return 'Router';
    case 'sensor': return 'Cảm biến';
    case 'printer': return 'Máy in';
    case 'monitor': return 'Màn hình';
    case 'server': return 'Server';
    case 'switch': return 'Switch';
    case 'ups': return 'UPS';
    case 'ip_phone': return 'Điện thoại IP';
    case 'other': return 'Thiết bị khác';
    default: return deviceType; 
  }
};

// ------------------ CRUD DEVICE REQUEST ------------------ //
export const createDeviceRequest = async (
  data: CreateDeviceRequestData,
  requestedBy: string,
  requestedByName: string
): Promise<string> => {
  try {
    const requestData = {
      ...data,
      requestedBy,
      status: 'pending' as const,
      createdAt: new Date(),
      updatedAt: new Date(),
      hasNewUpdate: true, // Trung tâm sẽ thấy thông báo mới khi phường tạo request
      lastUpdateBy: requestedBy,
      lastUpdateByName: requestedByName,
      lastUpdateByRole: 'ward',
      lastUpdateAt: new Date()
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
        // Notification fields
        hasNewUpdate: data.hasNewUpdate || false,
        lastUpdateBy: data.lastUpdateBy || undefined,
        lastUpdateByName: data.lastUpdateByName || undefined,
        lastUpdateByRole: data.lastUpdateByRole || undefined,
        lastUpdateAt: data.lastUpdateAt?.toDate(),
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
        // Notification fields
        hasNewUpdate: data.hasNewUpdate || false,
        lastUpdateBy: data.lastUpdateBy || undefined,
        lastUpdateByName: data.lastUpdateByName || undefined,
        lastUpdateByRole: data.lastUpdateByRole || undefined,
        lastUpdateAt: data.lastUpdateAt?.toDate(),
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
  data: UpdateDeviceRequestData,
  updatedBy?: { id: string; name: string; role: 'center' | 'ward' | 'user' }
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

    // Đánh dấu có cập nhật mới khi có bất kỳ ai cập nhật
    if (data.status) {
      updateData.hasNewUpdate = true;
      updateData.lastUpdateBy = updatedBy?.id;
      updateData.lastUpdateByName = updatedBy?.name;
      updateData.lastUpdateByRole = updatedBy?.role;
      updateData.lastUpdateAt = new Date();
      
      console.log("🔔 DeviceRequest Update Debug:", {
        requestId,
        status: data.status,
        updatedBy: updatedBy ? { id: updatedBy.id, name: updatedBy.name, role: updatedBy.role } : null,
        hasNewUpdate: true,
        lastUpdateByRole: updatedBy?.role
      });
    }

    await updateDoc(requestRef, updateData);
  } catch (error: any) {
    throw new Error(error.message || 'Failed to update device request');
  }
};

// Đánh dấu đã xem cập nhật mới của yêu cầu thiết bị
// Function để reset tất cả hasNewUpdate về false (dùng một lần để fix data cũ)
export const resetAllDeviceRequestNotifications = async (): Promise<void> => {
  try {
    console.log('Resetting all device request notifications...');
    const q = query(collection(db, 'deviceRequests'));
    const querySnapshot = await getDocs(q);
    
    const batch = writeBatch(db);
    querySnapshot.docs.forEach((doc) => {
      batch.update(doc.ref, { 
        hasNewUpdate: false,
        lastUpdateByRole: null, // Reset về null để tránh nhầm lẫn
        lastUpdateBy: null,
        lastUpdateByName: null,
        lastUpdateAt: null
      });
    });
    
    await batch.commit();
    console.log(`Reset ${querySnapshot.docs.length} device requests`);
  } catch (error: any) {
    console.error('Error resetting device request notifications:', error);
    throw new Error(error.message || 'Failed to reset notifications');
  }
};

export const markDeviceRequestUpdateAsViewed = async (requestId: string): Promise<void> => {
  try {
    const requestRef = doc(db, 'deviceRequests', requestId);
    await updateDoc(requestRef, { hasNewUpdate: false });
  } catch (error: any) {
    console.error('Error marking device request update as viewed:', error);
  }
};

export const deleteDeviceRequest = async (requestId: string, currentUserId: string, currentUserRole: string): Promise<void> => {
  try {
    // Kiểm tra quyền xóa
    const requestDoc = await getDoc(doc(db, 'deviceRequests', requestId));
    if (!requestDoc.exists()) {
      throw new Error('Request not found');
    }
    
    const requestData = requestDoc.data();
    
    // Chỉ trung tâm mới có quyền xóa
    const canDelete = currentUserRole === 'center';
    
    if (!canDelete) {
      throw new Error('Bạn không có quyền xóa request này');
    }
    
    // Hard delete - xóa thật khỏi database
    await deleteDoc(doc(db, 'deviceRequests', requestId));
  } catch (error: any) {
    throw new Error(error.message || 'Failed to delete device request');
  }
};

// Function để fix tất cả requests hiện có (thêm isDeleted: false)
export const fixExistingDeviceRequests = async (): Promise<void> => {
  try {
    console.log('🔧 Fixing existing device requests...');
    const q = query(collection(db, 'deviceRequests'));
    const querySnapshot = await getDocs(q);
    
    const batch = writeBatch(db);
    querySnapshot.docs.forEach((doc) => {
      const data = doc.data();
      if (data.isDeleted === undefined) {
        batch.update(doc.ref, { isDeleted: false });
      }
    });
    
    await batch.commit();
    console.log(`✅ Fixed ${querySnapshot.docs.length} device requests`);
  } catch (error: any) {
    console.error('❌ Error fixing device requests:', error);
    throw new Error(error.message || 'Failed to fix device requests');
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
  // Sử dụng query đơn giản không có orderBy để tránh lỗi index
  const q = query(
    collection(db, "deviceRequests"),
    where("wardId", "==", wardId)
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
        // Notification fields
        hasNewUpdate: data.hasNewUpdate || false,
        lastUpdateBy: data.lastUpdateBy || undefined,
        lastUpdateByName: data.lastUpdateByName || undefined,
        lastUpdateAt: data.lastUpdateAt?.toDate?.() || undefined,
      } as DeviceRequest;
    });
    
    // Sort by createdAt descending trong JavaScript thay vì Firestore
    list.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    callback(list);
  });

  return unsubscribe;
};