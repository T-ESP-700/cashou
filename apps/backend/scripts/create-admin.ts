/**
 * Script to create an admin user using better-auth API
 * Run with: bun run scripts/create-admin.ts
 */

interface AuthResponse {
  user: {
    id: string;
    email: string;
    name: string;
  };
}

async function createAdminUser() {
  const email = process.env.ADMIN_EMAIL || 'admin@cashou.com';
  const password = process.env.ADMIN_PASSWORD || 'Admin123456!';
  const name = process.env.ADMIN_NAME || 'Administrator';

  console.log('Creating admin user via API...');

  try {
    // Create admin user via API
    const response = await fetch('http://localhost:3000/api/auth/sign-up/email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        password,
        name,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Failed to create admin:', error);

      // Try to sign in if user already exists
      if (response.status === 422) {
        console.log('User might already exist, trying to sign in...');
        const signInResponse = await fetch('http://localhost:3000/api/auth/sign-in/email', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email,
            password,
          }),
        });

        if (signInResponse.ok) {
          const data = await signInResponse.json() as AuthResponse;
          console.log('Admin user signed in successfully:', {
            id: data.user.id,
            email: data.user.email,
            name: data.user.name,
          });
        }
      }
      return;
    }

    const data = await response.json() as AuthResponse;

    console.log('Admin user created successfully:', {
      id: data.user.id,
      email: data.user.email,
      name: data.user.name,
    });

    console.log('\nYou can now login with:');
    console.log('Email:', email);
    console.log('Password:', password);
    console.log('\nMake sure to change the password after first login!');

  } catch (error) {
    console.error('Failed to create admin user:', error);
    process.exit(1);
  }
}

// Run the script
createAdminUser();
