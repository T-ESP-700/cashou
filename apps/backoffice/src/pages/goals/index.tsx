import { useNavigate, Link } from 'react-router-dom';
import { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/tables/DataTable';
import { Button } from '@/components/ui/button';
import { trpc } from '@/lib/trpc';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

interface Goal {
  id: number;
  title: string | null;
  description: string | null;
}

export default function GoalsPage() {
  const navigate = useNavigate();
  const utils = trpc.useUtils();

  const { data: goals, isLoading } = trpc.goal.getAll.useQuery();

  const deleteMutation = trpc.goal.delete.useMutation({
    onSuccess: () => {
      toast.success('Goal deleted successfully');
      utils.goal.getAll.invalidate();
    },
    onError: (error) => {
      toast.error(`Failed to delete goal: ${error.message}`);
    },
  });

  const handleDelete = (id: number, title: string | null) => {
    if (window.confirm(`Are you sure you want to delete goal "${title || 'Unnamed'}"?`)) {
      deleteMutation.mutate({ id });
    }
  };

  const columns: ColumnDef<Goal>[] = [
    {
      accessorKey: 'title',
      header: 'Title',
      cell: ({ row }) => row.original.title || 'Unnamed',
    },
    {
      accessorKey: 'description',
      header: 'Description',
      cell: ({ row }) => {
        const desc = row.original.description || '-';
        return desc.length > 80 ? desc.substring(0, 80) + '...' : desc;
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
              navigate(`/goals/${row.original.id}/edit`);
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
    return <div className="text-center py-8">Loading goals...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Goals</h1>
          <p className="text-gray-600 mt-1">Manage game goals</p>
        </div>
        <Link to="/goals/create">
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Create Goal
          </Button>
        </Link>
      </div>

      <DataTable
        columns={columns}
        data={goals || []}
        searchPlaceholder="Search goals..."
        onRowClick={(row) => navigate(`/goals/${row.id}/edit`)}
      />
    </div>
  );
}
