#!/usr/bin/env node
import http from 'node:http';
import { WebSocketServer } from 'ws';
import * as Y from 'yjs';
import { setupWSConnection, setContentInitializor, getYDoc } from '@y/websocket-server/utils';
import { PrismaClient } from '@prisma/client';

const PORT = Number(process.env.PORT ?? 1234);
const HOST = process.env.HOST ?? 'localhost';
const DEBOUNCE_MS = 10_000;

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
  if (row?.content) {
    Y.applyUpdate(ydoc, new Uint8Array(row.content));
    console.log(`[sync] loaded ${docName} (${row.content.length} bytes)`);
  } else {
    console.log(`[sync] no snapshot for ${docName}, starting empty`);
  }
  ydoc.on('update', () => scheduleSnapshot(docName, ydoc));
});

const httpServer = http.createServer((_req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('ok');
});
const wss = new WebSocketServer({ noServer: true });
wss.on('connection', async (conn, req) => {
  const docName = (req.url || '').slice(1).split('?')[0];
  const doc = getYDoc(docName, true);
  await doc.whenInitialized;
  setupWSConnection(conn, req);
});
httpServer.on('upgrade', (req, socket, head) => {
  wss.handleUpgrade(req, socket, head, (ws) => wss.emit('connection', ws, req));
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
