const express = require("express");
const cors = require("cors");
const os = require("os");
const { createClient } = require("@supabase/supabase-js");

// ─── Supabase ─────────────────────────────────────────────────────────────────
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// ─── LAN IP ───────────────────────────────────────────────────────────────────
const getLocalIP = () => {
  for (const ifaces of Object.values(os.networkInterfaces())) {
    for (const iface of ifaces) {
      if (iface.family === "IPv4" && !iface.internal) return iface.address;
    }
  }
  return "localhost";
};

// ─── Database helpers ─────────────────────────────────────────────────────────
const getSession = async (code) => {
  const { data } = await supabase
    .from("sessions")
    .select("data")
    .eq("room_code", code)
    .maybeSingle();
  return data ? data.data : null;
};

const hasSession = async (code) => {
  const { data } = await supabase
    .from("sessions")
    .select("room_code")
    .eq("room_code", code)
    .maybeSingle();
  return !!data;
};

const saveSession = async (session) => {
  await supabase.from("sessions").upsert({
    room_code: session.roomCode,
    data: session,
    created_at: session.createdAt || new Date().toISOString(),
  });
};

const deleteSession = async (code) => {
  await supabase.from("sessions").delete().eq("room_code", code);
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
  do {
    code = genCode();
  } while (await hasSession(code));
  return code;
};

// ─── App ──────────────────────────────────────────────────────────────────────
const app = express();
app.use(express.json());
app.use(cors());

// ─── Routes ───────────────────────────────────────────────────────────────────

app.get("/api/info", (req, res) => {
  const host = req.headers["x-forwarded-host"] || req.hostname;
  res.json({ ip: host === "localhost" ? getLocalIP() : host });
});

app.post("/api/sessions", async (req, res) => {
  const { hostName, avatarIdx = 0 } = req.body;
  if (!hostName?.trim()) {
    return res.status(400).json({ error: "hostName is required" });
  }

  const roomCode = await uniqueCode();
  const session = {
    roomCode,
    players: [{
      id: "p1",
      name: hostName.trim(),
      score: 0,
      isHost: true,
      isEliminated: false,
      avatarIdx: Number(avatarIdx),
    }],
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

app.get("/api/sessions/:roomCode", async (req, res) => {
  const session = await getSession(req.params.roomCode.toUpperCase());
  if (!session) return res.status(404).json({ error: "Session not found" });
  res.json(session);
});

app.post("/api/sessions/:roomCode/join", async (req, res) => {
  const roomCode = req.params.roomCode.toUpperCase();
  const session = await getSession(roomCode);
  if (!session) return res.status(404).json({ error: "Session not found" });
  if (session.status !== "lobby") return res.status(400).json({ error: "Game already in progress" });

  const { playerName, avatarIdx = 0 } = req.body;
  if (!playerName?.trim()) return res.status(400).json({ error: "playerName is required" });

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

app.put("/api/sessions/:roomCode", async (req, res) => {
  const roomCode = req.params.roomCode.toUpperCase();
  if (!(await hasSession(roomCode))) {
    return res.status(404).json({ error: "Session not found" });
  }
  const updated = { ...req.body, roomCode };
  await saveSession(updated);
  res.json(updated);
});

app.delete("/api/sessions/:roomCode", async (req, res) => {
  await deleteSession(req.params.roomCode.toUpperCase());
  res.json({ success: true });
});

// ─── Start ────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Enigma session server running on port ${PORT}`);
});

module.exports = app;
