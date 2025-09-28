import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Monitor, Calendar, DollarSign, Settings, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import { getDevices, type Device } from "@/lib/services/deviceService";
import { getWards, type Ward } from "@/lib/services/wardService";
import { useToast } from "@/hooks/use-toast";
import { FIELD_META, getFieldsForType, getCpuOptionsByType, getGpuOptionsByType } from "@/components/SpecEditor";

const MyDevicesPage = () => {
  const { user } = useAuth();
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [wards, setWards] = useState<Ward[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    const fetchDevices = async () => {
      if (!user?.wardId || !user?.id) return;

      try {
        setLoading(true);
        const [devicesData, wardsData] = await Promise.all([
          getDevices(user.wardId),
          getWards(),
        ]);

        // ✅ Lọc thiết bị chỉ thuộc user đang đăng nhập
        const myDevices = devicesData.filter((d) => d.assignedTo === user.id);

        setDevices(myDevices);
        setWards(wardsData);
      } catch (error: any) {
        toast({
          title: "Lỗi tải dữ liệu",
          description: error.message || "Không thể tải dữ liệu thiết bị",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchDevices();
  }, [user?.wardId, user?.id, toast]);

  const calculateUsageTime = (createdAt: Date) => {
    const startDate = new Date(createdAt);
    const currentDate = new Date();
    const diffTime = Math.abs(currentDate.getTime() - startDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 30) {
      return `${diffDays} ngày`;
    } else if (diffDays < 365) {
      return `${Math.floor(diffDays / 30)} tháng`;
    } else {
      return `${Math.floor(diffDays / 365)} năm`;
    }
  };

  // Thay thế getDeviceTypeDisplayName hiện tại:
  const DEVICE_TYPE_LABELS: Record<string, string> = {
    pc: "Máy tính để bàn",
    laptop: "Laptop",
    camera: "Camera",
    router: "Router",
    sensor: "Cảm biến",
    printer: "Máy in",
    monitor: "Màn hình",
    server: "Server",
    switch: "Switch",
    ups: "UPS",
    ip_phone: "Điện thoại IP",
    other: "Thiết bị khác",
  };

  const getDeviceTypeDisplayName = (type?: string) =>
    (type && DEVICE_TYPE_LABELS[type]) || type || "Không rõ";

  const getStatusDisplayName = (status: string) => {
    switch (status) {
      case "active":
        return "Hoạt động";
      case "inactive":
        return "Không hoạt động";
      case "maintenance":
        return "Bảo trì";
      case "error":
        return "Lỗi";
      default:
        return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800";
      case "inactive":
        return "bg-gray-100 text-gray-800";
      case "maintenance":
        return "bg-yellow-100 text-yellow-800";
      case "error":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const wardNameMap = React.useMemo(() =>
    Object.fromEntries(wards.map(w => [w.id, w.name])),
    [wards]
  );

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

  const workingDevices = devices.filter(
    (d) => d.status === "active" && d.assignedTo === user?.id
  );
  const maintenanceDevices = devices.filter(
    (d) => d.status === "maintenance" && d.assignedTo === user?.id
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Thiết bị của tôi</h1>
        <p className="text-muted-foreground">
          Danh sách thiết bị được giao cho bạn
        </p>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tổng thiết bị</CardTitle>
            <Monitor className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{devices.length}</div>
            <p className="text-xs text-muted-foreground">Thiết bị được giao</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Hoạt động tốt</CardTitle>
            <Monitor className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">
              {workingDevices.length}
            </div>
            <p className="text-xs text-muted-foreground">
              Đang sử dụng bình thường
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cần bảo trì</CardTitle>
            <Settings className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning">
              {maintenanceDevices.length}
            </div>
            <p className="text-xs text-muted-foreground">Cần kiểm tra</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Thiết bị lỗi</CardTitle>
            <Monitor className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {
                devices.filter(
                  (d) => d.status === "error" && d.assignedTo === user?.id
                ).length
              }
            </div>
            <p className="text-xs text-muted-foreground">Cần sửa chữa</p>
          </CardContent>
        </Card>
      </div>

      {/* Device Guidelines */}
      <Card>
        <CardHeader>
          <CardTitle>Hướng dẫn sử dụng thiết bị</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium mb-3 text-primary">
                Trách nhiệm của người sử dụng:
              </h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start space-x-2">
                  <span className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></span>
                  <span>Sử dụng thiết bị đúng mục đích công việc</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></span>
                  <span>Bảo quản thiết bị cẩn thận, tránh va đập</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></span>
                  <span>Không tự ý sửa chữa hoặc thay đổi cấu hình</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></span>
                  <span>Báo cáo sự cố kịp thời qua hệ thống</span>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="font-medium mb-3 text-success">Lưu ý an toàn:</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start space-x-2">
                  <span className="w-2 h-2 bg-success rounded-full mt-2 flex-shrink-0"></span>
                  <span>Không để thiết bị ở nơi ẩm ướt</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="w-2 h-2 bg-success rounded-full mt-2 flex-shrink-0"></span>
                  <span>Tắt nguồn khi không sử dụng</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="w-2 h-2 bg-success rounded-full mt-2 flex-shrink-0"></span>
                  <span>Sao lưu dữ liệu quan trọng thường xuyên</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="w-2 h-2 bg-success rounded-full mt-2 flex-shrink-0"></span>
                  <span>Không cài đặt phần mềm không rõ nguồn gốc</span>
                </li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Devices Table */}
      <Card>
        <CardHeader>
          <CardTitle>Danh sách thiết bị ({devices.length})</CardTitle>
          <CardDescription>
            Chi tiết các thiết bị được giao cho bạn sử dụng
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tên thiết bị</TableHead>
                <TableHead>Loại</TableHead>
                <TableHead>Vị trí</TableHead>
                <TableHead>Thời gian sử dụng</TableHead>
                <TableHead>Ngày lắp đặt</TableHead>
                <TableHead>Trạng thái</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {devices.map((device) => (
                <TableRow key={device.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{device.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {device.specifications?.brand}{" "}
                        {device.specifications?.model}
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
                      {device.specifications?.ipAddress && (
                        <p className="text-muted-foreground">
                          IP: {device.specifications.ipAddress}
                        </p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">
                        {calculateUsageTime(device.createdAt)}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">
                        {new Date(device.installationDate).toLocaleDateString(
                          "vi-VN"
                        )}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={getStatusColor(device.status)}>
                      {getStatusDisplayName(device.status)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm">
                          Chi tiết
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl">
                        <DialogHeader>
                          <DialogTitle>Thông tin thiết bị</DialogTitle>
                        </DialogHeader>

                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <p>
                              <strong>Tên:</strong> {device.name}
                            </p>
                            <p>
                              <strong>Loại:</strong> {getDeviceTypeDisplayName(device.type)}
                            </p>
                            <p>
                              <strong>Trạng thái:</strong> {getStatusDisplayName(device.status)}
                            </p>
                            <p>
                              <strong>Vị trí:</strong> {device.location}
                            </p>
                            <p>
                              <strong>Phường:</strong> {wardNameMap[device.wardId] || device.wardName || "—"}
                            </p>
                          </div>
                          <div>
                            <p>
                              <strong>Nhà cung cấp:</strong>{" "}
                              {device.specifications.vendor || "Chưa có"}
                            </p>
                            <p>
                              <strong>Người dùng:</strong>{" "}
                              {device.assignedToName || "Chưa gán"}
                            </p>
                            <p>
                              <strong>Ngày lắp đặt:</strong>{" "}
                              {device.installationDate?.toLocaleDateString()}
                            </p>
                            {device.lastMaintenance && (
                              <p>
                                <strong>Bảo trì lần cuối:</strong>{" "}
                                {device.lastMaintenance.toLocaleDateString()}
                              </p>
                            )}
                            {device.nextMaintenance && (
                              <p>
                                <strong>Bảo trì kế tiếp:</strong>{" "}
                                {device.nextMaintenance.toLocaleDateString()}
                              </p>
                            )}
                          </div>
                        </div>

                        {device.specifications && (
                          <div className="mt-4">
                            <h3 className="font-semibold">Thông số kỹ thuật</h3>
                            <ul className="list-disc list-inside text-sm">
                                {getFieldsForType(device.type || "other")
                                  .filter((k) => k !== "vendor" && k !== "description")
                                  .map((k) => {
                                    const meta = FIELD_META[k];
                                    const rawVal = (device.specifications as any)?.[k];
                                    if (!meta || rawVal === undefined || rawVal === "") return null;
                                    const displayVal =
  k === 'license'
    ? (rawVal === 'licensed' ? 'Có' : rawVal === 'unlicensed' ? 'Không' : String(rawVal))
    : k === 'cpu'
    ? (rawVal === 'other'
        ? ((device.specifications as any)?.cpu_other || 'Khác')
        : (getCpuOptionsByType(device.type).find(o => o.value === rawVal)?.label || String(rawVal)))
    : k === 'gpu'
    ? (rawVal === 'other'
        ? ((device.specifications as any)?.gpu_other || 'Khác')
        : (getGpuOptionsByType(device.type).find(o => o.value === rawVal)?.label || String(rawVal)))
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

                        {device.description && (
                          <div className="mt-4">
                            <h3 className="font-semibold">Mô tả</h3>
                            <p className="text-sm text-gray-600">
                              {device.description}
                            </p>
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
                          <p>
                            <strong>Tạo lúc:</strong>{" "}
                            {device.createdAt.toLocaleString()}
                          </p>
                          <p>
                            <strong>Cập nhật lúc:</strong>{" "}
                            {device.updatedAt.toLocaleString()}
                          </p>
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

      {devices.length === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <Monitor className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">
              Chưa có thiết bị nào được giao
            </h3>
            <p className="text-muted-foreground">
              Bạn chưa được giao thiết bị nào. Vui lòng liên hệ với phường để
              được hỗ trợ.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default MyDevicesPage;
