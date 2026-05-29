import { useWorkbooks } from '../hooks/useWorkbooks';
import { WorkbookCard } from './WorkbookCard';
import { Loader2 } from 'lucide-react';
import { Button } from './ui/button';

export function WorkbookList() {
  const { data, isLoading, isError } = useWorkbooks();

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="animate-spin text-indigo-500" size={32} />
      </div>
    );
  }

  if (isError) {
    return <div className="text-red-500 py-8">Failed to load workbooks.</div>;
  }

  const workbooks = data?.data || [];

  if (workbooks.length === 0) {
    return (
      <div className="text-center py-12 text-zinc-500">
        No workbooks uploaded yet. Drag a file above to get started.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {workbooks.map((workbook) => (
        <WorkbookCard key={workbook.id} workbook={workbook} />
      ))}
    </div>
  );
}
