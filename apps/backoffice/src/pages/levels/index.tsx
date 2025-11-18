import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/tables/DataTable';
import { Button } from '@/components/ui/button';
import { trpc } from '@/lib/trpc';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

interface Level {
  id: number;
  title: string | null;
  number: number | null;
  duration: number | null;
  speed: number | null;
  startBalance: number | null;
  pointsRequired: number | null;
  description: string | null;
}

export default function LevelsPage() {
  const navigate = useNavigate();
  const utils = trpc.useUtils();

  // Fetch levels
  const { data: levels, isLoading } = trpc.level.getAll.useQuery();

  // Delete mutation
  const deleteMutation = trpc.level.delete.useMutation({
    onSuccess: () => {
      toast.success('Level deleted successfully');
      utils.level.getAll.invalidate();
    },
    onError: (error) => {
      toast.error(`Failed to delete level: ${error.message}`);
    },
  });

  const handleDelete = (id: number, title: string | null) => {
    if (window.confirm(`Are you sure you want to delete level "${title || 'Unnamed'}"?`)) {
      deleteMutation.mutate({ id });
    }
  };

  const columns: ColumnDef<Level>[] = [
    {
      accessorKey: 'number',
      header: '#',
      cell: ({ row }) => row.original.number ?? '-',
    },
    {
      accessorKey: 'title',
      header: 'Title',
      cell: ({ row }) => row.original.title || 'Unnamed',
    },
    {
      accessorKey: 'duration',
      header: 'Duration',
      cell: ({ row }) => row.original.duration ? `${row.original.duration}s` : '-',
    },
    {
      accessorKey: 'speed',
      header: 'Speed',
      cell: ({ row }) => row.original.speed ?? '-',
    },
    {
      accessorKey: 'startBalance',
      header: 'Start Balance',
      cell: ({ row }) => row.original.startBalance ? `$${row.original.startBalance}` : '-',
    },
    {
      accessorKey: 'pointsRequired',
      header: 'Points Required',
      cell: ({ row }) => row.original.pointsRequired ?? '-',
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
              navigate(`/levels/${row.original.id}/edit`);
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
    return <div className="text-center py-8">Loading levels...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Levels</h1>
          <p className="text-gray-600 mt-1">Manage game levels</p>
        </div>
        <Link to="/levels/create">
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Create Level
          </Button>
        </Link>
      </div>

      <DataTable
        columns={columns}
        data={levels || []}
        searchPlaceholder="Search levels..."
        onRowClick={(row) => navigate(`/levels/${row.id}/edit`)}
      />
    </div>
  );
}
