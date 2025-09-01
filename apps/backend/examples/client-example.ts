/**
 * Example client usage for the Cashou API
 * This demonstrates how to use the API from a frontend application
 */

/// <reference lib="dom" />

import { createTRPCClient, httpBatchLink } from '@trpc/client';
import type { AppRouter } from '../src/trpc/router';

// Create tRPC client
const client = createTRPCClient<AppRouter>({
  links: [
    httpBatchLink({
      url: 'http://localhost:3000/api/trpc',
      headers: () => {
        // Get the session token from storage (localStorage, cookies, etc.)
        const token = localStorage.getItem('sessionToken');
        return token ? { Authorization: `Bearer ${token}` } : {};
      },
    }),
  ],
});

// Example functions

async function registerUser() {
  try {
    const result = await client.auth.register.mutate({
      email: 'user@example.com',
      password: 'securePassword123',
      name: 'John Doe',
    });

    console.log('Registration successful:', result);
    // Store the session token
    if (result.token) {
      localStorage.setItem('sessionToken', result.token);
    }
    return result;
  } catch (error) {
    console.error('Registration failed:', error);
    throw error;
  }
}

async function loginUser() {
  try {
    const result = await client.auth.login.mutate({
      email: 'user@example.com',
      password: 'securePassword123',
    });

    console.log('Login successful:', result);
    // Store the session token
    if (result.token) {
      localStorage.setItem('sessionToken', result.token);
    }
    return result;
  } catch (error) {
    console.error('Login failed:', error);
    throw error;
  }
}

async function getCurrentUser() {
  try {
    const user = await client.auth.me.query();
    console.log('Current user:', user);
    return user;
  } catch (error) {
    console.error('Failed to get current user:', error);
    throw error;
  }
}

async function updateProfile(username: string) {
  try {
    const result = await client.user.updateProfile.mutate({
      username,
    });
    console.log('Profile updated:', result);
    return result;
  } catch (error) {
    console.error('Failed to update profile:', error);
    throw error;
  }
}

async function listUsers(limit = 10, offset = 0) {
  try {
    const result = await client.user.list.query({
      limit,
      offset,
    });
    console.log('Users:', result);
    return result;
  } catch (error) {
    console.error('Failed to list users:', error);
    throw error;
  }
}

async function createUser(userData: {
  email: string;
  username: string;
  password: string;
  role?: 'USER' | 'ADMIN';
}) {
  try {
    const result = await client.user.create.mutate({
      ...userData,
      role: userData.role || 'USER',
      level: 1,
      points: 0,
    });
    console.log('User created:', result);
    return result;
  } catch (error) {
    console.error('Failed to create user:', error);
    throw error;
  }
}

async function deleteUser(userId: string) {
  try {
    const result = await client.user.delete.mutate(userId);
    console.log('User deleted:', result);
    return result;
  } catch (error) {
    console.error('Failed to delete user:', error);
    throw error;
  }
}

// Better-Auth direct API usage (alternative to tRPC)
class BetterAuthClient {
  private baseUrl = 'http://localhost:3000/api/auth';

  async signUp(email: string, password: string, name?: string) {
    const response = await fetch(`${this.baseUrl}/sign-up/email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, name }),
    });

    if (!response.ok) {
      throw new Error(`Sign up failed: ${response.statusText}`);
    }

    return response.json();
  }

  async signIn(email: string, password: string) {
    const response = await fetch(`${this.baseUrl}/sign-in/email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      throw new Error(`Sign in failed: ${response.statusText}`);
    }

    return response.json();
  }

  async signOut(token: string) {
    const response = await fetch(`${this.baseUrl}/sign-out`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Sign out failed: ${response.statusText}`);
    }

    return response.json();
  }

  async getSession(token: string) {
    const response = await fetch(`${this.baseUrl}/session`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Get session failed: ${response.statusText}`);
    }

    return response.json();
  }
}

// Export for use in other files
export { client, BetterAuthClient };

// Example usage
async function main() {
  // Using tRPC
  await registerUser();
  await loginUser();
  await getCurrentUser();
  await updateProfile('newusername');

  // Admin functions (requires admin role)
  // await listUsers();
  // await createUser({
  //   email: 'newuser@example.com',
  //   username: 'newuser',
  //   password: 'password123',
  // });

  // Using Better-Auth directly
  const authClient = new BetterAuthClient();
  const signUpResult = await authClient.signUp('test@example.com', 'password123', 'Test User');
  console.log('Better-Auth sign up:', signUpResult);
}

// Run examples (uncomment to test)
// main().catch(console.error);
