import { useEffect, useRef, useState, useMemo } from 'react';
import { useSheetRows, useUpdateCells } from '../../hooks/useSheetData';
import { useToast } from '../ui/toast/use-toast';
import { ApiHelper } from './ApiHelper';

interface SelectedCell {
  rowIndex: number;
  colIndex: number;
  value: string;
}

interface ApiHelperState {
  type: 'cell' | 'row' | 'column' | null;
  rowIndex?: number;
  colIndex?: number;
  colName?: string;
}

export function SheetTable({ workbookId, sheetId, highlightCell }: { workbookId: string; sheetId: string; highlightCell?: { rowIndex: number; colIndex: number } | null }) {
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } = useSheetRows(workbookId, sheetId);
  const updateCells = useUpdateCells();
  const { toast } = useToast();
  const observerTarget = useRef<HTMLDivElement>(null);

  // Flatten infinite pages
  const headers = data?.pages[0]?.headers || [];
  const rows = useMemo(() => data?.pages.flatMap(p => p.rows) || [], [data]);

  // Intersection observer for infinite scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { threshold: 0.1 }
    );
    if (observerTarget.current) observer.observe(observerTarget.current);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const [editingCell, setEditingCell] = useState<{ rowIdx: number; colIdx: number; value: string } | null>(null);
  const [apiHelper, setApiHelper] = useState<ApiHelperState>({ type: null });

  useEffect(() => {
    if (highlightCell) {
      const element = document.getElementById(`cell-${highlightCell.rowIndex}-${highlightCell.colIndex}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
        element.classList.add('ring-2', 'ring-indigo-500');
        setTimeout(() => element.classList.remove('ring-2', 'ring-indigo-500'), 3000);
      }
    }
  }, [highlightCell]);

  const handleCellDoubleClick = (rowIdx: number, colIdx: number, value: any) => {
    setEditingCell({ rowIdx, colIdx, value: String(value || '') });
  };

  const handleCellClick = (rowIdx: number, colIdx: number) => {
    setApiHelper({ type: 'cell', rowIndex: rowIdx, colIndex: colIdx });
  };

  const handleRowClick = (rowIdx: number) => {
    setApiHelper({ type: 'row', rowIndex: rowIdx });
  };

  const handleColumnClick = (colIdx: number, colName: string) => {
    setApiHelper({ type: 'column', colIndex: colIdx, colName });
  };

  const saveCell = async () => {
    if (editingCell) {
      try {
        await updateCells.mutateAsync({
          workbookId,
          sheetId,
          cells: [{ rowIndex: editingCell.rowIdx, colIndex: editingCell.colIdx, value: editingCell.value }]
        });
        toast({
          title: "✓ Cell updated",
          description: `Row ${editingCell.rowIdx + 1}, Column ${editingCell.colIdx + 1}`,
        });
        setEditingCell(null);
      } catch (error) {
        console.error('Failed to update cell:', error);
        toast({
          title: "❌ Update failed",
          description: "Could not update the cell. Try again.",
          variant: "destructive"
        });
      }
    }
  };

  if (isLoading) return <div className="p-8 text-zinc-500">Loading data...</div>;

  return (
    <div className="flex-1 overflow-auto bg-white dark:bg-zinc-950">
      <div className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 px-4 py-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-sm font-semibold text-zinc-700 dark:text-zinc-200">📝 Table Editor & API Helper</h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              🖱️ Single-click cell to see API • 🖱️ Click row # for row API • 🖱️ Click column name for column API
            </p>
          </div>
        </div>
      </div>

      <table className="w-full border-collapse text-sm whitespace-nowrap">
        <thead className="sticky top-0 bg-zinc-100 dark:bg-zinc-900 shadow-sm z-10">
          <tr>
            <th className="border-r border-b px-4 py-2 text-left font-medium text-zinc-500 w-12 sticky left-0 bg-zinc-100 dark:bg-zinc-900 z-20">#</th>
            {headers.map((h, i) => (
              <th 
                key={i} 
                className="border-r border-b px-4 py-2 text-left font-medium text-zinc-700 dark:text-zinc-300 min-w-[120px] cursor-pointer hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors"
                onClick={() => handleColumnClick(i, h)}
                title="Click to see API for this column"
              >
                <span dir="auto" className="block truncate">{h}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.rowIndex} className="border-b hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors">
              <td 
                className="border-r px-4 py-2 text-zinc-400 sticky left-0 bg-white dark:bg-zinc-950 z-10 select-none cursor-pointer font-semibold hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors"
                onClick={() => handleRowClick(row.rowIndex)}
                title="Click to see API for this row"
              >
                {row.rowIndex + 1}
              </td>
              {headers.map((_, colIdx) => {
                const cellValue = row.data[colIdx] ?? '';
                const isEditing = editingCell?.rowIdx === row.rowIndex && editingCell?.colIdx === colIdx;

                return (
                  <td 
                    key={colIdx} 
                    className="border-r px-4 py-2 relative cursor-pointer hover:bg-yellow-50 dark:hover:bg-yellow-900/20 transition-colors"
                    onClick={() => !isEditing && handleCellClick(row.rowIndex, colIdx)}
                    onDoubleClick={() => handleCellDoubleClick(row.rowIndex, colIdx, cellValue)}
                  >
                    {isEditing ? (
                      <input
                        autoFocus
                        type="text"
                        className="absolute inset-0 w-full h-full px-4 py-2 outline-none border-2 border-indigo-500 bg-white dark:bg-zinc-800 text-foreground z-30 rounded-none"
                        value={editingCell.value}
                        onChange={e => setEditingCell({ ...editingCell, value: e.target.value })}
                        onBlur={saveCell}
                        onKeyDown={e => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            saveCell();
                          }
                          if (e.key === 'Escape') {
                            setEditingCell(null);
                          }
                        }}
                      />
                    ) : (
                      <span dir="auto" className="truncate max-w-[300px] block" title={String(cellValue)}>
                        {String(cellValue)}
                      </span>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      {hasNextPage && (
        <div ref={observerTarget} className="p-4 text-center text-sm text-zinc-500">
          Loading more rows...
        </div>
      )}

      {apiHelper.type && (
        <ApiHelper
          type={apiHelper.type}
          workbookId={workbookId}
          sheetId={sheetId}
          rowIndex={apiHelper.rowIndex}
          colIndex={apiHelper.colIndex}
          colName={apiHelper.colName}
          onClose={() => setApiHelper({ type: null })}
        />
      )}
    </div>
  );
}
