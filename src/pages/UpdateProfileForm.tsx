import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { getWardById } from "@/lib/services/deviceRequestService";
import Swal from "sweetalert2"; // thêm vào

const UpdateProfileForm: React.FC = () => {
  const { user, updateProfile, changePassword } = useAuth();
  const [profile, setProfile] = useState(user || null);
  const [wardName, setWardName] = useState("");
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [loadingPassword, setLoadingPassword] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");

  useEffect(() => {
    if (user) setProfile(user);
  }, [user]);

  useEffect(() => {
    const fetchWard = async () => {
      if (!profile?.wardId) return;
      const ward = await getWardById(profile.wardId);
      setWardName(ward?.name || "");
    };
    fetchWard();
  }, [profile?.wardId]);

  const getRoleLabel = (role?: string) => {
    switch (role) {
      case "center":
        return "Trung tâm";
      case "ward":
        return "Phường";
      case "user":
        return "Người dùng";
      default:
        return "Không xác định";
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!profile) return;
    const { name, value } = e.target;
    setProfile({ ...profile, [name]: value });
  };

  const handleSubmitProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    setLoadingProfile(true);
    try {
      await updateProfile({
        displayName: profile.displayName,
        wardId: profile.wardId,
        wardName: wardName,
      });
      Swal.fire("Thành công", "Cập nhật hồ sơ thành công!", "success");
    } catch (error) {
      console.error(error);
      Swal.fire("Lỗi", "Có lỗi xảy ra khi cập nhật hồ sơ", "error");
    } finally {
      setLoadingProfile(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword || !newPassword) {
      Swal.fire("Thiếu thông tin", "Vui lòng nhập đủ mật khẩu cũ và mới", "warning");
      return;
    }
    setLoadingPassword(true);
    try {
      await changePassword(currentPassword, newPassword);
      Swal.fire("Thành công", "Đổi mật khẩu thành công!", "success");
      setCurrentPassword("");
      setNewPassword("");
    } catch (error: any) {
      console.error(error);
      Swal.fire("Lỗi", error.message || "Có lỗi xảy ra khi đổi mật khẩu", "error");
    } finally {
      setLoadingPassword(false);
    }
  };

  if (!profile) return <p>Đang tải...</p>;

  return (
    <div className="space-y-8 max-w-lg mx-auto">
      {/* --- Cập nhật hồ sơ --- */}
      <Card>
        <CardHeader>
          <CardTitle>Cập nhật hồ sơ</CardTitle>
          <CardDescription>Quản lý thông tin cá nhân</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmitProfile} className="space-y-4">
            <div>
              <Label htmlFor="displayName">Tên hiển thị</Label>
              <Input
                id="displayName"
                name="displayName"
                value={profile.displayName || ""}
                onChange={handleChange}
              />
            </div>

            <div>
              <Label>Phường làm việc</Label>
              <Input
                value={wardName}
                disabled
                className="bg-muted cursor-not-allowed"
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                Vai trò: {getRoleLabel(profile.role)}
              </span>
            </div>

            <Button type="submit" disabled={loadingProfile}>
              {loadingProfile ? "Đang lưu..." : "Lưu thay đổi"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* --- Đổi mật khẩu --- */}
      <Card>
        <CardHeader>
          <CardTitle>Đổi mật khẩu</CardTitle>
          <CardDescription>Bảo mật tài khoản của bạn</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div>
              <Label htmlFor="currentPassword">Mật khẩu hiện tại</Label>
              <Input
                type="password"
                id="currentPassword"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="newPassword">Mật khẩu mới</Label>
              <Input
                type="password"
                id="newPassword"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>

            <Button type="submit" disabled={loadingPassword}>
              {loadingPassword ? "Đang đổi..." : "Đổi mật khẩu"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default UpdateProfileForm;
