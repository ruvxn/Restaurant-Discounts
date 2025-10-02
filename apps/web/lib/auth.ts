import { cookies } from 'next/headers';

export type Role = 'ADMIN' | 'CUSTOMER';

export type Session = {
  accountId: number;
  email: string;
  role: Role;
};

export async function getSession(): Promise<Session | null> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('session');

  if (!sessionCookie?.value) {
    return null;
  }

  try {
    return JSON.parse(sessionCookie.value);
  } catch {
    return null;
  }
}

export async function requireAuth(requiredRole?: Role): Promise<Session> {
  const session = await getSession();

  if (!session) {
    throw new Error('Unauthorized');
  }

  if (requiredRole && session.role !== requiredRole) {
    throw new Error('Forbidden');
  }

  return session;
}
