import { useNavigate, Link } from 'react-router-dom';
import { ColumnDef } from '@tantml:function_calls';
import { DataTable } from '@/components/tables/DataTable';
import { Button } from '@/components/ui/button';
import { trpc } from '@/lib/trpc';
import { Plus, Pencil, Trash2, Eye } from 'lucide-react';
import { toast } from 'sonner';

interface Question {
  id: number;
  text: string | null;
}

export default function QuestionsPage() {
  const navigate = useNavigate();
  const utils = trpc.useUtils();

  const { data: questions, isLoading } = trpc.question.getAll.useQuery();
  const deleteMutation = trpc.question.delete.useMutation({
    onSuccess: () => {
      toast.success('Question deleted successfully');
      utils.question.getAll.invalidate();
    },
    onError: (error) => {
      toast.error(`Failed to delete question: ${error.message}`);
    },
  });

  const columns: ColumnDef<Question>[] = [
    {
      accessorKey: 'id',
      header: 'ID',
      cell: ({ row }) => (
        <span className="font-mono text-gray-600">#{row.original.id}</span>
      ),
    },
    {
      accessorKey: 'text',
      header: 'Question',
      cell: ({ row }) => {
        const text = row.original.text || 'Unnamed';
        return text.length > 100 ? text.substring(0, 100) + '...' : text;
      },
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
              navigate(`/questions/${row.original.id}`);
            }}
          >
            <Eye className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/questions/${row.original.id}/edit`);
            }}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              if (window.confirm(`Delete this question?`)) {
                deleteMutation.mutate({ id: row.original.id });
              }
            }}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  if (isLoading) return <div className="text-center py-8">Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Questions</h1>
          <p className="text-gray-600 mt-1">Manage quiz questions</p>
        </div>
        <Link to="/questions/create">
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Create Question
          </Button>
        </Link>
      </div>
      <DataTable
        columns={columns}
        data={questions || []}
        searchPlaceholder="Search questions..."
        onRowClick={(row) => navigate(`/questions/${row.id}`)}
      />
    </div>
  );
}
