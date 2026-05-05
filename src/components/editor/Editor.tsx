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
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';

export function Editor() {
  const [ydoc] = useState(() => new Y.Doc());

  useEffect(() => {
    const provider = new WebsocketProvider('ws://localhost:1234', 'demo-room', ydoc);
    return () => {
      provider.destroy();
      ydoc.destroy();
    };
  }, [ydoc]);

  const editor = useEditor(
    {
      extensions: [
        StarterKit.configure({ undoRedo: false }),
        Collaboration.configure({ document: ydoc }),
      ],
      immediatelyRender: false,
    },
    [ydoc],
  );

  if (!editor) return null;

  return (
    <div className="flex flex-col gap-4">
      <Toolbar editor={editor} />
      <EditorContent
        editor={editor}
        className="prose prose-neutral max-w-none min-h-[24rem] focus:outline-none [&_.ProseMirror]:min-h-[24rem] [&_.ProseMirror]:focus:outline-none"
      />
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
