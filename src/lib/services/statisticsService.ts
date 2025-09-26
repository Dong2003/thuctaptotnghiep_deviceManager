import { collection, getDocs, query, where, doc, updateDoc } from "firebase/firestore";
import { db } from "../firebase";
import { Device } from "./deviceService";
import { Ward } from "./wardService";

// Helper function để kiểm tra bản quyền Windows
const checkWindowsLicense = (device: Device): boolean => {
  const os = device.specifications?.os || '';
  const isWindows = os.toLowerCase().includes('windows');
  
  if (!isWindows) return false;
  
  // Ưu tiên trường windowsLicense hoặc license nếu có
  if (device.specifications?.windowsLicense) {
    return device.specifications.windowsLicense === 'licensed';
  }
  
  // Kiểm tra trường license cũ (để tương thích ngược)
  if ((device.specifications as any)?.license) {
    return (device.specifications as any).license === 'licensed';
  }
  
  // Fallback: Kiểm tra nhiều điều kiện để xác định bản quyền
  const brand = device.specifications?.brand?.toLowerCase() || '';
  const model = device.specifications?.model?.toLowerCase() || '';
  const vendor = device.vendor?.toLowerCase() || '';
  const description = device.description?.toLowerCase() || '';
  
  // Các từ khóa chỉ bản quyền hợp lệ
  const licensedKeywords = [
    'licensed', 'bản quyền', 'genuine', 'authentic', 'original',
    'microsoft', 'oem', 'retail', 'volume', 'enterprise',
    'professional', 'pro', 'business', 'education'
  ];
  
  // Các từ khóa chỉ bản quyền không hợp lệ
  const unlicensedKeywords = [
    'crack', 'pirate', 'hack', 'unlicensed', 'trial', 'evaluation',
    'test', 'demo', 'beta', 'preview', 'kms', 'activator'
  ];
  
  const hasLicensedKeyword = licensedKeywords.some(keyword => 
    brand.includes(keyword) || model.includes(keyword) || 
    vendor.includes(keyword) || description.includes(keyword)
  );
  
  const hasUnlicensedKeyword = unlicensedKeywords.some(keyword => 
    brand.includes(keyword) || model.includes(keyword) || 
    vendor.includes(keyword) || description.includes(keyword)
  );
  
  // Logic xác định bản quyền
  if (hasUnlicensedKeyword) {
    return false;
  } else if (hasLicensedKeyword) {
    return true;
  } else {
    // Mặc định coi là chưa kích hoạt nếu không có thông tin rõ ràng
    return false;
  }
};

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
    osBreakdown: Record<string, number>;
    licenseBreakdown: {
      licensed: number;
      unlicensed: number;
    };
  }>;
  devicesByType: Record<string, number>;
  overallStatusBreakdown: {
    active: number;
    inactive: number;
    maintenance: number;
    error: number;
  };
  overallOsBreakdown: Record<string, number>;
  overallLicenseBreakdown: {
    licensed: number;
    unlicensed: number;
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
  osBreakdown: Record<string, number>;
  licenseBreakdown: {
    licensed: number;
    unlicensed: number;
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

export interface SystemStatistics {
  devices: DeviceStatistics;
  wards: Ward[];
  expiry: ExpiryStatistics;
  summary: {
    totalDevices: number;
    totalWards: number;
    totalUsers: number;
    activeDevices: number;
    inactiveDevices: number;
    assignedDevices: number;
    unassignedDevices: number;
    criticalDevices: number;
    warningDevices: number;
    upcomingDevices: number;
  };
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

      // Thống kê hệ điều hành
      const osBreakdown = devices.reduce((acc, device) => {
        const os = device.specifications?.os || 'Unknown';
        acc[os] = (acc[os] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      // Thống kê bản quyền Windows
      const licenseBreakdown = devices.reduce((acc, device) => {
        const os = device.specifications?.os || '';
        const isWindows = os.toLowerCase().includes('windows');
        
        if (isWindows) {
          const isLicensed = checkWindowsLicense(device);
          if (isLicensed) {
            acc.licensed = (acc.licensed || 0) + 1;
          } else {
            acc.unlicensed = (acc.unlicensed || 0) + 1;
          }
        }
        return acc;
      }, {
        licensed: 0,
        unlicensed: 0
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
        },
        osBreakdown,
        licenseBreakdown: {
          licensed: licenseBreakdown.licensed || 0,
          unlicensed: licenseBreakdown.unlicensed || 0
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

    // Thống kê tổng quan theo hệ điều hành
    const overallOsBreakdown = devices.reduce((acc, device) => {
      const os = device.specifications?.os || 'Unknown';
      acc[os] = (acc[os] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Thống kê tổng quan theo bản quyền Windows
    const overallLicenseBreakdown = devices.reduce((acc, device) => {
      const os = device.specifications?.os || '';
      const isWindows = os.toLowerCase().includes('windows');
      
      if (isWindows) {
        const isLicensed = checkWindowsLicense(device);
        if (isLicensed) {
          acc.licensed = (acc.licensed || 0) + 1;
        } else {
          acc.unlicensed = (acc.unlicensed || 0) + 1;
        }
      }
      return acc;
    }, {
      licensed: 0,
      unlicensed: 0
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
      },
      overallOsBreakdown,
      overallLicenseBreakdown: {
        licensed: overallLicenseBreakdown.licensed || 0,
        unlicensed: overallLicenseBreakdown.unlicensed || 0
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

    // Thống kê hệ điều hành
    const osBreakdown = devices.reduce((acc, device) => {
      const os = device.specifications?.os || 'Unknown';
      acc[os] = (acc[os] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Thống kê bản quyền Windows
    const licenseBreakdown = devices.reduce((acc, device) => {
      const os = device.specifications?.os || '';
      const isWindows = os.toLowerCase().includes('windows');
      
      if (isWindows) {
        const isLicensed = checkWindowsLicense(device);
        if (isLicensed) {
          acc.licensed = (acc.licensed || 0) + 1;
        } else {
          acc.unlicensed = (acc.unlicensed || 0) + 1;
        }
      }
      return acc;
    }, {
      licensed: 0,
      unlicensed: 0
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
      osBreakdown,
      licenseBreakdown: {
        licensed: licenseBreakdown.licensed || 0,
        unlicensed: licenseBreakdown.unlicensed || 0
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

// Hàm để cập nhật thiết bị hiện có với trường windowsLicense
export const updateDevicesWithLicenseField = async (): Promise<void> => {
  try {
    console.log("Đang cập nhật thiết bị với trường windowsLicense...");
    
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

    console.log(`Tìm thấy ${devices.length} thiết bị để cập nhật`);

    // Cập nhật từng thiết bị
    for (const device of devices) {
      const os = device.specifications?.os || '';
      const isWindows = os.toLowerCase().includes('windows');
      
      if (isWindows && !device.specifications?.windowsLicense) {
        // Kiểm tra trường license cũ trước
        let licenseStatus: 'licensed' | 'unlicensed' | 'unknown' = 'unknown';
        
        if ((device.specifications as any)?.license) {
          licenseStatus = (device.specifications as any).license === 'licensed' ? 'licensed' : 'unlicensed';
        } else {
          // Xác định trạng thái bản quyền dựa trên logic hiện tại
          const brand = device.specifications?.brand?.toLowerCase() || '';
          const model = device.specifications?.model?.toLowerCase() || '';
          const vendor = device.vendor?.toLowerCase() || '';
          const description = device.description?.toLowerCase() || '';
          
          const licensedKeywords = [
            'licensed', 'bản quyền', 'genuine', 'authentic', 'original',
            'microsoft', 'oem', 'retail', 'volume', 'enterprise',
            'professional', 'pro', 'business', 'education'
          ];
          
          const unlicensedKeywords = [
            'crack', 'pirate', 'hack', 'unlicensed', 'trial', 'evaluation',
            'test', 'demo', 'beta', 'preview', 'kms', 'activator'
          ];
          
          const hasLicensedKeyword = licensedKeywords.some(keyword => 
            brand.includes(keyword) || model.includes(keyword) || 
            vendor.includes(keyword) || description.includes(keyword)
          );
          
          const hasUnlicensedKeyword = unlicensedKeywords.some(keyword => 
            brand.includes(keyword) || model.includes(keyword) || 
            vendor.includes(keyword) || description.includes(keyword)
          );
          
          if (hasUnlicensedKeyword) {
            licenseStatus = 'unlicensed';
          } else if (hasLicensedKeyword) {
            licenseStatus = 'licensed';
          } else {
            licenseStatus = 'unlicensed'; // Mặc định
          }
        }
        
        // Cập nhật thiết bị với trường windowsLicense
        const deviceRef = doc(db, 'devices', device.id);
        await updateDoc(deviceRef, {
          'specifications.windowsLicense': licenseStatus,
          updatedAt: new Date()
        });
        
        console.log(`Đã cập nhật thiết bị ${device.name} với license: ${licenseStatus}`);
      }
    }
    
    console.log("Hoàn thành cập nhật thiết bị với trường windowsLicense");
  } catch (error: any) {
    throw new Error(error.message || 'Failed to update devices with license field');
  }
};

// Hàm để tạo dữ liệu mẫu cho test (có thể xóa sau khi test xong)
export const createSampleDevicesForTesting = async (): Promise<void> => {
  try {
    const sampleDevices = [
      {
        name: "PC Văn phòng 1",
        type: "desktop",
        status: "active",
        location: "Phòng làm việc",
        wardId: "ward1",
        wardName: "Phường 1",
        vendor: "Microsoft Licensed",
        description: "Máy tính văn phòng có bản quyền Windows",
        specifications: {
          os: "Windows 11 Pro",
          brand: "Microsoft Licensed",
          model: "Dell OptiPlex 7090",
          cpu: "Intel Core i5",
          ram: "8GB",
          storage: "256GB SSD",
          windowsLicense: "licensed"
        },
        installationDate: new Date(),
        createdBy: "admin",
        assignedTo: null,
        assignedToName: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: "Laptop Giám đốc",
        type: "laptop", 
        status: "active",
        location: "Phòng giám đốc",
        wardId: "ward1",
        wardName: "Phường 1",
        vendor: "HP Enterprise",
        description: "Laptop cao cấp với Windows Enterprise",
        specifications: {
          os: "Windows 11 Enterprise",
          brand: "HP Enterprise",
          model: "EliteBook 850",
          cpu: "Intel Core i7",
          ram: "16GB",
          storage: "512GB SSD",
          windowsLicense: "licensed"
        },
        installationDate: new Date(),
        createdBy: "admin",
        assignedTo: "user1",
        assignedToName: "Nguyễn Văn A",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: "PC Phòng IT",
        type: "desktop",
        status: "active", 
        location: "Phòng IT",
        wardId: "ward2",
        wardName: "Phường 2",
        vendor: "Dell OEM",
        description: "Máy tính phòng IT với Windows OEM",
        specifications: {
          os: "Windows 10 Pro",
          brand: "Dell OEM",
          model: "OptiPlex 3080",
          cpu: "Intel Core i3",
          ram: "4GB",
          storage: "128GB SSD",
          windowsLicense: "licensed"
        },
        installationDate: new Date(),
        createdBy: "admin",
        assignedTo: null,
        assignedToName: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: "PC Test",
        type: "desktop",
        status: "inactive",
        location: "Kho",
        wardId: "ward2", 
        wardName: "Phường 2",
        vendor: "Unknown",
        description: "Máy tính test với Windows crack",
        specifications: {
          os: "Windows 10",
          brand: "Crack Version",
          model: "Generic PC",
          cpu: "Intel Core i3",
          ram: "4GB",
          storage: "500GB HDD",
          windowsLicense: "unlicensed"
        },
        installationDate: new Date(),
        createdBy: "admin",
        assignedTo: null,
        assignedToName: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: "Laptop Nhân viên",
        type: "laptop",
        status: "active",
        location: "Bàn làm việc",
        wardId: "ward3",
        wardName: "Phường 3", 
        vendor: "Lenovo Business",
        description: "Laptop nhân viên với Windows Business",
        specifications: {
          os: "Windows 11 Business",
          brand: "Lenovo Business",
          model: "ThinkPad E15",
          cpu: "AMD Ryzen 5",
          ram: "8GB",
          storage: "256GB SSD",
          windowsLicense: "licensed"
        },
        installationDate: new Date(),
        createdBy: "admin",
        assignedTo: "user2",
        assignedToName: "Trần Thị B",
        createdAt: new Date(),
        updatedAt: new Date(),
      }
    ];

    console.log("Tạo dữ liệu mẫu cho test...");
    // Note: Trong thực tế, bạn sẽ sử dụng addDoc để thêm vào Firestore
    // await Promise.all(sampleDevices.map(device => addDoc(collection(db, 'devices'), device)));
    console.log("Dữ liệu mẫu đã được tạo:", sampleDevices);
  } catch (error: any) {
    throw new Error(error.message || 'Failed to create sample devices');
  }
};

// Lấy thống kê toàn hệ thống (chỉ dành cho center)
export const getSystemStatistics = async (): Promise<SystemStatistics> => {
  try {
    // Lấy tất cả thống kê song song
    const [deviceStats, wards, expiryStats] = await Promise.all([
      getDeviceStatistics(),
      getAllWards(),
      getExpiryStatistics()
    ]);

    // Tính toán tổng số người dùng
    const usersSnapshot = await getDocs(collection(db, 'users'));
    const totalUsers = usersSnapshot.size;

    // Tính toán số thiết bị đã phân bổ và chưa phân bổ
    const devicesSnapshot = await getDocs(collection(db, 'devices'));
    const devices = devicesSnapshot.docs.map(doc => doc.data());
    const assignedDevices = devices.filter(d => d.assignedTo).length;
    const unassignedDevices = devices.length - assignedDevices;

    const summary = {
      totalDevices: deviceStats.totalDevices,
      totalWards: wards.length,
      totalUsers,
      activeDevices: deviceStats.overallStatusBreakdown.active,
      inactiveDevices: deviceStats.overallStatusBreakdown.inactive,
      assignedDevices,
      unassignedDevices,
      criticalDevices: expiryStats.criticalDevices.length,
      warningDevices: expiryStats.warningDevices.length,
      upcomingDevices: expiryStats.upcomingDevices.length
    };

    return {
      devices: deviceStats,
      wards,
      expiry: expiryStats,
      summary
    };
  } catch (error: any) {
    throw new Error(error.message || 'Failed to get system statistics');
  }
};
