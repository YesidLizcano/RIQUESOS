'use server';

// Auth helpers for Server Actions — session checking
// Login/logout are handled client-side via next-auth/react
import { getServerSession } from 'next-auth';
import { authOptions } from '@/infrastructure/auth';
import { redirect } from 'next/navigation';

/**
 * Require an authenticated session in a Server Action.
 * Redirects to /login if no session found.
 * Use at the top of every data-modifying Server Action.
 */
export async function requireSession() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect('/login');
  }
  return session;
}