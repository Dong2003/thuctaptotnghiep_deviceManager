import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Monitor } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { isUserBannedByEmail } from '@/lib/services/userService';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [localError, setLocalError] = useState('');
  const navigate = useNavigate();
  const { toast } = useToast();
  const { login, loading, error: authError, clearError } = useAuth();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLocalError('');
    clearError?.();

    if (!email || !password) {
      setLocalError('Vui lòng nhập đầy đủ email và mật khẩu.');
      return;
    }

    try {
      // Quick pre-check: show popup immediately if banned
      const banned = await isUserBannedByEmail(email);
      if (banned) {
        const message = 'Tài khoản của bạn đã bị vô hiệu hóa. Vui lòng liên hệ quản trị viên.';
        setLocalError(message);
        toast({ title: 'Đăng nhập thất bại!', description: message, variant: 'destructive' });
        return;
      }

      await login(email, password);

      toast({
        title: 'Đăng nhập thành công',
        description: 'Chào mừng bạn đến với hệ thống!',
        variant: 'default',
      });

      navigate('/dashboard');
    } catch (err: any) {
      const message = err?.message || 'Đăng nhập thất bại. Vui lòng thử lại.';
      setLocalError(message);
      toast({
        title: 'Đăng nhập thất bại',
        description: message,
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-primary flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-elevation">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <Monitor className="h-12 w-12 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold">Đăng nhập hệ thống</CardTitle>
          <CardDescription>
            Hệ thống Quản lý Thiết bị Công nghệ Thông tin
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Nhập email"
                required
                autoComplete="username"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Mật khẩu</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Nhập mật khẩu"
                required
                autoComplete="current-password"
              />
            </div>

            {/* Inline error removed; errors are shown via toast */}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
            </Button>
            <div className="text-center mt-4">
            <span className="text-sm text-muted-foreground">
              Chưa có tài khoản?{' '}
            </span>
            <button
              type="button"
              className="text-primary font-semibold hover:underline"
              onClick={() => navigate('/register')} // chuyển sang trang Register
            >
              Tạo tài khoản mới
            </button>
          </div>
            <p className='text-center mt-2'>
              <a href='/forgot-password' className="text-sm text-primary hover:underline">Quên mật khẩu?</a>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;
