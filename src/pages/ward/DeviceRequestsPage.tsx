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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Clock, CheckCircle, XCircle, Package } from 'lucide-react';
import { collection, query, orderBy, where, onSnapshot } from "firebase/firestore";
import { db } from '@/lib/firebase'; 
import { Loader2 } from 'lucide-react';

import { useAuth } from '@/contexts/AuthContext';
import { getDeviceTypeDisplayName, DeviceRequest,
  getDeviceRequestsRealtime,
   createDeviceRequest, getWardById ,getDeviceRequests} from '@/lib/services/deviceRequestService';

const MySwal = withReactContent(Swal);

const DeviceRequestsPage: React.FC = () => {
  const { user } = useAuth();
  const [requests, setRequests] = useState<DeviceRequest[]>([]);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);


  const [newRequest, setNewRequest] = useState({
    deviceType: 'camera',
    quantity: 1,
    reason: '',
  });
  useEffect(() => {
    if (!user || !user.wardId) return;
  
    setLoading(true); // Bật loading khi bắt đầu fetch
  
    function convertTimestamp(value: any): Date {
      return value && 'toDate' in value ? value.toDate() : value instanceof Date ? value : new Date();
    }
  
    const unsubscribe = getDeviceRequestsRealtime(user.wardId, (data) => {
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
      case 'approved': return 'default';
      case 'rejected': return 'destructive';
      default: return 'secondary';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return 'Chờ duyệt';
      case 'approved': return 'Đã duyệt';
      case 'rejected': return 'Từ chối';
      default: return 'Không xác định';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="h-4 w-4" />;
      case 'approved': return <CheckCircle className="h-4 w-4" />;
      case 'rejected': return <XCircle className="h-4 w-4" />;
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
        user?.id || ''
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
        text: `Yêu cầu đã được gửi với ID: ${requestId}`,
      });
    } catch (error: any) {
      MySwal.fire({
        icon: 'error',
        title: 'Lỗi',
        text: error.message,
      });
    }
  };

  // -------------------- Render -------------------- //
  const pendingRequests = requests.filter(r => r.status === 'pending');
  const approvedRequests = requests.filter(r => r.status === 'approved');
  const rejectedRequests = requests.filter(r => r.status === 'rejected');

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

          <DialogContent>
            <DialogHeader>
              <DialogTitle>Tạo yêu cầu cấp phát thiết bị</DialogTitle>
              <DialogDescription>
                Điền thông tin chi tiết cho yêu cầu cấp phát thiết bị mới
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
            <div className="space-y-2">
            <Label htmlFor="deviceType">Loại thiết bị</Label>
            <Input
              list="deviceTypes"
              id="deviceType"
              value={newRequest.deviceType}
              onChange={(e) => setNewRequest({ ...newRequest, deviceType: e.target.value })}
            />
            <datalist id="deviceTypes">
              <option value="Laptop" />
              <option value="Máy tính để bàn" />
              <option value="Máy in" />
              <option value="Màn hình" />
              <option value="Khác" />
            </datalist>
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
              <Button onClick={handleSubmitRequest} disabled={!newRequest.reason.trim()}>
                Gửi yêu cầu
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
            <div className="text-2xl font-bold">{requests.length}</div>
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
          <CardTitle>Danh sách yêu cầu ({requests.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Loại thiết bị</TableHead>
                <TableHead>Số lượng</TableHead>
                <TableHead>Lý do</TableHead>
                <TableHead>Ngày yêu cầu</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead>Phản hồi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {requests.map((request) => (
                <TableRow key={request.id}>
                  <TableCell>
                    <Badge variant="outline">{getDeviceTypeDisplayName(request.deviceType)}</Badge>
                  </TableCell>
                  <TableCell>{request.quantity}</TableCell>
                  <TableCell>{request.reason}</TableCell>
                  <TableCell>{request.createdAt.toLocaleDateString('vi-VN')}</TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      {getStatusIcon(request.status)}
                      <Badge variant={getStatusColor(request.status) as any}>{getStatusText(request.status)}</Badge>
                    </div>
                  </TableCell>
                  <TableCell>
                    {request.notes && <p className="text-xs text-muted-foreground">{request.notes}</p>}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
        
      </Card>
      
    </div>
  );
};

export default DeviceRequestsPage;
