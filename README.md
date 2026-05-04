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
npm run dev
```

Then open <http://localhost:3000>.

## Scripts

| Command                | What it does                             |
| ---------------------- | ---------------------------------------- |
| `npm run dev`          | Start the Next.js dev server (Turbopack) |
| `npm run build`        | Production build                         |
| `npm start`            | Serve the production build               |
| `npm run lint`         | ESLint                                   |
| `npm run format`       | Prettier write                           |
| `npm run format:check` | Prettier check                           |
