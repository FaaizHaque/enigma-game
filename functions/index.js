const { onRequest } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");
const express = require("express");
const cors = require("cors");

admin.initializeApp();

const db = admin.firestore();
const sessionsCol = db.collection("sessions");

// ─── Database helpers (Firestore) ─────────────────────────────────────────────
const getSession = async (code) => {
  const doc = await sessionsCol.doc(code).get();
  return doc.exists ? doc.data() : null;
};

const hasSession = async (code) => {
  const doc = await sessionsCol.doc(code).get();
  return doc.exists;
};

const saveSession = async (session) => {
  await sessionsCol.doc(session.roomCode).set(session);
};

const deleteSession = async (code) => {
  await sessionsCol.doc(code).delete();
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const genCode = () => {
  const c = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 6 }, () =>
    c[Math.floor(Math.random() * c.length)]
  ).join("");
};

const uniqueCode = async () => {
  let code;
  do { code = genCode(); } while (await hasSession(code));
  return code;
};

// ─── App ──────────────────────────────────────────────────────────────────────
const app = express();
app.use(express.json());
app.use(cors({ origin: true }));

// ─── Routes ───────────────────────────────────────────────────────────────────

// GET /api/info — returns hostname so clients can build correct QR URLs
app.get("/api/info", (req, res) => {
  res.json({ ip: req.hostname });
});

// POST /api/sessions — create a new game session
app.post("/api/sessions", async (req, res) => {
  const { hostName, avatarIdx = 0 } = req.body;
  if (!hostName?.trim()) {
    return res.status(400).json({ error: "hostName is required" });
  }

  const roomCode = await uniqueCode();
  const host = {
    id: "p1",
    name: hostName.trim(),
    score: 0,
    isHost: true,
    isEliminated: false,
    avatarIdx: Number(avatarIdx),
  };

  const session = {
    roomCode,
    players: [host],
    round: 1,
    theme: null,
    secretAnswer: "",
    hostHint: "",
    questions: [],
    currentQuestionerIndex: 0,
    status: "lobby",
    pendingSolve: null,
    roundWinnerId: null,
    createdAt: new Date().toISOString(),
  };

  await saveSession(session);
  res.status(201).json({ roomCode, playerId: "p1", session });
});

// GET /api/sessions/:roomCode — retrieve a session
app.get("/api/sessions/:roomCode", async (req, res) => {
  const session = await getSession(req.params.roomCode.toUpperCase());
  if (!session) {
    return res.status(404).json({ error: "Session not found" });
  }
  res.json(session);
});

// POST /api/sessions/:roomCode/join — add a player to an existing session
app.post("/api/sessions/:roomCode/join", async (req, res) => {
  const roomCode = req.params.roomCode.toUpperCase();
  const session = await getSession(roomCode);
  if (!session) {
    return res.status(404).json({ error: "Session not found" });
  }
  if (session.status !== "lobby") {
    return res.status(400).json({ error: "Game already in progress" });
  }

  const { playerName, avatarIdx = 0 } = req.body;
  if (!playerName?.trim()) {
    return res.status(400).json({ error: "playerName is required" });
  }

  const id = `p${session.players.length + 1}`;
  session.players.push({
    id,
    name: playerName.trim(),
    score: 0,
    isHost: false,
    isEliminated: false,
    avatarIdx: Number(avatarIdx) % 6,
  });

  await saveSession(session);
  res.status(201).json({ playerId: id, session });
});

// PUT /api/sessions/:roomCode — update full session state
app.put("/api/sessions/:roomCode", async (req, res) => {
  const roomCode = req.params.roomCode.toUpperCase();
  if (!(await hasSession(roomCode))) {
    return res.status(404).json({ error: "Session not found" });
  }
  const updated = { ...req.body, roomCode };
  await saveSession(updated);
  res.json(updated);
});

// DELETE /api/sessions/:roomCode — remove a session
app.delete("/api/sessions/:roomCode", async (req, res) => {
  await deleteSession(req.params.roomCode.toUpperCase());
  res.json({ success: true });
});

exports.api = onRequest({ region: "us-central1" }, app);
