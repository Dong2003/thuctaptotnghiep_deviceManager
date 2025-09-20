import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { getRoleDisplayName } from '@/lib/auth';
import { Monitor, Users, FileText, Settings, LogOut, Home, Package, AlertTriangle, UserCog, CheckCircle, BarChart3, Activity } from 'lucide-react';
interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const getNavigationItems = () => {
    if (!user) return [];

    const baseItems = [
      { path: '/dashboard', label: 'Trang chủ', icon: Home },
    ];

    switch (user.role) {
      case 'center':
        return [
          ...baseItems,
          { path: '/devices', label: 'Quản lý thiết bị', icon: Monitor },
          { path: '/wards', label: 'Quản lý phường', icon: Users },
          { path: '/users', label: 'Quản lý tài khoản', icon: UserCog },
          { path: '/requests', label: 'Yêu cầu cấp phát', icon: FileText },
          { path: '/incidents', label: 'Báo cáo sự cố', icon: AlertTriangle },
          { path: '/statistics', label: 'Thống kê', icon: BarChart3 },
          { path: '/audit-logs', label: 'Log thao tác', icon: Activity },
          { path: '/settings', label: 'Cài đặt', icon: Settings },
        ];
      case 'ward':
        return [
          ...baseItems,
          { path: '/ward-devices', label: 'Thiết bị phường', icon: Monitor },
          { path: '/device-requests', label: 'Yêu cầu thiết bị', icon: Package },
          { path: '/ward-requests', label: 'Nhận thiết bị', icon: CheckCircle },
          { path: '/ward-users', label: 'Quản lý người dùng', icon: Users },
          { path: '/ward-incidents', label: 'Sự cố thiết bị', icon: AlertTriangle },
        ];
      case 'user':
        return [
          ...baseItems,
          { path: '/my-devices', label: 'Thiết bị của tôi', icon: Monitor },
          { path: '/report-incident', label: 'Báo cáo sự cố', icon: AlertTriangle },
        ];
      default:
        return baseItems;
    }
  };

  const navigationItems = getNavigationItems();

  if (!user) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Monitor className="h-8 w-8 text-primary" />
                <h1 className="text-xl font-bold text-foreground">
                  Hệ thống Quản lý Thiết bị IT
                </h1>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm font-medium text-foreground">{user.displayName}</p>
                <p className="text-xs text-muted-foreground">{getRoleDisplayName(user.role)}</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleLogout}
                className="flex items-center space-x-2"
              >
                <LogOut className="h-4 w-4" />
                <span>Đăng xuất</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside className="w-64 bg-card border-r border-border min-h-[calc(100vh-4rem)]">
          <nav className="p-4 space-y-2">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              
              return (
                <Button
                  key={item.path}
                  variant={isActive ? "default" : "ghost"}
                  className="w-full justify-start"
                  onClick={() => navigate(item.path)}
                >
                  <Icon className="h-4 w-4 mr-3" />
                  {item.label}
                </Button>
              );
            })}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-6">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;