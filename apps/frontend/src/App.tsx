import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './lib/queryClient';
import Dashboard from './pages/Dashboard';
import WorkbookView from './pages/WorkbookView';
import NotFound from './pages/NotFound';
import { Toaster } from './components/ui/toast';
import { useAppStore } from './store/useAppStore';
import { useEffect } from 'react';

function App() {
  const { darkMode } = useAppStore();

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  useEffect(() => {
    // Auto-detect RTL languages
    const language = navigator.language || (navigator as any).userLanguage || 'en';
    const rtlLanguages = ['he', 'ar', 'ur', 'fa', 'yi'];
    const isRTL = rtlLanguages.some(lang => language.startsWith(lang));
    document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/workbooks/:id" element={<WorkbookView />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
      <div className="fixed left-4 bottom-4 z-50 text-xs text-zinc-500 dark:text-zinc-400 bg-white/80 dark:bg-zinc-950/80 px-3 py-2 rounded-lg shadow-lg backdrop-blur-sm">
        Credits: Shon Nahum
      </div>
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;
