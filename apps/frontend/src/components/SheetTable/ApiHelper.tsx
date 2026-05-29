import { useState } from 'react';
import { Copy, X } from 'lucide-react';
import { Button } from '../ui/button';
import { useToast } from '../ui/toast/use-toast';

interface ApiHelperProps {
  type: 'cell' | 'row' | 'column';
  workbookId: string;
  sheetId: string;
  rowIndex?: number;
  colIndex?: number;
  colName?: string;
  onClose: () => void;
}

export function ApiHelper({ type, workbookId, sheetId, rowIndex, colIndex, colName, onClose }: ApiHelperProps) {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const getApiCommand = () => {
    const baseUrl = `/api/v1/workbooks/${workbookId}/sheets/${sheetId}`;
    
    switch (type) {
      case 'cell':
        return {
          title: `Get Cell (R${rowIndex! + 1} C${colIndex! + 1})`,
          command: `GET ${baseUrl}/cells/${rowIndex}/${colIndex}`,
          response: `{\n  "rowIndex": ${rowIndex},\n  "colIndex": ${colIndex},\n  "value": "cell value here"\n}`,
          description: 'Returns just the cell value'
        };
      case 'row':
        return {
          title: `Get Row ${rowIndex! + 1}`,
          command: `GET ${baseUrl}/rows/${rowIndex}`,
          response: `{\n  "rowIndex": ${rowIndex},\n  "data": ["value1", "value2", "value3", ...]\n}`,
          description: 'Returns entire row with all columns'
        };
      case 'column':
        return {
          title: `Get Column "${colName}"`,
          command: `GET ${baseUrl}/columns/${colIndex}`,
          response: `{\n  "colIndex": ${colIndex},\n  "values": [\n    {"rowIndex": 0, "value": "value1"},\n    {"rowIndex": 1, "value": "value2"},\n    ...\n  ]\n}`,
          description: 'Returns all values in this column'
        };
    }
  };

  const api = getApiCommand();

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(api.command);
      setCopied(true);
      toast({
        title: "Copied!",
        description: "API command copied to clipboard"
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast({
        title: "Copy failed",
        description: "Could not copy to clipboard",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-2xl animate-in fade-in slide-in-from-bottom-4">
      <div className="rounded-lg border border-zinc-200 bg-white shadow-lg dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-start justify-between border-b border-zinc-200 p-3 dark:border-zinc-800">
          <div>
            <p className="text-sm font-semibold text-zinc-900 dark:text-white">{api.title}</p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">{api.description}</p>
          </div>
          <button
            onClick={onClose}
            className="inline-flex h-6 w-6 items-center justify-center rounded text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 dark:text-zinc-400"
          >
            <X size={16} />
          </button>
        </div>
        
        <div className="p-3 border-b border-zinc-200 dark:border-zinc-800">
          <p className="text-xs font-semibold text-zinc-600 dark:text-zinc-300 mb-2">Request:</p>
          <pre className="overflow-x-auto rounded-md bg-zinc-100 p-2 text-xs text-zinc-800 dark:bg-zinc-800 dark:text-zinc-100">
            <code>{api.command}</code>
          </pre>
        </div>

        <div className="p-3 border-b border-zinc-200 dark:border-zinc-800">
          <p className="text-xs font-semibold text-zinc-600 dark:text-zinc-300 mb-2">Response Example:</p>
          <pre className="overflow-x-auto rounded-md bg-zinc-100 p-2 text-xs text-zinc-800 dark:bg-zinc-800 dark:text-zinc-100 max-h-40">
            <code>{api.response}</code>
          </pre>
        </div>

        <div className="flex gap-2 p-3">
          <Button
            size="sm"
            variant="default"
            onClick={handleCopy}
            className="gap-2"
          >
            <Copy size={14} />
            {copied ? 'Copied!' : 'Copy'}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={onClose}
          >
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
