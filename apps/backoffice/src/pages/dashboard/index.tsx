import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { trpc } from '@/lib/trpc';

export default function Dashboard() {
  // Example query to test tRPC connection
  const { data: health } = trpc.health.useQuery();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-1">
          Bienvenue dans le backoffice Cashou
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle>Backend Status</CardTitle>
            <CardDescription>Connexion au backend</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {health ? (
                <span className="text-green-600">✓ Connected</span>
              ) : (
                <span className="text-gray-400">Loading...</span>
              )}
            </div>
            {health && (
              <p className="text-xs text-gray-500 mt-2">
                Status: {health.status}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Levels</CardTitle>
            <CardDescription>Gestion des niveaux</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">-</div>
            <p className="text-xs text-gray-500 mt-2">
              En cours de chargement...
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quiz</CardTitle>
            <CardDescription>Système de quiz</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">-</div>
            <p className="text-xs text-gray-500 mt-2">
              En cours de chargement...
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Events</CardTitle>
            <CardDescription>Événements de jeu</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">-</div>
            <p className="text-xs text-gray-500 mt-2">
              En cours de chargement...
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Actions rapides</CardTitle>
          <CardDescription>Raccourcis vers les fonctionnalités principales</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <a
              href="/levels"
              className="rounded-lg border p-4 hover:bg-gray-50 transition-colors"
            >
              <h3 className="font-medium">Créer un niveau</h3>
              <p className="text-sm text-gray-600 mt-1">
                Ajouter un nouveau niveau de jeu
              </p>
            </a>
            <a
              href="/quiz"
              className="rounded-lg border p-4 hover:bg-gray-50 transition-colors"
            >
              <h3 className="font-medium">Créer un quiz</h3>
              <p className="text-sm text-gray-600 mt-1">
                Ajouter un nouveau quiz éducatif
              </p>
            </a>
            <a
              href="/events"
              className="rounded-lg border p-4 hover:bg-gray-50 transition-colors"
            >
              <h3 className="font-medium">Créer un événement</h3>
              <p className="text-sm text-gray-600 mt-1">
                Ajouter un événement de marché
              </p>
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
