'use strict';
// Voice/media bubbles have no data-pre-plain-text date text. __wceResolve must not
// leave them date-less: it falls back to the collector's divider-derived tsMs
// (marked 'inferred', which the backend accepts), and back/forward-fills the rest.
// This is what stops voice-only chats showing "Date unavailable" and sorting wrong.
const fs = require('fs'), path = require('path'), vm = require('vm'), assert = require('node:assert/strict');
const src = fs.readFileSync(path.join(__dirname, '..', 'extension', 'content.js'), 'utf8');
const start = src.indexOf('  function __wceResolve(');
const end = src.indexOf('\n  function ', start + 1);
assert(start > 0 && end > start, '__wceResolve region found');

const map = new WeakMap();
const ctx = {
  __wceTsMap: map,
  __wceDetectFmt: () => 'DMY',
  __wceRelative: () => null,   // simulate unparseable text timestamps (voice/media)
  __wceTriple: () => null,
  __wceMake: () => null,
  v459: () => null,            // no time-of-day in the text
};
vm.createContext(ctx);
vm.runInContext(src.slice(start, end) + '\nthis.resolve = __wceResolve;', ctx);

// A voice-only chat: no parseable text dates, but the collector set tsMs from the
// day divider on the first voice note; the second has neither.
const DAY = Date.UTC(2026, 10, 25);           // divider day
const v1 = { timestamp: '', media: 'voice', tsMs: DAY + 21 * 3600000 };  // 21:00 that day
const v2 = { timestamp: '', media: 'voice', tsMs: null };
ctx.resolve([v1, v2], 'DMY');

const e1 = map.get(v1), e2 = map.get(v2);
assert.equal(e1.ts, DAY + 21 * 3600000, 'voice note inherits the divider-derived day');
assert.equal(e1.inferred, true, 'divider-derived date is marked inferred (backend-accepted)');
assert.equal(e1.exact, false, 'not an exact source date');
// v2 has no tsMs, but forward-fill gives it the previous dated message's time.
assert.equal(e2.ts, e1.ts, 'remaining date-less voice inherits a neighbour (not null)');
assert.equal(e2.inferred, true, 'neighbour fill is inferred');

// A truly empty chat (no tsMs anywhere) still yields null, never a fabricated date.
const map2 = new WeakMap(); ctx.__wceTsMap = map2;
const n1 = { timestamp: '', tsMs: null };
ctx.resolve([n1], 'DMY');
assert.equal(map2.get(n1).ts, null, 'no date evidence => null, never invented');

assert(/Use it \(inferred\) so voice-only/.test(src), 'tsMs fallback present in source');
console.log('PASS voice/media date fallback: divider tsMs + neighbour fill, no invented dates');
