import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { Editor } from '@/components/editor/Editor';

export const metadata: Metadata = { title: 'Document — Collabspace' };

type Params = Promise<{ id: string }>;

export default async function DocumentPage({ params }: { params: Params }) {
  const { id } = await params;

  const session = await auth();
  if (!session?.user?.id) redirect('/sign-in');

  const access = await prisma.documentCollaborator.findUnique({
    where: { userId_documentId: { userId: session.user.id, documentId: id } },
    include: { document: { select: { title: true } } },
  });
  if (!access) notFound();

  const cookieStore = await cookies();
  const token =
    cookieStore.get('authjs.session-token')?.value ??
    cookieStore.get('__Secure-authjs.session-token')?.value;
  if (!token) redirect('/sign-in');

  return (
    <main className="min-h-screen bg-neutral-100 px-4 py-12">
      <div className="mx-auto max-w-3xl rounded-lg bg-white p-8 shadow-sm">
        <Editor docId={id} title={access.document.title} token={token} />
      </div>
    </main>
  );
}
