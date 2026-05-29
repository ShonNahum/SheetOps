import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';

export interface SearchResult {
  workbookId: string;
  workbookName: string;
  originalFilename: string;
  sheetId: string;
  sheetName: string;
  rowIndex: number;
  matches: {
    colIndex: number;
    value: string;
  }[];
}

export interface SearchResponse {
  results: SearchResult[];
  query: string;
}

export function useGlobalSearch(query: string, enabled: boolean = false) {
  return useQuery({
    queryKey: ['search', query],
    queryFn: async () => {
      if (!query || query.length < 2) return { results: [], query };
      const { data } = await api.get<SearchResponse>('/workbooks/search', {
        params: { q: query, limit: 100 },
      });
      return data;
    },
    enabled: enabled && query.length >= 2,
    staleTime: 30000, // 30 seconds
  });
}
