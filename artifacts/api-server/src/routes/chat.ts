import { Router, type IRouter } from "express";
import { db, messagesTable, roomsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { verifyToken } from "../lib/auth";

const router: IRouter = Router();

function rKey(a: string, b: string): string {
  return [a.toLowerCase(), b.toLowerCase()].sort().join("__");
}

// GET /api/chat/conversations  (requires Authorization: Bearer <token>)
router.get("/chat/conversations", async (req, res) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  const username = token ? verifyToken(token) : null;
  if (!username) { res.status(401).json({ error: "Unauthorized" }); return; }

  const u = username.toLowerCase();
  const myRooms = await db
    .select()
    .from(roomsTable)
    .where(eq(roomsTable.userA, u));
  const myRooms2 = await db
    .select()
    .from(roomsTable)
    .where(eq(roomsTable.userB, u));

  res.json({ conversations: [...myRooms, ...myRooms2] });
});

// GET /api/chat/messages/:peer  (requires Authorization: Bearer <token>)
router.get("/chat/messages/:peer", async (req, res) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  const username = token ? verifyToken(token) : null;
  if (!username) { res.status(401).json({ error: "Unauthorized" }); return; }

  const peer = req.params.peer.toLowerCase();
  const key = rKey(username, peer);
  const messages = await db
    .select()
    .from(messagesTable)
    .where(eq(messagesTable.roomKey, key))
    .orderBy(messagesTable.createdAt);

  res.json({ messages });
});

export default router;
