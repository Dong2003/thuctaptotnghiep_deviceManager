import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { AlertTriangle, Plus, Eye, Clock, CheckCircle, Loader2, Upload, X, Image as ImageIcon, Video, Edit, Trash2, Trash } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { getDevices, type Device } from '@/lib/services/deviceService';
import { getIncidentsByUser, createIncident, updateIncident, deleteIncident, markIncidentUpdateAsViewed, type Incident } from '@/lib/services/incidentService';
import { useToast } from '@/hooks/use-toast';

const ReportIncidentPage = () => {
  const { user } = useAuth();
  const [devices, setDevices] = useState<Device[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [isReportDialogOpen, setIsReportDialogOpen] = useState(false);
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isBulkDeleteDialogOpen, setIsBulkDeleteDialogOpen] = useState(false);
  const [selectedIncidents, setSelectedIncidents] = useState<string[]>([]);
  const [editData, setEditData] = useState({
    title: '',
    description: '',
    severity: 'medium' as Incident['severity'],
    location: '',
  });

  const { toast } = useToast();

  const [newIncident, setNewIncident] = useState({
    deviceId: '',
    deviceName: '',
    title: '',
    description: '',
    severity: 'medium' as Incident['severity'],
    location: '',
  });

  // Media upload states
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);
  const [mediaPreviews, setMediaPreviews] = useState<string[]>([]);

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
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Không thể tải dữ liệu";
        toast({
          title: "Lỗi tải dữ liệu",
          description: message,
          variant: "destructive"
        });
        console.log("Current user wardId:", user.wardId);
        console.log("Fetched users for this ward:", message); // <-- Set vào select
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user?.wardId, user?.id, toast]);

  // Media upload handlers
  const handleMediaUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    const validFiles: File[] = [];
    const previews: string[] = [];

    files.forEach(file => {
      // Kiểm tra kích thước (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: "Lỗi",
          description: `File ${file.name} quá lớn. Kích thước tối đa là 10MB.`,
          variant: "destructive"
        });
        return;
      }

      // Kiểm tra loại file
      if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
        toast({
          title: "Lỗi", 
          description: `File ${file.name} không được hỗ trợ. Chỉ chấp nhận hình ảnh và video.`,
          variant: "destructive"
        });
        return;
      }

      validFiles.push(file);
      previews.push(URL.createObjectURL(file));
    });

    setMediaFiles(prev => [...prev, ...validFiles]);
    setMediaPreviews(prev => [...prev, ...previews]);
  };

  const removeMediaFile = (index: number) => {
    setMediaFiles(prev => prev.filter((_, i) => i !== index));
    setMediaPreviews(prev => {
      const newPreviews = prev.filter((_, i) => i !== index);
      // Revoke object URL để tránh memory leak
      URL.revokeObjectURL(prev[index]);
      return newPreviews;
    });
  };

  // Edit and delete handlers
  const openEditDialog = (incident: Incident) => {
    setSelectedIncident(incident);
    setEditData({
      title: incident.title,
      description: incident.description,
      severity: incident.severity,
      location: incident.location,
    });
    setIsEditDialogOpen(true);
  };

  const handleUpdateIncident = async () => {
    if (!selectedIncident || !user) return;

    try {
      await updateIncident(selectedIncident.id, editData);
      
      // Refresh incidents list
      const updatedIncidents = await getIncidentsByUser(user.wardId!, user.id);
      setIncidents(updatedIncidents);
      
      setIsEditDialogOpen(false);
      toast({
        title: "Cập nhật thành công",
        description: "Sự cố đã được cập nhật.",
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Không thể cập nhật sự cố.";
      toast({
        title: "Lỗi",
        description: message,
        variant: "destructive"
      });
    }
  };

  const openDeleteDialog = (incident: Incident) => {
    setSelectedIncident(incident);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteIncident = async () => {
    if (!selectedIncident || !user) return;

    try {
      await deleteIncident(selectedIncident.id);
      
      // Refresh incidents list
      const updatedIncidents = await getIncidentsByUser(user.wardId!, user.id);
      setIncidents(updatedIncidents);
      
      setIsDeleteDialogOpen(false);
      toast({
        title: "Xóa thành công",
        description: "Sự cố đã được xóa.",
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Không thể xóa sự cố.";
      toast({
        title: "Lỗi",
        description: message,
        variant: "destructive"
      });
    }
  };

  // Bulk delete functions
  const handleSelectIncident = (incidentId: string, checked: boolean) => {
    if (checked) {
      setSelectedIncidents(prev => [...prev, incidentId]);
    } else {
      setSelectedIncidents(prev => prev.filter(id => id !== incidentId));
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const deletableIncidents = incidents.filter(incident => 
        incident.status === 'pending_ward_approval' || 
        incident.status === 'ward_rejected' ||
        incident.status === 'resolved' || 
        incident.status === 'closed'
      );
      setSelectedIncidents(deletableIncidents.map(i => i.id));
    } else {
      setSelectedIncidents([]);
    }
  };

  const openBulkDeleteDialog = () => {
    if (selectedIncidents.length === 0) {
      toast({
        title: 'Chưa chọn sự cố',
        description: 'Vui lòng chọn ít nhất một sự cố để xóa.',
        variant: 'destructive'
      });
      return;
    }
    setIsBulkDeleteDialogOpen(true);
  };

  const handleBulkDelete = async () => {
    try {
      const deletePromises = selectedIncidents.map(id => deleteIncident(id));
      await Promise.all(deletePromises);
      
      setIncidents(prev => prev.filter(i => !selectedIncidents.includes(i.id)));
      setSelectedIncidents([]);
      toast({ 
        title: 'Xóa thành công', 
        description: `Đã xóa ${selectedIncidents.length} sự cố.` 
      });
      setIsBulkDeleteDialogOpen(false);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Không thể xóa sự cố';
      toast({ 
        title: 'Lỗi', 
        description: message, 
        variant: 'destructive' 
      });
    }
  };

  const handleDeleteAll = async () => {
    const deletableIncidents = incidents.filter(incident => 
      incident.status === 'pending_ward_approval' || 
      incident.status === 'ward_rejected' ||
      incident.status === 'resolved' || 
      incident.status === 'closed'
    );
    
    if (deletableIncidents.length === 0) {
      toast({
        title: 'Không có sự cố để xóa',
        description: 'Không có sự cố nào có thể xóa.',
        variant: 'destructive'
      });
      return;
    }

    try {
      const deletePromises = deletableIncidents.map(incident => deleteIncident(incident.id));
      await Promise.all(deletePromises);
      
      setIncidents(prev => prev.filter(i => 
        i.status !== 'pending_ward_approval' && 
        i.status !== 'ward_rejected' &&
        i.status !== 'resolved' && 
        i.status !== 'closed'
      ));
      setSelectedIncidents([]);
      toast({ 
        title: 'Xóa thành công', 
        description: `Đã xóa tất cả ${deletableIncidents.length} sự cố.` 
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Không thể xóa sự cố';
      toast({ 
        title: 'Lỗi', 
        description: message, 
        variant: 'destructive' 
      });
    }
  };

  const handleSubmitIncident = async () => {
    if (!user) return;

    setIsUploading(true);
    try {
      const selectedDevice = devices.find(d => d.id === newIncident.deviceId);
      
      // mediaFiles will be processed by the service
      
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
        images: mediaFiles, // Send File objects to service
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

      // Reset media files
      setMediaFiles([]);
      setMediaPreviews([]);

      toast({
        title: "Báo cáo sự cố thành công",
        description: "Sự cố đã được gửi và đang chờ xử lý.",
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Không thể gửi báo cáo sự cố";
      toast({
        title: "Lỗi báo cáo sự cố",
        description: message,
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
    }
  };

  const openDetailDialog = async (incident: Incident) => {
    setSelectedIncident(incident);
    setIsDetailDialogOpen(true);
    
    // Đánh dấu đã xem cập nhật mới nếu có
    if (incident.hasNewUpdate) {
      try {
        await markIncidentUpdateAsViewed(incident.id);
        // Cập nhật state để ẩn badge
        setIncidents(prev => prev.map(i => 
          i.id === incident.id ? { ...i, hasNewUpdate: false } : i
        ));
      } catch (error) {
        console.error('Error marking incident update as viewed:', error);
      }
    }
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
      case 'pending_ward_approval':
        return 'warning';
      case 'ward_approved':
        return 'default';
      case 'ward_rejected':
        return 'destructive';
      case 'investigating':
        return 'secondary';
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
      case 'pending_ward_approval':
        return 'Chờ phường duyệt';
      case 'ward_approved':
        return 'Đã duyệt';
      case 'ward_rejected':
        return 'Bị từ chối';
      case 'investigating':
        return 'Đang điều tra';
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
      case 'pending_ward_approval':
        return <Clock className="h-4 w-4" />;
      case 'ward_approved':
        return <CheckCircle className="h-4 w-4" />;
      case 'ward_rejected':
        return <AlertTriangle className="h-4 w-4" />;
      case 'investigating':
      case 'in_progress':
        return <Clock className="h-4 w-4" />;
      case 'resolved':
      case 'closed':
        return <CheckCircle className="h-4 w-4" />;
      default:
        return null;
    }
  };

  const pendingIncidents = incidents.filter(i => i.status === 'pending_ward_approval');
  const inProgressIncidents = incidents.filter(i => i.status === 'ward_approved' || i.status === 'investigating' || i.status === 'in_progress');
  const resolvedIncidents = incidents.filter(i => i.status === 'resolved' || i.status === 'closed');
  const rejectedIncidents = incidents.filter(i => i.status === 'ward_rejected');

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
          <DialogContent className="max-h-[90vh] overflow-y-auto">
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
                <Label htmlFor="description">Mô tả chi tiết (không bắt buộc)</Label>
                <Textarea
                  id="description"
                  value={newIncident.description}
                  onChange={(e) => setNewIncident({...newIncident, description: e.target.value})}
                  placeholder="Mô tả chi tiết hiện tượng, thời điểm xảy ra sự cố..."
                  rows={4}
                />
              </div>

              {/* Media Upload Section */}
              <div className="space-y-2">
                <Label>Hình ảnh/Video minh chứng (tùy chọn)</Label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                  <Upload className="mx-auto h-12 w-12 text-gray-400" />
                  <div className="mt-4">
                    <label htmlFor="media-upload" className="cursor-pointer">
                      <span className="mt-2 block text-sm font-medium text-gray-900">
                        Kéo thả file vào đây hoặc click để chọn
                      </span>
                      <span className="mt-1 block text-xs text-gray-500">
                        Hỗ trợ: JPG, PNG, GIF, MP4, MOV (tối đa 10MB mỗi file)
                      </span>
                    </label>
                    <input
                      id="media-upload"
                      type="file"
                      multiple
                      accept="image/*,video/*"
                      onChange={handleMediaUpload}
                      className="sr-only"
                    />
                  </div>
                </div>
                
                {/* Hiển thị preview media files */}
                {mediaPreviews.length > 0 && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                    {mediaPreviews.map((preview, index) => (
                      <div key={index} className="relative">
                        <div className="aspect-square rounded-lg overflow-hidden bg-gray-100">
                          {mediaFiles[index]?.type.startsWith('image/') ? (
                            <img
                              src={preview}
                              alt={`Preview ${index + 1}`}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <video
                              src={preview}
                              className="w-full h-full object-cover"
                              controls
                            />
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => removeMediaFile(index)}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                        >
                          <X className="h-4 w-4" />
                        </button>
                        <div className="mt-1 text-xs text-gray-500 truncate">
                          {mediaFiles[index]?.name}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsReportDialogOpen(false)}>
                Hủy
              </Button>
              <Button 
                onClick={handleSubmitIncident}
                disabled={!newIncident.deviceId || !newIncident.title || isUploading}
              >
                {isUploading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Đang gửi...
                  </>
                ) : (
                  'Gửi báo cáo'
                )}
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
            <CardTitle className="text-sm font-medium">Chờ duyệt</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{pendingIncidents.length}</div>
            <p className="text-xs text-muted-foreground">
              Chờ phường duyệt
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Đang xử lý</CardTitle>
            <CheckCircle className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{inProgressIncidents.length}</div>
            <p className="text-xs text-muted-foreground">
              Đang được khắc phục
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Đã giải quyết</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{resolvedIncidents.length}</div>
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
          {/* Bulk Actions */}
          {incidents.length > 0 && (
            <div className="flex items-center gap-2 mb-4 p-3 bg-muted rounded-lg">
              <Checkbox
                checked={selectedIncidents.length > 0}
                onCheckedChange={handleSelectAll}
              />
              <span className="text-sm text-muted-foreground">
                {selectedIncidents.length > 0 ? `Đã chọn ${selectedIncidents.length} sự cố` : 'Chọn tất cả'}
              </span>
              {selectedIncidents.length > 0 && (
                <div className="flex gap-2 ml-auto">
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={openBulkDeleteDialog}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Xóa đã chọn
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={handleDeleteAll}
                  >
                    <Trash className="h-4 w-4 mr-2" />
                    Xóa tất cả
                  </Button>
                </div>
              )}
            </div>
          )}

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">Chọn</TableHead>
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
                  <TableRow 
                    key={incident.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => openDetailDialog(incident)}
                  >
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={selectedIncidents.includes(incident.id)}
                        onCheckedChange={(checked) => handleSelectIncident(incident.id, checked as boolean)}
                        disabled={incident.status !== 'pending_ward_approval' && 
                                 incident.status !== 'ward_rejected' &&
                                 incident.status !== 'resolved' && 
                                 incident.status !== 'closed'}
                      />
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{incident.title}</p>
                          {incident.hasNewUpdate && (
                            <Badge variant="destructive" className="text-xs px-2 py-1 animate-pulse shadow-lg ring-2 ring-red-300 ring-opacity-50">
                              Có cập nhật mới
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-1">
                          {incident.description}
                        </p>
                        {incident.hasNewUpdate && incident.lastUpdateByName && (
                          <p className="text-xs text-blue-600 mt-1">
                            Cập nhật bởi: {incident.lastUpdateByName}
                          </p>
                        )}
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
                      <Badge variant={getSeverityColor(incident.severity) as "default" | "secondary" | "destructive" | "outline"}>
                        {getSeverityText(incident.severity)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        {getStatusIcon(incident.status)}
                        <Badge variant={getStatusColor(incident.status) as "default" | "secondary" | "destructive" | "outline"}>
                          {getStatusText(incident.status)}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      {(() => {
                        if (!incident.createdAt) return "Chưa có";
                        try {
                          return incident.createdAt.toLocaleString("vi-VN", {
                            day: "2-digit",
                            month: "2-digit",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          });
                        } catch (error) {
                          console.error('Date formatting error:', error);
                          return incident.createdAt.toLocaleDateString("vi-VN");
                        }
                      })()}
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center space-x-2">
                        {(incident.status === 'pending_ward_approval') && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openEditDialog(incident)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        )}
                        {(incident.status === 'pending_ward_approval' || 
                          incident.status === 'ward_rejected' ||
                          incident.status === 'resolved' || 
                          incident.status === 'closed') && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openDeleteDialog(incident)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
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
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
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
                  <Badge variant={getSeverityColor(selectedIncident.severity) as "default" | "secondary" | "destructive" | "outline"}>
                    {getSeverityText(selectedIncident.severity)}
                  </Badge>
                </div>
                <div>
                  <h4 className="font-medium mb-1">Trạng thái:</h4>
                  <div className="flex items-center space-x-2">
                    {getStatusIcon(selectedIncident.status)}
                    <Badge variant={getStatusColor(selectedIncident.status) as "default" | "secondary" | "destructive" | "outline"}>
                      {getStatusText(selectedIncident.status)}
                    </Badge>
                  </div>
                </div>
                <div>
                  <h4 className="font-medium mb-1">Ngày báo cáo:</h4>
                  <p className="text-sm">{(() => {
                    try {
                      return new Date(selectedIncident.createdAt).toLocaleString('vi-VN', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      });
                    } catch (error) {
                      console.error('Date formatting error:', error);
                      return new Date(selectedIncident.createdAt).toLocaleDateString('vi-VN');
                    }
                  })()}</p>
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

              {/* Hiển thị media files nếu có */}
              {(() => {
                type WithMedia = Incident & { mediaFiles?: string[]; images?: string[]; attachments?: string[] };
                const si = selectedIncident as WithMedia;
                const mediaUrls: string[] = si.mediaFiles ?? si.images ?? si.attachments ?? [];
                console.log('Debug incident data:', { 
                  mediaFiles: si.mediaFiles, 
                  images: si.images, 
                  attachments: si.attachments,
                  finalUrls: mediaUrls 
                });
                if (!mediaUrls || mediaUrls.length === 0) return null;
                
                return (
                  <div>
                    <h4 className="font-medium mb-2">Hình ảnh/Video minh chứng:</h4>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {mediaUrls.map((url: string, index: number) => {
                        const isVideo = url.startsWith('data:video/') || url.includes('video');
                        return (
                          <div key={index} className="relative">
                            <div className="aspect-square rounded-lg overflow-hidden bg-gray-100">
                              {isVideo ? (
                            <video
                              src={url}
                              controls
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <img
                              src={url}
                              alt={`Media ${index + 1}`}
                              className="w-full h-full object-cover cursor-pointer hover:opacity-90"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                
                                // Tạo modal ảnh hoàn toàn độc lập
                                const imageModal = document.createElement('div');
                                
                                // Đánh dấu modal ảnh đang mở để ngăn dialog đóng
                                imageModal.setAttribute('data-image-modal', 'true');
                                imageModal.style.cssText = `
                                  position: fixed;
                                  top: 0;
                                  left: 0;
                                  width: 100vw;
                                  height: 100vh;
                                  background: rgba(0, 0, 0, 0.9);
                                  display: flex;
                                  align-items: center;
                                  justify-content: center;
                                  z-index: 999998;
                                  cursor: pointer;
                                  pointer-events: auto;
                                `;
                                
                                const closeImageModal = () => {
                                  if (document.body.contains(imageModal)) {
                                    document.body.removeChild(imageModal);
                                  }
                                  document.removeEventListener('keydown', handleKeyDown);
                                };
                                
                                const handleKeyDown = (e: KeyboardEvent) => {
                                  if (e.key === 'Escape') {
                                    closeImageModal();
                                  }
                                };
                                
                                imageModal.onclick = (e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  closeImageModal();
                                  return false;
                                };
                                
                                document.addEventListener('keydown', handleKeyDown);
                                
                                const img = document.createElement('img');
                                img.src = url;
                                img.style.cssText = `
                                  max-width: 90vw;
                                  max-height: 90vh;
                                  object-fit: contain;
                                  cursor: default;
                                `;
                                img.onclick = (e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  return false;
                                };
                                
                                // Thêm nút đóng
                                const closeBtn = document.createElement('button');
                                closeBtn.innerHTML = '×';
                                closeBtn.style.cssText = `
                                  position: fixed;
                                  top: 20px;
                                  right: 20px;
                                  width: 40px;
                                  height: 40px;
                                  background: rgba(255, 0, 0, 0.8);
                                  color: white;
                                  border: 2px solid white;
                                  border-radius: 50%;
                                  font-size: 20px;
                                  font-weight: bold;
                                  cursor: pointer;
                                  display: flex;
                                  align-items: center;
                                  justify-content: center;
                                  z-index: 999999;
                                  transition: all 0.2s ease;
                                  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
                                  pointer-events: auto;
                                `;
                                
                                // Thêm hover effect
                                closeBtn.onmouseenter = () => {
                                  closeBtn.style.background = 'rgba(255, 0, 0, 1)';
                                  closeBtn.style.transform = 'scale(1.1)';
                                  closeBtn.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.5)';
                                };
                                
                                closeBtn.onmouseleave = () => {
                                  closeBtn.style.background = 'rgba(255, 0, 0, 0.8)';
                                  closeBtn.style.transform = 'scale(1)';
                                  closeBtn.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.3)';
                                };
                                closeBtn.onclick = (e) => {
                                  // Ngăn chặn tất cả event propagation
                                  e.preventDefault();
                                  e.stopPropagation();
                                  if (e.stopImmediatePropagation) {
                                    e.stopImmediatePropagation();
                                  }
                                  e.cancelBubble = true;
                                  
                                  // Đóng modal trong một microtask riêng biệt để tránh conflict
                                  setTimeout(() => {
                                    closeImageModal();
                                  }, 0);
                                  
                                  return false;
                                };
                                
                                // Thêm event listener trực tiếp cho nút
                                closeBtn.addEventListener('click', (e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  closeImageModal();
                                }, { capture: true });
                                
                                imageModal.appendChild(closeBtn);
                                imageModal.appendChild(img);
                                document.body.appendChild(imageModal);
                                
                                return false;
                              }}
                            />
                          )}
                        </div>
                        </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

              {selectedIncident.status === 'ward_rejected' && selectedIncident.wardRejectionReason && (
                <div>
                  <h4 className="font-medium mb-2">Lý do từ chối:</h4>
                  <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                    <p className="text-sm text-red-800">{selectedIncident.wardRejectionReason}</p>
                    {selectedIncident.wardRejectedAt && (
                      <p className="text-xs text-red-600 mt-2">
                        Từ chối bởi: {selectedIncident.wardRejectedByName} - {new Date(selectedIncident.wardRejectedAt).toLocaleDateString('vi-VN')}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {selectedIncident.status === 'ward_approved' && selectedIncident.wardApprovedAt && (
                <div>
                  <h4 className="font-medium mb-2">Thông tin duyệt:</h4>
                  <div className="p-3 bg-green-50 border border-green-200 rounded-md">
                    <p className="text-sm text-green-800">Sự cố đã được phường duyệt và chuyển lên trung tâm xử lý</p>
                    {selectedIncident.wardApprovalComment && (
                      <p className="text-sm text-green-700 mt-2">
                        <strong>Bình luận:</strong> {selectedIncident.wardApprovalComment}
                      </p>
                    )}
                    <p className="text-xs text-green-600 mt-2">
                      Duyệt bởi: {selectedIncident.wardApprovedByName} - {new Date(selectedIncident.wardApprovedAt).toLocaleDateString('vi-VN')}
                    </p>
                  </div>
                </div>
              )}

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

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Chỉnh sửa sự cố</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-title">Tiêu đề</Label>
              <Input id="edit-title" value={editData.title} onChange={(e) => setEditData({ ...editData, title: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-severity">Mức độ</Label>
              <Select value={editData.severity} onValueChange={(v: Incident['severity']) => setEditData({ ...editData, severity: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Thấp</SelectItem>
                  <SelectItem value="medium">Trung bình</SelectItem>
                  <SelectItem value="high">Cao</SelectItem>
                  <SelectItem value="critical">Nghiêm trọng</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-location">Vị trí</Label>
              <Input id="edit-location" value={editData.location} onChange={(e) => setEditData({ ...editData, location: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description">Mô tả</Label>
              <Textarea id="edit-description" rows={4} value={editData.description} onChange={(e) => setEditData({ ...editData, description: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Hủy</Button>
            <Button onClick={handleUpdateIncident} disabled={!editData.title || !editData.description}>Lưu</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Xác nhận xóa</DialogTitle>
            <DialogDescription>
              Bạn có chắc chắn muốn xóa sự cố này không? Hành động này không thể hoàn tác.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Hủy
            </Button>
            <Button variant="destructive" onClick={handleDeleteIncident}>
              Xóa
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

      {/* Bulk Delete Dialog */}
      <Dialog open={isBulkDeleteDialogOpen} onOpenChange={setIsBulkDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Xóa nhiều sự cố</DialogTitle>
            <DialogDescription>
              Bạn có chắc chắn muốn xóa {selectedIncidents.length} sự cố đã chọn không? Hành động này không thể hoàn tác.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <div className="max-h-40 overflow-y-auto space-y-2">
              {selectedIncidents.map(id => {
                const incident = incidents.find(i => i.id === id);
                return incident ? (
                  <div key={id} className="p-2 bg-muted rounded text-sm">
                    <p><b>{incident.title}</b> - {incident.status}</p>
                  </div>
                ) : null;
              })}
            </div>
          </div>

          <DialogFooter className="space-x-2">
            <Button variant="outline" onClick={() => setIsBulkDeleteDialogOpen(false)}>Hủy</Button>
            <Button variant="destructive" onClick={handleBulkDelete}>Xóa {selectedIncidents.length} sự cố</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ReportIncidentPage;