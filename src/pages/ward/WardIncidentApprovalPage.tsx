import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Eye, CheckCircle, XCircle, Clock, AlertTriangle, Settings } from 'lucide-react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import {
  getIncidentsForWardApproval,
  approveIncidentByWard,
  rejectIncidentByWard,
  type Incident,
  getSeverityColor,
  getStatusColor
} from '@/lib/services/incidentService';

const WardIncidentApprovalPage = () => {
  const { user } = useAuth();
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [isProcessingDialogOpen, setIsProcessingDialogOpen] = useState(false);
  const [processingAction, setProcessingAction] = useState<'approve' | 'reject' | null>(null);
  const [processingComment, setProcessingComment] = useState('');

  const { toast } = useToast();

  // Fetch incidents pending ward approval
  const fetchIncidents = async () => {
    if (!user?.wardId) return;
    
    setLoading(true);
    try {
      const data = await getIncidentsForWardApproval(user.wardId);
      setIncidents(data);
    } catch (error: any) {
      toast({
        title: 'Lỗi',
        description: error.message || 'Không thể tải danh sách sự cố',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIncidents();
  }, [user?.wardId]);

  // Open dialogs
  const openDetailDialog = (incident: Incident) => {
    setSelectedIncident(incident);
    setIsDetailDialogOpen(true);
  };

  // Open processing dialog
  const openProcessingDialog = (incident: Incident) => {
    setSelectedIncident(incident);
    setProcessingAction(null);
    setProcessingComment('');
    setIsProcessingDialogOpen(true);
  };

  // Process incident (approve or reject)
  const handleProcessIncident = async () => {
    if (!selectedIncident || !user || !processingAction || !processingComment.trim()) return;

    try {
      if (processingAction === 'approve') {
        await approveIncidentByWard(selectedIncident.id, user.id, user.displayName, processingComment);
        
        toast({
          title: 'Duyệt thành công',
          description: 'Sự cố đã được duyệt và chuyển lên trung tâm.'
        });
      } else if (processingAction === 'reject') {
        await rejectIncidentByWard(
          selectedIncident.id,
          user.id,
          user.displayName,
          processingComment
        );
        
        toast({
          title: 'Từ chối thành công',
          description: 'Sự cố đã được từ chối và thông báo cho người báo cáo.'
        });
      }
      
      // Remove from pending list
      setIncidents(prev => prev.filter(i => i.id !== selectedIncident.id));
      
      // Close dialog and reset state
      setIsProcessingDialogOpen(false);
      setSelectedIncident(null);
      setProcessingAction(null);
      setProcessingComment('');
    } catch (error: any) {
      toast({
        title: 'Lỗi',
        description: error.message || 'Không thể xử lý sự cố',
        variant: 'destructive'
      });
    }
  };

  const getSeverityText = (severity: string) => {
    switch (severity) {
      case 'low': return 'Thấp';
      case 'medium': return 'Trung bình';
      case 'high': return 'Cao';
      case 'critical': return 'Nghiêm trọng';
      default: return 'Không xác định';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Clock className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Đang tải dữ liệu...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Duyệt báo cáo sự cố</h1>
          <p className="text-muted-foreground">Duyệt các báo cáo sự cố từ người dùng trong phường</p>
        </div>
        <Button onClick={fetchIncidents} variant="outline">
          <Clock className="h-4 w-4 mr-2" />
          Tải lại
        </Button>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Chờ duyệt</CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{incidents.length}</div>
            <p className="text-xs text-muted-foreground">
              Báo cáo chờ xét duyệt
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Nghiêm trọng</CardTitle>
            <XCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {incidents.filter(i => i.severity === 'critical' || i.severity === 'high').length}
            </div>
            <p className="text-xs text-muted-foreground">
              Cần ưu tiên xử lý
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Hôm nay</CardTitle>
            <Clock className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {incidents.filter(i => 
                new Date(i.createdAt).toDateString() === new Date().toDateString()
              ).length}
            </div>
            <p className="text-xs text-muted-foreground">
              Báo cáo mới trong ngày
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Incidents Table */}
      <Card>
        <CardHeader>
          <CardTitle>Danh sách sự cố chờ duyệt ({incidents.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {incidents.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">Không có sự cố nào chờ duyệt</h3>
              <p className="text-muted-foreground">
                Tất cả báo cáo sự cố đã được xử lý.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tiêu đề sự cố</TableHead>
                  <TableHead>Người báo cáo</TableHead>
                  <TableHead>Mức độ</TableHead>
                  <TableHead>Ngày báo cáo</TableHead>
                  <TableHead>Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {incidents.map((incident) => (
                  <TableRow key={incident.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{incident.title}</p>
                        <p className="text-sm text-muted-foreground line-clamp-1">
                          {incident.description}
                        </p>
                        {incident.deviceName && (
                          <p className="text-xs text-muted-foreground">
                            Thiết bị: {incident.deviceName}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{incident.reportedByName}</p>
                        <p className="text-sm text-muted-foreground">{incident.location}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={getSeverityColor(incident.severity)}>
                        {getSeverityText(incident.severity)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {incident.createdAt.toLocaleDateString('vi-VN', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openDetailDialog(incident)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => openProcessingDialog(incident)}
                          className="bg-blue-600 hover:bg-blue-700"
                        >
                          <Settings className="h-4 w-4 mr-1" />
                          Xử lý
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Chi tiết sự cố</DialogTitle>
          </DialogHeader>

          {selectedIncident && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium mb-1">Tiêu đề:</h4>
                  <p className="text-sm">{selectedIncident.title}</p>
                </div>
                <div>
                  <h4 className="font-medium mb-1">Mức độ:</h4>
                  <Badge className={getSeverityColor(selectedIncident.severity)}>
                    {getSeverityText(selectedIncident.severity)}
                  </Badge>
                </div>
                <div>
                  <h4 className="font-medium mb-1">Người báo cáo:</h4>
                  <p className="text-sm">{selectedIncident.reportedByName}</p>
                </div>
                <div>
                  <h4 className="font-medium mb-1">Ngày báo cáo:</h4>
                  <p className="text-sm">
                    {selectedIncident.createdAt.toLocaleDateString('vi-VN', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-2">Vị trí:</h4>
                <div className="p-3 bg-muted rounded-md">
                  <p className="text-sm">{selectedIncident.location}</p>
                </div>
              </div>

              {selectedIncident.deviceName && (
                <div>
                  <h4 className="font-medium mb-2">Thiết bị liên quan:</h4>
                  <div className="p-3 bg-muted rounded-md">
                    <p className="text-sm font-medium">{selectedIncident.deviceName}</p>
                  </div>
                </div>
              )}

              <div>
                <h4 className="font-medium mb-2">Mô tả sự cố:</h4>
                <div className="p-3 bg-muted rounded-md">
                  <p className="text-sm">{selectedIncident.description}</p>
                </div>
              </div>

              {selectedIncident.images && selectedIncident.images.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">Hình ảnh:</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {selectedIncident.images.map((image, index) => (
                      <img
                        key={index}
                        src={image}
                        alt={`Hình ảnh sự cố ${index + 1}`}
                        className="w-full h-32 object-cover rounded-md border"
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDetailDialogOpen(false)}>
              Đóng
            </Button>
            {selectedIncident && (
              <Button
                onClick={() => {
                  setIsDetailDialogOpen(false);
                  openProcessingDialog(selectedIncident);
                }}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Settings className="h-4 w-4 mr-1" />
                Xử lý
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Processing Dialog */}
      <Dialog open={isProcessingDialogOpen} onOpenChange={setIsProcessingDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Xử lý báo cáo sự cố</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {selectedIncident && (
              <div className="p-3 bg-muted rounded-md">
                <h4 className="font-medium mb-1">Sự cố:</h4>
                <p className="text-sm">{selectedIncident.title}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Được báo cáo bởi: {selectedIncident.reportedByName}
                </p>
              </div>
            )}

            <div>
              <Label className="text-base font-medium mb-3 block">Chọn hành động:</Label>
              <RadioGroup 
                value={processingAction || ''} 
                onValueChange={(value) => setProcessingAction(value as 'approve' | 'reject')}
                className="space-y-3"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="approve" id="approve" />
                  <Label htmlFor="approve" className="flex items-center space-x-2 cursor-pointer">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span>Duyệt sự cố</span>
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="reject" id="reject" />
                  <Label htmlFor="reject" className="flex items-center space-x-2 cursor-pointer">
                    <XCircle className="h-4 w-4 text-red-600" />
                    <span>Từ chối sự cố</span>
                  </Label>
                </div>
              </RadioGroup>
            </div>

            <div>
              <Label htmlFor="processingComment">
                {processingAction === 'approve' ? 'Bình luận duyệt' : 'Lý do từ chối'} *
              </Label>
              <Textarea
                id="processingComment"
                value={processingComment}
                onChange={(e) => setProcessingComment(e.target.value)}
                placeholder={
                  processingAction === 'approve' 
                    ? "Nhập bình luận về việc duyệt sự cố này..." 
                    : "Nhập lý do từ chối báo cáo sự cố này..."
                }
                rows={4}
                className="mt-1"
              />
            </div>
          </div>

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setIsProcessingDialogOpen(false);
                setProcessingAction(null);
                setProcessingComment('');
              }}
            >
              Hủy
            </Button>
            <Button 
              onClick={handleProcessIncident}
              disabled={!processingAction || !processingComment.trim()}
              className={
                processingAction === 'approve' 
                  ? "bg-green-600 hover:bg-green-700" 
                  : "bg-red-600 hover:bg-red-700"
              }
            >
              {processingAction === 'approve' ? (
                <>
                  <CheckCircle className="h-4 w-4 mr-1" />
                  Xác nhận duyệt
                </>
              ) : (
                <>
                  <XCircle className="h-4 w-4 mr-1" />
                  Xác nhận từ chối
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default WardIncidentApprovalPage;
