import 'dotenv/config';
import http from 'node:http';
import { Server } from 'socket.io';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import { parse as parseCookie } from 'cookie';
import { jwtVerify } from 'jose';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool, {
  schema: process.env.DATABASE_SCHEMA || 'students_timetable'
});
const prisma = new PrismaClient({ adapter });
const secret = new TextEncoder().encode(process.env.AUTH_SECRET || 'change-me-super-secret');
const SESSION_COOKIE = 'stt_session';
const PORT = Number(process.env.REALTIME_PORT || 3001);
const HOST = process.env.REALTIME_HOST || '127.0.0.1';

const roomPresence = new Map(); // timetableId -> Map<socketId, { userId,label,role }>
const roomLocks = new Map(); // timetableId -> Map<eventId,userId>
const roomMemoryEvents = new Map(); // timetableId -> Map<eventId,event>

function ensurePresenceRoom(timetableId) {
  if (!roomPresence.has(timetableId)) roomPresence.set(timetableId, new Map());
  return roomPresence.get(timetableId);
}

function ensureLocksRoom(timetableId) {
  if (!roomLocks.has(timetableId)) roomLocks.set(timetableId, new Map());
  return roomLocks.get(timetableId);
}

function ensureMemoryRoom(timetableId) {
  if (!roomMemoryEvents.has(timetableId)) roomMemoryEvents.set(timetableId, new Map());
  return roomMemoryEvents.get(timetableId);
}

function normalizeRole(role) {
  if (role === 'OWNER' || role === 'EDITOR' || role === 'VIEWER') return role;
  return 'VIEWER';
}

async function getSessionFromSocket(socket) {
  try {
    const cookieHeader = socket.handshake.headers.cookie;
    if (!cookieHeader) return null;
    const parsed = parseCookie(cookieHeader);
    const token = parsed[SESSION_COOKIE];
    if (!token) return null;

    const { payload } = await jwtVerify(token, secret);
    return {
      userId: String(payload.userId),
      email: String(payload.email),
      name: payload.name ? String(payload.name) : null
    };
  } catch {
    return null;
  }
}

async function resolveRole({ timetableId, shareToken, session }) {
  const timetable = await prisma.timetable.findUnique({
    where: { id: timetableId },
    include: { members: true }
  });

  if (!timetable) {
    // guest/local ephemeral timetable
    return { ok: true, role: 'OWNER', timetable: null };
  }

  if (session && timetable.ownerId === session.userId) {
    return { ok: true, role: 'OWNER', timetable };
  }

  if (session) {
    const member = timetable.members.find((entry) => entry.userId === session.userId);
    if (member) {
      return { ok: true, role: normalizeRole(member.role), timetable };
    }
  }

  if (!shareToken) {
    return { ok: false, message: 'لا يوجد صلاحية للوصول.' };
  }

  const link = await prisma.shareLink.findUnique({ where: { token: shareToken } });
  if (!link || link.revoked || link.timetableId !== timetableId) {
    return { ok: false, message: 'الرابط غير صالح.' };
  }

  if (link.type === 'PRIVATE' && !session) {
    return { ok: false, message: 'الرابط الخاص يحتاج تسجيل الدخول.' };
  }

  if (session && link.type === 'PRIVATE') {
    await prisma.timetableMember.upsert({
      where: { timetableId_userId: { timetableId, userId: session.userId } },
      update: { role: link.role },
      create: {
        timetableId,
        userId: session.userId,
        role: link.role
      }
    });
  }

  return { ok: true, role: normalizeRole(link.role), timetable };
}

function broadcastPresence(io, timetableId) {
  const room = ensurePresenceRoom(timetableId);
  const labels = [...room.values()].map((entry) => entry.label);
  io.to(timetableId).emit('presence:update', labels);
}

function broadcastLocks(io, timetableId) {
  const locks = Object.fromEntries(ensureLocksRoom(timetableId));
  io.to(timetableId).emit('locks:update', locks);
}

const server = http.createServer((req, res) => {
  if (req.url === '/health' || req.url === '/realtime-health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true, service: 'students-realtime', now: new Date().toISOString() }));
    return;
  }
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ ok: false }));
});

const io = new Server(server, {
  path: '/socket.io',
  cors: {
    origin: true,
    credentials: true
  }
});

io.on('connection', (socket) => {
  socket.on('join', async (payload, ack = () => {}) => {
    try {
      const timetableId = String(payload?.timetableId || '').trim();
      const shareToken = payload?.shareToken ? String(payload.shareToken) : null;
      const userLabel = String(payload?.userLabel || 'مستخدم');

      if (!timetableId) {
        ack({ ok: false, message: 'معرّف الجدول مطلوب.' });
        return;
      }

      const session = await getSessionFromSocket(socket);
      const roleResult = await resolveRole({ timetableId, shareToken, session });
      if (!roleResult.ok) {
        ack({ ok: false, message: roleResult.message });
        return;
      }

      socket.data.timetableId = timetableId;
      socket.data.userId = session?.userId || `guest:${socket.id}`;
      socket.data.role = roleResult.role;
      socket.join(timetableId);

      ensurePresenceRoom(timetableId).set(socket.id, {
        userId: socket.data.userId,
        role: roleResult.role,
        label: userLabel
      });

      broadcastPresence(io, timetableId);
      broadcastLocks(io, timetableId);

      ack({ ok: true, role: roleResult.role });
    } catch {
      ack({ ok: false, message: 'تعذر الانضمام.' });
    }
  });

  socket.on('event:lock', ({ timetableId, eventId }) => {
    if (!timetableId || !eventId) return;
    const locks = ensureLocksRoom(String(timetableId));
    const current = locks.get(String(eventId));
    if (!current || current === socket.data.userId) {
      locks.set(String(eventId), socket.data.userId || `guest:${socket.id}`);
      broadcastLocks(io, String(timetableId));
    }
  });

  socket.on('event:unlock', ({ timetableId, eventId }) => {
    if (!timetableId || !eventId) return;
    const locks = ensureLocksRoom(String(timetableId));
    const current = locks.get(String(eventId));
    if (current && current === (socket.data.userId || `guest:${socket.id}`)) {
      locks.delete(String(eventId));
      broadcastLocks(io, String(timetableId));
    }
  });

  socket.on('event:upsert', async ({ timetableId, event }) => {
    try {
      if (!timetableId || !event) return;
      const roomId = String(timetableId);
      const role = normalizeRole(socket.data.role);
      if (!(role === 'OWNER' || role === 'EDITOR')) return;

      const eventId = String(event.id || '');
      if (!eventId) return;

      const locks = ensureLocksRoom(roomId);
      const lockOwner = locks.get(eventId);
      if (lockOwner && lockOwner !== (socket.data.userId || `guest:${socket.id}`)) return;

      const table = await prisma.timetable.findUnique({ where: { id: roomId } });
      if (!table) {
        // guest room fallback in-memory (not persisted)
        const mem = ensureMemoryRoom(roomId);
        const nextEvent = {
          ...event,
          version: Number(event.version || 0) + 1,
          updatedAt: new Date().toISOString()
        };
        mem.set(eventId, nextEvent);
        io.to(roomId).emit('events:upsert', nextEvent);
        return;
      }

      const existing = await prisma.timetableEvent.findUnique({ where: { id: eventId } });
      const nextVersion = Number(existing?.version || 0) + 1;

      const saved = await prisma.timetableEvent.upsert({
        where: { id: eventId },
        update: {
          title: String(event.title || 'محاضرة'),
          day: String(event.day),
          startMinute: Number(event.startMinute),
          durationMinutes: Number(event.durationMinutes),
          color: String(event.color || '#4f46e5'),
          version: nextVersion,
          updatedById: socket.data.userId?.startsWith('guest:') ? null : socket.data.userId
        },
        create: {
          id: eventId,
          timetableId: roomId,
          title: String(event.title || 'محاضرة'),
          day: String(event.day),
          startMinute: Number(event.startMinute),
          durationMinutes: Number(event.durationMinutes),
          color: String(event.color || '#4f46e5'),
          version: nextVersion,
          createdById: socket.data.userId?.startsWith('guest:') ? null : socket.data.userId,
          updatedById: socket.data.userId?.startsWith('guest:') ? null : socket.data.userId
        }
      });

      await prisma.timetable.update({
        where: { id: roomId },
        data: { version: { increment: 1 } }
      });

      io.to(roomId).emit('events:upsert', {
        id: saved.id,
        timetableId: saved.timetableId,
        title: saved.title,
        day: saved.day,
        startMinute: saved.startMinute,
        durationMinutes: saved.durationMinutes,
        color: saved.color,
        version: saved.version,
        updatedAt: saved.updatedAt
      });
    } catch {
      // no-op for realtime channel
    }
  });

  socket.on('event:delete', async ({ timetableId, eventId }) => {
    try {
      if (!timetableId || !eventId) return;
      const roomId = String(timetableId);
      const role = normalizeRole(socket.data.role);
      if (!(role === 'OWNER' || role === 'EDITOR')) return;

      const table = await prisma.timetable.findUnique({ where: { id: roomId } });
      if (!table) {
        ensureMemoryRoom(roomId).delete(String(eventId));
        io.to(roomId).emit('events:delete', String(eventId));
        return;
      }

      await prisma.timetableEvent.deleteMany({ where: { id: String(eventId), timetableId: roomId } });
      await prisma.timetable.update({ where: { id: roomId }, data: { version: { increment: 1 } } });
      io.to(roomId).emit('events:delete', String(eventId));
    } catch {
      // ignore
    }
  });

  socket.on('disconnect', () => {
    const timetableId = socket.data.timetableId;
    if (!timetableId) return;

    const room = ensurePresenceRoom(timetableId);
    room.delete(socket.id);

    const locks = ensureLocksRoom(timetableId);
    for (const [eventId, ownerId] of locks.entries()) {
      if (ownerId === (socket.data.userId || `guest:${socket.id}`)) {
        locks.delete(eventId);
      }
    }

    broadcastPresence(io, timetableId);
    broadcastLocks(io, timetableId);
  });
});

server.listen(PORT, HOST, () => {
  console.log(`students realtime on http://${HOST}:${PORT}`);
});
