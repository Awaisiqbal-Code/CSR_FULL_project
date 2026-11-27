'use strict';
const fs=require('node:fs'), path=require('node:path'), vm=require('node:vm'), assert=require('node:assert/strict');
const src=fs.readFileSync(path.join(__dirname,'..','extension','content.js'),'utf8');
// Names track the de-obfuscated (readable) content.js: the row-collector _0x385460
// -> v685, boundary _0x9406c2 -> v825, root-getter _0x1a0052 -> v709. Behavior is
// unchanged (webcrack output + a proven 1:1 identifier rename).
const start=src.indexOf('  function v685() {'),end=src.indexOf('  function v825(',start);
assert(start>0&&end>start);
const root={id:'root',classList:{contains:()=>false}};
function n(id,kind,parent=root){
 return {id:'',parentElement:parent,kind,storedId:id,
   classList:{contains:v=>v===kind},
   getAttribute(k){return k==='data-id'?this.storedId:null},
   closest(query){
     if(query.includes('message-in')&&this.kind==='message-in') return this;
     if(query.includes('message-out')&&this.kind==='message-out') return this;
     if(query.includes('conv-msg')&&this.kind==='conv-msg') return this;
     let p=this.parentElement;
     while(p && p!==root){if(p.kind==='message-in'||p.kind==='message-out'||p.kind==='conv-msg')return p;p=p.parentElement;}
     return null;
   },
 };
}
const oldText=n('false_123456789','message-in');
const oldTextChild=n('', 'msg-container',oldText);
const newVoice=n('true_987654321','msg-container');
const secondVoice=n('false_876543210','msg-container');
root.querySelectorAll=()=>[oldText,oldTextChild,newVoice,secondVoice];
const ctx={v709:()=>root,__csrTrustedMessageId:r=>r.storedId||'',__wceFindDataId:r=>r.storedId||''};
vm.createContext(ctx);vm.runInContext(src.slice(start,end)+'\nthis.getRows=v685;',ctx);
const rows=ctx.getRows();
assert.equal(rows.length,3,'mixed old text plus newer voice-only wrappers all collected, nested duplicate ignored');
assert.equal(rows[0],oldText); assert.equal(rows[1],newVoice); assert.equal(rows[2],secondVoice);
const startVoice=src.indexOf('  function __csrIsVoiceBubble(row) {');
const endVoice=src.indexOf('  var __csrMediaBeforeVoicePatch',startVoice);
const context={};vm.createContext(context);
vm.runInContext(src.slice(startVoice,endVoice)+'\nthis.isVoice=__csrIsVoiceBubble;',context);
const voiceRow={querySelector(s){return s.includes('[data-testid*="audio-msg"]')?{}:null}};
assert.equal(context.isVoice(voiceRow),true,'new audio-msg marker detected');
assert.equal(context.isVoice({querySelector(){return null}}),false,'ordinary text/image bubble not mistaken for audio');
console.log('PASS mixed-wrapper voice capture and non-voice exclusion');
