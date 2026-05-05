# Collabspace

A real-time collaborative document editor — Google Docs lite — built on Next.js, Tiptap, and Yjs.

## Stack

Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS v4. Editor and sync layers (Tiptap, Yjs, NextAuth, Prisma) are added in subsequent phases — see `CLAUDE.md` for the full architecture.

## Prerequisites

- Node.js ≥ 18.18
- npm ≥ 10

## Getting started

```bash
npm install
cp .env.local.example .env.local   # fill in secrets when needed
```

Real-time collaboration on `/editor` requires **two** processes running side-by-side, in separate terminals:

```bash
npm run dev    # terminal 1 — Next.js on :3000
npm run sync   # terminal 2 — y-websocket relay on :1234
```

Then open <http://localhost:3000/editor> in two browser tabs and type — edits sync live between them. The relay holds document state in memory only; restart it and the document resets.

## Scripts

| Command                | What it does                                   |
| ---------------------- | ---------------------------------------------- |
| `npm run dev`          | Start the Next.js dev server (Turbopack)       |
| `npm run sync`         | Start the local y-websocket relay on port 1234 |
| `npm run build`        | Production build                               |
| `npm start`            | Serve the production build                     |
| `npm run lint`         | ESLint                                         |
| `npm run format`       | Prettier write                                 |
| `npm run format:check` | Prettier check                                 |
