import { Workbook } from '../types';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { formatBytes, formatDate, formatNumber } from '../lib/utils';
import { FileSpreadsheet, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useDeleteWorkbook } from '../hooks/useWorkbooks';
import { Button } from './ui/button';
import { useAppStore } from '../store/useAppStore';
import { Progress } from './ui/progress';

interface Props {
  workbook: Workbook;
}

export function WorkbookCard({ workbook }: Props) {
  const navigate = useNavigate();
  const { mutate: deleteWorkbook } = useDeleteWorkbook();
  const uploadProgress = useAppStore(state => state.uploadProgress);

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this workbook?')) {
      deleteWorkbook(workbook.id);
    }
  };

  const getStatusBadge = () => {
    switch (workbook.status) {
      case 'ready': return <Badge variant="success">Ready</Badge>;
      case 'processing': return <Badge variant="warning">Processing</Badge>;
      case 'error': return <Badge variant="destructive">Error</Badge>;
      default: return <Badge variant="secondary">Pending</Badge>;
    }
  };

  const isProcessing = workbook.status === 'processing' || workbook.status === 'pending';
  // Use progress from state if available, else if it's processing just show indeterminate/badge
  const currentProgress = uploadProgress.get(workbook.id);

  return (
    <Card 
      className={`group relative overflow-hidden transition-all duration-200 hover:shadow-md ${
        isProcessing ? 'opacity-80 cursor-not-allowed' : 'cursor-pointer hover:border-indigo-300 dark:hover:border-indigo-700'
      }`}
      onClick={() => !isProcessing && navigate(`/workbooks/${workbook.id}`)}
    >
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <div className="flex items-center space-x-2 overflow-hidden flex-1">
            <FileSpreadsheet className="text-emerald-500 shrink-0" size={24} />
            <div className="overflow-hidden flex-1">
              <CardTitle className="truncate text-lg" title={workbook.name}>
                {workbook.name}
              </CardTitle>
            </div>
          </div>
          <div className="shrink-0 ml-2">{getStatusBadge()}</div>
        </div>
      </CardHeader>
      <CardContent className="pb-4 text-sm text-zinc-500 dark:text-zinc-400 space-y-1">
        <p>Size: {formatBytes(workbook.fileSize)}</p>
        <p>Uploaded: {formatDate(workbook.createdAt)}</p>
        {workbook.errorMessage && (
          <p className="text-red-500 text-xs mt-2 line-clamp-2" title={workbook.errorMessage}>
            {workbook.errorMessage}
          </p>
        )}
      </CardContent>
      {isProcessing && currentProgress !== undefined && (
        <div className="px-6 pb-4">
          <Progress value={currentProgress} className="h-2" />
        </div>
      )}
      <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
        {!isProcessing && (
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8 text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950"
            onClick={handleDelete}
          >
            <Trash2 size={16} />
          </Button>
        )}
      </div>
    </Card>
  );
}
