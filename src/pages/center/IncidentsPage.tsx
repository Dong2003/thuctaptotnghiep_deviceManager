import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Eye, AlertTriangle, CheckCircle, Clock, Trash2, Trash } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { 
  getApprovedIncidentsForCenter, 
  updateIncident, 
  deleteIncident,
  type Incident,
  type UpdateIncidentData,
  getSeverityColor,
  getStatusColor,
  markIncidentUpdateAsViewed
} from '@/lib/services/incidentService';

const IncidentsPage = () => {
  const { user } = useAuth();
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [isResolveDialogOpen, setIsResolveDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isBulkDeleteDialogOpen, setIsBulkDeleteDialogOpen] = useState(false);
  const [selectedIncidents, setSelectedIncidents] = useState<string[]>([]);
  const [resolution, setResolution] = useState('');
  const [newStatus, setNewStatus] = useState<Incident['status'] | ''>('');

  const { toast } = useToast();

  // Fetch incidents (only approved by ward)
  const fetchIncidents = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getApprovedIncidentsForCenter();
      setIncidents(data);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      toast({ title: 'Lỗi', description: message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchIncidents();
  }, [fetchIncidents]);

  // Open dialogs
  const openDetailDialog = async (incident: Incident) => {
    setSelectedIncident(incident);
    setIsDetailDialogOpen(true);
    
    // Tắt badge "Có cập nhật mới" khi đã xem
    if (incident.hasNewUpdate) {
      try {
        await markIncidentUpdateAsViewed(incident.id);
        setIncidents(prev => prev.map(i => 
          i.id === incident.id ? { ...i, hasNewUpdate: false } : i
        ));
      } catch (error) {
        console.error('Error marking incident update as viewed:', error);
      }
    }
  };

  const openResolveDialog = (incident: Incident) => {
    setSelectedIncident(incident);
    setNewStatus(incident.status); // Set trạng thái hiện tại
    setResolution('');
    setIsResolveDialogOpen(true);
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
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      toast({ title: 'Lỗi', description: message, variant: 'destructive' });
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

  // Update status
  const handleUpdateStatus = async (incident: Incident, newStatus: Incident['status']) => {
    try {
      await updateIncident(incident.id, { status: newStatus }, {
        id: user?.id || '',
        name: user?.displayName || 'Trung tâm',
        role: 'center'
      });
      setIncidents(prev => prev.map(i => i.id === incident.id ? { ...i, status: newStatus } : i));
      toast({ title: 'Cập nhật trạng thái thành công' });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      toast({ title: 'Lỗi', description: message, variant: 'destructive' });
    }
  };

  // Resolve incident
  const handleResolveIncident = async () => {
    if (!selectedIncident || !newStatus) return;
    try {
      const updateData: UpdateIncidentData = { status: newStatus as Incident['status'] };
      if (resolution.trim()) {
        updateData.resolution = resolution;
      }
      
      await updateIncident(selectedIncident.id, updateData, {
        id: user?.id || '',
        name: user?.displayName || 'Trung tâm',
        role: 'center'
      });
      setIncidents(prev => prev.map(i => 
        i.id === selectedIncident.id ? { 
          ...i, 
          status: updateData.status!,
          resolution: updateData.resolution,
          resolvedAt: (newStatus === 'resolved' || newStatus === 'closed') ? new Date() : i.resolvedAt
        } : i
      ));
      
      let statusText: string;
      if (newStatus === 'investigating') statusText = 'đang điều tra';
      else if (newStatus === 'in_progress') statusText = 'đang xử lý';
      else if (newStatus === 'resolved') statusText = 'đã giải quyết';
      else if (newStatus === 'closed') statusText = 'đã đóng';
      else statusText = newStatus;
      
      toast({ title: `Sự cố đã được cập nhật trạng thái: ${statusText}` });
      setIsResolveDialogOpen(false);
      setSelectedIncident(null);
      setResolution('');
      setNewStatus('');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      toast({ title: 'Lỗi', description: message, variant: 'destructive' });
    }
  };

  if (loading) return <div>Đang tải dữ liệu...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Quản lý sự cố thiết bị</h1>
          <p className="text-muted-foreground">Quản lý các sự cố đã được phường duyệt</p>
        </div>
        <Button onClick={fetchIncidents} variant="outline">
          <Clock className="h-4 w-4 mr-2" />
          Tải lại
        </Button>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Tổng sự cố</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground"/>
          </CardHeader>
          <CardContent className="text-2xl font-bold">{incidents.length}</CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Chưa xử lý</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive"/>
          </CardHeader>
          <CardContent className="text-2xl font-bold text-destructive">
            {incidents.filter(i => i.status === 'ward_approved' || i.status === 'investigating').length}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Đang xử lý</CardTitle>
            <Clock className="h-4 w-4 text-warning"/>
          </CardHeader>
          <CardContent className="text-2xl font-bold text-warning">
            {incidents.filter(i => i.status === 'in_progress').length}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Đã giải quyết</CardTitle>
            <CheckCircle className="h-4 w-4 text-success"/>
          </CardHeader>
          <CardContent className="text-2xl font-bold text-success">
            {incidents.filter(i => i.status === 'resolved' || i.status === 'closed').length}
          </CardContent>
        </Card>
      </div>

      {/* Incident Table */}
      <Card>
        <CardHeader>
          <CardTitle>Danh sách sự cố</CardTitle>
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
                <TableHead>Tiêu đề</TableHead>
                <TableHead>Mức độ</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead>Ngày báo cáo</TableHead>
                <TableHead>Thao tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {incidents.map(incident => (
                <TableRow key={incident.id} onClick={() => openDetailDialog(incident)} className="cursor-pointer">
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={selectedIncidents.includes(incident.id)}
                      onCheckedChange={(checked) => handleSelectIncident(incident.id, checked as boolean)}
                      disabled={incident.status !== 'resolved' && incident.status !== 'closed'}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span>{incident.title}</span>
                      {incident.hasNewUpdate && (
                        <Badge 
                          variant="destructive" 
                          className="animate-pulse shadow-lg ring-2 ring-red-300 ring-opacity-50"
                        >
                          Có cập nhật mới
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={getSeverityColor(incident.severity)}>{incident.severity}</Badge>
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Badge className={getStatusColor(incident.status)}>{incident.status}</Badge>
                    {(incident.status === 'ward_approved' || incident.status === 'investigating' || incident.status === 'in_progress') && (
                      <Select
                        value={incident.status}
                        onValueChange={(v: Incident['status']) => handleUpdateStatus(incident, v)}
                      >
                        <SelectTrigger className="w-40"><SelectValue/></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ward_approved">Đã duyệt</SelectItem>
                          <SelectItem value="investigating">Đang điều tra</SelectItem>
                          <SelectItem value="in_progress">Đang xử lý</SelectItem>
                          <SelectItem value="resolved">Đã giải quyết</SelectItem>
                          <SelectItem value="closed">Đã đóng</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  </TableCell>
                  <TableCell>
                    {incident.createdAt.toLocaleDateString('vi-VN', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => openDetailDialog(incident)}>
                        <Eye className="w-4 h-4"/>
                      </Button>
                      {(incident.status === 'ward_approved' || incident.status === 'investigating' || incident.status === 'in_progress') && (
                        <Button size="sm" onClick={() => openResolveDialog(incident)}>Giải quyết</Button>
                      )}
                      {(incident.status === 'resolved' || incident.status === 'closed') && (
                        <Button size="sm" variant="destructive" onClick={() => openDeleteDialog(incident)}>
                          <Trash2 className="w-4 h-4"/>
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Chi tiết sự cố</DialogTitle>
          </DialogHeader>
              {selectedIncident && (
            <div className="space-y-2">
              <p><b>Tiêu đề:</b> {selectedIncident.title}</p>
              <p><b>Mô tả:</b> {selectedIncident.description}</p>
              <p><b>Trạng thái:</b> {selectedIncident.status}</p>
              <p><b>Mức độ:</b> {selectedIncident.severity}</p>
              <p><b>Ngày báo cáo:</b> {selectedIncident.createdAt.toLocaleDateString('vi-VN', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}</p>
              <p><b>Người báo cáo:</b> {selectedIncident.reportedByName || 'Không xác định'}</p>
              {selectedIncident.resolution && <p><b>Giải pháp:</b> {selectedIncident.resolution}</p>}
              {/* Media compatibility: prefer mediaFiles (created by user UI), fallback to images/attachments */}
              {(() => {
                type WithMedia = Incident & { mediaFiles?: string[]; images?: string[]; attachments?: string[] };
                const si = selectedIncident as WithMedia;
                const mediaUrls: string[] = si.mediaFiles ?? si.images ?? si.attachments ?? [];
                if (!mediaUrls || mediaUrls.length === 0) return null;

                return (
                  <div>
                    <h4 className="font-medium mb-2">Hình ảnh/Video minh chứng:</h4>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {mediaUrls.map((url, index) => (
                        <div key={index} className="relative">
                          <div className="aspect-square rounded-lg overflow-hidden bg-gray-100">
                            {url.includes('video') || url.includes('.mp4') || url.includes('.mov') ? (
                              <video src={url} controls className="w-full h-full object-cover" />
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
                      ))}
                    </div>
                  </div>
                );
              })()}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDetailDialogOpen(false)}>Đóng</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Resolve Dialog */}
      <Dialog open={isResolveDialogOpen} onOpenChange={setIsResolveDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Xử lý sự cố</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {selectedIncident && (
              <div className="p-3 bg-muted rounded-md">
                <h4 className="font-medium mb-1">Sự cố:</h4>
                <p className="text-sm">{selectedIncident.title}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Được báo cáo bởi: {selectedIncident.reportedByName}
                </p>
                
                {/* Hiển thị media files nếu có */}
                {(() => {
                  type WithMedia = typeof selectedIncident & { mediaFiles?: string[]; images?: string[]; attachments?: string[] };
                  const si = selectedIncident as WithMedia;
                  const mediaUrls: string[] = si.mediaFiles ?? si.images ?? si.attachments ?? [];
                  if (!mediaUrls || mediaUrls.length === 0) return null;

                  return (
                    <div className="mt-3">
                      <h5 className="font-medium mb-2 text-sm">Hình ảnh/Video minh chứng:</h5>
                      <div className="grid grid-cols-2 gap-2">
                        {mediaUrls.map((url, index) => {
                          const isVideo = url.includes('.mp4') || url.includes('.mov') || url.includes('.avi');
                          return (
                            <div key={index} className="relative">
                              {isVideo ? (
                                <video 
                                  src={url} 
                                  controls 
                                  className="w-full h-20 object-cover rounded border"
                                />
                              ) : (
                                <img 
                                  src={url} 
                                  alt={`Evidence ${index + 1}`}
                                  className="w-full h-20 object-cover rounded border cursor-pointer hover:opacity-80"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    // Create independent image modal
                                    const imageModal = document.createElement('div');
                                    imageModal.style.cssText = `
                                      position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
                                      background: rgba(0, 0, 0, 0.9); display: flex; align-items: center;
                                      justify-content: center; z-index: 999998; cursor: pointer;
                                    `;
                                    const img = document.createElement('img');
                                    img.src = url;
                                    img.style.cssText = `max-width: 90vw; max-height: 90vh; object-fit: contain;`;
                                    const closeBtn = document.createElement('button');
                                    closeBtn.innerHTML = '×';
                                    closeBtn.style.cssText = `
                                      position: fixed; top: 20px; right: 20px; width: 40px; height: 40px;
                                      background: rgba(255, 0, 0, 0.8); color: white; border: 2px solid white;
                                      border-radius: 50%; font-size: 20px; cursor: pointer; z-index: 999999;
                                    `;
                                    const close = () => document.body.contains(imageModal) && document.body.removeChild(imageModal);
                                    closeBtn.onclick = close;
                                    imageModal.onclick = close;
                                    imageModal.appendChild(closeBtn);
                                    imageModal.appendChild(img);
                                    document.body.appendChild(imageModal);
                                  }}
                                />
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}

            <div>
              <Label className="text-base font-medium mb-3 block">Chọn trạng thái mới:</Label>
              <Select value={newStatus} onValueChange={(value: string) => setNewStatus(value as Incident['status'])}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Chọn trạng thái..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="investigating">🔍 Đang điều tra</SelectItem>
                  <SelectItem value="in_progress">⚙️ Đang xử lý</SelectItem>
                  <SelectItem value="resolved">✅ Đã giải quyết</SelectItem>
                  <SelectItem value="closed">🔒 Đã đóng</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-base font-medium mb-3 block">Ghi chú xử lý (không bắt buộc):</Label>
              <Textarea 
                value={resolution}
                onChange={(e) => setResolution(e.target.value)}
                placeholder="Nhập ghi chú về việc xử lý sự cố..."
                className="min-h-[80px]"
              />
            </div>
          </div>

          <DialogFooter className="space-x-2">
            <Button variant="outline" onClick={() => setIsResolveDialogOpen(false)}>Hủy</Button>
            <Button 
              onClick={handleResolveIncident}
              disabled={!newStatus}
            >
              Xác nhận
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Xóa sự cố</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <p>Bạn có chắc chắn muốn xóa sự cố này không?</p>
            {selectedIncident && (
              <div className="p-3 bg-muted rounded-md">
                <p><b>Tiêu đề:</b> {selectedIncident.title}</p>
                <p><b>Trạng thái:</b> {selectedIncident.status}</p>
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

export default IncidentsPage;
