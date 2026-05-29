export interface Workbook {
  id: string;
  name: string;
  originalFilename: string;
  fileSize: number;
  filePath: string;
  status: 'pending' | 'processing' | 'ready' | 'error';
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
  sheets?: Sheet[];
}

export interface Sheet {
  id: string;
  workbookId: string;
  name: string;
  sheetIndex: number;
  rowCount: number;
  colCount: number;
  headers: string[];
  createdAt: string;
}

export interface SheetRow {
  rowIndex: number;
  data: any[];
}

export interface ApiKey {
  id: string;
  workbookId: string;
  name: string;
  keyHash: string;
  lastUsed: string;
  createdAt: string;
}

export interface Job {
  id: string;
  workbookId: string;
  type: string;
  status: 'queued' | 'processing' | 'done' | 'failed';
  progress: number;
  result: any;
  error: string;
  createdAt: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit?: number;
  pageSize?: number;
}

export interface RowsResponse {
  headers: string[];
  rows: SheetRow[];
  total: number;
  page: number;
  pageSize: number;
}

export interface UploadResponse {
  jobId: string;
  workbookId: string;
}
