import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Monitor, Package, Settings, Loader2, List, Grid, Plus } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { getDevices, updateDevice, getDeviceStats, createDevice, type Device } from '@/lib/services/deviceService';
import { getWardUsers, getWards, type WardUser, type Ward } from '@/lib/services/wardService';
import { useToast } from '@/hooks/use-toast';
import { getDeviceRequests, type DeviceRequest } from '@/lib/services/deviceRequestService';
import { FIELD_META, getFieldsForType, getCpuOptionsByType, getGpuOptionsByType } from '@/components/SpecEditor';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SpecEditor } from '@/components/SpecEditor';

const WardDevicesPage = () => {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();

  const [devices, setDevices] = useState<Device[]>([]);
  const [wardUsers, setWardUsers] = useState<WardUser[]>([]);
  const [wards, setWards] = useState<Ward[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [assignableUsers, setAssignableUsers] = useState<WardUser[]>([]);
  const [receivedRequests, setReceivedRequests] = useState<DeviceRequest[]>([]);
  const [originTab, setOriginTab] = useState<'all' | 'received' | 'ward'>('all');

  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState('');

  const [viewMode, setViewMode] = useState<'list' | 'card'>('list');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

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

  const [newDevice, setNewDevice] = useState<{
    name: string;
    type?: string;
    location: string;
    specifications: Record<string, string>;
    installationDate: Date;
  }>({
    name: '',
    type: 'camera',
    location: '',
    specifications: {
      brand: '',
      model: '',
      serialNumber: '',
      ipAddress: '',
      macAddress: '',
      cpu: '',
      ram: '',
      storage: '',
      os: '',
    },
    installationDate: new Date(),
  });
  const [addQuantity, setAddQuantity] = useState(1);

  const handleAddWardDevice = async () => {
    if (!user?.wardId) return;
    try {
      const quantity = Math.max(1, Number(addQuantity) || 1);
      await Promise.all(
        Array.from({ length: quantity }).map((_, i) => {
          const nameWithIndex = quantity > 1 ? `${newDevice.name} #${i + 1}` : newDevice.name;
          const payload = {
            name: nameWithIndex,
            type: newDevice.type,
            location: newDevice.location,
            wardId: user.wardId,
            wardName: user.wardName || '',
            specifications: newDevice.specifications,
            installationDate: newDevice.installationDate,
            origin: 'ward' as const,
          };
          return createDevice(payload, user.id);
        })
      );
      const refreshed = await getDevices(user.wardId);
      setDevices(refreshed);
      setIsAddDialogOpen(false);
      setNewDevice({
        name: '', type: 'camera', location: '',
        specifications: { brand: '', model: '', serialNumber: '', ipAddress: '', macAddress: '', cpu: '', ram: '', storage: '', os: '' },
        installationDate: new Date(),
      });
      setAddQuantity(1);
      toast({ title: 'Thêm thiết bị thành công', description: 'Thiết bị sẵn có đã được thêm.' });
    } catch (error: any) {
      toast({ title: 'Lỗi', description: error.message || 'Không thể thêm thiết bị', variant: 'destructive' });
    }
  };

  // Fetch data
  useEffect(() => {
    if (authLoading || !user?.wardId) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        const [devicesData, wardUsersData, statsData, requestsData, wardsData] = await Promise.all([
          getDevices(user.wardId),
          getWardUsers(user.wardId),
          getDeviceStats(user.wardId),
          getDeviceRequests(user.wardId),
          getWards(),
        ]);

        setDevices(devicesData);
        setWardUsers(wardUsersData);
        setStats(statsData);
        setWards(wardsData);

        // chỉ user đang hoạt động
        const activeUsers = wardUsersData.filter(u => u.role === 'user' && u.isActive);
        setAssignableUsers(activeUsers);

        // các yêu cầu đã nhận
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

  const wardNameMap = React.useMemo(() => {
    return Object.fromEntries(wards.map(w => [w.id, w.name]));
  }, [wards]);

  const userMap = React.useMemo<Record<string, WardUser>>(
    () =>
      wardUsers.reduce((acc, u) => {
        acc[u.userId] = u;
        return acc;
      }, {} as Record<string, WardUser>),
    [wardUsers]
  );

  // Helpers
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

  // Filter devices
  const receivedDeviceIds = new Set<string>();
  receivedRequests.forEach(request => {
    if (request.deviceSerialNumbers) {
      request.deviceSerialNumbers.forEach(deviceId => {
        receivedDeviceIds.add(deviceId);
      });
    }
  });

  const receivedDevices = devices.filter(d => receivedDeviceIds.has(d.id) || d.origin === 'center');
  const wardOwnedDevices = devices.filter(d => d.origin === 'ward');
  const devicesByOrigin = originTab === 'received' ? receivedDevices : originTab === 'ward' ? wardOwnedDevices : devices;
  const sourceDevices = devicesByOrigin;

  const availableDevices = sourceDevices.filter(d => {
    if (!d.assignedTo || d.assignedTo === '') return true;
    const isUserId = assignableUsers.some(u => u.userId === d.assignedTo);
    return !isUserId;
  });

  const inUseDevices = sourceDevices.filter(d => {
    if (!d.assignedTo || d.assignedTo === '') return false;
    const isUserId = assignableUsers.some(u => u.userId === d.assignedTo);
    return isUserId;
  });

  const ensureAvailableDevicesActive = async () => {
    const inactiveAvailableDevices = availableDevices.filter(d => d.status !== 'active');
    if (inactiveAvailableDevices.length > 0) {
      try {
        await Promise.all(
          inactiveAvailableDevices.map(device =>
            updateDevice(device.id, { status: 'active' })
          )
        );
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

  useEffect(() => {
    if (availableDevices.length > 0) {
      ensureAvailableDevicesActive();
    }
  }, [availableDevices.length]); // eslint-disable-line react-hooks/exhaustive-deps

  // Assign dialog
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
        assignedToName: assignedUser?.userName || '',
        // ⭐ Lưu thêm thông tin phòng:
        assignedRoomId: assignedUser?.roomId || '',
        assignedRoomName: assignedUser?.roomName || ''
      });

      setDevices(devices.map(d =>
        d.id === selectedDevice.id
          ? {
              ...d,
              status: 'active',
              assignedTo: selectedUser,
              assignedToName: assignedUser?.userName || '',
              assignedRoomId: assignedUser?.roomId || '',
              assignedRoomName: assignedUser?.roomName || ''
            }
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
        status: 'active',
        assignedTo: null,
        assignedToName: null,
        // ⭐ Xoá thông tin phòng khi thu hồi:
        assignedRoomId: null,
        assignedRoomName: null
      });
      setDevices(devices.map(d =>
        d.id === deviceId
          ? {
              ...d,
              status: 'active',
              assignedTo: null,
              assignedToName: null,
              assignedRoomId: null,
              assignedRoomName: null
            }
          : d
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

        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="ml-auto"><Plus className="mr-2 h-4 w-4" /> Thêm thiết bị sẵn có</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Thêm thiết bị sẵn có</DialogTitle>
              <DialogDescription>Nhập thông tin thiết bị thuộc sở hữu của phường</DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Tên thiết bị</Label>
                <Input id="name" value={newDevice.name} onChange={(e) => setNewDevice({ ...newDevice, name: e.target.value })} />
              </div>
              <div className="space-y-2 col-span-2">
                <Label htmlFor="type">Loại thiết bị</Label>
                <Select value={newDevice.type} onValueChange={(v) => setNewDevice({ ...newDevice, type: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Chọn loại thiết bị" />
                  </SelectTrigger>
                  <SelectContent>
                    {DEVICE_TYPES.map(t => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="quantity">Số lượng</Label>
                <Input id="quantity" type="number" min={1} value={addQuantity} onChange={(e) => setAddQuantity(parseInt(e.target.value || '1') || 1)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="location">Vị trí</Label>
                <Input id="location" value={newDevice.location} onChange={(e) => setNewDevice({ ...newDevice, location: e.target.value })} />
              </div>

              {newDevice.type && (
                <div className="col-span-2">
                  <SpecEditor
                    type={newDevice.type}
                    specifications={newDevice.specifications as any}
                    onChange={(next) => setNewDevice({ ...newDevice, specifications: next })}
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="installationDate">Ngày lắp đặt</Label>
                <Input id="installationDate" type="date" value={newDevice.installationDate.toISOString().split('T')[0]} onChange={(e) => setNewDevice({ ...newDevice, installationDate: new Date(e.target.value) })} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Hủy</Button>
              <Button onClick={handleAddWardDevice}>Thêm thiết bị</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* LIST MODE */}
      {viewMode === "list" ? (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Danh sách thiết bị ({devicesByOrigin.length})</CardTitle>
              <Tabs value={originTab} onValueChange={(v) => setOriginTab(v as any)}>
                <TabsList>
                  <TabsTrigger value="all">Tất cả</TabsTrigger>
                  <TabsTrigger value="received">Đã nhận</TabsTrigger>
                  <TabsTrigger value="ward">Sẵn có</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tên</TableHead>
                  <TableHead>Loại</TableHead>
                  <TableHead>Nguồn</TableHead>
                  <TableHead>Người dùng</TableHead>
                  <TableHead>Phòng</TableHead> {/* ⭐ mới */}
                  <TableHead>Trạng thái</TableHead>
                  <TableHead>Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {devicesByOrigin.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell>{d.name}</TableCell>
                    <TableCell>{getDeviceTypeDisplayName(d)}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{d.origin === 'ward' ? 'Sẵn có' : 'Đã nhận'}</Badge>
                    </TableCell>
                    <TableCell>{d.assignedToName || "Chưa gán"}</TableCell>
                    <TableCell>{d.assignedRoomName || userMap[d.assignedTo ?? ""]?.roomName || "—"}</TableCell> {/* ⭐ mới */}
                    <TableCell>
                      <Badge className={getStatusColor(d.status)}>
                        {getStatusDisplayName(d.status)}
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
                              <p><strong>Trạng thái:</strong> {getStatusDisplayName(d.status)}</p>
                              <p><strong>Vị trí:</strong> {d.location}</p>
                              <p><strong>Phường:</strong> {wardNameMap[d.wardId] || d.wardName || user?.wardName || "—"}</p>
                              <p><strong>Nguồn:</strong> {d.origin === 'ward' ? 'Sẵn có (Phường)' : 'Đã nhận (Trung tâm)'}</p>
                            </div>
                            <div>
                              <p><strong>Nhà cung cấp:</strong> {d.specifications.vendor || "Chưa có"}</p>
                              <p><strong>Người dùng:</strong> {d.assignedToName || "Chưa gán"}</p>
                              <p><strong>Phòng:</strong> {d.assignedRoomName || userMap[d.assignedTo ?? ""]?.roomName || "—"}</p> {/* ⭐ mới */}
                              <p><strong>Ngày lắp đặt:</strong> {d.installationDate?.toLocaleDateString()}</p>
                              {d.lastMaintenance && (<p><strong>Bảo trì lần cuối:</strong> {d.lastMaintenance.toLocaleDateString()}</p>)}
                              {d.nextMaintenance && (<p><strong>Bảo trì kế tiếp:</strong> {d.nextMaintenance.toLocaleDateString()}</p>)}
                            </div>
                          </div>

                          {d.specifications && (
                            <div className="mt-4">
                              <h3 className="font-semibold">Thông số kỹ thuật</h3>
                              <ul className="list-disc list-inside text-sm">
                                {getFieldsForType(d.type || "other")
                                  .filter(k => k !== 'vendor')
                                  .map((k) => {
                                    const meta = FIELD_META[k];
                                    const rawVal = (d.specifications as any)?.[k];
                                    if (!meta || rawVal === undefined || rawVal === '') return null;
                                    const displayVal =
                                      k === 'license'
                                        ? (rawVal === 'licensed' ? 'Có' : rawVal === 'unlicensed' ? 'Không' : String(rawVal))
                                        : k === 'cpu'
                                        ? (rawVal === 'other'
                                            ? ((d.specifications as any)?.cpu_other || 'Khác')
                                            : (getCpuOptionsByType(d.type).find(o => o.value === rawVal)?.label || String(rawVal)))
                                        : k === 'gpu'
                                        ? (rawVal === 'other'
                                            ? ((d.specifications as any)?.gpu_other || 'Khác')
                                            : (getGpuOptionsByType(d.type).find(o => o.value === rawVal)?.label || String(rawVal)))
                                        : (FIELD_META[k]?.type === 'select' && FIELD_META[k]?.options)
                                        ? (FIELD_META[k]!.options!.find(o => o.value === rawVal)?.label || String(rawVal))
                                        : String(rawVal);
                                    return (
                                      <li key={k}>
                                        <strong>{meta.label}:</strong> {displayVal}
                                      </li>
                                    );
                                  })}
                              </ul>
                            </div>
                          )}

                          {d.images && d.images.length > 0 && (
                            <div className="mt-4">
                              <h3 className="font-semibold">Hình ảnh</h3>
                              <div className="flex gap-2 flex-wrap">
                                {d.images.map((url, i) => (
                                  <img key={i} src={url} alt={`Device ${i}`} className="w-32 h-32 object-cover rounded-md border" />
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
        // CARD MODE
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {receivedDevices.map((d) => (
            <Card key={d.id}>
              <CardHeader>
                <CardTitle className="flex justify-between">
                  {d.name}
                  <Badge className={getStatusColor(d.status)}>{getStatusDisplayName(d.status)}</Badge>
                </CardTitle>
                <CardDescription>{getDeviceTypeDisplayName(d)}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <p><span className="font-medium">Người dùng: </span>{d.assignedToName || "Chưa gán"}</p>
                <p><span className="font-medium">Phòng: </span>
  {d.assignedRoomName || userMap[d.assignedTo ?? ""]?.roomName || "—"}
</p> {/* ⭐ mới */}
                {d.specifications?.ipAddress && <p>IP: {d.specifications.ipAddress}</p>}

                {d.assignedTo ? (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={async () => {
                      if (confirm("Bạn có chắc muốn thu hồi thiết bị này?")) {
                        await updateDevice(d.id, {
                          status: 'active',
                          assignedTo: null,
                          assignedToName: null,
                          assignedRoomId: null,
                          assignedRoomName: null
                        });
                        setDevices(prev =>
                          prev.map(dev =>
                            dev.id === d.id
                              ? {
                                  ...dev,
                                  status: 'active',
                                  assignedTo: null,
                                  assignedToName: null,
                                  assignedRoomId: null,
                                  assignedRoomName: null
                                }
                              : dev
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
                        {assignableUsers.map(u => (
                          <Button
                            key={u.userId}
                            variant="outline"
                            className="w-full justify-start"
                            onClick={async () => {
                              await updateDevice(d.id, {
                                assignedTo: u.userId,
                                assignedToName: u.userName,
                                assignedRoomId: u.roomId || '',
                                assignedRoomName: u.roomName || ''
                              });
                              setDevices(prev =>
                                prev.map(dev =>
                                  dev.id === d.id
                                    ? {
                                        ...dev,
                                        assignedTo: u.userId,
                                        assignedToName: u.userName,
                                        assignedRoomId: u.roomId || '',
                                        assignedRoomName: u.roomName || ''
                                      }
                                    : dev
                                )
                              );
                            }}
                          >
                            <div className="text-left">
                              <p className="font-medium">{u.userName}</p>
                              <p className="text-xs text-muted-foreground">{u.userEmail}</p>
                              {u.roomName && <p className="text-xs">Phòng: {u.roomName}</p>}
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

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Tổng thiết bị</CardTitle>
            <Monitor className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{devicesByOrigin.length}</div>
            <p className="text-xs text-muted-foreground">Theo nguồn: {originTab === 'all' ? 'Tất cả' : originTab === 'received' ? 'Đã nhận' : 'Sẵn có'}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Hoạt động</CardTitle>
            <Package className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">
              {receivedDevices.filter(d => d.status === 'active').length}
            </div>
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

      {/* Available devices */}
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
                  <TableHead>Nguồn</TableHead>
                  <TableHead>Thông số</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead>Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {availableDevices.map((device, index) => (
                  <TableRow key={`${device.id}-${index}`}>
                    <TableCell>{device.name}</TableCell>
                    <TableCell>{getDeviceTypeDisplayName(device)}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{device.origin === 'ward' ? 'Sẵn có' : 'Đã nhận'}</Badge>
                    </TableCell>
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

      {/* In-use devices */}
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
                  <TableHead>Phòng</TableHead> {/* ⭐ mới */}
                  <TableHead>Trạng thái</TableHead>
                  <TableHead>Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {inUseDevices.map((device, index) => {
                  const assignedUser = assignableUsers.find(u => u.userId === device.assignedTo);
                  return (
                    <TableRow key={`${device.id}-${index}`}>
                      <TableCell>{device.name}</TableCell>
                      <TableCell><Badge variant="outline">{getDeviceTypeDisplayName(device)}</Badge></TableCell>
                      <TableCell>{device.assignedToName || assignedUser?.userName || 'Chưa gán'}</TableCell>
                      <TableCell>{device.assignedRoomName || assignedUser?.roomName || '—'}</TableCell> {/* ⭐ mới */}
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

      {/* Assign dialog */}
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
                      {u.roomName && <p className="text-xs">Phòng: {u.roomName}</p>}
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
