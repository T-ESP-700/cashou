import { useEffect, useState } from 'react'
import { trpc } from '@/lib/trpc'
import { setApiToken } from '@/services/backoffice-api'

type AuthState = 'checking' | 'signed_in' | 'signed_out'

interface BackofficeUser {
  id: number
  email: string
  name: string | null
  roles: string[]
}

const TOKEN_KEY = 'backoffice_auth_token'
const USER_KEY = 'backoffice_user'

export function LocalAuthGate({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<AuthState>('checking')
  const [user, setUser] = useState<BackofficeUser | null>(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)

  // tRPC mutations
  const signInMutation = trpc.backofficeAuth.signIn.useMutation()

  useEffect(() => {
    const verifyAuth = async () => {
      const token = localStorage.getItem(TOKEN_KEY)
      const userStr = localStorage.getItem(USER_KEY)

      if (token && userStr) {
        try {
          const storedUser = JSON.parse(userStr)
          setUser(storedUser)
          await setApiToken(token)
          setStatus('signed_in')
        } catch {
          localStorage.removeItem(TOKEN_KEY)
          localStorage.removeItem(USER_KEY)
          setStatus('signed_out')
        }
      } else {
        setStatus('signed_out')
      }
    }

    verifyAuth()
  }, [])

  const handleSignIn = async (event: React.FormEvent) => {
    event.preventDefault()
    setError(null)

    try {
      const result = await signInMutation.mutateAsync({ email, password })

      // Stocker le token et l'utilisateur
      localStorage.setItem(TOKEN_KEY, result.token)
      localStorage.setItem(USER_KEY, JSON.stringify(result.user))

      setUser(result.user)
      await setApiToken(result.token)
      setStatus('signed_in')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erreur de connexion')
    }
  }

  const handleSignOut = () => {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
    setUser(null)
    setApiToken(null)
    setStatus('signed_out')
  }

  if (status === 'checking') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="rounded-2xl border border-slate-200 bg-white px-6 py-4 text-sm text-slate-600 shadow-sm">
          Vérification de la session...
        </div>
      </div>
    )
  }

  if (status === 'signed_out') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <form
          onSubmit={handleSignIn}
          className="w-full max-w-sm space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
        >
          <div className="space-y-1">
            <p className="text-sm font-semibold text-slate-900">Connexion backoffice</p>
            <p className="text-xs text-slate-500">Renseignez vos identifiants</p>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-medium text-slate-600">Email</label>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
              required
              autoComplete="email"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-medium text-slate-600">Mot de passe</label>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
              required
              autoComplete="current-password"
            />
          </div>
          {error && (
            <div className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
              {error}
            </div>
          )}
          <button
            type="submit"
            className="w-full rounded-xl bg-slate-900 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
            disabled={signInMutation.isPending}
          >
            {signInMutation.isPending ? 'Connexion...' : 'Se connecter'}
          </button>
          <div className="rounded-lg bg-blue-50 px-3 py-2 text-xs text-blue-700">
            <p className="font-semibold mb-1">Identifiants par défaut :</p>
            <p>Email: admin@cashou.com</p>
            <p>Password: Admin123456!</p>
          </div>
        </form>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col">
      <div className="flex items-center justify-end bg-slate-900 px-4 py-2 text-xs text-white">
        <span className="mr-2 text-slate-200">{user?.email}</span>
        {user?.roles && user.roles.length > 0 && (
          <span className="mr-2 rounded-full bg-white/20 px-2 py-0.5 text-[10px]">
            {user.roles.join(', ')}
          </span>
        )}
        <button
          onClick={handleSignOut}
          className="rounded-full border border-white/30 px-3 py-1 text-xs font-semibold transition hover:border-white"
        >
          Déconnexion
        </button>
      </div>
      {children}
    </div>
  )
}
