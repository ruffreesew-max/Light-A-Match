import { PLAYER_ID_KEY, PLAYER_NAME_KEY } from './config';

function randomId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `lam-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function getPlayerId(): string {
  try {
    const existing = localStorage.getItem(PLAYER_ID_KEY);
    if (existing) return existing;
    const id = randomId();
    localStorage.setItem(PLAYER_ID_KEY, id);
    return id;
  } catch {
    return randomId();
  }
}

export function getPlayerName(): string {
  try {
    return localStorage.getItem(PLAYER_NAME_KEY) || '';
  } catch {
    return '';
  }
}

export function setPlayerName(name: string): void {
  const cleaned = name.trim().slice(0, 24);
  try {
    if (cleaned) localStorage.setItem(PLAYER_NAME_KEY, cleaned);
    else localStorage.removeItem(PLAYER_NAME_KEY);
  } catch {
    // ignore
  }
}
