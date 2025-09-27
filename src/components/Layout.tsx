import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { getRoleDisplayName } from '@/lib/auth';
import { collection, query, where, orderBy, onSnapshot, QuerySnapshot, DocumentChange, DocumentData, Query } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import type { DeviceRequest } from '@/lib/services/deviceRequestService';
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useIncidentNotificationCount, useUserIncidentNotificationCount, useDeviceRequestNotificationCount, useWardRequestNotificationCount, useCenterDeviceRequestNotificationCount } from "@/hooks/useIncidentNotificationCount";
import { Monitor, Users, FileText, Settings, LogOut, Home, Package, AlertTriangle, UserCog, CheckCircle, BarChart3, Activity } from 'lucide-react';
import { ToastAction } from '@/components/ui/toast';

// cspell:disable

// Định nghĩa type cho trạng thái mở rộng
type ExtendedRequestStatus = 
  | DeviceRequest['status'] 
  | 'pending_ward_approval' 
  | 'ward_approved' 
  | 'ward_rejected' 
  | 'center_approved' 
  | 'center_rejected';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const [pendingRequests, setPendingRequests] = React.useState(0);
  const [pendingIncidents, setPendingIncidents] = React.useState(0);
  const [unreadRequests, setUnreadRequests] = React.useState(0);
  const [unreadIncidents, setUnreadIncidents] = React.useState(0);
  const [centerUpdates, setCenterUpdates] = React.useState({
    requests: 0,
    incidents: 0
  });

  // Hook để đếm số lượng sự cố có cập nhật mới
  const wardIncidentNotificationCount = useIncidentNotificationCount();
  const userIncidentNotificationCount = useUserIncidentNotificationCount();
  const wardDeviceRequestNotificationCount = useDeviceRequestNotificationCount();
  const wardRequestNotificationCount = useWardRequestNotificationCount();
  const centerDeviceRequestNotificationCount = useCenterDeviceRequestNotificationCount();

  // Helpers lưu mốc đã xem (center)
  const getLastSeen = React.useCallback((key: 'requests' | 'incidents') => {
    if (!user?.id) return 0;
    const raw = localStorage.getItem(`lastSeen_${key}_center_${user.id}`);
    return raw ? Number(raw) : 0;
  }, [user?.id]);

  const setLastSeen = React.useCallback((key: 'requests' | 'incidents') => {
    if (!user?.id) return;
    localStorage.setItem(`lastSeen_${key}_center_${user.id}`, String(Date.now()));
  }, [user?.id]);

  // Theo dõi số lượng yêu cầu và sự cố chờ xử lý
  React.useEffect(() => {
    if (!user) return;

    // Query cho yêu cầu thiết bị
    let requestsQuery;
    if (user.role === 'ward') {
      requestsQuery = query(
        collection(db, 'deviceRequests'),
        where('wardId', '==', user.wardId),
        where('status', '==', 'pending')
      );
    } else if (user.role === 'center') {
      requestsQuery = query(
        collection(db, 'deviceRequests'),
        where('status', '==', 'pending')
      );
    } else if (user.role === 'user') {
      requestsQuery = query(
      collection(db, 'deviceRequests'),
        where('requestedBy', '==', user.id)
    );
    }

    // Query cho sự cố
    let incidentsQuery;
    if (user.role === 'ward') {
      incidentsQuery = query(
        collection(db, 'incidents'),
        where('status', 'in', ['pending_ward_approval'])
      );
    } else if (user.role === 'center') {
      incidentsQuery = query(
        collection(db, 'incidents'),
        where('status', 'in', ['ward_approved'])
      );
    } else if (user.role === 'user') {
      incidentsQuery = query(
      collection(db, 'incidents'),
        where('reportedBy', '==', user.id)
    );
    }

    // Lắng nghe thay đổi yêu cầu
    let unsubscribeRequests;
    if (requestsQuery) {
      unsubscribeRequests = onSnapshot(requestsQuery, (snapshot: QuerySnapshot<DocumentData>) => {
      setPendingRequests(snapshot.docs.length);
        
        // Tính số mới cho center (chưa đọc)
        if (user.role === 'center') {
          const lastSeenTime = getLastSeen('requests');
          const newCount = snapshot.docs.filter(doc => {
            const data = doc.data();
            const createdAt = data.createdAt?.toMillis() || 0;
            return createdAt > lastSeenTime;
          }).length;
          setUnreadRequests(newCount);
        }
      });
    }

    // Lắng nghe thay đổi sự cố
    let unsubscribeIncidents;
    if (incidentsQuery) {
      unsubscribeIncidents = onSnapshot(incidentsQuery, (snapshot: QuerySnapshot<DocumentData>) => {
      setPendingIncidents(snapshot.docs.length);
        
        // Tính số mới cho center (chưa đọc)
        if (user.role === 'center') {
          const lastSeenTime = getLastSeen('incidents');
          const newCount = snapshot.docs.filter(doc => {
            const data = doc.data();
            const createdAt = data.createdAt?.toMillis() || 0;
            return createdAt > lastSeenTime;
          }).length;
          setUnreadIncidents(newCount);
        }
      });
    }

    return () => {
      if (unsubscribeRequests) {
      unsubscribeRequests();
      }
      if (unsubscribeIncidents) {
      unsubscribeIncidents();
      }
    };
  }, [user, getLastSeen]);

  // Thêm listener cho thông báo realtime
  React.useEffect(() => {
    if (!user) return;

    let q;
    if (user.role === 'ward' && user.wardId) {
      // Nếu là user phường, chỉ lấy yêu cầu của phường đó
      // Bỏ orderBy để tránh lỗi composite index, sẽ sort trong JavaScript
      q = query(
        collection(db, 'deviceRequests'),
        where('wardId', '==', user.wardId)
      );
    } else if (user.role === 'center') {
      // Nếu là trung tâm, lấy tất cả yêu cầu
      q = query(collection(db, 'deviceRequests'), orderBy('createdAt', 'desc'));
    } else if (user.role === 'user') {
      // Nếu là user thường, lấy các yêu cầu của user đó (bỏ orderBy để tránh lỗi index)
      q = query(
        collection(db, 'deviceRequests'),
        where('requestedBy', '==', user.id)
      );
    } else {
      // Các role khác không cần listener
      return;
    }

    let initialized = false;
    const statusCache = new Map<string, ExtendedRequestStatus>();

  const unsubscribe = onSnapshot(q as Query<DocumentData>, (snapshot: QuerySnapshot<DocumentData>) => {
      // Lần đầu chỉ lưu cache, không thông báo
      if (!initialized) {
        snapshot.docs.forEach((doc) => {
          const data = doc.data() as Partial<DeviceRequest> & { status?: ExtendedRequestStatus };
          statusCache.set(doc.id, (data.status ?? 'pending') as ExtendedRequestStatus);
        });
        initialized = true;
        return;
      }

      if ('docChanges' in snapshot) {
  snapshot.docChanges().forEach((change: DocumentChange<DocumentData>) => {
        const id = change.doc.id;
        const data = change.doc.data() as Partial<DeviceRequest> & { 
          status?: ExtendedRequestStatus; 
          wardName?: string; 
          deviceName?: string; 
          deviceType?: string; 
          quantity?: number;
          reportedByName?: string;
        };
  const status = data.status as ExtendedRequestStatus | undefined;

        // Debug log to help trace why notifications may not show for other roles
        console.debug('[notify] DeviceRequest role=', user?.role, 'wardId=', user?.wardId, 'change=', change.type, 'id=', id, 'prev=', statusCache.get(id), 'new=', status, 'docWardId=', data.wardId);

        // Normalize statuses that are center-prefixed so ward/user see the relevant human status
        const normalizeStatus = (s: string | undefined) => {
          if (!s) return s;
          if (s.startsWith('center_')) return s.replace('center_', '');
          return s;
        };
        const normalizedStatus = normalizeStatus(status);

        if (change.type === 'added') {
          // Yêu cầu mới - chỉ trung tâm mới nhận thông báo
          if (user?.role === 'center') {
          toast({
            title: 'Yêu cầu mới',
            description: `${data.wardName || 'Một phường'} gửi yêu cầu ${data.deviceName || data.deviceType} x${data.quantity}`,
          });
          }
          statusCache.set(id, (status ?? 'pending') as ExtendedRequestStatus);
        }

        if (change.type === 'modified') {
          const prev = statusCache.get(id);
          if (prev && prev !== status) {
            // Trạng thái thay đổi
            let title = 'Cập nhật yêu cầu';
            let description = `Trạng thái yêu cầu của ${data.wardName || 'phường'}: ${status}`;
            let variant: 'destructive' | undefined = undefined;

            if (normalizedStatus === 'pending') {
              title = 'Yêu cầu mới cần duyệt';
              description = `Người dùng ${data.reportedByName || ''} yêu cầu ${data.deviceName || data.deviceType}`;
            } else if (normalizedStatus === 'approved') {
              title = '✅ Yêu cầu đã được duyệt';
              if (user.role === 'center') {
                description = `Đã duyệt yêu cầu thiết bị ${data.deviceName || data.deviceType} của ${data.wardName}`;
              } else {
                description = `Yêu cầu thiết bị ${data.deviceName || data.deviceType} đã được trung tâm duyệt`;
                // Tăng counter cho cập nhật từ trung tâm
                setCenterUpdates(prev => ({ ...prev, requests: prev.requests + 1 }));
              }
            } else if (normalizedStatus === 'rejected') {
              title = '❌ Yêu cầu bị từ chối';
              if (user.role === 'center') {
                description = `Đã từ chối yêu cầu thiết bị ${data.deviceName || data.deviceType} của ${data.wardName}`;
              } else {
                description = `Yêu cầu thiết bị ${data.deviceName || data.deviceType} đã bị trung tâm từ chối`;
              }
              variant = 'destructive';
              // Tăng counter cho cập nhật từ trung tâm
              if (user?.role !== 'center') {
                setCenterUpdates(prev => ({ ...prev, requests: prev.requests + 1 }));
              }
            } else if (normalizedStatus === 'completed') {
              title = '🎉 Yêu cầu đã hoàn thành';
              if (user.role === 'center') {
                description = `Đã hoàn thành cấp phát thiết bị ${data.deviceName || data.deviceType} cho ${data.wardName}`;
              } else {
                description = `Trung tâm đã hoàn thành cấp phát thiết bị ${data.deviceName || data.deviceType}`;
              }
              // Tăng counter cho cập nhật từ trung tâm
              if (user?.role !== 'center') {
                setCenterUpdates(prev => ({ ...prev, requests: prev.requests + 1 }));
              }
            } else if (normalizedStatus === 'delivering') {
              title = '🚚 Yêu cầu đang được giao';
              if (user.role === 'center') {
                description = `Đang vận chuyển thiết bị ${data.deviceName || data.deviceType} đến ${data.wardName}`;
              } else {
                description = `Trung tâm đang vận chuyển thiết bị ${data.deviceName || data.deviceType}`;
              }
              // Tăng counter cho cập nhật từ trung tâm
              if (user?.role !== 'center') {
                setCenterUpdates(prev => ({ ...prev, requests: prev.requests + 1 }));
              }
            } else if (normalizedStatus === 'received') {
              title = '📦 Yêu cầu đã nhận';
              if (user.role === 'center') {
                description = `${data.wardName} đã nhận thiết bị ${data.deviceName || data.deviceType}`;
              } else {
                description = `Phường đã nhận thiết bị ${data.deviceName || data.deviceType} từ trung tâm`;
              }
              // Tăng counter cho cập nhật từ trung tâm
              if (user?.role !== 'center') {
                setCenterUpdates(prev => ({ ...prev, requests: prev.requests + 1 }));
              }
            }

            // Decide whether to show toast: always show for non-center on normalized change
            const prevRaw = statusCache.get(id) as string | undefined;
            const prevNormalized = normalizeStatus(prevRaw);
            const normalizedChanged = prevNormalized !== normalizedStatus;
            const shouldShowForNonCenter = user?.role !== 'center' && normalizedChanged;
            const shouldShowForCenter = user?.role === 'center' && prevRaw && prevRaw !== status;

            if (shouldShowForNonCenter || shouldShowForCenter) {
              console.debug('[notify-show] DeviceRequest', { id, prevRaw, status, normalizedStatus, role: user?.role, wardId: user?.wardId, title, description });
              toast({
                title,
                description,
                variant,
                action: (
                  <ToastAction altText="Xem" onClick={() => {
                    if (user?.role === 'center') {
                      setLastSeen('requests');
                      setUnreadRequests(0);
                    }
                    navigate('/requests');
                  }}>Xem</ToastAction>
                ),
              });
            } else {
              console.debug('[notify-skip]', { id, prevRaw, status, normalizedStatus, role: user?.role });
            }
          }
            statusCache.set(id, (status ?? 'pending') as ExtendedRequestStatus);
        }

        if (change.type === 'removed') {
          statusCache.delete(id);
        }
        });
      }
    });

    return () => unsubscribe();
  }, [user?.role, user?.wardId, user, toast, navigate, setLastSeen]);

  // Lắng nghe realtime cho báo cáo sự cố và hiển thị thông báo
  React.useEffect(() => {
    if (!user) return;

    let incidentsQueryRef;
    if (user.role === 'ward' && user.wardId) {
      // Bỏ orderBy để tránh lỗi composite index, sẽ sort trong JavaScript
      incidentsQueryRef = query(
        collection(db, 'incidents'),
        where('wardId', '==', user.wardId)
      );
    } else if (user.role === 'center') {
      incidentsQueryRef = query(
        collection(db, 'incidents'),
        orderBy('createdAt', 'desc')
      );
    } else if (user.role === 'user') {
      incidentsQueryRef = query(
        collection(db, 'incidents'),
        where('reportedBy', '==', user.id)
      );
    } else {
      return;
    }

    const statusCache = new Map<string, string>();
    let initialized = false;

    const unsubscribe = onSnapshot(incidentsQueryRef, (snapshot) => {
      if (!initialized) {
        // Lần đầu load, chỉ lưu status vào cache
        snapshot.docs.forEach(doc => {
          const data = doc.data();
          statusCache.set(doc.id, data.status || '');
        });
        initialized = true;
        return;
      }

      if ('docChanges' in snapshot) {
        snapshot.docChanges().forEach((change: DocumentChange<DocumentData>) => {
          const id = change.doc.id;
          const data = change.doc.data() as DocumentData;
          const status = data.status as string | undefined;
          
          console.debug('[notify] Incident role=', user?.role, 'wardId=', user?.wardId, 'change=', change.type, 'id=', id, 'prev=', statusCache.get(id), 'new=', status, 'docWardId=', data.wardId);

          if (change.type === 'added') {
            // Sự cố mới - chỉ phường thuộc khu vực đó mới nhận thông báo
            if (user?.role === 'ward' && user?.wardId === data.wardId) {
              const t = toast({
                title: 'Sự cố mới',
                description: `${data.reportedByName || ''} đã gửi sự cố: ${data.title || ''}`,
                action: (
                  <ToastAction altText="Xem" onClick={() => {
                    navigate('/ward-incident-approval');
                  }}>Xem</ToastAction>
                ),
              });
            }
            statusCache.set(id, status || '');
          }

          if (change.type === 'modified') {
            const prev = statusCache.get(id);
            if (prev && prev !== status) {
              // Normalize
              const normalize = (s: string | undefined) => s?.startsWith('center_') ? s.replace('center_', '') : s;
              const prevNorm = normalize(prev as string | undefined);
              const newNorm = normalize(status);

              // Trạng thái thay đổi
              let title = 'Cập nhật sự cố';
              let description = `Trạng thái sự cố: ${newNorm}`;
              let variant: 'destructive' | 'default' | undefined = undefined;

              if (newNorm === 'pending_ward_approval') {
                title = 'Sự cố chờ duyệt phường';
                description = `${data.reportedByName || ''} đã gửi sự cố: ${data.title || ''}`;
              } else if (newNorm === 'ward_approved') {
                title = 'Phường đã duyệt sự cố';
                description = `Sự cố đã chuyển lên trung tâm`;
              } else if (newNorm === 'ward_rejected') {
                title = 'Phường từ chối sự cố';
                description = `${data.wardName || 'Phường'} đã từ chối báo cáo`;
              variant = 'destructive';
              } else if (newNorm === 'investigating') {
                title = '🔍 Đang điều tra sự cố';
                description = `Trung tâm đang điều tra sự cố "${data.title}" - Cập nhật từ trung tâm`;
                variant = 'default';
                if (user?.role !== 'center') setCenterUpdates(prev => ({ ...prev, incidents: prev.incidents + 1 }));
              } else if (newNorm === 'in_progress') {
                title = '⚙️ Đang xử lý sự cố';
                description = `Trung tâm đang xử lý sự cố "${data.title}" - Cập nhật từ trung tâm`;
                variant = 'default';
                if (user?.role !== 'center') setCenterUpdates(prev => ({ ...prev, incidents: prev.incidents + 1 }));
              } else if (newNorm === 'resolved') {
                title = '✅ Sự cố đã được xử lý';
                description = `Sự cố "${data.title}" đã được trung tâm giải quyết - Cập nhật từ trung tâm`;
                variant = 'default';
                if (user?.role !== 'center') setCenterUpdates(prev => ({ ...prev, incidents: prev.incidents + 1 }));
              } else if (newNorm === 'closed') {
                title = '🔒 Sự cố đã đóng';
                description = `Sự cố "${data.title}" đã được đóng - Cập nhật từ trung tâm`;
                variant = 'default';
                if (user?.role !== 'center') setCenterUpdates(prev => ({ ...prev, incidents: prev.incidents + 1 }));
              }

              const shouldShow = (user?.role !== 'center' && prevNorm !== newNorm) || (user?.role === 'center' && prev !== status);
              if (shouldShow) {
                console.debug('[notify-incident-show] Incident', { id, prev, status, prevNorm, newNorm, role: user?.role, wardId: user?.wardId, title, description });
                toast({
                  title,
                  description,
                  variant,
                  action: (
                    <ToastAction altText="Xem" onClick={() => {
                      if (user?.role === 'center') {
                        setLastSeen('incidents');
                        setUnreadIncidents(0);
                      }
                      navigate('/incidents');
                    }}>Xem</ToastAction>
                  ),
                });
              } else {
                console.debug('[notify-incident-skip]', { id, prev, status, prevNorm, newNorm, role: user?.role });
              }
          }
          statusCache.set(id, status || '');
        }

        if (change.type === 'removed') {
          statusCache.delete(id);
        }
      });
      }
    });

    return () => unsubscribe();
  }, [user?.role, user?.wardId, user, toast, navigate, setLastSeen]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  interface NavigationItem {
    path: string;
    label: string;
    icon: React.ComponentType;
    badge?: number;
  }

  const getNavigationItems = () => {
    if (!user) return [];

    const baseItems: NavigationItem[] = [
      { path: '/dashboard', label: 'Trang chủ', icon: Home },
    ];

    switch (user.role) {
      case 'center':
        return [
          ...baseItems,
          { path: '/devices', label: 'Quản lý thiết bị', icon: Monitor },
          { path: '/wards', label: 'Quản lý phường', icon: Users },
          { path: '/users', label: 'Quản lý tài khoản', icon: UserCog },
          { path: '/requests', label: 'Yêu cầu cấp phát', icon: FileText, badge: centerDeviceRequestNotificationCount > 0 ? centerDeviceRequestNotificationCount : undefined },
          { path: '/incidents', label: 'Báo cáo sự cố', icon: AlertTriangle, badge: unreadIncidents > 0 ? unreadIncidents : undefined },
          { path: '/statistics', label: 'Thống kê', icon: BarChart3 },
          { path: '/audit-logs', label: 'Log thao tác', icon: Activity },
          { path: '/settings', label: 'Cài đặt', icon: Settings },
        ];
      case 'ward':
        return [
          ...baseItems,
          { path: '/ward-devices', label: 'Thiết bị phường', icon: Monitor },
          { path: '/device-requests', label: 'Yêu cầu thiết bị', icon: Package, badge: wardDeviceRequestNotificationCount > 0 ? wardDeviceRequestNotificationCount : undefined },
          { path: '/ward-requests', label: 'Nhận thiết bị', icon: CheckCircle, badge: wardRequestNotificationCount > 0 ? wardRequestNotificationCount : undefined },
          { path: '/ward-users', label: 'Quản lý người dùng', icon: Users },
          { path: '/ward-incidents', label: 'Sự cố thiết bị', icon: AlertTriangle, badge: wardIncidentNotificationCount > 0 ? wardIncidentNotificationCount : undefined },
          { path: '/ward-incident-approval', label: 'Duyệt báo cáo sự cố', icon: FileText, badge: pendingIncidents > 0 ? pendingIncidents : undefined },
        ];
      case 'user':
        return [
          ...baseItems,
          { path: '/my-devices', label: 'Thiết bị của tôi', icon: Monitor },
          { path: '/report-incident', label: 'Báo cáo sự cố', icon: AlertTriangle, badge: userIncidentNotificationCount > 0 ? userIncidentNotificationCount : undefined },
        ];
      default:
        return baseItems;
    }
  };

  const navigationItems = getNavigationItems();

  if (!user) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Monitor className="h-8 w-8 text-primary" />
                <h1 className="text-xl font-bold text-foreground">
                  Hệ thống Quản lý Thiết bị IT
                </h1>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
               {/* Avatar clickable */}
                <div
                  onClick={() => navigate("/profile")}
                  className="cursor-pointer"
                  title="Xem hồ sơ cá nhân"
                >
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={user.avatar || undefined} alt={user.displayName} />
                    <AvatarFallback className="bg-blue-500 text-white font-bold">
                      {user.displayName
                        ? user.displayName.charAt(0).toUpperCase()
                        : "U"}
                    </AvatarFallback>
                  </Avatar>
                </div>
              <div className="text-right">
                <p className="text-sm font-medium text-foreground">{user.displayName}</p>
                <p className="text-xs text-muted-foreground">{getRoleDisplayName(user.role)}</p>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={handleLogout}
                className="flex items-center space-x-2"
              >
                <LogOut className="h-4 w-4" />
                <span>Đăng xuất</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside className="w-64 bg-card border-r border-border min-h-[calc(100vh-4rem)]">
          <nav className="p-4 space-y-2">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              
              return (
                <Button
                  key={item.path}
                  variant={isActive ? "default" : "ghost"}
                  className={`w-full justify-start relative ${item.badge ? 'animate-pulse' : ''}`}
                  onClick={() => {
                    // Reset badge khi click vào menu
                    if (user.role === 'ward') {
                      if (item.path === '/device-requests') {
                        setPendingRequests(0);
                      } else if (item.path === '/ward-incident-approval') {
                        setPendingIncidents(0);
                      }
                    } else if (user.role === 'center') {
                      if (item.path === '/requests') {
                        setLastSeen('requests');
                        setUnreadRequests(0);
                        setCenterUpdates(prev => ({ ...prev, requests: 0 }));
                      } else if (item.path === '/incidents') {
                        setLastSeen('incidents');
                        setUnreadIncidents(0);
                        setCenterUpdates(prev => ({ ...prev, incidents: 0 }));
                      }
                    }
                    navigate(item.path);
                  }}
                >
                  <Icon className="h-4 w-4 mr-3" />
                  {item.label}
                  {item.badge && (
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 min-w-[1.5rem] h-6 rounded-full bg-red-500 text-white text-xs flex items-center justify-center animate-pulse shadow-lg ring-2 ring-red-300 ring-opacity-50">
                      {item.badge}
                    </span>
                  )}
                </Button>
              );
            })}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-6">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;