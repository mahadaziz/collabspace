# Collabspace — Collaborative document editor

A real-time collaborative document editor (Google Docs lite) being built
as a learning project and resume piece.

## Stack

- Frontend: Next.js (App Router), React, TypeScript
- Editor: Tiptap v3 with @tiptap/extension-collaboration
- Sync: Yjs CRDT; y-websocket for now, custom Node server in Phase 7
- Auth: NextAuth.js with GitHub OAuth
- Database: Postgres via Prisma
- Infra: Docker, AWS (ECS Fargate, RDS, ALB), Terraform, GitHub Actions

## Architecture

- Browser clients connect via WebSocket to a Node.js sync server
- Sync server holds the Yjs document in memory
- Document state snapshots to Postgres on idle (~10s of inactivity)
- Awareness state (cursors, presence) is ephemeral, not persisted

## Critical constraints

- Never implement a custom CRDT — use Yjs primitives only
- Document state and awareness state are separate channels — don't conflate them
- WebSocket connections need sticky sessions when load-balanced
- Snapshot to Postgres on idle, never per keystroke

## Conventions

- TypeScript strict mode, no `any`
- React Server Components by default; "use client" only when needed
- Prisma migrations for all schema changes
- Conventional Commits format

## Commands

- `npm run dev` — start Next.js
- `npm run sync` — start the local y-websocket server
- `npm test` — run the test suite
- `npm run lint` — ESLint + Prettier
