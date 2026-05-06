import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { SignInButton } from './sign-in-button';

export const metadata: Metadata = { title: 'Sign in — Collabspace' };

export default async function SignInPage() {
  const session = await auth();
  if (session) redirect('/dashboard');

  return (
    <main className="flex min-h-screen items-center justify-center bg-neutral-100 px-4">
      <div className="w-full max-w-sm space-y-6 rounded-lg bg-white p-8 shadow-sm">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-semibold">Collabspace</h1>
          <p className="text-sm text-neutral-600">Sign in to access your documents.</p>
        </div>
        <div className="flex justify-center">
          <SignInButton />
        </div>
      </div>
    </main>
  );
}
