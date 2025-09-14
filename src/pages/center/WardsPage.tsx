import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Search, Edit, Trash2, Users, Phone, Mail } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

// Import API Firestore
import { getWards, createWard, deleteWard, type Ward } from '@/lib/services/wardService';

const WardsPage = () => {
  const [wards, setWards] = useState<Ward[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const { toast } = useToast();

  const [newWard, setNewWard] = useState({
    name: '',
    code: '',
    district: '',
    city: '',
    address: '',
    phone: '',
    email: '',
    population: 0,
    area: 0,
    description: '',
    contactPerson: '', // thêm trường này
  });

  // Load wards từ Firestore
  useEffect(() => {
    const fetchWards = async () => {
      try {
        const data = await getWards();
        setWards(data);
      } catch (error) {
        console.error('Error fetching wards:', error);
        toast({
          title: "Lỗi tải dữ liệu",
          description: "Không thể tải danh sách phường/xã.",
          variant: "destructive",
        });
      }
    };
    fetchWards();
  }, [toast]);

  const filteredWards = wards.filter(ward =>
    ward.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    ward.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
    ward.district.toLowerCase().includes(searchTerm.toLowerCase()) ||
    ward.city.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAddWard = async () => {
    try {
      const wardData = {
        ...newWard,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const createdWardId = await createWard(wardData);
      // Refresh wards list after adding
      const updatedWards = await getWards();
      setWards(updatedWards);
      setIsAddDialogOpen(false);
      setNewWard({
        name: '',
        code: '',
        district: '',
        city: '',
        address: '',
        phone: '',
        email: '',
        population: 0,
        area: 0,
        description: '',
        contactPerson: '', // thêm trường này
      });

      toast({
        title: "Thêm phường thành công",
        description: `${wardData.name} đã được thêm vào hệ thống.`,
      });
    } catch (error) {
      console.error('Error adding ward:', error);
      toast({
        title: "Lỗi thêm phường",
        description: "Không thể thêm phường/xã mới.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteWard = async (wardId: string) => {
    try {
      await deleteWard(wardId);
      setWards(wards.filter(w => w.id !== wardId));
      toast({
        title: "Xóa phường thành công",
        description: "Phường đã được xóa khỏi hệ thống.",
      });
    } catch (error) {
      console.error('Error deleting ward:', error);
      toast({
        title: "Lỗi xóa phường",
        description: "Không thể xóa phường/xã.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Quản lý phường/xã</h1>
          <p className="text-muted-foreground">Quản lý thông tin các phường/xã trong hệ thống</p>
        </div>

        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="flex items-center space-x-2">
              <Plus className="h-4 w-4" />
              <span>Thêm phường/xã</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Thêm phường/xã mới</DialogTitle>
              <DialogDescription>
                Nhập thông tin chi tiết cho phường/xã mới
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Tên phường/xã</Label>
                <Input
                  id="name"
                  value={newWard.name}
                  onChange={(e) => setNewWard({...newWard, name: e.target.value})}
                  placeholder="VD: Phường Ba Đình"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Địa chỉ</Label>
                <Input
                  id="address"
                  value={newWard.address}
                  onChange={(e) => setNewWard({...newWard, address: e.target.value})}
                  placeholder="VD: 123 Đường Ba Đình, Quận Ba Đình, Hà Nội"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="code">Mã phường</Label>
                <Input
                  id="code"
                  value={newWard.code}
                  onChange={(e) => setNewWard({...newWard, code: e.target.value})}
                  placeholder="VD: P001"
                />
              </div>
              <div className="space-y-2">
              <Label htmlFor="contactPerson">Người liên hệ</Label>
              <Input
                id="contactPerson"
                value={newWard.contactPerson}
                onChange={(e) => setNewWard({ ...newWard, contactPerson: e.target.value })}
                placeholder="Tên người liên hệ"
              />
            </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Số điện thoại</Label>
                <Input
                  id="phone"
                  value={newWard.phone}
                  onChange={(e) => setNewWard({...newWard, phone: e.target.value})}
                  placeholder="VD: 024-1234-5678"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={newWard.email}
                  onChange={(e) => setNewWard({...newWard, email: e.target.value})}
                  placeholder="VD: badinh@hanoi.gov.vn"
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                Hủy
              </Button>
              <Button onClick={handleAddWard}>
                Thêm phường/xã
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tổng phường/xã</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{wards.length}</div>
            <p className="text-xs text-muted-foreground">
              Đang quản lý trong hệ thống
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Đã cấp thiết bị</CardTitle>
            <Users className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">2</div>
            <p className="text-xs text-muted-foreground">
              Phường/xã có thiết bị
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
              placeholder="Tìm kiếm phường/xã..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-md"
            />
          </div>
        </CardContent>
      </Card>

      {/* Wards Table */}
      <Card>
        <CardHeader>
          <CardTitle>Danh sách phường/xã ({filteredWards.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tên phường/xã</TableHead>
                <TableHead>Địa chỉ</TableHead>
                <TableHead>Người liên hệ</TableHead>
                <TableHead>Thông tin liên hệ</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead>Thao tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredWards.map((ward) => (
                <TableRow key={ward.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{ward.name}</p>
                      <p className="text-sm text-muted-foreground">ID: {ward.id}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <p className="text-sm">{ward.address}</p>
                  </TableCell>
                  <TableCell>
                  <p className="font-medium">{ward.contactPerson || '-'}</p>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{ward.phone}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{ward.email}</span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="default">Hoạt động</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Button variant="outline" size="sm">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="destructive" 
                        size="sm"
                        onClick={() => handleDeleteWard(ward.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
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

export default WardsPage;
