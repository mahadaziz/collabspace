import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { SignOutButton } from './sign-out-button';

export const metadata: Metadata = { title: 'Dashboard — Collabspace' };

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/sign-in');

  const collaborations = await prisma.documentCollaborator.findMany({
    where: { userId: session.user.id },
    include: { document: true },
    orderBy: { document: { updatedAt: 'desc' } },
  });

  return (
    <main className="min-h-screen bg-neutral-100 px-4 py-12">
      <div className="mx-auto max-w-3xl space-y-6">
        <header className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Your documents</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-neutral-600">
              {session.user.name ?? session.user.email}
            </span>
            <SignOutButton />
          </div>
        </header>

        <form action="/api/documents" method="post">
          <button
            type="submit"
            className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
          >
            New document
          </button>
        </form>

        {collaborations.length === 0 ? (
          <p className="rounded-md bg-white p-6 text-sm text-neutral-600 shadow-sm">
            No documents yet. Create one to get started.
          </p>
        ) : (
          <ul className="divide-y rounded-md bg-white shadow-sm">
            {collaborations.map((c) => (
              <li key={c.documentId}>
                <Link
                  href={`/doc/${c.documentId}`}
                  className="flex items-center justify-between px-6 py-4 hover:bg-neutral-50"
                >
                  <span className="font-medium">{c.document.title}</span>
                  <span className="text-xs uppercase tracking-wide text-neutral-500">{c.role}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
