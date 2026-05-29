import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, FileSpreadsheet, MapPin, Loader2 } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { useGlobalSearch, SearchResult } from '../hooks/useGlobalSearch';
import { useAppStore } from '../store/useAppStore';

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function GlobalSearchModal({ isOpen, onClose }: GlobalSearchModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const navigate = useNavigate();
  const { setSelectedSheet } = useAppStore();

  const { data, isLoading } = useGlobalSearch(debouncedQuery, isOpen);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleResultClick = (result: SearchResult) => {
    setSelectedSheet(result.sheetId);
    navigate(`/workbooks/${result.workbookId}?sheet=${encodeURIComponent(result.sheetId)}&row=${result.rowIndex}&col=${result.matches[0]?.colIndex ?? 0}`);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-zinc-950 rounded-xl shadow-xl max-w-2xl w-full max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 p-4">
          <h2 className="text-xl font-bold">Search All Files</h2>
          <button
            onClick={onClose}
            className="inline-flex h-6 w-6 items-center justify-center rounded text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 dark:text-zinc-400"
          >
            <X size={20} />
          </button>
        </div>

        {/* Search Input */}
        <div className="p-4 border-b border-zinc-200 dark:border-zinc-800">
          <Input
            autoFocus
            placeholder="Search for values (e.g., 'shon', 'john@example.com')..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full"
          />
          {searchQuery.length > 0 && searchQuery.length < 2 && (
            <p className="text-xs text-zinc-500 mt-2">Type at least 2 characters to search</p>
          )}
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto">
          {isLoading && debouncedQuery.length >= 2 ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="animate-spin text-indigo-500 mr-2" size={24} />
              <span className="text-zinc-500">Searching...</span>
            </div>
          ) : data?.results && data.results.length > 0 ? (
            <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {data.results.map((result, idx) => (
                <div
                  key={`${result.workbookId}-${result.sheetId}-${result.rowIndex}-${idx}`}
                  className="p-4 hover:bg-zinc-50 dark:hover:bg-zinc-900/50 cursor-pointer transition-colors"
                  onClick={() => handleResultClick(result)}
                >
                  <div className="flex items-start gap-3">
                    <FileSpreadsheet className="text-emerald-500 mt-1 shrink-0" size={20} />
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm text-zinc-900 dark:text-white truncate">
                        {result.workbookName}
                      </div>
                      <div className="text-xs text-zinc-500 mt-1 truncate">
                        {result.originalFilename}
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-xs bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 px-2 py-1 rounded">
                          📄 {result.sheetName}
                        </span>
                        <MapPin size={14} className="text-zinc-400" />
                        <span className="text-xs text-zinc-600 dark:text-zinc-400">
                          Row {result.rowIndex + 1}
                        </span>
                      </div>
                      <div className="mt-2 space-y-1">
                        {result.matches.map((match, midx) => (
                          <div
                            key={midx}
                            className="text-sm text-zinc-700 dark:text-zinc-300 bg-yellow-50 dark:bg-yellow-900/20 px-2 py-1 rounded line-clamp-2"
                          >
                            <span className="font-mono text-xs text-zinc-500">Col {match.colIndex + 1}:</span>{' '}
                            {match.value}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : debouncedQuery.length >= 2 ? (
            <div className="flex items-center justify-center py-12 text-zinc-500">
              No results found for "{debouncedQuery}"
            </div>
          ) : (
            <div className="flex items-center justify-center py-12 text-zinc-500">
              Enter a search term to find values across all your files
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
