import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { CheckCircle, XCircle, Clock, FileText } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { DeviceRequest, getDeviceRequests, updateDeviceRequest, getDeviceTypeDisplayName, getWardById } from '@/lib/services/deviceRequestService';
import { Ward } from '@/lib/services/wardService';

const RequestsPage = () => {
  const [requests, setRequests] = useState<DeviceRequest[]>([]);
  const [wardsMap, setWardsMap] = useState<Record<string, Ward | null>>({});
  const [selectedRequest, setSelectedRequest] = useState<DeviceRequest | null>(null);
  const [isResponseDialogOpen, setIsResponseDialogOpen] = useState(false);
  const [responseNotes, setResponseNotes] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    fetchRequests();
  }, []);

  // Fetch requests and wards
  const fetchRequests = async () => {
    try {
      const data = await getDeviceRequests();
      setRequests(data);
      await fetchWards(data);
    } catch (error: any) {
      toast({ title: 'Lỗi', description: error.message, variant: 'destructive' });
    }
  };

  const fetchWards = async (requests: DeviceRequest[]) => {
    const map: Record<string, Ward | null> = {};
    await Promise.all(
      requests.map(async (req) => {
        if (!map[req.wardId]) {
          map[req.wardId] = await getWardById(req.wardId);
        }
      })
    );
    setWardsMap(map);
  };

  const handleApproveRequest = async (requestId: string) => {
    try {
      if (!selectedRequest) return;
      await updateDeviceRequest(requestId, { status: 'approved', notes: responseNotes });
      toast({ title: 'Phê duyệt thành công', description: 'Yêu cầu đã được phê duyệt.' });
      fetchRequests();
      closeDialog();
    } catch (error: any) {
      toast({ title: 'Lỗi', description: error.message, variant: 'destructive' });
    }
  };

  const handleRejectRequest = async (requestId: string) => {
    try {
      if (!selectedRequest) return;
      await updateDeviceRequest(requestId, { status: 'rejected', notes: responseNotes });
      toast({ title: 'Từ chối thành công', description: 'Yêu cầu đã bị từ chối.', variant: 'destructive' });
      fetchRequests();
      closeDialog();
    } catch (error: any) {
      toast({ title: 'Lỗi', description: error.message, variant: 'destructive' });
    }
  };

  const openResponseDialog = (request: DeviceRequest) => {
    setSelectedRequest(request);
    setResponseNotes(request.notes || '');
    setIsResponseDialogOpen(true);
  };

  const closeDialog = () => {
    setIsResponseDialogOpen(false);
    setSelectedRequest(null);
    setResponseNotes('');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'warning';
      case 'approved': return 'success';
      case 'rejected': return 'destructive';
      default: return 'secondary';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return 'Chờ duyệt';
      case 'approved': return 'Đã duyệt';
      case 'rejected': return 'Từ chối';
      default: return 'Không xác định';
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Yêu cầu cấp phát thiết bị</h1>
        <p className="text-muted-foreground">Xử lý các yêu cầu cấp phát thiết bị từ các phường/xã</p>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex justify-between pb-2">
            <CardTitle className="text-sm font-medium">Tổng yêu cầu</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{requests.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex justify-between pb-2">
            <CardTitle className="text-sm font-medium">Chờ duyệt</CardTitle>
            <Clock className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning">
              {requests.filter(r => r.status === 'pending').length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex justify-between pb-2">
            <CardTitle className="text-sm font-medium">Đã duyệt</CardTitle>
            <CheckCircle className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">
              {requests.filter(r => r.status === 'approved').length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex justify-between pb-2">
            <CardTitle className="text-sm font-medium">Từ chối</CardTitle>
            <XCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {requests.filter(r => r.status === 'rejected').length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Requests Table */}
      <Card>
        <CardHeader>
          <CardTitle>Danh sách yêu cầu</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Phường/Xã</TableHead>
                <TableHead>Loại thiết bị</TableHead>
                <TableHead>Số lượng</TableHead>
                <TableHead>Lý do</TableHead>
                <TableHead>Ngày yêu cầu</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead>Thao tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {requests.map(request => {
                const ward = wardsMap[request.wardId];
                return (
                  <TableRow key={request.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{ward?.name || 'Không xác định'}</p>
                        <p className="text-sm text-muted-foreground">{ward?.contactPerson || '-'}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{getDeviceTypeDisplayName(request.deviceType)}</Badge>
                    </TableCell>
                    <TableCell>{request.quantity}</TableCell>
                    <TableCell><p className="text-sm max-w-xs truncate">{request.reason}</p></TableCell>
                    <TableCell>{request.createdAt.toLocaleDateString('vi-VN')}</TableCell>
                    <TableCell>
                      <Badge variant={getStatusColor(request.status) as any}>{getStatusText(request.status)}</Badge>
                    </TableCell>
                    <TableCell>
                      {request.status === 'pending' ? (
                        <Button size="sm" variant="outline" onClick={() => openResponseDialog(request)}>Xử lý</Button>
                      ) : (
                        <span className="text-sm text-muted-foreground">
                          {request.approvedAt && `Phản hồi: ${request.approvedAt.toLocaleDateString('vi-VN')}`}
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Response Dialog */}
      <Dialog open={isResponseDialogOpen} onOpenChange={closeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Xử lý yêu cầu cấp phát</DialogTitle>
            <DialogDescription>
              {selectedRequest && (
                <>
                  Yêu cầu từ {wardsMap[selectedRequest.wardId]?.name || 'Không xác định'} - {selectedRequest.quantity} {getDeviceTypeDisplayName(selectedRequest.deviceType)}
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          {selectedRequest && (
            <div className="space-y-4 py-4">
              <div>
                <h4 className="font-medium mb-2">Chi tiết yêu cầu:</h4>
                <p className="text-sm text-muted-foreground">{selectedRequest.reason}</p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Ghi chú phản hồi:</label>
                <Textarea
                  value={responseNotes}
                  onChange={(e) => setResponseNotes(e.target.value)}
                  placeholder="Nhập ghi chú cho phản hồi..."
                  rows={3}
                />
              </div>
            </div>
          )}

          <DialogFooter className="space-x-2">
            <Button variant="outline" onClick={closeDialog}>Hủy</Button>
            <Button variant="destructive" onClick={() => selectedRequest && handleRejectRequest(selectedRequest.id)}>Từ chối</Button>
            <Button onClick={() => selectedRequest && handleApproveRequest(selectedRequest.id)}>Phê duyệt</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RequestsPage;
