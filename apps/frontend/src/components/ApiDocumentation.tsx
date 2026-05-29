import { useState } from 'react';
import { ChevronDown, Copy, Check } from 'lucide-react';
import { Button } from './ui/button';

interface ApiDocsProps {
  workbookId: string;
  sheetId?: string;
}

export function ApiDocumentation({ workbookId, sheetId }: ApiDocsProps) {
  const [expandedSection, setExpandedSection] = useState<string | null>('intro');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const copyToClipboard = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(id);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const Section = ({ id, title, children }: { id: string; title: string; children: React.ReactNode }) => (
    <div className="border-b border-zinc-200 dark:border-zinc-800 last:border-b-0">
      <button
        onClick={() => setExpandedSection(expandedSection === id ? null : id)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors"
      >
        <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">{title}</h3>
        <ChevronDown
          size={20}
          className={`text-zinc-500 transition-transform ${expandedSection === id ? 'rotate-180' : ''}`}
        />
      </button>
      {expandedSection === id && <div className="px-4 py-4 bg-zinc-50 dark:bg-zinc-900/50">{children}</div>}
    </div>
  );

  const CodeBlock = ({ code, id }: { code: string; id: string }) => (
    <div className="relative">
      <pre className="overflow-x-auto rounded-lg bg-zinc-900 p-4 text-sm text-zinc-100 font-mono">
        <code>{code}</code>
      </pre>
      <Button
        size="sm"
        variant="secondary"
        className="absolute top-2 right-2"
        onClick={() => copyToClipboard(code, id)}
      >
        {copiedCode === id ? <Check size={16} /> : <Copy size={16} />}
      </Button>
    </div>
  );

  return (
    <div className="rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950 overflow-hidden">
      <div className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 px-6 py-4">
        <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">📚 SheetOps API Documentation</h2>
        <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
          Complete guide to integrating SheetOps into your applications
        </p>
      </div>

      <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
        <Section id="intro" title="🎯 Getting Started">
          <div className="space-y-4">
            <p className="text-sm text-zinc-700 dark:text-zinc-300">
              SheetOps provides a REST API for managing Excel spreadsheets programmatically. All endpoints require authentication via API Key.
            </p>
            <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-lg p-3">
              <p className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-2">Base URL</p>
              <CodeBlock code="https://your-sheetops-domain/api/v1" id="base-url" />
            </div>
            <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 rounded-lg p-3">
              <p className="text-sm font-semibold text-amber-900 dark:text-amber-100 mb-2">Authentication</p>
              <p className="text-sm text-amber-900 dark:text-amber-100 mb-2">
                Include your API key in the request header:
              </p>
              <CodeBlock code='Authorization: Bearer YOUR_API_KEY' id="auth" />
            </div>
          </div>
        </Section>

        <Section id="upload" title="📤 Upload & Create Workbook">
          <div className="space-y-4">
            <div>
              <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-2">Endpoint</p>
              <CodeBlock code="POST /workbooks/upload\nContent-Type: multipart/form-data" id="upload-endpoint" />
            </div>
            <div>
              <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-2">Request Body</p>
              <CodeBlock
                code={`file: <binary file>
  // Supported formats: .xlsx, .xls, .csv
  // Max size: 2GB`}
                id="upload-body"
              />
            </div>
            <div>
              <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-2">Response</p>
              <CodeBlock
                code={`{
  "id": "workbook-uuid",
  "jobId": "job-uuid",
  "name": "filename.xlsx",
  "originalFilename": "filename.xlsx",
  "status": "processing"
}`}
                id="upload-response"
              />
            </div>
            <div>
              <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-2">Example (cURL)</p>
              <CodeBlock
                code={`curl -X POST https://your-sheetops-domain/api/v1/workbooks/upload \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -F "file=@spreadsheet.xlsx"`}
                id="upload-curl"
              />
            </div>
          </div>
        </Section>

        <Section id="list-workbooks" title="📋 List Workbooks">
          <div className="space-y-4">
            <div>
              <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-2">Endpoint</p>
              <CodeBlock code="GET /workbooks?page=0&limit=50" id="list-endpoint" />
            </div>
            <div>
              <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-2">Response</p>
              <CodeBlock
                code={`{
  "data": [
    {
      "id": "workbook-uuid",
      "name": "sales-data",
      "originalFilename": "sales-data.xlsx",
      "sheets": [
        {
          "id": "sheet-uuid",
          "name": "January",
          "sheetIndex": 0,
          "headers": ["Date", "Product", "Amount"]
        }
      ]
    }
  ],
  "total": 1,
  "page": 0,
  "limit": 50
}`}
                id="list-response"
              />
            </div>
          </div>
        </Section>

        {sheetId && (
          <Section id="read-rows" title="📖 Read Sheet Data">
            <div className="space-y-4">
              <div>
                <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-2">Endpoint</p>
                <CodeBlock
                  code={`GET /workbooks/${workbookId}/sheets/${sheetId}/rows?page=0&pageSize=200`}
                  id="read-endpoint"
                />
              </div>
              <div>
                <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-2">Query Parameters</p>
                <ul className="text-sm space-y-1 text-zinc-700 dark:text-zinc-300">
                  <li>• <code className="bg-zinc-100 dark:bg-zinc-800 px-2 py-1 rounded">page</code>: Page number (0-indexed)</li>
                  <li>• <code className="bg-zinc-100 dark:bg-zinc-800 px-2 py-1 rounded">pageSize</code>: Rows per page (default: 200, max: 10000)</li>
                </ul>
              </div>
              <div>
                <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-2">Response</p>
                <CodeBlock
                  code={`{
  "headers": ["Date", "Product", "Amount"],
  "rows": [
    {
      "rowIndex": 0,
      "data": ["2024-01-01", "Product A", 1000]
    },
    {
      "rowIndex": 1,
      "data": ["2024-01-02", "Product B", 2000]
    }
  ],
  "total": 100,
  "page": 0,
  "pageSize": 200
}`}
                  id="read-response"
                />
              </div>
            </div>
          </Section>
        )}

        {sheetId && (
          <Section id="update-cells" title="✏️ Update Cell Data">
            <div className="space-y-4">
              <div>
                <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-2">Endpoint</p>
                <CodeBlock
                  code={`PATCH /workbooks/${workbookId}/sheets/${sheetId}/cells`}
                  id="update-endpoint"
                />
              </div>
              <div>
                <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-2">Request Body</p>
                <CodeBlock
                  code={`{
  "cells": [
    {
      "rowIndex": 0,
      "colIndex": 0,
      "value": "2024-01-01"
    },
    {
      "rowIndex": 0,
      "colIndex": 1,
      "value": "Product A"
    }
  ]
}`}
                  id="update-body"
                />
              </div>
              <div>
                <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-2">Response</p>
                <CodeBlock
                  code={`{
  "success": true
}`}
                  id="update-response"
                />
              </div>
              <div>
                <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-2">Example (JavaScript)</p>
                <CodeBlock
                  code={`const response = await fetch(
  'https://your-sheetops-domain/api/v1/workbooks/${workbookId}/sheets/${sheetId}/cells',
  {
    method: 'PATCH',
    headers: {
      'Authorization': 'Bearer YOUR_API_KEY',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      cells: [
        { rowIndex: 5, colIndex: 2, value: 'New Value' }
      ]
    })
  }
);`}
                  id="update-js"
                />
              </div>
            </div>
          </Section>
        )}

        {workbookId && (
          <Section id="export" title="📥 Export Workbook">
            <div className="space-y-4">
              <div>
                <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-2">Endpoint</p>
                <CodeBlock code={`GET /workbooks/${workbookId}/export`} id="export-endpoint" />
              </div>
              <div>
                <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-2">Response</p>
                <p className="text-sm text-zinc-700 dark:text-zinc-300">
                  Returns an Excel file (.xlsx) containing all sheets with current data
                </p>
              </div>
              <div>
                <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-2">Example (Browser)</p>
                <CodeBlock
                  code={`window.location.href = 'https://your-sheetops-domain/api/v1/workbooks/${workbookId}/export?apiKey=YOUR_API_KEY';`}
                  id="export-browser"
                />
              </div>
            </div>
          </Section>
        )}

        <Section id="errors" title="⚠️ Error Handling">
          <div className="space-y-4">
            <p className="text-sm text-zinc-700 dark:text-zinc-300">
              SheetOps uses standard HTTP status codes to indicate errors:
            </p>
            <div className="space-y-3">
              <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded p-3">
                <p className="font-semibold text-sm text-red-900 dark:text-red-100">400 Bad Request</p>
                <p className="text-sm text-red-800 dark:text-red-200">Invalid request format or parameters</p>
              </div>
              <div className="bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-900 rounded p-3">
                <p className="font-semibold text-sm text-orange-900 dark:text-orange-100">401 Unauthorized</p>
                <p className="text-sm text-orange-800 dark:text-orange-200">Invalid or missing API key</p>
              </div>
              <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded p-3">
                <p className="font-semibold text-sm text-red-900 dark:text-red-100">404 Not Found</p>
                <p className="text-sm text-red-800 dark:text-red-200">Resource not found</p>
              </div>
              <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded p-3">
                <p className="font-semibold text-sm text-red-900 dark:text-red-100">500 Server Error</p>
                <p className="text-sm text-red-800 dark:text-red-200">Internal server error (check status page)</p>
              </div>
            </div>
            <div>
              <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-2">Error Response Format</p>
              <CodeBlock
                code={`{
  "statusCode": 400,
  "message": "Invalid request",
  "error": "Bad Request"
}`}
                id="error-response"
              />
            </div>
          </div>
        </Section>

        <Section id="rate-limit" title="⏱️ Rate Limiting">
          <div className="space-y-4">
            <p className="text-sm text-zinc-700 dark:text-zinc-300">
              API requests are rate-limited to prevent abuse:
            </p>
            <ul className="text-sm space-y-2 text-zinc-700 dark:text-zinc-300">
              <li>• <strong>100 requests per minute</strong> per API key</li>
              <li>• <strong>10,000 rows per request</strong> maximum page size</li>
              <li>• <strong>2GB maximum file size</strong> for uploads</li>
            </ul>
            <p className="text-sm text-amber-700 dark:text-amber-200 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 rounded p-3">
              Rate limit information is included in response headers: <code className="bg-amber-100 dark:bg-amber-900 px-1 rounded">X-RateLimit-Remaining</code>
            </p>
          </div>
        </Section>

        <Section id="examples" title="💡 Integration Examples">
          <div className="space-y-4">
            <div>
              <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-2">Python</p>
              <CodeBlock
                code={`import requests

headers = {"Authorization": "Bearer YOUR_API_KEY"}
response = requests.get(
    "https://your-sheetops-domain/api/v1/workbooks",
    headers=headers
)
workbooks = response.json()
print(f"Found {len(workbooks['data'])} workbooks")`}
                id="example-python"
              />
            </div>
            <div>
              <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-2">JavaScript/Node.js</p>
              <CodeBlock
                code={`const headers = { 'Authorization': 'Bearer YOUR_API_KEY' };
const response = await fetch(
  'https://your-sheetops-domain/api/v1/workbooks',
  { headers }
);
const workbooks = await response.json();
console.log(\`Found \${workbooks.data.length} workbooks\`);`}
                id="example-js"
              />
            </div>
          </div>
        </Section>
      </div>
    </div>
  );
}
