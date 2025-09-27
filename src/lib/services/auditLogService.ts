import { collection, addDoc, getDocs, query, where, orderBy, limit, Timestamp } from 'firebase/firestore';
import { db } from '../firebase';

export interface AuditLog {
  id: string;
  userId: string;
  userEmail: string;
  userName: string;
  userRole: 'center' | 'ward' | 'user';
  action: string;
  resource: string;
  resourceId?: string;
  details?: any;
  timestamp: Date;
  wardId?: string;
  wardName?: string;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
}

export interface AuditLogFilters {
  userId?: string;
  userRole?: string;
  action?: string;
  resource?: string;
  wardId?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
}

// Các loại thao tác trong hệ thống
export const AUDIT_ACTIONS = {
  // Authentication
  LOGIN: 'login',
  LOGOUT: 'logout',
  REGISTER: 'register',
  PASSWORD_CHANGE: 'password_change',
  
  // Device Management
  DEVICE_CREATE: 'device_create',
  DEVICE_UPDATE: 'device_update',
  DEVICE_DELETE: 'device_delete',
  DEVICE_ASSIGN: 'device_assign',
  DEVICE_UNASSIGN: 'device_unassign',
  DEVICE_STATUS_CHANGE: 'device_status_change',
  
  // Request Management
  REQUEST_CREATE: 'request_create',
  REQUEST_APPROVE: 'request_approve',
  REQUEST_REJECT: 'request_reject',
  REQUEST_ALLOCATE: 'request_allocate',
  REQUEST_DELIVER: 'request_deliver',
  REQUEST_RECEIVE: 'request_receive',
  
  // Incident Management
  INCIDENT_CREATE: 'incident_create',
  INCIDENT_UPDATE: 'incident_update',
  INCIDENT_RESOLVE: 'incident_resolve',
  INCIDENT_CLOSE: 'incident_close',
  
  // Ward Management
  WARD_CREATE: 'ward_create',
  WARD_UPDATE: 'ward_update',
  WARD_DELETE: 'ward_delete',
  
  // User Management
  USER_CREATE: 'user_create',
  USER_UPDATE: 'user_update',
  USER_DELETE: 'user_delete',
  USER_ACTIVATE: 'user_activate',
  USER_DEACTIVATE: 'user_deactivate',
  
  // System
  SYSTEM_BACKUP: 'system_backup',
  SYSTEM_RESTORE: 'system_restore',
  SYSTEM_CONFIG_CHANGE: 'system_config_change',
  DATA_EXPORT: 'data_export',
  DATA_IMPORT: 'data_import'
} as const;

// Các loại tài nguyên
export const AUDIT_RESOURCES = {
  SYSTEM: 'system',
  USER: 'user',
  DEVICE: 'device',
  REQUEST: 'request',
  INCIDENT: 'incident',
  WARD: 'ward',
  REPORT: 'report',
  CONFIG: 'config'
} as const;

// Ghi log thao tác
export const logAction = async (logData: Omit<AuditLog, 'id' | 'timestamp' | 'createdAt'>): Promise<void> => {
  try {
    console.log('Logging action:', logData.action, 'on', logData.resource);
    
    const logEntry = {
      ...logData,
      timestamp: Timestamp.now(),
      createdAt: Timestamp.now()
    };
    
    const docRef = await addDoc(collection(db, 'auditLogs'), logEntry);
    console.log('Audit log created with ID:', docRef.id);
  } catch (error: any) {
    console.error('Error logging action:', error);
    
    // Fallback to localStorage
    try {
      const backupLog = {
        ...logData,
        timestamp: new Date().toISOString(),
        id: `backup_${Date.now()}`,
        error: 'Failed to write to Firestore'
      };
      
      const existingLogs = JSON.parse(localStorage.getItem('auditLogs_backup') || '[]');
      existingLogs.push(backupLog);
      localStorage.setItem('auditLogs_backup', JSON.stringify(existingLogs));
      
      console.log('Logged to localStorage backup:', backupLog);
    } catch (backupError) {
      console.error('Failed to backup log to localStorage:', backupError);
    }
    
    throw new Error(`Không thể ghi log thao tác: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

// Lấy danh sách audit logs
export const getAuditLogs = async (filters: AuditLogFilters = {}): Promise<AuditLog[]> => {
  try {
    console.log('Fetching audit logs with filters:', filters);
    
    let q = query(collection(db, 'auditLogs'));
    
    // Apply filters
    if (filters.userId) {
      q = query(q, where('userId', '==', filters.userId));
    }
    if (filters.userRole) {
      q = query(q, where('userRole', '==', filters.userRole));
    }
    if (filters.action) {
      q = query(q, where('action', '==', filters.action));
    }
    if (filters.resource) {
      q = query(q, where('resource', '==', filters.resource));
    }
    if (filters.wardId) {
      q = query(q, where('wardId', '==', filters.wardId));
    }
    if (filters.startDate) {
      q = query(q, where('timestamp', '>=', Timestamp.fromDate(filters.startDate)));
    }
    if (filters.endDate) {
      q = query(q, where('timestamp', '<=', Timestamp.fromDate(filters.endDate)));
    }
    
    // Không sử dụng orderBy để tránh lỗi Firestore index
    // Sẽ sort trong JavaScript thay vì Firestore
    if (filters.limit) {
      q = query(q, limit(filters.limit));
    }
    
    const querySnapshot = await getDocs(q);
    const logs = querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        timestamp: data.timestamp?.toDate() || new Date(),
        createdAt: data.createdAt?.toDate() || new Date()
      } as AuditLog;
    });
    
    // Sort by timestamp descending trong JavaScript thay vì Firestore
    logs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    
    console.log(`Found ${logs.length} audit logs from Firestore`);
    
    // Fallback to localStorage if no logs found
    if (logs.length === 0) {
      try {
        const backupLogs = JSON.parse(localStorage.getItem('auditLogs_backup') || '[]');
        console.log(`Found ${backupLogs.length} backup logs from localStorage`);
        
        const backupAuditLogs: AuditLog[] = backupLogs.map((log: any) => ({
          ...log,
          timestamp: new Date(log.timestamp),
          createdAt: new Date(log.createdAt || log.timestamp)
        }));
        
        return backupAuditLogs;
      } catch (backupError) {
        console.error('Error reading backup logs:', backupError);
      }
    }
    
    return logs;
  } catch (error: any) {
    console.error('Error getting audit logs:', error);
    
    // Fallback to localStorage
    try {
      const backupLogs = JSON.parse(localStorage.getItem('auditLogs_backup') || '[]');
      console.log(`Using ${backupLogs.length} backup logs from localStorage`);
      
      const backupAuditLogs: AuditLog[] = backupLogs.map((log: any) => ({
        ...log,
        timestamp: new Date(log.timestamp),
        createdAt: new Date(log.createdAt || log.timestamp)
      }));
      
      return backupAuditLogs;
    } catch (backupError) {
      console.error('Error reading backup logs:', backupError);
      throw new Error(`Không thể lấy danh sách log thao tác: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
};

// Thống kê audit logs
export const getAuditLogStatistics = async (filters: AuditLogFilters = {}): Promise<{
  totalLogs: number;
  logsByAction: { [key: string]: number };
  logsByUser: { [key: string]: number };
  logsByResource: { [key: string]: number };
  logsByRole: { [key: string]: number };
  logsByWard: { [key: string]: number };
  recentActivity: AuditLog[];
}> => {
  try {
    const logs = await getAuditLogs({ ...filters, limit: 1000 });
    
    const stats = {
      totalLogs: logs.length,
      logsByAction: {} as { [key: string]: number },
      logsByUser: {} as { [key: string]: number },
      logsByResource: {} as { [key: string]: number },
      logsByRole: {} as { [key: string]: number },
      logsByWard: {} as { [key: string]: number },
      recentActivity: logs.slice(0, 10)
    };
    
    logs.forEach(log => {
      // Count by action
      stats.logsByAction[log.action] = (stats.logsByAction[log.action] || 0) + 1;
      
      // Count by user
      stats.logsByUser[log.userName] = (stats.logsByUser[log.userName] || 0) + 1;
      
      // Count by resource
      stats.logsByResource[log.resource] = (stats.logsByResource[log.resource] || 0) + 1;
      
      // Count by role
      stats.logsByRole[log.userRole] = (stats.logsByRole[log.userRole] || 0) + 1;
      
      // Count by ward
      if (log.wardName) {
        stats.logsByWard[log.wardName] = (stats.logsByWard[log.wardName] || 0) + 1;
      }
    });
    
    return stats;
  } catch (error: any) {
    console.error('Error getting audit log statistics:', error);
    throw new Error(`Không thể lấy thống kê log thao tác: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

// Helper functions for specific actions
export const logAuthAction = async (
  userId: string,
  userEmail: string,
  userName: string,
  userRole: 'center' | 'ward' | 'user',
  action: 'login' | 'logout' | 'register' | 'password_change',
  details?: any
): Promise<void> => {
  await logAction({
    userId,
    userEmail,
    userName,
    userRole,
    action,
    resource: AUDIT_RESOURCES.SYSTEM,
    details
  });
};

export const logDeviceAction = async (
  userId: string,
  userEmail: string,
  userName: string,
  userRole: 'center' | 'ward' | 'user',
  action: string,
  deviceId: string,
  deviceName: string,
  details?: any,
  wardId?: string,
  wardName?: string
): Promise<void> => {
  await logAction({
    userId,
    userEmail,
    userName,
    userRole,
    action,
    resource: AUDIT_RESOURCES.DEVICE,
    resourceId: deviceId,
    details: {
      deviceName,
      ...details
    },
    wardId,
    wardName
  });
};

export const logRequestAction = async (
  userId: string,
  userEmail: string,
  userName: string,
  userRole: 'center' | 'ward' | 'user',
  action: string,
  requestId: string,
  details?: any,
  wardId?: string,
  wardName?: string
): Promise<void> => {
  await logAction({
    userId,
    userEmail,
    userName,
    userRole,
    action,
    resource: AUDIT_RESOURCES.REQUEST,
    resourceId: requestId,
    details,
    wardId,
    wardName
  });
};

export const logIncidentAction = async (
  userId: string,
  userEmail: string,
  userName: string,
  userRole: 'center' | 'ward' | 'user',
  action: string,
  incidentId: string,
  details?: any,
  wardId?: string,
  wardName?: string
): Promise<void> => {
  await logAction({
    userId,
    userEmail,
    userName,
    userRole,
    action,
    resource: AUDIT_RESOURCES.INCIDENT,
    resourceId: incidentId,
    details,
    wardId,
    wardName
  });
};

export const logUserAction = async (
  userId: string,
  userEmail: string,
  userName: string,
  userRole: 'center' | 'ward' | 'user',
  action: string,
  targetUserId: string,
  targetUserName: string,
  details?: any,
  wardId?: string,
  wardName?: string
): Promise<void> => {
  await logAction({
    userId,
    userEmail,
    userName,
    userRole,
    action,
    resource: AUDIT_RESOURCES.USER,
    resourceId: targetUserId,
    details: {
      targetUserName,
      ...details
    },
    wardId,
    wardName
  });
};

export const logWardAction = async (
  userId: string,
  userEmail: string,
  userName: string,
  userRole: 'center' | 'ward' | 'user',
  action: string,
  wardId: string,
  wardName: string,
  details?: any
): Promise<void> => {
  await logAction({
    userId,
    userEmail,
    userName,
    userRole,
    action,
    resource: AUDIT_RESOURCES.WARD,
    resourceId: wardId,
    details: {
      wardName,
      ...details
    },
    wardId,
    wardName
  });
};

// Tạo dữ liệu mẫu để test
export const createSampleAuditLogs = async (): Promise<void> => {
  const sampleLogs = [
    {
      userId: 'sample_user_1',
      userEmail: 'admin@example.com',
      userName: 'Admin User',
      userRole: 'center' as const,
      action: AUDIT_ACTIONS.LOGIN,
      resource: AUDIT_RESOURCES.SYSTEM,
      details: { ipAddress: '192.168.1.1', userAgent: 'Mozilla/5.0...' },
      createdAt: new Date()
    },
    {
      userId: 'sample_user_2',
      userEmail: 'ward@example.com',
      userName: 'Ward Manager',
      userRole: 'ward' as const,
      action: AUDIT_ACTIONS.REQUEST_CREATE,
      resource: AUDIT_RESOURCES.REQUEST,
      resourceId: 'req_001',
      details: { deviceType: 'laptop', quantity: 2, reason: 'Cần thiết bị cho nhân viên mới' },
      wardId: 'ward_001',
      wardName: 'Phường 1',
      createdAt: new Date()
    },
    {
      userId: 'sample_user_1',
      userEmail: 'admin@example.com',
      userName: 'Admin User',
      userRole: 'center' as const,
      action: AUDIT_ACTIONS.DEVICE_CREATE,
      resource: AUDIT_RESOURCES.DEVICE,
      resourceId: 'dev_001',
      details: { deviceName: 'Laptop Dell XPS', deviceType: 'laptop', location: 'Phòng IT' },
      wardId: 'ward_001',
      wardName: 'Phường 1',
      createdAt: new Date()
    },
    {
      userId: 'sample_user_3',
      userEmail: 'user@example.com',
      userName: 'End User',
      userRole: 'user' as const,
      action: AUDIT_ACTIONS.INCIDENT_CREATE,
      resource: AUDIT_RESOURCES.INCIDENT,
      resourceId: 'inc_001',
      details: { deviceId: 'dev_001', issue: 'Máy tính không khởi động được', priority: 'high' },
      wardId: 'ward_001',
      wardName: 'Phường 1',
      createdAt: new Date()
    }
  ];
  
  console.log('Creating sample audit logs...');
  for (const logData of sampleLogs) {
    try {
      await logAction(logData);
      console.log('Created sample log:', logData.action, logData.resource);
    } catch (error) {
      console.error('Failed to create sample log:', error);
    }
  }
  console.log('Sample audit logs creation completed');
};
