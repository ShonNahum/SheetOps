import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AppState {
  currentWorkbookId: string | null;
  selectedSheetId: string | null;
  uploadProgress: Map<string, number>;
  searchQuery: string;
  darkMode: boolean;
  setCurrentWorkbook: (id: string | null) => void;
  setSelectedSheet: (id: string | null) => void;
  setUploadProgress: (jobId: string, progress: number) => void;
  removeUploadProgress: (jobId: string) => void;
  setSearchQuery: (query: string) => void;
  toggleDarkMode: () => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      currentWorkbookId: null,
      selectedSheetId: null,
      uploadProgress: new Map(),
      searchQuery: '',
      darkMode: false,
      setCurrentWorkbook: (id) => set({ currentWorkbookId: id }),
      setSelectedSheet: (id) => set({ selectedSheetId: id }),
      setUploadProgress: (jobId, progress) => 
        set((state) => {
          const newMap = new Map(state.uploadProgress);
          newMap.set(jobId, progress);
          return { uploadProgress: newMap };
        }),
      removeUploadProgress: (jobId) =>
        set((state) => {
          const newMap = new Map(state.uploadProgress);
          newMap.delete(jobId);
          return { uploadProgress: newMap };
        }),
      setSearchQuery: (query) => set({ searchQuery: query }),
      toggleDarkMode: () => set((state) => ({ darkMode: !state.darkMode })),
    }),
    {
      name: 'sheetops-storage',
      partialize: (state) => ({ darkMode: state.darkMode }),
    }
  )
);
