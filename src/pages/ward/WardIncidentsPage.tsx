import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { AlertTriangle, Eye, Clock, CheckCircle, XCircle, Loader2, Trash2, Trash } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { getIncidentsForWardApproval, getAllIncidentsForWard, updateIncident, deleteIncident, getIncidentStats, approveIncidentByWard, rejectIncidentByWard, markIncidentUpdateAsViewed, type Incident } from '@/lib/services/incidentService';
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
  const [isProcessingDialogOpen, setIsProcessingDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isBulkDeleteDialogOpen, setIsBulkDeleteDialogOpen] = useState(false);
  const [selectedIncidents, setSelectedIncidents] = useState<string[]>([]);
  const [processingAction, setProcessingAction] = useState<'approve' | 'reject'>('approve');
  const [processingComment, setProcessingComment] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    const fetchData = async () => {
      if (!user?.wardId) return;
      
      try {
        setLoading(true);
        const [incidentsData, devicesData, statsData] = await Promise.all([
          getAllIncidentsForWard(user.wardId),
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

  const openProcessingDialog = (incident: Incident) => {
    setSelectedIncident(incident);
    setProcessingAction('approve');
    setProcessingComment('');
    setIsProcessingDialogOpen(true);
  };

  const openDeleteDialog = (incident: Incident) => {
    setSelectedIncident(incident);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteIncident = async () => {
    if (!selectedIncident) return;
    
    try {
      await deleteIncident(selectedIncident.id);
      setIncidents(prev => prev.filter(i => i.id !== selectedIncident.id));
      toast({ title: 'Xóa thành công', description: 'Sự cố đã được xóa khỏi hệ thống.' });
      setIsDeleteDialogOpen(false);
      setSelectedIncident(null);
    } catch (error: any) {
      toast({ title: 'Lỗi', description: error.message, variant: 'destructive' });
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
    } catch (error: any) {
      toast({ 
        title: 'Lỗi', 
        description: error.message || 'Không thể xóa sự cố', 
        variant: 'destructive' 
      });
    }
  };

  const handleDeleteAll = async () => {
    const deletableIncidents = incidents.filter(incident => 
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
        i.status !== 'ward_rejected' &&
        i.status !== 'resolved' && 
        i.status !== 'closed'
      ));
      setSelectedIncidents([]);
      toast({ 
        title: 'Xóa thành công', 
        description: `Đã xóa tất cả ${deletableIncidents.length} sự cố.` 
      });
    } catch (error: any) {
      toast({ 
        title: 'Lỗi', 
        description: error.message || 'Không thể xóa sự cố', 
        variant: 'destructive' 
      });
    }
  };

  const handleProcessIncident = async () => {
    if (!selectedIncident || !user) return;

    try {
      if (processingAction === 'approve') {
        await approveIncidentByWard(
          selectedIncident.id,
          user.id,
          user.displayName || user.email,
          processingComment
        );
        toast({
          title: "Thành công",
          description: "Đã duyệt sự cố thành công",
        });
      } else {
        await rejectIncidentByWard(
          selectedIncident.id,
          user.id,
          user.displayName || user.email,
          processingComment
        );
        toast({
          title: "Thành công",
          description: "Đã từ chối sự cố",
        });
      }

      // Refresh data
      const [incidentsData, statsData] = await Promise.all([
        getAllIncidentsForWard(user.wardId),
        getIncidentStats(user.wardId)
      ]);
      setIncidents(incidentsData);
      setStats(statsData);

      setIsProcessingDialogOpen(false);
      setSelectedIncident(null);
    } catch (error: any) {
      toast({
        title: "Lỗi",
        description: error.message || "Không thể xử lý sự cố",
        variant: "destructive"
      });
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
        return 'Chờ duyệt';
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

  const pendingIncidents = incidents.filter(i => i.status === 'pending_ward_approval');
  const inProgressIncidents = incidents.filter(i => i.status === 'ward_approved' || i.status === 'investigating' || i.status === 'in_progress');
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
            <div className="text-2xl font-bold text-destructive">{stats?.byStatus?.pending_ward_approval || pendingIncidents.length}</div>
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
                  <TableRow 
                    key={incident.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => openDetailDialog(incident)}
                  >
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={selectedIncidents.includes(incident.id)}
                        onCheckedChange={(checked) => handleSelectIncident(incident.id, checked as boolean)}
                        disabled={incident.status !== 'ward_rejected' && 
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
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <div className="space-y-2">
                        <Badge variant={getStatusColor(incident.status) as any}>
                          {getStatusText(incident.status)}
                        </Badge>
                        {incident.status === 'pending_ward_approval' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openProcessingDialog(incident)}
                            className="w-full"
                          >
                            Xử lý
                          </Button>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {new Date(incident.createdAt).toLocaleDateString('vi-VN', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <div className="flex gap-2">
                        {(incident.status === 'ward_rejected' || 
                          incident.status === 'resolved' || 
                          incident.status === 'closed') && (
                          <Button
                            variant="destructive"
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
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
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
                  <p className="text-sm">{new Date(selectedIncident.createdAt).toLocaleDateString('vi-VN', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}</p>
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

              {/* Hiển thị media files nếu có */}
              {(() => {
                type WithMedia = Incident & { mediaFiles?: string[]; images?: string[]; attachments?: string[] };
                const si = selectedIncident as WithMedia;
                const mediaUrls: string[] = si.mediaFiles ?? si.images ?? si.attachments ?? [];
                if (!mediaUrls || mediaUrls.length === 0) return null;

                return (
                <div>
                  <h4 className="font-medium mb-2">Hình ảnh/Video minh chứng:</h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {mediaUrls.map((url, index) => {
                      const isVideo = url.includes('.mp4') || url.includes('.mov') || url.includes('.avi');
                      return (
                        <div key={index} className="relative">
                          <div className="aspect-square rounded-lg overflow-hidden bg-gray-100">
                            {isVideo ? (
                              <video src={url} controls className="w-full h-full object-cover" />
                            ) : (
                              <img 
                                src={url} 
                                alt={`Evidence ${index + 1}`}
                                className="w-full h-full object-cover cursor-pointer hover:opacity-90"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  // Tạo modal ảnh hoàn toàn độc lập
                                  const imageModal = document.createElement('div');
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
                                    if (e.stopImmediatePropagation) {
                                      e.stopImmediatePropagation();
                                    }
                                    e.cancelBubble = true;
                                    setTimeout(() => { closeImageModal(); }, 0);
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
                                    if (e.stopImmediatePropagation) {
                                      e.stopImmediatePropagation();
                                    }
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
                                    e.preventDefault();
                                    e.stopPropagation();
                                    if (e.stopImmediatePropagation) {
                                      e.stopImmediatePropagation();
                                    }
                                    e.cancelBubble = true;
                                    setTimeout(() => { closeImageModal(); }, 0);
                                    return false;
                                  };
                                  
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

      {/* Processing Dialog */}
      <Dialog open={isProcessingDialogOpen} onOpenChange={setIsProcessingDialogOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Xử lý sự cố</DialogTitle>
            <DialogDescription>
              Chọn hành động và nhập lý do cho sự cố: {selectedIncident?.title}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Hành động</label>
              <div className="flex space-x-4 mt-2">
                <label className="flex items-center space-x-2">
                  <input
                    type="radio"
                    value="approve"
                    checked={processingAction === 'approve'}
                    onChange={(e) => setProcessingAction(e.target.value as 'approve' | 'reject')}
                  />
                  <span className="text-sm">Duyệt sự cố</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input
                    type="radio"
                    value="reject"
                    checked={processingAction === 'reject'}
                    onChange={(e) => setProcessingAction(e.target.value as 'approve' | 'reject')}
                  />
                  <span className="text-sm">Từ chối sự cố</span>
                </label>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">
                {processingAction === 'approve' ? 'Lý do duyệt' : 'Lý do từ chối'}
              </label>
              <Textarea
                className="w-full mt-1"
                rows={3}
                value={processingComment}
                onChange={(e) => setProcessingComment(e.target.value)}
                placeholder={
                  processingAction === 'approve'
                    ? 'Nhập lý do duyệt sự cố (không bắt buộc)...'
                    : 'Nhập lý do từ chối sự cố...'
                }
                required={processingAction !== 'approve'}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsProcessingDialogOpen(false)}>
              Hủy
            </Button>
            <Button
              onClick={handleProcessIncident}
              variant={processingAction === 'approve' ? 'default' : 'destructive'}
              disabled={processingAction !== 'approve' && !processingComment.trim()}
            >
              {processingAction === 'approve' ? 'Duyệt' : 'Từ chối'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Xóa sự cố</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <p>Bạn có chắc chắn muốn xóa sự cố này không?</p>
            {selectedIncident && (
              <div className="p-3 bg-muted rounded-md">
                <p><b>Tiêu đề:</b> {selectedIncident.title}</p>
                <p><b>Trạng thái:</b> {getStatusText(selectedIncident.status)}</p>
                <p><b>Ngày báo cáo:</b> {new Date(selectedIncident.createdAt).toLocaleDateString('vi-VN', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}</p>
              </div>
            )}
            <p className="text-sm text-muted-foreground">Hành động này không thể hoàn tác.</p>
          </div>
          <DialogFooter className="space-x-2">
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>Hủy</Button>
            <Button variant="destructive" onClick={handleDeleteIncident}>Xóa</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Delete Dialog */}
      <Dialog open={isBulkDeleteDialogOpen} onOpenChange={setIsBulkDeleteDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
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

export default WardIncidentsPage;