'use strict';
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert/strict');
const src=fs.readFileSync(path.join(__dirname,'../extension/content.js'),'utf8');
const a=src.indexOf('  var __LOV_CALL_ICON__ ='), b=src.indexOf('  function __lovCallInfo(',a);
const ctx={};vm.runInNewContext(src.slice(a,b)+'\nthis.isCall=__lovIsCallRow;',ctx);
function row(t,{bubble=true,callMarker=false,multiple=false}={}) {
 return {innerText:t,matches:s=>bubble&&s.includes('message-in')||callMarker&&s.includes('call-event'),querySelectorAll:()=>multiple?[{},{}]:[{}],querySelector:s=>callMarker&&s.includes('call-event')?{}:null};
}
assert.equal(ctx.isCall(row('Missed voice call 15:04')),true);
assert.equal(ctx.isCall(row('You missed a voice call 15:04')),true);
assert.equal(ctx.isCall(row('Outgoing video call 15:04')),true);
assert.equal(ctx.isCall(row('Call me tomorrow', {callMarker:true})),false);
assert.equal(ctx.isCall(row('Call', {bubble:false})),false);
assert.equal(ctx.isCall(row('Missed voice call', {bubble:false,callMarker:true})),true);
assert.equal(ctx.isCall(row('Missed group call',{multiple:true})),false);
console.log('PASS conservative call-event variants and header/group exclusions');
