#!/usr/bin/env node
import http from 'node:http';
import { WebSocketServer } from 'ws';
import * as Y from 'yjs';
import { setupWSConnection, setContentInitializor, getYDoc } from '@y/websocket-server/utils';
import { PrismaClient } from '@prisma/client';
import { decode } from 'next-auth/jwt';

const PORT = Number(process.env.PORT ?? 1234);
const HOST = process.env.HOST ?? 'localhost';
const DEBOUNCE_MS = 10_000;
const SESSION_COOKIE_NAME = 'authjs.session-token';
const AUTH_SECRET = process.env.AUTH_SECRET;

if (!AUTH_SECRET) {
  console.error('[sync] AUTH_SECRET is required to verify session tokens');
  process.exit(1);
}

const prisma = new PrismaClient();
const debounceTimers = new Map();

async function persistDoc(docName, ydoc) {
  const update = Y.encodeStateAsUpdate(ydoc);
  const content = Buffer.from(update);
  await prisma.document.upsert({
    where: { id: docName },
    create: { id: docName, content },
    update: { content },
  });
  console.log(`[sync] snapshotted ${docName} (${content.length} bytes)`);
}

function scheduleSnapshot(docName, ydoc) {
  clearTimeout(debounceTimers.get(docName));
  debounceTimers.set(
    docName,
    setTimeout(() => {
      debounceTimers.delete(docName);
      persistDoc(docName, ydoc).catch((err) =>
        console.error(`[sync] snapshot failed for ${docName}:`, err),
      );
    }, DEBOUNCE_MS),
  );
}

// setContentInitializor produces a promise stored on doc.whenInitialized.
// It is *not* awaited automatically by setupWSConnection — we await it
// ourselves in the connection handler before letting the sync handshake run,
// to avoid the race where sync step 1 ships an empty doc to the client.
setContentInitializor(async (ydoc) => {
  const docName = ydoc.name;
  const row = await prisma.document.findUnique({ where: { id: docName } });
  if (row?.content && row.content.length > 0) {
    Y.applyUpdate(ydoc, new Uint8Array(row.content));
    console.log(`[sync] loaded ${docName} (${row.content.length} bytes)`);
  } else {
    console.log(`[sync] no snapshot for ${docName}, starting empty`);
  }
  ydoc.on('update', () => scheduleSnapshot(docName, ydoc));
});

function rejectHttp(socket, status, reason) {
  socket.write(`HTTP/1.1 ${status} ${reason}\r\nConnection: close\r\n\r\n`);
  socket.destroy();
}

const httpServer = http.createServer((_req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('ok');
});

const wss = new WebSocketServer({ noServer: true });

// authorizedConns lets us tell the connection handler whether to immediately
// close with a WS-level 4001 (authenticated user, no access to this doc) or
// proceed with the sync handshake.
const authorizedConns = new WeakSet();

wss.on('connection', async (conn, req) => {
  if (!authorizedConns.has(conn)) {
    conn.close(4001, 'Forbidden');
    return;
  }
  const docName = (req.url || '').slice(1).split('?')[0];
  const doc = getYDoc(docName, true);
  await doc.whenInitialized;
  setupWSConnection(conn, req);
});

httpServer.on('upgrade', async (req, socket, head) => {
  try {
    const url = new URL(req.url, 'http://localhost');
    const documentId = decodeURIComponent(url.pathname.slice(1));
    const token = url.searchParams.get('token');

    if (!documentId || !token) {
      rejectHttp(socket, 401, 'Unauthorized');
      return;
    }

    const payload = await decode({
      token,
      secret: AUTH_SECRET,
      salt: SESSION_COOKIE_NAME,
    });

    if (!payload || typeof payload.userId !== 'string') {
      rejectHttp(socket, 401, 'Unauthorized');
      return;
    }

    const access = await prisma.documentCollaborator.findUnique({
      where: { userId_documentId: { userId: payload.userId, documentId } },
    });

    // Per spec, signal lack of access via WS close code 4001 (post-handshake).
    // We complete the upgrade and let the connection handler close it.
    wss.handleUpgrade(req, socket, head, (ws) => {
      if (access) authorizedConns.add(ws);
      wss.emit('connection', ws, req);
    });
  } catch (err) {
    console.error('[sync] upgrade error:', err);
    try {
      rejectHttp(socket, 401, 'Unauthorized');
    } catch {
      // socket may already be destroyed
    }
  }
});

async function shutdown(signal) {
  console.log(`[sync] ${signal} — shutting down`);
  for (const t of debounceTimers.values()) clearTimeout(t);
  debounceTimers.clear();
  await prisma.$disconnect();
  process.exit(0);
}
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

httpServer.listen(PORT, HOST, () => {
  console.log(`[sync] listening on ws://${HOST}:${PORT}`);
});
