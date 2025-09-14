// Test script để kiểm tra các API services
import { 
  getDevices, 
  getDeviceStats, 
  createDevice,
  getWards,
  getIncidents,
  getIncidentStats,
  getDeviceRequests,
  getDeviceRequestStats
} from './services';

// Test Device API
export const testDeviceAPI = async () => {
  console.log('🔍 Testing Device API...');
  
  try {
    // Test getDevices
    const devices = await getDevices();
    console.log('✅ getDevices:', devices.length, 'devices found');
    
    // Test getDeviceStats
    const stats = await getDeviceStats();
    console.log('✅ getDeviceStats:', stats);
    
    return { success: true, devices: devices.length, stats };
  } catch (error: any) {
    console.error('❌ Device API Error:', error.message);
    return { success: false, error: error.message };
  }
};

// Test Ward API
export const testWardAPI = async () => {
  console.log('🔍 Testing Ward API...');
  
  try {
    const wards = await getWards();
    console.log('✅ getWards:', wards.length, 'wards found');
    
    return { success: true, wards: wards.length };
  } catch (error: any) {
    console.error('❌ Ward API Error:', error.message);
    return { success: false, error: error.message };
  }
};

// Test Incident API
export const testIncidentAPI = async () => {
  console.log('🔍 Testing Incident API...');
  
  try {
    const incidents = await getIncidents();
    console.log('✅ getIncidents:', incidents.length, 'incidents found');
    
    const stats = await getIncidentStats();
    console.log('✅ getIncidentStats:', stats);
    
    return { success: true, incidents: incidents.length, stats };
  } catch (error: any) {
    console.error('❌ Incident API Error:', error.message);
    return { success: false, error: error.message };
  }
};

// Test Device Request API
export const testDeviceRequestAPI = async () => {
  console.log('🔍 Testing Device Request API...');
  
  try {
    const requests = await getDeviceRequests();
    console.log('✅ getDeviceRequests:', requests.length, 'requests found');
    
    const stats = await getDeviceRequestStats();
    console.log('✅ getDeviceRequestStats:', stats);
    
    return { success: true, requests: requests.length, stats };
  } catch (error: any) {
    console.error('❌ Device Request API Error:', error.message);
    return { success: false, error: error.message };
  }
};

// Test tất cả APIs
export const testAllAPIs = async () => {
  console.log('🚀 Testing all APIs...');
  
  const results = await Promise.allSettled([
    testDeviceAPI(),
    testWardAPI(),
    testIncidentAPI(),
    testDeviceRequestAPI()
  ]);
  
  const summary = {
    device: results[0].status === 'fulfilled' ? results[0].value : { success: false, error: results[0].reason },
    ward: results[1].status === 'fulfilled' ? results[1].value : { success: false, error: results[1].reason },
    incident: results[2].status === 'fulfilled' ? results[2].value : { success: false, error: results[2].reason },
    deviceRequest: results[3].status === 'fulfilled' ? results[3].value : { success: false, error: results[3].reason }
  };
  
  console.log('📊 API Test Summary:', summary);
  return summary;
};

// Test data flow từ Dashboard
export const testDashboardDataFlow = async () => {
  console.log('🔍 Testing Dashboard Data Flow...');
  
  try {
    const { fetchDevices, fetchWards, fetchDeviceRequests, fetchIncidentReports } = await import('./data');
    
    const [devices, wards, requests, incidents] = await Promise.all([
      fetchDevices(),
      fetchWards(),
      fetchDeviceRequests(),
      fetchIncidentReports()
    ]);
    
    console.log('✅ Dashboard Data Flow:');
    console.log('  - Devices:', devices.length);
    console.log('  - Wards:', wards.length);
    console.log('  - Requests:', requests.length);
    console.log('  - Incidents:', incidents.length);
    
    return {
      success: true,
      data: { devices: devices.length, wards: wards.length, requests: requests.length, incidents: incidents.length }
    };
  } catch (error: any) {
    console.error('❌ Dashboard Data Flow Error:', error.message);
    return { success: false, error: error.message };
  }
};
