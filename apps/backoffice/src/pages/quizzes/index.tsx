import { useNavigate, Link } from 'react-router-dom';
import { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/tables/DataTable';
import { Button } from '@/components/ui/button';
import { trpc } from '@/lib/trpc';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

interface Quiz {
  id: number;
  type: string | null;
  title: string | null;
  date: Date | null;
  levelId: number | null;
  context: string | null;
}

export default function QuizzesPage() {
  const navigate = useNavigate();
  const utils = trpc.useUtils();

  const { data: quizzes, isLoading } = trpc.quiz.getAll.useQuery();

  const deleteMutation = trpc.quiz.delete.useMutation({
    onSuccess: () => {
      toast.success('Quiz deleted successfully');
      utils.quiz.getAll.invalidate();
    },
    onError: (error) => {
      toast.error(`Failed to delete quiz: ${error.message}`);
    },
  });

  const handleDelete = (id: number, title: string | null) => {
    if (window.confirm(`Are you sure you want to delete quiz "${title || 'Unnamed'}"?`)) {
      deleteMutation.mutate({ id });
    }
  };

  const columns: ColumnDef<Quiz>[] = [
    {
      accessorKey: 'type',
      header: 'Type',
      cell: ({ row }) => (
        <span
          className={`rounded-full px-2 py-1 text-xs font-medium ${
            row.original.type === 'DAILY'
              ? 'bg-blue-100 text-blue-700'
              : 'bg-purple-100 text-purple-700'
          }`}
        >
          {row.original.type || '-'}
        </span>
      ),
    },
    {
      accessorKey: 'title',
      header: 'Title',
      cell: ({ row }) => row.original.title || 'Unnamed',
    },
    {
      accessorKey: 'date',
      header: 'Date',
      cell: ({ row }) =>
        row.original.date
          ? new Date(row.original.date).toLocaleDateString()
          : '-',
    },
    {
      accessorKey: 'levelId',
      header: 'Level',
      cell: ({ row }) => row.original.levelId || '-',
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => (
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/quizzes/${row.original.id}/edit`);
            }}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              handleDelete(row.original.id, row.original.title);
            }}
            disabled={deleteMutation.isPending}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  if (isLoading) {
    return <div className="text-center py-8">Loading quizzes...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Quizzes</h1>
          <p className="text-gray-600 mt-1">Manage educational quizzes</p>
        </div>
        <Link to="/quizzes/create">
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Create Quiz
          </Button>
        </Link>
      </div>

      <DataTable
        columns={columns}
        data={quizzes || []}
        searchPlaceholder="Search quizzes..."
        onRowClick={(row) => navigate(`/quizzes/${row.id}/edit`)}
      />
    </div>
  );
}
