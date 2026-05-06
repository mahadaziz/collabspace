'use client';

import { useEffect, useState } from 'react';
import type { Awareness } from 'y-protocols/awareness';

type RemoteUser = { id: string; name: string; color: string };

type AwarenessUser = { id?: string; name?: string; color?: string };

export function PresenceSidebar({
  awareness,
  selfUserId,
}: {
  awareness: Awareness;
  selfUserId: string;
}) {
  const [users, setUsers] = useState<RemoteUser[]>([]);

  useEffect(() => {
    const update = () => {
      const seen = new Map<string, RemoteUser>();
      for (const [, state] of awareness.getStates()) {
        const u = (state as { user?: AwarenessUser } | undefined)?.user;
        if (!u?.id || !u.name || !u.color) continue;
        if (u.id === selfUserId) continue;
        if (!seen.has(u.id)) {
          seen.set(u.id, { id: u.id, name: u.name, color: u.color });
        }
      }
      setUsers([...seen.values()]);
    };
    update();
    awareness.on('change', update);
    return () => awareness.off('change', update);
  }, [awareness, selfUserId]);

  return (
    <aside className="w-56 shrink-0 self-start rounded-lg bg-white p-4 shadow-sm">
      <h2 className="mb-3 text-sm font-semibold text-neutral-600">In this document</h2>
      <ul className="flex flex-col gap-2">
        {users.length === 0 ? (
          <li className="text-sm text-neutral-400">No one else here</li>
        ) : (
          users.map((u) => (
            <li key={u.id} className="flex items-center gap-2 text-sm">
              <span
                className="h-3 w-3 rounded-full"
                style={{ backgroundColor: u.color }}
                aria-hidden
              />
              <span>{u.name}</span>
            </li>
          ))
        )}
      </ul>
    </aside>
  );
}
