import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { setApiToken } from '@/services/backoffice-api'

type AuthState = 'checking' | 'signed_in' | 'signed_out'

export function AuthGate({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<AuthState>('checking')
  const [session, setSession] = useState<Session | null>(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    let mounted = true

    const loadSession = async () => {
      const { data } = await supabase.auth.getSession()
      if (!mounted) return
      if (data.session) {
        setSession(data.session)
        await setApiToken(data.session.access_token)
        setStatus('signed_in')
      } else {
        setStatus('signed_out')
      }
    }

    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, nextSession) => {
      if (!mounted) return
      if (nextSession) {
        setSession(nextSession)
        await setApiToken(nextSession.access_token)
        setStatus('signed_in')
      } else {
        setSession(null)
        await setApiToken(null)
        setStatus('signed_out')
      }
    })

    void loadSession()

    return () => {
      mounted = false
      listener.subscription.unsubscribe()
    }
  }, [])

  const handleSignIn = async (event: React.FormEvent) => {
    event.preventDefault()
    setIsSubmitting(true)
    setError(null)
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      if (signInError) {
        setError(signInError.message)
      }
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
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
            <p className="text-xs text-slate-500">Renseignez vos identifiants Supabase</p>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-medium text-slate-600">Email</label>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
              required
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
            />
          </div>
          {error && <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">{error}</p>}
          <button
            type="submit"
            className="w-full rounded-xl bg-slate-900 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Connexion...' : 'Se connecter'}
          </button>
        </form>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col">
      <div className="flex items-center justify-end bg-slate-900 px-4 py-2 text-xs text-white">
        <span className="mr-2 text-slate-200">{session?.user.email}</span>
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
