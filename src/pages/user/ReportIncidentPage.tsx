import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { AlertTriangle, Plus, Eye, Clock, CheckCircle, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { getDevices, type Device } from '@/lib/services/deviceService';
import { getIncidentsByUser, createIncident, type Incident } from '@/lib/services/incidentService';
import { useToast } from '@/hooks/use-toast';

const ReportIncidentPage = () => {
  const { user } = useAuth();
  const [devices, setDevices] = useState<Device[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [isReportDialogOpen, setIsReportDialogOpen] = useState(false);
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);

  const { toast } = useToast();

  const [newIncident, setNewIncident] = useState({
    deviceId: '',
    deviceName: '',
    title: '',
    description: '',
    severity: 'medium' as Incident['severity'],
    location: '',
  });

  useEffect(() => {
    const fetchData = async () => {
      if (!user?.wardId) return;
      
      try {
        setLoading(true);
        const [devicesData, incidentsData] = await Promise.all([
          getDevices(user.wardId),
          getIncidentsByUser(user.wardId, user.id) // ✅ chỉ lấy của user hiện tại
        ]);
        setDevices(devicesData);
        setIncidents(incidentsData);
      } catch (error: any) {
        toast({
          title: "Lỗi tải dữ liệu",
          description: error.message || "Không thể tải dữ liệu",
          variant: "destructive"
        });
        console.log("Current user wardId:", user.wardId);
        console.log("Fetched users for this ward:",  error.message); // <-- Set vào select
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user?.wardId, toast]);

  const handleSubmitIncident = async () => {
    if (!user) return;

    try {
      const selectedDevice = devices.find(d => d.id === newIncident.deviceId);
      
      const incidentData = {
        title: newIncident.title,
        description: newIncident.description,
        type: 'device_failure' as const,
        severity: newIncident.severity,
        location: newIncident.location,
        wardId: user.wardId!,
        wardName: user.wardName || '',
        deviceId: newIncident.deviceId,
        deviceName: selectedDevice?.name || newIncident.deviceName,
        priority: 'medium' as const,
      };

      await createIncident(incidentData, user.id, user.displayName);
      
      // Refresh incidents list
      const updatedIncidents = await getIncidentsByUser(user.wardId!, user.id);
      setIncidents(updatedIncidents);

      
      setIsReportDialogOpen(false);
      setNewIncident({
        deviceId: '',
        deviceName: '',
        title: '',
        description: '',
        severity: 'medium',
        location: '',
      });

      toast({
        title: "Báo cáo sự cố thành công",
        description: "Sự cố đã được gửi và đang chờ xử lý.",
      });
    } catch (error: any) {
      toast({
        title: "Lỗi báo cáo sự cố",
        description: error.message || "Không thể gửi báo cáo sự cố",
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
        return 'Chưa xử lý';
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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'open':
        return <AlertTriangle className="h-4 w-4" />;
      case 'in_progress':
        return <Clock className="h-4 w-4" />;
      case 'resolved':
      case 'closed':
        return <CheckCircle className="h-4 w-4" />;
      default:
        return null;
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
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Báo cáo sự cố</h1>
          <p className="text-muted-foreground">Báo cáo và theo dõi sự cố thiết bị</p>
        </div>

        <Dialog open={isReportDialogOpen} onOpenChange={setIsReportDialogOpen}>
          <DialogTrigger asChild>
            <Button className="flex items-center space-x-2">
              <Plus className="h-4 w-4" />
              <span>Báo cáo sự cố mới</span>
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Báo cáo sự cố thiết bị</DialogTitle>
              <DialogDescription>
                Mô tả chi tiết sự cố để được hỗ trợ nhanh chóng
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="deviceId">Thiết bị gặp sự cố</Label>
                <Select 
                  value={newIncident.deviceId} 
                  onValueChange={(value) => setNewIncident({...newIncident, deviceId: value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Chọn thiết bị" />
                  </SelectTrigger>
                  <SelectContent>
                    {devices.map((device) => (
                      <SelectItem key={device.id} value={device.id}>
                        <div>
                          <p className="font-medium">{device.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {device.specifications?.brand} {device.specifications?.model}
                          </p>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="title">Tiêu đề sự cố</Label>
                <Input
                  id="title"
                  value={newIncident.title}
                  onChange={(e) => setNewIncident({...newIncident, title: e.target.value})}
                  placeholder="VD: Laptop không khởi động được"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="severity">Mức độ nghiêm trọng</Label>
                <Select 
                  value={newIncident.severity} 
                  onValueChange={(value: Incident['severity']) => setNewIncident({...newIncident, severity: value})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Thấp - Không ảnh hưởng công việc</SelectItem>
                    <SelectItem value="medium">Trung bình - Ảnh hưởng một phần</SelectItem>
                    <SelectItem value="high">Cao - Không thể làm việc</SelectItem>
                    <SelectItem value="critical">Nghiêm trọng - Cần xử lý gấp</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="location">Vị trí sự cố</Label>
                <Input
                  id="location"
                  value={newIncident.location}
                  onChange={(e) => setNewIncident({...newIncident, location: e.target.value})}
                  placeholder="VD: Tầng 2, phòng 201"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Mô tả chi tiết</Label>
                <Textarea
                  id="description"
                  value={newIncident.description}
                  onChange={(e) => setNewIncident({...newIncident, description: e.target.value})}
                  placeholder="Mô tả chi tiết hiện tượng, thời điểm xảy ra sự cố..."
                  rows={4}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsReportDialogOpen(false)}>
                Hủy
              </Button>
              <Button 
                onClick={handleSubmitIncident}
                disabled={!newIncident.deviceId || !newIncident.title || !newIncident.description}
              >
                Gửi báo cáo
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tổng sự cố</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{incidents.length}</div>
            <p className="text-xs text-muted-foreground">
              Sự cố đã báo cáo
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Chưa xử lý</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{openIncidents.length}</div>
            <p className="text-xs text-muted-foreground">
              Đang chờ xử lý
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Đang xử lý</CardTitle>
            <Clock className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning">{inProgressIncidents.length}</div>
            <p className="text-xs text-muted-foreground">
              Đang được khắc phục
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Đã giải quyết</CardTitle>
            <CheckCircle className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">{resolvedIncidents.length}</div>
            <p className="text-xs text-muted-foreground">
              Hoàn thành
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Report Guide */}
      <Card>
        <CardHeader>
          <CardTitle>Hướng dẫn báo cáo sự cố</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium mb-3 text-primary">Thông tin cần cung cấp:</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start space-x-2">
                  <span className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></span>
                  <span>Tên thiết bị và thời điểm xảy ra sự cố</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></span>
                  <span>Hiện tượng cụ thể (màn hình, âm thanh, v.v.)</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></span>
                  <span>Hoạt động đang thực hiện khi có sự cố</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></span>
                  <span>Mức độ ảnh hưởng đến công việc</span>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="font-medium mb-3 text-warning">Lưu ý quan trọng:</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start space-x-2">
                  <span className="w-2 h-2 bg-warning rounded-full mt-2 flex-shrink-0"></span>
                  <span>Không tự ý khắc phục nếu không chắc chắn</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="w-2 h-2 bg-warning rounded-full mt-2 flex-shrink-0"></span>
                  <span>Tắt thiết bị nếu có mùi khét hoặc tia lửa</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="w-2 h-2 bg-warning rounded-full mt-2 flex-shrink-0"></span>
                  <span>Báo cáo ngay cho sự cố nghiêm trọng</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="w-2 h-2 bg-warning rounded-full mt-2 flex-shrink-0"></span>
                  <span>Chụp ảnh hiện tượng nếu có thể</span>
                </li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Incidents History */}
      <Card>
        <CardHeader>
          <CardTitle>Lịch sử báo cáo sự cố ({incidents.length})</CardTitle>
          <CardDescription>
            Theo dõi tình trạng xử lý các sự cố đã báo cáo
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tiêu đề sự cố</TableHead>
                <TableHead>Thiết bị</TableHead>
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
                      <Badge variant={getSeverityColor(incident.severity) as any}>
                        {getSeverityText(incident.severity)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        {getStatusIcon(incident.status)}
                        <Badge variant={getStatusColor(incident.status) as any}>
                          {getStatusText(incident.status)}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      {incident.createdAt
                        ? incident.createdAt.toLocaleDateString("vi-VN", {
                            day: "2-digit",
                            month: "2-digit",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "Chưa có"}
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
                  <div className="flex items-center space-x-2">
                    {getStatusIcon(selectedIncident.status)}
                    <Badge variant={getStatusColor(selectedIncident.status) as any}>
                      {getStatusText(selectedIncident.status)}
                    </Badge>
                  </div>
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
                <h4 className="font-medium mb-2">Mô tả sự cố:</h4>
                <div className="p-3 bg-muted rounded-md">
                  <p className="text-sm">{selectedIncident.description}</p>
                </div>
              </div>

              {selectedIncident.resolution && (
                <div>
                  <h4 className="font-medium mb-2">Giải pháp đã áp dụng:</h4>
                  <div className="p-3 bg-success/10 border border-success/20 rounded-md">
                    <p className="text-sm">{selectedIncident.resolution}</p>
                    {selectedIncident.resolvedAt && (
                      <p className="text-xs text-muted-foreground mt-2">
                        Giải quyết ngày: {new Date(selectedIncident.resolvedAt).toLocaleDateString('vi-VN')}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDetailDialogOpen(false)}>
              Đóng
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {incidents.length === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">Chưa có sự cố nào được báo cáo</h3>
            <p className="text-muted-foreground">
              Khi thiết bị gặp sự cố, hãy sử dụng nút "Báo cáo sự cố mới" để thông báo.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ReportIncidentPage;