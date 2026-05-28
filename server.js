require("dotenv").config();
const express = require("express");
const cors = require("cors");
const os = require("os");
const { createClient } = require("@supabase/supabase-js");
const { GoogleGenAI } = require("@google/genai");

// ─── Clients ──────────────────────────────────────────────────────────────────
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY, httpOptions: { apiVersion: "v1" } });

// ─── LAN IP ───────────────────────────────────────────────────────────────────────────────────
const getLocalIP = () => {
  for (const ifaces of Object.values(os.networkInterfaces())) {
    for (const iface of ifaces) {
      if (iface.family === "IPv4" && !iface.internal) return iface.address;
    }
  }
  return "localhost";
};

// ─── Database helpers ─────────────────────────────────────────────────────────────────────────
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

// ─── Helpers ────────────────────────────────────────────────────────────────────────────────────
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

// ─── App ──────────────────────────────────────────────────────────────────────────────────────
const app = express();
app.use(express.json());
app.use(cors());

// ─── Routes ───────────────────────────────────────────────────────────────────────────────────────

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

// ─── Keep-alive ping ─────────────────────────────────────────────────────────
app.get("/api/ping", (req, res) => res.json({ ok: true, ts: Date.now() }));

// ─── List available models ────────────────────────────────────────────────────
app.get("/api/models", async (req, res) => {
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1/models?key=${process.env.GEMINI_API_KEY}`
    );
    const data = await response.json();
    const names = (data.models || []).map(m => m.name);
    res.json({ models: names });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ─── Health check — test Gemini connectivity ──────────────────────────────────
app.get("/api/health", async (req, res) => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: "Reply with the word OK",
    });
    res.json({ status: "ok", ai: response.text.trim() });
  } catch (e) {
    res.status(500).json({ status: "error", error: e.message });
  }
});

// ─── Debug: test ask with inline prompt ───────────────────────────────────────
app.get("/api/test-ask", async (req, res) => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: "The secret is Automobile. Question: Does it relate to transportation? Reply with only YES, NO, or PARTLY.",
    });
    res.json({ status: "ok", answer: response.text.trim() });
  } catch (e) {
    res.status(500).json({ status: "error", error: e.message });
  }
});

// ─── Daily Challenge — AI question answering ──────────────────────────────────
app.post("/api/ask", async (req, res) => {
  const { secret, facts = [], category = "", question } = req.body;
  if (!secret || !question) {
    return res.status(400).json({ error: "secret and question are required" });
  }
  const systemInstruction = `You are the strict, accurate host of a 20-questions guessing game. The secret is "${secret}" (category: ${category}).

Reference facts: ${facts.join("; ")}.

CRITICAL RULES — follow these exactly:
1. Reply with ONLY one word: YES, NO, or PARTLY — nothing else, no explanation.
2. Be STRICTLY and LITERALLY accurate. Do NOT make loose associations or stretch connections. If the link is indirect, tenuous, or figurative, answer NO.
3. "Inventor" means a person who invented something technological or scientific. An object being crafted, commissioned, or built does NOT make it "related to an inventor." The Peacock Throne was built by craftsmen for a king — that is NOT related to an inventor.
4. "Related to X" means a DIRECT, CORE connection — not a distant or trivial one.
5. PARTLY is ONLY for questions that are genuinely compound — where the question explicitly asks about two things and only one is true (e.g. "Is it from Asia or Europe?" when neither applies, or "Does it involve both war and politics?" when only one does). For every simple yes/no question — "Is it a person?", "Did it happen in the 20th century?", "Is it related to science?" — you MUST answer YES or NO. Never answer PARTLY on a simple question. If you are tempted to say PARTLY on a simple question, commit to whichever of YES or NO is more accurate.
6. For WHEN created/invented, refer to when the ORIGINAL was first made — not later versions.
7. For WHO created it, refer to the original maker/inventor/creator.
8. If asked about letters/words/substrings in the name, check the literal spelling of "${secret}" (case-insensitive).
9. When in doubt, answer NO. A wrong YES is far more damaging to the game than a cautious NO.
10. Never reveal the secret directly.`;
  const prompt = `${systemInstruction}\n\nQuestion: ${question}`;
  let lastError;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      if (attempt > 0) await new Promise(r => setTimeout(r, 1000 * attempt));
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
      });
      const raw = response.text.trim().toUpperCase().split(/\s+/)[0];
      const answer = ["YES", "NO", "PARTLY"].includes(raw) ? raw : "NO";
      return res.json({ answer });
    } catch (e) {
      lastError = e;
      console.error(`AI ask error (attempt ${attempt + 1}):`, e.message);
    }
  }
  res.status(500).json({ error: lastError.message, answer: "ERR" });
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
