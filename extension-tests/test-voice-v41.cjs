'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const src=fs.readFileSync(path.join(__dirname,'..','extension','content.js'),'utf8');
const start=src.indexOf('  function __csrIsVoiceBubble(row) {');
const end=src.indexOf('  var __csrMediaBeforeVoicePatch',start);
assert(start>0&&end>start,'Voice detector exists');
const code=src.slice(start,end)+'\n__csrIsVoiceBubble';
const detector=vm.runInNewContext(code,{});
function row(attributes=[],text='0:06'){
 return {innerText:text, querySelector(selector){return attributes.some(attr=>selector.split(/,\s*/).some(sub=>sub.includes(attr)))?{}:null;}};
}
assert.equal(detector(row(['[data-icon="ptt-play"'])),true,'compact PTT voice icon is detected');
assert.equal(detector(row(['[data-testid="audio-player"'])),true,'audio player is detected');
assert.equal(detector(row(['[data-testid*="voice-note"'])),true,'voice note marker is detected');
assert.equal(detector(row(['[class*="waveform"','button'])),true,'waveform and button and duration are detected');
assert.equal(detector(row(['[class*="waveform"','button'],'10:06 pm')),true,'clock-like text is only a weak hint when waveform is present');
assert.equal(detector(row(['img'])),false,'image does not become voice');
assert.equal(detector(row(['[class*="waveform"'],'0:06')),false,'waveform without player does not become voice');
assert(src.indexOf('if (__csrIsVoiceBubble(row)) return \'voice\';')<src.indexOf('  function __lovDividerMidnight('),'Voice detector precedes row parsing');
assert(src.includes("div[data-testid^='conv-msg-']"),'nested conv-msg wrappers included');
console.log('PASS current PTT selectors, waveform fallback, image exclusion, row inclusion');
