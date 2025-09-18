import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Monitor, Users, Package, Settings, Loader2, List, Grid } from 'lucide-react'; // ✅ thêm List, Grid
import { useAuth } from '@/contexts/AuthContext';
import { getDevices, updateDevice, getDeviceStats, type Device } from '@/lib/services/deviceService';
import { getWardUsers, type WardUser } from '@/lib/services/wardService';
import { useToast } from '@/hooks/use-toast';
import { getDeviceRequests, type DeviceRequest } from '@/lib/services/deviceRequestService';

const WardDevicesPage = () => {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();

  const [devices, setDevices] = useState<Device[]>([]);
  const [wardUsers, setWardUsers] = useState<WardUser[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [assignableUsers, setAssignableUsers] = useState<WardUser[]>([]);
  const [receivedRequests, setReceivedRequests] = useState<DeviceRequest[]>([]);

  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState('');

  // ✅ thêm state viewMode
  const [viewMode, setViewMode] = useState<'list' | 'card'>('list');

  // --- Fetch dữ liệu ---
  useEffect(() => {
    if (authLoading || !user?.wardId) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        const [devicesData, wardUsersData, statsData, requestsData] = await Promise.all([
          getDevices(user.wardId),
          getWardUsers(user.wardId),
          getDeviceStats(user.wardId),
          getDeviceRequests(user.wardId),
        ]);

        setDevices(devicesData);
        setWardUsers(wardUsersData);
        setStats(statsData);
        // Lọc chỉ người dùng có role 'user' và đang hoạt động
        const activeUsers = wardUsersData.filter(u => u.role === 'user' && u.isActive);
        setAssignableUsers(activeUsers);
        
        // Lọc chỉ các yêu cầu đã nhận
        const received = requestsData.filter(r => r.status === 'received');
        setReceivedRequests(received);

      } catch (error: any) {
        toast({
          title: "Lỗi tải dữ liệu",
          description: error.message || "Không thể tải dữ liệu",
          variant: "destructive",
        });
        console.error("Fetch error:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [authLoading, user?.wardId, toast]);

  // --- Helpers ---
  const getDeviceTypeDisplayName = (device: Device) => {
    switch (device.type) {
      case 'pc': return 'Máy tính để bàn';
      case 'laptop': return 'Laptop';
      case 'camera': return 'Camera';
      case 'router': return 'Router';
      case 'sensor': return 'Cảm biến';
      case 'printer': return 'Máy in';
      case 'monitor': return 'Màn hình';
      case 'server': return 'Server';
      case 'switch': return 'Switch';
      case 'ups': return 'UPS';
      case 'ip_phone': return 'Điện thoại IP';
      case 'other': return 'Thiết bị khác';
      default: return device.type;
    }
  };

  const getStatusDisplayName = (status: string) => {
    switch (status) {
      case 'active': return 'Hoạt động';
      case 'inactive': return 'Không hoạt động';
      case 'maintenance': return 'Bảo trì';
      case 'error': return 'Lỗi';
      default: return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'inactive': return 'bg-gray-100 text-gray-800';
      case 'maintenance': return 'bg-yellow-100 text-yellow-800';
      case 'error': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // --- Filter devices ---
  // Chỉ hiển thị thiết bị từ các yêu cầu đã nhận
  const receivedDeviceIds = new Set<string>();
  receivedRequests.forEach(request => {
    if (request.deviceSerialNumbers) {
      request.deviceSerialNumbers.forEach(deviceId => {
        receivedDeviceIds.add(deviceId);
      });
    }
  });
  
  const receivedDevices = devices.filter(d => receivedDeviceIds.has(d.id));
  
  // Phân biệt thiết bị có sẵn và đang sử dụng
  // Thiết bị có sẵn: chưa gán cho người dùng cụ thể (assignedTo là null, undefined hoặc tên phường)
  // Thiết bị đang sử dụng: đã gán cho người dùng cụ thể (assignedTo là ID người dùng)
  const availableDevices = receivedDevices.filter(d => {
    // Nếu assignedTo là null, undefined hoặc rỗng thì coi như chưa gán
    if (!d.assignedTo || d.assignedTo === '') return true;
    
    // Kiểm tra xem assignedTo có phải là ID người dùng không (không phải tên phường)
    const isUserId = assignableUsers.some(user => user.userId === d.assignedTo);
    return !isUserId; // Nếu không phải ID người dùng thì coi như chưa gán cho người dùng cụ thể
  });
  
  const inUseDevices = receivedDevices.filter(d => {
    // Nếu assignedTo là null, undefined hoặc rỗng thì coi như chưa gán
    if (!d.assignedTo || d.assignedTo === '') return false;
    
    // Kiểm tra xem assignedTo có phải là ID người dùng không
    const isUserId = assignableUsers.some(user => user.userId === d.assignedTo);
    return isUserId; // Chỉ coi là đang sử dụng nếu đã gán cho người dùng cụ thể
  });

  // --- Group devices by name and status for display ---
  const groupDevicesByType = (deviceList: Device[]) => {
    // Tính số lượng thực tế dựa trên trạng thái gán của từng thiết bị
    const deviceTypeCounts: Record<string, number> = {};
    
    deviceList.forEach(device => {
      const key = `${device.name}-${device.type}`;
      deviceTypeCounts[key] = (deviceTypeCounts[key] || 0) + 1;
    });
    
    // Tạo danh sách thiết bị đã nhóm với số lượng thực tế
    const grouped: Record<string, { device: Device, count: number }> = {};
    
    deviceList.forEach(device => {
      const key = `${device.name}-${device.type}`;
      
      if (!grouped[key]) {
        grouped[key] = { 
          device, 
          count: deviceTypeCounts[key]
        };
      }
    });
    
    return Object.values(grouped);
  };

  // Đảm bảo tất cả thiết bị có sẵn đều ở trạng thái active
  const ensureAvailableDevicesActive = async () => {
    const inactiveAvailableDevices = availableDevices.filter(d => d.status !== 'active');
    if (inactiveAvailableDevices.length > 0) {
      try {
        await Promise.all(
          inactiveAvailableDevices.map(device => 
            updateDevice(device.id, { status: 'active' })
          )
        );
        // Cập nhật state local
        setDevices(devices.map(d => 
          inactiveAvailableDevices.some(inactive => inactive.id === d.id)
            ? { ...d, status: 'active' }
            : d
        ));
      } catch (error) {
        console.error('Error updating device status:', error);
      }
    }
  };

  // Gọi hàm này khi component mount hoặc khi availableDevices thay đổi
  useEffect(() => {
    if (availableDevices.length > 0) {
      ensureAvailableDevicesActive();
    }
  }, [availableDevices.length]);

  const groupedAvailableDevices = groupDevicesByType(availableDevices);
  const groupedInUseDevices = groupDevicesByType(inUseDevices);

  // --- Assign dialog ---
  const openAssignDialog = (device: Device) => {
    setSelectedDevice(device);
    setIsAssignDialogOpen(true);
  };

  const handleAssignDevice = async () => {
    if (!selectedDevice || !selectedUser) return;
    try {
      const assignedUser = assignableUsers.find(u => u.userId === selectedUser);
      await updateDevice(selectedDevice.id, {
        status: 'active',
        assignedTo: selectedUser,
        assignedToName: assignedUser?.userName || ''
      });

      setDevices(devices.map(d =>
        d.id === selectedDevice.id
          ? { ...d, status: 'active', assignedTo: selectedUser, assignedToName: assignedUser?.userName || '' }
          : d
      ));

      toast({
        title: "Gán thiết bị thành công",
        description: `Thiết bị "${selectedDevice.name}" đã được gán cho ${assignedUser?.userName}.`,
      });

      setIsAssignDialogOpen(false);
      setSelectedDevice(null);
      setSelectedUser('');
    } catch (error: any) {
      toast({
        title: "Lỗi gán thiết bị",
        description: error.message || "Không thể gán thiết bị",
        variant: "destructive"
      });
    }
  };

  const handleReturnDevice = async (deviceId: string) => {
    try {
      await updateDevice(deviceId, { 
        status: 'active', // Thiết bị có sẵn luôn ở trạng thái active
        assignedTo: null, 
        assignedToName: null 
      });
      setDevices(devices.map(d =>
        d.id === deviceId ? { 
          ...d, 
          status: 'active', // Thiết bị có sẵn luôn ở trạng thái active
          assignedTo: null, 
          assignedToName: null 
        } : d
      ));
      toast({
        title: "Thu hồi thiết bị thành công",
        description: "Thiết bị đã sẵn sàng gán cho người khác.",
      });
    } catch (error: any) {
      toast({
        title: "Lỗi thu hồi thiết bị",
        description: error.message || "Không thể thu hồi thiết bị",
        variant: "destructive"
      });
    }
  };

  if (!user) return <p>Đang tải thông tin người dùng...</p>;
  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="text-center">
        <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
        <p className="text-muted-foreground">Đang tải dữ liệu...</p>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Thiết bị phường</h1>
        <p className="text-muted-foreground">Quản lý thiết bị được cấp cho phường</p>
      </div>
      <div className="flex gap-2">
        <Button
          variant={viewMode === "list" ? "default" : "outline"}
          onClick={() => setViewMode("list")}
        >
          <List className="mr-2 h-4 w-4" /> Danh sách
        </Button>
        <Button
          variant={viewMode === "card" ? "default" : "outline"}
          onClick={() => setViewMode("card")}
        >
          <Grid className="mr-2 h-4 w-4" /> Thẻ
        </Button>
      </div>

      {/* View */}
      {viewMode === "list" ? (
        <Card>
          <CardHeader>
            <CardTitle>Danh sách thiết bị ({receivedDevices.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tên</TableHead>
                  <TableHead>Loại</TableHead>
                  <TableHead>Người dùng</TableHead>
                  <TableHead>Trạng thái</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {receivedDevices.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell>{d.name}</TableCell>
                    <TableCell>{getDeviceTypeDisplayName(d)}</TableCell>
                    <TableCell>{d.assignedToName || "Chưa gán"}</TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(d.status)}>
                        {d.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                    <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm">Chi tiết</Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                      <DialogHeader>
                        <DialogTitle>Thông tin thiết bị</DialogTitle>
                      </DialogHeader>

                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p><strong>Tên:</strong> {d.name}</p>
                          <p><strong>Loại:</strong> {getDeviceTypeDisplayName(d) || "Không rõ"}</p>
                          <p><strong>Trạng thái:</strong> {d.status}</p>
                          <p><strong>Vị trí:</strong> {d.location}</p>
                          <p><strong>Phường:</strong> {d.wardName}</p>
                        </div>
                        <div>
                          <p><strong>Nhà cung cấp:</strong> {d.vendor || "Chưa có"}</p>
                          <p><strong>Người dùng:</strong> {d.assignedToName || "Chưa gán"}</p>
                          <p><strong>Ngày lắp đặt:</strong> {d.installationDate?.toLocaleDateString()}</p>
                          {d.lastMaintenance && (
                            <p><strong>Bảo trì lần cuối:</strong> {d.lastMaintenance.toLocaleDateString()}</p>
                          )}
                          {d.nextMaintenance && (
                            <p><strong>Bảo trì kế tiếp:</strong> {d.nextMaintenance.toLocaleDateString()}</p>
                          )}
                        </div>
                      </div>

                      {d.specifications && (
                        <div className="mt-4">
                          <h3 className="font-semibold">Thông số kỹ thuật</h3>
                          <ul className="list-disc list-inside text-sm">
                            {d.specifications.brand && <li><strong>Hãng:</strong> {d.specifications.brand}</li>}
                            {d.specifications.model && <li><strong>Model:</strong> {d.specifications.model}</li>}
                            {d.specifications.serialNumber && <li><strong>Serial:</strong> {d.specifications.serialNumber}</li>}
                            {d.specifications.ipAddress && <li><strong>IP:</strong> {d.specifications.ipAddress}</li>}
                            {d.specifications.macAddress && <li><strong>MAC:</strong> {d.specifications.macAddress}</li>}
                            {d.specifications.cpu && <li><strong>CPU:</strong> {d.specifications.cpu}</li>}
                            {d.specifications.ram && <li><strong>RAM:</strong> {d.specifications.ram}</li>}
                            {d.specifications.storage && <li><strong>Ổ cứng:</strong> {d.specifications.storage}</li>}
                            {d.specifications.os && <li><strong>Hệ điều hành:</strong> {d.specifications.os}</li>}
                          </ul>
                        </div>
                      )}

                      {d.description && (
                        <div className="mt-4">
                          <h3 className="font-semibold">Mô tả</h3>
                          <p className="text-sm text-gray-600">{d.description}</p>
                        </div>
                      )}

                      {d.images && d.images.length > 0 && (
                        <div className="mt-4">
                          <h3 className="font-semibold">Hình ảnh</h3>
                          <div className="flex gap-2 flex-wrap">
                            {d.images.map((url, i) => (
                              <img
                                key={i}
                                src={url}
                                alt={`Device ${i}`}
                                className="w-32 h-32 object-cover rounded-md border"
                              />
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="mt-4 text-xs text-gray-500">
                        <p><strong>Tạo lúc:</strong> {d.createdAt.toLocaleString()}</p>
                        <p><strong>Cập nhật lúc:</strong> {d.updatedAt.toLocaleString()}</p>
                      </div>
                    </DialogContent>
                  </Dialog>
                  </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {receivedDevices.map((d) => (
            <Card key={d.id}>
              <CardHeader>
                <CardTitle className="flex justify-between">
                  {d.name}
                  <Badge className={getStatusColor(d.status)}>{d.status}</Badge>
                </CardTitle>
                <CardDescription>{getDeviceTypeDisplayName(d)}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <p>
                  <span className="font-medium">Người dùng: </span>
                  {d.assignedToName || "Chưa gán"}
                </p>
                {d.specifications?.ipAddress && <p>IP: {d.specifications.ipAddress}</p>}

                {/* Nút thao tác */}
                {d.assignedTo ? (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={async () => {
                      if (confirm("Bạn có chắc muốn thu hồi thiết bị này?")) {
                        await updateDevice(d.id, { 
                          status: 'active', // Thiết bị có sẵn luôn ở trạng thái active
                          assignedTo: null, 
                          assignedToName: null 
                        });
                        setDevices(prev =>
                          prev.map(dev =>
                            dev.id === d.id ? { 
                              ...dev, 
                              status: 'active', // Thiết bị có sẵn luôn ở trạng thái active
                              assignedTo: null, 
                              assignedToName: null 
                            } : dev
                          )
                        );
                      }
                    }}
                  >
                    Thu hồi
                  </Button>
                ) : (
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button size="sm">Gán</Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Chọn người dùng để gán</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-2">
                        {assignableUsers.map(user => (
                          <Button
                            key={user.userId}
                            variant="outline"
                            className="w-full justify-start"
                            onClick={async () => {
                              await updateDevice(d.id, {
                                assignedTo: user.userId,
                                assignedToName: user.userName,
                              });
                              setDevices(prev =>
                                prev.map(dev =>
                                  dev.id === d.id
                                    ? { ...dev, assignedTo: user.userId, assignedToName: user.userName }
                                    : dev
                                )
                              );
                            }}
                          >
                            <div className="text-left">
                              <p className="font-medium">{user.userName}</p>
                              <p className="text-xs text-muted-foreground">{user.userEmail}</p>
                            </div>
                          </Button>
                        ))}
                      </div>
                    </DialogContent>
                  </Dialog>
                  
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Thống kê */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Tổng thiết bị</CardTitle>
            <Monitor className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{receivedDevices.length}</div>
            <p className="text-xs text-muted-foreground">Thiết bị được cấp</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Hoạt động</CardTitle>
            <Package className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">{receivedDevices.filter(d => d.status === 'active').length}</div>
            <p className="text-xs text-muted-foreground">Đang hoạt động</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Cần bảo trì</CardTitle>
            <Settings className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning">
              {receivedDevices.filter(d => d.status === 'maintenance').length}
            </div>
            <p className="text-xs text-muted-foreground">Cần xử lý</p>
          </CardContent>
        </Card>
      </div>

      {/* Thiết bị có sẵn */}
      <Card>
        <CardHeader>
          <CardTitle>Thiết bị có sẵn ({availableDevices.length})</CardTitle>
          <CardDescription>Chưa gán cho người dùng</CardDescription>
        </CardHeader>
        <CardContent>
          {availableDevices.length === 0 ? (
            <p className="text-center text-muted-foreground py-6">Chưa có dữ liệu thiết bị sẵn</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tên</TableHead>
                  <TableHead>Loại</TableHead>
                  <TableHead>Thông số</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead>Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {availableDevices.map((device, index) => (
                  <TableRow key={`${device.id}-${index}`}>
                    <TableCell>
                      {device.name}
                    </TableCell>
                    <TableCell>{getDeviceTypeDisplayName(device)}</TableCell>
                    <TableCell>
                      {device.specifications?.ipAddress && <p>IP: {device.specifications.ipAddress}</p>}
                      {device.specifications?.serialNumber && <p>S/N: {device.specifications.serialNumber}</p>}
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(device.status)}>
                        {getStatusDisplayName(device.status)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button size="sm" onClick={() => openAssignDialog(device)}>Gán người dùng</Button>
                    </TableCell>
                    
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Thiết bị đang sử dụng */}
      <Card>
        <CardHeader>
          <CardTitle>Thiết bị đang sử dụng ({inUseDevices.length})</CardTitle>
          <CardDescription>Đã gán cho người dùng</CardDescription>
        </CardHeader>
        <CardContent>
          {inUseDevices.length === 0 ? (
            <p className="text-center text-muted-foreground py-6">Chưa có dữ liệu</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tên</TableHead>
                  <TableHead>Loại</TableHead>
                  <TableHead>Người dùng</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead>Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {inUseDevices.map((device, index) => {
                  const assignedUser = assignableUsers.find(u => u.userId === device.assignedTo);
                  return (
                    <TableRow key={`${device.id}-${index}`}>
                      <TableCell>
                        {device.name}
                      </TableCell>
                      <TableCell><Badge variant="outline">{getDeviceTypeDisplayName(device)}</Badge></TableCell>
                      <TableCell>{device.assignedToName || assignedUser?.userName || 'Chưa gán'}</TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(device.status)}>
                          {getStatusDisplayName(device.status)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button variant="outline" size="sm" onClick={() => handleReturnDevice(device.id)}>Thu hồi</Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Dialog gán thiết bị */}
      <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Gán thiết bị cho người dùng</DialogTitle>
            <DialogDescription>
              {selectedDevice && `Gán thiết bị "${selectedDevice.name}" cho người dùng`}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <label className="text-sm font-medium">Chọn người dùng:</label>
            <Select value={selectedUser} onValueChange={setSelectedUser}>
              <SelectTrigger>
                <SelectValue placeholder="Chọn người dùng" />
              </SelectTrigger>
              <SelectContent>
                {assignableUsers.map(u => (
                  <SelectItem key={u.userId} value={u.userId}>
                    <div>
                      <p className="font-medium">{u.userName}</p>
                      <p className="text-sm text-muted-foreground">{u.userEmail}</p>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAssignDialogOpen(false)}>Hủy</Button>
            <Button onClick={handleAssignDevice} disabled={!selectedUser}>Gán thiết bị</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default WardDevicesPage;
