// Debug utilities để fix dữ liệu cũ trong Firestore
import { resetAllDeviceRequestNotifications } from './services/deviceRequestService';

// Function để reset tất cả thông báo device request
export const debugResetDeviceRequestNotifications = async () => {
  try {
    console.log('🔄 Starting reset of all device request notifications...');
    await resetAllDeviceRequestNotifications();
    console.log('✅ Reset completed successfully!');
    return true;
  } catch (error) {
    console.error('❌ Error during reset:', error);
    return false;
  }
};

// Function để log tất cả device requests hiện tại
export const debugLogAllDeviceRequests = async () => {
  try {
    const { collection, getDocs, query } = await import('firebase/firestore');
    const { db } = await import('./firebase');
    
    console.log('📋 Fetching all device requests...');
    const q = query(collection(db, 'deviceRequests'));
    const querySnapshot = await getDocs(q);
    
    console.log(`Found ${querySnapshot.docs.length} device requests:`);
    querySnapshot.docs.forEach((doc, index) => {
      const data = doc.data();
      console.log(`${index + 1}. ID: ${doc.id}`, {
        hasNewUpdate: data.hasNewUpdate,
        lastUpdateByRole: data.lastUpdateByRole,
        lastUpdateBy: data.lastUpdateBy,
        lastUpdateByName: data.lastUpdateByName,
        status: data.status,
        wardId: data.wardId,
        createdAt: data.createdAt?.toDate?.() || data.createdAt
      });
    });
  } catch (error) {
    console.error('❌ Error fetching device requests:', error);
  }
};

// Function để test tạo một device request mới
export const debugCreateTestDeviceRequest = async () => {
  try {
    const { createDeviceRequest } = await import('./services/deviceRequestService');
    
    console.log('🧪 Creating test device request...');
    const requestId = await createDeviceRequest({
      deviceName: 'test-camera',
      deviceType: 'camera',
      quantity: 1,
      reason: 'Test request for debugging',
      wardId: 'test-ward-id',
      wardName: 'Test Ward'
    }, 'test-user-id', 'Test User');
    
    console.log('✅ Test device request created with ID:', requestId);
    return requestId;
  } catch (error) {
    console.error('❌ Error creating test device request:', error);
    return null;
  }
};

// Export tất cả debug functions để có thể gọi từ console
(window as any).debugUtils = {
  resetDeviceRequestNotifications: debugResetDeviceRequestNotifications,
  logAllDeviceRequests: debugLogAllDeviceRequests,
  createTestDeviceRequest: debugCreateTestDeviceRequest
};

console.log('🔧 Debug utilities loaded! Available functions:');
console.log('- debugUtils.resetDeviceRequestNotifications()');
console.log('- debugUtils.logAllDeviceRequests()');
console.log('- debugUtils.createTestDeviceRequest()');
