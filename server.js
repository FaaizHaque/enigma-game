require("dotenv").config();
const express = require("express");
const cors = require("cors");
const os = require("os");
const { createClient } = require("@supabase/supabase-js");
const Anthropic = require("@anthropic-ai/sdk");

// ─── Clients ──────────────────────────────────────────────────────────────────
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

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

// ─── Daily Challenge — AI question answering ──────────────────────────────────
app.post("/api/ask", async (req, res) => {
  const { secret, facts = [], category = "", question } = req.body;
  if (!secret || !question) {
    return res.status(400).json({ error: "secret and question are required" });
  }
  try {
    const message = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 60,
      system: `You are the host of a 20-questions guessing game. The secret answer is "${secret}" (category: ${category}). Key facts: ${facts.join("; ")}.

The guesser asks yes/no questions. Follow these rules strictly:
1. Reply with ONLY one word: YES, NO, or PARTLY.
2. If the question asks whether a specific word, syllable, letter, or substring appears IN the name/spelling of the secret (e.g. "is the word micro in it?", "does it contain the letter X?"), answer based on whether that string literally appears inside "${secret}" — ignore case.
3. Use PARTLY if the answer is partially true, context-dependent, or true for only part of the question.
4. Never reveal the secret directly. Answer only YES, NO, or PARTLY.`,
      messages: [{ role: "user", content: question }],
    });
    const raw = message.content[0].text.trim().toUpperCase();
    const answer = ["YES", "NO", "PARTLY"].includes(raw) ? raw : "NO";
    res.json({ answer });
  } catch (e) {
    console.error("AI ask error:", e.message);
    res.status(500).json({ error: "AI unavailable", answer: "NO" });
  }
});

// ─── Daily Challenge — save result ────────────────────────────────────────────
app.post("/api/daily-result", async (req, res) => {
  const { playerName, challengeDate, solved, questionsUsed, timeSeconds, secret } = req.body;
  if (!playerName || !challengeDate) return res.status(400).json({ error: "Missing fields" });
  try {
    await supabase.from("daily_results").insert({
      player_name: playerName,
      challenge_date: challengeDate,
      solved: !!solved,
      questions_used: questionsUsed || 0,
      time_seconds: timeSeconds || 0,
      secret: secret || "",
    });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ─── Daily Challenge — leaderboard ────────────────────────────────────────────
app.get("/api/daily-leaderboard/:date", async (req, res) => {
  try {
    const { data } = await supabase
      .from("daily_results")
      .select("player_name, solved, questions_used, time_seconds")
      .eq("challenge_date", req.params.date)
      .order("solved", { ascending: false })
      .order("questions_used", { ascending: true })
      .order("time_seconds", { ascending: true })
      .limit(20);
    res.json(data || []);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ─── Start ────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Enigma session server running on port ${PORT}`);
});

module.exports = app;
