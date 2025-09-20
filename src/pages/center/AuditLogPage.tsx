import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { 
  Activity, 
  Search, 
  Filter, 
  Download, 
  RefreshCw, 
  Eye, 
  User,
  Shield,
  Settings,
  Users
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { 
  getAuditLogs, 
  getAuditLogStatistics, 
  AuditLog, 
  AuditLogFilters,
  AUDIT_ACTIONS,
  AUDIT_RESOURCES
} from '@/lib/services/auditLogService';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

const AuditLogPage: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [statistics, setStatistics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  
  // Filters
  const [filters, setFilters] = useState<AuditLogFilters>({
    limit: 100
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAction, setSelectedAction] = useState<string>('all');
  const [selectedResource, setSelectedResource] = useState<string>('all');
  const [selectedRole, setSelectedRole] = useState<string>('all');
  const [dateRange, setDateRange] = useState<string>('7d');
  
  const { toast } = useToast();
  const { user } = useAuth();

  // Chỉ cho phép center role truy cập
  if (!user || user.role !== 'center') {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Shield className="h-12 w-12 mx-auto mb-4 text-red-500" />
          <h2 className="text-xl font-semibold text-red-600">Không có quyền truy cập</h2>
          <p className="text-muted-foreground">Chỉ có role Center mới được xem log thao tác</p>
        </div>
      </div>
    );
  }

  const loadLogs = async () => {
    try {
      setLoading(true);
      const [logsData, statsData] = await Promise.all([
        getAuditLogs(filters),
        getAuditLogStatistics(filters)
      ]);
      
      setLogs(logsData);
      setStatistics(statsData);
    } catch (error: any) {
      toast({
        title: 'Lỗi',
        description: error.message || 'Không thể tải log thao tác',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };


  const applyFilters = () => {
    const newFilters: AuditLogFilters = {
      limit: 100
    };

    // Only apply date range filter to server request
    if (dateRange !== 'all') {
      const now = new Date();
      const days = dateRange === '7d' ? 7 : dateRange === '30d' ? 30 : 90;
      newFilters.startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    }

    setFilters(newFilters);
  };

  const getFilteredLogs = () => {
    let filtered = logs;

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(log => 
        log.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.resource.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (log.details && JSON.stringify(log.details).toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    // Apply action filter
    if (selectedAction !== 'all') {
      filtered = filtered.filter(log => log.action === selectedAction);
    }

    // Apply resource filter
    if (selectedResource !== 'all') {
      filtered = filtered.filter(log => log.resource === selectedResource);
    }

    // Apply role filter
    if (selectedRole !== 'all') {
      filtered = filtered.filter(log => log.userRole === selectedRole);
    }

    return filtered;
  };

  const getActionDisplayName = (action: string) => {
    const actionMap: { [key: string]: string } = {
      [AUDIT_ACTIONS.LOGIN]: 'Đăng nhập',
      [AUDIT_ACTIONS.LOGOUT]: 'Đăng xuất'
    };
    return actionMap[action] || action;
  };

  const getResourceDisplayName = (resource: string) => {
    const resourceMap: { [key: string]: string } = {
      [AUDIT_RESOURCES.SYSTEM]: 'Hệ thống'
    };
    return resourceMap[resource] || resource;
  };

  const getActionIcon = (action: string) => {
    if (action.includes('login') || action.includes('logout')) return User;
    return Activity;
  };

  const getActionColor = (action: string) => {
    if (action.includes('login')) return 'bg-green-100 text-green-800';
    if (action.includes('logout')) return 'bg-red-100 text-red-800';
    return 'bg-gray-100 text-gray-800';
  };

  useEffect(() => {
    loadLogs();
  }, [filters]);

  useEffect(() => {
    applyFilters();
  }, [dateRange]);

  const filteredLogs = getFilteredLogs();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Đang tải log thao tác...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Log Thao Tác</h1>
          <p className="text-muted-foreground">
            Theo dõi và giám sát tất cả hoạt động trong hệ thống
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={loadLogs} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Tải lại
          </Button>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Xuất Excel
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      {statistics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-l-4 border-l-blue-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tổng số log</CardTitle>
              <Activity className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{statistics.totalLogs}</div>
              <p className="text-xs text-muted-foreground">Hoạt động được ghi lại</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-green-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Người dùng hoạt động</CardTitle>
              <Users className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{Object.keys(statistics.logsByUser).length}</div>
              <p className="text-xs text-muted-foreground">Người dùng có hoạt động</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-purple-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Loại thao tác</CardTitle>
              <Settings className="h-4 w-4 text-purple-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">{Object.keys(statistics.logsByAction).length}</div>
              <p className="text-xs text-muted-foreground">Loại thao tác khác nhau</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-orange-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tài nguyên</CardTitle>
              <Activity className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{Object.keys(statistics.logsByResource).length}</div>
              <p className="text-xs text-muted-foreground">Loại tài nguyên</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Bộ lọc
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Tìm kiếm</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Tìm kiếm..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Thao tác</label>
              <Select value={selectedAction} onValueChange={setSelectedAction}>
                <SelectTrigger>
                  <SelectValue placeholder="Chọn thao tác" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả thao tác</SelectItem>
                  <SelectItem value={AUDIT_ACTIONS.LOGIN}>Đăng nhập</SelectItem>
                  <SelectItem value={AUDIT_ACTIONS.LOGOUT}>Đăng xuất</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Tài nguyên</label>
              <Select value={selectedResource} onValueChange={setSelectedResource}>
                <SelectTrigger>
                  <SelectValue placeholder="Chọn tài nguyên" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả tài nguyên</SelectItem>
                  <SelectItem value={AUDIT_RESOURCES.SYSTEM}>Hệ thống</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Vai trò</label>
              <Select value={selectedRole} onValueChange={setSelectedRole}>
                <SelectTrigger>
                  <SelectValue placeholder="Chọn vai trò" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả vai trò</SelectItem>
                  <SelectItem value="center">Center</SelectItem>
                  <SelectItem value="ward">Ward</SelectItem>
                  <SelectItem value="user">User</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Khoảng thời gian</label>
              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger>
                  <SelectValue placeholder="Chọn thời gian" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả</SelectItem>
                  <SelectItem value="7d">7 ngày qua</SelectItem>
                  <SelectItem value="30d">30 ngày qua</SelectItem>
                  <SelectItem value="90d">90 ngày qua</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="logs" className="space-y-4">
        <TabsList>
          <TabsTrigger value="logs">Danh sách log</TabsTrigger>
          <TabsTrigger value="statistics">Thống kê</TabsTrigger>
          <TabsTrigger value="charts">Biểu đồ</TabsTrigger>
        </TabsList>

        <TabsContent value="logs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Danh sách Log Thao Tác</CardTitle>
              <p className="text-sm text-muted-foreground">
                Hiển thị {filteredLogs.length} trong tổng số {logs.length} log
              </p>
            </CardHeader>
            <CardContent>
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Thời gian</TableHead>
                      <TableHead>Người dùng</TableHead>
                      <TableHead>Thao tác</TableHead>
                      <TableHead>Tài nguyên</TableHead>
                      <TableHead>Chi tiết</TableHead>
                      <TableHead>Hành động</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLogs.map((log) => {
                      const ActionIcon = getActionIcon(log.action);
                      return (
                        <TableRow key={log.id}>
                          <TableCell>
                            <div className="text-sm">
                              {log.timestamp.toLocaleString('vi-VN')}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <div className="font-medium">{log.userName}</div>
                              <div className="text-sm text-muted-foreground">{log.userEmail}</div>
                              <Badge variant="outline" className="text-xs">
                                {log.userRole}
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <ActionIcon className="h-4 w-4" />
                              <Badge className={getActionColor(log.action)}>
                                {getActionDisplayName(log.action)}
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary">
                              {getResourceDisplayName(log.resource)}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="max-w-xs">
                              {log.details ? (
                                <div className="text-xs text-muted-foreground">
                                  {Object.keys(log.details).length > 0 ? (
                                    <span>
                                      {Object.keys(log.details).slice(0, 2).join(', ')}
                                      {Object.keys(log.details).length > 2 && '...'}
                                    </span>
                                  ) : '-'}
                                </div>
                              ) : '-'}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedLog(log);
                                setIsDetailDialogOpen(true);
                              }}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                      {filteredLogs.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={6} className="p-8 text-center text-muted-foreground">
                            <div className="flex flex-col items-center space-y-2">
                              <Activity className="h-8 w-8 opacity-50" />
                              <p>Không có log thao tác nào</p>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="statistics" className="space-y-4">
          {statistics && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Thao tác phổ biến</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {Object.entries(statistics.logsByAction)
                      .sort(([,a], [,b]) => (b as number) - (a as number))
                      .slice(0, 10)
                      .map(([action, count]) => (
                        <div key={action} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {React.createElement(getActionIcon(action), { className: "h-4 w-4" })}
                            <span className="text-sm">{getActionDisplayName(action)}</span>
                          </div>
                          <Badge variant="secondary">{count as number}</Badge>
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Người dùng hoạt động</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {Object.entries(statistics.logsByUser)
                      .sort(([,a], [,b]) => (b as number) - (a as number))
                      .slice(0, 10)
                      .map(([userName, count]) => (
                        <div key={userName} className="flex items-center justify-between">
                          <span className="text-sm">{userName}</span>
                          <Badge variant="secondary">{count as number}</Badge>
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Phân bố theo vai trò</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {Object.entries(statistics.logsByRole).map(([role, count]) => (
                      <div key={role} className="flex items-center justify-between">
                        <span className="text-sm capitalize">{role}</span>
                        <Badge variant="secondary">{count as number}</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Tài nguyên được truy cập</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {Object.entries(statistics.logsByResource).map(([resource, count]) => (
                      <div key={resource} className="flex items-center justify-between">
                        <span className="text-sm">{getResourceDisplayName(resource)}</span>
                        <Badge variant="secondary">{String(count)}</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="charts" className="space-y-4">
          {statistics && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Thao tác theo thời gian</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={Object.entries(statistics.logsByAction).map(([action, count]) => ({
                      action: getActionDisplayName(action),
                      count
                    }))}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="action" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="count" fill="#8884d8" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Phân bố theo vai trò</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={Object.entries(statistics.logsByRole).map(([role, count]) => ({
                          name: role,
                          value: count
                        }))}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {Object.entries(statistics.logsByRole).map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Detail Dialog */}
      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Chi tiết Log Thao Tác</DialogTitle>
            <DialogDescription>
              Thông tin chi tiết về hoạt động được ghi lại
            </DialogDescription>
          </DialogHeader>
          {selectedLog && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Thời gian</label>
                  <p className="text-sm">{selectedLog.timestamp.toLocaleString('vi-VN')}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">ID Log</label>
                  <p className="text-sm font-mono">{selectedLog.id}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Người dùng</label>
                  <p className="text-sm">{selectedLog.userName} ({selectedLog.userEmail})</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Vai trò</label>
                  <Badge variant="outline">{selectedLog.userRole}</Badge>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Thao tác</label>
                  <p className="text-sm">{getActionDisplayName(selectedLog.action)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Tài nguyên</label>
                  <p className="text-sm">{getResourceDisplayName(selectedLog.resource)}</p>
                </div>
              </div>

              {selectedLog.resourceId && (
                <div>
                  <label className="text-sm font-medium">ID Tài nguyên</label>
                  <p className="text-sm font-mono">{selectedLog.resourceId}</p>
                </div>
              )}

              {selectedLog.wardName && (
                <div>
                  <label className="text-sm font-medium">Phường</label>
                  <p className="text-sm">{selectedLog.wardName}</p>
                </div>
              )}

              {selectedLog.details && (
                <div>
                  <label className="text-sm font-medium">Chi tiết</label>
                  <div className="bg-muted p-3 rounded-md space-y-2">
                    {Object.entries(selectedLog.details).map(([key, value]) => (
                      <div key={key} className="flex items-start gap-2">
                        <span className="text-sm font-medium text-muted-foreground min-w-[120px]">
                          {key === 'ipAddress' ? 'Địa chỉ IP' :
                           key === 'userAgent' ? 'Trình duyệt' :
                           key === 'timestamp' ? 'Thời gian' :
                           key === 'deviceName' ? 'Tên thiết bị' :
                           key === 'deviceType' ? 'Loại thiết bị' :
                           key === 'quantity' ? 'Số lượng' :
                           key === 'reason' ? 'Lý do' :
                           key === 'issue' ? 'Vấn đề' :
                           key === 'priority' ? 'Độ ưu tiên' :
                           key === 'status' ? 'Trạng thái' :
                           key === 'notes' ? 'Ghi chú' :
                           key === 'location' ? 'Vị trí' :
                           key === 'wardName' ? 'Tên phường' :
                           key === 'targetUserName' ? 'Người dùng đích' :
                           key.charAt(0).toUpperCase() + key.slice(1)}:
                        </span>
                        <span className="text-sm flex-1">
                          {key === 'userAgent' ? (
                            <span className="text-xs text-muted-foreground break-all">
                              {String(value)}
                            </span>
                          ) : key === 'timestamp' ? (
                            <span className="text-sm">
                              {new Date(String(value)).toLocaleString('vi-VN')}
                            </span>
                          ) : (
                            <span className="text-sm">{String(value)}</span>
                          )}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AuditLogPage;
