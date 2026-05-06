import { NextResponse, type NextRequest } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const contentType = req.headers.get('content-type') ?? '';
  let title = 'Untitled';
  if (contentType.includes('application/json')) {
    const body = (await req.json().catch(() => ({}))) as { title?: unknown };
    if (typeof body.title === 'string' && body.title.trim()) title = body.title.trim();
  } else if (
    contentType.includes('application/x-www-form-urlencoded') ||
    contentType.includes('multipart/form-data')
  ) {
    const form = await req.formData();
    const t = form.get('title');
    if (typeof t === 'string' && t.trim()) title = t.trim();
  }

  const id = crypto.randomUUID();
  const userId = session.user.id;

  await prisma.$transaction([
    prisma.document.create({
      data: { id, title, ownerId: userId, content: Buffer.alloc(0) },
    }),
    prisma.documentCollaborator.create({
      data: { userId, documentId: id, role: 'owner' },
    }),
  ]);

  if (contentType.includes('application/json')) {
    return NextResponse.json({ id }, { status: 201 });
  }
  return NextResponse.redirect(new URL(`/doc/${id}`, req.url), 303);
}
