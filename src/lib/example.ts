// Example usage of Firebase services
// This file demonstrates how to use the Firebase services in your React components

import { 
  login, 
  register, 
  logout, 
  getCurrentUser, 
  onAuthStateChange,
  getAuthErrorMessage 
} from './authService';

import { 
  createDevice, 
  getDevices, 
  updateDevice, 
  deleteDevice,
  getDeviceStats 
} from './services/deviceService';

import { 
  createIncident, 
  getIncidents, 
  updateIncident,
  getIncidentStats 
} from './services/incidentService';

import { 
  createWard, 
  getWards, 
  updateWard,
  getWardStats 
} from './services/wardService';

import { 
  createUserProfile, 
  getUserProfile, 
  updateUserProfile,
  getUserSettings,
  updateUserSettings 
} from './services/userService';

// Example: Authentication flow
export const authExample = async () => {
  try {
    // Register a new user
    const newUser = await register({
      email: 'test@example.com',
      password: 'password123',
      displayName: 'Test User',
      role: 'user',
      wardId: 'ward_1'
    });
    console.log('User registered:', newUser);

    // Login
    const user = await login({
      email: 'test@example.com',
      password: 'password123'
    });
    console.log('User logged in:', user);

    // Get current user
    const currentUser = await getCurrentUser();
    console.log('Current user:', currentUser);

    // Logout
    await logout();
    console.log('User logged out');

  } catch (error: any) {
    console.error('Auth error:', getAuthErrorMessage(error));
  }
};

// Example: Device management
export const deviceExample = async () => {
  try {
    // Create a new device
    const deviceId = await createDevice({
      name: 'Camera 01',
      type: 'camera',
      location: 'Ngã tư Lê Lợi - Nguyễn Huệ',
      wardId: 'ward_1',
      wardName: 'Phường Bến Nghé',
      description: 'Camera giám sát giao thông',
      specifications: {
        brand: 'Hikvision',
        model: 'DS-2CD2143G0-I',
        ipAddress: '192.168.1.100',
        macAddress: '00:11:22:33:44:55'
      },
      installationDate: new Date()
    }, 'user_id');

    console.log('Device created:', deviceId);

    // Get devices for a ward
    const devices = await getDevices('ward_1', 'active');
    console.log('Devices:', devices);

    // Update device
    await updateDevice(deviceId, {
      status: 'maintenance',
      description: 'Camera đang bảo trì'
    });
    console.log('Device updated');

    // Get device statistics
    const stats = await getDeviceStats('ward_1');
    console.log('Device stats:', stats);

  } catch (error: any) {
    console.error('Device error:', error.message);
  }
};

// Example: Incident management
export const incidentExample = async () => {
  try {
    // Create a new incident
    const incidentId = await createIncident({
      title: 'Camera không hoạt động',
      description: 'Camera tại ngã tư Lê Lợi không ghi hình được từ 8h sáng',
      type: 'device_failure',
      severity: 'high',
      location: 'Ngã tư Lê Lợi - Nguyễn Huệ',
      wardId: 'ward_1',
      wardName: 'Phường Bến Nghé',
      deviceId: 'device_123',
      deviceName: 'Camera 01',
      priority: 'high',
      estimatedResolution: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours from now
    }, 'user_id', 'Nguyễn Văn A');

    console.log('Incident created:', incidentId);

    // Get incidents for a ward
    const incidents = await getIncidents('ward_1', 'reported', 'high');
    console.log('Incidents:', incidents);

    // Update incident status
    await updateIncident(incidentId, {
      status: 'in_progress',
      assignedTo: 'admin_id',
      assignedToName: 'Admin User'
    });
    console.log('Incident updated');

    // Get incident statistics
    const stats = await getIncidentStats('ward_1');
    console.log('Incident stats:', stats);

  } catch (error: any) {
    console.error('Incident error:', error.message);
  }
};

// Example: Ward management
export const wardExample = async () => {
  try {
    // Create a new ward
    const wardId = await createWard({
      name: 'Phường Bến Nghé',
      code: 'PN001',
      district: 'Quận 1',
      city: 'TP. Hồ Chí Minh',
      address: '123 Nguyễn Huệ, Phường Bến Nghé, Quận 1',
      phone: '028-3829-1234',
      email: 'bennghe@quan1.hochiminhcity.gov.vn',
      population: 50000,
      area: 2.5,
      description: 'Phường trung tâm thành phố'
    });

    console.log('Ward created:', wardId);

    // Get all wards
    const wards = await getWards(true);
    console.log('Wards:', wards);

    // Update ward
    await updateWard(wardId, {
      population: 52000,
      description: 'Phường trung tâm thành phố - đã cập nhật'
    });
    console.log('Ward updated');

    // Get ward statistics
    const stats = await getWardStats(wardId);
    console.log('Ward stats:', stats);

  } catch (error: any) {
    console.error('Ward error:', error.message);
  }
};

// Example: User management
export const userExample = async () => {
  try {
    // Create user profile
    const profileId = await createUserProfile(
      'user_id',
      'user@example.com',
      'Nguyễn Văn A',
      'user',
      'ward_1',
      'Phường Bến Nghé'
    );

    console.log('User profile created:', profileId);

    // Get user profile
    const profile = await getUserProfile('user_id');
    console.log('User profile:', profile);

    // Update user profile
    await updateUserProfile('user_id', {
      firstName: 'Nguyễn',
      lastName: 'Văn A',
      phone: '0901234567'
    });
    console.log('User profile updated');

    // Get user settings
    const settings = await getUserSettings('user_id');
    console.log('User settings:', settings);

    // Update user settings
    await updateUserSettings('user_id', {
      theme: 'dark',
      language: 'vi',
      notifications: {
        email: true,
        push: false,
        sms: true
      },
      dashboard: {
        defaultView: 'devices',
        refreshInterval: 10,
        showCharts: true
      }
    });
    console.log('User settings updated');

  } catch (error: any) {
    console.error('User error:', error.message);
  }
};

// Example: Auth state listener
export const authStateExample = () => {
  // Set up auth state listener
  const unsubscribe = onAuthStateChange((user) => {
    if (user) {
      console.log('User is signed in:', user);
      // Update UI, redirect, etc.
    } else {
      console.log('User is signed out');
      // Clear UI, redirect to login, etc.
    }
  });

  // Don't forget to unsubscribe when component unmounts
  return unsubscribe;
};

// Example: Error handling
export const errorHandlingExample = async () => {
  try {
    // This will fail because user doesn't exist
    await login({
      email: 'nonexistent@example.com',
      password: 'wrongpassword'
    });
  } catch (error: any) {
    // Handle different types of errors
    const errorMessage = getAuthErrorMessage(error);
    console.error('Login failed:', errorMessage);
    
    // Show user-friendly error message
    alert(`Đăng nhập thất bại: ${errorMessage}`);
  }
};

// Example: Complete workflow
export const completeWorkflowExample = async () => {
  try {
    // 1. Register and login
    await register({
      email: 'workflow@example.com',
      password: 'password123',
      displayName: 'Workflow User',
      role: 'ward',
      wardId: 'ward_1'
    });

    const user = await login({
      email: 'workflow@example.com',
      password: 'password123'
    });

    // 2. Create a device
    const deviceId = await createDevice({
      name: 'Test Camera',
      type: 'camera',
      location: 'Test Location',
      wardId: user.wardId!,
      wardName: 'Test Ward',
      installationDate: new Date()
    }, user.id);

    // 3. Report an incident
    const incidentId = await createIncident({
      title: 'Test Incident',
      description: 'Test incident description',
      type: 'device_failure',
      severity: 'medium',
      location: 'Test Location',
      wardId: user.wardId!,
      wardName: 'Test Ward',
      deviceId,
      deviceName: 'Test Camera',
      priority: 'medium'
    }, user.id, user.displayName);

    // 4. Get statistics
    const deviceStats = await getDeviceStats(user.wardId!);
    const incidentStats = await getIncidentStats(user.wardId!);

    console.log('Workflow completed successfully');
    console.log('Device stats:', deviceStats);
    console.log('Incident stats:', incidentStats);

  } catch (error: any) {
    console.error('Workflow error:', error.message);
  }
};
