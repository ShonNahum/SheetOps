import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useWorkbook } from '../hooks/useWorkbooks';
import { useAppStore } from '../store/useAppStore';
import { useEffect, useState } from 'react';
import { ArrowLeft, Key, Download, BookOpen } from 'lucide-react';
import { Button } from '../components/ui/button';
import { useToast } from '../components/ui/toast/use-toast';
import { SheetTabs } from '../components/SheetTabs';
import { SheetTable } from '../components/SheetTable/SheetTable';
import { ApiKeyModal } from '../components/ApiKeyModal';
import { ApiDocumentation } from '../components/ApiDocumentation';

export default function WorkbookView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { data: workbook, isLoading, isError } = useWorkbook(id!);
  const { selectedSheetId, setSelectedSheet } = useAppStore();
  const { toast } = useToast();
  const [targetCell, setTargetCell] = useState<{ rowIndex: number; colIndex: number } | null>(null);
  const [isApiModalOpen, setIsApiModalOpen] = useState(false);
  const [isDocsOpen, setIsDocsOpen] = useState(false);

  useEffect(() => {
    if (!workbook?.sheets?.length) return;

    const sheetParam = searchParams.get('sheet');
    const rowParam = searchParams.get('row');
    const colParam = searchParams.get('col');

    // If URL has a specific sheet param, use that
    if (sheetParam && workbook.sheets.find((s) => s.id === sheetParam)) {
      setSelectedSheet(sheetParam);
    }
    // Otherwise, if no sheet is selected, use the first one
    else if (!selectedSheetId) {
      setSelectedSheet(workbook.sheets[0].id);
    }
    // Else keep the current selectedSheetId (user's choice from clicking tabs)

    if (rowParam !== null && colParam !== null) {
      setTargetCell({ rowIndex: Number(rowParam), colIndex: Number(colParam) });
    }
  }, [workbook, searchParams, selectedSheetId, setSelectedSheet]);

  // Clean up selection when unmounting
  useEffect(() => {
    return () => setSelectedSheet(null);
  }, [setSelectedSheet]);

  if (isLoading) return <div className="p-12 text-center text-zinc-500 animate-pulse">Loading workbook...</div>;
  if (isError || !workbook) return <div className="p-12 text-center text-red-500">Workbook not found.</div>;

  const handleExport = async () => {
    try {
      const response = await fetch(`/api/v1/workbooks/${workbook.id}/export`);
      const contentType = response.headers.get('content-type') || '';
      if (!response.ok) {
        const errorMessage = await response.text();
        throw new Error(errorMessage || 'Export failed');
      }
      if (contentType.includes('application/json')) {
        const errorJson = await response.json();
        throw new Error(errorJson.message || 'Export returned an error');
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${workbook.name || 'workbook'}.xlsx`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (error: any) {
      console.error('Export error:', error);
      toast({
        title: 'Export failed',
        description: error?.message || 'Could not download Excel',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="h-screen flex flex-col bg-white dark:bg-zinc-950 overflow-hidden">
      {/* Header */}
      <header className="border-b px-4 py-3 flex flex-col gap-4 shrink-0 bg-zinc-50 dark:bg-zinc-900">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/')} className="shrink-0">
              <ArrowLeft size={20} />
            </Button>
            <div className="overflow-hidden">
              <h1 className="text-xl font-semibold truncate" title={workbook.name}>{workbook.name}</h1>
              <p className="text-xs text-zinc-500 truncate">{workbook.originalFilename}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            <Button variant="outline" size="sm" onClick={() => setIsDocsOpen(true)}>
              <BookOpen size={16} className="mr-2" />
              API Docs
            </Button>
            <Button variant="outline" size="sm" onClick={() => setIsApiModalOpen(true)}>
              <Key size={16} className="mr-2" />
              API Keys
            </Button>
            <Button variant="default" size="sm" onClick={handleExport}>
              <Download size={16} className="mr-2" />
              Export
            </Button>
          </div>
        </div>

        <div className="overflow-x-auto py-2">
          <SheetTabs sheets={workbook.sheets || []} />
        </div>
      </header>

      {/* Main content - Table */}
      <main className="flex-1 overflow-hidden relative flex flex-col">
        {selectedSheetId ? (
          <SheetTable workbookId={workbook.id} sheetId={selectedSheetId} highlightCell={targetCell} />
        ) : (
          <div className="flex-1 flex items-center justify-center text-zinc-400">
            No sheet selected
          </div>
        )}
      </main>

      {isApiModalOpen && (
        <ApiKeyModal workbookId={workbook.id} onClose={() => setIsApiModalOpen(false)} />
      )}

      {isDocsOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-950 rounded-xl shadow-xl max-w-4xl max-h-[90vh] overflow-y-auto w-full">
            <div className="sticky top-0 bg-white dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-800 p-4 flex items-center justify-between">
              <h2 className="text-xl font-bold">API Documentation</h2>
              <Button variant="ghost" size="icon" onClick={() => setIsDocsOpen(false)}>
                ✕
              </Button>
            </div>
            <div className="p-6">
              <ApiDocumentation workbookId={workbook.id} sheetId={selectedSheetId || undefined} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
