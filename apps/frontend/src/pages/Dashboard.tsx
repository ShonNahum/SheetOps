import { FileDropzone } from '../components/FileDropzone';
import { WorkbookList } from '../components/WorkbookList';
import { GlobalSearchModal } from '../components/GlobalSearchModal';
import { useSocketJobs } from '../hooks/useSocket';
import { Search, Moon, Sun } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { Button } from '../components/ui/button';
import { useState } from 'react';

export default function Dashboard() {
  useSocketJobs(); // Initialize socket listeners
  const { darkMode, toggleDarkMode } = useAppStore();
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b bg-white dark:bg-zinc-950 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 dark:bg-indigo-500 text-white flex items-center justify-center font-bold text-xl">S</div>
          <h1 className="text-2xl font-bold tracking-tight">SheetOps</h1>
        </div>
        
        <div className="flex items-center gap-2">
          <Button 
            variant="outline"
            size="sm"
            onClick={() => setIsSearchOpen(true)}
          >
            <Search size={16} className="mr-2" />
            Search values
          </Button>
          <Button variant="ghost" size="icon" onClick={toggleDarkMode} className="rounded-full">
            {darkMode ? <Sun size={20} /> : <Moon size={20} />}
          </Button>
        </div>
      </header>

      <main className="flex-1 p-6 md:p-12 max-w-7xl mx-auto w-full space-y-12">
        <section>
          <div className="mb-6 text-center">
            <h2 className="text-3xl font-bold mb-2">Upload Data</h2>
            <p className="text-zinc-500">Drag and drop your Excel or CSV files to process them.</p>
          </div>
          <FileDropzone />
        </section>

        <section>
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-2xl font-semibold">Your Workbooks</h2>
          </div>
          <WorkbookList />
        </section>
      </main>

      <GlobalSearchModal isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
    </div>
  );
}
