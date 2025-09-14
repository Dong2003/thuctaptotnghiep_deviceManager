import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Eye, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { 
  getIncidents, 
  updateIncident, 
  type Incident,
  getSeverityColor,
  getStatusColor
} from '@/lib/services/incidentService';

const IncidentsPage = () => {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [isResolveDialogOpen, setIsResolveDialogOpen] = useState(false);
  const [resolution, setResolution] = useState('');

  const { toast } = useToast();

  // Fetch incidents
  const fetchIncidents = async () => {
    setLoading(true);
    try {
      const data = await getIncidents();
      setIncidents(data);
    } catch (error: any) {
      toast({ title: 'Lỗi', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIncidents();
  }, []);

  // Open dialogs
  const openDetailDialog = (incident: Incident) => {
    setSelectedIncident(incident);
    setIsDetailDialogOpen(true);
  };

  const openResolveDialog = (incident: Incident) => {
    setSelectedIncident(incident);
    setIsResolveDialogOpen(true);
  };

  // Update status
  const handleUpdateStatus = async (incident: Incident, newStatus: Incident['status']) => {
    try {
      await updateIncident(incident.id, { status: newStatus });
      setIncidents(prev => prev.map(i => i.id === incident.id ? { ...i, status: newStatus } : i));
      toast({ title: 'Cập nhật trạng thái thành công' });
    } catch (error: any) {
      toast({ title: 'Lỗi', description: error.message, variant: 'destructive' });
    }
  };

  // Resolve incident
  const handleResolveIncident = async () => {
    if (!selectedIncident) return;
    try {
      await updateIncident(selectedIncident.id, { status: 'resolved', resolution });
      setIncidents(prev => prev.map(i => 
        i.id === selectedIncident.id ? { ...i, status: 'resolved', resolution, resolvedAt: new Date() } : i
      ));
      toast({ title: 'Sự cố đã được giải quyết' });
      setIsResolveDialogOpen(false);
      setSelectedIncident(null);
      setResolution('');
    } catch (error: any) {
      toast({ title: 'Lỗi', description: error.message, variant: 'destructive' });
    }
  };

  if (loading) return <div>Đang tải dữ liệu...</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Quản lý sự cố thiết bị</h1>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Tổng sự cố</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground"/>
          </CardHeader>
          <CardContent className="text-2xl font-bold">{incidents.length}</CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Chưa xử lý</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive"/>
          </CardHeader>
          <CardContent className="text-2xl font-bold text-destructive">
            {incidents.filter(i => i.status === 'reported' || i.status === 'investigating').length}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Đang xử lý</CardTitle>
            <Clock className="h-4 w-4 text-warning"/>
          </CardHeader>
          <CardContent className="text-2xl font-bold text-warning">
            {incidents.filter(i => i.status === 'in_progress').length}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Đã giải quyết</CardTitle>
            <CheckCircle className="h-4 w-4 text-success"/>
          </CardHeader>
          <CardContent className="text-2xl font-bold text-success">
            {incidents.filter(i => i.status === 'resolved' || i.status === 'closed').length}
          </CardContent>
        </Card>
      </div>

      {/* Incident Table */}
      <Card>
        <CardHeader>
          <CardTitle>Danh sách sự cố</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tiêu đề</TableHead>
                <TableHead>Mức độ</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead>Ngày báo cáo</TableHead>
                <TableHead>Thao tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {incidents.map(incident => (
                <TableRow key={incident.id}>
                  <TableCell>{incident.title}</TableCell>
                  <TableCell>
                    <Badge className={getSeverityColor(incident.severity)}>{incident.severity}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge className={getStatusColor(incident.status)}>{incident.status}</Badge>
                    {(incident.status === 'reported' || incident.status === 'investigating' || incident.status === 'in_progress') && (
                      <Select
                        value={incident.status}
                        onValueChange={(v: Incident['status']) => handleUpdateStatus(incident, v)}
                      >
                        <SelectTrigger className="w-32"><SelectValue/></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="reported">Đã báo cáo</SelectItem>
                          <SelectItem value="investigating">Đang điều tra</SelectItem>
                          <SelectItem value="in_progress">Đang xử lý</SelectItem>
                          <SelectItem value="resolved">Đã giải quyết</SelectItem>
                          <SelectItem value="closed">Đã đóng</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  </TableCell>
                  <TableCell>{incident.createdAt.toLocaleDateString()}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => openDetailDialog(incident)}>
                        <Eye className="w-4 h-4"/>
                      </Button>
                      {(incident.status === 'reported' || incident.status === 'in_progress') && (
                        <Button size="sm" onClick={() => openResolveDialog(incident)}>Giải quyết</Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Chi tiết sự cố</DialogTitle>
          </DialogHeader>
          {selectedIncident && (
            <div className="space-y-2">
              <p><b>Tiêu đề:</b> {selectedIncident.title}</p>
              <p><b>Mô tả:</b> {selectedIncident.description}</p>
              <p><b>Trạng thái:</b> {selectedIncident.status}</p>
              <p><b>Mức độ:</b> {selectedIncident.severity}</p>
              {selectedIncident.resolution && <p><b>Giải pháp:</b> {selectedIncident.resolution}</p>}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDetailDialogOpen(false)}>Đóng</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Resolve Dialog */}
      <Dialog open={isResolveDialogOpen} onOpenChange={setIsResolveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Giải quyết sự cố</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Giải pháp</Label>
            <Textarea value={resolution}
              onChange={(e) => setResolution(e.target.value)}
              placeholder="Nhập giải pháp xử lý sự cố..."
            />
          </div>
          <DialogFooter className="space-x-2">
            <Button variant="outline" onClick={() => setIsResolveDialogOpen(false)}>Hủy</Button>
            <Button onClick={handleResolveIncident}>Xác nhận</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default IncidentsPage;
