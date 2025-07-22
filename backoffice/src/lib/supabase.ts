import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';

if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY) {
  console.warn("⚠️ Supabase URL or Publishable Key is missing in environment variables. Using placeholder values.");
}

// Création du client Supabase avec les nouvelles configurations
export const supabase = createClient(supabaseUrl, supabasePublishableKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});

// Service d'authentification avec des méthodes utilitaires
export class AuthService {
  static async signInWithEmail(email: string, password: string) {
    if (supabaseUrl === '') {
      throw new Error('⚠️ Configuration Supabase manquante. Veuillez configurer les variables d\'environnement.');
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.error('Error signing in:', error.message);
      throw error;
    }

    return data;
  }

  static async signUpWithEmail(email: string, password: string) {
    if (supabaseUrl === '') {
      throw new Error('⚠️ Configuration Supabase manquante. Veuillez configurer les variables d\'environnement.');
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      console.error('Error signing up:', error.message);
      throw error;
    }

    return data;
  }

  static async signUpWithoutEmail(email: string, password: string) {
    if (supabaseUrl === '') {
      throw new Error('⚠️ Configuration Supabase manquante. Veuillez configurer les variables d\'environnement.');
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: undefined,
        data: {
          email_confirm: true
        }
      }
    });

    if (error) {
      console.error('Error signing up without email:', error.message);
      throw error;
    }

    return data;
  }

  static async signOut() {
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error('Error signing out:', error.message);
      throw error;
    }
  }

  static async getCurrentUser() {
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error) {
      console.error('Error getting user:', error.message);
      throw error;
    }

    return user;
  }

  static async getCurrentSession() {
    const { data: { session }, error } = await supabase.auth.getSession();

    if (error) {
      console.error('Error getting session:', error.message);
      throw error;
    }

    return session;
  }

  static onAuthStateChange(callback: (event: string, session: any) => void) {
    return supabase.auth.onAuthStateChange(callback);
  }
}

export default supabase;
