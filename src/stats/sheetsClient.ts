import { getSheetsWebAppUrl, isSheetsConfigured } from './config';
import type { LeaderboardEntry, LeaderboardResponse, RunPayload } from './types';

/**
 * Google Apps Script web apps often redirect; a no-cors POST still writes the
 * row but cannot read the JSON response. We POST with cors when possible and
 * fall back to a fire-and-forget submit, then refresh the board via GET.
 */
export async function fetchLeaderboard(): Promise<LeaderboardEntry[]> {
  if (!isSheetsConfigured()) return [];

  const url = `${getSheetsWebAppUrl()}?action=leaderboard`;
  const res = await fetch(url, { method: 'GET' });
  if (!res.ok) throw new Error(`Leaderboard HTTP ${res.status}`);
  const data = (await res.json()) as LeaderboardResponse;
  if (!data.ok) throw new Error(data.error || 'Leaderboard request failed');
  return data.entries || [];
}

export async function submitRun(
  payload: Omit<RunPayload, 'action'>
): Promise<LeaderboardEntry[]> {
  if (!isSheetsConfigured()) return [];

  const body: RunPayload = { action: 'submit_run', ...payload };
  const endpoint = getSheetsWebAppUrl();

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      // text/plain avoids a CORS preflight against Apps Script.
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(body),
      redirect: 'follow',
    });
    if (res.ok) {
      const data = (await res.json()) as LeaderboardResponse;
      if (data.ok && data.leaderboard) return data.leaderboard;
    }
  } catch {
    // Fall through to GET refresh after a best-effort write.
  }

  // Best-effort write when CORS/redirect blocks reading the POST body.
  try {
    await fetch(endpoint, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(body),
    });
  } catch {
    // ignore
  }

  // Give Apps Script a moment to commit, then read the board.
  await new Promise((r) => setTimeout(r, 700));
  return fetchLeaderboard();
}
