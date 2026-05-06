'use client';

import { useEffect, useState } from 'react';
import {
  EditorContent,
  useEditor,
  useEditorState,
  type Editor as TiptapEditor,
} from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Collaboration from '@tiptap/extension-collaboration';
import CollaborationCaret from '@tiptap/extension-collaboration-caret';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { colorForUserId } from '@/lib/user-color';
import { PresenceSidebar } from './PresenceSidebar';

type EditorProps = {
  docId: string;
  title: string;
  token: string;
  userId: string;
  userName: string;
};

const SYNC_URL = process.env.NEXT_PUBLIC_SYNC_URL ?? 'ws://localhost:1234';

export function Editor({ docId, title, token, userId, userName }: EditorProps) {
  const [ydoc] = useState(() => new Y.Doc());
  const [provider] = useState(
    () => new WebsocketProvider(SYNC_URL, docId, ydoc, { params: { token } }),
  );

  useEffect(() => {
    return () => {
      provider.destroy();
      ydoc.destroy();
    };
  }, [provider, ydoc]);

  const color = colorForUserId(userId);

  const editor = useEditor(
    {
      extensions: [
        StarterKit.configure({ undoRedo: false }),
        Collaboration.configure({ document: ydoc }),
        CollaborationCaret.configure({
          provider,
          user: { id: userId, name: userName, color },
        }),
      ],
      immediatelyRender: false,
    },
    [ydoc, provider, userId, userName, color],
  );

  if (!editor) return null;

  return (
    <div className="flex gap-4">
      <div className="flex-1 rounded-lg bg-white p-8 shadow-sm">
        <div className="flex flex-col gap-4">
          <h1 className="text-2xl font-semibold">{title}</h1>
          <Toolbar editor={editor} />
          <EditorContent
            editor={editor}
            className="prose prose-neutral max-w-none min-h-[24rem] focus:outline-none [&_.ProseMirror]:min-h-[24rem] [&_.ProseMirror]:focus:outline-none"
          />
        </div>
      </div>
      <PresenceSidebar awareness={provider.awareness} selfUserId={userId} />
    </div>
  );
}

function Toolbar({ editor }: { editor: TiptapEditor }) {
  const state = useEditorState({
    editor,
    selector: ({ editor }) => ({
      bold: editor.isActive('bold'),
      italic: editor.isActive('italic'),
      h1: editor.isActive('heading', { level: 1 }),
      h2: editor.isActive('heading', { level: 2 }),
      bulletList: editor.isActive('bulletList'),
      orderedList: editor.isActive('orderedList'),
    }),
  });

  return (
    <div className="flex flex-wrap gap-1 border-b border-neutral-200 pb-3">
      <ToolbarButton
        label="Bold"
        isActive={state.bold}
        onClick={() => editor.chain().focus().toggleBold().run()}
      />
      <ToolbarButton
        label="Italic"
        isActive={state.italic}
        onClick={() => editor.chain().focus().toggleItalic().run()}
      />
      <ToolbarButton
        label="H1"
        isActive={state.h1}
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
      />
      <ToolbarButton
        label="H2"
        isActive={state.h2}
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
      />
      <ToolbarButton
        label="Bullet list"
        isActive={state.bulletList}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
      />
      <ToolbarButton
        label="Ordered list"
        isActive={state.orderedList}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
      />
    </div>
  );
}

function ToolbarButton({
  label,
  isActive,
  onClick,
}: {
  label: string;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={isActive}
      className={
        'rounded px-3 py-1.5 text-sm font-medium transition-colors ' +
        (isActive ? 'bg-neutral-900 text-white' : 'text-neutral-700 hover:bg-neutral-100')
      }
    >
      {label}
    </button>
  );
}
