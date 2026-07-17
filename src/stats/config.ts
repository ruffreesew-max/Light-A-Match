/** Default Apps Script Web App URL. Override with VITE_SHEETS_WEB_APP_URL or localStorage. */
export const SHEETS_WEB_APP_URL =
  (typeof import.meta !== 'undefined' &&
    import.meta.env &&
    String(import.meta.env.VITE_SHEETS_WEB_APP_URL || '').trim()) ||
  'https://script.google.com/macros/s/AKfycbzQfbm-KLvHTUXhHTie6UakNHIC9LGweFYoVTg25I__UfnWhRPsG6zYLVcdjGeqn1H3/exec';

export const SHEETS_URL_STORAGE_KEY = 'lam-sheets-url';
export const PLAYER_NAME_KEY = 'lam-player-name';
export const PLAYER_ID_KEY = 'lam-player-id';

export function getSheetsWebAppUrl(): string {
  try {
    const stored = localStorage.getItem(SHEETS_URL_STORAGE_KEY);
    if (stored && stored.trim()) return stored.trim();
  } catch {
    // ignore
  }
  return SHEETS_WEB_APP_URL;
}

export function isSheetsConfigured(): boolean {
  return getSheetsWebAppUrl().length > 0;
}
