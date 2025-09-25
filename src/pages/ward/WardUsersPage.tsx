"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, Edit, Trash2, Users, UserCheck, UserX } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getWardUsers, addWardUser, updateWardUser, deleteWardUser,assignUserToRoom ,getWardRooms } from "@/lib/services/wardService";
import { useAuth } from "@/contexts/AuthContext";

import type { WardUser } from "@/lib/services/wardService";
import type { WardRoom } from "@/lib/services/wardRoomService";

const WardUsersPage = () => {
  const { user } = useAuth();
  const wardId = user?.wardId; // phường của người đăng nhập
  const [users, setUsers] = useState<WardUser[]>([]);
  const { toast } = useToast();
  const [rooms, setRooms] = useState<WardRoom[]>([]);

  const [searchTerm, setSearchTerm] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  const [newUser, setNewUser] = useState({
    userName: "",
    userEmail: "",
    role: "user" as "ward" | "user",
  });

  // Lấy danh sách users
  useEffect(() => {
    if (!wardId) return;
  
    const fetchUsers = async () => {
      try {
        const list = await getWardUsers(wardId);
        setUsers(list);
      } catch (err) {
        console.error("Lỗi load users:", err);
      }
    };
  
    fetchUsers();
  }, [wardId]);
  useEffect(() => {
  if (!wardId) return;
  getWardRooms(wardId).then(setRooms);
}, [wardId]);

  const fetchUsers = async () => {
    if (!wardId) return;
    const list = await getWardUsers(wardId);
    setUsers(list);
  };

  const filteredUsers = users.filter((u) =>
    (u.userName?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
    (u.userEmail?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
    (u.role?.toLowerCase() || "").includes(searchTerm.toLowerCase())
  );
  {filteredUsers.length === 0 ? (
    <p className="text-center text-muted-foreground py-4">Chưa có dữ liệu</p>
  ) : (
    <Table>...</Table>
  )}
  
  const handleAddUser = async () => {
    if (!wardId) return;
    try {
      const createdId = await addWardUser(
        wardId,
        `Ward ${wardId}`, // wardName
        newUser.userName, // userId
        newUser.userName, // userName
        newUser.userEmail,
        newUser.role
      );
      await fetchUsers();
      setIsAddDialogOpen(false);
      setNewUser({ userName: "", userEmail: "", role: "user" });
      toast({
        title: "Thêm người dùng thành công",
        description: `${newUser.userName} đã được thêm`,
      });
    } catch (err) {
      toast({
        title: "Lỗi",
        description: "Không thể thêm người dùng",
        variant: "destructive",
      });
    }
  };

  const handleToggleStatus = async (u: WardUser) => {
    try {
      await updateWardUser(wardId!, u.id, { isActive: !u.isActive });
      setUsers(users.map(user => user.id === u.id ? { ...user, isActive: !user.isActive } : user));
      toast({
        title: "Cập nhật trạng thái",
        description: `Trạng thái ${u.userName} đã được cập nhật`,
      });
    } catch {
      toast({ title: "Lỗi", description: "Không thể cập nhật trạng thái", variant: "destructive" });
    }
  };

  const handleDeleteUser = async (u: WardUser) => {
    try {
      await deleteWardUser(wardId!, u.id);
      setUsers(users.filter(user => user.id !== u.id));
      toast({ title: "Xóa thành công", description: `${u.userName} đã bị xóa` });
    } catch {
      toast({ title: "Lỗi", description: "Không thể xóa người dùng", variant: "destructive" });
    }
  };

  const roleDisplay = (role: "ward" | "user") => (role === "ward" ? "Quản lý Ward" : "Người dùng thiết bị");
  const roleColor = (role: "ward" | "user") => (role === "ward" ? "bg-blue-100 text-blue-800" : "bg-green-100 text-green-800");

  return (
    <div className="space-y-6">
      {/* Header + Add User */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Quản lý người dùng</h1>
          <p className="text-muted-foreground">Quản lý người dùng trong phường/xã</p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="flex items-center space-x-2"><Plus className="h-4 w-4" /><span>Thêm người dùng</span></Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Thêm người dùng</DialogTitle>
              <DialogDescription>Tạo tài khoản người dùng mới</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Tên đăng nhập</Label>
                <Input value={newUser.userName} onChange={e => setNewUser({ ...newUser, userName: e.target.value })} placeholder="VD: nguyen_van_a" />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input type="email" value={newUser.userEmail} onChange={e => setNewUser({ ...newUser, userEmail: e.target.value })} placeholder="VD: nguyenvana@email.com" />
              </div>
              <div className="space-y-2">
                <Label>Vai trò</Label>
                <Select value={newUser.role} onValueChange={(value: "ward" | "user") => setNewUser({ ...newUser, role: value })}>
                  <SelectTrigger><SelectValue placeholder="Chọn vai trò" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ward">Quản lý Ward</SelectItem>
                    <SelectItem value="user">Người dùng thiết bị</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Hủy</Button>
              <Button onClick={handleAddUser}>Thêm</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex justify-between"><CardTitle>Tổng người dùng</CardTitle><Users className="h-4 w-4 text-muted-foreground" /></CardHeader>
          <CardContent><div className="text-2xl font-bold">{users.length}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex justify-between"><CardTitle>Đang hoạt động</CardTitle><UserCheck className="h-4 w-4 text-success" /></CardHeader>
          <CardContent><div className="text-2xl font-bold text-success">{users.filter(u => u.isActive).length}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex justify-between"><CardTitle>Không hoạt động</CardTitle><UserX className="h-4 w-4 text-destructive" /></CardHeader>
          <CardContent><div className="text-2xl font-bold text-destructive">{users.filter(u => !u.isActive).length}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex justify-between"><CardTitle>Người dùng thiết bị</CardTitle><Users className="h-4 w-4 text-primary" /></CardHeader>
          <CardContent><div className="text-2xl font-bold text-primary">{users.filter(u => u.role === "user").length}</div></CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card>
        <CardHeader><CardTitle>Tìm kiếm</CardTitle></CardHeader>
        <CardContent className="flex items-center space-x-2">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input placeholder="Tìm kiếm người dùng..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="max-w-md" />
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
  <CardHeader>
    <CardTitle>Danh sách người dùng ({filteredUsers.length})</CardTitle>
  </CardHeader>
  <CardContent>
    {filteredUsers.length === 0 ? (
      <p className="text-center text-muted-foreground py-4">Chưa có dữ liệu</p>
    ) : (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Thông tin cơ bản</TableHead>
            <TableHead>Liên hệ</TableHead>
            <TableHead>Vai trò</TableHead>
            <TableHead>Trạng thái</TableHead>
            <TableHead>Thao tác</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredUsers.map(u => (
            <TableRow key={u.id}>
              <TableCell>
                <p className="font-medium">{u.userName}</p>
                <p className="text-sm text-muted-foreground">@{u.userName}</p>
              </TableCell>
              <TableCell>{u.userEmail}</TableCell>
              <TableCell><Badge className={roleColor(u.role)}>{roleDisplay(u.role)}</Badge></TableCell>
              <TableCell><Badge variant={u.isActive ? "default" : "secondary"}>{u.isActive ? "Hoạt động" : "Không hoạt động"}</Badge></TableCell>
              <TableCell className="flex space-x-2">
                <Button variant="outline" size="sm"><Edit className="h-4 w-4" /></Button>
                <Button variant={u.isActive ? "outline" : "default"} size="sm" onClick={() => handleToggleStatus(u)}>
                  {u.isActive ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                </Button>
                <Button variant="destructive" size="sm" onClick={() => handleDeleteUser(u)}><Trash2 className="h-4 w-4" /></Button>
              </TableCell>
              <TableCell className="flex space-x-2">
              <Select
                onValueChange={async (roomId) => {
                  const room = rooms.find(r => r.id === roomId);
                  if (!room) return;
                  try {
                    await assignUserToRoom(u.id, room.id, room.name);

                    setUsers(users.map(user => user.id === u.id ? { ...user, roomId: room.id, roomName: room.name } : user));
                    toast({ title: "Đã gán phòng", description: `${u.userName} → ${room.name}` });
                  } catch {
                    toast({ title: "Lỗi", description: "Không thể gán phòng", variant: "destructive" });
                  }
                }}
              >
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder={u.roomName || "Chọn phòng"} />
                </SelectTrigger>
                <SelectContent>
                  {rooms.map(r => (
                    <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                  ))}
                  <SelectItem value="none">--- Bỏ gán ---</SelectItem>
                </SelectContent>
              </Select>

              {/* <Button variant="destructive" size="sm" onClick={() => handleDeleteUser(u)}>
                <Trash2 className="h-4 w-4" />
              </Button> */}
            </TableCell>

            </TableRow>
          ))}
        </TableBody>
      </Table>
    )}
  </CardContent>
</Card>
    </div>
  );
};

export default WardUsersPage;
