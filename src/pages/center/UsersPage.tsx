import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Search, Edit, Trash2, Users, Phone, Mail, UserCog, Shield, UserCheck, UserX } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

// Import API Firestore
import { 
  getUsers, 
  createUser,
  updateUserProfile, 
  deactivateUser, 
  activateUser, 
  getUserStats,
  searchUsers,
  getUserRoleDisplayName,
  getUserRoleColor,
  getUserStatusColor,
  type UserProfile 
} from '@/lib/services/userService';
import { getWards, type Ward } from '@/lib/services/wardService';

const UsersPage = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [wards, setWards] = useState<Ward[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [stats, setStats] = useState<any>(null);
  const { toast } = useToast();
  const { user: currentUser } = useAuth();

  const [newUser, setNewUser] = useState({
    email: '',
    password: '',
    displayName: '',
    firstName: '',
    lastName: '',
    phone: '',
    role: 'user' as 'center' | 'ward' | 'user',
    wardId: '',
    wardName: '',
  });

  const [editUser, setEditUser] = useState({
    displayName: '',
    firstName: '',
    lastName: '',
    phone: '',
    role: 'user' as 'center' | 'ward' | 'user',
    wardId: '',
    wardName: '',
    isActive: true,
  });

  // Load users và wards từ Firestore
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [usersData, wardsData, statsData] = await Promise.all([
          getUsers(),
          getWards(),
          getUserStats()
        ]);
        setUsers(usersData);
        setWards(wardsData);
        setStats(statsData);
      } catch (error) {
        console.error('Error fetching data:', error);
        toast({
          title: "Lỗi tải dữ liệu",
          description: "Không thể tải danh sách người dùng.",
          variant: "destructive",
        });
      }
    };
    fetchData();
  }, [toast]);

  const filteredUsers = users.filter(user =>
    user.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (user.firstName && user.firstName.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (user.lastName && user.lastName.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleAddUser = async () => {
    try {
      // Tạo tài khoản mới
      await createUser(
        newUser.email,
        newUser.password,
        newUser.displayName,
        newUser.role,
        newUser.wardId || undefined,
        newUser.wardName || undefined,
        {
          firstName: newUser.firstName,
          lastName: newUser.lastName,
          phone: newUser.phone,
        }
      );

      // Refresh users list
      const updatedUsers = await getUsers();
      setUsers(updatedUsers);
      setIsAddDialogOpen(false);
      setNewUser({
        email: '',
        password: '',
        displayName: '',
        firstName: '',
        lastName: '',
        phone: '',
        role: 'user',
        wardId: '',
        wardName: '',
      });

      toast({
        title: "Thêm tài khoản thành công",
        description: `Tài khoản ${newUser.displayName} đã được tạo thành công.`,
      });
    } catch (error: any) {
      console.error('Error adding user:', error);
      toast({
        title: "Lỗi thêm tài khoản",
        description: error.message || "Không thể tạo tài khoản mới.",
        variant: "destructive",
      });
    }
  };

  const openEditUser = (user: UserProfile) => {
    setEditingUserId(user.id);
    setEditUser({
      displayName: user.displayName || '',
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      phone: user.phone || '',
      role: user.role,
      wardId: user.wardId || '',
      wardName: user.wardName || '',
      isActive: user.isActive,
    });
    setIsEditDialogOpen(true);
  };

  const handleUpdateUser = async () => {
    if (!editingUserId) return;
    try {
      await updateUserProfile(editingUserId, {
        displayName: editUser.displayName,
        firstName: editUser.firstName,
        lastName: editUser.lastName,
        phone: editUser.phone,
        wardId: editUser.wardId || undefined,
        wardName: editUser.wardName || undefined,
      });
      
      const updated = await getUsers();
      setUsers(updated);
      setIsEditDialogOpen(false);
      setEditingUserId(null);
      
      toast({
        title: 'Cập nhật thành công',
        description: 'Thông tin tài khoản đã được cập nhật.',
      });
    } catch (error) {
      console.error('Error updating user:', error);
      toast({
        title: 'Lỗi cập nhật',
        description: 'Không thể cập nhật thông tin tài khoản.',
        variant: 'destructive',
      });
    }
  };

  const handleToggleUserStatus = async (userId: string, isActive: boolean) => {
    try {
      if (isActive) {
        await deactivateUser(userId);
        toast({
          title: "Vô hiệu hóa tài khoản",
          description: "Tài khoản đã được vô hiệu hóa.",
        });
      } else {
        await activateUser(userId);
        toast({
          title: "Kích hoạt tài khoản",
          description: "Tài khoản đã được kích hoạt.",
        });
      }
      
      const updated = await getUsers();
      setUsers(updated);
    } catch (error) {
      console.error('Error toggling user status:', error);
      toast({
        title: "Lỗi thay đổi trạng thái",
        description: "Không thể thay đổi trạng thái tài khoản.",
        variant: "destructive",
      });
    }
  };

  const getWardName = (wardId: string) => {
    const ward = wards.find(w => w.id === wardId);
    return ward ? ward.name : 'Không xác định';
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Quản lý tài khoản</h1>
          <p className="text-muted-foreground">Quản lý tài khoản người dùng trong hệ thống</p>
        </div>

        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="flex items-center space-x-2">
              <Plus className="h-4 w-4" />
              <span>Thêm tài khoản</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Thêm tài khoản mới</DialogTitle>
              <DialogDescription>
                Nhập thông tin chi tiết cho tài khoản mới
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={newUser.email}
                    onChange={(e) => setNewUser({...newUser, email: e.target.value})}
                    placeholder="user@example.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Mật khẩu</Label>
                  <Input
                    id="password"
                    type="password"
                    value={newUser.password}
                    onChange={(e) => setNewUser({...newUser, password: e.target.value})}
                    placeholder="Mật khẩu"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="displayName">Tên hiển thị</Label>
                <Input
                  id="displayName"
                  value={newUser.displayName}
                  onChange={(e) => setNewUser({...newUser, displayName: e.target.value})}
                  placeholder="Tên hiển thị"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">Họ</Label>
                  <Input
                    id="firstName"
                    value={newUser.firstName}
                    onChange={(e) => setNewUser({...newUser, firstName: e.target.value})}
                    placeholder="Họ"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Tên</Label>
                  <Input
                    id="lastName"
                    value={newUser.lastName}
                    onChange={(e) => setNewUser({...newUser, lastName: e.target.value})}
                    placeholder="Tên"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Số điện thoại</Label>
                <Input
                  id="phone"
                  value={newUser.phone}
                  onChange={(e) => setNewUser({...newUser, phone: e.target.value})}
                  placeholder="Số điện thoại"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="role">Vai trò</Label>
                <Select value={newUser.role} onValueChange={(value: 'center' | 'ward' | 'user') => setNewUser({...newUser, role: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Chọn vai trò" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="center">Trung tâm chuyển đổi số</SelectItem>
                    <SelectItem value="ward">Phường</SelectItem>
                    <SelectItem value="user">Người dùng</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {newUser.role === 'ward' || newUser.role === 'user' ? (
                <div className="space-y-2">
                  <Label htmlFor="wardId">Phường/Xã</Label>
                  <Select value={newUser.wardId} onValueChange={(value) => {
                    const ward = wards.find(w => w.id === value);
                    setNewUser({...newUser, wardId: value, wardName: ward?.name || ''});
                  }}>
                    <SelectTrigger>
                      <SelectValue placeholder="Chọn phường/xã" />
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
              ) : null}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                Hủy
              </Button>
              <Button onClick={handleAddUser}>
                Thêm tài khoản
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tổng tài khoản</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.total || 0}</div>
            <p className="text-xs text-muted-foreground">
              Tài khoản trong hệ thống
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Đang hoạt động</CardTitle>
            <UserCheck className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats?.active || 0}</div>
            <p className="text-xs text-muted-foreground">
              Tài khoản đang hoạt động
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Bị vô hiệu hóa</CardTitle>
            <UserX className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats?.inactive || 0}</div>
            <p className="text-xs text-muted-foreground">
              Tài khoản bị vô hiệu hóa
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Đăng nhập gần đây</CardTitle>
            <Shield className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats?.recentLogins || 0}</div>
            <p className="text-xs text-muted-foreground">
              Trong 7 ngày qua
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card>
        <CardHeader>
          <CardTitle>Tìm kiếm</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Tìm kiếm tài khoản..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-md"
            />
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle>Danh sách tài khoản ({filteredUsers.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tài khoản</TableHead>
                <TableHead>Thông tin liên hệ</TableHead>
                <TableHead>Vai trò</TableHead>
                <TableHead>Phường/Xã</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead>Thao tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{user.displayName}</p>
                      <p className="text-sm text-muted-foreground">{user.email}</p>
                      {user.firstName && user.lastName && (
                        <p className="text-sm text-muted-foreground">
                          {user.firstName} {user.lastName}
                        </p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {user.phone && (
                      <div className="flex items-center space-x-2">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{user.phone}</span>
                      </div>
                    )}
                    <div className="flex items-center space-x-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{user.email}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={getUserRoleColor(user.role)}>
                      {getUserRoleDisplayName(user.role)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm">
                      {user.wardId ? getWardName(user.wardId) : '-'}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge className={getUserStatusColor(user.isActive)}>
                      {user.isActive ? 'Hoạt động' : 'Vô hiệu hóa'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Button variant="outline" size="sm" onClick={() => openEditUser(user)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant={user.isActive ? "destructive" : "default"} 
                        size="sm"
                        onClick={() => handleToggleUserStatus(user.id, user.isActive)}
                        disabled={user.id === currentUser?.id}
                      >
                        {user.isActive ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edit User Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Chỉnh sửa thông tin tài khoản</DialogTitle>
            <DialogDescription>
              Chỉnh sửa các thông tin cần thiết rồi lưu lại
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-displayName">Tên hiển thị</Label>
              <Input 
                id="edit-displayName" 
                value={editUser.displayName} 
                onChange={(e) => setEditUser({ ...editUser, displayName: e.target.value })} 
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-firstName">Họ</Label>
                <Input 
                  id="edit-firstName" 
                  value={editUser.firstName} 
                  onChange={(e) => setEditUser({ ...editUser, firstName: e.target.value })} 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-lastName">Tên</Label>
                <Input 
                  id="edit-lastName" 
                  value={editUser.lastName} 
                  onChange={(e) => setEditUser({ ...editUser, lastName: e.target.value })} 
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="edit-phone">Số điện thoại</Label>
              <Input 
                id="edit-phone" 
                value={editUser.phone} 
                onChange={(e) => setEditUser({ ...editUser, phone: e.target.value })} 
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-wardId">Phường/Xã</Label>
              <Select 
                value={editUser.wardId} 
                onValueChange={(value) => {
                  const ward = wards.find(w => w.id === value);
                  setEditUser({...editUser, wardId: value, wardName: ward?.name || ''});
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Chọn phường/xã" />
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
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Hủy</Button>
            <Button onClick={handleUpdateUser}>Lưu thay đổi</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UsersPage;
