import type { Metadata } from 'next';
import { Editor } from '@/components/editor/Editor';

export const metadata: Metadata = { title: 'Editor — Collabspace' };

export default function EditorPage() {
  return (
    <main className="min-h-screen bg-neutral-100 px-4 py-12">
      <div className="mx-auto max-w-3xl rounded-lg bg-white p-8 shadow-sm">
        <Editor />
      </div>
    </main>
  );
}
