import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { ApiKey } from '../types';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Trash2, Copy, Check } from 'lucide-react';
import { formatDate } from '../lib/utils';

export function ApiKeyModal({ workbookId, onClose }: { workbookId: string; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [newKey, setNewKey] = useState<string | null>(null);

  const { data: keys = [] } = useQuery({
    queryKey: ['api-keys', workbookId],
    queryFn: async () => {
      const { data } = await api.get<ApiKey[]>(`/workbooks/${workbookId}/api-keys`);
      return data;
    }
  });

  const createKey = useMutation({
    mutationFn: async () => {
      const { data } = await api.post<{id:string, key:string}>(`/workbooks/${workbookId}/api-keys`);
      return data;
    },
    onSuccess: (data) => {
      setNewKey(data.key);
      queryClient.invalidateQueries({ queryKey: ['api-keys', workbookId] });
    }
  });

  const revokeKey = useMutation({
    mutationFn: async (keyId: string) => {
      await api.delete(`/workbooks/${workbookId}/api-keys/${keyId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['api-keys', workbookId] });
    }
  });

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(text);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Data API Access</DialogTitle>
          <DialogDescription>
            Manage API keys for direct data access to this workbook.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 my-4">
          {newKey && (
            <div className="p-4 bg-emerald-50 text-emerald-900 dark:bg-emerald-900/30 dark:text-emerald-200 rounded-lg border border-emerald-200 dark:border-emerald-800">
              <p className="text-sm font-medium mb-2">Save this key now! It won't be shown again.</p>
              <div className="flex gap-2">
                <Input value={newKey} readOnly className="font-mono bg-white dark:bg-zinc-950" />
                <Button variant="outline" size="icon" onClick={() => handleCopy(newKey)}>
                  {copiedKey === newKey ? <Check size={16} className="text-emerald-600" /> : <Copy size={16} />}
                </Button>
              </div>
            </div>
          )}

          <div className="space-y-2">
            {keys.length === 0 ? (
              <p className="text-sm text-zinc-500 text-center py-4">No API keys created yet.</p>
            ) : (
              keys.map((key) => (
                <div key={key.id} className="flex items-center justify-between p-3 rounded-lg border bg-zinc-50 dark:bg-zinc-900">
                  <div>
                    <p className="text-sm font-medium">sk_live_...{key.id.slice(-6)}</p>
                    <p className="text-xs text-zinc-500">
                      Created: {formatDate(key.createdAt)}
                    </p>
                  </div>
                  <Button variant="ghost" size="icon" className="text-red-500" onClick={() => revokeKey.mutate(key.id)}>
                    <Trash2 size={16} />
                  </Button>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="flex justify-end">
          <Button onClick={() => createKey.mutate()} disabled={createKey.isPending}>
            Generate New Key
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
