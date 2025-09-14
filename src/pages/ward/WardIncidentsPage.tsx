import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertTriangle, Eye, Clock, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { getIncidents, updateIncident, getIncidentStats, type Incident } from '@/lib/services/incidentService';
import { getDevices } from '@/lib/services/deviceService';
import { useToast } from '@/hooks/use-toast';

const WardIncidentsPage = () => {
  const { user } = useAuth();
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [devices, setDevices] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const fetchData = async () => {
      if (!user?.wardId) return;
      
      try {
        setLoading(true);
        const [incidentsData, devicesData, statsData] = await Promise.all([
          getIncidents(user.wardId),
          getDevices(user.wardId),
          getIncidentStats(user.wardId)
        ]);
        
        setIncidents(incidentsData);
        setDevices(devicesData);
        setStats(statsData);
      } catch (error: any) {
        toast({
          title: "Lỗi tải dữ liệu",
          description: error.message || "Không thể tải dữ liệu sự cố",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user?.wardId, toast]);

  const handleUpdateStatus = async (incidentId: string, newStatus: Incident['status']) => {
    try {
      await updateIncident(incidentId, { status: newStatus });
      
      setIncidents(incidents.map(incident => 
        incident.id === incidentId 
          ? { ...incident, status: newStatus }
          : incident
      ));
      
      toast({
        title: "Cập nhật trạng thái thành công",
        description: `Trạng thái sự cố đã được cập nhật.`,
      });
    } catch (error: any) {
      toast({
        title: "Lỗi cập nhật trạng thái",
        description: error.message || "Không thể cập nhật trạng thái sự cố",
        variant: "destructive"
      });
    }
  };

  const openDetailDialog = (incident: Incident) => {
    setSelectedIncident(incident);
    setIsDetailDialogOpen(true);
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'low':
        return 'default';
      case 'medium':
        return 'secondary';
      case 'high':
        return 'destructive';
      case 'critical':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  const getSeverityText = (severity: string) => {
    switch (severity) {
      case 'low':
        return 'Thấp';
      case 'medium':
        return 'Trung bình';
      case 'high':
        return 'Cao';
      case 'critical':
        return 'Nghiêm trọng';
      default:
        return 'Không xác định';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open':
        return 'destructive';
      case 'in_progress':
        return 'warning';
      case 'resolved':
        return 'default';
      case 'closed':
        return 'secondary';
      default:
        return 'secondary';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'open':
        return 'Mở';
      case 'in_progress':
        return 'Đang xử lý';
      case 'resolved':
        return 'Đã giải quyết';
      case 'closed':
        return 'Đã đóng';
      default:
        return 'Không xác định';
    }
  };

  const openIncidents = incidents.filter(i => i.status === 'reported');
  const inProgressIncidents = incidents.filter(i => i.status === 'investigating' || i.status === 'in_progress');
  const resolvedIncidents = incidents.filter(i => i.status === 'resolved' || i.status === 'closed');

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Đang tải dữ liệu...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Sự cố thiết bị</h1>
        <p className="text-muted-foreground">Theo dõi và xử lý sự cố thiết bị trong phường</p>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tổng sự cố</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.total || incidents.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Chưa xử lý</CardTitle>
            <XCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{stats?.byStatus?.reported || openIncidents.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Đang xử lý</CardTitle>
            <Clock className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning">{(stats?.byStatus?.investigating || 0) + (stats?.byStatus?.in_progress || 0) || inProgressIncidents.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Đã giải quyết</CardTitle>
            <CheckCircle className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">{(stats?.byStatus?.resolved || 0) + (stats?.byStatus?.closed || 0) || resolvedIncidents.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Incidents */}
      <Card>
        <CardHeader>
          <CardTitle>Sự cố gần đây</CardTitle>
          <CardDescription>
            Danh sách các sự cố thiết bị được báo cáo từ người dùng
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tiêu đề sự cố</TableHead>
                <TableHead>Thiết bị</TableHead>
                <TableHead>Người báo cáo</TableHead>
                <TableHead>Mức độ</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead>Ngày báo cáo</TableHead>
                <TableHead>Thao tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {incidents.map((incident) => {
                const device = devices.find(d => d.id === incident.deviceId);
                return (
                  <TableRow key={incident.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{incident.title}</p>
                        <p className="text-sm text-muted-foreground line-clamp-1">
                          {incident.description}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{device?.name || incident.deviceName}</p>
                        <p className="text-sm text-muted-foreground">
                          {device?.specifications?.brand} {device?.specifications?.model}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{incident.reportedByName}</p>
                        <p className="text-sm text-muted-foreground">{incident.reportedBy}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getSeverityColor(incident.severity) as any}>
                        {getSeverityText(incident.severity)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-2">
                        <Badge variant={getStatusColor(incident.status) as any}>
                          {getStatusText(incident.status)}
                        </Badge>
                        {incident.status === 'reported' && (
                          <Select
                            value={incident.status}
                            onValueChange={(value: Incident['status']) => 
                              handleUpdateStatus(incident.id, value)
                            }
                          >
                            <SelectTrigger className="w-32">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="open">Mở</SelectItem>
                              <SelectItem value="in_progress">Đang xử lý</SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {new Date(incident.createdAt).toLocaleDateString('vi-VN')}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openDetailDialog(incident)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Chi tiết sự cố</DialogTitle>
          </DialogHeader>

          {selectedIncident && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium mb-1">Tiêu đề:</h4>
                  <p className="text-sm">{selectedIncident.title}</p>
                </div>
                <div>
                  <h4 className="font-medium mb-1">Mức độ:</h4>
                  <Badge variant={getSeverityColor(selectedIncident.severity) as any}>
                    {getSeverityText(selectedIncident.severity)}
                  </Badge>
                </div>
                <div>
                  <h4 className="font-medium mb-1">Trạng thái:</h4>
                  <Badge variant={getStatusColor(selectedIncident.status) as any}>
                    {getStatusText(selectedIncident.status)}
                  </Badge>
                </div>
                <div>
                  <h4 className="font-medium mb-1">Ngày báo cáo:</h4>
                  <p className="text-sm">{new Date(selectedIncident.createdAt).toLocaleDateString('vi-VN')}</p>
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-2">Thiết bị liên quan:</h4>
                <div className="p-3 bg-muted rounded-md">
                  <p className="text-sm font-medium">{selectedIncident.deviceName || 'Không xác định'}</p>
                  <p className="text-sm text-muted-foreground">{selectedIncident.location}</p>
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-2">Mô tả chi tiết:</h4>
                <div className="p-3 bg-muted rounded-md">
                  <p className="text-sm">{selectedIncident.description}</p>
                </div>
              </div>

              {selectedIncident.resolution && (
                <div>
                  <h4 className="font-medium mb-2">Giải pháp:</h4>
                  <div className="p-3 bg-success/10 border border-success/20 rounded-md">
                    <p className="text-sm">{selectedIncident.resolution}</p>
                  </div>
                </div>
              )}

              <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
                <h4 className="font-medium mb-2 text-blue-800">Hướng dẫn xử lý:</h4>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>• Kiểm tra tình trạng thiết bị trực tiếp</li>
                  <li>• Liên hệ với người dùng để xác nhận vấn đề</li>
                  <li>• Thử các giải pháp khắc phục cơ bản</li>
                  <li>• Nếu không giải quyết được, báo cáo lên Trung tâm</li>
                </ul>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDetailDialogOpen(false)}>
              Đóng
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default WardIncidentsPage;