'use strict';
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert/strict');
const src=fs.readFileSync(path.join(__dirname,'../extension/content.js'),'utf8');
const a=src.indexOf('  var __LOV_CALL_ICON__ ='),b=src.indexOf('  function __lovCallInfo(',a);
assert(a>0&&b>a);
const ctx={};
vm.runInNewContext(src.slice(a,b)+'\nthis.isCall=__lovIsCallRow;',ctx);
function row(text,{bubble=true,icon=false,multiple=false}={}){
 return {innerText:text,
   matches:(q)=>bubble && q.includes('message-in'),
   querySelectorAll:()=>multiple?[{},{}]:[{}],
   querySelector:(q)=>icon&&q.includes('call-incoming')?{}:null
 };
}
assert.equal(ctx.isCall(row('Missed voice call')),true,'true call event');
assert.equal(ctx.isCall(row('Outgoing video call')),true,'outgoing call event');
assert.equal(ctx.isCall(row('Call me tomorrow')),false,'normal chat cannot become call');
assert.equal(ctx.isCall(row('Call',{bubble:false,icon:true})),false,'header call icon never counts');
assert.equal(ctx.isCall(row('Missed group call',{multiple:true})),false,'multiple-message ancestor never counts');
assert.equal(ctx.isCall(row('Missed group call',{bubble:true})),true,'real missed group call can count');
assert(src.includes("if (sourceId && sourceId.length <= 200) msg.sourceMessageId = sourceId"),'ID carried for text as well as voice');
assert(src.includes("if (!node || seenNodes.has(node)) continue;"),'DOM duplicates ignored');
console.log('PASS v4.5 call evidence, group header exclusion, stable sender IDs, nested row dedup');
