import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { socket } from '../lib/socket';
import { useAppStore } from '../store/useAppStore';
import { UploadResponse } from '../types';

export function useUpload() {
  const [isUploading, setIsUploading] = useState(false);
  const queryClient = useQueryClient();
  const { setUploadProgress, removeUploadProgress } = useAppStore();

  const uploadFile = async (file: File) => {
    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const tempId = `upload-${Date.now()}`;
      setUploadProgress(tempId, 0);

      const { data } = await api.post<UploadResponse>('/workbooks/upload', formData, {
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / (progressEvent.total || 1));
          setUploadProgress(tempId, percentCompleted);
        },
      });

      // Remove temp progress, now tracking by workbook ID
      removeUploadProgress(tempId);
      
      // Track progress by workbookId so WorkbookCard can display it
      if (data.workbookId) {
        setUploadProgress(data.workbookId, 0);
      }
      
      queryClient.invalidateQueries({ queryKey: ['workbooks'], exact: false });

      // Subscribe to backend processing job via Socket
      socket.emit('subscribe_job', { jobId: data.jobId });
      
      return data;
    } catch (error) {
      console.error('Upload failed', error);
      throw error;
    } finally {
      setIsUploading(false);
    }
  };

  return { uploadFile, isUploading };
}
