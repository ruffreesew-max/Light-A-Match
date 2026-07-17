/**
 * Light-A-Match — free Google Sheets backend (Apps Script)
 *
 * SHEET LAYOUT (create one spreadsheet, then two tabs with these exact names)
 * ---------------------------------------------------------------------------
 * Tab "Runs" (append-only log of finished runs)
 *   A timestamp | B player_name | C player_id | D outcome
 *   E best_level | F strikes | G levels_cleared | H matches | I duration_sec
 *
 * Tab "Leaderboard" (auto-maintained top scores; do not edit by hand)
 *   A rank | B player_name | C best_level | D duration_sec | E strikes
 *   F player_id | G updated_at
 *
 * SETUP
 * ---------------------------------------------------------------------------
 * 1. Create a Google Sheet. Rename the first tab to "Runs".
 *    Put this header row in row 1 of Runs:
 *      timestamp,player_name,player_id,outcome,best_level,strikes,levels_cleared,matches,duration_sec
 * 2. Add a second tab named "Leaderboard" with header row:
 *      rank,player_name,best_level,duration_sec,strikes,player_id,updated_at
 * 3. Extensions → Apps Script. Paste this entire file. Save.
 * 4. Deploy → New deployment → Type: Web app
 *      Execute as: Me
 *      Who has access: Anyone
 * 5. Copy the Web app URL.
 * 6. In the game project, set it in `.env` as:
 *      VITE_SHEETS_WEB_APP_URL=https://script.google.com/macros/s/..../exec
 *    Or in the browser console once:
 *      localStorage.setItem('lam-sheets-url', 'https://script.google.com/macros/s/..../exec')
 * 7. Rebuild / refresh the game. Submit a run, then check the Runs tab.
 */

var RUNS_SHEET = 'Runs';
var BOARD_SHEET = 'Leaderboard';
var MAX_BOARD = 25;

function doGet(e) {
  var action = (e && e.parameter && e.parameter.action) || 'leaderboard';
  try {
    if (action === 'leaderboard') {
      return json_({ ok: true, entries: readLeaderboard_() });
    }
    return json_({ ok: false, error: 'unknown_action' });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  }
}

function doPost(e) {
  try {
    var body = {};
    if (e && e.postData && e.postData.contents) {
      body = JSON.parse(e.postData.contents);
    }
    var action = body.action || 'submit_run';
    if (action === 'submit_run') {
      var row = normalizeRun_(body);
      appendRun_(row);
      upsertLeaderboard_(row);
      return json_({ ok: true, leaderboard: readLeaderboard_() });
    }
    return json_({ ok: false, error: 'unknown_action' });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  }
}

function normalizeRun_(body) {
  var name = String(body.playerName || 'Anonymous').trim().slice(0, 24);
  if (!name) name = 'Anonymous';
  return {
    timestamp: new Date().toISOString(),
    playerName: name,
    playerId: String(body.playerId || '').slice(0, 64),
    outcome: String(body.outcome || 'unknown').slice(0, 32),
    bestLevel: clampInt_(body.bestLevel, 1, 30),
    strikes: clampInt_(body.strikes, 0, 3),
    levelsCleared: clampInt_(body.levelsCleared, 0, 30),
    matches: clampInt_(body.matches, 0, 100000),
    durationSec: Math.max(0, Math.round(Number(body.durationSec) || 0)),
  };
}

function appendRun_(row) {
  var sheet = getOrCreateSheet_(RUNS_SHEET, [
    'timestamp',
    'player_name',
    'player_id',
    'outcome',
    'best_level',
    'strikes',
    'levels_cleared',
    'matches',
    'duration_sec',
  ]);
  sheet.appendRow([
    row.timestamp,
    row.playerName,
    row.playerId,
    row.outcome,
    row.bestLevel,
    row.strikes,
    row.levelsCleared,
    row.matches,
    row.durationSec,
  ]);
}

/**
 * Leaderboard rule (best score first):
 * 1) Higher best_level wins
 * 2) If tied, lower duration_sec wins
 * 3) If still tied, fewer strikes wins
 * One row per player_id (latest personal best kept).
 */
function upsertLeaderboard_(row) {
  var sheet = getOrCreateSheet_(BOARD_SHEET, [
    'rank',
    'player_name',
    'best_level',
    'duration_sec',
    'strikes',
    'player_id',
    'updated_at',
  ]);

  var data = sheet.getDataRange().getValues();
  var entries = [];
  for (var i = 1; i < data.length; i++) {
    var r = data[i];
    if (!r[5] && !r[1]) continue;
    entries.push({
      playerName: String(r[1] || 'Anonymous'),
      bestLevel: Number(r[2]) || 1,
      durationSec: Number(r[3]) || 0,
      strikes: Number(r[4]) || 0,
      playerId: String(r[5] || ''),
      updatedAt: String(r[6] || ''),
    });
  }

  var idx = -1;
  for (var j = 0; j < entries.length; j++) {
    if (row.playerId && entries[j].playerId === row.playerId) {
      idx = j;
      break;
    }
  }

  var candidate = {
    playerName: row.playerName,
    bestLevel: row.bestLevel,
    durationSec: row.durationSec,
    strikes: row.strikes,
    playerId: row.playerId,
    updatedAt: row.timestamp,
  };

  if (idx === -1) {
    entries.push(candidate);
  } else if (isBetter_(candidate, entries[idx])) {
    entries[idx] = candidate;
  } else {
    // Keep existing PB; still refresh name if they renamed.
    entries[idx].playerName = row.playerName;
  }

  entries.sort(compareEntries_);
  if (entries.length > MAX_BOARD) entries = entries.slice(0, MAX_BOARD);

  sheet.clearContents();
  sheet.appendRow([
    'rank',
    'player_name',
    'best_level',
    'duration_sec',
    'strikes',
    'player_id',
    'updated_at',
  ]);
  for (var k = 0; k < entries.length; k++) {
    var e = entries[k];
    sheet.appendRow([
      k + 1,
      e.playerName,
      e.bestLevel,
      e.durationSec,
      e.strikes,
      e.playerId,
      e.updatedAt,
    ]);
  }
}

function readLeaderboard_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(BOARD_SHEET);
  if (!sheet) return [];
  var data = sheet.getDataRange().getValues();
  var out = [];
  for (var i = 1; i < data.length; i++) {
    var r = data[i];
    if (!r[1] && !r[5]) continue;
    out.push({
      rank: Number(r[0]) || i,
      playerName: String(r[1] || 'Anonymous'),
      bestLevel: Number(r[2]) || 1,
      durationSec: Number(r[3]) || 0,
      strikes: Number(r[4]) || 0,
      playerId: String(r[5] || ''),
    });
  }
  return out;
}

function isBetter_(a, b) {
  if (a.bestLevel !== b.bestLevel) return a.bestLevel > b.bestLevel;
  if (a.durationSec !== b.durationSec) return a.durationSec < b.durationSec;
  return a.strikes < b.strikes;
}

function compareEntries_(a, b) {
  if (a.bestLevel !== b.bestLevel) return b.bestLevel - a.bestLevel;
  if (a.durationSec !== b.durationSec) return a.durationSec - b.durationSec;
  return a.strikes - b.strikes;
}

function getOrCreateSheet_(name, headers) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    sheet.appendRow(headers);
  } else if (sheet.getLastRow() === 0) {
    sheet.appendRow(headers);
  }
  return sheet;
}

function clampInt_(value, min, max) {
  var n = Math.round(Number(value));
  if (isNaN(n)) n = min;
  return Math.max(min, Math.min(max, n));
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(
    ContentService.MimeType.JSON
  );
}
