import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

// Hook cho phường - thấy thông báo khi trung tâm cập nhật incidents
export const useIncidentNotificationCount = () => {
  const { user } = useAuth();
  const [notificationCount, setNotificationCount] = useState(0);
  const [previousCount, setPreviousCount] = useState(0);
  const [isInitialized, setIsInitialized] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (!user?.wardId) {
      setNotificationCount(0);
      return;
    }

    // Query đơn giản chỉ theo wardId để tránh lỗi composite index
    // Filter hasNewUpdate và lastUpdateByRole trong JavaScript
    const q = query(
      collection(db, 'incidents'),
      where('wardId', '==', user.wardId)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
    const incidentsWithNewUpdate = snapshot.docs.filter(doc => {
      const data = doc.data();
      console.log("🔎 Incident Debug:", {
        id: doc.id,
        hasNewUpdate: data.hasNewUpdate,
        lastUpdateBy: data.lastUpdateBy,
        lastUpdateByName: data.lastUpdateByName,
        lastUpdateByRole: data.lastUpdateByRole,
        status: data.status,
        wardId: data.wardId,
        isDeleted: data.isDeleted,
        createdAt: data.createdAt
      });
      // Chỉ đếm incidents có hasNewUpdate = true VÀ lastUpdateByRole = 'center'
      // (tức là chỉ cập nhật từ trung tâm, không phải từ phường/user)
      return data.hasNewUpdate === true && data.lastUpdateByRole === 'center';
    });
      const newCount = incidentsWithNewUpdate.length;
      
      // Chỉ hiển thị toast khi đã khởi tạo và có thông báo mới thực sự
      if (isInitialized && newCount > previousCount) {
        toast({
          title: "Có cập nhật mới!",
          description: `Bạn có ${newCount} sự cố được cập nhật`,
          duration: 5000,
        });
      }
      
      setNotificationCount(newCount);
      setPreviousCount(newCount);
      
      if (!isInitialized) {
        setIsInitialized(true);
      }
    });

    return () => unsubscribe();
  }, [user?.wardId, previousCount, toast, isInitialized]);
  
  return notificationCount;
};

// Hook cho user - thấy thông báo khi trung tâm cập nhật incidents của user
export const useUserIncidentNotificationCount = () => {
  const { user } = useAuth();
  const [notificationCount, setNotificationCount] = useState(0);

  useEffect(() => {
    if (!user?.id) {
      setNotificationCount(0);
      return;
    }

    // Query đơn giản chỉ theo reportedBy để tránh lỗi composite index
    // Filter hasNewUpdate và lastUpdateByRole trong JavaScript
    const q = query(
      collection(db, 'incidents'),
      where('reportedBy', '==', user.id)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
    const incidentsWithNewUpdate = snapshot.docs.filter(doc => {
      const data = doc.data();
      // Chỉ đếm incidents có hasNewUpdate = true VÀ lastUpdateByRole = 'center'
      // (tức là chỉ cập nhật từ trung tâm, không phải từ user)
      return data.hasNewUpdate === true && data.lastUpdateByRole === 'center';
    });
      setNotificationCount(incidentsWithNewUpdate.length);
    });

    return () => unsubscribe();
  }, [user?.id]);

  return notificationCount;
};

// Hook cho trang "Yêu cầu thiết bị" - chỉ đếm requests có status pending, approved, rejected
export const useDeviceRequestNotificationCount = () => {
  const { user } = useAuth();
  const [notificationCount, setNotificationCount] = useState(0);
  const [previousCount, setPreviousCount] = useState(0);
  const [isInitialized, setIsInitialized] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (!user?.wardId) {
      setNotificationCount(0);
      return;
    }

    // Query đơn giản chỉ theo wardId để tránh lỗi composite index
    // Filter hasNewUpdate và lastUpdateByRole trong JavaScript
    const q = query(
      collection(db, 'deviceRequests'),
      where('wardId', '==', user.wardId)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const requestsWithNewUpdate = snapshot.docs.filter(doc => {
        const data = doc.data();
        console.log("🔎 DeviceRequest Debug:", {
          id: doc.id,
          hasNewUpdate: data.hasNewUpdate,
          lastUpdateByRole: data.lastUpdateByRole,
          lastUpdateBy: data.lastUpdateBy,
          lastUpdateByName: data.lastUpdateByName,
          status: data.status,
          wardId: data.wardId,
          isDeleted: data.isDeleted,
          createdAt: data.createdAt
        });
        // Chỉ đếm requests có hasNewUpdate = true VÀ lastUpdateByRole = 'center' VÀ status phù hợp với trang "Yêu cầu thiết bị"
        // (tức là chỉ cập nhật từ trung tâm cho các status: pending, approved, rejected)
        return data.hasNewUpdate === true && 
               data.lastUpdateByRole === 'center' && 
               (data.status === 'pending' || data.status === 'approved' || data.status === 'rejected');
      });
      const newCount = requestsWithNewUpdate.length;
      
      console.log('Device Request Notification Debug:', {
        isInitialized,
        previousCount,
        newCount,
        wardId: user.wardId
      });
      
      // Chỉ hiển thị toast khi đã khởi tạo và có thông báo mới thực sự
      if (isInitialized && newCount > previousCount) {
        toast({
          title: "Có cập nhật mới!",
          description: `Bạn có ${newCount} yêu cầu được cập nhật`,
          duration: 5000,
        });
      }
      
      setNotificationCount(newCount);
      setPreviousCount(newCount);
      
      if (!isInitialized) {
        setIsInitialized(true);
      }
    });

    return () => unsubscribe();
  }, [user?.wardId, previousCount, toast, isInitialized]);
  
  return notificationCount;
};

// Hook cho trang "Nhận thiết bị" - chỉ đếm requests có status delivering, received
export const useWardRequestNotificationCount = () => {
  const { user } = useAuth();
  const [notificationCount, setNotificationCount] = useState(0);
  const [previousCount, setPreviousCount] = useState(0);
  const [isInitialized, setIsInitialized] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (!user?.wardId) {
      setNotificationCount(0);
      return;
    }

    // Query đơn giản chỉ theo wardId để tránh lỗi composite index
    // Filter hasNewUpdate và lastUpdateByRole trong JavaScript
    const q = query(
      collection(db, 'deviceRequests'),
      where('wardId', '==', user.wardId)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const requestsWithNewUpdate = snapshot.docs.filter(doc => {
        const data = doc.data();
        console.log("🔎 WardRequest Debug:", {
          id: doc.id,
          hasNewUpdate: data.hasNewUpdate,
          lastUpdateByRole: data.lastUpdateByRole,
          lastUpdateBy: data.lastUpdateBy,
          lastUpdateByName: data.lastUpdateByName,
          status: data.status,
          wardId: data.wardId,
          isDeleted: data.isDeleted,
          createdAt: data.createdAt
        });
        // Chỉ đếm requests có hasNewUpdate = true VÀ lastUpdateByRole = 'center' VÀ status phù hợp với trang "Nhận thiết bị"
        // (tức là chỉ cập nhật từ trung tâm cho status: delivering)
        return data.hasNewUpdate === true && 
               data.lastUpdateByRole === 'center' && 
               (data.status === 'delivering');
      });
      const newCount = requestsWithNewUpdate.length;
      
      console.log('Ward Request Notification Debug:', {
        isInitialized,
        previousCount,
        newCount,
        wardId: user.wardId
      });
      
      // Chỉ hiển thị toast khi đã khởi tạo và có thông báo mới thực sự
      if (isInitialized && newCount > previousCount) {
        toast({
          title: "Có cập nhật mới!",
          description: `Bạn có ${newCount} thiết bị cần nhận`,
          duration: 5000,
        });
      }
      
      setNotificationCount(newCount);
      setPreviousCount(newCount);
      
      if (!isInitialized) {
        setIsInitialized(true);
      }
    });

    return () => unsubscribe();
  }, [user?.wardId, previousCount, toast, isInitialized]);
  
  return notificationCount;
};

// Hook cho trung tâm - thấy thông báo khi phường cập nhật requests
export const useCenterDeviceRequestNotificationCount = () => {
  const { user } = useAuth();
  const [notificationCount, setNotificationCount] = useState(0);
  const [previousCount, setPreviousCount] = useState(0);
  const [isInitialized, setIsInitialized] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    console.log("🔍 Center DeviceRequest Hook Debug:", {
      user: user ? { id: user.id, role: user.role, name: user.displayName } : null,
      isCenter: user?.role === 'center'
    });
    
    if (!user || user.role !== 'center') {
      setNotificationCount(0);
      return;
    }

    // Query tất cả device requests để trung tâm thấy cập nhật từ phường
    const q = query(collection(db, 'deviceRequests'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const requestsWithNewUpdate = snapshot.docs.filter(doc => {
        const data = doc.data();
        console.log("🔎 Center DeviceRequest Debug:", {
          id: doc.id,
          hasNewUpdate: data.hasNewUpdate,
          lastUpdateByRole: data.lastUpdateByRole,
          lastUpdateBy: data.lastUpdateBy,
          lastUpdateByName: data.lastUpdateByName,
          status: data.status,
          wardId: data.wardId,
          wardName: data.wardName,
          createdAt: data.createdAt
        });
        // Chỉ đếm requests có hasNewUpdate = true VÀ lastUpdateByRole = 'ward'
        // (tức là chỉ cập nhật từ phường, không phải từ trung tâm)
        return data.hasNewUpdate === true && data.lastUpdateByRole === 'ward';
      });
      const newCount = requestsWithNewUpdate.length;
      
      console.log('Center Device Request Notification Debug:', {
        isInitialized,
        previousCount,
        newCount,
        userRole: user.role
      });
      
      // Chỉ hiển thị toast khi đã khởi tạo và có thông báo mới thực sự
      if (isInitialized && newCount > previousCount) {
        toast({
          title: "Có cập nhật mới!",
          description: `Phường đã cập nhật ${newCount} yêu cầu`,
          duration: 5000,
        });
      }
      
      setNotificationCount(newCount);
      setPreviousCount(newCount);
      
      if (!isInitialized) {
        setIsInitialized(true);
      }
    });

    return () => unsubscribe();
  }, [user?.id, user?.role, previousCount, toast, isInitialized]);
  
  return notificationCount;
};