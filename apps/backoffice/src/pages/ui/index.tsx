import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Auth } from '@/components/Auth';

export default function UiDemo() {
  const handleClick = () => {
    alert('shadcn/ui Button works!');
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">UI Components Demo</h1>
        <p className="text-gray-600 mt-1">
          Test des composants UI avec Tailwind v4, tRPC, Zod, Zustand, et Better Auth
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>shadcn/ui</CardTitle>
            <CardDescription>
              Test des composants UI avec Tailwind v4
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Button onClick={handleClick}>Test Button</Button>
              <Button variant="outline" size="sm">
                Outline Button
              </Button>
              <Button variant="secondary" size="lg">
                Secondary Button
              </Button>
            </div>
          </CardContent>
        </Card>

        <Auth />

        <Card>
          <CardHeader>
            <CardTitle>Technologies</CardTitle>
            <CardDescription>
              Stack technique installé
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1 text-sm">
              <li>✅ React 19.1.0</li>
              <li>✅ Tailwind CSS v4</li>
              <li>✅ shadcn/ui</li>
              <li>✅ tRPC + React Query</li>
              <li>✅ Zod v4</li>
              <li>✅ Zustand</li>
              <li>✅ React Router</li>
              <li>✅ React Hook Form</li>
              <li>✅ Tanstack Table</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Next Steps</CardTitle>
            <CardDescription>
              Prochaines étapes de développement
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1 text-sm text-gray-600">
              <li>• ✅ Configurer tRPC + React Query</li>
              <li>• ✅ Setup Supabase Auth</li>
              <li>• ✅ Layout avec Sidebar</li>
              <li>• ✅ React Router</li>
              <li>• Créer les pages CRUD</li>
              <li>• Ajouter plus de composants</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
