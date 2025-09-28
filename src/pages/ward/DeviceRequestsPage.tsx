import React, { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Clock, CheckCircle, XCircle, Package, Trash2, Trash } from 'lucide-react';
import { collection, query, orderBy, where, onSnapshot } from "firebase/firestore";
import { db } from '@/lib/firebase'; 
import { Loader2 } from 'lucide-react';

import { useAuth } from '@/contexts/AuthContext';
import { getDeviceTypeDisplayName, DeviceRequest,
  getDeviceRequestsRealtime,
   createDeviceRequest, getWardById ,getDeviceRequests, deleteDeviceRequest, markDeviceRequestUpdateAsViewed} from '@/lib/services/deviceRequestService';

const MySwal = withReactContent(Swal);

const DeviceRequestsPage: React.FC = () => {
  const { user } = useAuth();
  const [requests, setRequests] = useState<DeviceRequest[]>([]);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isBulkDeleteDialogOpen, setIsBulkDeleteDialogOpen] = useState(false);
  const [selectedRequests, setSelectedRequests] = useState<string[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<DeviceRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);


  const [newRequest, setNewRequest] = useState({
    deviceType: 'camera',
    quantity: 1,
    reason: '',
  });

  const DEVICE_TYPES = [
    { value: 'pc', label: 'Máy tính để bàn' },
    { value: 'laptop', label: 'Laptop' },
    { value: 'camera', label: 'Camera' },
    { value: 'router', label: 'Router' },
    { value: 'sensor', label: 'Cảm biến' },
    { value: 'printer', label: 'Máy in' },
    { value: 'monitor', label: 'Màn hình' },
    { value: 'server', label: 'Server' },
    { value: 'switch', label: 'Switch' },
    { value: 'ups', label: 'UPS' },
    { value: 'ip_phone', label: 'Điện thoại IP' },
    { value: 'other', label: 'Thiết bị khác' },
  ];
  useEffect(() => {
    if (!user || !user.wardId) return;
  
    setLoading(true); // Bật loading khi bắt đầu fetch
  
    function convertTimestamp(value: any): Date {
      return value && 'toDate' in value ? value.toDate() : value instanceof Date ? value : new Date();
    }
  
    const unsubscribe = getDeviceRequestsRealtime(user.wardId, (data) => {
      console.log('🔄 Real-time update received:', {
        wardId: user.wardId,
        requestCount: data.length,
        requests: data.map(r => ({ id: r.id, status: r.status, deviceType: r.deviceType }))
      });
      
      const converted = data.map(d => ({
        ...d,
        createdAt: convertTimestamp(d.createdAt),
        updatedAt: convertTimestamp(d.updatedAt),
      }));
      setRequests(converted);
      setLoading(false); 
    });
  
    return () => unsubscribe();
  }, [user]);
  
  
  
  if (!user || loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Đang tải dữ liệu...</p>
        </div>
      </div>
    );
  }

  // -------------------- Helpers -------------------- //
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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="h-4 w-4" />;
      case 'approved': return <CheckCircle className="h-4 w-4" />;
      case 'rejected': return <XCircle className="h-4 w-4" />;
      case 'completed': return <Package className="h-4 w-4" />;
      case 'delivering': return <Package className="h-4 w-4" />;
      case 'received': return <CheckCircle className="h-4 w-4" />;
      default: return null;
    }
  };

  // -------------------- Submit Request -------------------- //
  const handleSubmitRequest = async () => {
    if (!newRequest.reason.trim()) {
      return MySwal.fire({
        icon: 'error',
        title: 'Lỗi',
        text: 'Vui lòng nhập lý do yêu cầu',
      });
    }
     setSubmitting(true); // bật loading
    try {
      const ward = await getWardById(user?.wardId || '');
      if (!ward) throw new Error('Không tìm thấy thông tin phường');

      const requestId = await createDeviceRequest(
        {
          deviceName: newRequest.deviceType,
          deviceType: newRequest.deviceType as any,
          quantity: newRequest.quantity,
          reason: newRequest.reason,
          wardId: ward.id,
          wardName: ward.name,
        },
        user?.id || '',
        user?.displayName || user?.email || 'Người dùng'
      );
      // const updatedRequests = await getDeviceRequests(user?.wardId);
      // setRequests(updatedRequests);
      // Thêm vào state
      // setRequests([
      //   {
      //     id: requestId,
      //     wardId: ward.id,
      //     wardName: ward.name,
      //     deviceType: newRequest.deviceType as 'camera' | 'sensor' | 'router' | 'other',
      //     deviceName: newRequest.deviceType, // thêm trường này
      //     quantity: newRequest.quantity,
      //     reason: newRequest.reason,
      //     requestedBy: user?.id || '',
      //     status: 'pending',
      //     createdAt: new Date(),
      //     updatedAt: new Date(),
      //   } as DeviceRequest, // ép kiểu cho TypeScript
      //   ...requests
      // ]);
      

      setIsAddDialogOpen(false);
      setNewRequest({ deviceType: 'camera', quantity: 1, reason: '' });
      

      MySwal.fire({
        icon: 'success',
        title: 'Gửi yêu cầu thành công',
        text: `Yêu cầu đã được gửi trung tâm`,
        timer:2000,
      });
    } catch (error: any) {
      MySwal.fire({
        icon: 'error',
        title: 'Lỗi',
        text: error.message,
      });
    }
     setSubmitting(false);
  };

  // Delete functions
  const openDeleteDialog = (request: DeviceRequest) => {
    setSelectedRequest(request);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteRequest = async () => {
    if (!selectedRequest) return;
    
    try {
      await deleteDeviceRequest(selectedRequest.id, user?.id || '', user?.role || 'ward');
      setRequests(prev => prev.filter(r => r.id !== selectedRequest.id));
      MySwal.fire({
        icon: 'success',
        title: 'Xóa thành công',
        text: 'Yêu cầu đã được xóa khỏi hệ thống.',
      });
      setIsDeleteDialogOpen(false);
      setSelectedRequest(null);
    } catch (error: any) {
      MySwal.fire({
        icon: 'error',
        title: 'Lỗi',
        text: error.message,
      });
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
        request.status === 'pending' || 
        request.status === 'rejected'
      );
      setSelectedRequests(deletableRequests.map(r => r.id));
    } else {
      setSelectedRequests([]);
    }
  };

  const openBulkDeleteDialog = () => {
    if (selectedRequests.length === 0) {
      MySwal.fire({
        icon: 'warning',
        title: 'Chưa chọn yêu cầu',
        text: 'Vui lòng chọn ít nhất một yêu cầu để xóa.',
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
      MySwal.fire({
        icon: 'success',
        title: 'Xóa thành công',
        text: `Đã xóa ${selectedRequests.length} yêu cầu.`,
      });
      setIsBulkDeleteDialogOpen(false);
    } catch (error: any) {
      MySwal.fire({
        icon: 'error',
        title: 'Lỗi',
        text: error.message || 'Không thể xóa yêu cầu',
      });
    }
  };

  // Hàm mở dialog chi tiết yêu cầu
  const openDetailDialog = async (request: DeviceRequest) => {
    console.log('=== OPEN DETAIL DIALOG ===');
    console.log('Request ID:', request.id);
    console.log('Request:', request);
    
    setSelectedRequest(request);
    setIsDetailDialogOpen(true);
    
    // Đánh dấu đã xem cập nhật mới nếu có (chỉ khi cập nhật từ trung tâm)
    if (request.hasNewUpdate && request.lastUpdateByRole === 'center') {
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

  const handleDeleteAll = async () => {
    const deletableRequests = requests.filter(request => 
      request.status === 'pending' || 
      request.status === 'rejected'
    );
    
    if (deletableRequests.length === 0) {
      MySwal.fire({
        icon: 'warning',
        title: 'Không có yêu cầu để xóa',
        text: 'Không có yêu cầu nào có thể xóa.',
      });
      return;
    }

    try {
      const deletePromises = deletableRequests.map(request => deleteDeviceRequest(request.id, user?.id || '', user?.role || 'ward'));
      await Promise.all(deletePromises);
      
      setRequests(prev => prev.filter(r => 
        r.status !== 'pending' && 
        r.status !== 'rejected'
      ));
      setSelectedRequests([]);
      MySwal.fire({
        icon: 'success',
        title: 'Xóa thành công',
        text: `Đã xóa tất cả ${deletableRequests.length} yêu cầu.`,
      });
    } catch (error: any) {
      MySwal.fire({
        icon: 'error',
        title: 'Lỗi',
        text: error.message || 'Không thể xóa yêu cầu',
      });
    }
  };

  // -------------------- Render -------------------- //
  const pendingRequests = requests.filter(r => r.status === 'pending');
  const approvedRequests = requests.filter(r => r.status === 'approved');
  const rejectedRequests = requests.filter(r => r.status === 'rejected');
  const receivedRequests = requests.filter(r => r.status === 'received');
  
  // Chỉ hiển thị các yêu cầu từ "Chờ duyệt" đến "Đã duyệt" (không bao gồm delivering và received)
  const displayRequests = requests.filter(r => 
    r.status === 'pending' || r.status === 'approved' || r.status === 'rejected'
  );

  return (
    
    <div className="space-y-6">
      {/* Header & Button */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Yêu cầu thiết bị</h1>
          <p className="text-muted-foreground">Quản lý yêu cầu cấp phát thiết bị của phường</p>
        </div>

        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="flex items-center space-x-2">
              <Plus className="h-4 w-4" />
              <span>Tạo yêu cầu mới</span>
            </Button>
          </DialogTrigger>

          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Tạo yêu cầu cấp phát thiết bị</DialogTitle>
              <DialogDescription>
                Điền thông tin chi tiết cho yêu cầu cấp phát thiết bị mới
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="deviceType">Loại thiết bị</Label>
              <Select
                value={newRequest.deviceType}
                onValueChange={(value) => setNewRequest({ ...newRequest, deviceType: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Chọn loại thiết bị" />
                </SelectTrigger>
                <SelectContent>
                  {DEVICE_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>


              <div className="space-y-2">
                <Label htmlFor="quantity">Số lượng</Label>
                <Input
                  id="quantity"
                  type="number"
                  min={1}
                  value={newRequest.quantity}
                  onChange={(e) =>
                    setNewRequest({ ...newRequest, quantity: parseInt(e.target.value) || 1 })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="reason">Lý do yêu cầu</Label>
                <Textarea
                  id="reason"
                  value={newRequest.reason}
                  onChange={(e) => setNewRequest({ ...newRequest, reason: e.target.value })}
                  placeholder="Mô tả lý do cần thiết bị này..."
                  rows={4}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Hủy</Button>
              <Button onClick={handleSubmitRequest} disabled={submitting}>
              {submitting ? "Đang gửi..." : "Gửi yêu cầu"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex justify-between pb-2">
            <CardTitle className="text-sm font-medium">Tổng yêu cầu</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{displayRequests.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex justify-between pb-2">
            <CardTitle className="text-sm font-medium">Chờ duyệt</CardTitle>
            <Clock className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning">{pendingRequests.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex justify-between pb-2">
            <CardTitle className="text-sm font-medium">Đã duyệt</CardTitle>
            <CheckCircle className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">{approvedRequests.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex justify-between pb-2">
            <CardTitle className="text-sm font-medium">Từ chối</CardTitle>
            <XCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{rejectedRequests.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Requests Table */}
      <Card>
        <CardHeader>
          <CardTitle>Danh sách yêu cầu ({displayRequests.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Bulk Actions - Phường không có quyền xóa nên ẩn */}

          <Table>
            <TableHeader>
              <TableRow>
                {/* <TableHead className="w-12">Chọn</TableHead> */}
                <TableHead>Loại thiết bị</TableHead>
                <TableHead>Số lượng</TableHead>
                <TableHead>Lý do</TableHead>
                <TableHead>Ngày yêu cầu</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead>Phản hồi</TableHead>
                <TableHead>Thao tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {displayRequests.map((request) => (
                <TableRow 
                  key={request.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => openDetailDialog(request)}
                >
                  {/* <TableCell onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={selectedRequests.includes(request.id)}
                      onCheckedChange={(checked) => handleSelectRequest(request.id, checked as boolean)}
                      disabled={request.status !== 'pending' && request.status !== 'rejected'}
                    />
                  </TableCell> */}
                  <TableCell>
                    <Badge variant="outline">{getDeviceTypeDisplayName(request.deviceType)}</Badge>
                  </TableCell>
                  <TableCell>{request.quantity}</TableCell>
                  <TableCell>{request.reason}</TableCell>
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
                    <div className="flex items-center space-x-2">
                      {getStatusIcon(request.status)}
                      <Badge variant={getStatusColor(request.status) as any}>{getStatusText(request.status)}</Badge>
                      {request.hasNewUpdate && request.lastUpdateByRole === 'center' && (
                        <Badge variant="destructive" className="text-xs px-2 py-1 animate-pulse shadow-lg ring-2 ring-red-300 ring-opacity-50">
                          Có cập nhật mới
                        </Badge>
                      )}
                    </div>
                    {request.hasNewUpdate && request.lastUpdateByName && (
                      <p className="text-xs text-blue-600 mt-1">
                        Cập nhật bởi: {request.lastUpdateByName}
                      </p>
                    )}
                  </TableCell>
                  <TableCell>
                    {request.notes && <p className="text-xs text-muted-foreground">{request.notes}</p>}
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    {/* Phường không có quyền xóa - chỉ trung tâm mới có quyền */}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
        
      </Card>

      {/* Delete Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
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
                <p><b>Trạng thái:</b> {getStatusText(selectedRequest.status)}</p>
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
        <DialogContent className="max-h-[90vh] overflow-y-auto">
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
                    <p><b>{getDeviceTypeDisplayName(request.deviceType)}</b> - {getStatusText(request.status)}</p>
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

      {/* Dialog chi tiết yêu cầu */}
      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Chi tiết yêu cầu thiết bị</DialogTitle>
            <DialogDescription>
              {selectedRequest && (
                <>
                  Yêu cầu: {getDeviceTypeDisplayName(selectedRequest.deviceType)} - Số lượng: {selectedRequest.quantity}
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          {selectedRequest && (
            <div className="space-y-4 py-4">
              {/* Thông tin cơ bản */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Loại thiết bị</Label>
                  <p className="text-lg font-semibold">{getDeviceTypeDisplayName(selectedRequest.deviceType)}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Số lượng</Label>
                  <p className="text-lg font-semibold">{selectedRequest.quantity}</p>
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium text-muted-foreground">Lý do yêu cầu</Label>
                <p className="text-base">{selectedRequest.reason}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Ngày yêu cầu</Label>
                  <p className="text-base">{selectedRequest.createdAt?.toLocaleDateString('vi-VN')}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Trạng thái</Label>
                  <div className="mt-1">
                    <Badge variant={
                      selectedRequest.status === 'pending' ? 'secondary' :
                      selectedRequest.status === 'approved' ? 'default' :
                      selectedRequest.status === 'rejected' ? 'destructive' : 'outline'
                    }>
                      {selectedRequest.status === 'pending' ? 'Chờ duyệt' :
                       selectedRequest.status === 'approved' ? 'Đã duyệt' :
                       selectedRequest.status === 'rejected' ? 'Từ chối' : selectedRequest.status}
                    </Badge>
                  </div>
                </div>
              </div>

              {selectedRequest.notes && (
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Phản hồi từ trung tâm</Label>
                  <p className="text-base">{selectedRequest.notes}</p>
                </div>
              )}

              {selectedRequest.approvedAt && (
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Ngày duyệt</Label>
                  <p className="text-base">{selectedRequest.approvedAt?.toLocaleDateString('vi-VN')}</p>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDetailDialogOpen(false)}>Đóng</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
    </div>
  );
};

export default DeviceRequestsPage;
