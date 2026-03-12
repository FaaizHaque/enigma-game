import { useState, useEffect, useRef } from "react";
import { QRCodeSVG } from "qrcode.react";

// ─── Constants ────────────────────────────────────────────────────────────
const THEMES = [
  { id: "personality", label: "Famous Personality", icon: "👤", desc: "A real or fictional person known worldwide" },
  { id: "event", label: "Historical Event", icon: "📜", desc: "A pivotal moment that shaped history" },
  { id: "object", label: "Legendary Object", icon: "🏺", desc: "An iconic object of great significance" },
  { id: "place", label: "Famous Place", icon: "🗺️", desc: "A landmark or renowned location" },
  { id: "invention", label: "Great Invention", icon: "💡", desc: "A discovery that changed the world" },
  { id: "character", label: "Fictional Character", icon: "🎭", desc: "A beloved character from books, film or legend" },
];

const AVATAR_COLORS = [
  { bg: "#1c3a5c", fg: "#60aaee" },
  { bg: "#3c1c1c", fg: "#ee7060" },
  { bg: "#1c3c1c", fg: "#60cc70" },
  { bg: "#3c1c3c", fg: "#cc70cc" },
  { bg: "#3c2c1c", fg: "#ddaa50" },
  { bg: "#1c3c3c", fg: "#50cccc" },
];

const DEMO_PLAYERS = [
  { name: "Ayesha", avatarIdx: 1 },
  { name: "Marcus", avatarIdx: 2 },
  { name: "Sofia", avatarIdx: 3 },
  { name: "Jin", avatarIdx: 4 },
];

const genCode = () => {
  const c = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 6 }, () => c[Math.floor(Math.random() * c.length)]).join("");
};

const getInitials = (name) =>
  name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);

const normalize = (s) =>
  s.toLowerCase().trim().replace(/[^a-z0-9\s]/g, "").replace(/\s+/g, " ");

const fuzzyMatch = (guess, answer) => {
  const g = normalize(guess), a = normalize(answer);
  if (!g || !a) return false;
  if (g === a) return true;
  if (a.includes(g) || g.includes(a)) return true;
  const m = g.length, n = a.length;
  if (Math.abs(m - n) > 5) return false;
  const dp = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = g[i-1] === a[j-1] ? dp[i-1][j-1] : 1 + Math.min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1]);
  return dp[m][n] <= Math.max(2, Math.floor(a.length * 0.25));
};

// ─── Styles ───────────────────────────────────────────────────────────────
const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700;900&family=Outfit:wght@300;400;500;600;700&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --bg: #06060f;
    --surface: #0c0c1a;
    --card: #111122;
    --card2: #161628;
    --border: #1e1e38;
    --border2: #282848;
    --gold: #c8a84a;
    --gold2: #e8cc70;
    --gold-dim: #7a6420;
    --gold-glow: rgba(200,168,74,0.18);
    --violet: #6d28d9;
    --violet2: #8b5cf6;
    --text: #eeeef8;
    --muted: #8888aa;
    --dim: #4a4a66;
    --success: #22c55e;
    --danger: #ef4444;
    --warn: #f59e0b;
  }

  body {
    font-family: 'Outfit', sans-serif;
    background: var(--bg);
    color: var(--text);
    min-height: 100vh;
  }

  .app {
    min-height: 100vh;
    max-width: 430px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    position: relative;
    background: var(--bg);
    overflow: hidden;
  }

  /* Starfield bg */
  .app::before {
    content: '';
    position: fixed;
    inset: 0;
    background:
      radial-gradient(ellipse 80% 60% at 50% -10%, rgba(109,40,217,0.15) 0%, transparent 70%),
      radial-gradient(ellipse 60% 40% at 80% 120%, rgba(200,168,74,0.08) 0%, transparent 60%);
    pointer-events: none;
    z-index: 0;
  }

  .screen {
    flex: 1;
    display: flex;
    flex-direction: column;
    padding: 0 16px 24px;
    position: relative;
    z-index: 1;
    animation: fadeUp 0.3s ease both;
  }

  @keyframes fadeUp { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:none; } }
  @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.45} }
  @keyframes glow { 0%,100%{box-shadow:0 0 12px var(--gold-dim)} 50%{box-shadow:0 0 28px var(--gold)} }
  @keyframes slideUp { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:none; } }
  @keyframes popIn { from { opacity:0; transform:scale(0.94); } to { opacity:1; transform:scale(1); } }

  /* ── Sim bar ── */
  .sim-bar {
    background: var(--surface);
    border-bottom: 1px solid var(--border2);
    padding: 8px 12px;
    display: flex;
    align-items: center;
    gap: 6px;
    flex-wrap: wrap;
    position: sticky;
    top: 0;
    z-index: 400;
  }
  .sim-label { font-size: 10px; font-weight: 700; color: var(--dim); letter-spacing: 2px; text-transform: uppercase; flex-shrink: 0; }
  .sim-btn {
    background: var(--card);
    border: 1px solid var(--border2);
    border-radius: 6px;
    padding: 4px 10px;
    font-family: 'Outfit', sans-serif;
    font-size: 11px;
    font-weight: 600;
    color: var(--muted);
    cursor: pointer;
    transition: all 0.15s;
    white-space: nowrap;
  }
  .sim-btn:hover { color: var(--text); border-color: var(--border2); }
  .sim-btn.active { background: rgba(200,168,74,0.12); border-color: var(--gold-dim); color: var(--gold); }

  /* ── Typography ── */
  .cinzel { font-family: 'Cinzel', serif; }
  h1 { font-family: 'Cinzel', serif; font-size: 26px; font-weight: 700; line-height: 1.2; }
  h2 { font-family: 'Cinzel', serif; font-size: 20px; font-weight: 600; }
  h3 { font-family: 'Cinzel', serif; font-size: 16px; font-weight: 600; }

  /* ── Logo ── */
  .logo { text-align: center; padding: 36px 0 28px; }
  .logo-eye { font-size: 52px; display: block; margin-bottom: 10px; filter: drop-shadow(0 0 16px rgba(200,168,74,0.5)); }
  .logo-name {
    font-family: 'Cinzel', serif;
    font-size: 32px;
    font-weight: 900;
    letter-spacing: 6px;
    background: linear-gradient(135deg, var(--gold) 0%, var(--gold2) 60%, #fff8e0 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }
  .logo-tag { font-size: 11px; color: var(--muted); letter-spacing: 4px; text-transform: uppercase; margin-top: 6px; }

  /* ── Divider ── */
  .divider { display: flex; align-items: center; gap: 10px; margin: 18px 0; }
  .divider::before, .divider::after { content: ''; flex: 1; height: 1px; background: var(--border2); }
  .divider span { font-size: 10px; color: var(--dim); letter-spacing: 2px; text-transform: uppercase; }

  /* ── Buttons ── */
  .btn {
    display: flex; align-items: center; justify-content: center; gap: 8px;
    border: none; cursor: pointer; font-family: 'Outfit', sans-serif; font-weight: 600;
    border-radius: 12px; transition: all 0.18s; text-decoration: none; width: 100%;
  }
  .btn:active { transform: scale(0.97); }
  .btn:disabled { opacity: 0.4; cursor: not-allowed; transform: none; }

  .btn-gold {
    background: linear-gradient(135deg, #b8942a 0%, var(--gold) 50%, var(--gold2) 100%);
    color: #1a0f00;
    padding: 16px 24px;
    font-size: 15px;
    box-shadow: 0 4px 20px rgba(200,168,74,0.22);
  }
  .btn-gold:hover:not(:disabled) { box-shadow: 0 6px 28px rgba(200,168,74,0.38); transform: translateY(-1px); }

  .btn-outline {
    background: transparent;
    border: 1px solid var(--border2);
    color: var(--text);
    padding: 16px 24px;
    font-size: 15px;
  }
  .btn-outline:hover:not(:disabled) { border-color: var(--muted); background: var(--card); }

  .btn-ghost { background: transparent; color: var(--muted); padding: 10px; font-size: 13px; width: auto; }
  .btn-ghost:hover { color: var(--text); }

  .btn-sm { padding: 9px 16px; font-size: 13px; border-radius: 9px; width: auto; }

  .btn-yes {
    flex: 1; background: rgba(34,197,94,0.12); color: var(--success);
    border: 1px solid rgba(34,197,94,0.3); padding: 14px; border-radius: 10px; font-size: 16px; font-weight: 700;
  }
  .btn-yes:hover { background: rgba(34,197,94,0.2); }
  .btn-no {
    flex: 1; background: rgba(239,68,68,0.12); color: var(--danger);
    border: 1px solid rgba(239,68,68,0.3); padding: 14px; border-radius: 10px; font-size: 16px; font-weight: 700;
  }
  .btn-no:hover { background: rgba(239,68,68,0.2); }

  .btn-solve {
    flex: 1; background: linear-gradient(135deg, var(--violet) 0%, var(--violet2) 100%);
    color: white; padding: 14px; border-radius: 10px; font-size: 14px; font-weight: 700;
    box-shadow: 0 4px 16px rgba(109,40,217,0.28);
  }
  .btn-solve:hover { box-shadow: 0 6px 22px rgba(109,40,217,0.4); }

  /* ── Input ── */
  .field { margin-bottom: 16px; }
  .field-label { display: block; font-size: 11px; font-weight: 700; color: var(--muted); letter-spacing: 2px; text-transform: uppercase; margin-bottom: 8px; }
  .input {
    width: 100%; background: var(--card); border: 1px solid var(--border2);
    border-radius: 12px; padding: 14px 16px; color: var(--text);
    font-family: 'Outfit', sans-serif; font-size: 15px; outline: none;
    transition: border-color 0.2s, box-shadow 0.2s;
  }
  .input:focus { border-color: var(--gold-dim); box-shadow: 0 0 0 3px rgba(200,168,74,0.1); }
  .input::placeholder { color: var(--dim); }
  .input-code { text-align: center; font-family: 'Cinzel', serif; font-size: 30px; letter-spacing: 10px; color: var(--gold); text-transform: uppercase; }
  textarea.input { resize: none; min-height: 80px; line-height: 1.5; }

  /* ── Card ── */
  .card {
    background: var(--card);
    border: 1px solid var(--border);
    border-radius: 16px;
    padding: 18px;
    margin-bottom: 12px;
  }
  .card-title { font-family: 'Cinzel', serif; font-size: 12px; font-weight: 600; color: var(--gold); letter-spacing: 2px; text-transform: uppercase; margin-bottom: 14px; }

  /* ── Room Code ── */
  .code-box {
    background: var(--card2);
    border: 1px solid var(--gold-dim);
    border-radius: 16px;
    padding: 22px;
    text-align: center;
    animation: glow 3s ease-in-out infinite;
    margin: 14px 0;
  }
  .code-box-label { font-size: 10px; color: var(--dim); letter-spacing: 3px; text-transform: uppercase; margin-bottom: 8px; }
  .code-box-value { font-family: 'Cinzel', serif; font-size: 38px; font-weight: 700; color: var(--gold); letter-spacing: 10px; }
  .code-box-sub { font-size: 11px; color: var(--dim); margin-top: 8px; }

  /* ── Player Item ── */
  .player-item {
    display: flex; align-items: center; gap: 10px;
    padding: 10px 12px; border-radius: 10px;
    background: var(--card2); border: 1px solid var(--border);
    margin-bottom: 8px; transition: border-color 0.2s;
  }
  .player-item.active-turn { border-color: var(--gold-dim); background: rgba(200,168,74,0.06); }
  .player-item.eliminated { opacity: 0.45; }
  .avatar {
    width: 36px; height: 36px; border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    font-size: 12px; font-weight: 700; flex-shrink: 0;
  }
  .avatar-sm { width: 26px; height: 26px; font-size: 10px; }
  .player-name { font-size: 14px; font-weight: 500; flex: 1; }
  .badge {
    font-size: 10px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase;
    padding: 3px 9px; border-radius: 20px;
  }
  .badge-host { background: rgba(200,168,74,0.12); color: var(--gold); border: 1px solid var(--gold-dim); }
  .badge-guesser { background: rgba(109,40,217,0.15); color: var(--violet2); border: 1px solid rgba(109,40,217,0.3); }
  .badge-elim { background: rgba(239,68,68,0.1); color: var(--danger); border: 1px solid rgba(239,68,68,0.2); }
  .badge-you { font-size: 10px; color: var(--dim); margin-left: 2px; }
  .score { font-family: 'Cinzel', serif; font-size: 14px; font-weight: 700; color: var(--gold); margin-left: auto; margin-right: 6px; }

  /* ── Theme grid ── */
  .theme-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 16px; }
  .theme-tile {
    background: var(--card2); border: 1px solid var(--border2); border-radius: 14px;
    padding: 16px 12px; cursor: pointer; transition: all 0.2s; text-align: center;
  }
  .theme-tile:hover { border-color: var(--gold-dim); }
  .theme-tile.sel { border-color: var(--gold); background: rgba(200,168,74,0.08); box-shadow: 0 0 16px rgba(200,168,74,0.1); }
  .theme-icon { font-size: 26px; margin-bottom: 7px; }
  .theme-name { font-size: 12px; font-weight: 600; color: var(--text); line-height: 1.3; }
  .theme-desc { font-size: 10px; color: var(--muted); margin-top: 4px; line-height: 1.4; }

  /* ── Progress ── */
  .progress-wrap { margin-bottom: 12px; }
  .progress-row { display: flex; justify-content: space-between; font-size: 11px; color: var(--dim); margin-bottom: 6px; }
  .progress-bar { height: 3px; background: var(--border2); border-radius: 2px; overflow: hidden; }
  .progress-fill { height: 100%; background: linear-gradient(90deg, var(--gold), var(--gold2)); border-radius: 2px; transition: width 0.5s ease; }
  .progress-fill.danger { background: linear-gradient(90deg, var(--danger), #ff8888); }

  /* ── Turn banner ── */
  .turn-banner {
    background: rgba(200,168,74,0.06);
    border: 1px solid var(--gold-dim);
    border-radius: 10px;
    padding: 10px 14px;
    display: flex; align-items: center; gap: 8px;
    margin-bottom: 10px;
  }
  .turn-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--gold); animation: pulse 1.2s ease-in-out infinite; flex-shrink: 0; }
  .turn-text { font-size: 13px; color: var(--gold); font-weight: 500; }

  .turn-banner.host-mode { border-color: rgba(245,158,11,0.5); background: rgba(245,158,11,0.06); }
  .turn-banner.host-mode .turn-dot { background: var(--warn); }
  .turn-banner.host-mode .turn-text { color: var(--warn); }

  /* ── Q Feed ── */
  .q-feed { display: flex; flex-direction: column; gap: 8px; }
  .q-item { background: var(--card); border: 1px solid var(--border); border-radius: 12px; padding: 12px 14px; animation: slideUp 0.25s ease; }
  .q-meta { display: flex; align-items: center; gap: 6px; margin-bottom: 6px; }
  .q-asker { font-size: 11px; font-weight: 700; color: var(--muted); text-transform: uppercase; letter-spacing: 1px; }
  .q-num { font-size: 10px; color: var(--dim); margin-left: auto; }
  .q-text { font-size: 14px; color: var(--text); line-height: 1.5; }
  .q-ans {
    display: inline-flex; align-items: center; gap: 4px;
    font-size: 11px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase;
    margin-top: 7px; padding: 2px 10px; border-radius: 20px;
  }
  .q-yes { background: rgba(34,197,94,0.1); color: var(--success); border: 1px solid rgba(34,197,94,0.2); }
  .q-no { background: rgba(239,68,68,0.1); color: var(--danger); border: 1px solid rgba(239,68,68,0.2); }
  .q-pending { background: rgba(245,158,11,0.1); color: var(--warn); border: 1px solid rgba(245,158,11,0.2); animation: pulse 1.5s ease-in-out infinite; }

  /* ── Secret reveal ── */
  .secret-box {
    background: rgba(109,40,217,0.08);
    border: 1px dashed rgba(109,40,217,0.4);
    border-radius: 12px; padding: 14px; text-align: center; margin: 10px 0;
  }
  .secret-box-label { font-size: 10px; color: var(--dim); letter-spacing: 2px; text-transform: uppercase; margin-bottom: 4px; }
  .secret-box-value { font-family: 'Cinzel', serif; font-size: 20px; color: var(--violet2); font-weight: 700; }

  /* ── Hint box ── */
  .hint-box { background: rgba(245,158,11,0.07); border: 1px solid rgba(245,158,11,0.2); border-radius: 10px; padding: 10px 14px; margin: 10px 0; }
  .hint-text { font-size: 12px; color: var(--warn); }

  /* ── Players strip ── */
  .player-strip { display: flex; gap: 6px; overflow-x: auto; padding-bottom: 4px; margin-bottom: 10px; }
  .player-strip::-webkit-scrollbar { display: none; }
  .strip-item {
    flex-shrink: 0; display: flex; flex-direction: column; align-items: center; gap: 3px;
    padding: 8px 10px; border-radius: 10px; min-width: 58px; text-align: center;
    background: var(--card); border: 1px solid var(--border); transition: all 0.2s;
  }
  .strip-item.cur { border-color: var(--gold-dim); background: rgba(200,168,74,0.08); }
  .strip-item.elim { opacity: 0.4; }
  .strip-name { font-size: 10px; color: var(--muted); max-width: 52px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .strip-score { font-family: 'Cinzel', serif; font-size: 12px; color: var(--gold); font-weight: 700; }

  /* ── Action area ── */
  .action-area {
    position: sticky; bottom: 0;
    background: linear-gradient(to top, var(--bg) 80%, transparent);
    padding: 12px 0 4px; margin-top: 8px;
  }

  /* ── Chip ── */
  .chip {
    display: inline-flex; align-items: center; gap: 4px;
    padding: 4px 10px; border-radius: 20px; font-size: 11px; font-weight: 600;
  }
  .chip-violet { background: rgba(109,40,217,0.15); color: var(--violet2); border: 1px solid rgba(109,40,217,0.3); }
  .chip-gold { background: rgba(200,168,74,0.1); color: var(--gold); border: 1px solid var(--gold-dim); }

  /* ── Modal ── */
  .overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.75); z-index: 300; display: flex; align-items: flex-end; justify-content: center; backdrop-filter: blur(6px); animation: fadeUp 0.2s ease; }
  .modal { background: var(--surface); border: 1px solid var(--border2); border-radius: 24px 24px 0 0; padding: 24px 20px 32px; width: 100%; max-width: 430px; animation: slideUp 0.28s ease; }
  .modal-handle { width: 36px; height: 4px; background: var(--border2); border-radius: 2px; margin: 0 auto 20px; }
  .modal-title { font-family: 'Cinzel', serif; font-size: 18px; font-weight: 700; margin-bottom: 4px; }
  .modal-sub { font-size: 13px; color: var(--muted); margin-bottom: 18px; line-height: 1.5; }

  /* ── Result screen ── */
  .winner-block { text-align: center; padding: 28px 20px; background: linear-gradient(135deg, rgba(200,168,74,0.1), rgba(200,168,74,0.03)); border: 1px solid var(--gold-dim); border-radius: 20px; margin: 16px 0; }
  .winner-crown { font-size: 52px; margin-bottom: 8px; }
  .winner-label { font-size: 10px; color: var(--gold-dim); letter-spacing: 3px; text-transform: uppercase; margin-bottom: 8px; }
  .winner-name { font-family: 'Cinzel', serif; font-size: 26px; font-weight: 700; color: var(--gold); }

  /* ── Scoreboard row ── */
  .sb-row {
    display: flex; align-items: center; gap: 10px;
    padding: 12px 14px; border-radius: 10px; background: var(--card2);
    border: 1px solid var(--border); margin-bottom: 8px;
  }
  .sb-row.first { background: rgba(200,168,74,0.08); border-color: var(--gold-dim); }
  .sb-rank { font-family: 'Cinzel', serif; font-size: 18px; color: var(--dim); width: 28px; flex-shrink: 0; }
  .sb-rank.gold { color: var(--gold); }
  .sb-pts { font-family: 'Cinzel', serif; font-size: 22px; font-weight: 700; color: var(--gold); margin-left: auto; }

  /* ── Header ── */
  .screen-header { display: flex; align-items: center; justify-content: space-between; padding: 14px 0 16px; }
  .back-btn { font-size: 13px; color: var(--muted); cursor: pointer; display: flex; align-items: center; gap: 4px; transition: color 0.15s; }
  .back-btn:hover { color: var(--text); }

  /* ── Misc ── */
  .scrollable { overflow-y: auto; flex: 1; }
  .scrollable::-webkit-scrollbar { width: 3px; }
  .scrollable::-webkit-scrollbar-track { background: transparent; }
  .scrollable::-webkit-scrollbar-thumb { background: var(--border2); border-radius: 2px; }
  .mt8 { margin-top: 8px; }
  .mt16 { margin-top: 16px; }
  .mt24 { margin-top: 24px; }
  .tc { text-align: center; }
  .row { display: flex; gap: 8px; }
  .muted { color: var(--muted); font-size: 13px; }
  .empty-state { text-align: center; padding: 40px 20px; color: var(--dim); font-size: 13px; line-height: 1.7; }
  .elim-badge { font-size: 10px; color: var(--danger); }
`;

// ─── SimBar (outside main component so it never remounts on re-render) ────
function SimBar({ players, viewerId, onSwitch, onHome }) {
  return (
    <div className="sim-bar">
      <button onClick={onHome} style={{background:"transparent",border:"1px solid var(--border2)",borderRadius:6,padding:"4px 8px",color:"var(--dim)",cursor:"pointer",fontSize:13,flexShrink:0}} title="Return to Home">🏠</button>
      <span className="sim-label">View as:</span>
      {players.map((p) => (
        <button
          key={p.id}
          className={`sim-btn${viewerId === p.id ? " active" : ""}`}
          onClick={() => onSwitch(p.id)}
        >
          {p.isHost ? "👑 " : ""}{p.name.split(" ")[0]}
        </button>
      ))}
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────
export default function Enigma() {
  const [screen, setScreen] = useState("home");
  const [game, setGame] = useState(null);
  const [viewerId, setViewerId] = useState(null); // simulated current user

  // Form inputs
  const [nameInput, setNameInput] = useState("");
  const [codeInput, setCodeInput] = useState("");
  const [questionInput, setQuestionInput] = useState("");
  const [secretInput, setSecretInput] = useState("");
  const [hintInput, setHintInput] = useState("");
  const [solveInput, setSolveInput] = useState("");
  const [selectedTheme, setSelectedTheme] = useState(null);
  const [solveModalOpen, setSolveModalOpen] = useState(false);
  const [howToPlayOpen, setHowToPlayOpen] = useState(false);

  const feedRef = useRef(null);
  const lastWriteRef = useRef(0);

  // Auto-fill room code from ?join=XXXXXX in URL (QR code scans)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("join");
    if (code) {
      setCodeInput(code.toUpperCase());
      setScreen("join");
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  // Scroll feed on new questions
  useEffect(() => {
    if (feedRef.current) feedRef.current.scrollTop = feedRef.current.scrollHeight;
  }, [game?.questions?.length]);

  // Poll server every 2s to sync state across devices
  useEffect(() => {
    if (!game?.roomCode) return;
    const id = setInterval(async () => {
      if (Date.now() - lastWriteRef.current < 1500) return;
      try {
        const res = await fetch(`${API}/sessions/${game.roomCode}`);
        if (!res.ok) return;
        const updated = await res.json();
        setGame(updated);
        // Navigate all clients to correct screen based on server status
        setScreen((cur) => {
          if (updated.status === "lobby") return "lobby";
          if (updated.status === "theme_select") return "theme";
          if (updated.status === "secret_entry") return cur; // host stays on secret, others wait
          if (updated.status === "playing") return "game";
          if (updated.status === "round_end") return "result";
          return cur;
        });
      } catch {}
    }, 2000);
    return () => clearInterval(id);
  }, [game?.roomCode]);

  // Check for game over after state changes
  useEffect(() => {
    if (screen !== "game" || !game || game.status !== "playing") return;
    const activeG = game.players.filter((p) => !p.isHost && !p.isEliminated);
    const qUsed = game.questions.filter((q) => q.answer !== null).length;
    if (activeG.length === 0 || qUsed >= 20) {
      endRound(null, game); // host wins
    }
  }, [game?.players, game?.questions]);

  // ─── Derived ──
  const viewer = game?.players.find((p) => p.id === viewerId);
  const host = game?.players.find((p) => p.isHost);
  const activeGuessers = game?.players.filter((p) => !p.isHost && !p.isEliminated) || [];
  const currentQuestioner = activeGuessers.length > 0
    ? activeGuessers[game.currentQuestionerIndex % activeGuessers.length]
    : null;
  const isViewer = (id) => viewerId === id;
  const viewerIsHost = viewer?.isHost;
  const viewerIsEliminated = viewer?.isEliminated && !viewer?.isHost;
  const isMyTurn = currentQuestioner?.id === viewerId;
  const pendingQ = game?.questions.find((q) => q.answer === null);
  const answeredQs = game?.questions.filter((q) => q.answer !== null).length || 0;

  // ─── Helpers ──
  const av = (idx) => AVATAR_COLORS[idx % AVATAR_COLORS.length];

  // ─── Session API ──
  const API = `/api`;

  const syncGame = async (g) => {
    if (!g?.roomCode) return;
    lastWriteRef.current = Date.now();
    try {
      await fetch(`${API}/sessions/${g.roomCode}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(g),
      });
    } catch {}
  };

  // ─── Actions ──
  const createGame = async () => {
    if (!nameInput.trim()) return;
    try {
      const res = await fetch(`${API}/sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hostName: nameInput.trim(), avatarIdx: 0 }),
      });
      if (!res.ok) throw new Error("Failed to create session");
      const { playerId, session } = await res.json();
      setGame(session);
      setViewerId(playerId);
    } catch {
      // Fallback: create session client-side if server is unavailable
      const id = "p1";
      const p = { id, name: nameInput.trim(), score: 0, isHost: true, isEliminated: false, avatarIdx: 0 };
      const roomCode = genCode();
      setGame({ roomCode, players: [p], round: 1, theme: null, secretAnswer: "", hostHint: "", questions: [], currentQuestionerIndex: 0, status: "lobby", pendingSolve: null, roundWinnerId: undefined });
      setViewerId(id);
    }
    setNameInput("");
    setScreen("lobby");
  };

  const joinGame = async () => {
    if (codeInput.length !== 6 || !nameInput.trim()) return;
    try {
      const res = await fetch(`${API}/sessions/${codeInput}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerName: nameInput.trim(), avatarIdx: Math.floor(Math.random() * 6) }),
      });
      if (!res.ok) {
        const err = await res.json();
        alert(err.error || "Could not join session");
        return;
      }
      const { playerId, session } = await res.json();
      setGame(session);
      setViewerId(playerId);
      setNameInput("");
      setCodeInput("");
      setScreen("lobby");
    } catch {
      alert("Could not connect to session server. Make sure the server is running.");
    }
  };

  const addDemoPlayer = async (dp) => {
    if (!game) return;
    const id = `p${game.players.length + 1}`;
    const p = { id, name: dp.name, score: 0, isHost: false, isEliminated: false, avatarIdx: dp.avatarIdx };
    const newGame = { ...game, players: [...game.players, p] };
    setGame(newGame);
    await syncGame(newGame);
  };

  const startGame = async () => {
    const newGame = { ...game, status: "theme_select" };
    setGame(newGame);
    setScreen("theme");
    await syncGame(newGame);
  };

  const confirmTheme = async () => {
    if (!selectedTheme) return;
    const newGame = { ...game, theme: selectedTheme, status: "secret_entry" };
    setGame(newGame);
    setScreen("secret");
    await syncGame(newGame);
  };

  const lockSecret = async () => {
    if (!secretInput.trim()) return;
    const newGame = { ...game, secretAnswer: secretInput.trim(), hostHint: hintInput.trim(), status: "playing", questions: [], currentQuestionerIndex: 0, pendingSolve: null };
    setGame(newGame);
    setSecretInput("");
    setHintInput("");
    setScreen("game");
    await syncGame(newGame);
  };

  const submitQuestion = async () => {
    if (!questionInput.trim() || !isMyTurn || pendingQ) return;
    const q = { id: Date.now(), askerId: viewerId, askerName: viewer.name, askerAvatarIdx: viewer.avatarIdx, text: questionInput.trim(), answer: null };
    const newGame = { ...game, questions: [...game.questions, q] };
    setGame(newGame);
    setQuestionInput("");
    await syncGame(newGame);
  };

  const answerQ = async (ans) => {
    const questions = game.questions.map((q) => (q.answer === null ? { ...q, answer: ans } : q));
    const nextIdx = game.currentQuestionerIndex + 1;
    const newGame = { ...game, questions, currentQuestionerIndex: nextIdx };
    setGame(newGame);
    await syncGame(newGame);
  };

  const openSolve = () => { setSolveInput(""); setSolveModalOpen(true); };

  const submitSolve = async () => {
    if (!solveInput.trim()) return;
    setSolveModalOpen(false);
    const newGame = { ...game, pendingSolve: { playerId: viewerId, playerName: viewer.name, answer: solveInput.trim() } };
    setGame(newGame);
    setSolveInput("");
    await syncGame(newGame);
  };

  const hostVerify = async (correct) => {
    if (correct) {
      await endRound(game.pendingSolve.playerId);
    } else {
      const newGame = {
        ...game,
        players: game.players.map((p) => (p.id === game.pendingSolve.playerId ? { ...p, isEliminated: true } : p)),
        pendingSolve: null,
      };
      setGame(newGame);
      await syncGame(newGame);
    }
  };

  const endRound = async (winnerId, currentGame = game) => {
    const newGame = {
      ...currentGame,
      roundWinnerId: winnerId,
      status: "round_end",
      pendingSolve: null,
      players: currentGame.players.map((p) => {
        if (winnerId && p.id === winnerId) return { ...p, score: p.score + 10 };
        if (!winnerId && p.isHost) return { ...p, score: p.score + 5 };
        return p;
      }),
    };
    setGame(newGame);
    setScreen("result");
    await syncGame(newGame);
  };

  const nextRound = async () => {
    const currHostIdx = game.players.findIndex((p) => p.isHost);
    const newHostIdx = (currHostIdx + 1) % game.players.length;
    const players = game.players.map((p, i) => ({ ...p, isHost: i === newHostIdx, isEliminated: false }));
    const newGame = { ...game, players, round: game.round + 1, theme: null, secretAnswer: "", hostHint: "", questions: [], currentQuestionerIndex: 0, status: "theme_select", pendingSolve: null, roundWinnerId: undefined };
    setGame(newGame);
    setSelectedTheme(null);
    setScreen("theme");
    await syncGame(newGame);
  };

  const goHome = () => {
    if (game && game.status === "playing") {
      if (!window.confirm("Leave the game? All progress will be lost.")) return;
    }
    setGame(null); setViewerId(null); setScreen("home");
  };

  // ─── Render helpers ──
  const PlayerAvatar = ({ p, sm }) => {
    const c = av(p.avatarIdx);
    return (
      <div className={`avatar${sm ? " avatar-sm" : ""}`} style={{ background: c.bg, color: c.fg }}>
        {getInitials(p.name)}
      </div>
    );
  };

  // ─── Screens ──────────────────────────────────────────────────────────────

  // HOME
  if (screen === "home") return (
    <div className="app">
      <style>{CSS}</style>

      {howToPlayOpen && (
        <div className="overlay" onClick={() => setHowToPlayOpen(false)}>
          <div className="modal" style={{maxHeight:"85vh",overflowY:"auto"}} onClick={e => e.stopPropagation()}>
            <div className="modal-handle" />
            <div className="modal-title" style={{marginBottom:16}}>📖 How to Play</div>

            {/* Objective */}
            <div style={{marginBottom:18}}>
              <div style={{fontSize:11,fontWeight:700,color:"var(--gold)",letterSpacing:2,textTransform:"uppercase",marginBottom:8}}>🎯 Objective</div>
              <div style={{fontSize:13,color:"var(--muted)",lineHeight:1.8}}>
                One player is the <strong style={{color:"var(--text)"}}>Host</strong> who picks a secret. All other players are <strong style={{color:"var(--text)"}}>Guessers</strong> who must figure out the secret by asking up to <strong style={{color:"var(--gold)"}}>20 Yes/No questions</strong> between them.
              </div>
            </div>

            {/* Roles */}
            <div style={{marginBottom:18}}>
              <div style={{fontSize:11,fontWeight:700,color:"var(--gold)",letterSpacing:2,textTransform:"uppercase",marginBottom:8}}>👥 The Roles</div>
              <div style={{background:"var(--card2)",borderRadius:10,padding:"12px 14px",marginBottom:8,border:"1px solid var(--border)"}}>
                <div style={{fontSize:13,fontWeight:700,color:"var(--gold)",marginBottom:4}}>👑 The Host</div>
                <div style={{fontSize:12,color:"var(--muted)",lineHeight:1.7}}>Selects a theme, thinks of a secret that fits it, and answers every question with only <strong style={{color:"var(--success)"}}>Yes</strong> or <strong style={{color:"var(--danger)"}}>No</strong>. The Host wins the round if nobody guesses correctly.</div>
              </div>
              <div style={{background:"var(--card2)",borderRadius:10,padding:"12px 14px",border:"1px solid var(--border)"}}>
                <div style={{fontSize:13,fontWeight:700,color:"var(--violet2)",marginBottom:4}}>🕵️ The Guessers</div>
                <div style={{fontSize:12,color:"var(--muted)",lineHeight:1.7}}>Take turns asking one question at a time. All players can see every question and answer. Questions <em>must</em> be answerable with Yes or No — no open-ended questions!</div>
              </div>
            </div>

            {/* Question limit */}
            <div style={{marginBottom:18}}>
              <div style={{fontSize:11,fontWeight:700,color:"var(--gold)",letterSpacing:2,textTransform:"uppercase",marginBottom:8}}>🔢 Question Limit</div>
              <div style={{fontSize:13,color:"var(--muted)",lineHeight:1.8}}>
                There are <strong style={{color:"var(--gold)"}}>20 questions total</strong>, shared equally among all guessers. For example:
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6,marginTop:10}}>
                {[["2 players","10 each"],["3 players","7 · 7 · 6"],["4 players","5 each"],["5 players","4 each"]].map(([p,q])=>(
                  <div key={p} style={{background:"var(--card2)",borderRadius:8,padding:"8px 12px",border:"1px solid var(--border)",fontSize:12}}>
                    <span style={{color:"var(--text)",fontWeight:600}}>{p}</span>
                    <span style={{color:"var(--muted)",marginLeft:6}}>{q}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Solving */}
            <div style={{marginBottom:18}}>
              <div style={{fontSize:11,fontWeight:700,color:"var(--gold)",letterSpacing:2,textTransform:"uppercase",marginBottom:8}}>💡 Solving the Secret</div>
              <div style={{fontSize:13,color:"var(--muted)",lineHeight:1.8}}>
                Any guesser — even if it's not their turn — can tap <strong style={{color:"var(--violet2)"}}>💡 Solve</strong> at any time and type their answer. The Host then sees the guess and decides <strong style={{color:"var(--success)"}}>Correct</strong> or <strong style={{color:"var(--danger)"}}>Wrong</strong>.
              </div>
            </div>

            {/* Winning & Elimination */}
            <div style={{marginBottom:18}}>
              <div style={{fontSize:11,fontWeight:700,color:"var(--gold)",letterSpacing:2,textTransform:"uppercase",marginBottom:8}}>🏆 Winning & Elimination</div>
              <div style={{fontSize:13,color:"var(--muted)",lineHeight:1.8}}>
                • <strong style={{color:"var(--success)"}}>Correct guess</strong> → That guesser wins the round and earns <strong style={{color:"var(--gold)"}}>10 points</strong><br/>
                • <strong style={{color:"var(--danger)"}}>Wrong guess</strong> → That guesser is <strong style={{color:"var(--danger)"}}>eliminated</strong> from the round<br/>
                • <strong style={{color:"var(--warn)"}}>All 20 questions used</strong> or all guessers eliminated → <strong style={{color:"var(--gold)"}}>Host wins</strong> and earns <strong style={{color:"var(--gold)"}}>5 points</strong>
              </div>
            </div>

            {/* Rounds */}
            <div style={{marginBottom:24}}>
              <div style={{fontSize:11,fontWeight:700,color:"var(--gold)",letterSpacing:2,textTransform:"uppercase",marginBottom:8}}>🔄 Rounds</div>
              <div style={{fontSize:13,color:"var(--muted)",lineHeight:1.8}}>
                After each round the <strong style={{color:"var(--text)"}}>Host role rotates</strong> to the next player. Play as many rounds as you like — the player with the most points at the end wins!
              </div>
            </div>

            <button className="btn btn-gold" onClick={() => setHowToPlayOpen(false)}>Got it — Let's Play! ✦</button>
          </div>
        </div>
      )}

      <div className="screen">
        <div className="logo">
          <span className="logo-eye">🔍</span>
          <div className="logo-name cinzel">ENIGMA</div>
          <div className="logo-tag">Reviving the Classic Art of 20 Questions</div>
        </div>

        <button className="btn btn-gold" onClick={() => setScreen("create")}>
          ✦ &nbsp;Create New Game
        </button>
        <div className="divider"><span>or</span></div>
        <button className="btn btn-outline" onClick={() => setScreen("join")}>
          Join with a Code
        </button>

        <button className="btn btn-outline mt24" style={{borderColor:"rgba(200,168,74,0.3)",color:"var(--gold)"}} onClick={() => setHowToPlayOpen(true)}>
          📖 &nbsp;How to Play
        </button>
      </div>
    </div>
  );

  // CREATE
  if (screen === "create") return (
    <div className="app">
      <style>{CSS}</style>
      <div className="screen">
        <div className="screen-header">
          <div className="back-btn" onClick={() => setScreen("home")}>← Back</div>
        </div>
        <h2 style={{ marginBottom: 6 }}>Create Game</h2>
        <p className="muted" style={{ marginBottom: 24 }}>You'll be the first host this round.</p>
        <div className="field">
          <label className="field-label">Your Name</label>
          <input className="input" placeholder="Enter your name..." value={nameInput} onChange={(e) => setNameInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && createGame()} maxLength={20} autoFocus />
        </div>
        <button className="btn btn-gold" onClick={createGame} disabled={!nameInput.trim()}>
          Create Room →
        </button>
      </div>
    </div>
  );

  // JOIN
  if (screen === "join") return (
    <div className="app">
      <style>{CSS}</style>
      <div className="screen">
        <div className="screen-header">
          <div className="back-btn" onClick={() => setScreen("home")}>← Back</div>
        </div>
        <h2 style={{ marginBottom: 6 }}>Join Game</h2>
        <p className="muted" style={{ marginBottom: 24 }}>Get the room code from your host.</p>
        <div className="field">
          <label className="field-label">Room Code</label>
          <input className="input input-code" placeholder="XXXXXX" value={codeInput} onChange={(e) => setCodeInput(e.target.value.toUpperCase())} maxLength={6} />
        </div>
        <div className="field">
          <label className="field-label">Your Name</label>
          <input className="input" placeholder="Enter your name..." value={nameInput} onChange={(e) => setNameInput(e.target.value)} maxLength={20} />
        </div>
        <button className="btn btn-gold" onClick={joinGame} disabled={codeInput.length !== 6 || !nameInput.trim()}>
          Join →
        </button>
      </div>
    </div>
  );

  if (!game) return null;

  // Shared SimBar shorthand for game screens
  const SBar = () => <SimBar players={game.players} viewerId={viewerId} onSwitch={setViewerId} onHome={goHome} />;

  // LOBBY
  if (screen === "lobby") return (
    <div className="app">
      <style>{CSS}</style>
      <SBar />
      <div className="screen">
        <div className="screen-header">
          <span className="chip chip-gold">Lobby</span>
          <span style={{ fontSize: 12, color: "var(--dim)" }}>{game.players.length} player{game.players.length !== 1 ? "s" : ""}</span>
        </div>

        <div className="code-box">
          <div className="code-box-label">Room Code</div>
          <div className="code-box-value">{game.roomCode}</div>
          <div className="code-box-sub">Share the code or scan the QR below to join</div>
          <div style={{ marginTop: 16, display: "flex", justifyContent: "center" }}>
            <div style={{ background: "#fff", borderRadius: 12, padding: 10, display: "inline-block" }}>
              <QRCodeSVG
                value={`http://${window.location.hostname}:${window.location.port}/?join=${game.roomCode}`}
                size={140}
                bgColor="#ffffff"
                fgColor="#06060f"
                level="M"
              />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-title">Players</div>
          {game.players.map((p) => (
            <div className="player-item" key={p.id}>
              <PlayerAvatar p={p} />
              <div style={{ flex: 1 }}>
                <div className="player-name">{p.name} {isViewer(p.id) && <span className="badge-you">(You)</span>}</div>
              </div>
              <span className={`badge ${p.isHost ? "badge-host" : "badge-guesser"}`}>
                {p.isHost ? "👑 Host" : "Guesser"}
              </span>
            </div>
          ))}
        </div>

        {/* Demo: add simulated players */}
        <div className="card" style={{ borderColor: "rgba(109,40,217,0.3)" }}>
          <div className="card-title" style={{ color: "var(--violet2)" }}>⚡ Simulate Friends Joining</div>
          <p style={{ fontSize: 12, color: "var(--muted)", marginBottom: 12 }}>Tap to add demo players (simulates friends joining via code)</p>
          <div className="row" style={{ flexWrap: "wrap" }}>
            {DEMO_PLAYERS.filter((dp) => !game.players.find((p) => p.name === dp.name)).map((dp) => (
              <button key={dp.name} className="btn btn-outline btn-sm" onClick={() => addDemoPlayer(dp)}>
                + {dp.name}
              </button>
            ))}
          </div>
        </div>

        {viewerIsHost && (
          game.players.length >= 2
            ? <button className="btn btn-gold mt16" onClick={startGame}>Start Game →</button>
            : <p className="muted tc mt16">Need at least 2 players to start</p>
        )}
      </div>
    </div>
  );

  // THEME SELECT
  if (screen === "theme") return (
    <div className="app">
      <style>{CSS}</style>
      <SBar />
      <div className="screen">
        <div className="screen-header">
          <span className="chip chip-gold">Round {game.round}</span>
          <span style={{ fontSize: 12, color: "var(--muted)" }}>Host: {host?.name}</span>
        </div>

        {viewerIsHost ? (
          <>
            <h2 style={{ marginBottom: 6 }}>Choose a Theme</h2>
            <p className="muted" style={{ marginBottom: 18 }}>Your secret must fit within this category.</p>
            <div className="theme-grid">
              {THEMES.map((t) => (
                <div key={t.id} className={`theme-tile${selectedTheme?.id === t.id ? " sel" : ""}`} onClick={() => setSelectedTheme(t)}>
                  <div className="theme-icon">{t.icon}</div>
                  <div className="theme-name">{t.label}</div>
                  <div className="theme-desc">{t.desc}</div>
                </div>
              ))}
            </div>
            <button className="btn btn-gold" onClick={confirmTheme} disabled={!selectedTheme}>
              Continue →
            </button>
          </>
        ) : (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center" }}>
            <div style={{ fontSize: 60, marginBottom: 16 }}>⏳</div>
            <h2 style={{ marginBottom: 8 }}>Host is choosing...</h2>
            <p className="muted" style={{ marginBottom: 28 }}>The host is selecting a theme. Prepare your mind.</p>
            <div style={{ background: "var(--card)", border: "1px solid var(--border2)", borderRadius: 14, padding: "16px 28px" }}>
              <div style={{ fontSize: 11, color: "var(--dim)", letterSpacing: 2, marginBottom: 4 }}>HOST THIS ROUND</div>
              <div style={{ fontFamily: "Cinzel, serif", fontSize: 20, color: "var(--gold)" }}>{host?.name}</div>
            </div>
            <p style={{ fontSize: 11, color: "var(--dim)", marginTop: 20 }}>Switch to host in the bar above to proceed</p>
          </div>
        )}
      </div>
    </div>
  );

  // SECRET
  if (screen === "secret") return (
    <div className="app">
      <style>{CSS}</style>
      <SBar />
      <div className="screen">
        <div className="screen-header">
          <span className="chip chip-violet">{game.theme?.icon} {game.theme?.label}</span>
        </div>

        {viewerIsHost ? (
          <>
            <h2 style={{ marginBottom: 6 }}>Your Secret</h2>
            <p className="muted" style={{ marginBottom: 18 }}>Think of something within the theme. Guessers must unravel it.</p>
            <div className="field">
              <label className="field-label">Secret Answer</label>
              <input className="input" placeholder={`e.g. "Nikola Tesla", "The Magna Carta"...`} value={secretInput} onChange={(e) => setSecretInput(e.target.value)} autoFocus />
            </div>
            <div className="field">
              <label className="field-label">Optional Hint (visible to guessers)</label>
              <input className="input" placeholder='e.g. "A scientist from the 19th century"' value={hintInput} onChange={(e) => setHintInput(e.target.value)} />
            </div>
            <div className="hint-box">
              <span className="hint-text">🔒 Your answer is hidden until the round ends.</span>
            </div>
            <button className="btn btn-gold mt16" onClick={lockSecret} disabled={!secretInput.trim()}>
              Lock it in → Start Round
            </button>
          </>
        ) : (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center" }}>
            <div style={{ fontSize: 60, marginBottom: 16 }}>🤫</div>
            <h2 style={{ marginBottom: 8 }}>Host is writing their secret...</h2>
            <p className="muted">Stay sharp. The questioning begins soon.</p>
          </div>
        )}
      </div>
    </div>
  );

  // GAME
  if (screen === "game") {
    const qLeft = 20 - answeredQs;
    const canAsk = !viewerIsHost && !viewerIsEliminated && isMyTurn && !pendingQ;

    return (
      <div className="app">
        <style>{CSS}</style>
        <SBar />

        {/* Host verify modal — auto-shows when host sees a pending solve */}
        {game.pendingSolve && viewerIsHost && (
          <div className="overlay">
            <div className="modal">
              <div className="modal-handle" />
              <div className="modal-title">Verify Guess</div>
              <div className="modal-sub">{game.pendingSolve.playerName} thinks they cracked it!</div>
              <div style={{ background: "var(--card)", borderRadius: 12, padding: 16, textAlign: "center", marginBottom: 14 }}>
                <div style={{ fontSize: 11, color: "var(--dim)", letterSpacing: 1, marginBottom: 4 }}>THEIR GUESS</div>
                <div style={{ fontFamily: "Cinzel, serif", fontSize: 22, color: "var(--gold)" }}>{game.pendingSolve.answer}</div>
                {(() => { const hint = fuzzyMatch(game.pendingSolve.answer, game.secretAnswer);
                  return <div style={{ fontSize: 11, marginTop: 8, color: hint ? "var(--success)" : "var(--danger)", background: hint ? "rgba(34,197,94,0.08)" : "rgba(239,68,68,0.08)", borderRadius: 6, padding: "4px 10px", display: "inline-block" }}>
                    {hint ? "🤖 Looks correct" : "🤖 Looks wrong"} — but you decide!
                  </div>;
                })()}
              </div>
              <div className="secret-box" style={{ marginBottom: 16 }}>
                <div className="secret-box-label">Actual secret</div>
                <div className="secret-box-value">{game.secretAnswer}</div>
              </div>
              <div className="row">
                <button className="btn btn-no" style={{ flex: 1, borderRadius: 10, fontSize: 15, fontWeight: 700 }} onClick={() => hostVerify(false)}>✗ Wrong</button>
                <button className="btn btn-yes" style={{ flex: 1, borderRadius: 10, fontSize: 15, fontWeight: 700 }} onClick={() => hostVerify(true)}>✓ Correct!</button>
              </div>
            </div>
          </div>
        )}

        {game.pendingSolve && !viewerIsHost && (
          <div className="overlay">
            <div className="modal">
              <div className="modal-handle" />
              <div style={{ textAlign: "center", padding: "10px 0 20px" }}>
                <div style={{ fontSize: 52, marginBottom: 12 }}>⚖️</div>
                <div className="modal-title">Host is deciding...</div>
                <div className="modal-sub">{game.pendingSolve.playerName} submitted an answer — waiting for the verdict.</div>
                <div style={{ background: "var(--card)", borderRadius: 12, padding: 16, marginTop: 14 }}>
                  <div style={{ fontSize: 11, color: "var(--dim)", letterSpacing: 1, marginBottom: 6 }}>ANSWER SUBMITTED</div>
                  <div style={{ fontFamily: "Cinzel, serif", fontSize: 22, color: "var(--gold)" }}>{game.pendingSolve.answer}</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Solve modal */}
        {solveModalOpen && (
          <div className="overlay" onClick={() => setSolveModalOpen(false)}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-handle" />
              <div className="modal-title">Make Your Guess</div>
              <div className="modal-sub">Be confident — a wrong guess eliminates you from the round!</div>
              <div className="field">
                <input className="input" placeholder="Type your answer..." value={solveInput} onChange={(e) => setSolveInput(e.target.value)} autoFocus onKeyDown={(e) => e.key === "Enter" && submitSolve()} />
              </div>
              <div className="row mt8">
                <button className="btn btn-outline" style={{ flex: 1 }} onClick={() => setSolveModalOpen(false)}>Cancel</button>
                <button className="btn btn-solve" onClick={submitSolve} disabled={!solveInput.trim()}>Submit Guess</button>
              </div>
            </div>
          </div>
        )}

        <div className="screen" style={{ paddingBottom: 0 }}>
          {/* Top bar */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0 12px" }}>
            <div>
              <span className="chip chip-violet" style={{ marginBottom: 4, display: "inline-flex" }}>{game.theme?.icon} {game.theme?.label}</span>
              <div><span className="chip chip-gold">Round {game.round}</span></div>
            </div>
            {game.hostHint && (
              <div style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.25)", borderRadius: 8, padding: "6px 12px", maxWidth: 160 }}>
                <div style={{ fontSize: 10, color: "var(--warn)", letterSpacing: 1, marginBottom: 2 }}>HINT</div>
                <div style={{ fontSize: 11, color: "var(--text)" }}>{game.hostHint}</div>
              </div>
            )}
          </div>

          {/* Progress */}
          <div className="progress-wrap">
            <div className="progress-row">
              <span>Questions Remaining</span>
              <span style={{ color: qLeft <= 5 ? "var(--danger)" : "var(--dim)" }}>{qLeft} / 20</span>
            </div>
            <div className="progress-bar">
              <div className={`progress-fill${qLeft <= 5 ? " danger" : ""}`} style={{ width: `${(answeredQs / 20) * 100}%` }} />
            </div>
          </div>

          {/* Player strip */}
          <div className="player-strip">
            {game.players.map((p) => {
              const c = av(p.avatarIdx);
              const isCur = currentQuestioner?.id === p.id && !p.isHost;
              return (
                <div key={p.id} className={`strip-item${isCur ? " cur" : ""}${p.isEliminated ? " elim" : ""}`}>
                  <div className="avatar avatar-sm" style={{ background: c.bg, color: c.fg }}>{getInitials(p.name)}</div>
                  <div className="strip-name">{p.isHost ? "👑" : p.isEliminated ? "❌" : ""}{p.name.split(" ")[0]}</div>
                  <div className="strip-score">{p.score}</div>
                </div>
              );
            })}
          </div>

          {/* Turn/Host banner */}
          {pendingQ && viewerIsHost ? (
            <div className="turn-banner host-mode">
              <div className="turn-dot" />
              <div className="turn-text">A question awaits your Yes or No!</div>
            </div>
          ) : (
            <div className="turn-banner">
              <div className="turn-dot" />
              <div className="turn-text">
                {currentQuestioner
                  ? `${currentQuestioner.name}'s turn${currentQuestioner.id === viewerId ? " — that's you!" : ""}`
                  : "All guessers are out!"}
              </div>
            </div>
          )}

          {/* Host secret */}
          {viewerIsHost && (
            <div className="secret-box">
              <div className="secret-box-label">Your Secret</div>
              <div className="secret-box-value">{game.secretAnswer}</div>
            </div>
          )}

          {/* Q Feed */}
          <div className="scrollable" ref={feedRef} style={{ maxHeight: 260 }}>
            {game.questions.length === 0 ? (
              <div className="empty-state">No questions yet.<br />The first guesser will set the tone...</div>
            ) : (
              <div className="q-feed">
                {game.questions.map((q, i) => {
                  const c = av(q.askerAvatarIdx);
                  return (
                    <div className="q-item" key={q.id}>
                      <div className="q-meta">
                        <div className="avatar avatar-sm" style={{ background: c.bg, color: c.fg }}>{getInitials(q.askerName)}</div>
                        <span className="q-asker">{q.askerName}</span>
                        <span className="q-num">Q{i + 1}</span>
                      </div>
                      <div className="q-text">{q.text}</div>
                      {q.answer === null
                        ? <span className="q-ans q-pending">⏳ Awaiting answer</span>
                        : <span className={`q-ans ${q.answer === "YES" ? "q-yes" : "q-no"}`}>{q.answer === "YES" ? "✓ Yes" : "✗ No"}</span>}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Action area */}
          <div className="action-area">
            {viewerIsHost && pendingQ ? (
              <div>
                <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 8 }}>
                  Answering: <strong style={{ color: "var(--text)" }}>"{pendingQ.text}"</strong>
                </div>
                <div className="row">
                  <button className="btn-yes btn" onClick={() => answerQ("YES")}>✓ YES</button>
                  <button className="btn-no btn" onClick={() => answerQ("NO")}>✗ NO</button>
                </div>
              </div>
            ) : viewerIsEliminated ? (
              <div style={{ padding: 14, background: "rgba(239,68,68,0.07)", borderRadius: 10, border: "1px solid rgba(239,68,68,0.2)", textAlign: "center", fontSize: 13, color: "var(--danger)" }}>
                ❌ You've been eliminated — watch the others play on...
              </div>
            ) : !viewerIsHost ? (
              canAsk ? (
                <div>
                  <div className="row" style={{ marginBottom: 8 }}>
                    <input className="input" style={{ flex: 1, padding: "12px 14px", fontSize: 14 }} placeholder="Ask a yes/no question..." value={questionInput} onChange={(e) => setQuestionInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submitQuestion()} />
                    <button className="btn btn-gold" style={{ width: "auto", padding: "0 18px", borderRadius: 10, flexShrink: 0 }} onClick={submitQuestion} disabled={!questionInput.trim()}>
                      Ask
                    </button>
                  </div>
                  <button className="btn btn-solve" onClick={openSolve}>
                    💡 I Know It — Solve!
                  </button>
                </div>
              ) : (
                <div className="row">
                  <div style={{ flex: 1, padding: "12px 14px", background: "var(--card)", borderRadius: 10, fontSize: 12, color: "var(--muted)", border: "1px solid var(--border)" }}>
                    {pendingQ ? "Waiting for host to answer..." : `Waiting for ${currentQuestioner?.name || "next player"}...`}
                  </div>
                  <button className="btn btn-solve" style={{ flexShrink: 0, padding: "12px 16px" }} onClick={openSolve}>
                    💡 Solve
                  </button>
                </div>
              )
            ) : (
              <div style={{ padding: 12, textAlign: "center", fontSize: 12, color: "var(--dim)" }}>
                Host — watch and answer questions as they come in.
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // RESULT
  if (screen === "result") {
    const winner = game.players.find((p) => p.id === game.roundWinnerId);
    const hostWon = !winner;
    const sorted = [...game.players].sort((a, b) => b.score - a.score);

    return (
      <div className="app">
        <style>{CSS}</style>
        <SBar />
        <div className="screen">
          <div className="winner-block">
            <div className="winner-crown">{hostWon ? "🎩" : "🎉"}</div>
            <div className="winner-name">{hostWon ? host?.name : winner?.name}</div>
            <div className="winner-label" style={{ marginTop: 8 }}>
              {hostWon ? "defended the secret — nobody cracked it!" : "cracked the secret!"}
            </div>
          </div>

          <div className="secret-box" style={{ marginBottom: 16 }}>
            <div className="secret-box-label">The Secret Was</div>
            <div className="secret-box-value">{game.secretAnswer}</div>
            <div style={{ fontSize: 12, color: "var(--dim)", marginTop: 4 }}>{game.theme?.icon} {game.theme?.label}</div>
          </div>

          <div className="card">
            <div className="card-title">Leaderboard</div>
            {sorted.map((p, i) => {
              const c = av(p.avatarIdx);
              return (
                <div className={`sb-row${i === 0 ? " first" : ""}`} key={p.id}>
                  <div className={`sb-rank${i === 0 ? " gold" : ""}`}>{i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : i + 1}</div>
                  <div className="avatar" style={{ background: c.bg, color: c.fg, width: 32, height: 32, fontSize: 11 }}>{getInitials(p.name)}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: i === 0 ? 700 : 500 }}>{p.name}</div>
                    {p.id === game.roundWinnerId && <div style={{ fontSize: 11, color: "var(--gold)" }}>+10 pts this round</div>}
                    {!game.roundWinnerId && p.isHost && <div style={{ fontSize: 11, color: "var(--gold)" }}>+5 pts (host win)</div>}
                  </div>
                  <div className="sb-pts">{p.score}</div>
                </div>
              );
            })}
          </div>

          <div className="row mt16">
            <button className="btn btn-outline" style={{ flex: 1 }} onClick={() => setScreen("scoreboard")}>Final Scores</button>
            <button className="btn btn-gold" style={{ flex: 1 }} onClick={nextRound}>Next Round →</button>
          </div>
        </div>
      </div>
    );
  }

  // FINAL SCOREBOARD
  if (screen === "scoreboard") {
    const sorted = [...game.players].sort((a, b) => b.score - a.score);
    return (
      <div className="app">
        <style>{CSS}</style>
        <div className="screen">
          <div style={{ textAlign: "center", padding: "32px 0 20px" }}>
            <div style={{ fontSize: 60, marginBottom: 10 }}>🏆</div>
            <div style={{ fontFamily: "Cinzel, serif", fontSize: 30, fontWeight: 700, color: "var(--gold)" }}>Final Standings</div>
          </div>
          <div className="card">
            {sorted.map((p, i) => {
              const c = av(p.avatarIdx);
              return (
                <div className={`sb-row${i === 0 ? " first" : ""}`} key={p.id}>
                  <div className={`sb-rank${i === 0 ? " gold" : ""}`} style={{ fontSize: i === 0 ? 22 : 18 }}>{i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : i + 1}</div>
                  <div className="avatar" style={{ background: c.bg, color: c.fg }}>{getInitials(p.name)}</div>
                  <div style={{ flex: 1, fontSize: 15, fontWeight: i === 0 ? 700 : 500 }}>{p.name}</div>
                  <div className="sb-pts" style={{ fontSize: i === 0 ? 24 : 20 }}>{p.score}</div>
                </div>
              );
            })}
          </div>
          <button className="btn btn-gold mt16" onClick={goHome}>Play Again</button>
        </div>
      </div>
    );
  }

  return null;
}
