import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { 
  Monitor, 
  Building2, 
  Download,
  RefreshCw,
  Filter,
  Clock,
  Activity,
  FileText,
  Bell,
  Target,
  Zap,
  Shield,
  AlertTriangle,
  Cpu,
  HardDrive,
  Wifi,
  Printer,
  Smartphone,
  Laptop,
  Server,
  Router,
  Camera,
  Headphones,
  Mouse,
  Keyboard,
  ExternalLink,
  Eye,
  Search,
  SortAsc,
  SortDesc,
  MoreHorizontal,
  Info,
  CheckCircle2,
  XCircle,
  AlertCircle,
  HelpCircle
} from 'lucide-react';
import { getDeviceStatistics, getWardStatistics, getAllWards, DeviceStatistics, WardStatistics, createSampleDevicesForTesting, updateDevicesWithLicenseField } from '@/lib/services/statisticsService';
import { useToast } from '@/hooks/use-toast';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

const StatisticsPage: React.FC = () => {
  const [statistics, setStatistics] = useState<DeviceStatistics | null>(null);
  const [wardStatistics, setWardStatistics] = useState<WardStatistics | null>(null);
  const [selectedWardId, setSelectedWardId] = useState<string>('all');
  const [wards, setWards] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDetailType, setSelectedDetailType] = useState<string | null>(null);
  const [deviceFilter, setDeviceFilter] = useState<'all' | 'assigned' | 'unassigned'>('all');
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | '1y'>('30d');
  const [viewMode, setViewMode] = useState<'cards' | 'table' | 'charts'>('cards');
  const [sortBy, setSortBy] = useState<'name' | 'date' | 'status' | 'ward'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDeviceTypes, setSelectedDeviceTypes] = useState<string[]>([]);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const { toast } = useToast();

  const loadStatistics = async () => {
    try {
      setLoading(true);
      const [statsData, wardsData] = await Promise.all([
        getDeviceStatistics(),
        getAllWards()
      ]);
      
      setStatistics(statsData);
      setWards(wardsData);
    } catch (error: any) {
      toast({
        title: 'Lỗi',
        description: error.message || 'Không thể tải dữ liệu thống kê',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const loadWardStatistics = async (wardId: string) => {
    if (wardId === 'all') {
      setWardStatistics(null);
      return;
    }

    try {
      const wardStats = await getWardStatistics(wardId);
      setWardStatistics(wardStats);
    } catch (error: any) {
      toast({
        title: 'Lỗi',
        description: error.message || 'Không thể tải thống kê phường',
        variant: 'destructive'
      });
    }
  };

  useEffect(() => {
    loadStatistics();
  }, []);

  useEffect(() => {
    loadWardStatistics(selectedWardId);
  }, [selectedWardId]);

  const getFilteredData = () => {
    if (!statistics) return { hasData: false, selectedWardName: '' };

    // Tạo dữ liệu cho biểu đồ từ statistics
    const wardChartData = statistics.devicesByWard.map(ward => ({
      name: ward.wardName,
      total: ward.totalDevices,
      active: ward.statusBreakdown.active,
      inactive: ward.statusBreakdown.inactive
    }));

    const typeChartData = Object.entries(statistics.devicesByType).map(([type, count]) => ({
      name: type,
      value: count
    }));

    const statusChartData = Object.entries(statistics.overallStatusBreakdown).map(([status, count]) => ({
      name: status,
      value: count
    }));

    // Dữ liệu thống kê OS
    const osChartData = Object.entries(statistics.overallOsBreakdown).map(([os, count]) => ({
      name: os,
      value: count
    }));

    // Dữ liệu thống kê license
    const licenseChartData = [
      { name: 'Có bản quyền', value: statistics.overallLicenseBreakdown.licensed },
      { name: 'Chưa kích hoạt', value: statistics.overallLicenseBreakdown.unlicensed }
    ];

    if (selectedWardId === 'all') {
      return {
        hasData: true,
        wardChartData,
        typeChartData,
        statusChartData,
        osChartData,
        licenseChartData,
        filteredWards: statistics.devicesByWard
      };
    }

    const selectedWard = wards.find(ward => ward.id === selectedWardId);
    if (!selectedWard) {
      return { hasData: false, selectedWardName: 'Phường không tồn tại' };
    }

    const filteredWard = statistics.devicesByWard.find(w => w.wardId === selectedWardId);
    if (!filteredWard) {
      return { hasData: false, selectedWardName: selectedWard.name };
    }

    return {
      hasData: true,
      wardChartData: [{
        name: filteredWard.wardName,
        total: filteredWard.totalDevices,
        active: filteredWard.statusBreakdown.active,
        inactive: filteredWard.statusBreakdown.inactive
      }],
      typeChartData: Object.entries(filteredWard.devicesByType).map(([type, count]) => ({
        name: type,
        value: count
      })),
      statusChartData: Object.entries(filteredWard.statusBreakdown).map(([status, count]) => ({
        name: status,
        value: count
      })),
      osChartData: Object.entries(filteredWard.osBreakdown).map(([os, count]) => ({
        name: os,
        value: count
      })),
      licenseChartData: [
        { name: 'Có bản quyền', value: filteredWard.licenseBreakdown.licensed },
        { name: 'Chưa kích hoạt', value: filteredWard.licenseBreakdown.unlicensed }
      ],
      filteredWards: [filteredWard]
    };
  };

  const getTotalDevices = () => {
    if (!statistics) return 0;
    if (selectedWardId === 'all') {
      return statistics.totalDevices;
    }
    const filteredWard = statistics.devicesByWard.find(w => w.wardId === selectedWardId);
    return filteredWard?.totalDevices || 0;
  };

  const getActiveDevices = () => {
    if (!statistics) return 0;
    if (selectedWardId === 'all') {
      return statistics.overallStatusBreakdown.active;
    }
    const filteredWard = statistics.devicesByWard.find(w => w.wardId === selectedWardId);
    return filteredWard?.statusBreakdown.active || 0;
  };


  const getTypeDisplayName = (type: string) => {
    const typeMap: { [key: string]: string } = {
      'laptop': 'Laptop',
      'desktop': 'Desktop',
      'pc': 'Máy tính để bàn',
      'printer': 'Máy in',
      'monitor': 'Màn hình',
      'router': 'Router',
      'camera': 'Camera',
      'sensor': 'Cảm biến',
      'server': 'Server',
      'switch': 'Switch',
      'ups': 'UPS',
      'ip_phone': 'Điện thoại IP',
      'other': 'Khác'
    };
    return typeMap[type] || type;
  };

  const getTypeIcon = (type: string) => {
    const iconMap: { [key: string]: any } = {
      'laptop': Laptop,
      'desktop': Monitor,
      'pc': Monitor,
      'printer': Printer,
      'monitor': Monitor,
      'router': Router,
      'camera': Camera,
      'sensor': Activity,
      'server': Server,
      'switch': Wifi,
      'ups': Zap,
      'ip_phone': Smartphone,
      'other': Monitor
    };
    return iconMap[type] || Monitor;
  };

  const getPerformanceMetrics = () => {
    if (!statistics) return null;
    
    // Sử dụng dữ liệu đã được lọc theo phường
    const filteredData = getFilteredData();
    if (!filteredData.hasData) return null;
    
    // Tính toán từ dữ liệu đã lọc
    const totalDevices = filteredData.filteredWards.reduce((sum, ward) => sum + ward.totalDevices, 0);
    const activeDevices = filteredData.filteredWards.reduce((sum, ward) => sum + ward.statusBreakdown.active, 0);
    const inactiveDevices = filteredData.filteredWards.reduce((sum, ward) => sum + ward.statusBreakdown.inactive, 0);
    const maintenanceDevices = filteredData.filteredWards.reduce((sum, ward) => sum + (ward.statusBreakdown.maintenance || 0), 0);
    const errorDevices = filteredData.filteredWards.reduce((sum, ward) => sum + (ward.statusBreakdown.error || 0), 0);
    
    return {
      utilizationRate: totalDevices > 0 ? (activeDevices / totalDevices) * 100 : 0,
      maintenanceRate: totalDevices > 0 ? (maintenanceDevices / totalDevices) * 100 : 0,
      errorRate: totalDevices > 0 ? (errorDevices / totalDevices) * 100 : 0,
      availabilityRate: totalDevices > 0 ? ((activeDevices + inactiveDevices) / totalDevices) * 100 : 0
    };
  };


  const getDeviceTypeDistribution = () => {
    if (!statistics) return [];
    
    // Sử dụng dữ liệu đã được lọc theo phường
    const filteredData = getFilteredData();
    if (!filteredData.hasData) return [];
    
    // Tính toán phân bố loại thiết bị từ dữ liệu đã lọc
    const devicesByType: Record<string, number> = {};
    const totalDevices = filteredData.filteredWards.reduce((sum, ward) => sum + ward.totalDevices, 0);
    
    filteredData.filteredWards.forEach(ward => {
      Object.entries(ward.devicesByType).forEach(([type, count]) => {
        devicesByType[type] = (devicesByType[type] || 0) + count;
      });
    });
    
    return Object.entries(devicesByType).map(([type, count]) => ({
      type,
      count,
      percentage: totalDevices > 0 ? (count / totalDevices) * 100 : 0,
      icon: getTypeIcon(type),
      displayName: getTypeDisplayName(type)
    }));
  };


  const getStatusDisplayName = (status: string) => {
    const statusMap: { [key: string]: string } = {
      'active': 'Hoạt động',
      'inactive': 'Không hoạt động',
      'maintenance': 'Bảo trì',
      'error': 'Lỗi'
    };
    return statusMap[status] || status;
  };

  const handleCardClick = (type: string) => {
    setSelectedDetailType(selectedDetailType === type ? null : type);
  };

  const sortDevices = (devices: any[]) => {
    return devices.sort((a, b) => {
      const aAssigned = a.assignedToName && a.assignedToName !== a.wardName;
      const bAssigned = b.assignedToName && b.assignedToName !== b.wardName;

      if (aAssigned && !bAssigned) return -1;
      if (!aAssigned && bAssigned) return 1;
      return 0;
    });
  };

  const filterDevices = (devices: any[]) => {
    if (deviceFilter === 'all') {
      return devices;
    }
    if (deviceFilter === 'assigned') {
      return devices.filter(device =>
        device.assignedToName && device.assignedToName !== device.wardName
      );
    }
    if (deviceFilter === 'unassigned') {
      return devices.filter(device =>
        !device.assignedToName || device.assignedToName === device.wardName
      );
    }
    return devices;
  };

  const filteredData = getFilteredData();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Đang tải dữ liệu...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Dashboard Thống kê</h1>
            <p className="text-muted-foreground">
              Tổng quan về thiết bị và phường trong hệ thống
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={loadStatistics} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Tải lại
            </Button>
            <Button variant="outline" size="sm">
              <Bell className="h-4 w-4 mr-2" />
              Thông báo
            </Button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
          <Card className="border-l-4 border-l-blue-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tổng thiết bị</CardTitle>
              <Monitor className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{getTotalDevices()}</div>
              <p className="text-xs text-muted-foreground">Thiết bị trong hệ thống</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-green-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Đang hoạt động</CardTitle>
              <Activity className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{getActiveDevices()}</div>
              <p className="text-xs text-muted-foreground">Thiết bị đang hoạt động</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-orange-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Sắp hết hạn</CardTitle>
              <Clock className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">0</div>
              <p className="text-xs text-muted-foreground">Thiết bị sắp hết hạn</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-purple-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Số phường</CardTitle>
              <Building2 className="h-4 w-4 text-purple-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">{filteredData.filteredWards.length}</div>
              <p className="text-xs text-muted-foreground">Phường có thiết bị</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-cyan-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Windows có bản quyền</CardTitle>
              <Shield className="h-4 w-4 text-cyan-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-cyan-600">
                {filteredData.hasData ? filteredData.licenseChartData.find(item => item.name === 'Có bản quyền')?.value || 0 : 0}
              </div>
              <p className="text-xs text-muted-foreground">Máy Windows có bản quyền</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-red-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Windows chưa kích hoạt</CardTitle>
              <AlertTriangle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {filteredData.hasData ? filteredData.licenseChartData.find(item => item.name === 'Chưa kích hoạt')?.value || 0 : 0}
              </div>
              <p className="text-xs text-muted-foreground">Máy Windows chưa kích hoạt</p>
            </CardContent>
          </Card>
        </div>

      </div>

      {/* Bộ lọc */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Bộ lọc thống kê
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">Chọn phường</label>
              <Select value={selectedWardId} onValueChange={setSelectedWardId}>
                <SelectTrigger>
                  <SelectValue placeholder="Chọn phường để xem thống kê" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả phường</SelectItem>
                  {wards.map(ward => (
                    <SelectItem key={ward.id} value={ward.id}>
                      {ward.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <p className="text-sm text-muted-foreground">
                {selectedWardId === 'all' 
                  ? 'Đang xem thống kê của tất cả phường' 
                  : `Đang xem thống kê của ${wards.find(w => w.id === selectedWardId)?.name || 'phường được chọn'}`
                }
              </p>
            </div>
          </div>
          
        </CardContent>
      </Card>

      {/* Advanced Filters */}
      {showAdvancedFilters && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Bộ lọc nâng cao
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Khoảng thời gian</label>
                <Select value={timeRange} onValueChange={(value: any) => setTimeRange(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7d">7 ngày qua</SelectItem>
                    <SelectItem value="30d">30 ngày qua</SelectItem>
                    <SelectItem value="90d">90 ngày qua</SelectItem>
                    <SelectItem value="1y">1 năm qua</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="text-sm font-medium mb-2 block">Chế độ xem</label>
                <Select value={viewMode} onValueChange={(value: any) => setViewMode(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cards">Thẻ</SelectItem>
                    <SelectItem value="table">Bảng</SelectItem>
                    <SelectItem value="charts">Biểu đồ</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="text-sm font-medium mb-2 block">Sắp xếp theo</label>
                <div className="flex gap-2">
                  <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
                    <SelectTrigger className="flex-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="name">Tên</SelectItem>
                      <SelectItem value="date">Ngày</SelectItem>
                      <SelectItem value="status">Trạng thái</SelectItem>
                      <SelectItem value="ward">Phường</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                  >
                    {sortOrder === 'asc' ? <SortAsc className="h-4 w-4" /> : <SortDesc className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
              
              <div>
                <label className="text-sm font-medium mb-2 block">Tìm kiếm</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Tìm thiết bị..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border rounded-md"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="overview">Tổng quan</TabsTrigger>
            <TabsTrigger value="performance">Hiệu suất</TabsTrigger>
            <TabsTrigger value="os-license">OS & Bản quyền</TabsTrigger>
            <TabsTrigger value="details">Chi tiết</TabsTrigger>
          </TabsList>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            >
              <Filter className="h-4 w-4 mr-2" />
              {showAdvancedFilters ? 'Ẩn bộ lọc' : 'Bộ lọc nâng cao'}
            </Button>
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Xuất Excel
            </Button>
          </div>
        </div>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Thiết bị theo phường</CardTitle>
              </CardHeader>
              <CardContent>
                {filteredData.hasData && filteredData.wardChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={filteredData.wardChartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="total" fill="#8884d8" name="Tổng số" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                    <div className="text-center">
                      <Monitor className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>Không có dữ liệu để hiển thị</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Phân bố theo loại thiết bị</CardTitle>
              </CardHeader>
              <CardContent>
                {filteredData.hasData && filteredData.typeChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={filteredData.typeChartData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {filteredData.typeChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                    <div className="text-center">
                      <Monitor className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>Không có dữ liệu để hiển thị</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Thống kê hệ điều hành và bản quyền */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Phân bố theo hệ điều hành</CardTitle>
              </CardHeader>
              <CardContent>
                {filteredData.hasData && filteredData.osChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={filteredData.osChartData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {filteredData.osChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                    <div className="text-center">
                      <Monitor className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>Không có dữ liệu để hiển thị</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Trạng thái bản quyền Windows</CardTitle>
              </CardHeader>
              <CardContent>
                {filteredData.hasData && filteredData.licenseChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={filteredData.licenseChartData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {filteredData.licenseChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.name === 'Có bản quyền' ? '#00C49F' : '#FF8042'} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                    <div className="text-center">
                      <Monitor className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>Không có dữ liệu để hiển thị</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          {/* Performance Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {(() => {
              const metrics = getPerformanceMetrics();
              if (!metrics) return null;
              
              return (
                <>
                  <Card className="border-l-4 border-l-green-500">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Tỷ lệ sử dụng</CardTitle>
                      <Target className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-green-600">{metrics.utilizationRate.toFixed(1)}%</div>
                      <p className="text-xs text-muted-foreground">Thiết bị đang hoạt động</p>
                    </CardContent>
                  </Card>

                  <Card className="border-l-4 border-l-blue-500">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Tỷ lệ sẵn sàng</CardTitle>
                      <Shield className="h-4 w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-blue-600">{metrics.availabilityRate.toFixed(1)}%</div>
                      <p className="text-xs text-muted-foreground">Thiết bị có thể sử dụng</p>
                    </CardContent>
                  </Card>

                  <Card className="border-l-4 border-l-orange-500">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Tỷ lệ bảo trì</CardTitle>
                      <Zap className="h-4 w-4 text-orange-500" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-orange-600">{metrics.maintenanceRate.toFixed(1)}%</div>
                      <p className="text-xs text-muted-foreground">Thiết bị đang bảo trì</p>
                    </CardContent>
                  </Card>

                  <Card className="border-l-4 border-l-red-500">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Tỷ lệ lỗi</CardTitle>
                      <AlertTriangle className="h-4 w-4 text-red-500" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-red-600">{metrics.errorRate.toFixed(1)}%</div>
                      <p className="text-xs text-muted-foreground">Thiết bị có lỗi</p>
                    </CardContent>
                  </Card>
                </>
              );
            })()}
          </div>

          {/* Performance Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Hiệu suất theo loại thiết bị</CardTitle>
              </CardHeader>
              <CardContent>
                {(() => {
                  const typeDistribution = getDeviceTypeDistribution();
                  if (typeDistribution.length === 0) return (
                    <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                      <div className="text-center">
                        <Monitor className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>Không có dữ liệu để hiển thị</p>
                      </div>
                    </div>
                  );

                  return (
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={typeDistribution}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="displayName" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="count" fill="#8884d8" name="Số lượng" />
                      </BarChart>
                    </ResponsiveContainer>
                  );
                })()}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Phân bố trạng thái</CardTitle>
              </CardHeader>
              <CardContent>
                {filteredData.hasData && filteredData.statusChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={filteredData.statusChartData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {filteredData.statusChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                    <div className="text-center">
                      <Monitor className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>Không có dữ liệu để hiển thị</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="os-license" className="space-y-4">
          {/* Bảng thống kê OS và License theo phường */}
          <Card>
            <CardHeader>
              <CardTitle>Thống kê hệ điều hành và bản quyền theo phường</CardTitle>
              <p className="text-sm text-muted-foreground">
                Chi tiết về hệ điều hành và trạng thái bản quyền Windows của từng phường
              </p>
            </CardHeader>
            <CardContent>
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left p-3 font-medium">Phường</th>
                      <th className="text-left p-3 font-medium">Tổng thiết bị</th>
                      <th className="text-left p-3 font-medium">Windows 11</th>
                      <th className="text-left p-3 font-medium">Windows 10</th>
                      <th className="text-left p-3 font-medium">Windows 7</th>
                      <th className="text-left p-3 font-medium">Khác</th>
                      <th className="text-left p-3 font-medium">Có bản quyền</th>
                      <th className="text-left p-3 font-medium">Chưa kích hoạt</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredData.hasData && filteredData.filteredWards.map((ward) => (
                      <tr key={ward.wardId} className="border-t hover:bg-muted/30">
                        <td className="p-3 font-medium">{ward.wardName}</td>
                        <td className="p-3">
                          <Badge variant="outline">{ward.totalDevices}</Badge>
                        </td>
                        <td className="p-3">
                          <div className="text-sm">
                            {ward.osBreakdown['Windows 11'] || 0}
                          </div>
                        </td>
                        <td className="p-3">
                          <div className="text-sm">
                            {ward.osBreakdown['Windows 10'] || 0}
                          </div>
                        </td>
                        <td className="p-3">
                          <div className="text-sm">
                            {ward.osBreakdown['Windows 7'] || 0}
                          </div>
                        </td>
                        <td className="p-3">
                          <div className="text-sm">
                            {Object.entries(ward.osBreakdown)
                              .filter(([os]) => !os.toLowerCase().includes('windows'))
                              .reduce((sum, [, count]) => sum + count, 0)}
                          </div>
                        </td>
                        <td className="p-3">
                          <Badge variant="default" className="bg-green-100 text-green-800">
                            {ward.licenseBreakdown.licensed}
                          </Badge>
                        </td>
                        <td className="p-3">
                          <Badge variant="destructive" className="bg-red-100 text-red-800">
                            {ward.licenseBreakdown.unlicensed}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                    {(!filteredData.hasData || filteredData.filteredWards.length === 0) && (
                      <tr>
                        <td colSpan={8} className="p-8 text-center text-muted-foreground">
                          <div className="flex flex-col items-center space-y-2">
                            <Monitor className="h-8 w-8 opacity-50" />
                            <p>Không có dữ liệu để hiển thị</p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Biểu đồ so sánh OS theo phường */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>So sánh hệ điều hành theo phường</CardTitle>
              </CardHeader>
              <CardContent>
                {filteredData.hasData && filteredData.filteredWards.length > 0 ? (
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={filteredData.filteredWards.map(ward => ({
                      name: ward.wardName,
                      'Windows 11': ward.osBreakdown['Windows 11'] || 0,
                      'Windows 10': ward.osBreakdown['Windows 10'] || 0,
                      'Windows 7': ward.osBreakdown['Windows 7'] || 0,
                      'Khác': Object.entries(ward.osBreakdown)
                        .filter(([os]) => !os.toLowerCase().includes('windows'))
                        .reduce((sum, [, count]) => sum + count, 0)
                    }))}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="Windows 11" fill="#8884d8" />
                      <Bar dataKey="Windows 10" fill="#82ca9d" />
                      <Bar dataKey="Windows 7" fill="#ffc658" />
                      <Bar dataKey="Khác" fill="#ff7300" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-[400px] text-muted-foreground">
                    <div className="text-center">
                      <Monitor className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>Không có dữ liệu để hiển thị</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>So sánh bản quyền Windows theo phường</CardTitle>
              </CardHeader>
              <CardContent>
                {filteredData.hasData && filteredData.filteredWards.length > 0 ? (
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={filteredData.filteredWards.map(ward => ({
                      name: ward.wardName,
                      'Có bản quyền': ward.licenseBreakdown.licensed,
                      'Chưa kích hoạt': ward.licenseBreakdown.unlicensed
                    }))}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="Có bản quyền" fill="#00C49F" />
                      <Bar dataKey="Chưa kích hoạt" fill="#FF8042" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-[400px] text-muted-foreground">
                    <div className="text-center">
                      <Monitor className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>Không có dữ liệu để hiển thị</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="details" className="space-y-4">
          {/* Thống kê chi tiết phường được chọn */}
          {wardStatistics && (
            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <CardTitle>Chi tiết thiết bị: {wardStatistics.wardName}</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Tổng {wardStatistics.totalDevices} thiết bị - {wardStatistics.assignedDevices} đã phân bổ - {wardStatistics.unassignedDevices} chưa phân bổ
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant={deviceFilter === 'all' ? "default" : "outline"}
                      size="sm"
                      onClick={() => setDeviceFilter('all')}
                    >
                      Tất cả
                    </Button>
                    <Button
                      variant={deviceFilter === 'assigned' ? "default" : "outline"}
                      size="sm"
                      onClick={() => setDeviceFilter('assigned')}
                    >
                      Đã phân bổ
                    </Button>
                    <Button
                      variant={deviceFilter === 'unassigned' ? "default" : "outline"}
                      size="sm"
                      onClick={() => setDeviceFilter('unassigned')}
                    >
                      Chưa phân bổ
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 mb-6">
                  <div className="text-center">
                    <div className="text-2xl font-bold">{wardStatistics.totalDevices}</div>
                    <p className="text-sm text-muted-foreground">Tổng thiết bị</p>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{wardStatistics.assignedDevices}</div>
                    <p className="text-sm text-muted-foreground">Đã phân bổ</p>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-orange-600">{wardStatistics.unassignedDevices}</div>
                    <p className="text-sm text-muted-foreground">Chưa phân bổ</p>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{wardStatistics.statusBreakdown.active}</div>
                    <p className="text-sm text-muted-foreground">Đang hoạt động</p>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-cyan-600">{wardStatistics.licenseBreakdown.licensed}</div>
                    <p className="text-sm text-muted-foreground">Windows có bản quyền</p>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600">{wardStatistics.licenseBreakdown.unlicensed}</div>
                    <p className="text-sm text-muted-foreground">Windows chưa kích hoạt</p>
                  </div>
                </div>

                {/* Bảng chi tiết thiết bị */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-lg font-semibold">Danh sách thiết bị chi tiết</h4>
                    <p className="text-sm text-muted-foreground">
                      Thiết bị đã phân bổ hiển thị trước, chưa phân bổ ở dưới
                    </p>
                  </div>
                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full">
                      <thead className="bg-muted/50">
                        <tr>
                          <th className="text-left p-3 font-medium">Thiết bị</th>
                          <th className="text-left p-3 font-medium">Loại</th>
                          <th className="text-left p-3 font-medium">Hệ điều hành</th>
                          <th className="text-left p-3 font-medium">Bản quyền</th>
                          <th className="text-left p-3 font-medium">Trạng thái</th>
                          <th className="text-left p-3 font-medium">Người sử dụng</th>
                          <th className="text-left p-3 font-medium">Ngày cài đặt</th>
                          <th className="text-left p-3 font-medium">Thời gian hoạt động</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filterDevices(sortDevices(wardStatistics.devices || [])).map((device: any) => {
                          const installationDate = new Date(device.installationDate);
                          const now = new Date();
                          const daysSinceInstallation = Math.floor((now.getTime() - installationDate.getTime()) / (1000 * 60 * 60 * 24));
                          const isAssigned = device.assignedToName && device.assignedToName !== device.wardName;
                          const isUnassigned = !device.assignedToName || device.assignedToName === device.wardName;
                          
                          return (
                            <tr 
                              key={device.id} 
                              className={`border-t hover:bg-muted/30 ${
                                isUnassigned ? 'bg-red-50/30 border-l-4 border-l-red-200' : ''
                              }`}
                            >
                              <td className="p-3">
                                <div>
                                  <div className="font-medium flex items-center gap-2">
                                    {device.name}
                                    {isUnassigned && (
                                      <Badge variant="destructive" className="text-xs">
                                        Chưa phân bổ
                                      </Badge>
                                    )}
                                  </div>
                                  <div className="text-sm text-muted-foreground">{device.location}</div>
                                </div>
                              </td>
                              <td className="p-3">
                                <Badge variant="outline">
                                  {getTypeDisplayName(device.type || 'other')}
                                </Badge>
                              </td>
                              <td className="p-3">
                                <div className="text-sm font-medium">
                                  {device.specifications?.os || 'Unknown'}
                                </div>
                              </td>
                              <td className="p-3">
                                {(() => {
                                  const os = device.specifications?.os || '';
                                  const isWindows = os.toLowerCase().includes('windows');
                                  
                                  if (!isWindows) {
                                    return <Badge variant="secondary">N/A</Badge>;
                                  }
                                  
                                  // Ưu tiên trường windowsLicense hoặc license nếu có
                                  if (device.specifications?.windowsLicense) {
                                    const isLicensed = device.specifications.windowsLicense === 'licensed';
                                    return (
                                      <Badge 
                                        variant={isLicensed ? "default" : "destructive"}
                                        className={isLicensed ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}
                                      >
                                        {isLicensed ? 'Có bản quyền' : 'Chưa kích hoạt'}
                                      </Badge>
                                    );
                                  }
                                  
                                  // Kiểm tra trường license cũ (để tương thích ngược)
                                  if ((device.specifications as any)?.license) {
                                    const isLicensed = (device.specifications as any).license === 'licensed';
                                    return (
                                      <Badge 
                                        variant={isLicensed ? "default" : "destructive"}
                                        className={isLicensed ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}
                                      >
                                        {isLicensed ? 'Có bản quyền' : 'Chưa kích hoạt'}
                                      </Badge>
                                    );
                                  }
                                  
                                  // Fallback: Kiểm tra nhiều điều kiện để xác định bản quyền
                                  const brand = device.specifications?.brand?.toLowerCase() || '';
                                  const model = device.specifications?.model?.toLowerCase() || '';
                                  const vendor = device.vendor?.toLowerCase() || '';
                                  const description = device.description?.toLowerCase() || '';
                                  
                                  // Các từ khóa chỉ bản quyền hợp lệ
                                  const licensedKeywords = [
                                    'licensed', 'bản quyền', 'genuine', 'authentic', 'original',
                                    'microsoft', 'oem', 'retail', 'volume', 'enterprise',
                                    'professional', 'pro', 'business', 'education'
                                  ];
                                  
                                  // Các từ khóa chỉ bản quyền không hợp lệ
                                  const unlicensedKeywords = [
                                    'crack', 'pirate', 'hack', 'unlicensed', 'trial', 'evaluation',
                                    'test', 'demo', 'beta', 'preview', 'kms', 'activator'
                                  ];
                                  
                                  const hasLicensedKeyword = licensedKeywords.some(keyword => 
                                    brand.includes(keyword) || model.includes(keyword) || 
                                    vendor.includes(keyword) || description.includes(keyword)
                                  );
                                  
                                  const hasUnlicensedKeyword = unlicensedKeywords.some(keyword => 
                                    brand.includes(keyword) || model.includes(keyword) || 
                                    vendor.includes(keyword) || description.includes(keyword)
                                  );
                                  
                                  // Logic xác định bản quyền
                                  let isLicensed = false;
                                  if (hasUnlicensedKeyword) {
                                    isLicensed = false;
                                  } else if (hasLicensedKeyword) {
                                    isLicensed = true;
                                  } else {
                                    // Mặc định coi là chưa kích hoạt nếu không có thông tin rõ ràng
                                    isLicensed = false;
                                  }
                                  
                                  return (
                                    <Badge 
                                      variant={isLicensed ? "default" : "destructive"}
                                      className={isLicensed ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}
                                    >
                                      {isLicensed ? 'Có bản quyền' : 'Chưa kích hoạt'}
                                    </Badge>
                                  );
                                })()}
                              </td>
                              <td className="p-3">
                                <Badge 
                                  variant={
                                    device.status === 'active' ? 'default' :
                                    device.status === 'inactive' ? 'secondary' :
                                    device.status === 'maintenance' ? 'destructive' : 'outline'
                                  }
                                >
                                  {getStatusDisplayName(device.status)}
                                </Badge>
                              </td>
                              <td className="p-3">
                                {isAssigned ? (
                                  <div>
                                    <div className="font-medium text-green-700">{device.assignedToName}</div>
                                    <div className="text-sm text-green-600">Đã phân bổ</div>
                                  </div>
                                ) : device.assignedToName === device.wardName ? (
                                  <div>
                                    <div className="font-medium text-orange-600">Chưa phân bổ cụ thể</div>
                                    <div className="text-sm text-orange-500">Thuộc phường {device.wardName}</div>
                                  </div>
                                ) : (
                                  <div>
                                    <div className="font-medium text-red-600">Chưa phân bổ</div>
                                    <div className="text-sm text-red-500">Cần phân bổ ngay</div>
                                  </div>
                                )}
                              </td>
                              <td className="p-3">
                                <div className="text-sm">
                                  {installationDate.toLocaleDateString('vi-VN')}
                                </div>
                              </td>
                              <td className="p-3">
                                <div className="text-sm">
                                  {daysSinceInstallation > 0 ? (
                                    <span className="text-green-600">
                                      {daysSinceInstallation} ngày
                                    </span>
                                  ) : (
                                    <span className="text-muted-foreground">
                                      Mới cài đặt
                                    </span>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                        {filterDevices(sortDevices(wardStatistics.devices || [])).length === 0 && (
                          <tr>
                            <td colSpan={8} className="p-8 text-center text-muted-foreground">
                              <div className="flex flex-col items-center space-y-2">
                                <Monitor className="h-8 w-8 opacity-50" />
                                <p>
                                  {deviceFilter === 'all' 
                                    ? "Không có thiết bị nào trong phường này"
                                    : deviceFilter === 'assigned'
                                    ? "Không có thiết bị đã phân bổ nào"
                                    : "Không có thiết bị chưa phân bổ nào"
                                  }
                                </p>
                              </div>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

        </TabsContent>
      </Tabs>
    </div>
  );
};

export default StatisticsPage;
