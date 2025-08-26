import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AuthService } from '@/lib/supabase';
import type { User, Session } from '@supabase/supabase-js';

export function Auth() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('test@example.com');
  const [password, setPassword] = useState('password123');

  useEffect(() => {
    // Vérifier la session actuelle au montage du composant
    checkCurrentSession();

    // Écouter les changements d'état d'authentification
    const { data: { subscription } } = AuthService.onAuthStateChange((event, session) => {
      console.log('Auth state changed:', event, session);
      setSession(session);
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkCurrentSession = async () => {
    try {
      const currentSession = await AuthService.getCurrentSession();
      setSession(currentSession);
      if (currentSession) {
        const currentUser = await AuthService.getCurrentUser();
        setUser(currentUser);
      }
    } catch (error) {
      console.error('Error checking session:', error);
    }
  };

  const handleSignUp = async () => {
    setLoading(true);
    try {
      const data = await AuthService.signUpWithEmail(email, password);
      console.log('Sign up successful:', data);
      alert('Inscription réussie ! Vérifiez votre email pour confirmer votre compte.');
    } catch (error) {
      console.error('Sign up error:', error);
      alert('Erreur lors de l\'inscription: ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleSignUpWithoutEmail = async () => {
    setLoading(true);
    try {
      const data = await AuthService.signUpWithoutEmail(email, password);
      console.log('Sign up without email successful:', data);
      alert('Inscription réussie sans envoi d\'email ! Compte créé et activé directement.');
    } catch (error) {
      console.error('Sign up without email error:', error);
      alert('Erreur lors de l\'inscription sans email: ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async () => {
    setLoading(true);
    try {
      const data = await AuthService.signInWithEmail(email, password);
      console.log('Sign in successful:', data);
      alert('Connexion réussie !');
    } catch (error) {
      console.error('Sign in error:', error);
      alert('Erreur lors de la connexion: ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    setLoading(true);
    try {
      await AuthService.signOut();
      console.log('Sign out successful');
      alert('Déconnexion réussie !');
      setUser(null);
      setSession(null);
    } catch (error) {
      console.error('Sign out error:', error);
      alert('Erreur lors de la déconnexion: ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Test Authentification Supabase</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Affichage de l'état actuel */}
        <div className="p-3 bg-gray-50 rounded-md">
          <p className="text-sm font-medium">État actuel :</p>
          <p className="text-xs text-gray-600">
            Utilisateur : {user ? user.email : 'Non connecté'}
          </p>
          <p className="text-xs text-gray-600">
            Session : {session ? 'Active' : 'Inactive'}
          </p>
        </div>

        {/* Formulaire de connexion/inscription */}
        <div className="space-y-2">
          <div>
            <label className="text-sm font-medium">Email :</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border rounded-md text-sm"
              placeholder="votre-email@example.com"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Mot de passe :</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border rounded-md text-sm"
              placeholder="Votre mot de passe"
            />
          </div>
        </div>

        {/* Boutons d'action */}
        <div className="space-y-2">
          {!user ? (
            <>
              <Button
                onClick={handleSignUp}
                disabled={loading}
                variant="outline"
                className="w-full"
              >
                {loading ? 'Chargement...' : 'S\'inscrire'}
              </Button>
              <Button
                onClick={handleSignUpWithoutEmail}
                disabled={loading}
                variant="outline"
                className="w-full"
              >
                {loading ? 'Chargement...' : 'S\'inscrire sans email'}
              </Button>
              <Button
                onClick={handleSignIn}
                disabled={loading}
                className="w-full"
              >
                {loading ? 'Chargement...' : 'Se connecter'}
              </Button>
            </>
          ) : (
            <Button
              onClick={handleSignOut}
              disabled={loading}
              variant="destructive"
              className="w-full"
            >
              {loading ? 'Chargement...' : 'Se déconnecter'}
            </Button>
          )}
        </div>

        {/* Informations de debug */}
        {session && (
          <div className="p-3 bg-blue-50 rounded-md">
            <p className="text-xs font-medium text-blue-900">Session Info :</p>
            <p className="text-xs text-blue-700">
              Access Token : {session.access_token.substring(0, 20)}...
            </p>
            <p className="text-xs text-blue-700">
              Expires : {new Date(session.expires_at! * 1000).toLocaleString()}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
