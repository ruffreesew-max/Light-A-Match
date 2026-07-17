import { isSheetsConfigured } from '../stats/config';
import { getPlayerName, setPlayerName } from '../stats/player';
import { fetchLeaderboard } from '../stats/sheetsClient';
import type { LeaderboardEntry } from '../stats/types';
import { toRoman } from './romanNumerals';

function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

/**
 * Lightweight DOM overlay for player name + leaderboard.
 * Hidden until Sheets is configured (URL set).
 */
export class StatsPanel {
  private root: HTMLElement;
  private nameInput: HTMLInputElement;
  private statusEl: HTMLElement;
  private listEl: HTMLElement;
  private boardSection: HTMLElement;

  constructor(host: HTMLElement) {
    this.root = document.createElement('div');
    this.root.id = 'stats-panel';
    this.root.innerHTML = `
      <div class="stats-card">
        <h2>Legion Standings</h2>
        <label class="stats-label" for="player-name">Commander name</label>
        <div class="stats-row">
          <input id="player-name" type="text" maxlength="24" placeholder="Anonymous" autocomplete="nickname" />
          <button type="button" id="stats-save-name">Save</button>
        </div>
        <p class="stats-hint" id="stats-status"></p>
        <div id="stats-board-section">
          <div class="stats-row stats-row-spread">
            <h3>Leaderboard</h3>
            <button type="button" id="stats-refresh">Refresh</button>
          </div>
          <ol id="stats-list" class="stats-list"></ol>
        </div>
        <button type="button" id="stats-close" class="stats-close">Close</button>
      </div>
    `;

    host.appendChild(this.root);

    this.nameInput = this.root.querySelector('#player-name') as HTMLInputElement;
    this.statusEl = this.root.querySelector('#stats-status') as HTMLElement;
    this.listEl = this.root.querySelector('#stats-list') as HTMLElement;
    this.boardSection = this.root.querySelector(
      '#stats-board-section'
    ) as HTMLElement;

    this.nameInput.value = getPlayerName();

    this.root.querySelector('#stats-save-name')!.addEventListener('click', () => {
      setPlayerName(this.nameInput.value);
      this.nameInput.value = getPlayerName();
      this.setStatus('Name saved for the next submitted run.');
    });

    this.root.querySelector('#stats-refresh')!.addEventListener('click', () => {
      void this.refreshLeaderboard();
    });

    this.root.querySelector('#stats-close')!.addEventListener('click', () => {
      this.hide();
    });

    this.root.addEventListener('click', (e) => {
      if (e.target === this.root) this.hide();
    });

    this.hide();
    this.syncConfiguredState();
  }

  syncConfiguredState(): void {
    const ready = isSheetsConfigured();
    this.boardSection.style.display = ready ? '' : 'none';
    if (!ready) {
      this.setStatus(
        'Sheets not connected yet. After you deploy the Apps Script, set the URL (see scripts/google-sheets/Code.gs).'
      );
    } else {
      this.setStatus('Connected. Runs submit when a run ends (Victoria or 3 strikes).');
    }
  }

  show(): void {
    this.syncConfiguredState();
    this.nameInput.value = getPlayerName();
    this.root.classList.add('is-open');
    if (isSheetsConfigured()) void this.refreshLeaderboard();
  }

  hide(): void {
    this.root.classList.remove('is-open');
  }

  isOpen(): boolean {
    return this.root.classList.contains('is-open');
  }

  setStatus(message: string): void {
    this.statusEl.textContent = message;
  }

  renderEntries(entries: LeaderboardEntry[]): void {
    if (!entries.length) {
      this.listEl.innerHTML = '<li class="stats-empty">No runs recorded yet.</li>';
      return;
    }

    this.listEl.innerHTML = entries
      .map((e) => {
        const name = escapeHtml(e.playerName || 'Anonymous');
        return `<li><span class="stats-rank">${e.rank}.</span> <strong>${name}</strong> — Level ${toRoman(e.bestLevel)} · ${formatDuration(e.durationSec)} · ${e.strikes} strikes</li>`;
      })
      .join('');
  }

  async refreshLeaderboard(): Promise<void> {
    if (!isSheetsConfigured()) return;
    this.setStatus('Loading leaderboard…');
    try {
      const entries = await fetchLeaderboard();
      this.renderEntries(entries);
      this.setStatus(`Updated · ${entries.length} commanders`);
    } catch (err) {
      console.error(err);
      this.setStatus('Could not load leaderboard. Check the Apps Script URL / deployment.');
    }
  }
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
