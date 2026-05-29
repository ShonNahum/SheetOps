# SheetOps — Claude Code Implementation Specification
> Paste the **PROMPT** section directly into Claude Code, then reference the rest as implementation detail.

---

## ⚡ CLAUDE CODE PROMPT (copy-paste this)

```
You are building SheetOps — a production-grade, air-gapped Excel management platform.

Follow the full specification in sheetops-claudecode-spec.md exactly.
Implement the project phase by phase as listed in the "Implementation Phases" section.
Do not skip any phase. Ask for confirmation between phases.

Key non-negotiables:
- 1 GB file uploads must NOT crash the server (disk-streaming only, never memory-buffered)
- All containers must run as non-root (OpenShift SCC compatible)
- Air-gapped: zero external network calls at runtime, all assets bundled
- High Availability: every service has replica count ≥ 2 with PodDisruptionBudget
- The table UI must use virtual scrolling (TanStack Virtual) — no DOM-heavy pagination hacks
- Helm chart must be fully self-contained with bitnami Redis + PostgreSQL as subcharts

Start with Phase 1: Monorepo scaffold + Docker base images.
After each phase run the smoke-test commands listed for that phase and confirm they pass.
```

---

## 1. Project Overview

**SheetOps** is a web platform where users:
1. Drag-and-drop Excel files (`.xlsx`, `.xls`, `.csv`) into a stunning table UI
2. Read / Write / Update cells inline in the browser
3. Export modified data back to `.xlsx`
4. Access any uploaded sheet via a REST API with an API key (external integrations)

Deployed as a **single Helm chart** on OpenShift / k3s in an **air-gapped** (offline) network.

---

## 2. Architecture

### 2.1 High-Level Diagram

```
                ┌─────────────────────────────────────────────┐
                │         OpenShift / k3s Cluster              │
                │                                               │
  Browser ──────►  Ingress / Route                             │
                │       │                                       │
                │  ┌────▼────────┐   ┌──────────────────────┐ │
                │  │  Frontend   │   │       API Service     │ │
                │  │  (Nginx)    │   │  (NestJS, 2 replicas) │ │
                │  │  2 replicas │   │  POST /upload (stream)│ │
                │  └─────────────┘   │  GET  /workbooks      │ │
                │                    │  WebSocket (progress) │ │
                │                    └──────────┬───────────┘  │
                │                               │               │
                │         ┌─────────────────────┼──────────┐   │
                │         │                     │          │   │
                │  ┌──────▼──────┐   ┌──────────▼──────┐   │   │
                │  │   Worker    │   │   PostgreSQL 15  │   │   │
                │  │ (BullMQ)    │   │   (StatefulSet)  │   │   │
                │  │ 1-2 replicas│   └─────────────────┘   │   │
                │  └──────┬──────┘                          │   │
                │         │           ┌─────────────────┐   │   │
                │         └──────────►│    Redis 7       │   │   │
                │                     │   (StatefulSet)  │   │   │
                │                     └─────────────────┘   │   │
                │                                            │   │
                │         ┌──────────────────────────────┐   │   │
                │         │  PVC — file-storage (RWX/NFS)│   │   │
                │         │  /data/uploads  /data/temp   │   │   │
                │         └──────────────────────────────┘   │   │
                └────────────────────────────────────────────┘
```

### 2.2 Upload Flow (1 GB safe)

```
Client                  API Pod                   PVC          BullMQ/Redis     Worker Pod
  │                        │                        │               │                │
  │─── POST /upload ───────►│ multer diskStorage     │               │                │
  │   (streaming multipart) │──── write stream ─────►│               │                │
  │                        │   (never in memory)    │               │                │
  │◄── 202 { jobId } ──────│                        │               │                │
  │                        │──── enqueue job ───────────────────────►│                │
  │                        │                        │               │                │
  │── WS subscribe(jobId)──►│                        │               │─── dequeue ────►│
  │                        │                        │               │                │
  │                        │                        │◄── stream read ────────────────│
  │                        │                        │    ExcelJS.stream              │
  │                        │                        │    (row by row)                │
  │                        │                        │                │               │
  │                        │                        │                │──── upsert ───►PostgreSQL
  │◄── WS progress(%) ─────│◄──────────────── progress events ──────│                │
  │◄── WS done ────────────│◄────────────── job complete ───────────│                │
```

### 2.3 Data Flow for HA Reads

All cell data lives in **PostgreSQL** after processing.
API pods read directly from PostgreSQL — no file I/O on reads.
Original Excel files stored on PVC are kept only for re-export reference.

---

## 3. Technology Stack

| Layer | Technology | Reason |
|---|---|---|
| Frontend | React 18 + Vite + TypeScript | Fast builds, great DX |
| UI library | shadcn/ui + Tailwind CSS v3 | Beautiful, accessible |
| Table | TanStack Table v8 + TanStack Virtual | Virtual scroll, 100k rows |
| File drop | react-dropzone | Reliable, accessible |
| State | Zustand | Simple, no boilerplate |
| Server state | TanStack Query v5 | Cache + mutation |
| HTTP | Axios | Interceptors, progress |
| WS client | socket.io-client | Upload progress |
| API | NestJS 10 (TypeScript) | Modular, decorators |
| ORM | TypeORM | PostgreSQL entity mapping |
| Job queue | BullMQ | Redis-backed, reliable |
| File upload | Multer (diskStorage) | Stream to disk, no memory |
| Excel parse | ExcelJS (streaming) | Handles 1 GB, row-by-row |
| Excel export | ExcelJS | Same lib, streaming write |
| WebSocket | Socket.io (NestJS gateway) | Upload progress events |
| Database | PostgreSQL 15 | JSONB, partitioned rows |
| Cache/Queue | Redis 7 | BullMQ + API cache |
| File store | Kubernetes PVC | Durable, air-gapped |
| Container | Node 20 Alpine, Nginx Alpine | Small, non-root |
| Helm | Helm 3 + bitnami subcharts | Bundled offline |
| Package mgr | pnpm workspaces | Fast, monorepo-friendly |

---

## 4. Project Structure

```
sheetops/
├── CLAUDE.md                        # This spec file (copy here)
├── package.json                     # pnpm workspace root
├── pnpm-workspace.yaml
├── turbo.json                       # (optional Turborepo)
│
├── apps/
│   ├── frontend/                    # React SPA
│   │   ├── src/
│   │   │   ├── components/
│   │   │   │   ├── ui/              # shadcn/ui primitives
│   │   │   │   ├── FileDropzone.tsx
│   │   │   │   ├── SheetTable/
│   │   │   │   │   ├── SheetTable.tsx      # TanStack Table + Virtual
│   │   │   │   │   ├── EditableCell.tsx
│   │   │   │   │   ├── ColumnHeader.tsx
│   │   │   │   │   └── Toolbar.tsx
│   │   │   │   ├── WorkbookList.tsx
│   │   │   │   ├── WorkbookCard.tsx
│   │   │   │   ├── SheetTabs.tsx
│   │   │   │   ├── UploadProgress.tsx
│   │   │   │   ├── ApiKeyModal.tsx
│   │   │   │   └── ExportButton.tsx
│   │   │   ├── pages/
│   │   │   │   ├── Dashboard.tsx    # Workbook list + dropzone
│   │   │   │   ├── WorkbookView.tsx # Table view for a workbook
│   │   │   │   └── NotFound.tsx
│   │   │   ├── hooks/
│   │   │   │   ├── useWorkbooks.ts
│   │   │   │   ├── useSheetData.ts
│   │   │   │   ├── useUpload.ts
│   │   │   │   └── useSocket.ts
│   │   │   ├── lib/
│   │   │   │   ├── api.ts           # Axios instance
│   │   │   │   ├── queryClient.ts
│   │   │   │   └── socket.ts
│   │   │   ├── store/
│   │   │   │   └── useAppStore.ts   # Zustand
│   │   │   ├── types/
│   │   │   │   └── index.ts
│   │   │   ├── App.tsx
│   │   │   └── main.tsx
│   │   ├── public/
│   │   ├── index.html
│   │   ├── vite.config.ts
│   │   ├── tailwind.config.ts
│   │   ├── nginx.conf               # Nginx config, SPA fallback
│   │   ├── Dockerfile
│   │   └── package.json
│   │
│   ├── api/                         # NestJS API
│   │   ├── src/
│   │   │   ├── app.module.ts
│   │   │   ├── main.ts              # Bootstrap, body size limit off
│   │   │   ├── config/
│   │   │   │   └── configuration.ts
│   │   │   ├── database/
│   │   │   │   ├── database.module.ts
│   │   │   │   └── migrations/
│   │   │   ├── entities/
│   │   │   │   ├── workbook.entity.ts
│   │   │   │   ├── sheet.entity.ts
│   │   │   │   ├── sheet-row.entity.ts
│   │   │   │   └── api-key.entity.ts
│   │   │   ├── workbooks/
│   │   │   │   ├── workbooks.module.ts
│   │   │   │   ├── workbooks.controller.ts
│   │   │   │   ├── workbooks.service.ts
│   │   │   │   └── dto/
│   │   │   ├── upload/
│   │   │   │   ├── upload.module.ts
│   │   │   │   ├── upload.controller.ts  # Stream to disk
│   │   │   │   └── upload.service.ts
│   │   │   ├── sheets/
│   │   │   │   ├── sheets.module.ts
│   │   │   │   ├── sheets.controller.ts
│   │   │   │   ├── sheets.service.ts
│   │   │   │   └── dto/
│   │   │   ├── data-api/            # External READ/WRITE API
│   │   │   │   ├── data-api.module.ts
│   │   │   │   ├── data-api.controller.ts
│   │   │   │   ├── data-api.service.ts
│   │   │   │   └── api-key.guard.ts
│   │   │   ├── export/
│   │   │   │   ├── export.module.ts
│   │   │   │   └── export.service.ts
│   │   │   ├── jobs/
│   │   │   │   ├── jobs.module.ts
│   │   │   │   ├── jobs.service.ts
│   │   │   │   └── jobs.gateway.ts  # Socket.io WebSocket
│   │   │   └── shared/
│   │   │       ├── redis.module.ts
│   │   │       └── bull.config.ts
│   │   ├── Dockerfile
│   │   ├── nest-cli.json
│   │   └── package.json
│   │
│   └── worker/                      # BullMQ worker (separate process)
│       ├── src/
│       │   ├── app.module.ts
│       │   ├── main.ts
│       │   └── processors/
│       │       ├── excel.processor.ts   # ExcelJS streaming parse
│       │       └── export.processor.ts  # ExcelJS streaming write
│       ├── Dockerfile
│       └── package.json
│
├── helm/
│   └── sheetops/
│       ├── Chart.yaml
│       ├── Chart.lock
│       ├── values.yaml              # All defaults, private registry ready
│       ├── values-openshift.yaml    # OpenShift overrides (SCC, Routes)
│       ├── values-k3s.yaml          # k3s overrides (Longhorn, Traefik)
│       ├── charts/                  # Vendored subcharts (offline)
│       │   ├── redis-*.tgz
│       │   └── postgresql-*.tgz
│       └── templates/
│           ├── _helpers.tpl
│           ├── NOTES.txt
│           ├── namespace.yaml
│           ├── serviceaccount.yaml
│           ├── frontend/
│           │   ├── deployment.yaml
│           │   ├── service.yaml
│           │   └── configmap-nginx.yaml
│           ├── api/
│           │   ├── deployment.yaml
│           │   ├── service.yaml
│           │   ├── hpa.yaml
│           │   └── pdb.yaml
│           ├── worker/
│           │   ├── deployment.yaml
│           │   ├── hpa.yaml
│           │   └── pdb.yaml
│           ├── storage/
│           │   └── pvc.yaml
│           ├── config/
│           │   ├── configmap.yaml
│           │   └── secret.yaml
│           ├── ingress.yaml         # Ingress (k3s/generic)
│           ├── route.yaml           # OpenShift Route
│           └── networkpolicy.yaml
│
├── docker-compose.yml               # Local dev
├── .env.example
└── README.md
```

---

## 5. Environment Configuration

### `.env.example`
```env
# Database
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=sheetops
POSTGRES_USER=sheetops
POSTGRES_PASSWORD=changeme

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# App
API_PORT=3001
NODE_ENV=production
UPLOAD_DIR=/data/uploads
TEMP_DIR=/data/temp
MAX_FILE_SIZE_BYTES=2147483648   # 2 GB hard limit
JWT_SECRET=changeme-long-secret

# OpenShift/k3s
ALLOWED_ORIGINS=https://sheetops.example.com
```

---

## 6. Database Schema

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─────────────────────────────────────────────────────
-- Workbooks: one per uploaded file
-- ─────────────────────────────────────────────────────
CREATE TABLE workbooks (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name             VARCHAR(255) NOT NULL,
  original_filename VARCHAR(255) NOT NULL,
  file_size        BIGINT,
  file_path        TEXT,                          -- path on PVC
  status           VARCHAR(50)  NOT NULL DEFAULT 'pending',
                                                  -- pending | processing | ready | error
  error_message    TEXT,
  created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_workbooks_status ON workbooks(status);
CREATE INDEX idx_workbooks_created ON workbooks(created_at DESC);

-- ─────────────────────────────────────────────────────
-- Sheets: one per worksheet inside a workbook
-- ─────────────────────────────────────────────────────
CREATE TABLE sheets (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  workbook_id  UUID        NOT NULL REFERENCES workbooks(id) ON DELETE CASCADE,
  name         VARCHAR(255) NOT NULL,
  sheet_index  INTEGER     NOT NULL,
  row_count    INTEGER     DEFAULT 0,
  col_count    INTEGER     DEFAULT 0,
  headers      JSONB       DEFAULT '[]',          -- ["Col A", "Col B", ...]
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sheets_workbook ON sheets(workbook_id);

-- ─────────────────────────────────────────────────────
-- Sheet rows: data stored as JSONB rows for performance
-- One row per spreadsheet row. data = ["val1","val2",...]
-- ─────────────────────────────────────────────────────
CREATE TABLE sheet_rows (
  id          BIGSERIAL   PRIMARY KEY,
  sheet_id    UUID        NOT NULL REFERENCES sheets(id) ON DELETE CASCADE,
  row_index   INTEGER     NOT NULL,
  data        JSONB       NOT NULL DEFAULT '[]',
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (sheet_id, row_index)
);

CREATE INDEX idx_sheet_rows_sheet ON sheet_rows(sheet_id, row_index);

-- Partition sheet_rows for very large sheets (optional, apply if >10M rows expected)
-- ALTER TABLE sheet_rows PARTITION BY LIST (sheet_id);

-- ─────────────────────────────────────────────────────
-- API Keys: one workbook can have multiple keys
-- ─────────────────────────────────────────────────────
CREATE TABLE api_keys (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  workbook_id UUID        NOT NULL REFERENCES workbooks(id) ON DELETE CASCADE,
  name        VARCHAR(255),
  key_hash    VARCHAR(255) NOT NULL UNIQUE,       -- SHA-256 of the raw key
  last_used   TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_api_keys_workbook ON api_keys(workbook_id);
CREATE INDEX idx_api_keys_hash     ON api_keys(key_hash);

-- ─────────────────────────────────────────────────────
-- Jobs: track background processing
-- ─────────────────────────────────────────────────────
CREATE TABLE jobs (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  workbook_id UUID        REFERENCES workbooks(id) ON DELETE SET NULL,
  type        VARCHAR(50) NOT NULL,               -- upload | export
  status      VARCHAR(50) NOT NULL DEFAULT 'queued',
                                                  -- queued | processing | done | failed
  progress    INTEGER     DEFAULT 0,              -- 0-100
  result      JSONB,
  error       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_jobs_workbook ON jobs(workbook_id);
CREATE INDEX idx_jobs_status   ON jobs(status);
```

---

## 7. API Specification

### 7.1 Upload & Workbooks

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/v1/workbooks/upload` | Stream multipart upload → returns `{ jobId, workbookId }` |
| `GET` | `/api/v1/workbooks` | List workbooks (paginated, `?page&limit`) |
| `GET` | `/api/v1/workbooks/:id` | Single workbook + sheet list |
| `DELETE` | `/api/v1/workbooks/:id` | Delete workbook + all data |
| `GET` | `/api/v1/workbooks/:id/status` | Polling status + progress |

### 7.2 Sheets & Cells

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/v1/workbooks/:id/sheets` | List sheets |
| `GET` | `/api/v1/workbooks/:id/sheets/:sheetId/rows` | Paginated rows (`?page&pageSize`, default 200) |
| `PATCH` | `/api/v1/workbooks/:id/sheets/:sheetId/cells` | Bulk update cells |
| `GET` | `/api/v1/workbooks/:id/export` | Stream `.xlsx` file back |

**PATCH cells body:**
```json
{
  "cells": [
    { "rowIndex": 5, "colIndex": 2, "value": "New Value" },
    { "rowIndex": 5, "colIndex": 3, "value": 42 }
  ]
}
```

**GET rows response:**
```json
{
  "data": {
    "headers": ["Name", "Age", "City"],
    "rows": [
      { "rowIndex": 0, "data": ["Alice", 30, "Tel Aviv"] },
      { "rowIndex": 1, "data": ["Bob",   25, "Haifa"]    }
    ],
    "total": 54230,
    "page": 1,
    "pageSize": 200
  }
}
```

### 7.3 Public Data API (external integrations)

All endpoints require `X-API-Key: <key>` header.

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/v1/data/:workbookId/:sheetName` | Read rows (paginated) |
| `POST` | `/api/v1/data/:workbookId/:sheetName` | Write/append rows |
| `PATCH` | `/api/v1/data/:workbookId/:sheetName` | Update specific cells |

**POST write body:**
```json
{
  "rows": [
    ["Alice", 30, "Tel Aviv"],
    ["Bob",   25, "Haifa"]
  ]
}
```

### 7.4 API Key Management

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/v1/workbooks/:id/api-keys` | Generate API key |
| `GET` | `/api/v1/workbooks/:id/api-keys` | List API keys |
| `DELETE` | `/api/v1/workbooks/:id/api-keys/:keyId` | Revoke key |

**POST generate response** (key shown only once):
```json
{ "id": "...", "name": "My Integration", "key": "sk_live_xxxx..." }
```

### 7.5 WebSocket Events

Connect to `/` with Socket.io.

```typescript
// Client subscribes to a job
socket.emit('subscribe_job', { jobId: 'abc-123' });

// Server emits
socket.on('job_progress', { jobId, progress: 45, status: 'processing' });
socket.on('job_done',     { jobId, workbookId });
socket.on('job_error',    { jobId, error: 'Parse failed: ...' });
```

---

## 8. Backend Implementation Details

### 8.1 Upload Controller — stream to disk, never load in memory

```typescript
// upload.controller.ts
import { Controller, Post, Req, Res, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { v4 as uuidv4 } from 'uuid';
import * as path from 'path';

@Controller('api/v1/workbooks')
export class UploadController {
  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: process.env.UPLOAD_DIR,
        filename: (_req, file, cb) => cb(null, `${uuidv4()}${path.extname(file.originalname)}`),
      }),
      limits: {
        fileSize: parseInt(process.env.MAX_FILE_SIZE_BYTES ?? '2147483648'),
        // NO in-memory buffer — file written straight to disk
      },
    }),
  )
  async uploadFile(@UploadedFile() file: Express.Multer.File) {
    // file.path is the PVC path — never loaded into Node heap
    const workbook = await this.uploadService.createWorkbook(file);
    const job      = await this.uploadService.enqueueParseJob(workbook.id, file.path);
    return { jobId: job.id, workbookId: workbook.id };
  }
}
```

### 8.2 NestJS main.ts — disable body size limit for the upload route

```typescript
// main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bodyParser: false,   // disable global body parser — multer handles it
    logger: ['error', 'warn', 'log'],
  });

  app.use('/api/v1/workbooks/upload', (req, res, next) => next()); // raw pass-through

  app.enableCors({ origin: process.env.ALLOWED_ORIGINS?.split(',') });
  await app.listen(process.env.API_PORT ?? 3001, '0.0.0.0');
}
bootstrap();
```

### 8.3 Excel Processor — streaming parse (never loads full file)

```typescript
// excel.processor.ts
import { Process, Processor } from '@nestjs/bull';
import { Job } from 'bull';
import * as ExcelJS from 'exceljs';

@Processor('excel')
export class ExcelProcessor {
  @Process('parse')
  async parse(job: Job<{ workbookId: string; filePath: string }>) {
    const { workbookId, filePath } = job.data;

    const workbookReader = new ExcelJS.stream.xlsx.WorkbookReader(filePath, {
      sharedStrings: 'cache',
      hyperlinks: 'ignore',
      worksheets: 'emit',
      entries: 'emit',
    });

    for await (const worksheet of workbookReader) {
      const sheetEntity = await this.sheetsService.createSheet(workbookId, worksheet.name);
      const BATCH_SIZE = 500;
      let batch: { rowIndex: number; data: unknown[] }[] = [];
      let rowIndex = 0;

      for await (const row of worksheet) {
        const rowData = row.values?.slice(1) ?? [];  // exceljs is 1-indexed
        batch.push({ rowIndex: rowIndex++, data: rowData });

        if (batch.length >= BATCH_SIZE) {
          await this.sheetsService.upsertRows(sheetEntity.id, batch);
          batch = [];
          const progress = Math.floor((rowIndex / (worksheet.rowCount || 1)) * 100);
          await job.progress(progress);
        }
      }
      if (batch.length) await this.sheetsService.upsertRows(sheetEntity.id, batch);
    }

    await this.workbooksService.markReady(workbookId);
  }
}
```

### 8.4 Sheets Service — bulk upsert

```typescript
// sheets.service.ts  (key method)
async upsertRows(sheetId: string, rows: { rowIndex: number; data: unknown[] }[]) {
  // Efficient PostgreSQL upsert with ON CONFLICT
  const values = rows.map(r => `('${sheetId}', ${r.rowIndex}, '${JSON.stringify(r.data).replace(/'/g, "''")}'::jsonb, NOW())`);
  await this.dataSource.query(`
    INSERT INTO sheet_rows (sheet_id, row_index, data, updated_at)
    VALUES ${values.join(',')}
    ON CONFLICT (sheet_id, row_index) DO UPDATE
      SET data = EXCLUDED.data, updated_at = EXCLUDED.updated_at
  `);
}
```

### 8.5 Export Service — stream Excel without loading all rows

```typescript
// export.service.ts
async exportToStream(workbookId: string, res: Response) {
  const workbook = await this.workbooksService.findOne(workbookId);
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${workbook.name}.xlsx"`);

  const xlsxWorkbook = new ExcelJS.stream.xlsx.WorkbookWriter({ stream: res });

  for (const sheet of workbook.sheets) {
    const worksheet = xlsxWorkbook.addWorksheet(sheet.name);
    worksheet.addRow(sheet.headers);           // header row

    const PAGE = 1000;
    let page = 0;
    let hasMore = true;

    while (hasMore) {
      const rows = await this.sheetsService.getRowsBatch(sheet.id, page * PAGE, PAGE);
      for (const row of rows) worksheet.addRow(row.data);
      await worksheet.commit();               // flush to stream — keeps memory low
      hasMore = rows.length === PAGE;
      page++;
    }
  }
  await xlsxWorkbook.commit();
}
```

### 8.6 API Key Guard

```typescript
// api-key.guard.ts
import { createHash } from 'crypto';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest();
    const rawKey = req.headers['x-api-key'];
    if (!rawKey) throw new UnauthorizedException('Missing X-API-Key header');

    const hash = createHash('sha256').update(rawKey).digest('hex');
    const apiKey = await this.apiKeyRepo.findOne({ where: { key_hash: hash } });
    if (!apiKey) throw new UnauthorizedException('Invalid API key');

    // Attach workbookId to request for downstream use
    req.apiKeyWorkbookId = apiKey.workbook_id;
    await this.apiKeyRepo.update(apiKey.id, { last_used: new Date() });
    return true;
  }
}
```

---

## 9. Frontend Implementation Details

### 9.1 UI Design Spec

**Design Theme:**
- Dark sidebar + light main content area
- Accent: Indigo-600 (#4F46E5) + Emerald-500 (#10B981)
- Background: Zinc-950 (dark) / White (light) with auto dark mode
- Font: Inter (bundled in `public/fonts/`, no CDN)
- Card style: rounded-xl with subtle shadow, border-zinc-200/dark:border-zinc-800

**Dashboard Layout:**
```
┌─────────────────────────────────────────────────────────┐
│  ☰  SheetOps         [Search workbooks...]   [+ Upload] │
├────────────┬────────────────────────────────────────────┤
│            │                                            │
│  Workbooks │   ┌─────────────────────────────────────┐ │
│  ──────── │   │  Drag & Drop Excel files here        │ │
│  📊 Sheet1│   │  or click to browse                  │ │
│  📊 Sheet2│   │  .xlsx  .xls  .csv  up to 2 GB       │ │
│  📊 Sheet3│   └─────────────────────────────────────┘ │
│            │                                            │
│  Recent    │   ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐  │
│  ──────── │   │Card1 │ │Card2 │ │Card3 │ │Card4 │  │
│            │   └──────┘ └──────┘ └──────┘ └──────┘  │
└────────────┴────────────────────────────────────────────┘
```

**Workbook View:**
```
┌─────────────────────────────────────────────────────────┐
│  ← Back   📊 report-q3.xlsx    [Export] [API Key] [⋮] │
├──────────────────────────────────────────────────────── │
│  Sheet1 │ Sheet2 │ Sheet3                               │
├─────────┼────────────────────────────────────────────── │
│  Filter │ [search cells...]   Rows: 54,230  Cols: 12    │
├─────────┴────────────────────────────────────────────── │
│ # │ Name      │ Age │ City        │ Revenue   │ ...     │
│───┼───────────┼─────┼─────────────┼───────────┼──────   │
│ 1 │ Alice     │ 30  │ Tel Aviv    │ 12,000    │ ...     │
│ 2 │ Bob       │ 25  │ Haifa       │  8,500    │ ...     │
│ 3 │[editing…] │ 28  │ Jerusalem   │ 15,200    │ ...     │
│   ·           ·     ·             ·           ·         │
│ (virtual scroll — 54k rows render only visible ~30)     │
└─────────────────────────────────────────────────────────┘
```

### 9.2 SheetTable Component — critical implementation

```typescript
// SheetTable.tsx  — uses TanStack Table v8 + TanStack Virtual
import { useVirtualizer } from '@tanstack/react-virtual';
import { useReactTable, getCoreRowModel, flexRender } from '@tanstack/react-table';

export function SheetTable({ sheetId, headers, totalRows }) {
  const parentRef = useRef<HTMLDivElement>(null);
  const [editingCell, setEditingCell] = useState<{row: number; col: number} | null>(null);

  // Infinite-style paging: fetch rows in windows of 200
  const { data, fetchNextPage, isFetchingNextPage } = useInfiniteQuery({
    queryKey: ['sheet-rows', sheetId],
    queryFn: ({ pageParam = 0 }) => fetchRows(sheetId, pageParam, 200),
    getNextPageParam: (last, pages) => pages.length * 200 < totalRows ? pages.length : undefined,
  });

  const allRows = useMemo(() => data?.pages.flatMap(p => p.rows) ?? [], [data]);

  const virtualizer = useVirtualizer({
    count: totalRows,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 36,        // row height in px
    overscan: 20,                  // render 20 rows above/below viewport
  });

  // Fetch next page when nearing the end
  useEffect(() => {
    const [lastItem] = [...virtualizer.getVirtualItems()].reverse();
    if (!lastItem) return;
    if (lastItem.index >= allRows.length - 50 && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [virtualizer.getVirtualItems(), allRows.length]);

  const columns = useMemo(() =>
    headers.map((h, i) => ({
      accessorFn: (row) => row.data[i],
      header: h,
      id: String(i),
      cell: ({ getValue, row }) => (
        editingCell?.row === row.index && editingCell?.col === i
          ? <EditableCell value={getValue()} onSave={(v) => handleSave(row.index, i, v)} />
          : <span onDoubleClick={() => setEditingCell({ row: row.index, col: i })}>{getValue()}</span>
      ),
    })),
  [headers, editingCell]);

  return (
    <div ref={parentRef} className="h-full overflow-auto">
      <div style={{ height: `${virtualizer.getTotalSize()}px`, position: 'relative' }}>
        {virtualizer.getVirtualItems().map(virtualRow => {
          const row = allRows[virtualRow.index];
          return (
            <div key={virtualRow.index}
              style={{ position: 'absolute', top: 0, transform: `translateY(${virtualRow.start}px)` }}
              className="flex border-b border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900">
              {headers.map((_, colIdx) => (
                <div key={colIdx} className="px-3 py-2 text-sm truncate min-w-[120px] max-w-[300px] border-r">
                  {row?.data[colIdx] ?? ''}
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

### 9.3 Upload Dropzone + Progress

```typescript
// FileDropzone.tsx
export function FileDropzone() {
  const { uploadFile } = useUpload();

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
      'text/csv': ['.csv'],
    },
    maxSize: 2 * 1024 * 1024 * 1024,   // 2 GB
    onDrop: (accepted) => accepted.forEach(uploadFile),
  });

  return (
    <div {...getRootProps()} className={`
      border-2 border-dashed rounded-2xl p-16 text-center cursor-pointer transition-colors
      ${isDragActive
        ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/30'
        : 'border-zinc-300 dark:border-zinc-700 hover:border-indigo-400'}
    `}>
      <input {...getInputProps()} />
      <Upload className="mx-auto mb-4 text-indigo-500" size={48} />
      <p className="text-xl font-semibold text-zinc-800 dark:text-zinc-100">
        {isDragActive ? 'Release to upload' : 'Drag Excel files here'}
      </p>
      <p className="text-sm text-zinc-500 mt-2">.xlsx · .xls · .csv · up to 2 GB</p>
    </div>
  );
}
```

---

## 10. Docker Images

### 10.1 Frontend Dockerfile

```dockerfile
# apps/frontend/Dockerfile
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install --frozen-lockfile
COPY . .
RUN pnpm build

FROM nginx:1.25-alpine AS runtime
# Non-root OpenShift compatible
RUN chmod -R g+rwx /var/cache/nginx /var/run /var/log/nginx
COPY apps/frontend/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 8080
USER 101   # nginx group
CMD ["nginx", "-g", "daemon off;"]
```

### 10.2 API Dockerfile

```dockerfile
# apps/api/Dockerfile
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install --frozen-lockfile
COPY . .
RUN pnpm build

FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
# Run as non-root (OpenShift uses arbitrary UIDs, must be group 0 writable)
RUN chown -R node:root /app && chmod -R g+w /app
USER node
EXPOSE 3001
HEALTHCHECK --interval=15s --timeout=5s --start-period=30s \
  CMD wget -qO- http://localhost:3001/health || exit 1
CMD ["node", "dist/main.js"]
```

### 10.3 Worker Dockerfile

```dockerfile
# apps/worker/Dockerfile
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install --frozen-lockfile
COPY . .
RUN pnpm build

FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
RUN chown -R node:root /app && chmod -R g+w /app
USER node
CMD ["node", "dist/main.js"]
```

### 10.4 Nginx Config (SPA fallback)

```nginx
# apps/frontend/nginx.conf
server {
  listen 8080;
  root /usr/share/nginx/html;
  index index.html;

  gzip on;
  gzip_types text/plain text/css application/json application/javascript;

  location /api/ {
    proxy_pass         http://sheetops-api:3001;
    proxy_http_version 1.1;
    proxy_set_header   Upgrade $http_upgrade;
    proxy_set_header   Connection "upgrade";
    proxy_set_header   Host $host;
    proxy_read_timeout 3600s;    # long uploads
    proxy_send_timeout 3600s;
    client_max_body_size 2g;
  }

  location /socket.io/ {
    proxy_pass         http://sheetops-api:3001;
    proxy_http_version 1.1;
    proxy_set_header   Upgrade $http_upgrade;
    proxy_set_header   Connection "upgrade";
  }

  location / {
    try_files $uri $uri/ /index.html;  # SPA fallback
  }
}
```

---

## 11. Helm Chart

### 11.1 Chart.yaml

```yaml
# helm/sheetops/Chart.yaml
apiVersion: v2
name: sheetops
description: SheetOps — Excel management platform
type: application
version: 1.0.0
appVersion: "1.0.0"
dependencies:
  - name: postgresql
    version: "13.x.x"
    repository: "https://charts.bitnami.com/bitnami"
    condition: postgresql.enabled
  - name: redis
    version: "18.x.x"
    repository: "https://charts.bitnami.com/bitnami"
    condition: redis.enabled
```

> **Air-gapped note:** Run `helm dependency update` online, then commit the generated `charts/*.tgz` tarballs to the repo. At install time use `helm install --dependency-update=false`.

### 11.2 values.yaml (complete)

```yaml
# helm/sheetops/values.yaml
global:
  imageRegistry: ""          # set to "registry.corp.example.com" for air-gapped
  imagePullSecrets: []

# ─────────────────────────────────────────
# Frontend
# ─────────────────────────────────────────
frontend:
  image:
    repository: sheetops/frontend
    tag: "1.0.0"
    pullPolicy: IfNotPresent
  replicaCount: 2
  service:
    type: ClusterIP
    port: 8080
  resources:
    requests: { cpu: 100m, memory: 128Mi }
    limits:   { cpu: 500m, memory: 256Mi }
  podDisruptionBudget:
    minAvailable: 1

# ─────────────────────────────────────────
# API
# ─────────────────────────────────────────
api:
  image:
    repository: sheetops/api
    tag: "1.0.0"
    pullPolicy: IfNotPresent
  replicaCount: 2
  service:
    type: ClusterIP
    port: 3001
  resources:
    requests: { cpu: 250m, memory: 512Mi }
    limits:   { cpu: 2000m, memory: 1Gi }
  autoscaling:
    enabled: true
    minReplicas: 2
    maxReplicas: 6
    targetCPUUtilizationPercentage: 70
  podDisruptionBudget:
    minAvailable: 1
  env:
    NODE_ENV: production
    API_PORT: "3001"
    MAX_FILE_SIZE_BYTES: "2147483648"
    UPLOAD_DIR: /data/uploads
    TEMP_DIR: /data/temp

# ─────────────────────────────────────────
# Worker
# ─────────────────────────────────────────
worker:
  image:
    repository: sheetops/worker
    tag: "1.0.0"
    pullPolicy: IfNotPresent
  replicaCount: 1
  resources:
    requests: { cpu: 500m, memory: 1Gi }
    limits:   { cpu: 4000m, memory: 4Gi }   # Excel parsing can be CPU heavy
  autoscaling:
    enabled: true
    minReplicas: 1
    maxReplicas: 4
    targetCPUUtilizationPercentage: 60
  podDisruptionBudget:
    minAvailable: 1

# ─────────────────────────────────────────
# PVC
# ─────────────────────────────────────────
storage:
  enabled: true
  storageClassName: ""       # set to "longhorn" / "nfs" / "ocs-storagecluster-cephfs"
  size: 50Gi
  accessModes:
    - ReadWriteMany           # requires NFS/Ceph/Longhorn for HA; use RWO for single-node

# ─────────────────────────────────────────
# Ingress (k3s / generic)
# ─────────────────────────────────────────
ingress:
  enabled: true
  className: "traefik"        # k3s default; set "nginx" for nginx ingress
  host: sheetops.example.com
  tls: false                  # set true with cert-manager
  annotations: {}

# ─────────────────────────────────────────
# OpenShift Route (mutually exclusive with ingress)
# ─────────────────────────────────────────
route:
  enabled: false
  host: sheetops.apps.cluster.example.com
  tls:
    termination: edge

# ─────────────────────────────────────────
# Security context (OpenShift compatible)
# ─────────────────────────────────────────
podSecurityContext:
  runAsNonRoot: true
  fsGroup: 0                  # OpenShift uses arbitrary UID, group 0

containerSecurityContext:
  allowPrivilegeEscalation: false
  capabilities:
    drop: [ALL]
  readOnlyRootFilesystem: false   # Node.js needs writable /tmp

# ─────────────────────────────────────────
# Secrets (override in production!)
# ─────────────────────────────────────────
secrets:
  postgresPassword: changeme
  redisPassword: ""
  jwtSecret: changeme-long-random-string

# ─────────────────────────────────────────
# PostgreSQL subchart
# ─────────────────────────────────────────
postgresql:
  enabled: true
  auth:
    database: sheetops
    username: sheetops
    password: changeme          # should match secrets.postgresPassword
  primary:
    persistence:
      enabled: true
      size: 20Gi
    resources:
      requests: { cpu: 250m, memory: 512Mi }
      limits:   { cpu: 2000m, memory: 2Gi }

# ─────────────────────────────────────────
# Redis subchart
# ─────────────────────────────────────────
redis:
  enabled: true
  architecture: standalone
  auth:
    enabled: false              # set to true + password for production
  master:
    persistence:
      enabled: true
      size: 5Gi
    resources:
      requests: { cpu: 100m, memory: 128Mi }
      limits:   { cpu: 500m, memory: 512Mi }
```

### 11.3 Key Template — API Deployment

```yaml
# helm/sheetops/templates/api/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: {{ include "sheetops.fullname" . }}-api
spec:
  replicas: {{ .Values.api.replicaCount }}
  selector:
    matchLabels:
      app.kubernetes.io/component: api
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxUnavailable: 0           # zero-downtime rollout
      maxSurge: 1
  template:
    spec:
      securityContext: {{- toYaml .Values.podSecurityContext | nindent 8 }}
      containers:
        - name: api
          image: "{{ .Values.global.imageRegistry }}/{{ .Values.api.image.repository }}:{{ .Values.api.image.tag }}"
          imagePullPolicy: {{ .Values.api.image.pullPolicy }}
          securityContext: {{- toYaml .Values.containerSecurityContext | nindent 12 }}
          ports:
            - containerPort: 3001
          envFrom:
            - configMapRef:
                name: {{ include "sheetops.fullname" . }}-config
            - secretRef:
                name: {{ include "sheetops.fullname" . }}-secret
          volumeMounts:
            - name: file-storage
              mountPath: /data
          livenessProbe:
            httpGet: { path: /health, port: 3001 }
            initialDelaySeconds: 30
            periodSeconds: 15
          readinessProbe:
            httpGet: { path: /health/ready, port: 3001 }
            initialDelaySeconds: 10
            periodSeconds: 5
          resources: {{- toYaml .Values.api.resources | nindent 12 }}
      volumes:
        - name: file-storage
          persistentVolumeClaim:
            claimName: {{ include "sheetops.fullname" . }}-storage
```

### 11.4 PodDisruptionBudget

```yaml
# helm/sheetops/templates/api/pdb.yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: {{ include "sheetops.fullname" . }}-api-pdb
spec:
  minAvailable: {{ .Values.api.podDisruptionBudget.minAvailable }}
  selector:
    matchLabels:
      app.kubernetes.io/component: api
```

### 11.5 HPA

```yaml
# helm/sheetops/templates/api/hpa.yaml
{{- if .Values.api.autoscaling.enabled }}
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: {{ include "sheetops.fullname" . }}-api
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: {{ include "sheetops.fullname" . }}-api
  minReplicas: {{ .Values.api.autoscaling.minReplicas }}
  maxReplicas: {{ .Values.api.autoscaling.maxReplicas }}
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: {{ .Values.api.autoscaling.targetCPUUtilizationPercentage }}
{{- end }}
```

---

## 12. OpenShift-Specific Overrides

```yaml
# helm/sheetops/values-openshift.yaml
# Apply with: helm install sheetops ./helm/sheetops -f values.yaml -f values-openshift.yaml

ingress:
  enabled: false

route:
  enabled: true
  host: sheetops.apps.cluster.example.com
  tls:
    termination: edge

podSecurityContext:
  runAsNonRoot: true
  # OpenShift assigns arbitrary UID; group 0 ensures file access
  fsGroup: 0

containerSecurityContext:
  allowPrivilegeEscalation: false
  capabilities:
    drop: [ALL]

# OpenShift does not allow fsGroup 0 without SCC; apply this before install:
# oc adm policy add-scc-to-serviceaccount anyuid -z sheetops -n sheetops
# OR use restricted-v2 SCC by ensuring runAsNonRoot + drop ALL caps
```

### 12.1 ServiceAccount + RBAC

```yaml
# helm/sheetops/templates/serviceaccount.yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: {{ include "sheetops.serviceAccountName" . }}
  annotations:
    {{- if .Values.route.enabled }}
    openshift.io/requester: {{ .Release.Namespace }}
    {{- end }}
```

---

## 13. High Availability & Durability Checklist

| Concern | Solution |
|---|---|
| 1 GB upload crash | `multer` diskStorage — file goes to PVC directly, Node heap untouched |
| API pod restart during upload | Chunked client upload resumes; job status in PostgreSQL |
| Worker OOM on large parse | ExcelJS streaming mode — row-by-row, never full in memory |
| Single API pod failure | 2+ replicas, RollingUpdate maxUnavailable: 0, PDB minAvailable: 1 |
| Redis failure | BullMQ jobs persisted; Redis with AOF persistence via `appendonly yes` |
| PostgreSQL failure | Bitnami chart primary + replica; PVC retained on pod restart |
| File storage failure | PVC with RWX (NFS/Ceph/Longhorn) mounted to all API + Worker pods |
| Thundering herd on startup | `minReadySeconds: 10`, readiness probe before traffic |
| Export memory | ExcelJS WorkbookWriter with `.commit()` per sheet — streams to response |
| Cell edit conflicts | `updated_at` timestamp; last-write-wins (acceptable for spreadsheet UX) |
| Air-gap image pull | All images in private registry; `global.imageRegistry` Helm value |
| Air-gap Helm deps | Bitnami tarballs vendored in `helm/sheetops/charts/` |

---

## 14. docker-compose.yml (local dev)

```yaml
version: "3.9"
services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: sheetops
      POSTGRES_USER: sheetops
      POSTGRES_PASSWORD: changeme
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports: ["5432:5432"]

  redis:
    image: redis:7-alpine
    ports: ["6379:6379"]

  api:
    build: { context: ., dockerfile: apps/api/Dockerfile }
    env_file: .env
    environment:
      POSTGRES_HOST: postgres
      REDIS_HOST: redis
      UPLOAD_DIR: /data/uploads
      TEMP_DIR: /data/temp
    volumes:
      - file_data:/data
    ports: ["3001:3001"]
    depends_on: [postgres, redis]

  worker:
    build: { context: ., dockerfile: apps/worker/Dockerfile }
    env_file: .env
    environment:
      POSTGRES_HOST: postgres
      REDIS_HOST: redis
      UPLOAD_DIR: /data/uploads
    volumes:
      - file_data:/data
    depends_on: [postgres, redis]

  frontend:
    build: { context: ., dockerfile: apps/frontend/Dockerfile }
    ports: ["3000:8080"]
    depends_on: [api]

volumes:
  postgres_data:
  file_data:
```

---

## 15. Implementation Phases (Claude Code Step Order)

### Phase 1 — Monorepo Scaffold

```bash
# Commands Claude Code should run:
mkdir sheetops && cd sheetops
pnpm init
# Create pnpm-workspace.yaml
# Create apps/frontend, apps/api, apps/worker directories
# Initialize each with pnpm init + install deps
# Create docker-compose.yml
# Create .env.example
# Smoke test: docker compose up postgres redis && docker compose ps
```

**Deliverable:** repo structure + `docker compose up` brings up Postgres + Redis

---

### Phase 2 — API: Database, Entities, Migrations

```bash
# Install: @nestjs/typeorm typeorm pg
# Create all entities (workbook, sheet, sheet-row, api-key, job)
# Create TypeORM migration: 001_initial.ts
# Run migration: pnpm typeorm migration:run
# Smoke test: SELECT * FROM workbooks; -- should return empty table
```

**Deliverable:** All tables created in Postgres

---

### Phase 3 — API: Upload + Worker + Job Progress

```bash
# Install: @nestjs/bull bullmq exceljs multer uuid socket.io @nestjs/websockets
# Implement: upload.controller, excel.processor, jobs.gateway
# Smoke test:
curl -X POST http://localhost:3001/api/v1/workbooks/upload \
  -F "file=@sample.xlsx"
# Should return { jobId, workbookId }
# Worker should process and mark status = ready
```

**Deliverable:** Upload + parse pipeline working end-to-end

---

### Phase 4 — API: Sheets, Cells, Export, Data API

```bash
# Implement: sheets.controller, sheets.service (paginated rows, upsert cells)
# Implement: export.service (streaming xlsx)
# Implement: data-api.controller + api-key.guard
# Smoke test:
curl http://localhost:3001/api/v1/workbooks/<id>/sheets/<sheetId>/rows?page=0&pageSize=10
curl -X GET http://localhost:3001/api/v1/workbooks/<id>/export -o out.xlsx
```

**Deliverable:** Full CRUD + export + public API working

---

### Phase 5 — Frontend: Scaffold + Dashboard

```bash
# pnpm create vite frontend --template react-ts
# Install: shadcn/ui tailwind react-dropzone zustand @tanstack/react-query axios socket.io-client
# Build: Dashboard page with dropzone + workbook card grid
# Build: useUpload hook (Axios upload with progress, socket subscribe)
# Smoke test: open browser, drag a .xlsx file, see upload progress, card appears
```

**Deliverable:** Dashboard with working file upload + card list

---

### Phase 6 — Frontend: Table View

```bash
# Install: @tanstack/react-table @tanstack/react-virtual
# Build: SheetTable with virtual scrolling
# Build: EditableCell component
# Build: SheetTabs for multi-sheet workbooks
# Build: Toolbar (search filter, export button, API key modal)
# Smoke test: open a 50k-row sheet, scroll should be smooth at 60fps
```

**Deliverable:** Full table UI with edit + export working

---

### Phase 7 — Docker Images

```bash
# Build all 3 Dockerfiles
# Tag: sheetops/frontend:1.0.0, sheetops/api:1.0.0, sheetops/worker:1.0.0
# Smoke test:
docker compose -f docker-compose.prod.yml up
# Test with 1 GB Excel file upload — monitor memory:
docker stats  # api + worker should stay under 500 MB each
```

**Deliverable:** All 3 images build + run; 1 GB upload does not OOM

---

### Phase 8 — Helm Chart

```bash
# Create helm/sheetops chart structure
# helm dependency update helm/sheetops
# Commit charts/*.tgz for air-gapped
# Smoke test (k3s or kind):
helm install sheetops ./helm/sheetops -n sheetops --create-namespace \
  -f helm/sheetops/values.yaml \
  --set global.imageRegistry=localhost:5000
# kubectl get pods -n sheetops   # all Running
# kubectl get pvc -n sheetops    # Bound
```

**Deliverable:** Full stack running in k3s via Helm

---

### Phase 9 — OpenShift Validation

```bash
# Apply OpenShift values overlay:
helm upgrade sheetops ./helm/sheetops -n sheetops \
  -f helm/sheetops/values.yaml \
  -f helm/sheetops/values-openshift.yaml
# Check Routes:
oc get routes -n sheetops
# Check SCC compliance:
oc get pod -n sheetops -o jsonpath='{.items[*].spec.securityContext}'
# All pods must be non-root
```

**Deliverable:** Running on OpenShift with Routes + SCC compliant

---

### Phase 10 — HA + Load Test

```bash
# Scale up and validate PDB:
kubectl scale deploy sheetops-api --replicas=3 -n sheetops
kubectl delete pod sheetops-api-xxxx -n sheetops  # should stay available
# Load test with large file:
# Upload 1 GB xlsx — verify: no OOM, job completes, rows queryable
# Verify HPA triggers:
kubectl get hpa -n sheetops -w
```

**Deliverable:** HA validated — no downtime on pod kill, 1 GB upload stable

---

## 16. Key Package Versions

```json
{
  "api_deps": {
    "@nestjs/core": "^10.0.0",
    "@nestjs/bull": "^10.0.0",
    "bullmq": "^5.0.0",
    "exceljs": "^4.4.0",
    "multer": "^1.4.5",
    "typeorm": "^0.3.0",
    "pg": "^8.11.0",
    "ioredis": "^5.3.0",
    "socket.io": "^4.7.0"
  },
  "frontend_deps": {
    "react": "^18.3.0",
    "vite": "^5.0.0",
    "@tanstack/react-table": "^8.17.0",
    "@tanstack/react-virtual": "^3.10.0",
    "@tanstack/react-query": "^5.0.0",
    "react-dropzone": "^14.2.0",
    "zustand": "^4.5.0",
    "axios": "^1.7.0",
    "socket.io-client": "^4.7.0",
    "tailwindcss": "^3.4.0"
  }
}
```

---

## 17. Health Endpoints

The API must expose:

```typescript
// health.controller.ts
@Get('/health')        // liveness — process alive
@Get('/health/ready')  // readiness — DB + Redis connected
```

```typescript
// /health/ready implementation
async checkReady() {
  await this.dataSource.query('SELECT 1');          // PostgreSQL
  await this.redisClient.ping();                    // Redis
  return { status: 'ok', timestamp: new Date() };
}
```

---

## 18. Air-Gapped Checklist

- [ ] All Docker images pushed to private registry before deployment
- [ ] `helm dependency update` run online; `charts/*.tgz` committed to repo
- [ ] `global.imageRegistry` set to private registry in `values.yaml`
- [ ] Frontend Vite build: all fonts/assets in `public/` (no Google Fonts CDN)
- [ ] `nginx.conf`: no external resource references
- [ ] Bitnami PostgreSQL + Redis images pre-pulled and available in private registry
- [ ] `helm install --dependency-update=false` to skip online dep resolution
- [ ] All `imagePullSecrets` configured if private registry requires auth

---

*End of SheetOps Claude Code Specification v1.0*
