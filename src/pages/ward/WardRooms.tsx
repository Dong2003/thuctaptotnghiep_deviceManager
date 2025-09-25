import React, { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Edit, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  getWardRooms,
  addWardRoom,
  updateWardRoom,
  deleteWardRoom,
  WardRoom,
} from "@/lib/services/wardRoomService";
import {
  getWardUsers,
  assignUserToRoom,
  WardUser,
  getUnassignedUsers,
} from "@/lib/services/wardService";
import { useAuth } from "@/contexts/AuthContext";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function WardRooms() {
  const { user } = useAuth();
  const wardId = user?.wardId;

  const [rooms, setRooms] = useState<WardRoom[]>([]);
  const [loading, setLoading] = useState(false);

  // dialog thêm/sửa phòng
  const [openRoomDialog, setOpenRoomDialog] = useState(false);
  const [editingRoom, setEditingRoom] = useState<WardRoom | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  // mở rộng phòng để xem user
  const [expandedRoom, setExpandedRoom] = useState<string | null>(null);
  const [roomUsers, setRoomUsers] = useState<Record<string, WardUser[]>>({});

  // dialog gán user
  const [openUserDialog, setOpenUserDialog] = useState(false);
  const [users, setUsers] = useState<WardUser[]>([]);

  const [selectedRoom, setSelectedRoom] = useState<WardRoom | null>(null);
const [availableUsers, setAvailableUsers] = useState<WardUser[]>([]);


  const { toast } = useToast();

  const fetchRooms = async () => {
    if (!wardId) return;
    setLoading(true);
    try {
      const data = await getWardRooms(wardId);
      setRooms(data);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const fetchRoomUsers = async (roomId: string) => {
    try {
      const list = await getWardUsers(wardId!); // lấy toàn bộ user trong ward
      setUsers(list);
      // lọc user thuộc phòng này
      setRoomUsers((prev) => ({
        ...prev,
        [roomId]: list.filter((u) => u.roomId === roomId),
      }));
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  useEffect(() => {
    fetchRooms();
  }, [wardId]);

  const handleSaveRoom = async () => {
    if (!wardId) return;
    setLoading(true);
    try {
      if (editingRoom) {
        await updateWardRoom(editingRoom.id, { name, description });
        toast({ title: "Cập nhật phòng thành công" });
      } else {
        await addWardRoom(wardId, name, description);
        toast({ title: "Thêm phòng thành công" });
      }
      setOpenRoomDialog(false);
      setEditingRoom(null);
      setName("");
      setDescription("");
      fetchRooms();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteRoom = async (id: string) => {
    setLoading(true);
    try {
      await deleteWardRoom(id);
      toast({ title: "Xóa phòng thành công" });
      fetchRooms();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };



  const handleAssignUser = async (userId: string, roomId: string | null) => {
    try {
      const room = rooms.find((r) => r.id === roomId);
      await assignUserToRoom(userId, roomId || "", room?.name || "");
      setUsers((prev) =>
        prev.map((u) =>
          u.id === userId ? { ...u, roomId: roomId || "", roomName: room?.name || "" } : u
        )
      );
      toast({
        title: "Thành công",
        description: roomId
          ? `Đã gán user vào ${room?.name}`
          : "Đã bỏ gán phòng",
      });
      if (expandedRoom) fetchRoomUsers(expandedRoom);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row justify-between items-center">
        <CardTitle>Danh sách phòng</CardTitle>
        {/* Dialog thêm/sửa phòng */}
        <Dialog open={openRoomDialog} onOpenChange={setOpenRoomDialog}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-2" /> Thêm phòng
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingRoom ? "Cập nhật phòng" : "Thêm phòng mới"}
              </DialogTitle>
              <DialogDescription>Nhập thông tin phòng</DialogDescription>
            </DialogHeader>
            <div className="space-y-3 py-2">
              <div>
                <Label>Tên phòng</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="VD: Phòng văn hóa xã hội"
                />
              </div>
              <div>
                <Label>Mô tả</Label>
                <Input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Mô tả phòng"
                />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleSaveRoom}>
                {editingRoom ? "Cập nhật" : "Thêm"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>

      <CardContent>
        {loading ? (
          <p>Đang tải...</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tên phòng</TableHead>
                <TableHead>Mô tả</TableHead>
                <TableHead>Hành động</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rooms.map((room) => (
                <React.Fragment key={room.id}>
                  <TableRow>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            if (expandedRoom === room.id) {
                              setExpandedRoom(null);
                            } else {
                              setExpandedRoom(room.id);
                              fetchRoomUsers(room.id);
                            }
                          }}
                        >
                          {expandedRoom === room.id ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </Button>
                        <span>{room.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>{room.description || "-"}</TableCell>
                    <TableCell className="space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setEditingRoom(room);
                          setName(room.name);
                          setDescription(room.description || "");
                          setOpenRoomDialog(true);
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDeleteRoom(room.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>

                  {expandedRoom === room.id && (
                    <TableRow>
                      <TableCell colSpan={3}>
                        <div className="pl-6 py-2 space-y-2">
                          <div className="flex justify-between items-center">
                            <p className="font-medium">Người dùng trong phòng</p>
                            <Button
                            size="sm"
                            onClick={async () => {
                              setSelectedRoom(room);
                              const list = await getUnassignedUsers(wardId!);
                              setAvailableUsers(list);
                              setOpenUserDialog(true);
                            }}
                          >
                            + Thêm thành viên
                          </Button>

                          </div>

                          {roomUsers[room.id]?.length ? (
                            <ul className="list-disc list-inside space-y-1">
                              {roomUsers[room.id].map((u) => (
                                <li
                                  key={u.id}
                                  className="flex items-center justify-between"
                                >
                                  <span>
                                    {u.userName} ({u.userEmail})
                                  </span>
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    onClick={() => handleAssignUser(u.id, null)}
                                  >
                                    Xóa
                                  </Button>
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p className="text-sm text-gray-500">
                              Không có người dùng
                            </p>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </React.Fragment>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      {/* Dialog gán user */}
<Dialog open={openUserDialog} onOpenChange={setOpenUserDialog}>
  <DialogContent className="max-w-lg">
    <DialogHeader>
      <DialogTitle>Thêm thành viên vào {selectedRoom?.name}</DialogTitle>
      <DialogDescription>
        Chọn user để thêm vào phòng này
      </DialogDescription>
    </DialogHeader>

    {availableUsers.length === 0 ? (
      <p className="text-center text-gray-500">Không còn user nào để thêm</p>
    ) : (
      <ul className="space-y-2">
        {availableUsers.map((u) => (
          <li
            key={u.id}
            className="flex items-center justify-between border-b pb-2"
          >
            <div>
              <p className="font-medium">{u.userName}</p>
              <p className="text-sm text-gray-500">{u.userEmail}</p>
            </div>
            <Button
              size="sm"
              onClick={async () => {
                await handleAssignUser(u.id, selectedRoom!.id);
                // cập nhật lại list
                const list = await getUnassignedUsers(wardId!);
                setAvailableUsers(list);
                fetchRoomUsers(selectedRoom!.id);
              }}
            >
              Thêm vào phòng
            </Button>
          </li>
        ))}
      </ul>
    )}

    <DialogFooter>
      <Button variant="outline" onClick={() => setOpenUserDialog(false)}>
        Đóng
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>

    </Card>
  );
}
