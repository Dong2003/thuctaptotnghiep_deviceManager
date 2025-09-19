import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../firebase";
import { Device } from "./deviceService";
import { Ward } from "./wardService";

export interface DeviceStatistics {
  totalDevices: number;
  devicesByWard: Array<{
    wardId: string;
    wardName: string;
    totalDevices: number;
    devicesByType: Record<string, number>;
    statusBreakdown: {
      active: number;
      inactive: number;
      maintenance: number;
      error: number;
    };
  }>;
  devicesByType: Record<string, number>;
  overallStatusBreakdown: {
    active: number;
    inactive: number;
    maintenance: number;
    error: number;
  };
}

export interface WardStatistics {
  wardId: string;
  wardName: string;
  totalDevices: number;
  devicesByType: Record<string, number>;
  statusBreakdown: {
    active: number;
    inactive: number;
    maintenance: number;
    error: number;
  };
  assignedDevices: number;
  unassignedDevices: number;
  devices?: Device[]; // Danh sách thiết bị chi tiết
}

export interface ExpiringDevice {
  id: string;
  name: string;
  type: string;
  wardId: string;
  wardName: string;
  location: string;
  installationDate: Date;
  expiryDate: Date;
  daysUntilExpiry: number;
  assignedToName?: string;
  status: string;
  vendor?: string;
}

export interface ExpiryStatistics {
  totalExpiringDevices: number;
  criticalDevices: ExpiringDevice[]; // < 7 ngày
  warningDevices: ExpiringDevice[]; // 7-30 ngày
  upcomingDevices: ExpiringDevice[]; // 30-90 ngày
  byWard: Array<{
    wardId: string;
    wardName: string;
    expiringCount: number;
    criticalCount: number;
    warningCount: number;
  }>;
}

// Lấy thống kê tổng quan thiết bị
export const getDeviceStatistics = async (): Promise<DeviceStatistics> => {
  try {
    // Lấy tất cả thiết bị
    const devicesSnapshot = await getDocs(collection(db, 'devices'));
    const devices: Device[] = devicesSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        name: data.name || "Unknown",
        type: data.type || "other",
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

    // Lấy tất cả phường
    const wardsSnapshot = await getDocs(collection(db, 'wards'));
    const wards: Ward[] = wardsSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        name: data.name || "Unknown Ward",
        address: data.address || "",
        contactPerson: data.contactPerson || "",
        phone: data.phone || "",
        email: data.email || "",
      } as Ward;
    });

    // Tạo map wardId -> wardName
    const wardMap = new Map(wards.map(ward => [ward.id, ward.name]));

    // Thống kê theo phường
    const devicesByWard = new Map<string, {
      wardId: string;
      wardName: string;
      devices: Device[];
    }>();

    devices.forEach(device => {
      if (device.wardId) {
        if (!devicesByWard.has(device.wardId)) {
          devicesByWard.set(device.wardId, {
            wardId: device.wardId,
            wardName: wardMap.get(device.wardId) || device.wardName || "Unknown",
            devices: []
          });
        }
        devicesByWard.get(device.wardId)!.devices.push(device);
      }
    });

    // Tính toán thống kê theo phường
    const wardStatistics = Array.from(devicesByWard.values()).map(wardData => {
      const devices = wardData.devices;
      const devicesByType = devices.reduce((acc, device) => {
        acc[device.type || 'other'] = (acc[device.type || 'other'] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const statusBreakdown = devices.reduce((acc, device) => {
        acc[device.status] = (acc[device.status] || 0) + 1;
        return acc;
      }, {
        active: 0,
        inactive: 0,
        maintenance: 0,
        error: 0
      } as Record<string, number>);

      return {
        wardId: wardData.wardId,
        wardName: wardData.wardName,
        totalDevices: devices.length,
        devicesByType,
        statusBreakdown: {
          active: statusBreakdown.active || 0,
          inactive: statusBreakdown.inactive || 0,
          maintenance: statusBreakdown.maintenance || 0,
          error: statusBreakdown.error || 0
        }
      };
    });

    // Thống kê tổng quan theo loại thiết bị
    const devicesByType = devices.reduce((acc, device) => {
      acc[device.type || 'other'] = (acc[device.type || 'other'] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Thống kê tổng quan theo trạng thái
    const overallStatusBreakdown = devices.reduce((acc, device) => {
      acc[device.status] = (acc[device.status] || 0) + 1;
      return acc;
    }, {
      active: 0,
      inactive: 0,
      maintenance: 0,
      error: 0
    } as Record<string, number>);

    return {
      totalDevices: devices.length,
      devicesByWard: wardStatistics,
      devicesByType,
      overallStatusBreakdown: {
        active: overallStatusBreakdown.active || 0,
        inactive: overallStatusBreakdown.inactive || 0,
        maintenance: overallStatusBreakdown.maintenance || 0,
        error: overallStatusBreakdown.error || 0
      }
    };
  } catch (error: any) {
    throw new Error(error.message || 'Failed to get device statistics');
  }
};

// Lấy thống kê chi tiết theo phường
export const getWardStatistics = async (wardId: string): Promise<WardStatistics | null> => {
  try {
    const q = query(collection(db, 'devices'), where('wardId', '==', wardId));
    const devicesSnapshot = await getDocs(q);
    
    const devices: Device[] = devicesSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        name: data.name || "Unknown",
        type: data.type || "other",
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

    if (devices.length === 0) {
      return null;
    }

    const devicesByType = devices.reduce((acc, device) => {
      acc[device.type || 'other'] = (acc[device.type || 'other'] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const statusBreakdown = devices.reduce((acc, device) => {
      acc[device.status] = (acc[device.status] || 0) + 1;
      return acc;
    }, {
      active: 0,
      inactive: 0,
      maintenance: 0,
      error: 0
    } as Record<string, number>);

    const assignedDevices = devices.filter(d => d.assignedTo).length;
    const unassignedDevices = devices.length - assignedDevices;

    return {
      wardId,
      wardName: devices[0]?.wardName || "Unknown",
      totalDevices: devices.length,
      devicesByType,
      statusBreakdown: {
        active: statusBreakdown.active || 0,
        inactive: statusBreakdown.inactive || 0,
        maintenance: statusBreakdown.maintenance || 0,
        error: statusBreakdown.error || 0
      },
      assignedDevices,
      unassignedDevices,
      devices // Thêm danh sách thiết bị chi tiết
    };
  } catch (error: any) {
    throw new Error(error.message || 'Failed to get ward statistics');
  }
};

// Lấy danh sách tất cả phường
export const getAllWards = async (): Promise<Ward[]> => {
  try {
    const wardsSnapshot = await getDocs(collection(db, 'wards'));
    return wardsSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        name: data.name || "Unknown Ward",
        code: data.code || "",
        district: data.district || "",
        city: data.city || "",
        address: data.address || "",
        contactPerson: data.contactPerson || "",
        phone: data.phone || "",
        email: data.email || "",
        population: data.population,
        area: data.area,
        description: data.description,
        isActive: data.isActive !== false,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
      } as Ward;
    });
  } catch (error: any) {
    throw new Error(error.message || 'Failed to get wards');
  }
};

// Lấy thống kê thiết bị sắp hết hạn sử dụng
export const getExpiryStatistics = async (): Promise<ExpiryStatistics> => {
  try {
    // Lấy tất cả thiết bị
    const devicesSnapshot = await getDocs(collection(db, 'devices'));
    const devices: Device[] = devicesSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        name: data.name || "Unknown",
        type: data.type || "other",
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

    const now = new Date();
    const expiringDevices: ExpiringDevice[] = [];

    devices.forEach(device => {
      const installationDate = device.installationDate;
      const expiryDate = new Date(installationDate);
      expiryDate.setFullYear(expiryDate.getFullYear() + 5); // 5 năm từ ngày cài đặt
      
      const daysUntilExpiry = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      
      // Chỉ lấy thiết bị còn 90 ngày trở xuống
      if (daysUntilExpiry <= 90 && daysUntilExpiry >= 0) {
        expiringDevices.push({
          id: device.id,
          name: device.name,
          type: device.type || 'other',
          wardId: device.wardId,
          wardName: device.wardName,
          location: device.location,
          installationDate,
          expiryDate,
          daysUntilExpiry,
          assignedToName: device.assignedToName,
          status: device.status,
          vendor: device.vendor
        });
      }
    });

    // Phân loại theo mức độ khẩn cấp
    const criticalDevices = expiringDevices.filter(d => d.daysUntilExpiry < 7);
    const warningDevices = expiringDevices.filter(d => d.daysUntilExpiry >= 7 && d.daysUntilExpiry < 30);
    const upcomingDevices = expiringDevices.filter(d => d.daysUntilExpiry >= 30 && d.daysUntilExpiry <= 90);

    // Thống kê theo phường
    const wardMap = new Map<string, { wardName: string; expiringCount: number; criticalCount: number; warningCount: number }>();
    
    expiringDevices.forEach(device => {
      if (!wardMap.has(device.wardId)) {
        wardMap.set(device.wardId, {
          wardName: device.wardName,
          expiringCount: 0,
          criticalCount: 0,
          warningCount: 0
        });
      }
      
      const wardStats = wardMap.get(device.wardId)!;
      wardStats.expiringCount++;
      
      if (device.daysUntilExpiry < 7) {
        wardStats.criticalCount++;
      } else if (device.daysUntilExpiry < 30) {
        wardStats.warningCount++;
      }
    });

    const byWard = Array.from(wardMap.entries()).map(([wardId, stats]) => ({
      wardId,
      wardName: stats.wardName,
      expiringCount: stats.expiringCount,
      criticalCount: stats.criticalCount,
      warningCount: stats.warningCount
    }));

    return {
      totalExpiringDevices: expiringDevices.length,
      criticalDevices,
      warningDevices,
      upcomingDevices,
      byWard
    };
  } catch (error: any) {
    throw new Error(error.message || 'Failed to get expiry statistics');
  }
};
