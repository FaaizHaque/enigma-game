// ─── Code Generation ─────────────────────────────────────────────────────────
export const genCode = () => {
  const c = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no I/O/L/0/1 to avoid confusion
  return Array.from({ length: 6 }, () => c[Math.floor(Math.random() * c.length)]).join('');
};

// ─── Initials ─────────────────────────────────────────────────────────────────
export const getInitials = (name) =>
  name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2);

// ─── Answer Matching ──────────────────────────────────────────────────────────
export const normalize = (s) =>
  s.toLowerCase().trim().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ');

export const fuzzyMatch = (guess, answer) => {
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
      dp[i][j] = g[i - 1] === a[j - 1] ? dp[i - 1][j - 1] : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
  return dp[m][n] <= Math.max(2, Math.floor(a.length * 0.25));
};
