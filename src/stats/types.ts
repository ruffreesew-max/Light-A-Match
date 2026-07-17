export type RunOutcome = 'victoria' | 'strike_out' | 'restart';

export interface RunPayload {
  action: 'submit_run';
  playerName: string;
  playerId: string;
  outcome: RunOutcome;
  bestLevel: number;
  strikes: number;
  levelsCleared: number;
  matches: number;
  durationSec: number;
}

export interface LeaderboardEntry {
  rank: number;
  playerName: string;
  bestLevel: number;
  durationSec: number;
  strikes: number;
  playerId: string;
}

export interface LeaderboardResponse {
  ok: boolean;
  entries?: LeaderboardEntry[];
  leaderboard?: LeaderboardEntry[];
  error?: string;
}
