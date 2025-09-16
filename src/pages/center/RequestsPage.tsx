import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CheckCircle, XCircle, Clock, FileText, Package } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { DeviceRequest, getDeviceRequests, updateDeviceRequest, getDeviceTypeDisplayName, getWardById } from '@/lib/services/deviceRequestService';
import { Ward } from '@/lib/services/wardService';
import { Device, getDevices, updateDevice, UpdateDeviceData } from '@/lib/services/deviceService';
import { useAuth } from '@/contexts/AuthContext';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

const RequestsPage = () => {
  const [requests, setRequests] = useState<DeviceRequest[]>([]);
  const [wardsMap, setWardsMap] = useState<Record<string, Ward | null>>({});
  const [availableDevices, setAvailableDevices] = useState<Device[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<DeviceRequest | null>(null);
  const [isResponseDialogOpen, setIsResponseDialogOpen] = useState(false);
  const [isAllocationDialogOpen, setIsAllocationDialogOpen] = useState(false);
  const [responseNotes, setResponseNotes] = useState('');
  const [allocationData, setAllocationData] = useState({
    selectedDevices: [] as string[],
    deviceQuantities: {} as Record<string, number>, // Lưu số lượng cho mỗi thiết bị
    allocationNotes: '',
  });
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    fetchRequests();
    fetchAvailableDevices();
  }, []);

  // Fetch requests and wards
  const fetchRequests = async () => {
    try {
      const data = await getDeviceRequests();
      setRequests(data);
      await fetchWards(data);
    } catch (error: any) {
      toast({ title: 'Lỗi', description: error.message, variant: 'destructive' });
    }
  };

  const fetchWards = async (requests: DeviceRequest[]) => {
    const map: Record<string, Ward | null> = {};
    await Promise.all(
      requests.map(async (req) => {
        if (!map[req.wardId]) {
          map[req.wardId] = await getWardById(req.wardId);
        }
      })
    );
    setWardsMap(map);
  };

  const fetchAvailableDevices = async () => {
    try {
      // Lấy tất cả thiết bị, không chỉ unassigned
      const devices = await getDevices(); // Lấy tất cả thiết bị
      console.log('All devices for allocation:', devices);
      setAvailableDevices(devices);
      
      // Debug: Kiểm tra thiết bị laptop
      const laptopDevices = devices.filter(d => d.type?.toLowerCase() === 'laptop');
      console.log('Laptop devices:', laptopDevices);
    } catch (error: any) {
      toast({ title: 'Lỗi', description: error.message, variant: 'destructive' });
    }
  };


  const handleApproveRequest = async (requestId: string) => {
    try {
      if (!selectedRequest) return;
      await updateDeviceRequest(requestId, { status: 'approved', notes: responseNotes });
      toast({ title: 'Phê duyệt thành công', description: 'Yêu cầu đã được phê duyệt.' });
      fetchRequests();
      closeDialog();
    } catch (error: any) {
      toast({ title: 'Lỗi', description: error.message, variant: 'destructive' });
    }
  };

  const handleRejectRequest = async (requestId: string) => {
    try {
      if (!selectedRequest) return;
      await updateDeviceRequest(requestId, { status: 'rejected', notes: responseNotes });
      toast({ title: 'Từ chối thành công', description: 'Yêu cầu đã bị từ chối.', variant: 'destructive' });
      fetchRequests();
      closeDialog();
    } catch (error: any) {
      toast({ title: 'Lỗi', description: error.message, variant: 'destructive' });
    }
  };

  const openResponseDialog = (request: DeviceRequest) => {
    setSelectedRequest(request);
    setResponseNotes(request.notes || '');
    setIsResponseDialogOpen(true);
  };

  const closeDialog = () => {
    setIsResponseDialogOpen(false);
    setSelectedRequest(null);
    setResponseNotes('');
  };

  const openAllocationDialog = (request: DeviceRequest) => {
    setSelectedRequest(request);
    setAllocationData({
      selectedDevices: [],
      deviceQuantities: {},
      allocationNotes: '',
    });
    setIsAllocationDialogOpen(true);
  };

  const closeAllocationDialog = () => {
    setIsAllocationDialogOpen(false);
    setSelectedRequest(null);
    setAllocationData({
      selectedDevices: [],
      deviceQuantities: {},
      allocationNotes: '',
    });
  };

  const handleAllocateDevices = async () => {
    try {
      if (!selectedRequest || !user) return;
      
      // Kiểm tra số lượng thiết bị được chọn
      const selectedCount = allocationData.selectedDevices.length;
      if (selectedCount !== selectedRequest.quantity) {
        toast({ 
          title: 'Lỗi', 
          description: `Số lượng thiết bị phải bằng ${selectedRequest.quantity}. Hiện tại: ${selectedCount}.`, 
          variant: 'destructive' 
        });
        return;
      }
      
      // Thông báo về thiết bị đã được gán (sẽ cập nhật phường mới)
      const selectedDevices = availableDevices.filter(d => allocationData.selectedDevices.includes(d.id));
      const alreadyAssignedDevices = selectedDevices.filter(d => d.assignedTo);
      
      if (alreadyAssignedDevices.length > 0) {
        const deviceNames = alreadyAssignedDevices.map(d => d.name).join(', ');
        toast({ 
          title: 'Thông báo', 
          description: `Các thiết bị sau đã được gán cho phường/xã khác: ${deviceNames}. Thiết bị sẽ được chuyển sang phường mới.`, 
          variant: 'default' 
        });
      }
      
      // Cập nhật thiết bị được cấp phát
      const ward = wardsMap[selectedRequest.wardId];
      if (!ward) {
        toast({ title: 'Lỗi', description: 'Không tìm thấy thông tin phường/xã.', variant: 'destructive' });
        return;
      }
      
      // Cập nhật thiết bị gốc với thông tin phường mới
      const allocatedDevicesWithQuantity: Array<{deviceId: string, quantity: number, deviceInfo: Device}> = [];
      
      // Import updateDoc và doc để cập nhật thiết bị gốc
      const { updateDoc, doc } = await import('firebase/firestore');
      
      // Xử lý từng thiết bị (mỗi thiết bị có số lượng mặc định là 1)
      for (const deviceId of allocationData.selectedDevices) {
        const originalDevice = availableDevices.find(d => d.id === deviceId);
        
        if (!originalDevice) continue;
        
        // Cập nhật thiết bị gốc với thông tin phường mới
        await updateDoc(doc(db, 'devices', deviceId), {
          wardId: selectedRequest.wardId,
          wardName: ward.name,
          assignedTo: selectedRequest.requestedBy,
          assignedToName: ward.contactPerson || ward.name,
          status: 'inactive', // Thiết bị sẽ ở trạng thái inactive cho đến khi ward nhận
          updatedAt: new Date(),
        });
        
        // Lưu thông tin thiết bị với số lượng mặc định là 1
        allocatedDevicesWithQuantity.push({
          deviceId: deviceId, // Sử dụng ID của thiết bị gốc
          quantity: 1, // Mỗi thiết bị có số lượng mặc định là 1
          deviceInfo: originalDevice
        });
      }
      
      // Cập nhật trạng thái yêu cầu thành 'delivering' (đang giao)
      await updateDeviceRequest(selectedRequest.id, { 
        status: 'delivering',
        notes: allocationData.allocationNotes,
        allocatedBy: user.displayName,
        allocatedAt: new Date(),
        deviceSerialNumbers: allocatedDevicesWithQuantity.map(item => item.deviceId), // Lưu ID thiết bị mới
        deviceQuantities: Object.fromEntries(
          allocatedDevicesWithQuantity.map(item => [item.deviceId, item.quantity])
        ), // Lưu số lượng cho từng thiết bị mới
        deliveredAt: new Date(),
      });
      
      toast({ 
        title: 'Cấp phát thành công', 
        description: `Đã cấp phát ${selectedRequest.quantity} thiết bị cho ${ward.name}` 
      });
      
      fetchRequests();
      fetchAvailableDevices(); // Refresh danh sách thiết bị có sẵn
      closeAllocationDialog();
    } catch (error: any) {
      toast({ title: 'Lỗi', description: error.message, variant: 'destructive' });
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

  const getAvailableDevicesByType = (deviceType: string) => {
    return availableDevices.filter(device => 
      device.type?.toLowerCase() === deviceType.toLowerCase()
    );
  };

  const getSelectableDevicesByType = (deviceType: string) => {
    return availableDevices.filter(device => {
      // Lọc theo loại thiết bị
      if (device.type?.toLowerCase() !== deviceType.toLowerCase()) {
        return false;
      }
      
      // Chỉ trả về thiết bị có thể chọn được (chưa được cấp xuống phường nào)
      // Thiết bị đã được cấp xuống phường sẽ có wardId và assignedTo
      const isAlreadyAllocated = device.wardId && device.assignedTo;
      return !isAlreadyAllocated;
    });
  };

  const getDeviceStatusText = (device: Device) => {
    if (device.assignedTo && device.wardName) {
      return `Đã gán cho ${device.wardName}`;
    } else if (device.assignedTo) {
      return `Đã gán cho ${device.assignedToName || 'Người dùng'}`;
    } else {
      return 'Chưa được gán';
    }
  };

  const getDeviceStatusColor = (device: Device) => {
    if (device.assignedTo) {
      return 'text-orange-600 bg-orange-50';
    } else {
      return 'text-green-600 bg-green-50';
    }
  };


  const toggleDeviceSelection = (deviceId: string) => {
    // Kiểm tra xem thiết bị có được cấp xuống phường nào không
    const device = availableDevices.find(d => d.id === deviceId);
    if (!device) return;
    
    // Thiết bị đã được cấp xuống phường sẽ có wardId và assignedTo
    const isAlreadyAllocated = device.wardId && device.assignedTo;
    if (isAlreadyAllocated) {
      // Không cho phép chọn thiết bị đã được cấp xuống phường
      return;
    }
    
    setAllocationData(prev => {
      const isSelected = prev.selectedDevices.includes(deviceId);
      if (isSelected) {
        // Bỏ chọn thiết bị và xóa số lượng
        const newQuantities = { ...prev.deviceQuantities };
        delete newQuantities[deviceId];
        return {
          ...prev,
          selectedDevices: prev.selectedDevices.filter(id => id !== deviceId),
          deviceQuantities: newQuantities
        };
      } else {
        // Chọn thiết bị và đặt số lượng mặc định là 1
        return {
          ...prev,
          selectedDevices: [...prev.selectedDevices, deviceId],
          deviceQuantities: {
            ...prev.deviceQuantities,
            [deviceId]: 1
          }
        };
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Yêu cầu cấp phát thiết bị</h1>
          <p className="text-muted-foreground">Xử lý các yêu cầu cấp phát thiết bị từ các phường/xã</p>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-6">
        <Card>
          <CardHeader className="flex justify-between pb-2">
            <CardTitle className="text-sm font-medium">Tổng yêu cầu</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
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
            <div className="text-2xl font-bold text-warning">
              {requests.filter(r => r.status === 'pending').length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex justify-between pb-2">
            <CardTitle className="text-sm font-medium">Đã duyệt</CardTitle>
            <CheckCircle className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">
              {requests.filter(r => r.status === 'approved').length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex justify-between pb-2">
            <CardTitle className="text-sm font-medium">Từ chối</CardTitle>
            <XCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {requests.filter(r => r.status === 'rejected').length}
            </div>
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
          <CardTitle>Danh sách yêu cầu</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Phường/Xã</TableHead>
                <TableHead>Loại thiết bị</TableHead>
                <TableHead>Số lượng</TableHead>
                <TableHead>Lý do</TableHead>
                <TableHead>Ngày yêu cầu</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead>Thao tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {requests.map(request => {
                const ward = wardsMap[request.wardId];
                return (
                  <TableRow key={request.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{ward?.name || 'Không xác định'}</p>
                        <p className="text-sm text-muted-foreground">{ward?.contactPerson || '-'}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{getDeviceTypeDisplayName(request.deviceType)}</Badge>
                    </TableCell>
                    <TableCell>{request.quantity}</TableCell>
                    <TableCell><p className="text-sm max-w-xs truncate">{request.reason}</p></TableCell>
                    <TableCell>{request.createdAt.toLocaleDateString('vi-VN')}</TableCell>
                    <TableCell>
                      <Badge variant={getStatusColor(request.status) as any}>{getStatusText(request.status)}</Badge>
                    </TableCell>
                    <TableCell>
                      {request.status === 'pending' ? (
                        <Button size="sm" variant="outline" onClick={() => openResponseDialog(request)}>Xử lý</Button>
                      ) : request.status === 'approved' ? (
                        <div className="flex space-x-2">
                          <Button size="sm" variant="default" onClick={() => openAllocationDialog(request)}>
                            <Package className="h-4 w-4 mr-1" />
                            Cấp phát
                          </Button>
                          <span className="text-sm text-muted-foreground">
                            {request.approvedAt && `Phản hồi: ${request.approvedAt.toLocaleDateString('vi-VN')}`}
                          </span>
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">
                          {request.approvedAt && `Phản hồi: ${request.approvedAt.toLocaleDateString('vi-VN')}`}
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Response Dialog */}
      <Dialog open={isResponseDialogOpen} onOpenChange={closeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Xử lý yêu cầu cấp phát</DialogTitle>
            <DialogDescription>
              {selectedRequest && (
                <>
                  Yêu cầu từ {wardsMap[selectedRequest.wardId]?.name || 'Không xác định'} - {selectedRequest.quantity} {getDeviceTypeDisplayName(selectedRequest.deviceType)}
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          {selectedRequest && (
            <div className="space-y-4 py-4">
              <div>
                <h4 className="font-medium mb-2">Chi tiết yêu cầu:</h4>
                <p className="text-sm text-muted-foreground">{selectedRequest.reason}</p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Ghi chú phản hồi:</label>
                <Textarea
                  value={responseNotes}
                  onChange={(e) => setResponseNotes(e.target.value)}
                  placeholder="Nhập ghi chú cho phản hồi..."
                  rows={3}
                />
              </div>
            </div>
          )}

          <DialogFooter className="space-x-2">
            <Button variant="outline" onClick={closeDialog}>Hủy</Button>
            <Button variant="destructive" onClick={() => selectedRequest && handleRejectRequest(selectedRequest.id)}>Từ chối</Button>
            <Button onClick={() => selectedRequest && handleApproveRequest(selectedRequest.id)}>Phê duyệt</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Allocation Dialog */}
      <Dialog open={isAllocationDialogOpen} onOpenChange={closeAllocationDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Cấp phát thiết bị</DialogTitle>
            <DialogDescription>
              {selectedRequest && (
                <>
                  Cấp phát {selectedRequest.quantity} {getDeviceTypeDisplayName(selectedRequest.deviceType)} cho {wardsMap[selectedRequest.wardId]?.name || 'Không xác định'}
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          {selectedRequest && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Phường/Xã:</Label>
                  <p className="text-sm text-muted-foreground">{wardsMap[selectedRequest.wardId]?.name || 'Không xác định'}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Loại thiết bị:</Label>
                  <p className="text-sm text-muted-foreground">{getDeviceTypeDisplayName(selectedRequest.deviceType)}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Số lượng:</Label>
                  <p className="text-sm text-muted-foreground">{selectedRequest.quantity}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Lý do yêu cầu:</Label>
                  <p className="text-sm text-muted-foreground">{selectedRequest.reason}</p>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">Người cấp phát:</Label>
                <p className="text-sm text-muted-foreground">{user?.displayName || 'Không xác định'}</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="allocationNotes">Ghi chú cấp phát:</Label>
                <Textarea
                  id="allocationNotes"
                  value={allocationData.allocationNotes}
                  onChange={(e) => setAllocationData({...allocationData, allocationNotes: e.target.value})}
                  placeholder="Nhập ghi chú về việc cấp phát thiết bị..."
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">
                  Chọn thiết bị để cấp phát (Tổng: {allocationData.selectedDevices.length}/{selectedRequest.quantity}):
                </Label>
                <div className="text-xs text-muted-foreground mb-2">
                  Có thể chọn: {getSelectableDevicesByType(selectedRequest.deviceType).length} thiết bị
                  {getAvailableDevicesByType(selectedRequest.deviceType).length > getSelectableDevicesByType(selectedRequest.deviceType).length && (
                    <span className="text-orange-600 ml-2">
                      ({getAvailableDevicesByType(selectedRequest.deviceType).length - getSelectableDevicesByType(selectedRequest.deviceType).length} thiết bị đã được cấp xuống phường)
                    </span>
                  )}
                </div>
                <div className="max-h-60 overflow-y-auto border rounded-md p-3 space-y-2">
                  {getAvailableDevicesByType(selectedRequest.deviceType).length === 0 ? (
                    <div className="text-center py-4">
                      <p className="text-sm text-muted-foreground mb-2">
                        Không có thiết bị {getDeviceTypeDisplayName(selectedRequest.deviceType)} nào có sẵn trong kho
                      </p>
                      <p className="text-xs text-gray-500">
                        Debug: Tổng thiết bị: {availableDevices.length}, 
                        Thiết bị {selectedRequest.deviceType}: {availableDevices.filter(d => d.type?.toLowerCase() === selectedRequest.deviceType.toLowerCase()).length}
                      </p>
                    </div>
                  ) : (
                    <>
                      {/* Hiển thị thiết bị có thể chọn */}
                      {getSelectableDevicesByType(selectedRequest.deviceType).map(device => {
                      // Thiết bị đã được cấp xuống phường sẽ có wardId và assignedTo
                      const isAlreadyAllocated = !!(device.wardId && device.assignedTo);
                      const isDisabled = isAlreadyAllocated;
                      
                      return (
                        <div
                          key={device.id}
                          className={`flex items-center space-x-3 p-2 rounded-md transition-colors ${
                            isDisabled 
                              ? 'bg-gray-100 cursor-not-allowed opacity-60'
                              : allocationData.selectedDevices.includes(device.id)
                                ? 'bg-blue-50 border border-blue-200 cursor-pointer'
                                : 'bg-gray-50 hover:bg-gray-100 cursor-pointer'
                          }`}
                          onClick={() => !isDisabled && toggleDeviceSelection(device.id)}
                        >
                          <input
                            type="checkbox"
                            checked={allocationData.selectedDevices.includes(device.id)}
                            onChange={() => !isDisabled && toggleDeviceSelection(device.id)}
                            disabled={isDisabled}
                            className="rounded"
                          />
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <p className={`text-sm font-medium ${isDisabled ? 'text-gray-500' : ''}`}>{device.name}</p>
                              <span className={`text-xs px-2 py-1 rounded-full ${getDeviceStatusColor(device)}`}>
                                {getDeviceStatusText(device)}
                              </span>
                            </div>
                            <p className={`text-xs ${isDisabled ? 'text-gray-400' : 'text-muted-foreground'}`}>
                              {device.specifications?.brand && `${device.specifications.brand} `}
                              {device.specifications?.model && `${device.specifications.model} `}
                              {device.specifications?.serialNumber && `SN: ${device.specifications.serialNumber}`}
                            </p>
                            {device.assignedTo && (
                              <p className="text-xs text-orange-600 mt-1">
                                {isAlreadyAllocated 
                                  ? '⚠️ Thiết bị này đã được cấp xuống phường/xã'
                                  : `Đã gán cho ${device.wardName || device.assignedToName || device.assignedTo}`
                                }
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                      
                      {/* Hiển thị thiết bị không thể chọn (đã được cấp xuống phường) */}
                      {getAvailableDevicesByType(selectedRequest.deviceType)
                        .filter(device => {
                          // Thiết bị đã được cấp xuống phường sẽ có wardId và assignedTo
                          const isAlreadyAllocated = !!(device.wardId && device.assignedTo);
                          return isAlreadyAllocated;
                        })
                        .map(device => {
                          // Thiết bị đã được cấp xuống phường sẽ có wardId và assignedTo
                          const isAlreadyAllocated = !!(device.wardId && device.assignedTo);
                          
                          return (
                            <div
                              key={device.id}
                              className="flex items-center space-x-3 p-2 rounded-md bg-gray-100 cursor-not-allowed opacity-60"
                            >
                              <input
                                type="checkbox"
                                checked={false}
                                disabled={true}
                                className="rounded"
                              />
                              <div className="flex-1">
                                <div className="flex items-center justify-between">
                                  <p className="text-sm font-medium text-gray-500">{device.name}</p>
                                  <span className={`text-xs px-2 py-1 rounded-full ${getDeviceStatusColor(device)}`}>
                                    {getDeviceStatusText(device)}
                                  </span>
                                </div>
                                <p className="text-xs text-gray-400">
                                  {device.specifications?.brand && `${device.specifications.brand} `}
                                  {device.specifications?.model && `${device.specifications.model} `}
                                  {device.specifications?.serialNumber && `SN: ${device.specifications.serialNumber}`}
                                </p>
                                <p className="text-xs text-orange-600 mt-1">
                                  ⚠️ Thiết bị này đã được cấp xuống phường/xã
                                </p>
                              </div>
                            </div>
                          );
                        })}
                    </>
                  )}
                </div>
                {allocationData.selectedDevices.length > 0 && (
                  <div className="text-xs text-muted-foreground space-y-1">
                    <div>Đã chọn: {allocationData.selectedDevices.length} thiết bị</div>
                    <div className="font-medium">
                      Tổng số lượng: {allocationData.selectedDevices.length}/{selectedRequest?.quantity || 0}
                      {allocationData.selectedDevices.length === selectedRequest?.quantity && (
                        <span className="text-green-600 ml-2">✓ Đủ số lượng</span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          <DialogFooter className="space-x-2">
            <Button variant="outline" onClick={closeAllocationDialog}>Hủy</Button>
            <Button 
              onClick={handleAllocateDevices}
              disabled={allocationData.selectedDevices.length !== selectedRequest?.quantity}
            >
              <Package className="h-4 w-4 mr-2" />
              Xác nhận cấp phát
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RequestsPage;
