import { useEffect } from 'react';
import { socket } from '../lib/socket';
import { useAppStore } from '../store/useAppStore';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '../components/ui/toast/use-toast'; // We will create a simple toast hook

export function useSocketJobs() {
  const { setUploadProgress, removeUploadProgress } = useAppStore();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  useEffect(() => {
    const onProgress = (data: { jobId: string; progress: number; status: string; workbookId?: string }) => {
      // Update by workbookId if available, otherwise by jobId
      const trackId = data.workbookId || data.jobId;
      setUploadProgress(trackId, data.progress);
    };

    const onDone = (data: { jobId: string; workbookId: string }) => {
      // Remove by workbookId
      removeUploadProgress(data.workbookId);
      
      // Invalidate and refetch related queries to trigger refresh
      queryClient.invalidateQueries({ queryKey: ['workbooks'], exact: false });
      queryClient.invalidateQueries({ queryKey: ['workbook', data.workbookId] });
      queryClient.invalidateQueries({ queryKey: ['sheet-rows'], exact: false });
      queryClient.refetchQueries({ queryKey: ['workbooks'], exact: false });
      queryClient.refetchQueries({ queryKey: ['workbook', data.workbookId] });

      toast({
        title: "Upload completed",
        description: "Your file has been processed successfully.",
      });
    };

    const onError = (data: { jobId: string; error: string; workbookId?: string }) => {
      const trackId = data.workbookId || data.jobId;
      removeUploadProgress(trackId);
      queryClient.invalidateQueries({ queryKey: ['workbooks'], exact: false });
      if (data.workbookId) {
        queryClient.invalidateQueries({ queryKey: ['workbook', data.workbookId] });
      }
      toast({
        title: "Upload failed",
        description: data.error || "An error occurred during processing.",
        variant: "destructive"
      });
    };

    socket.on('job_progress', onProgress);
    socket.on('job_done', onDone);
    socket.on('job_error', onError);

    return () => {
      socket.off('job_progress', onProgress);
      socket.off('job_done', onDone);
      socket.off('job_error', onError);
    };
  }, [setUploadProgress, removeUploadProgress, queryClient, toast]);
}
