import { Sheet } from '../types';
import { useAppStore } from '../store/useAppStore';

export function SheetTabs({ sheets }: { sheets: Sheet[] }) {
  const { selectedSheetId, setSelectedSheet } = useAppStore();

  return (
    <div className="flex space-x-1">
      {sheets.map((sheet) => (
        <button
          key={sheet.id}
          onClick={() => setSelectedSheet(sheet.id)}
          className={`
            px-4 py-2 text-sm font-medium rounded-t-md transition-colors whitespace-nowrap
            ${selectedSheetId === sheet.id 
              ? 'bg-white dark:bg-zinc-950 text-indigo-600 dark:text-indigo-400 border-t-2 border-indigo-500 shadow-sm' 
              : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-800'}
          `}
        >
          {sheet.name}
        </button>
      ))}
    </div>
  );
}
