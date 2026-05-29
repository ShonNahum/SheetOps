import { useDropzone } from 'react-dropzone';
import { Upload } from 'lucide-react';
import { useUpload } from '../hooks/useUpload';
import { useToast } from './ui/toast/use-toast';

export function FileDropzone() {
  const { uploadFile } = useUpload();
  const { toast } = useToast();

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
      'text/csv': ['.csv'],
    },
    maxSize: 2 * 1024 * 1024 * 1024, // 2 GB
    onDrop: async (acceptedFiles, rejectedFiles) => {
      if (rejectedFiles.length > 0) {
        toast({
          title: "File rejected",
          description: "Ensure file is under 2GB and is an Excel/CSV file.",
          variant: "destructive"
        });
        return;
      }
      for (const file of acceptedFiles) {
        try {
          await uploadFile(file);
          toast({
            title: "Upload started",
            description: `${file.name} is being uploaded.`
          });
        } catch (error) {
          toast({
            title: "Upload failed",
            description: `Failed to upload ${file.name}.`,
            variant: "destructive"
          });
        }
      }
    },
  });

  return (
    <div 
      {...getRootProps()} 
      className={`
        border-2 border-dashed rounded-2xl p-16 text-center cursor-pointer transition-colors duration-200
        ${isDragActive
          ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/30'
          : 'border-zinc-300 dark:border-zinc-700 hover:border-indigo-400 hover:bg-zinc-50 dark:hover:bg-zinc-900/50'}
      `}
    >
        <input {...getInputProps()} />
        <Upload className={`mx-auto mb-4 ${isDragActive ? 'text-indigo-600' : 'text-indigo-500'}`} size={48} />
        <p className="text-xl font-semibold text-zinc-800 dark:text-zinc-100">
          {isDragActive ? 'Release to upload' : 'Drag Excel files here'}
        </p>
        <p className="text-sm text-zinc-500 mt-2">.xlsx · .xls · .csv · up to 2 GB</p>
    </div>
  );
}
