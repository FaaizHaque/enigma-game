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

// ─── Answer cache ─────────────────────────────────────────────────────────────
// In-memory cache keyed by normalised "secret|question". Resets on server restart
// but warms up quickly during active play and eliminates repeat Gemini calls.
const answerCache = new Map();
const cacheKey = (secret, question) =>
  `${secret.toLowerCase().trim()}|${question.toLowerCase().trim()}`;

// ─── Daily Challenge — AI question answering ──────────────────────────────────
app.post("/api/ask", async (req, res) => {
  const { secret, facts = [], category = "", question } = req.body;
  if (!secret || !question) {
    return res.status(400).json({ error: "secret and question are required" });
  }

  // Serve from cache if available — instant response, zero API cost
  const key = cacheKey(secret, question);
  if (answerCache.has(key)) {
    return res.json({ answer: answerCache.get(key), cached: true });
  }

  const systemInstruction = `You are the strict, accurate host of a 20-questions guessing game. The secret is "${secret}" (category: ${category}).

Reference facts: ${facts.join("; ")}.

CRITICAL RULES — follow these exactly:
1. Reply with ONLY one word: YES, NO, PARTLY, or UNCLEAR — nothing else, no explanation.
2. Interpret the input GENEROUSLY as a yes/no question about the secret — players use shorthand, so treat brief phrases and single meaningful words as the obvious question. "In France", "France?", or just "France" all mean "Is it in / related to France?"; "Alive?" means "Is it alive?"; "A person?" means "Is it a person?"; "UK" means "Is it in / related to the UK?". A single occupation, role, or category word means "Is it a / does it belong to that category?" — e.g. "Sportsman" / "Athlete" means "Is it a sportsman/athlete?"; "Scientist", "Politician", "Actor", "Musician", "Writer", "Inventor" likewise. Answer these YES, NO, or PARTLY — NEVER UNCLEAR. Recognise common abbreviations: UK = United Kingdom, US / USA = United States, UAE = United Arab Emirates, EU = European Union, UN = United Nations, USSR = Soviet Union. Answer all of these with YES, NO, or PARTLY. Answer UNCLEAR ONLY when the input is genuinely unusable — random letters or gibberish, a lone article/filler with no content word, or a truly open-ended request ("why", "what is this", "give me a clue"). If a brief input has a clear subject, never answer UNCLEAR — interpret it and answer.
2b. COUNTRY ABBREVIATIONS ARE LITERAL AND MUST NOT BE CONFUSED WITH SIMILAR-LOOKING COUNTRIES. "UK" ALWAYS means the United Kingdom (Great Britain and Northern Ireland — England, Scotland, Wales, N. Ireland). "UK" is NEVER Ukraine. Ukraine is a completely different country; the player will write "Ukraine" (or "UA") if they mean it. So for a secret in Ukraine (e.g. Crimea, Kyiv), "UK" or "United Kingdom" must be answered NO. Apply the same care to other look-alikes: "US" = United States (not anything else), "Aus" could be Australia or Austria so treat a bare "Aus" as needing the fuller word — but never invent a country the abbreviation does not stand for.
3. Be STRICTLY and LITERALLY accurate. Do NOT make loose associations or stretch connections. If the link is indirect, tenuous, or figurative, answer NO.
4. "Inventor" means a person who invented something technological or scientific. An object being crafted, commissioned, or built does NOT make it "related to an inventor." The Peacock Throne was built by craftsmen for a king — that is NOT related to an inventor.
5. "Related to X" means a DIRECT, CORE connection — not a distant or trivial one.
6. PARTLY is for a genuinely SPLIT truth — never a hedge for uncertainty. Use it in two cases: (a) a COMPOUND question that asks about two things where only one is true (e.g. "Is it from Asia or Europe?" when only one applies); or (b) a SINGLE attribute that is authentically HALF-TRUE, where a flat YES or NO would actively mislead the guesser. Classic example: the secret is Ferdinand Magellan — Portuguese by birth but famous for sailing in the service of the Spanish crown — so "Is he Spanish?" or "Spain?" must be PARTLY (not a misleading YES, and not a misleading NO). Do NOT use PARTLY to hedge on clear, simple questions — "Is it a person?", "Did it happen in the 20th century?", "Is it related to science?" must be YES or NO. Only use PARTLY when the truth is genuinely divided, never merely because you are unsure.
6b. For a person's nationality, origin, or home country, judge primarily by where they were BORN, not by countries they merely worked for, served, sailed for, or are associated with. If they are strongly tied to a different country through service or fame, answer PARTLY rather than a misleading YES or NO.
7. For WHEN created/invented, refer to when the ORIGINAL was first made — not later versions.
8. For WHO created it, refer to the original maker/inventor/creator.
9. If asked about letters/words/substrings in the name, check the literal spelling of "${secret}" (case-insensitive).
10. When in doubt, answer NO. A wrong YES is far more damaging to the game than a cautious NO.
11. Never reveal the secret directly.`;
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
      const answer = ["YES", "NO", "PARTLY", "UNCLEAR"].includes(raw) ? raw : "NO";
      // Cache concrete verdicts only. Never cache UNCLEAR — a transient misread
      // would otherwise stick, so the same question keeps failing on every retry.
      if (answer !== "UNCLEAR") answerCache.set(key, answer);
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

// ─── Solo Leaderboard ─────────────────────────────────────────────────────────
// Points are computed here (server-authoritative) from the star tiers players
// already see, plus a small no-hints bonus. Kept intentionally simple.
const soloPoints = (solved, q, hints) => {
  if (!solved) return 0;
  let p = q <= 5 ? 100 : q <= 10 ? 60 : q <= 15 ? 40 : 20;
  if (!hints) p += 10;
  return p;
};

// The current week's Monday (UTC) as YYYY-MM-DD — matches Postgres date_trunc('week').
const mondayUTC = () => {
  const d = new Date();
  const dow = (d.getUTCDay() + 6) % 7; // 0 = Monday
  d.setUTCDate(d.getUTCDate() - dow);
  return d.toISOString().slice(0, 10);
};

// Record a finished solo round and bank its points.
app.post("/api/solo-result", async (req, res) => {
  const { playerId, playerName, avatarIdx = 0, tier, solved, questionsUsed, hintsUsed } = req.body;
  if (!playerId || !tier) return res.status(400).json({ error: "playerId and tier are required" });
  const points = soloPoints(!!solved, Number(questionsUsed) || 0, Number(hintsUsed) || 0);
  try {
    if (points > 0) {
      await supabase.rpc("record_solo_score", {
        p_player_id: playerId,
        p_tier: tier === "junior" ? "junior" : "scholar",
        p_name: playerName || null,
        p_avatar: Number(avatarIdx) || 0,
        p_points: points,
      });
    }
    res.json({ points });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Read a tier's leaderboard. scope=week (default) | all. Optional playerId returns
// the caller's own row so they can see their standing even if outside the top 50.
app.get("/api/solo-leaderboard/:tier", async (req, res) => {
  const tier = req.params.tier === "junior" ? "junior" : "scholar";
  const scope = req.query.scope === "all" ? "all" : "week";
  const playerId = req.query.playerId;
  try {
    let q = supabase
      .from("solo_scores")
      .select("player_id, player_name, avatar_idx, total_points, week_points, week_start")
      .eq("tier", tier);
    if (scope === "week") {
      q = q.eq("week_start", mondayUTC()).order("week_points", { ascending: false });
    } else {
      q = q.order("total_points", { ascending: false });
    }
    const { data } = await q.limit(200);
    const all = (data || []).map((r, i) => ({
      rank: i + 1,
      playerId: r.player_id,
      name: r.player_name || "Player",
      avatarIdx: r.avatar_idx || 0,
      points: scope === "week" ? r.week_points : r.total_points,
    }));
    const rows = all.slice(0, 50);
    let me = null;
    if (playerId) {
      const found = all.find((r) => r.playerId === playerId);
      if (found) me = found;
    }
    res.json({ rows, me });
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
