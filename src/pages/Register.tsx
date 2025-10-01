import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { getWards, Ward, getWardDisplayName, addWardUser } from '@/lib/services/wardService';
import { auth } from "@/lib/firebase";
import { createUserWithEmailAndPassword, updateProfile, User } from "firebase/auth";
import { register } from '@/lib/authService';
const Register: React.FC = () => {
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [role, setRole] = useState<'ward' | 'user'>('ward');
  const [wardId, setWardId] = useState('');
  const [wards, setWards] = useState<Ward[]>([]);
  const { toast } = useToast();
  const navigate = useNavigate();
  const defaultPassword = '123456';

  const [loading, setLoading] = useState(false);

  // Load wards
  useEffect(() => {
    const fetchWards = async () => {
      try {
        const list = await getWards(true); // chỉ lấy phường active
        setWards(list);
        if (list.length > 0) setWardId(list[0].id);
      } catch (err) {
        console.error('Failed to fetch wards', err);
      }
    };
    fetchWards();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
  
    if (!email || !displayName || !wardId) {
      toast({ title: 'Lỗi', description: 'Vui lòng điền đầy đủ thông tin', variant: 'destructive' });
      return;
    }
    setLoading(true);
    try {
      // 1. Tạo tài khoản Firebase Auth + Firestore users
      const createdUser = await register({
        email,
        password: defaultPassword,
        displayName,
        role,
        wardId,
      });
  
      const userId = createdUser.id; // uid từ Firestore user
      const wardName = wards.find(w => w.id === wardId)?.name || `Ward ${wardId}`;
      const roomId = "";
      const roomName = "";
      // 2. Lưu vào wardUsers
      await addWardUser(
        wardId,
        wardName,
        userId,
        displayName,
        email,
        role,
        roomId,
        roomName,
      );
  
      toast({
        title: 'Tạo tài khoản thành công',
        description: `Email: ${email} | Mật khẩu mặc định: ${defaultPassword}`,
      });
  
      navigate('/login');
    } catch (err: any) {
      toast({ title: 'Lỗi', description: err.message, variant: 'destructive' });
    }finally {
      setLoading(false); // ✅ tắt loading
    }
  };

return (
  <div className="min-h-screen flex items-center justify-center p-4">
    <Card className="w-full max-w-md shadow-elevation">
      <CardHeader>
        <CardTitle>Đăng ký tài khoản mới</CardTitle>
        <CardDescription>Cấp phát tài khoản cho phường hoặc người dùng</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Email</Label>
            <Input value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div>
            <Label>Tên hiển thị</Label>
            <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} required />
          </div>
          <div>
            <Label>Vai trò</Label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as 'ward' | 'user')}
              className="w-full border rounded px-2 py-1"
            >
              <option value="ward">Phường</option>
              <option value="user">Người dùng</option>
            </select>
          </div>
          <div>
            <Label>Chọn phường</Label>
            <select
              value={wardId}
              onChange={(e) => setWardId(e.target.value)}
              className="w-full border rounded px-2 py-1"
            >
              {wards.map(w => (
                <option key={w.id} value={w.id}>{getWardDisplayName(w)}</option>
              ))}
            </select>
          </div>
          <div>
            <Label>Mật khẩu mặc định</Label>
            <Input type="text" value={defaultPassword} disabled />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Đang tạo tài khoản..." : "Tạo tài khoản"}
          </Button>
        </form>

        {/* ✅ Nút chuyển qua đăng nhập */}
        <div className="text-center mt-4">
          <span className="text-sm text-gray-600">
            Đã có tài khoản?{" "}
            <button
              type="button"
              onClick={() => navigate('/login')}
              className="text-blue-600 hover:underline"
            >
              Đăng nhập
            </button>
          </span>
        </div>
      </CardContent>
    </Card>
  </div>
);
}

export default Register;
