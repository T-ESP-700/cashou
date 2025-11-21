/**
 * Service d'authentification local pour le backoffice
 * Utilise l'API backend au lieu de Supabase
 */

import { trpc } from './trpc'

const TOKEN_KEY = 'backoffice_auth_token'
const USER_KEY = 'backoffice_user'

export interface BackofficeUser {
  id: number
  email: string
  name: string | null
  roles: string[]
}

export class LocalAuthService {
  static getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY)
  }

  static setToken(token: string) {
    localStorage.setItem(TOKEN_KEY, token)
  }

  static clearToken() {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
  }

  static getUser(): BackofficeUser | null {
    const userStr = localStorage.getItem(USER_KEY)
    return userStr ? JSON.parse(userStr) : null
  }

  static setUser(user: BackofficeUser) {
    localStorage.setItem(USER_KEY, JSON.stringify(user))
  }

  static async signIn(email: string, password: string) {
    try {
      const result = await trpc.backofficeAuth.signIn.mutate({ email, password })
      
      this.setToken(result.token)
      this.setUser(result.user)
      
      return result
    } catch (error) {
      throw error
    }
  }

  static async verify() {
    const token = this.getToken()
    if (!token) {
      return null
    }

    try {
      const result = await trpc.backofficeAuth.verify.query({ token })
      this.setUser(result.user)
      return result.user
    } catch (error) {
      this.clearToken()
      return null
    }
  }

  static signOut() {
    this.clearToken()
  }
}


