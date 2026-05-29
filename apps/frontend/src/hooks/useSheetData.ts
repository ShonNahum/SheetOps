import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { Sheet, RowsResponse } from '../types';

export function useSheets(workbookId: string) {
  return useQuery({
    queryKey: ['sheets', workbookId],
    queryFn: async () => {
      if (!workbookId) return [];
      const { data } = await api.get<Sheet[]>(`/workbooks/${workbookId}/sheets`);
      return data;
    },
    enabled: !!workbookId,
  });
}

export function useSheetRows(workbookId: string, sheetId: string, pageSize = 200) {
  return useInfiniteQuery({
    queryKey: ['sheet-rows', sheetId],
    queryFn: async ({ pageParam = 0 }) => {
      const { data } = await api.get<RowsResponse>(
        `/workbooks/${workbookId}/sheets/${sheetId}/rows`,
        { params: { page: pageParam, pageSize } }
      );
      return data;
    },
    getNextPageParam: (lastPage, pages) => {
      if (!lastPage || !lastPage.total) return undefined;
      const loadedItems = pages.length * pageSize;
      return loadedItems < lastPage.total ? pages.length : undefined;
    },
    initialPageParam: 0,
    enabled: !!sheetId && !!workbookId,
  });
}

export function useUpdateCells() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ workbookId, sheetId, cells }: { workbookId: string; sheetId: string; cells: any[] }) => {
      await api.patch(`/workbooks/${workbookId}/sheets/${sheetId}/cells`, { cells });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['sheet-rows', variables.sheetId] });
    },
  });
}
