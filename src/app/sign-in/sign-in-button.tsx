'use client';

import { signIn } from 'next-auth/react';

export function SignInButton() {
  return (
    <button
      type="button"
      onClick={() => signIn('github', { redirectTo: '/dashboard' })}
      className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
    >
      Sign in with GitHub
    </button>
  );
}
