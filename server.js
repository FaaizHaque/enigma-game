const express = require("express");
const cors = require("cors");
const os = require("os");
const Database = require("better-sqlite3");
const path = require("path");

// ─── LAN IP ───────────────────────────────────────────────────────────────────
const getLocalIP = () => {
  for (const ifaces of Object.values(os.networkInterfaces())) {
    for (const iface of ifaces) {
      if (iface.family === "IPv4" && !iface.internal) return iface.address;
    }
  }
  return "localhost";
};

// ─── Database ─────────────────────────────────────────────────────────────────
const db = new Database(path.join(__dirname, "sessions.db"));

db.exec(`
  CREATE TABLE IF NOT EXISTS sessions (
    room_code TEXT PRIMARY KEY,
    data      TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_created ON sessions(created_at);
`);

// Auto-delete sessions older than 24 hours on startup
db.prepare(`DELETE FROM sessions WHERE created_at < datetime('now', '-24 hours')`).run();

const getSession  = (code) => {
  const row = db.prepare("SELECT data FROM sessions WHERE room_code = ?").get(code);
  return row ? JSON.parse(row.data) : null;
};
const hasSession  = (code) => !!db.prepare("SELECT 1 FROM sessions WHERE room_code = ?").get(code);
const saveSession = (session) => {
  db.prepare(`
    INSERT INTO sessions (room_code, data, created_at)
    VALUES (@code, @data, @created_at)
    ON CONFLICT(room_code) DO UPDATE SET data = excluded.data
  `).run({ code: session.roomCode, data: JSON.stringify(session), created_at: session.createdAt || new Date().toISOString() });
};
const deleteSession = (code) => db.prepare("DELETE FROM sessions WHERE room_code = ?").run(code);

// ─── Helpers ──────────────────────────────────────────────────────────────────
const genCode = () => {
  const c = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 6 }, () =>
    c[Math.floor(Math.random() * c.length)]
  ).join("");
};

const uniqueCode = () => {
  let code;
  do { code = genCode(); } while (hasSession(code));
  return code;
};

// ─── App ──────────────────────────────────────────────────────────────────────
const app = express();
app.use(express.json());
app.use(cors());

// ─── Routes ───────────────────────────────────────────────────────────────────

// GET /api/info — returns server's LAN IP so clients can build correct QR URLs
app.get("/api/info", (req, res) => {
  res.json({ ip: getLocalIP() });
});

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

  saveSession(session);
  res.status(201).json({ roomCode, playerId: "p1", session });
});

// GET /api/sessions/:roomCode — retrieve a session
app.get("/api/sessions/:roomCode", (req, res) => {
  const session = getSession(req.params.roomCode.toUpperCase());
  if (!session) {
    return res.status(404).json({ error: "Session not found" });
  }
  res.json(session);
});

// POST /api/sessions/:roomCode/join — add a player to an existing session
app.post("/api/sessions/:roomCode/join", (req, res) => {
  const roomCode = req.params.roomCode.toUpperCase();
  const session = getSession(roomCode);
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
  saveSession(session);
  res.status(201).json({ playerId: id, session });
});

// PUT /api/sessions/:roomCode — update full session state
app.put("/api/sessions/:roomCode", (req, res) => {
  const roomCode = req.params.roomCode.toUpperCase();
  if (!hasSession(roomCode)) {
    return res.status(404).json({ error: "Session not found" });
  }
  const updated = { ...req.body, roomCode };
  saveSession(updated);
  res.json(updated);
});

// DELETE /api/sessions/:roomCode — remove a session
app.delete("/api/sessions/:roomCode", (req, res) => {
  deleteSession(req.params.roomCode.toUpperCase());
  res.json({ success: true });
});

// ─── Start ────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Enigma session server running on http://localhost:${PORT}`);
});

module.exports = app;
