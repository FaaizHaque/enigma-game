const express = require("express");
const cors = require("cors");

const app = express();
app.use(express.json());
app.use(cors());

// In-memory session store: roomCode -> session object
const sessions = new Map();

// ─── Helpers ──────────────────────────────────────────────────────────────────
const genCode = () => {
  const c = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 6 }, () =>
    c[Math.floor(Math.random() * c.length)]
  ).join("");
};

const uniqueCode = () => {
  let code;
  do { code = genCode(); } while (sessions.has(code));
  return code;
};

// ─── Routes ───────────────────────────────────────────────────────────────────

// POST /api/sessions — create a new game session
app.post("/api/sessions", (req, res) => {
  const { hostName, avatarIdx = 0 } = req.body;
  if (!hostName?.trim()) {
    return res.status(400).json({ error: "hostName is required" });
  }

  const roomCode = uniqueCode();
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
    roundWinnerId: undefined,
    createdAt: new Date().toISOString(),
  };

  sessions.set(roomCode, session);
  res.status(201).json({ roomCode, playerId: "p1", session });
});

// GET /api/sessions/:roomCode — retrieve a session
app.get("/api/sessions/:roomCode", (req, res) => {
  const session = sessions.get(req.params.roomCode.toUpperCase());
  if (!session) {
    return res.status(404).json({ error: "Session not found" });
  }
  res.json(session);
});

// POST /api/sessions/:roomCode/join — add a player to an existing session
app.post("/api/sessions/:roomCode/join", (req, res) => {
  const roomCode = req.params.roomCode.toUpperCase();
  const session = sessions.get(roomCode);
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
  const player = {
    id,
    name: playerName.trim(),
    score: 0,
    isHost: false,
    isEliminated: false,
    avatarIdx: Number(avatarIdx) % 6,
  };

  session.players.push(player);
  res.status(201).json({ playerId: id, session });
});

// PUT /api/sessions/:roomCode — update full session state
app.put("/api/sessions/:roomCode", (req, res) => {
  const roomCode = req.params.roomCode.toUpperCase();
  if (!sessions.has(roomCode)) {
    return res.status(404).json({ error: "Session not found" });
  }
  const updated = { ...req.body, roomCode };
  sessions.set(roomCode, updated);
  res.json(updated);
});

// DELETE /api/sessions/:roomCode — remove a session
app.delete("/api/sessions/:roomCode", (req, res) => {
  const roomCode = req.params.roomCode.toUpperCase();
  sessions.delete(roomCode);
  res.json({ success: true });
});

// ─── Start ────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Enigma session server running on http://localhost:${PORT}`);
});

module.exports = app;
