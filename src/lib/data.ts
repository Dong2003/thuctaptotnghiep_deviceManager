export interface Device {
  id: string;
  name: string;
  type: 'laptop' | 'desktop' | 'printer' | 'monitor' | 'other';
  specifications: {
    cpu?: string;
    ram?: string;
    storage?: string;
    gpu?: string;
    os?: string;
    brand?: string;
    model?: string;
  };
  supplier: string;
  manufacturingDate: string;
  depreciationYears: number;
  status: 'available' | 'allocated' | 'in_use' | 'maintenance' | 'broken';
  wardId?: string;
  userId?: string;
  purchasePrice: number;
  currentValue: number;
  createdAt: string;
  updatedAt: string;
}

export interface Ward {
  id: string;
  name: string;
  address: string;
  contactPerson: string;
  phone: string;
  email: string;
}

export interface DeviceRequest {
  id: string;
  wardId: string;
  deviceType: string;
  quantity: number;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  requestDate: string;
  responseDate?: string;
  notes?: string;
}

export interface IncidentReport {
  id: string;
  deviceId: string;
  userId: string;
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  reportDate: string;
  resolvedDate?: string;
  resolution?: string;
}

// Mock data
export const mockUsers = [
  {
    id: '4',
    name: 'Nguyễn Văn A',
    username: 'user_nguyen_van_a',
  },
  {
    id: '5',
    name: 'Trần Thị B',
    username: 'user_tran_thi_b',
  },
];

export const mockWards: Ward[] = [
  {
    id: 'ward_1',
    name: 'Phường Ba Đình',
    address: '123 Đường Ba Đình, Quận Ba Đình, Hà Nội',
    contactPerson: 'Nguyễn Văn A',
    phone: '024-1234-5678',
    email: 'badinh@hanoi.gov.vn',
  },
  {
    id: 'ward_2',
    name: 'Phường Hoàn Kiếm',
    address: '456 Đường Hoàn Kiếm, Quận Hoàn Kiếm, Hà Nội',
    contactPerson: 'Trần Thị B',
    phone: '024-8765-4321',
    email: 'hoankiem@hanoi.gov.vn',
  },
];

export const mockDevices: Device[] = [
  {
    id: 'dev_1',
    name: 'Laptop Dell Latitude 5520',
    type: 'laptop',
    specifications: {
      cpu: 'Intel Core i5-1135G7',
      ram: '8GB DDR4',
      storage: '256GB SSD',
      gpu: 'Intel Iris Xe Graphics',
      os: 'Windows 11 Pro',
      brand: 'Dell',
      model: 'Latitude 5520',
    },
    supplier: 'Công ty TNHH Dell Việt Nam',
    manufacturingDate: '2023-06-15',
    depreciationYears: 4,
    status: 'in_use',
    wardId: 'ward_1',
    userId: '4',
    purchasePrice: 25000000,
    currentValue: 18750000,
    createdAt: '2023-07-01',
    updatedAt: '2024-01-15',
  },
  {
    id: 'dev_2',
    name: 'Desktop HP EliteDesk 800',
    type: 'desktop',
    specifications: {
      cpu: 'Intel Core i7-12700',
      ram: '16GB DDR4',
      storage: '512GB SSD',
      gpu: 'Intel UHD Graphics 770',
      os: 'Windows 11 Pro',
      brand: 'HP',
      model: 'EliteDesk 800 G9',
    },
    supplier: 'Công ty TNHH HP Việt Nam',
    manufacturingDate: '2023-08-20',
    depreciationYears: 5,
    status: 'allocated',
    wardId: 'ward_2',
    purchasePrice: 30000000,
    currentValue: 24000000,
    createdAt: '2023-09-01',
    updatedAt: '2024-02-10',
  },
  {
    id: 'dev_3',
    name: 'Máy in Laser Canon LBP6030',
    type: 'printer',
    specifications: {
      brand: 'Canon',
      model: 'LBP6030',
      os: 'Driver Windows/macOS/Linux',
    },
    supplier: 'Công ty TNHH Canon Việt Nam',
    manufacturingDate: '2023-05-10',
    depreciationYears: 3,
    status: 'available',
    purchasePrice: 3500000,
    currentValue: 2333333,
    createdAt: '2023-06-01',
    updatedAt: '2024-01-01',
  },
  {
    id: 'dev_4',
    name: 'Monitor Dell P2422H',
    type: 'monitor',
    specifications: {
      brand: 'Dell',
      model: 'P2422H',
      cpu: '24 inch Full HD IPS',
    },
    supplier: 'Công ty TNHH Dell Việt Nam',
    manufacturingDate: '2023-07-05',
    depreciationYears: 5,
    status: 'in_use',
    wardId: 'ward_1',
    userId: '4',
    purchasePrice: 5000000,
    currentValue: 4000000,
    createdAt: '2023-08-01',
    updatedAt: '2024-01-20',
  },
];

export const mockDeviceRequests: DeviceRequest[] = [
  {
    id: 'req_1',
    wardId: 'ward_1',
    deviceType: 'laptop',
    quantity: 2,
    reason: 'Cần thêm laptop cho nhân viên mới',
    status: 'pending',
    requestDate: '2024-03-01',
  },
  {
    id: 'req_2',
    wardId: 'ward_2',
    deviceType: 'printer',
    quantity: 1,
    reason: 'Máy in cũ bị hỏng, cần thay thế',
    status: 'approved',
    requestDate: '2024-02-15',
    responseDate: '2024-02-20',
    notes: 'Đã phê duyệt, sẽ giao trong tuần tới',
  },
];

export const mockIncidentReports: IncidentReport[] = [
  {
    id: 'inc_1',
    deviceId: 'dev_1',
    userId: '4',
    title: 'Laptop không khởi động được',
    description: 'Laptop bật lên hiển thị màn hình đen, không vào được Windows',
    severity: 'high',
    status: 'in_progress',
    reportDate: '2024-03-05',
  },
  {
    id: 'inc_2',
    deviceId: 'dev_4',
    userId: '4',
    title: 'Màn hình bị nhấp nháy',
    description: 'Màn hình thỉnh thoảng bị nhấp nháy, ảnh hưởng đến công việc',
    severity: 'medium',
    status: 'open',
    reportDate: '2024-03-03',
  },
];

// Helper functions
export const getDevicesByWard = (wardId: string): Device[] => {
  return mockDevices.filter(device => device.wardId === wardId);
};

export const getDevicesByUser = (userId: string): Device[] => {
  return mockDevices.filter(device => device.userId === userId);
};

export const getAvailableDevices = (): Device[] => {
  return mockDevices.filter(device => device.status === 'available');
};

export const getDeviceTypeDisplayName = (type: string): string => {
  switch (type) {
    case 'laptop':
      return 'Laptop';
    case 'desktop':
      return 'Máy tính để bàn';
    case 'printer':
      return 'Máy in';
    case 'monitor':
      return 'Màn hình';
    case 'other':
      return 'Thiết bị khác';
    default:
      return 'Không xác định';
  }
};

export const getStatusDisplayName = (status: string): string => {
  switch (status) {
    case 'available':
      return 'Có sẵn';
    case 'allocated':
      return 'Đã phân bổ';
    case 'in_use':
      return 'Đang sử dụng';
    case 'maintenance':
      return 'Bảo trì';
    case 'broken':
      return 'Hỏng';
    default:
      return 'Không xác định';
  }
};

// Firebase API functions
import { getDevices } from './services/deviceService';
import { getWards } from './services/wardService';
import { getIncidents } from './services/incidentService';
import { getDeviceRequests } from './services/deviceRequestService';

// Fetch all devices from Firebase
export const fetchDevices = async () => {
  try {
    const devices = await getDevices();
    return devices;
  } catch (error) {
    console.error('Error fetching devices:', error);
    return [];
  }
};

// Fetch all wards from Firebase
export const fetchWards = async () => {
  try {
    const wards = await getWards();
    return wards;
  } catch (error) {
    console.error('Error fetching wards:', error);
    return [];
  }
};

// Fetch all incidents from Firebase
export const fetchIncidentReports = async () => {
  try {
    const incidents = await getIncidents();
    return incidents;
  } catch (error) {
    console.error('Error fetching incidents:', error);
    return [];
  }
};

// Fetch all device requests from Firebase
export const fetchDeviceRequests = async () => {
  try {
    const requests = await getDeviceRequests();
    return requests;
  } catch (error) {
    console.error('Error fetching device requests:', error);
    return [];
  }
};