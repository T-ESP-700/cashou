import { useNavigate } from 'react-router-dom';
import { ColumnDef } from '@tanstack/react-table';
import { Link } from 'react-router-dom';
import { DataTable } from '@/components/tables/DataTable';
import { Button } from '@/components/ui/button';
import { trpc } from '@/lib/trpc';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

interface Event {
  id: number;
  title: string | null;
  description: string | null;
  hasImpact: boolean | null;
}

export default function EventsPage() {
  const navigate = useNavigate();
  const utils = trpc.useUtils();

  const { data: events, isLoading } = trpc.event.getAll.useQuery();

  const deleteMutation = trpc.event.delete.useMutation({
    onSuccess: () => {
      toast.success('Event deleted successfully');
      utils.event.getAll.invalidate();
    },
    onError: (error) => {
      toast.error(`Failed to delete event: ${error.message}`);
    },
  });

  const handleDelete = (id: number, title: string | null) => {
    if (window.confirm(`Are you sure you want to delete event "${title || 'Unnamed'}"?`)) {
      deleteMutation.mutate({ id });
    }
  };

  const columns: ColumnDef<Event>[] = [
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
        return desc.length > 50 ? desc.substring(0, 50) + '...' : desc;
      },
    },
    {
      accessorKey: 'hasImpact',
      header: 'Has Impact',
      cell: ({ row }) => (
        <span
          className={`rounded-full px-2 py-1 text-xs ${
            row.original.hasImpact
              ? 'bg-green-100 text-green-700'
              : 'bg-gray-100 text-gray-700'
          }`}
        >
          {row.original.hasImpact ? 'Yes' : 'No'}
        </span>
      ),
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
              navigate(`/events/${row.original.id}/edit`);
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
    return <div className="text-center py-8">Loading events...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Events</h1>
          <p className="text-gray-600 mt-1">Manage game events</p>
        </div>
        <Link to="/events/create">
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Create Event
          </Button>
        </Link>
      </div>

      <DataTable
        columns={columns}
        data={events || []}
        searchPlaceholder="Search events..."
        onRowClick={(row) => navigate(`/events/${row.id}/edit`)}
      />
    </div>
  );
}
