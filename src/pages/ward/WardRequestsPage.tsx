import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { CheckCircle, Package, Clock, FileText, Eye, Monitor, HardDrive, Cpu, MemoryStick, Trash2, Trash } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { DeviceRequest, getDeviceRequests, updateDeviceRequest, deleteDeviceRequest, getDeviceTypeDisplayName, markDeviceRequestUpdateAsViewed } from '@/lib/services/deviceRequestService';
import { useAuth } from '@/contexts/AuthContext';
import { getDevices, Device } from '@/lib/services/deviceService';
import { FIELD_META, getFieldsForType, getCpuOptionsByType, getGpuOptionsByType } from '@/components/SpecEditor';

const WardRequestsPage = () => {
  const [requests, setRequests] = useState<DeviceRequest[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<DeviceRequest | null>(null);
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [confirmNotes, setConfirmNotes] = useState('');
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isBulkDeleteDialogOpen, setIsBulkDeleteDialogOpen] = useState(false);
  const [selectedRequests, setSelectedRequests] = useState<string[]>([]);
  const [allocatedDevices, setAllocatedDevices] = useState<Device[]>([]);
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    if (user?.wardId) {
      fetchRequests();
    }
  }, [user?.wardId]);

const fetchRequests = async () => {
  try {
    console.log("=== STARTING FETCH REQUESTS ===");
    console.log("User wardId:", user?.wardId);

    const allRequests = await getDeviceRequests(user?.wardId);

    console.log("=== FETCHED ALL REQUESTS ===");
    console.log("All requests:", allRequests);
    console.log("All requests length:", allRequests.length);

    // 🔹 Nếu chỉ test thì lấy hết, còn chạy thật thì lọc theo status
    const filteredRequests = allRequests.filter(
      (r) => r.status === "delivering" || r.status === "received"
    );

    console.log("=== FILTERED REQUESTS ===");
    console.log("Filtered requests:", filteredRequests);
    console.log("Filtered requests length:", filteredRequests.length);

    setRequests(filteredRequests);
    console.log("=== REQUESTS SET TO STATE ===");
  } catch (error: any) {
    console.error("=== ERROR IN FETCH REQUESTS ===");
    console.error("Error:", error);

    // Nếu lỗi do thiếu index thì log link tạo index
    if (error.code === "failed-precondition") {
      const match = error.message.match(
        /https:\/\/console\.firebase\.google\.com\/[^\s]+/
      );
      if (match) {
        console.warn("⚡ Firestore requires composite index ⚡");
        console.warn("👉 Tạo ở đây:", match[0]);
      }
    }

    toast({
      title: "Lỗi",
      description: error.message,
      variant: "destructive",
    });
  }
};



  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'warning';
      case 'approved': return 'success';
      case 'rejected': return 'destructive';
      case 'completed': return 'default';
      case 'delivering': return 'secondary';
      case 'received': return 'default';
      default: return 'secondary';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return 'Chờ duyệt';
      case 'approved': return 'Đã duyệt';
      case 'rejected': return 'Từ chối';
      case 'completed': return 'Đã cấp phát';
      case 'delivering': return 'Đang giao';
      case 'received': return 'Đã nhận';
      default: return 'Không xác định';
    }
  };

  const openConfirmDialog = (request: DeviceRequest) => {
    setSelectedRequest(request);
    setConfirmNotes('');
    setIsConfirmDialogOpen(true);
  };

  const closeConfirmDialog = () => {
    setIsConfirmDialogOpen(false);
    setSelectedRequest(null);
    setConfirmNotes('');
  };

  const handleConfirmReceived = async () => {
    try {
      if (!selectedRequest) return;
      
      // Cập nhật trạng thái thiết bị thành "active" nếu có thiết bị được cấp phát
      if (selectedRequest.deviceSerialNumbers && selectedRequest.deviceSerialNumbers.length > 0) {
        const { updateDevice } = await import('@/lib/services/deviceService');
        
        // Cập nhật từng thiết bị được cấp phát
        for (const deviceId of selectedRequest.deviceSerialNumbers) {
          await updateDevice(deviceId, { 
            status: 'active' // Đặt trạng thái thành hoạt động
          });
        }
      }
      
      // Cập nhật trạng thái yêu cầu thành "received"
      await updateDeviceRequest(selectedRequest.id, { 
        status: 'received',
        receivedBy: user?.displayName || 'Người dùng',
        receivedAt: new Date(),
        notes: confirmNotes,
      }, {
        id: user?.id || '',
        name: user?.displayName || 'Phường',
        role: 'ward'
      });
      
      toast({ 
        title: 'Xác nhận thành công', 
        description: 'Đã xác nhận nhận thiết bị thành công. Thiết bị đã được chuyển sang trạng thái hoạt động.' 
      });
      
      fetchRequests();
      closeConfirmDialog();
    } catch (error: any) {
      toast({ title: 'Lỗi', description: error.message, variant: 'destructive' });
    }
  };

  // Hàm mở dialog xóa
  const openDeleteDialog = (request: DeviceRequest) => {
    setSelectedRequest(request);
    setIsDeleteDialogOpen(true);
  };

  // Hàm xóa yêu cầu
  const handleDeleteRequest = async () => {
    if (!selectedRequest) return;
    
    try {
      await deleteDeviceRequest(selectedRequest.id, user?.id || '', user?.role || 'ward');
      setRequests(prev => prev.filter(r => r.id !== selectedRequest.id));
      toast({ title: 'Xóa thành công', description: 'Yêu cầu đã được xóa khỏi hệ thống.' });
      setIsDeleteDialogOpen(false);
      setSelectedRequest(null);
    } catch (error: any) {
      toast({ title: 'Lỗi', description: error.message, variant: 'destructive' });
    }
  };

  // Bulk delete functions
  const handleSelectRequest = (requestId: string, checked: boolean) => {
    if (checked) {
      setSelectedRequests(prev => [...prev, requestId]);
    } else {
      setSelectedRequests(prev => prev.filter(id => id !== requestId));
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const deletableRequests = requests.filter(request => 
        request.status === 'completed' || 
        request.status === 'rejected'
      );
      setSelectedRequests(deletableRequests.map(r => r.id));
    } else {
      setSelectedRequests([]);
    }
  };

  const openBulkDeleteDialog = () => {
    if (selectedRequests.length === 0) {
      toast({
        title: 'Chưa chọn yêu cầu',
        description: 'Vui lòng chọn ít nhất một yêu cầu để xóa.',
        variant: 'destructive'
      });
      return;
    }
    setIsBulkDeleteDialogOpen(true);
  };

  const handleBulkDelete = async () => {
    try {
      const deletePromises = selectedRequests.map(id => deleteDeviceRequest(id, user?.id || '', user?.role || 'ward'));
      await Promise.all(deletePromises);
      
      setRequests(prev => prev.filter(r => !selectedRequests.includes(r.id)));
      setSelectedRequests([]);
      toast({ 
        title: 'Xóa thành công', 
        description: `Đã xóa ${selectedRequests.length} yêu cầu.` 
      });
      setIsBulkDeleteDialogOpen(false);
    } catch (error: any) {
      toast({ 
        title: 'Lỗi', 
        description: error.message || 'Không thể xóa yêu cầu', 
        variant: 'destructive' 
      });
    }
  };

  const handleDeleteAll = async () => {
    const deletableRequests = requests.filter(request => 
      request.status === 'completed' || 
      request.status === 'rejected'
    );
    
    if (deletableRequests.length === 0) {
      toast({
        title: 'Không có yêu cầu để xóa',
        description: 'Không có yêu cầu nào có thể xóa.',
        variant: 'destructive'
      });
      return;
    }

    try {
      const deletePromises = deletableRequests.map(request => deleteDeviceRequest(request.id, user?.id || '', user?.role || 'ward'));
      await Promise.all(deletePromises);
      
      setRequests(prev => prev.filter(r => 
        r.status !== 'completed' && 
        r.status !== 'rejected'
      ));
      setSelectedRequests([]);
      toast({ 
        title: 'Xóa thành công', 
        description: `Đã xóa tất cả ${deletableRequests.length} yêu cầu.` 
      });
    } catch (error: any) {
      toast({ 
        title: 'Lỗi', 
        description: error.message || 'Không thể xóa yêu cầu', 
        variant: 'destructive' 
      });
    }
  };

  // Hàm mở dialog chi tiết thiết bị
  const openDetailDialog = async (request: DeviceRequest) => {
    console.log('=== OPEN DETAIL DIALOG ===');
    console.log('Request ID:', request.id);
    console.log('Current isDetailDialogOpen:', isDetailDialogOpen);
    console.log('Current selectedRequest:', selectedRequest);
    
    setSelectedRequest(request);
    setIsDetailDialogOpen(true);
    
    console.log('After setting state:');
    console.log('selectedRequest set to:', request);
    console.log('isDetailDialogOpen set to: true');
    
    // Đánh dấu đã xem cập nhật mới nếu có
    if (request.hasNewUpdate) {
      try {
        await markDeviceRequestUpdateAsViewed(request.id);
        setRequests(prev => prev.map(r => 
          r.id === request.id ? { ...r, hasNewUpdate: false } : r
        ));
      } catch (error) {
        console.error('Error marking device request update as viewed:', error);
      }
    }
  };

  // Hàm đóng dialog chi tiết
  const closeDetailDialog = () => {
    setIsDetailDialogOpen(false);
    setSelectedRequest(null);
    setAllocatedDevices([]);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Nhận thiết bị</h1>
        <p className="text-muted-foreground">Xác nhận nhận thiết bị từ trung tâm</p>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex justify-between pb-2">
            <CardTitle className="text-sm font-medium">Tổng thiết bị</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{requests.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex justify-between pb-2">
            <CardTitle className="text-sm font-medium">Đang giao</CardTitle>
            <Package className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {requests.filter(r => r.status === 'delivering').length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex justify-between pb-2">
            <CardTitle className="text-sm font-medium">Đã nhận</CardTitle>
            <CheckCircle className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {requests.filter(r => r.status === 'received').length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Requests Table */}
      <Card>
        <CardHeader>
          <CardTitle>Danh sách thiết bị cần nhận ({requests.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Bulk Actions */}
          {requests.length > 0 && (
            <div className="flex items-center gap-2 mb-4 p-3 bg-muted rounded-lg">
              <Checkbox
                checked={selectedRequests.length > 0}
                onCheckedChange={handleSelectAll}
              />
              <span className="text-sm text-muted-foreground">
                {selectedRequests.length > 0 ? `Đã chọn ${selectedRequests.length} yêu cầu` : 'Chọn tất cả'}
              </span>
              {selectedRequests.length > 0 && (
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
                <TableHead>Loại thiết bị</TableHead>
                <TableHead>Số lượng</TableHead>
                <TableHead>Lý do</TableHead>
                <TableHead>Ngày yêu cầu</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead>Thao tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {requests.map((request) => (
                <TableRow 
                  key={request.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => {
                    console.log('ROW CLICKED!', request.id);
                    openDetailDialog(request);
                  }}
                >
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={selectedRequests.includes(request.id)}
                      onCheckedChange={(checked) => handleSelectRequest(request.id, checked as boolean)}
                      disabled={request.status !== 'completed' && request.status !== 'rejected'}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span>{getDeviceTypeDisplayName(request.deviceType)}</span>
                      {request.hasNewUpdate && request.lastUpdateByRole === 'center' && (
                        <Badge variant="destructive" className="text-xs px-2 py-1 animate-pulse shadow-lg ring-2 ring-red-300 ring-opacity-50">
                          Có cập nhật mới
                        </Badge>
                      )}
                    </div>
                    {request.hasNewUpdate && request.lastUpdateByRole === 'center' && request.lastUpdateByName && (
                      <p className="text-xs text-blue-600 mt-1">
                        Cập nhật bởi: {request.lastUpdateByName}
                      </p>
                    )}
                  </TableCell>
                  <TableCell>{request.quantity}</TableCell>
                  <TableCell className="max-w-xs truncate">{request.reason}</TableCell>
                  <TableCell>
                    {request.createdAt.toLocaleDateString('vi-VN', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </TableCell>
                  <TableCell>
                    <Badge variant={getStatusColor(request.status) as any}>
                      {getStatusText(request.status)}
                    </Badge>
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <div className="flex gap-2">
                      {/* Nút Xác nhận nhận */}
                      {request.status === 'delivering' && (
                        <Button
                          size="sm"
                          onClick={() => openConfirmDialog(request)}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Xác nhận nhận
                        </Button>
                      )}
                      
                      {/* Trạng thái đã nhận */}
                      {request.status === 'received' && (
                        <span className="text-sm text-muted-foreground flex items-center">
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Đã nhận: {request.receivedAt?.toLocaleDateString('vi-VN')}
                        </span>
                      )}
                      
                      {/* Nút Xóa - chỉ hiển thị cho các trạng thái đã hoàn thành */}
                      {(request.status === 'completed' || request.status === 'rejected') && (
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => openDeleteDialog(request)}
                        >
                          <Trash2 className="h-4 w-4" />
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

      {/* Confirm Received Dialog */}
      <Dialog open={isConfirmDialogOpen} onOpenChange={closeConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Xác nhận nhận thiết bị</DialogTitle>
            <DialogDescription>
              Xác nhận đã nhận được thiết bị từ trung tâm
            </DialogDescription>
          </DialogHeader>

          {selectedRequest && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Loại thiết bị:</Label>
                  <p className="text-sm text-muted-foreground">
                    {getDeviceTypeDisplayName(selectedRequest.deviceType)}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Số lượng:</Label>
                  <p className="text-sm text-muted-foreground">{selectedRequest.quantity}</p>
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium">Lý do yêu cầu:</Label>
                <p className="text-sm text-muted-foreground">{selectedRequest.reason}</p>
              </div>

              <div>
                <Label className="text-sm font-medium">Người cấp phát:</Label>
                <p className="text-sm text-muted-foreground">{selectedRequest.allocatedBy || 'Không xác định'}</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmNotes">Ghi chú nhận thiết bị:</Label>
                <Textarea
                  id="confirmNotes"
                  value={confirmNotes}
                  onChange={(e) => setConfirmNotes(e.target.value)}
                  placeholder="Nhập ghi chú về việc nhận thiết bị..."
                  rows={3}
                />
              </div>
            </div>
          )}

          <DialogFooter className="space-x-2">
            <Button variant="outline" onClick={closeConfirmDialog}>Hủy</Button>
            <Button onClick={handleConfirmReceived} className="bg-green-600 hover:bg-green-700">
              <CheckCircle className="h-4 w-4 mr-2" />
              Xác nhận nhận thiết bị
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Device Detail Dialog */}
      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Chi tiết thiết bị được cấp phát</DialogTitle>
            <DialogDescription>
              {selectedRequest && (
                <>
                  Yêu cầu: {getDeviceTypeDisplayName(selectedRequest.deviceType)} - Số lượng: {selectedRequest.quantity}
                  {selectedRequest.allocatedBy && (
                    <span className="block mt-1 text-sm text-muted-foreground">
                      Cấp phát bởi: {selectedRequest.allocatedBy} - {selectedRequest.allocatedAt?.toLocaleDateString('vi-VN')}
                    </span>
                  )}
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          {selectedRequest && (
            <div className="space-y-6 py-4">
              {/* Trạng thái cấp phát */}
              <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <Package className="h-5 w-5 text-blue-600" />
                  <div>
                    <h4 className="font-medium text-blue-800">Trạng thái cấp phát</h4>
                    <p className="text-sm text-blue-600">
                      Đã cấp phát {
                        selectedRequest.deviceQuantities 
                          ? Object.values(selectedRequest.deviceQuantities).reduce((sum, qty) => sum + qty, 0)
                          : allocatedDevices.length
                      }/{selectedRequest.quantity} thiết bị
                    </p>
                  </div>
                </div>
                <Badge 
                  variant={
                    (selectedRequest.deviceQuantities 
                      ? Object.values(selectedRequest.deviceQuantities).reduce((sum, qty) => sum + qty, 0)
                      : allocatedDevices.length) === selectedRequest.quantity ? 'default' : 'secondary'
                  }
                  className={
                    (selectedRequest.deviceQuantities 
                      ? Object.values(selectedRequest.deviceQuantities).reduce((sum, qty) => sum + qty, 0)
                      : allocatedDevices.length) === selectedRequest.quantity ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'
                  }
                >
                  {(selectedRequest.deviceQuantities 
                    ? Object.values(selectedRequest.deviceQuantities).reduce((sum, qty) => sum + qty, 0)
                    : allocatedDevices.length) === selectedRequest.quantity ? 'Đủ số lượng' : 'Thiếu thiết bị'}
                </Badge>
              </div>

              {/* Thông tin yêu cầu */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                <div>
                  <h4 className="font-medium text-sm text-gray-700 mb-2">Thông tin yêu cầu</h4>
                  <div className="space-y-1 text-sm">
                    <p><strong>Loại thiết bị:</strong> {getDeviceTypeDisplayName(selectedRequest.deviceType)}</p>
                    <p><strong>Số lượng:</strong> {selectedRequest.quantity}</p>
                    <p><strong>Lý do:</strong> {selectedRequest.reason}</p>
                    <p><strong>Ngày yêu cầu:</strong> {selectedRequest.createdAt.toLocaleDateString('vi-VN', {
                      day: '2-digit',
                      month: '2-digit', 
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}</p>
                  </div>
                </div>
                <div>
                  <h4 className="font-medium text-sm text-gray-700 mb-2">Thông tin cấp phát</h4>
                  <div className="space-y-1 text-sm">
                    <p><strong>Số lượng cấp phát:</strong> {
                      selectedRequest.deviceQuantities 
                        ? Object.values(selectedRequest.deviceQuantities).reduce((sum, qty) => sum + qty, 0)
                        : allocatedDevices.length
                    }/{selectedRequest.quantity}</p>
                    <p><strong>Người cấp phát:</strong> {selectedRequest.allocatedBy || 'Chưa xác định'}</p>
                    <p><strong>Ngày cấp phát:</strong> {selectedRequest.allocatedAt?.toLocaleDateString('vi-VN') || 'Chưa xác định'}</p>
                    <p><strong>Ngày giao:</strong> {selectedRequest.deliveredAt?.toLocaleDateString('vi-VN') || 'Chưa xác định'}</p>
                    {selectedRequest.status === 'received' && (
                      <p><strong>Ngày nhận:</strong> {selectedRequest.receivedAt?.toLocaleDateString('vi-VN')}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Danh sách thiết bị được cấp phát */}
              <div>
                <h4 className="font-medium text-sm text-gray-700 mb-3 flex items-center">
                  <Package className="h-4 w-4 mr-2" />
                  Danh sách thiết bị được cấp phát ({allocatedDevices.length}/{selectedRequest.quantity})
                </h4>
                
                {allocatedDevices.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Monitor className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Chưa có thông tin chi tiết thiết bị</p>
                    <p className="text-sm">Thiết bị có thể chưa được cấp phát hoặc đang được xử lý</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {allocatedDevices.map((device, index) => (
                      <Card key={device.id} className="p-4">
                        <div className="space-y-3">
                          {/* Header thiết bị */}
                          <div className="flex items-start justify-between">
                            <div>
                              <h5 className="font-medium text-sm">{device.name}</h5>
                              <p className="text-xs text-muted-foreground">
                                {device.specifications?.brand && `${device.specifications.brand} `}
                                {device.specifications?.model && `${device.specifications.model}`}
                              </p>
                            </div>
                            <Badge variant={device.status === 'active' ? 'default' : 'secondary'}>
                              {device.status === 'active' ? 'Hoạt động' : 'Không hoạt động'}
                            </Badge>
                          </div>

                          {/* Thông tin kỹ thuật - hiển thị đầy đủ theo profile */}
                          <div className="space-y-1 text-xs">
                            {getFieldsForType(device.type || 'other')
                              .filter((k) => k !== 'vendor' && k !== 'description')
                              .map((k) => {
                                const meta = FIELD_META[k];
                                const rawVal = (device.specifications as any)?.[k];
                                if (!meta || rawVal === undefined || rawVal === '') return null;
                                const displayVal =
                                  k === 'license' || k === 'windowsLicense'
                                    ? (rawVal === 'licensed' ? 'Có' : rawVal === 'unlicensed' ? 'Không' : String(rawVal))
                                    : k === 'cpu'
                                    ? (rawVal === 'other'
                                        ? ((device.specifications as any)?.cpu_other || 'Khác')
                                        : (getCpuOptionsByType(device.type).find(o => o.value === rawVal)?.label || String(rawVal)))
                                    : k === 'gpu'
                                    ? (rawVal === 'other'
                                        ? ((device.specifications as any)?.gpu_other || 'Khác')
                                        : (getGpuOptionsByType(device.type).find(o => o.value === rawVal)?.label || String(rawVal)))
                                    : String(rawVal);
                                return (
                                  <div key={k} className="flex items-center">
                                    <span className="text-muted-foreground">{meta.label}:</span>
                                    <span className="ml-1">{displayVal}</span>
                                  </div>
                                );
                              })}
                          </div>

                          {/* Thông tin bổ sung */}
                          <div className="pt-2 border-t">
                            <div className="text-xs text-muted-foreground space-y-1">
                              <p><strong>Vị trí:</strong> {device.location}</p>
                              <p><strong>Ngày lắp đặt:</strong> {device.installationDate.toLocaleDateString('vi-VN')}</p>
                              {device.description && (
                                <p><strong>Mô tả:</strong> {device.description}</p>
                              )}
                            </div>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </div>

              {/* Ghi chú */}
              {selectedRequest.notes && (
                <div className="p-4 bg-blue-50 rounded-lg">
                  <h4 className="font-medium text-sm text-blue-700 mb-2">Ghi chú từ trung tâm</h4>
                  <p className="text-sm text-blue-600">{selectedRequest.notes}</p>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={closeDetailDialog}>Đóng</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Xóa yêu cầu thiết bị</DialogTitle>
            <DialogDescription>
              Bạn có chắc chắn muốn xóa yêu cầu này không? Hành động này không thể hoàn tác.
            </DialogDescription>
          </DialogHeader>
          
          {selectedRequest && (
            <div className="py-4">
              <div className="p-3 bg-muted rounded-md">
                <p><b>Loại thiết bị:</b> {getDeviceTypeDisplayName(selectedRequest.deviceType)}</p>
                <p><b>Số lượng:</b> {selectedRequest.quantity}</p>
                <p><b>Lý do:</b> {selectedRequest.reason}</p>
                <p><b>Ngày yêu cầu:</b> {selectedRequest.createdAt.toLocaleDateString('vi-VN', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}</p>
              </div>
            </div>
          )}

          <DialogFooter className="space-x-2">
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>Hủy</Button>
            <Button variant="destructive" onClick={handleDeleteRequest}>Xóa</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Delete Dialog */}
      <Dialog open={isBulkDeleteDialogOpen} onOpenChange={setIsBulkDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Xóa nhiều yêu cầu</DialogTitle>
            <DialogDescription>
              Bạn có chắc chắn muốn xóa {selectedRequests.length} yêu cầu đã chọn không? Hành động này không thể hoàn tác.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <div className="max-h-40 overflow-y-auto space-y-2">
              {selectedRequests.map(id => {
                const request = requests.find(r => r.id === id);
                return request ? (
                  <div key={id} className="p-2 bg-muted rounded text-sm">
                    <p><b>{getDeviceTypeDisplayName(request.deviceType)}</b> - {request.status}</p>
                  </div>
                ) : null;
              })}
            </div>
          </div>

          <DialogFooter className="space-x-2">
            <Button variant="outline" onClick={() => setIsBulkDeleteDialogOpen(false)}>Hủy</Button>
            <Button variant="destructive" onClick={handleBulkDelete}>Xóa {selectedRequests.length} yêu cầu</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default WardRequestsPage;
