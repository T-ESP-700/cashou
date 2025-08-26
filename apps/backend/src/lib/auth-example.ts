// Example of how to use the shared auth package in backend
import { auth } from '@cashou/auth/server';

// The auth instance is already configured with the database
// You can use it directly in your routes

export { auth };

// Example route handler (for reference)
// app.use('/api/auth/*', auth.handler);