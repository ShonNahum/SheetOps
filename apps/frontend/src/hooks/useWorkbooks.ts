import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { PaginatedResponse, Workbook } from '../types';

export function useWorkbooks(page = 0, limit = 50) {
  return useQuery({
    queryKey: ['workbooks', page, limit],
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<Workbook>>('/workbooks', {
        params: { page, limit },
      });
      return data;
    },
  });
}

export function useWorkbook(id: string) {
  return useQuery({
    queryKey: ['workbook', id],
    queryFn: async () => {
      if (!id) return null;
      const { data } = await api.get<Workbook>(`/workbooks/${id}`);
      return data;
    },
    enabled: !!id,
  });
}

export function useDeleteWorkbook() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/workbooks/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workbooks'] });
    },
  });
}
