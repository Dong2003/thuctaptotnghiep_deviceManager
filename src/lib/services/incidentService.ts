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
  startAfter,
  Timestamp,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { db, storage } from "../firebase";

export interface Incident {
  id: string;
  title: string;
  description: string;
  type: 'device_failure' | 'security_breach' | 'network_issue' | 'maintenance' | 'other';
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'pending_ward_approval' | 'ward_approved' | 'ward_rejected' | 'investigating' | 'in_progress' | 'resolved' | 'closed';
  location: string;
  wardId: string;
  wardName?: string;
  deviceId?: string;
  deviceName?: string;
  reportedBy: string;
  reportedByName: string;
  assignedTo?: string;
  assignedToName?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  estimatedResolution?: Date;
  actualResolution?: Date;
  resolution?: string;
  images?: string[];
  attachments?: string[];
  createdAt: Date;
  updatedAt: Date;
  resolvedAt?: Date;
  // Workflow fields
  wardApprovedBy?: string;
  wardApprovedByName?: string;
  wardApprovedAt?: Date;
  wardApprovalComment?: string;
  wardRejectionReason?: string;
  wardRejectedBy?: string;
  wardRejectedByName?: string;
  wardRejectedAt?: Date;
}

export interface CreateIncidentData {
  title: string;
  description: string;
  type: 'device_failure' | 'security_breach' | 'network_issue' | 'maintenance' | 'other';
  severity: 'low' | 'medium' | 'high' | 'critical';
  location: string;
  wardId: string;
  wardName?: string;
  deviceId?: string;
  deviceName?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  estimatedResolution?: Date;
  images?: File[];
  attachments?: File[];
}

export interface UpdateIncidentData {
  title?: string;
  description?: string;
  type?: 'device_failure' | 'security_breach' | 'network_issue' | 'maintenance' | 'other';
  severity?: 'low' | 'medium' | 'high' | 'critical';
  status?: 'pending_ward_approval' | 'ward_approved' | 'ward_rejected' | 'investigating' | 'in_progress' | 'resolved' | 'closed';
  location?: string;
  deviceId?: string;
  deviceName?: string;
  assignedTo?: string;
  assignedToName?: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  estimatedResolution?: Date;
  actualResolution?: Date;
  resolution?: string;
  images?: File[];
  attachments?: File[];
  // Workflow fields
  wardApprovedBy?: string;
  wardApprovedByName?: string;
  wardApprovedAt?: Date;
  wardRejectionReason?: string;
  wardRejectedBy?: string;
  wardRejectedByName?: string;
  wardRejectedAt?: Date;
}

// Incident CRUD operations
export const createIncident = async (
  data: CreateIncidentData,
  reportedBy: string,
  reportedByName: string
): Promise<string> => {
  try {
    let imageUrls: string[] = [];
    let attachmentUrls: string[] = [];
    
    // Upload images if provided
    if (data.images && data.images.length > 0) {
      imageUrls = await Promise.all(
        data.images.map(async (file) => {
          const imageRef = ref(storage, `incidents/images/${Date.now()}_${file.name}`);
          const snapshot = await uploadBytes(imageRef, file);
          return await getDownloadURL(snapshot.ref);
        })
      );
    }
    
    // Upload attachments if provided
    if (data.attachments && data.attachments.length > 0) {
      attachmentUrls = await Promise.all(
        data.attachments.map(async (file) => {
          const attachmentRef = ref(storage, `incidents/attachments/${Date.now()}_${file.name}`);
          const snapshot = await uploadBytes(attachmentRef, file);
          return await getDownloadURL(snapshot.ref);
        })
      );
    }
    
    const incidentData = {
      ...data,
      status: 'pending_ward_approval' as const,
      images: imageUrls,
      attachments: attachmentUrls,
      reportedBy,
      reportedByName,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    const docRef = await addDoc(collection(db, 'incidents'), incidentData);
    return docRef.id;
  } catch (error: any) {
    throw new Error(error.message || 'Failed to create incident');
  }
};

export const getIncident = async (incidentId: string): Promise<Incident | null> => {
  try {
    const docRef = doc(db, 'incidents', incidentId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        ...data,
        estimatedResolution: data.estimatedResolution?.toDate(),
        actualResolution: data.actualResolution?.toDate(),
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
        resolvedAt: data.resolvedAt?.toDate(),
      } as Incident;
    }
    return null;
  } catch (error: any) {
    throw new Error(error.message || 'Failed to get incident');
  }
};

export const getIncidents = async (
  wardId?: string,
  status?: string,
  severity?: string,
  type?: string,
  limitCount: number = 50
): Promise<Incident[]> => {
  try {
    // Query đơn giản hơn để tránh lỗi index
    const q = query(collection(db, 'incidents'), orderBy('createdAt', 'desc'));
    
    const querySnapshot = await getDocs(q);
    let incidents = querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        estimatedResolution: data.estimatedResolution?.toDate(),
        actualResolution: data.actualResolution?.toDate(),
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
        resolvedAt: data.resolvedAt?.toDate(),
      } as Incident;
    });

    // Apply filters trong memory
    if (wardId) {
      incidents = incidents.filter(incident => incident.wardId === wardId);
    }
    
    if (status) {
      incidents = incidents.filter(incident => incident.status === status);
    }
    
    if (severity) {
      incidents = incidents.filter(incident => incident.severity === severity);
    }
    
    if (type) {
      incidents = incidents.filter(incident => incident.type === type);
    }

    // Apply limit
    return incidents.slice(0, limitCount);
  } catch (error: any) {
    throw new Error(error.message || 'Failed to get incidents');
  }
};

export const updateIncident = async (incidentId: string, data: UpdateIncidentData): Promise<void> => {
  try {
    const incidentRef = doc(db, 'incidents', incidentId);
    const updateData: any = {
      ...data,
      updatedAt: new Date(),
    };
    
    // Handle image uploads
    if (data.images && data.images.length > 0) {
      const imageUrls = await Promise.all(
        data.images.map(async (file) => {
          const imageRef = ref(storage, `incidents/images/${Date.now()}_${file.name}`);
          const snapshot = await uploadBytes(imageRef, file);
          return await getDownloadURL(snapshot.ref);
        })
      );
      updateData.images = imageUrls;
    }
    
    // Handle attachment uploads
    if (data.attachments && data.attachments.length > 0) {
      const attachmentUrls = await Promise.all(
        data.attachments.map(async (file) => {
          const attachmentRef = ref(storage, `incidents/attachments/${Date.now()}_${file.name}`);
          const snapshot = await uploadBytes(attachmentRef, file);
          return await getDownloadURL(snapshot.ref);
        })
      );
      updateData.attachments = attachmentUrls;
    }
    
    // Set resolvedAt if status is resolved or closed
    if (data.status === 'resolved' || data.status === 'closed') {
      updateData.resolvedAt = new Date();
      updateData.actualResolution = new Date();
    }
    
    await updateDoc(incidentRef, updateData);
  } catch (error: any) {
    throw new Error(error.message || 'Failed to update incident');
  }
};

export const deleteIncident = async (incidentId: string): Promise<void> => {
  try {
    // Get incident to delete associated files
    const incident = await getIncident(incidentId);
    if (incident) {
      // Delete images
      if (incident.images) {
        await Promise.all(
          incident.images.map(async (imageUrl) => {
            try {
              const imageRef = ref(storage, imageUrl);
              await deleteObject(imageRef);
            } catch (error) {
              console.warn('Failed to delete image:', error);
            }
          })
        );
      }
      
      // Delete attachments
      if (incident.attachments) {
        await Promise.all(
          incident.attachments.map(async (attachmentUrl) => {
            try {
              const attachmentRef = ref(storage, attachmentUrl);
              await deleteObject(attachmentRef);
            } catch (error) {
              console.warn('Failed to delete attachment:', error);
            }
          })
        );
      }
    }
    
    await deleteDoc(doc(db, 'incidents', incidentId));
  } catch (error: any) {
    throw new Error(error.message || 'Failed to delete incident');
  }
};

// Statistics
export const getIncidentStats = async (wardId?: string) => {
  try {
    let incidents: Incident[] = [];
    
    if (wardId) {
      // For ward, get all incidents in the ward
      incidents = await getAllIncidentsForWard(wardId);
    } else {
      // For center, get all approved incidents
      incidents = await getApprovedIncidentsForCenter();
    }
    
    const stats = {
      total: incidents.length,
      byStatus: incidents.reduce((acc, incident) => {
        acc[incident.status] = (acc[incident.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      bySeverity: incidents.reduce((acc, incident) => {
        acc[incident.severity] = (acc[incident.severity] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      byType: incidents.reduce((acc, incident) => {
        acc[incident.type] = (acc[incident.type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      byPriority: incidents.reduce((acc, incident) => {
        acc[incident.priority] = (acc[incident.priority] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      resolvedToday: incidents.filter(incident => 
        incident.resolvedAt && 
        incident.resolvedAt.toDateString() === new Date().toDateString()
      ).length,
      avgResolutionTime: calculateAvgResolutionTime(incidents),
    };
    
    return stats;
  } catch (error: any) {
    throw new Error(error.message || 'Failed to get incident statistics');
  }
};

const calculateAvgResolutionTime = (incidents: Incident[]): number => {
  const resolvedIncidents = incidents.filter(incident => 
    incident.resolvedAt && incident.createdAt
  );
  
  if (resolvedIncidents.length === 0) return 0;
  
  const totalTime = resolvedIncidents.reduce((sum, incident) => {
    const resolutionTime = incident.resolvedAt!.getTime() - incident.createdAt.getTime();
    return sum + resolutionTime;
  }, 0);
  
  return totalTime / resolvedIncidents.length / (1000 * 60 * 60); // Convert to hours
};

// Helper functions
export const getSeverityColor = (severity: string): string => {
  switch (severity) {
    case 'low': return 'bg-green-100 text-green-800';
    case 'medium': return 'bg-yellow-100 text-yellow-800';
    case 'high': return 'bg-orange-100 text-orange-800';
    case 'critical': return 'bg-red-100 text-red-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};

export const getStatusColor = (status: string): string => {
  switch (status) {
    case 'pending_ward_approval': return 'bg-yellow-100 text-yellow-800';
    case 'ward_approved': return 'bg-blue-100 text-blue-800';
    case 'ward_rejected': return 'bg-red-100 text-red-800';
    case 'investigating': return 'bg-purple-100 text-purple-800';
    case 'in_progress': return 'bg-orange-100 text-orange-800';
    case 'resolved': return 'bg-green-100 text-green-800';
    case 'closed': return 'bg-gray-100 text-gray-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};

export const getPriorityColor = (priority: string): string => {
  switch (priority) {
    case 'low': return 'bg-green-100 text-green-800';
    case 'medium': return 'bg-yellow-100 text-yellow-800';
    case 'high': return 'bg-orange-100 text-orange-800';
    case 'urgent': return 'bg-red-100 text-red-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};

export const getIncidentsByUser = async (
  wardId: string,
  userId: string
): Promise<Incident[]> => {
  try {
    // Query đơn giản hơn để tránh lỗi index
    const q = query(
      collection(db, "incidents"),
      where("reportedBy", "==", userId)
    );

    const querySnapshot = await getDocs(q);

    // Filter và sort trong memory
    const incidents = querySnapshot.docs.map((doc) => {
      const data = doc.data();

      return {
        id: doc.id,
        title: data.title || "",
        description: data.description || "",
        type: data.type || "other",
        severity: data.severity || "medium",
        wardId: data.wardId || "",
        wardName: data.wardName || "",
        reportedBy: data.reportedBy || "",
        reportedByName: data.reportedByName || "",
        status: data.status || "pending_ward_approval",
        location: data.location || "",
        deviceId: data.deviceId || undefined,
        deviceName: data.deviceName || undefined,
        assignedTo: data.assignedTo || undefined,
        assignedToName: data.assignedToName || undefined,
        priority: data.priority || "medium",
        estimatedResolution: (data.estimatedResolution as Timestamp)?.toDate(),
        actualResolution: (data.actualResolution as Timestamp)?.toDate(),
        resolution: data.resolution || undefined,
        images: data.images || [],
        attachments: data.attachments || [],
        createdAt: (data.createdAt as Timestamp)?.toDate() || new Date(),
        updatedAt: (data.updatedAt as Timestamp)?.toDate() || new Date(),
        resolvedAt: (data.resolvedAt as Timestamp)?.toDate(),
        // Workflow fields
        wardApprovedBy: data.wardApprovedBy || undefined,
        wardApprovedByName: data.wardApprovedByName || undefined,
        wardApprovedAt: (data.wardApprovedAt as Timestamp)?.toDate(),
        wardApprovalComment: data.wardApprovalComment || undefined,
        wardRejectionReason: data.wardRejectionReason || undefined,
        wardRejectedBy: data.wardRejectedBy || undefined,
        wardRejectedByName: data.wardRejectedByName || undefined,
        wardRejectedAt: (data.wardRejectedAt as Timestamp)?.toDate(),
      } as Incident;
    });

    // Filter theo wardId và sort theo createdAt
    return incidents
      .filter(incident => incident.wardId === wardId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  } catch (error: any) {
    throw new Error(error.message || 'Failed to get incidents by user');
  }
};

// Ward approval functions
export const approveIncidentByWard = async (
  incidentId: string,
  approvedBy: string,
  approvedByName: string,
  comment?: string
): Promise<void> => {
  try {
    const incidentRef = doc(db, 'incidents', incidentId);
    await updateDoc(incidentRef, {
      status: 'ward_approved',
      wardApprovedBy: approvedBy,
      wardApprovedByName: approvedByName,
      wardApprovedAt: new Date(),
      wardApprovalComment: comment || '',
      updatedAt: new Date(),
    });
  } catch (error: any) {
    throw new Error(error.message || 'Failed to approve incident');
  }
};

export const rejectIncidentByWard = async (
  incidentId: string,
  rejectedBy: string,
  rejectedByName: string,
  rejectionReason: string
): Promise<void> => {
  try {
    const incidentRef = doc(db, 'incidents', incidentId);
    await updateDoc(incidentRef, {
      status: 'ward_rejected',
      wardRejectedBy: rejectedBy,
      wardRejectedByName: rejectedByName,
      wardRejectedAt: new Date(),
      wardRejectionReason: rejectionReason,
      updatedAt: new Date(),
    });
  } catch (error: any) {
    throw new Error(error.message || 'Failed to reject incident');
  }
};

// Get incidents for ward approval
export const getIncidentsForWardApproval = async (wardId: string): Promise<Incident[]> => {
  try {
    // Query đơn giản hơn để tránh lỗi index
    const q = query(
      collection(db, 'incidents'),
      where('wardId', '==', wardId)
    );
    
    const querySnapshot = await getDocs(q);
    const incidents = querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        estimatedResolution: data.estimatedResolution?.toDate(),
        actualResolution: data.actualResolution?.toDate(),
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
        resolvedAt: data.resolvedAt?.toDate(),
        wardApprovedAt: data.wardApprovedAt?.toDate(),
        wardRejectedAt: data.wardRejectedAt?.toDate(),
      } as Incident;
    });

    // Filter theo status và sort trong memory
    return incidents
      .filter(incident => incident.status === 'pending_ward_approval')
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  } catch (error: any) {
    throw new Error(error.message || 'Failed to get incidents for ward approval');
  }
};

// Get approved incidents for center (only ward_approved and beyond)
export const getApprovedIncidentsForCenter = async (): Promise<Incident[]> => {
  try {
    // Query đơn giản hơn để tránh lỗi index
    const q = query(
      collection(db, 'incidents'),
      orderBy('createdAt', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    const incidents = querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        estimatedResolution: data.estimatedResolution?.toDate(),
        actualResolution: data.actualResolution?.toDate(),
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
        resolvedAt: data.resolvedAt?.toDate(),
        wardApprovedAt: data.wardApprovedAt?.toDate(),
        wardRejectedAt: data.wardRejectedAt?.toDate(),
      } as Incident;
    });

    // Filter theo status trong memory
    const approvedStatuses = ['ward_approved', 'investigating', 'in_progress', 'resolved', 'closed'];
    return incidents.filter(incident => approvedStatuses.includes(incident.status));
  } catch (error: any) {
    throw new Error(error.message || 'Failed to get approved incidents for center');
  }
};

// Get all incidents for ward (for statistics)
export const getAllIncidentsForWard = async (wardId: string): Promise<Incident[]> => {
  try {
    // Query đơn giản hơn để tránh lỗi index
    const q = query(
      collection(db, 'incidents'),
      where('wardId', '==', wardId)
    );
    
    const querySnapshot = await getDocs(q);
    const incidents = querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        estimatedResolution: data.estimatedResolution?.toDate(),
        actualResolution: data.actualResolution?.toDate(),
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
        resolvedAt: data.resolvedAt?.toDate(),
        wardApprovedAt: data.wardApprovedAt?.toDate(),
        wardRejectedAt: data.wardRejectedAt?.toDate(),
      } as Incident;
    });

    // Sort theo createdAt
    return incidents.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  } catch (error: any) {
    throw new Error(error.message || 'Failed to get all incidents for ward');
  }
};
