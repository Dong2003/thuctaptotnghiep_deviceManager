import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Settings, Bell, Database, Shield, Mail, Smartphone } from 'lucide-react';
import { getSystemSettings, updateSystemSettings } from '@/lib/services/systemSettingsService';
import { useToast } from '@/hooks/use-toast';

const SettingsPage = () => {
  const { toast } = useToast();
  const [maxFailedLogins, setMaxFailedLogins] = useState<number>(5);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const s = await getSystemSettings();
        setMaxFailedLogins(s.maxFailedLogins ?? 5);
      } catch (err: any) {
        toast({
          title: 'Lỗi tải cài đặt',
          description: err.message || 'Không thể tải cài đặt hệ thống',
          variant: 'destructive',
        });
      }
    };
    load();
  }, [toast]);

  const handleSave = async () => {
    try {
      setSaving(true);
      await updateSystemSettings({ maxFailedLogins });
      toast({ title: 'Đã lưu cài đặt', description: 'Cài đặt hệ thống đã được cập nhật.' });
    } catch (err: any) {
      toast({
        title: 'Lỗi lưu cài đặt',
        description: err.message || 'Không thể lưu cài đặt hệ thống',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Cài đặt hệ thống</h1>
        <p className="text-muted-foreground">Quản lý cấu hình và tùy chọn hệ thống</p>
      </div>

      {/* System Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Settings className="h-5 w-5" />
            <span>Cài đặt chung</span>
          </CardTitle>
          <CardDescription>
            Cấu hình các thông số cơ bản của hệ thống
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-base">Tự động phê duyệt yêu cầu</Label>
              <p className="text-sm text-muted-foreground">
                Tự động phê duyệt các yêu cầu cấp phát thiết bị đơn giản
              </p>
            </div>
            <Switch />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-base">Bảo trì định kỳ</Label>
              <p className="text-sm text-muted-foreground">
                Tự động lên lịch bảo trì thiết bị theo chu kỳ
              </p>
            </div>
            <Switch defaultChecked />
          </div>

          <Separator />

          <div className="space-y-2">
            <Label htmlFor="max-failed-logins">Số lần đăng nhập sai tối đa (ban)</Label>
            <Input
              id="max-failed-logins"
              type="number"
              min={1}
              className="w-32"
              value={maxFailedLogins}
              onChange={(e) => setMaxFailedLogins(Math.max(1, Number(e.target.value) || 1))}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="backup-interval">Chu kỳ sao lưu dữ liệu (ngày)</Label>
            <Input
              id="backup-interval"
              type="number"
              defaultValue="7"
              className="w-32"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="depreciation-method">Phương pháp khấu hao</Label>
            <select className="w-64 h-10 px-3 py-2 border border-input bg-background rounded-md">
              <option value="straight-line">Khấu hao đường thẳng</option>
              <option value="declining-balance">Khấu hao số dư giảm dần</option>
              <option value="sum-years">Khấu hao tổng số năm</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Notification Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Bell className="h-5 w-5" />
            <span>Thông báo</span>
          </CardTitle>
          <CardDescription>
            Cấu hình các thông báo và cảnh báo hệ thống
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-base">Thông báo email</Label>
              <p className="text-sm text-muted-foreground">
                Gửi thông báo qua email khi có sự cố hoặc yêu cầu mới
              </p>
            </div>
            <Switch defaultChecked />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-base">Thông báo SMS</Label>
              <p className="text-sm text-muted-foreground">
                Gửi SMS cho các sự cố nghiêm trọng
              </p>
            </div>
            <Switch />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-base">Cảnh báo thiết bị hết hạn</Label>
              <p className="text-sm text-muted-foreground">
                Thông báo trước khi thiết bị hết thời gian khấu hao
              </p>
            </div>
            <Switch defaultChecked />
          </div>

          <div className="space-y-2">
            <Label htmlFor="warning-days">Cảnh báo trước (ngày)</Label>
            <Input
              id="warning-days"
              type="number"
              defaultValue="30"
              className="w-32"
            />
          </div>
        </CardContent>
      </Card>

      {/* Security Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Shield className="h-5 w-5" />
            <span>Bảo mật</span>
          </CardTitle>
          <CardDescription>
            Cấu hình bảo mật và phân quyền truy cập
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-base">Xác thực hai yếu tố</Label>
              <p className="text-sm text-muted-foreground">
                Yêu cầu OTP khi đăng nhập
              </p>
            </div>
            <Switch />
          </div>

          <Separator />

          <div className="space-y-2">
            <Label htmlFor="session-timeout">Thời gian hết phiên (phút)</Label>
            <Input
              id="session-timeout"
              type="number"
              defaultValue="60"
              className="w-32"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password-policy">Chính sách mật khẩu</Label>
            <select className="w-64 h-10 px-3 py-2 border border-input bg-background rounded-md">
              <option value="basic">Cơ bản (8 ký tự)</option>
              <option value="medium">Trung bình (8 ký tự + số)</option>
              <option value="strong">Mạnh (8 ký tự + số + ký tự đặc biệt)</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Integration Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Database className="h-5 w-5" />
            <span>Tích hợp</span>
          </CardTitle>
          <CardDescription>
            Cấu hình kết nối với các hệ thống bên ngoài
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <h4 className="font-medium flex items-center space-x-2">
              <Mail className="h-4 w-4" />
              <span>Cấu hình Email</span>
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="smtp-server">SMTP Server</Label>
                <Input
                  id="smtp-server"
                  placeholder="smtp.gmail.com"
                  defaultValue="smtp.gmail.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="smtp-port">Port</Label>
                <Input
                  id="smtp-port"
                  type="number"
                  defaultValue="587"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email-username">Username</Label>
                <Input
                  id="email-username"
                  type="email"
                  placeholder="admin@domain.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email-password">Password</Label>
                <Input
                  id="email-password"
                  type="password"
                  placeholder="••••••••"
                />
              </div>
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <h4 className="font-medium flex items-center space-x-2">
              <Smartphone className="h-4 w-4" />
              <span>Cấu hình SMS</span>
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="sms-provider">Nhà cung cấp SMS</Label>
                <select className="w-full h-10 px-3 py-2 border border-input bg-background rounded-md">
                  <option value="viettel">Viettel</option>
                  <option value="vinaphone">VinaPhone</option>
                  <option value="mobifone">MobiFone</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="sms-api-key">API Key</Label>
                <Input
                  id="sms-api-key"
                  type="password"
                  placeholder="••••••••••••••••"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button className="px-8" onClick={handleSave} disabled={saving}>
          {saving ? 'Đang lưu...' : 'Lưu cài đặt'}
        </Button>
      </div>
    </div>
  );
};

export default SettingsPage;