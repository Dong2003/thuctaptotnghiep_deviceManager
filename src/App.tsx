import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import Layout from "./components/Layout";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import NotFound from "./pages/NotFound";

// Center pages
import DevicesPage from "./pages/center/DevicesPage";
import WardsPage from "./pages/center/WardsPage";
import UsersPage from "./pages/center/UsersPage";
import RequestsPage from "./pages/center/RequestsPage";
import IncidentsPage from "./pages/center/IncidentsPage";
import SettingsPage from "./pages/center/SettingsPage";
import StatisticsPage from "./pages/center/StatisticsPage";
import AuditLogPage from "./pages/center/AuditLogPage";

// Ward pages
import WardDevicesPage from "./pages/ward/WardDevicesPage";
import DeviceRequestsPage from "./pages/ward/DeviceRequestsPage";
import WardRequestsPage from "./pages/ward/WardRequestsPage";
import WardUsersPage from "./pages/ward/WardUsersPage";
import WardIncidentsPage from "./pages/ward/WardIncidentsPage";
import Register from "./pages/Register";
// User pages
import MyDevicesPage from "./pages/user/MyDevicesPage";
import ReportIncidentPage from "./pages/user/ReportIncidentPage";

const queryClient = new QueryClient();

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Đang tải...</p>
        </div>
      </div>
    );
  }
  
  return isAuthenticated ? <Layout>{children}</Layout> : <Navigate to="/login" />;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route 
              path="/" 
              element={
                <ProtectedRoute>
                  <Navigate to="/dashboard" />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/dashboard" 
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              } 
            />
            
            {/* Center Routes */}
            <Route path="/devices" element={<ProtectedRoute><DevicesPage /></ProtectedRoute>} />
            <Route path="/wards" element={<ProtectedRoute><WardsPage /></ProtectedRoute>} />
            <Route path="/users" element={<ProtectedRoute><UsersPage /></ProtectedRoute>} />
            <Route path="/requests" element={<ProtectedRoute><RequestsPage /></ProtectedRoute>} />
            <Route path="/incidents" element={<ProtectedRoute><IncidentsPage /></ProtectedRoute>} />
            <Route path="/statistics" element={<ProtectedRoute><StatisticsPage /></ProtectedRoute>} />
            <Route path="/audit-logs" element={<ProtectedRoute><AuditLogPage /></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
            
            {/* Ward Routes */}
            <Route path="/ward-devices" element={<ProtectedRoute><WardDevicesPage /></ProtectedRoute>} />
            <Route path="/device-requests" element={<ProtectedRoute><DeviceRequestsPage /></ProtectedRoute>} />
            <Route path="/ward-requests" element={<ProtectedRoute><WardRequestsPage /></ProtectedRoute>} />
            <Route path="/ward-users" element={<ProtectedRoute><WardUsersPage /></ProtectedRoute>} />
            <Route path="/ward-incidents" element={<ProtectedRoute><WardIncidentsPage /></ProtectedRoute>} />
            
            {/* User Routes */}
            <Route path="/my-devices" element={<ProtectedRoute><MyDevicesPage /></ProtectedRoute>} />
            <Route path="/report-incident" element={<ProtectedRoute><ReportIncidentPage /></ProtectedRoute>} />
            
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
