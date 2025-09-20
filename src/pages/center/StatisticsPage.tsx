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
  Cell,
  LineChart,
  Line,
  AreaChart,
  Area,
  ComposedChart,
  ScatterChart,
  Scatter
} from 'recharts';
import { 
  Monitor, 
  Building2, 
  TrendingUp, 
  Download,
  RefreshCw,
  Filter,
  AlertTriangle,
  Clock,
  Calendar,
  Users,
  Activity,
  BarChart3,
  FileText,
  Bell,
  Target,
  Zap,
  Shield,
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
import { getDeviceStatistics, getWardStatistics, getAllWards, getExpiryStatistics, DeviceStatistics, WardStatistics, ExpiryStatistics, ExpiringDevice } from '@/lib/services/statisticsService';
import { useToast } from '@/hooks/use-toast';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

const StatisticsPage: React.FC = () => {
  const [statistics, setStatistics] = useState<DeviceStatistics | null>(null);
  const [wardStatistics, setWardStatistics] = useState<WardStatistics | null>(null);
  const [expiryStatistics, setExpiryStatistics] = useState<ExpiryStatistics | null>(null);
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
      const [statsData, wardsData, expiryData] = await Promise.all([
        getDeviceStatistics(),
        getAllWards(),
        getExpiryStatistics()
      ]);
      
      setStatistics(statsData);
      setWards(wardsData);
      setExpiryStatistics(expiryData);
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

    if (selectedWardId === 'all') {
      return {
        hasData: true,
        wardChartData,
        typeChartData,
        statusChartData,
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
      typeChartData,
      statusChartData,
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

  const getCriticalDevicesCount = () => {
    return expiryStatistics?.criticalDevices.length || 0;
  };

  const getWarningDevicesCount = () => {
    return expiryStatistics?.warningDevices.length || 0;
  };

  const getUpcomingDevicesCount = () => {
    return expiryStatistics?.upcomingDevices.length || 0;
  };

  const getTotalExpiringDevices = () => {
    return expiryStatistics?.totalExpiringDevices || 0;
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
    
    const totalDevices = statistics.totalDevices;
    const activeDevices = statistics.overallStatusBreakdown.active;
    const inactiveDevices = statistics.overallStatusBreakdown.inactive;
    const maintenanceDevices = statistics.overallStatusBreakdown.maintenance || 0;
    const errorDevices = statistics.overallStatusBreakdown.error || 0;
    
    return {
      utilizationRate: totalDevices > 0 ? (activeDevices / totalDevices) * 100 : 0,
      maintenanceRate: totalDevices > 0 ? (maintenanceDevices / totalDevices) * 100 : 0,
      errorRate: totalDevices > 0 ? (errorDevices / totalDevices) * 100 : 0,
      availabilityRate: totalDevices > 0 ? ((activeDevices + inactiveDevices) / totalDevices) * 100 : 0
    };
  };

  const getTrendData = () => {
    // Mock data for trend analysis - trong thực tế sẽ lấy từ database
    const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : timeRange === '90d' ? 90 : 365;
    const trendData = [];
    
    for (let i = days; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      
      trendData.push({
        date: date.toISOString().split('T')[0],
        active: Math.floor(Math.random() * 20) + 15,
        inactive: Math.floor(Math.random() * 5) + 1,
        maintenance: Math.floor(Math.random() * 3),
        error: Math.floor(Math.random() * 2)
      });
    }
    
    return trendData;
  };

  const getDeviceTypeDistribution = () => {
    if (!statistics) return [];
    
    return Object.entries(statistics.devicesByType).map(([type, count]) => ({
      type,
      count,
      percentage: (count / statistics.totalDevices) * 100,
      icon: getTypeIcon(type),
      displayName: getTypeDisplayName(type)
    }));
  };

  const getWardComparison = () => {
    if (!statistics) return [];
    
    return statistics.devicesByWard.map(ward => ({
      ...ward,
      utilizationRate: ward.totalDevices > 0 ? (ward.statusBreakdown.active / ward.totalDevices) * 100 : 0,
      efficiency: ward.statusBreakdown.active / Math.max(ward.statusBreakdown.inactive, 1)
    })).sort((a, b) => b.utilizationRate - a.utilizationRate);
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
              <FileText className="h-4 w-4 mr-2" />
              Xuất PDF
            </Button>
            <Button variant="outline" size="sm">
              <Bell className="h-4 w-4 mr-2" />
              Thông báo
            </Button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
              <div className="text-2xl font-bold text-orange-600">{getTotalExpiringDevices()}</div>
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
        </div>

        {/* Thông báo nếu có thiết bị khẩn cấp */}
        {getCriticalDevicesCount() > 0 && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-600" />
                <div>
                  <p className="font-semibold text-red-800">
                    Cảnh báo: {getCriticalDevicesCount()} thiết bị sắp hết hạn trong 7 ngày tới!
                  </p>
                  <p className="text-sm text-red-600">
                    Vui lòng kiểm tra và lập kế hoạch thay thế ngay lập tức.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
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
            <TabsTrigger value="trends">Xu hướng</TabsTrigger>
            <TabsTrigger value="comparison">So sánh</TabsTrigger>
            <TabsTrigger value="details">Chi tiết</TabsTrigger>
            <TabsTrigger value="expiry">Sắp hết hạn</TabsTrigger>
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

        <TabsContent value="trends" className="space-y-4">
          {/* Trend Analysis */}
          <Card>
            <CardHeader>
              <CardTitle>Xu hướng hoạt động thiết bị</CardTitle>
              <p className="text-sm text-muted-foreground">
                Phân tích xu hướng trong {timeRange === '7d' ? '7 ngày' : timeRange === '30d' ? '30 ngày' : timeRange === '90d' ? '90 ngày' : '1 năm'} qua
              </p>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <AreaChart data={getTrendData()}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Area type="monotone" dataKey="active" stackId="1" stroke="#8884d8" fill="#8884d8" name="Hoạt động" />
                  <Area type="monotone" dataKey="inactive" stackId="1" stroke="#82ca9d" fill="#82ca9d" name="Không hoạt động" />
                  <Area type="monotone" dataKey="maintenance" stackId="1" stroke="#ffc658" fill="#ffc658" name="Bảo trì" />
                  <Area type="monotone" dataKey="error" stackId="1" stroke="#ff7300" fill="#ff7300" name="Lỗi" />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Trend Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Xu hướng tích cực</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-green-500" />
                  <span className="text-sm">Thiết bị hoạt động tăng 5.2%</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Cần chú ý</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-orange-500" />
                  <span className="text-sm">Thiết bị lỗi tăng 1.8%</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Dự báo</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <Target className="h-4 w-4 text-blue-500" />
                  <span className="text-sm">Tỷ lệ sử dụng dự kiến: 85%</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="comparison" className="space-y-4">
          {/* Ward Comparison */}
          <Card>
            <CardHeader>
              <CardTitle>So sánh hiệu suất phường</CardTitle>
              <p className="text-sm text-muted-foreground">
                Xếp hạng phường theo tỷ lệ sử dụng thiết bị
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {getWardComparison().map((ward, index) => (
                  <div key={ward.wardId} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-600 font-bold">
                        {index + 1}
                      </div>
                      <div>
                        <div className="font-medium">{ward.wardName}</div>
                        <div className="text-sm text-muted-foreground">
                          {ward.totalDevices} thiết bị • {ward.statusBreakdown.active} hoạt động
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-green-600">
                        {ward.utilizationRate.toFixed(1)}%
                      </div>
                      <div className="text-sm text-muted-foreground">Tỷ lệ sử dụng</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Device Type Comparison */}
          <Card>
            <CardHeader>
              <CardTitle>So sánh loại thiết bị</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {getDeviceTypeDistribution().map((item) => {
                  const IconComponent = item.icon;
                  return (
                    <div key={item.type} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <IconComponent className="h-5 w-5 text-blue-500" />
                        <div>
                          <div className="font-medium">{item.displayName}</div>
                          <div className="text-sm text-muted-foreground">{item.count} thiết bị</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold">{item.percentage.toFixed(1)}%</div>
                        <div className="w-20 bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-blue-500 h-2 rounded-full" 
                            style={{ width: `${item.percentage}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
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
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
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
                            <td colSpan={6} className="p-8 text-center text-muted-foreground">
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

        <TabsContent value="expiry" className="space-y-4">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="border-l-4 border-l-orange-500">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Tổng sắp hết hạn</CardTitle>
                <Clock className="h-4 w-4 text-orange-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">{getTotalExpiringDevices()}</div>
                <p className="text-xs text-muted-foreground">Thiết bị sắp hết hạn</p>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-red-500">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Khẩn cấp</CardTitle>
                <AlertTriangle className="h-4 w-4 text-red-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{getCriticalDevicesCount()}</div>
                <p className="text-xs text-muted-foreground">&lt; 7 ngày</p>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-yellow-500">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Cảnh báo</CardTitle>
                <Clock className="h-4 w-4 text-yellow-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-600">{getWarningDevicesCount()}</div>
                <p className="text-xs text-muted-foreground">7-30 ngày</p>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-blue-500">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Sắp tới</CardTitle>
                <Calendar className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">{getUpcomingDevicesCount()}</div>
                <p className="text-xs text-muted-foreground">30-90 ngày</p>
              </CardContent>
            </Card>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Sắp hết hạn theo phường</CardTitle>
              </CardHeader>
              <CardContent>
                {expiryStatistics && expiryStatistics.byWard.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={expiryStatistics.byWard}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="wardName" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="expiringCount" stackId="a" fill="#FF8042" name="Sắp hết hạn" />
                      <Bar dataKey="criticalCount" stackId="a" fill="#FF0000" name="Khẩn cấp" />
                      <Bar dataKey="warningCount" stackId="a" fill="#FFBB28" name="Cảnh báo" />
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
                <CardTitle>Phân bố mức độ hết hạn</CardTitle>
              </CardHeader>
              <CardContent>
                {expiryStatistics && (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={[
                          { name: 'Khẩn cấp', value: expiryStatistics.criticalDevices.length, color: '#FF0000' },
                          { name: 'Cảnh báo', value: expiryStatistics.warningDevices.length, color: '#FFBB28' },
                          { name: 'Sắp tới', value: expiryStatistics.upcomingDevices.length, color: '#0088FE' }
                        ]}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {[
                          { name: 'Khẩn cấp', value: expiryStatistics.criticalDevices.length, color: '#FF0000' },
                          { name: 'Cảnh báo', value: expiryStatistics.warningDevices.length, color: '#FFBB28' },
                          { name: 'Sắp tới', value: expiryStatistics.upcomingDevices.length, color: '#0088FE' }
                        ].map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Detailed Lists */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Critical Devices */}
            <Card>
              <CardHeader>
                <CardTitle className="text-red-600">Thiết bị khẩn cấp</CardTitle>
                <p className="text-sm text-muted-foreground">Hết hạn trong 7 ngày tới</p>
              </CardHeader>
              <CardContent>
                {expiryStatistics && expiryStatistics.criticalDevices.length > 0 ? (
                  <div className="space-y-3">
                    {expiryStatistics.criticalDevices.map((device) => (
                      <div key={device.id} className="p-3 border border-red-200 rounded-lg bg-red-50">
                        <div className="font-medium text-red-800">{device.name}</div>
                        <div className="text-sm text-red-600">{device.wardName} - {device.location}</div>
                        <div className="text-sm text-red-600">
                          {device.assignedToName && device.assignedToName !== device.wardName ? (
                            <span>Người dùng: {device.assignedToName}</span>
                          ) : (
                            <span>Chưa phân bổ</span>
                          )}
                        </div>
                        <div className="text-sm font-bold text-red-700">
                          Còn {device.daysUntilExpiry} ngày
                        </div>
                        <div className="text-xs text-red-500">
                          Hết hạn: {device.expiryDate.toLocaleDateString('vi-VN')}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <AlertTriangle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>Không có thiết bị khẩn cấp</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Warning Devices */}
            <Card>
              <CardHeader>
                <CardTitle className="text-yellow-600">Thiết bị cảnh báo</CardTitle>
                <p className="text-sm text-muted-foreground">Hết hạn trong 7-30 ngày</p>
              </CardHeader>
              <CardContent>
                {expiryStatistics && expiryStatistics.warningDevices.length > 0 ? (
                  <div className="space-y-3">
                    {expiryStatistics.warningDevices.map((device) => (
                      <div key={device.id} className="p-3 border border-yellow-200 rounded-lg bg-yellow-50">
                        <div className="font-medium text-yellow-800">{device.name}</div>
                        <div className="text-sm text-yellow-600">{device.wardName} - {device.location}</div>
                        <div className="text-sm text-yellow-600">
                          {device.assignedToName && device.assignedToName !== device.wardName ? (
                            <span>Người dùng: {device.assignedToName}</span>
                          ) : (
                            <span>Chưa phân bổ</span>
                          )}
                        </div>
                        <div className="text-sm font-bold text-yellow-700">
                          Còn {device.daysUntilExpiry} ngày
                        </div>
                        <div className="text-xs text-yellow-500">
                          Hết hạn: {device.expiryDate.toLocaleDateString('vi-VN')}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>Không có thiết bị cảnh báo</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Upcoming Devices */}
            <Card>
              <CardHeader>
                <CardTitle className="text-blue-600">Thiết bị sắp tới</CardTitle>
                <p className="text-sm text-muted-foreground">Hết hạn trong 30-90 ngày</p>
              </CardHeader>
              <CardContent>
                {expiryStatistics && expiryStatistics.upcomingDevices.length > 0 ? (
                  <div className="space-y-3">
                    {expiryStatistics.upcomingDevices.map((device) => (
                      <div key={device.id} className="p-3 border border-blue-200 rounded-lg bg-blue-50">
                        <div className="font-medium text-blue-800">{device.name}</div>
                        <div className="text-sm text-blue-600">{device.wardName} - {device.location}</div>
                        <div className="text-sm text-blue-600">
                          {device.assignedToName && device.assignedToName !== device.wardName ? (
                            <span>Người dùng: {device.assignedToName}</span>
                          ) : (
                            <span>Chưa phân bổ</span>
                          )}
                        </div>
                        <div className="text-sm font-bold text-blue-700">
                          Còn {device.daysUntilExpiry} ngày
                        </div>
                        <div className="text-xs text-blue-500">
                          Hết hạn: {device.expiryDate.toLocaleDateString('vi-VN')}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>Không có thiết bị sắp tới</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default StatisticsPage;
