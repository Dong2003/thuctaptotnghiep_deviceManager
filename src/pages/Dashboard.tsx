import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Monitor, Users, Package, AlertTriangle, TrendingUp, CheckCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import {
  getDevicesByWard,
  getDevicesByUser,
  fetchDevices,
  fetchWards,
  fetchDeviceRequests,
  fetchIncidentReports
} from '@/lib/data';

const Dashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<any>({});
  const [devices, setDevices] = useState<any[]>([]);
  const [wards, setWards] = useState<any[]>([]);
  const [deviceRequests, setDeviceRequests] = useState<any[]>([]);
  const [incidentReports, setIncidentReports] = useState<any[]>([]);

  // --- Load data từ API ---
  useEffect(() => {
    const loadData = async () => {
      if (!user) return;

      const [allDevices, allWards, allRequests, allIncidents] = await Promise.all([
        fetchDevices(),
        fetchWards(),
        fetchDeviceRequests(),
        fetchIncidentReports(),
      ]);

      setDevices(allDevices);
      setWards(allWards);
      setDeviceRequests(allRequests);
      setIncidentReports(allIncidents);

      // --- Tính stats ---
      let computedStats = {};
      switch (user.role) {
        case 'center':
          computedStats = {
            totalDevices: allDevices.length,
            availableDevices: allDevices.filter(d => d.status === 'inactive').length,
            totalWards: allWards.length,
            pendingRequests: allRequests.filter(r => r.status === 'pending').length,
            openIncidents: allIncidents.filter(i => i.status === 'reported' || i.status === 'investigating' || i.status === 'in_progress').length,
          };
          break;
        case 'ward':
          const wardDevices = allDevices.filter(d => d.wardId === user.wardId);
          computedStats = {
            wardDevices: wardDevices.length,
            devicesInUse: wardDevices.filter(d => d.status === 'active').length,
            availableDevices: wardDevices.filter(d => d.status === 'inactive').length,
            myRequests: allRequests.filter(r => r.wardId === user.wardId).length,
          };
          break;
        case 'user':
          const userDevices = allDevices.filter(d => d.wardId === user.wardId && d.assignedTo === user.id);
          computedStats = {
            myDevices: userDevices.length,
            workingDevices: userDevices.filter(d => d.status === 'active').length,
            myIncidents: allIncidents.filter(i => i.reportedBy === user.id).length,
          };
          break;
        default:
          computedStats = {};
      }

      setStats(computedStats);
    };

    loadData();
  }, [user]);

  // --- Render các dashboard giống bạn ---
  const renderCenterDashboard = () => (
    <div className="space-y-6">
      {/* Card stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Tổng thiết bị</CardTitle>
            <Monitor className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalDevices}</div>
            <p className="text-xs text-muted-foreground">{stats.availableDevices} thiết bị có sẵn</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Phường/Xã</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalWards}</div>
            <p className="text-xs text-muted-foreground">Đang quản lý</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Yêu cầu chờ duyệt</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning">{stats.pendingRequests}</div>
            <p className="text-xs text-muted-foreground">Cần xử lý</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Sự cố chưa giải quyết</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{stats.openIncidents}</div>
            <p className="text-xs text-muted-foreground">Cần khắc phục</p>
          </CardContent>
        </Card>
      </div>
      {/* Gần đây */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Yêu cầu cấp phát gần đây</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {deviceRequests.slice(0, 3).map(req => {
                const ward = wards.find(w => w.id === req.wardId);
                return (
                  <div key={req.id} className="flex justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">{ward?.name}</p>
                      <p className="text-sm text-muted-foreground">{req.reason}</p>
                    </div>
                    <Badge variant={req.status === 'pending' ? 'destructive' : 'default'}>
                      {req.status === 'pending' ? 'Chờ duyệt' : 'Đã duyệt'}
                    </Badge>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Sự cố cần xử lý</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {incidentReports.slice(0, 3).map(inc => {
                const device = devices.find(d => d.id === inc.deviceId);
                return (
                  <div key={inc.id} className="flex justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">{inc.title}</p>
                      <p className="text-sm text-muted-foreground">{device?.name}</p>
                    </div>
                    <Badge
                    variant={
                      inc.status === "resolved"
                        ? "default"
                        : inc.status === "in_progress"
                        ? "secondary"
                        : "destructive"
                    }
                  >
                    {inc.status === "resolved"
                      ? "Đã xử lý"
                      : inc.status === "in_progress"
                      ? "Đang xử lý"
                      : "Chờ xác nhận"}
                  </Badge>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  if (!user) return <div>Vui lòng đăng nhập</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Chào mừng, {user.displayName}</h1>
      <p className="text-muted-foreground">Tổng quan hệ thống quản lý thiết bị IT</p>

      {user.role === 'center' && renderCenterDashboard()}
      {/* Tương tự bạn có thể thêm renderWardDashboard() và renderUserDashboard() */}
    </div>
  );
};

export default Dashboard;
