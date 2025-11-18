import { useNavigate, Link } from 'react-router-dom';
import { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/tables/DataTable';
import { Button } from '@/components/ui/button';
import { trpc } from '@/lib/trpc';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

interface Answer {
  id: number;
  text: string | null;
  isCorrect: boolean | null;
  questionId: number | null;
}

export default function AnswersPage() {
  const navigate = useNavigate();
  const utils = trpc.useUtils();

  const { data: answers, isLoading } = trpc.answer.getAll.useQuery();
  const deleteMutation = trpc.answer.delete.useMutation({
    onSuccess: () => {
      toast.success('Answer deleted');
      utils.answer.getAll.invalidate();
    },
  });

  const columns: ColumnDef<Answer>[] = [
    {
      accessorKey: 'text',
      header: 'Answer',
      cell: ({ row }) => row.original.text || '-',
    },
    {
      accessorKey: 'isCorrect',
      header: 'Correct',
      cell: ({ row }) => (
        <span className={`px-2 py-1 rounded text-xs ${row.original.isCorrect ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
          {row.original.isCorrect ? 'Yes' : 'No'}
        </span>
      ),
    },
    {
      accessorKey: 'questionId',
      header: 'Question ID',
      cell: ({ row }) => row.original.questionId || '-',
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => (
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => navigate(`/answers/${row.original.id}/edit`)}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => {
            if (window.confirm('Delete this answer?')) deleteMutation.mutate({ id: row.original.id });
          }}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  if (isLoading) return <div>Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Answers</h1>
          <p className="text-gray-600 mt-1">Manage quiz answers</p>
        </div>
        <Link to="/answers/create">
          <Button className="gap-2"><Plus className="h-4 w-4" />Create Answer</Button>
        </Link>
      </div>
      <DataTable columns={columns} data={answers || []} searchPlaceholder="Search answers..." />
    </div>
  );
}
