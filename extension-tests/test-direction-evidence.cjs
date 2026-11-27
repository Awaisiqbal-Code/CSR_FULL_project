'use strict';
// Direction (sender/receiver) resolver used by the collector for every synced
// message. The main collector (v752) and the modern builder both route through
// __csrDirectionEvidence, falling back to the raw message-out class only when it
// returns null. This test exercises the evidence cascade with mock rows.
const fs = require('fs'), path = require('path'), vm = require('vm'), assert = require('node:assert/strict');
const src = fs.readFileSync(path.join(__dirname, '..', 'extension', 'content.js'), 'utf8');
const start = src.indexOf('  function __csrTrustedMessageId(');
const end = src.indexOf('  function __lovStampMs(', start);
assert(start > 0 && end > start, 'direction resolver region found');

const ctx = {
  // Stub the id finder (defined elsewhere) to read the row's data-id directly.
  __wceFindDataId: el => (el && el.getAttribute ? el.getAttribute('data-id') || '' : ''),
  document: { querySelector: () => null },   // no geometry in the test DOM
};
vm.createContext(ctx);
vm.runInContext(src.slice(start, end) + '\nthis.dir = __csrDirectionEvidence;', ctx);

function row(opts = {}) {
  const icons = opts.icons || [], aria = opts.aria || [], cls = opts.cls || null, dataId = opts.dataId || null;
  const self = {
    id: '', parentElement: null,
    classList: { contains: c => cls === c },
    getAttribute: k => (k === 'data-id' ? dataId : null),
    querySelector: q => {
      if (q.includes('data-icon')) return icons.some(ic => q.includes('"' + ic + '"')) ? {} : null;
      if (q.includes('message-out')) return cls === 'message-out' ? {} : null;
      if (q.includes('message-in')) return cls === 'message-in' ? {} : null;
      return null;
    },
    querySelectorAll: q => {
      if (q.includes('aria-label')) return aria.map(a => ({ getAttribute: () => a }));
      return [];
    },
    closest: () => null,
  };
  return self;
}
const dir = r => ctx.dir(r);

// Authoritative WhatsApp id prefix wins outright.
assert.equal(dir(row({ dataId: 'true_923001234567@c.us_ABC123' })).fromMe, true, 'true_ id => outgoing');
assert.equal(dir(row({ dataId: 'false_923001234567@c.us_ABC123' })).fromMe, false, 'false_ id => incoming');
// Directional tail icons.
assert.equal(dir(row({ icons: ['tail-out'] })).fromMe, true, 'tail-out => outgoing');
assert.equal(dir(row({ icons: ['tail-in'] })).fromMe, false, 'tail-in => incoming');
// Delivery/read ticks render only on outgoing — the grouped-reply swap fix.
assert.equal(dir(row({ icons: ['msg-dblcheck'] })).fromMe, true, 'status tick => outgoing');
assert.equal(dir(row({ icons: ['msg-time'] })).fromMe, true, 'pending clock tick => outgoing');
// Semantic sender aria-label.
assert.equal(dir(row({ aria: ['You:'] })).fromMe, true, 'aria "You:" => outgoing');
assert.equal(dir(row({ aria: ['Ali Raza:'] })).fromMe, false, 'aria "<name>:" => incoming');
// Wrapper class fallback.
assert.equal(dir(row({ cls: 'message-out' })).fromMe, true, 'message-out wrapper => outgoing');
assert.equal(dir(row({ cls: 'message-in' })).fromMe, false, 'message-in wrapper => incoming');
// No evidence at all => null (three-state), so callers fall back to the raw class
// instead of silently defaulting a real outgoing message to incoming.
assert.equal(dir(row({})).fromMe, null, 'no evidence => unknown (not a forced incoming)');

// The active row builder must consult the resolver and fall back to the raw class
// only when evidence is unknown (not silently default a real outgoing to incoming).
assert(/var direction = __csrDirectionEvidence\(row\);/.test(src), 'row builder uses the evidence resolver');
assert(/direction\.fromMe === null \? row\.classList\.contains\("message-out"\) : direction\.fromMe/.test(src), 'unknown evidence falls back to the raw class, not forced-incoming');
console.log('PASS direction evidence: id/tail/tick/aria/class cascade + unknown is three-state');
