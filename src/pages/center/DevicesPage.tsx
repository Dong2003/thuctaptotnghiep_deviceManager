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
import { Plus, Search, Edit, Trash2, Monitor, Calendar, DollarSign, Loader2 } from 'lucide-react';
import { SpecEditor, FIELD_META, getFieldsForType } from '@/components/SpecEditor';
import { useAuth } from '@/contexts/AuthContext';
import { getDevices, createDevice, updateDevice, deleteDevice, getDeviceStats, type Device } from '@/lib/services/deviceService';
import { getWards } from '@/lib/services/wardService';
import { useToast } from '@/hooks/use-toast';

const DevicesPage = () => {
  const { user } = useAuth();
  const [devices, setDevices] = useState<Device[]>([]);
  const [wards, setWards] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingDevice, setEditingDevice] = useState<Device | null>(null);
  const { toast } = useToast();

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

  const getSpecFieldsForType = (type: string) => {
    // Chỉ sử dụng các trường có trong schema hiện tại
    const common = [
      { key: 'brand', label: 'Thương hiệu', placeholder: 'VD: Dell, HP, Canon' },
      { key: 'model', label: 'Model', placeholder: 'VD: Latitude 5520' },
      { key: 'serialNumber', label: 'Số serial', placeholder: 'VD: ABC123456789' },
    ];
    const network = [
      { key: 'ipAddress', label: 'Địa chỉ IP', placeholder: 'VD: 192.168.1.100' },
      { key: 'macAddress', label: 'Địa chỉ MAC', placeholder: 'VD: 00:11:22:33:44:55' },
    ];
    const compute = [
      { key: 'cpu', label: 'CPU', placeholder: 'VD: Intel Core i7' },
      { key: 'ram', label: 'RAM', placeholder: 'VD: 16GB DDR4' },
      { key: 'storage', label: 'Ổ cứng', placeholder: 'VD: 512GB SSD' },
      { key: 'os', label: 'Hệ điều hành', placeholder: 'VD: Windows 11 Pro' },
    ];

    switch (type) {
      case 'pc':
      case 'laptop':
        return [...common, ...compute, ...network];
      case 'camera':
        return [...common, ...network];
      case 'router':
      case 'switch':
        return [...common, ...network];
      case 'printer':
      case 'monitor':
      case 'server':
      case 'sensor':
      case 'ups':
      case 'ip_phone':
      case 'other':
      default:
        return [...common];
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [devicesData, wardsData, statsData] = await Promise.all([
          getDevices(),
          getWards(),
          getDeviceStats()
        ]);
        
        setDevices(devicesData);
        setWards(wardsData);
        setStats(statsData);
      } catch (error: any) {
        toast({
          title: "Lỗi tải dữ liệu",
          description: error.message || "Không thể tải dữ liệu thiết bị",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [toast]);

  const [newDevice, setNewDevice] = useState<{
    name: string;
    type: Device['type'];
    location: string;
    wardId: string;
    wardName: string;
    description: string;
    vendor?: string;
    specifications: Record<string, string>;
    installationDate: Date;
  }>({
    name: '',
    type: 'camera' as Device['type'],
    location: '',
    wardId: '',
    wardName: '',
    description: '',
    vendor:'',
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

  const filteredDevices = devices.filter(device => {
    const matchesSearch = device.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         device.specifications.brand?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         device.specifications.model?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || device.type === filterType;
    const matchesStatus = filterStatus === 'all' || device.status === filterStatus;
    
    return matchesSearch && matchesType && matchesStatus;
  });

  const handleAddDevice = async () => {
    if (!user) return;

    try {
      const quantity = Math.max(1, Number(addQuantity) || 1);
      await Promise.all(
        Array.from({ length: quantity }).map((_, i) => {
          const nameWithIndex = quantity > 1 ? `${newDevice.name} #${i + 1}` : newDevice.name;
          return createDevice({ ...newDevice, name: nameWithIndex }, user.id);
        })
      );
      
      // Refresh devices list
      const updatedDevices = await getDevices();
      setDevices(updatedDevices);
      
      setIsAddDialogOpen(false);
      setNewDevice({
        name: '',
        type: 'camera',
        location: '',
        wardId: '',
        wardName: '',
        description: '',
        vendor:'',
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
      setAddQuantity(1);

      toast({
        title: "Thêm thiết bị thành công",
        description: quantity > 1 
          ? `Đã thêm ${quantity} thiết bị vào hệ thống.` 
          : `Thiết bị ${newDevice.name} đã được thêm vào hệ thống.`,
      });
    } catch (error: any) {
      toast({
        title: "Lỗi thêm thiết bị",
        description: error.message || "Không thể thêm thiết bị",
        variant: "destructive"
      });
    }
  };

  const handleDeleteDevice = async (deviceId: string) => {
    try {
      await deleteDevice(deviceId);
      setDevices(devices.filter(d => d.id !== deviceId));
      toast({
        title: "Xóa thiết bị thành công",
        description: "Thiết bị đã được xóa khỏi hệ thống.",
      });
    } catch (error: any) {
      toast({
        title: "Lỗi xóa thiết bị",
        description: error.message || "Không thể xóa thiết bị",
        variant: "destructive"
      });
    }
  };

  const getDeviceTypeDisplayName = (type: string) => {
    switch (type) {
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
      default: return type;
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

  const handleSaveDevice = async () => {
    if (!editingDevice) return;
  
    try {
      const payload = {
        ...editingDevice,
        installationDate: editingDevice.installationDate 
          ? new Date(editingDevice.installationDate).toISOString() 
          : null,
        lastMaintenance: editingDevice.lastMaintenance 
          ? new Date(editingDevice.lastMaintenance).toISOString() 
          : null,
        nextMaintenance: editingDevice.nextMaintenance 
          ? new Date(editingDevice.nextMaintenance).toISOString() 
          : null,
        createdAt: editingDevice.createdAt 
          ? new Date(editingDevice.createdAt).toISOString() 
          : null,
        updatedAt: new Date().toISOString(), // luôn update
        images: editingDevice.images || [],  // giữ string[] thôi
      };
  
      await updateDevice(editingDevice.id, payload);
      const updatedDevices = await getDevices();
      setDevices(updatedDevices);
      setEditingDevice(null);
  
      toast({
        title: "Cập nhật thành công",
        description: `Thiết bị đã được cập nhật.`,
      });
    } catch (error: any) {
      toast({
        title: "Lỗi cập nhật",
        description: error.message || "Không thể cập nhật thiết bị",
        variant: "destructive",
      });
    }
  };

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
          <h1 className="text-3xl font-bold text-foreground">Quản lý thiết bị</h1>
          <p className="text-muted-foreground">Quản lý tất cả thiết bị IT trong hệ thống</p>
        </div>

        <div className="flex gap-2">
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="flex items-center space-x-2">
              <Plus className="h-4 w-4" />
              <span>Thêm thiết bị</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Thêm thiết bị mới</DialogTitle>
              <DialogDescription>
                Nhập thông tin chi tiết cho thiết bị mới
              </DialogDescription>
            </DialogHeader>

            <div className="grid grid-cols-2 gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Tên thiết bị</Label>
                <Input
                  id="name"
                  value={newDevice.name}
                  onChange={(e) => setNewDevice({...newDevice, name: e.target.value})}
                  placeholder="VD: Laptop Dell Latitude 5520"
                />
              </div>

              <div className="space-y-2 col-span-2">
                <Label htmlFor="type">Loại thiết bị</Label>
                <Select
                  value={newDevice.type}
                  onValueChange={(value) => setNewDevice({ ...newDevice, type: value as Device['type'] })}
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
                <Label htmlFor="location">Vị trí</Label>
                <Input
                  id="location"
                  value={newDevice.location}
                  onChange={(e) => setNewDevice({...newDevice, location: e.target.value})}
                  placeholder="VD: Ngã tư Lê Lợi - Nguyễn Huệ"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="quantity">Số lượng</Label>
                <Input
                  id="quantity"
                  type="number"
                  min={1}
                  value={addQuantity}
                  onChange={(e) => setAddQuantity(parseInt(e.target.value || '1') || 1)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="wardId">Phường</Label>
                <Select value={newDevice.wardId} onValueChange={(value) => {
                  const ward = wards.find(w => w.id === value);
                  setNewDevice({...newDevice, wardId: value, wardName: ward?.name || ''});
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Chọn phường" />
                  </SelectTrigger>
                  <SelectContent>
                    {wards.map((ward) => (
                      <SelectItem key={ward.id} value={ward.id}>
                        {ward.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Thông số/kỹ thuật dựa theo loại thiết bị */}
              {newDevice.type && (
                <SpecEditor
                  type={newDevice.type}
                  specifications={newDevice.specifications as any}
                  onChange={(next) => setNewDevice({ ...newDevice, specifications: next })}
                />
              )}

              <div className="space-y-2">
                <Label htmlFor="installationDate">Ngày lắp đặt</Label>
                <Input
                  id="installationDate"
                  type="date"
                  value={newDevice.installationDate.toISOString().split('T')[0]}
                  onChange={(e) => setNewDevice({...newDevice, installationDate: new Date(e.target.value)})}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                Hủy
              </Button>
              <Button onClick={handleAddDevice}>
                Thêm thiết bị
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        </div>
        
        {/* Edit Device Dialog */}
<Dialog open={!!editingDevice} onOpenChange={(open) => !open && setEditingDevice(null)}>
  <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
    <DialogHeader>
      <DialogTitle>Chỉnh sửa thiết bị</DialogTitle>
      <DialogDescription>
        Cập nhật thông tin chi tiết của thiết bị
      </DialogDescription>
    </DialogHeader>

    {editingDevice && (
      <div className="grid grid-cols-2 gap-4 py-4">
        <div className="space-y-2">
          <Label htmlFor="edit-name">Tên thiết bị</Label>
          <Input
            id="edit-name"
            value={editingDevice.name}
            onChange={(e) => setEditingDevice({...editingDevice, name: e.target.value})}
          />
        </div>

        <div className="space-y-2 col-span-2">
          <Label htmlFor="edit-type">Loại thiết bị</Label>
          <Select
            value={editingDevice.type}
            onValueChange={(value) => setEditingDevice({ ...editingDevice, type: value as Device['type'] })}
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
          <Label htmlFor="edit-location">Vị trí</Label>
          <Input
            id="edit-location"
            value={editingDevice.location}
            onChange={(e) => setEditingDevice({...editingDevice, location: e.target.value})}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="edit-ward">Phường</Label>
          <Select
            value={editingDevice.wardId}
            onValueChange={(value) => {
              const ward = wards.find(w => w.id === value);
              setEditingDevice({...editingDevice, wardId: value, wardName: ward?.name || ''});
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Chọn phường" />
            </SelectTrigger>
            <SelectContent>
              {wards.map((ward) => (
                <SelectItem key={ward.id} value={ward.id}>
                  {ward.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Thông số theo loại thiết bị - dùng SpecEditor */}
        <SpecEditor
          type={editingDevice.type}
          specifications={editingDevice.specifications || {}}
          onChange={(next) => setEditingDevice({ ...editingDevice, specifications: next })}
        />
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => setEditingDevice(null)}>
            Hủy
          </Button>
          <Button
            onClick={async () => {
              if (!editingDevice) return;
              try {
                await updateDevice(editingDevice.id, editingDevice);
                const updatedDevices = await getDevices();
                setDevices(updatedDevices);
                setEditingDevice(null);
                toast({
                  title: "Cập nhật thành công",
                  description: `Thiết bị đã được cập nhật.`,
                });
              } catch (error: any) {
                toast({
                  title: "Lỗi cập nhật",
                  description: error.message || "Không thể cập nhật thiết bị",
                  variant: "destructive"
                });
              }
            }}
          >
            Lưu thay đổi
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tổng thiết bị</CardTitle>
            <Monitor className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.total || devices.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Hoạt động</CardTitle>
            <Monitor className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">
              {stats?.active || devices.filter(d => d.status === 'active').length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Bảo trì</CardTitle>
            <Monitor className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              {stats?.maintenance || devices.filter(d => d.status === 'maintenance').length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Lỗi</CardTitle>
            <Monitor className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {stats?.error || devices.filter(d => d.status === 'error').length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Bộ lọc</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center space-x-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Tìm kiếm thiết bị..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-64"
              />
            </div>

            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Loại thiết bị" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả loại</SelectItem>
                <SelectItem value="camera">Camera</SelectItem>
                <SelectItem value="sensor">Cảm biến</SelectItem>
                <SelectItem value="router">Router</SelectItem>
                <SelectItem value="other">Thiết bị khác</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Trạng thái" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả trạng thái</SelectItem>
                <SelectItem value="active">Hoạt động</SelectItem>
                <SelectItem value="inactive">Không hoạt động</SelectItem>
                <SelectItem value="maintenance">Bảo trì</SelectItem>
                <SelectItem value="error">Lỗi</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Devices Table */}
      <Card>
        <CardHeader>
          <CardTitle>Danh sách thiết bị ({filteredDevices.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tên thiết bị</TableHead>
                <TableHead>Loại</TableHead>
                <TableHead>Vị trí</TableHead>
                <TableHead>Phường</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead>Ngày lắp đặt</TableHead>
                <TableHead>Thao tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredDevices.map((device) => (
                <TableRow key={device.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{device.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {device.specifications?.brand} {device.specifications?.model}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {getDeviceTypeDisplayName(device.type)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <p>{device.location}</p>
                      {device.specifications?.ipAddress && <p className="text-muted-foreground">IP: {device.specifications.ipAddress}</p>}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <p>{device.wardName}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge 
                      variant={
                        device.status === 'active' ? 'default' :
                        device.status === 'inactive' ? 'secondary' :
                        device.status === 'maintenance' ? 'secondary' :
                        device.status === 'error' ? 'destructive' : 'secondary'
                      }
                    >
                      {getStatusDisplayName(device.status)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">{new Date(device.installationDate).toLocaleDateString('vi-VN')}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setEditingDevice(device)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                      <Button 
                        variant="destructive" 
                        size="sm"
                        onClick={() => handleDeleteDevice(device.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    

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
                          <p><strong>Tên:</strong> {device.name}</p>
                          <p><strong>Loại:</strong> {device.type || "Không rõ"}</p>
                          <p><strong>Trạng thái:</strong> {device.status}</p>
                          <p><strong>Vị trí:</strong> {device.location}</p>
                          <p><strong>Phường:</strong> {device.wardName}</p>
                        </div>
                        <div>
                          <p><strong>Nhà cung cấp:</strong> {device.vendor || "Chưa có"}</p>
                          <p><strong>Người dùng:</strong> {device.assignedToName || "Chưa gán"}</p>
                          <p><strong>Ngày lắp đặt:</strong> {device.installationDate?.toLocaleDateString()}</p>
                          {device.lastMaintenance && (
                            <p><strong>Bảo trì lần cuối:</strong> {device.lastMaintenance.toLocaleDateString()}</p>
                          )}
                          {device.nextMaintenance && (
                            <p><strong>Bảo trì kế tiếp:</strong> {device.nextMaintenance.toLocaleDateString()}</p>
                          )}
                        </div>
                      </div>

                      {device.specifications && (
                        <div className="mt-4">
                          <h3 className="font-semibold">Thông số kỹ thuật</h3>
                          <ul className="list-disc list-inside text-sm">
                            {getFieldsForType(device.type || 'other')
                              .filter((k) => k !== 'vendor' && k !== 'description')
                              .map((k) => {
                                const meta = FIELD_META[k];
                                const val = (device.specifications as any)?.[k];
                                if (!meta || val === undefined || val === '') return null;
                                return (
                                  <li key={k}>
                                    <strong>{meta.label}:</strong> {String(val)}
                                  </li>
                                );
                              })}
                          </ul>
                        </div>
                      )}

                      {device.description && (
                        <div className="mt-4">
                          <h3 className="font-semibold">Mô tả</h3>
                          <p className="text-sm text-gray-600">{device.description}</p>
                        </div>
                      )}

                      {device.images && device.images.length > 0 && (
                        <div className="mt-4">
                          <h3 className="font-semibold">Hình ảnh</h3>
                          <div className="flex gap-2 flex-wrap">
                            {device.images.map((url, i) => (
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
                        <p><strong>Tạo lúc:</strong> {device.createdAt.toLocaleString()}</p>
                        <p><strong>Cập nhật lúc:</strong> {device.updatedAt.toLocaleString()}</p>
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
    </div>
  );
};

export default DevicesPage;