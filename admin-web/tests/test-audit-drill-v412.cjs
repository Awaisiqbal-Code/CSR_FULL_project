'use strict';
// v4.12: audit report cards/boxes/tiers/evidence are clickable and drill down to
// ONLY their matching conversations. Pure mock DOM: no backend, WhatsApp or DB.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const script=fs.readFileSync(path.join(root,'admin.js'),'utf8');
const styles=fs.readFileSync(path.join(root,'styles.css'),'utf8');
assert.match(html,/admin\.js\?v=4\.17/);
assert.match(html,/styles\.css\?v=4\.17/);
assert.match(styles,/audit-stat-clickable/);
assert.match(styles,/\.audit-drill/);
assert.doesNotMatch(script,/innerHTML\s*=/,'Drill content must use safe DOM text nodes');
class Node {
 constructor(tag='div'){this.tagName=tag;this.children=[];this.textContent='';this.value='';this.id='';this.type='';this.title='';this.style={};this.attrs={};this.onclick=null;this.className='';this.classList={set:new Set(),add:(x)=>this.classList.set.add(x),remove:(x)=>this.classList.set.delete(x),contains:(x)=>this.classList.set.has(x),toggle:(x,flag)=>{if(flag===undefined)flag=!this.classList.contains(x);if(flag)this.classList.add(x);else this.classList.remove(x);}};}
 append(...c){this.children.push(...c);}
 replaceChildren(...c){this.children=[...c];}
 setAttribute(k,v){this.attrs[k]=v;}
 scrollIntoView(){}
}
const nodes=new Map();function el(id){if(!nodes.has(id))nodes.set(id,new Node());return nodes.get(id);}
for(const id of ['audit-viewer','audit-preview-content','audit-viewer-title','audit-viewer-state','audit-download','report-list','audit-drill','range','employee'])el(id);
el('range').value='all';el('employee').value='';
// Mixed set: a potential lead needing review with a sent voice note, an unclassified
// with a received voice note + call, and an internal/staff awaiting reply.
const summary={employee_id:2,hours:25,total_chats:3,potential_leads:1,needs_review:1,unread_excluded:1,possible_internal:1,unclassified:1,
 voice_notes_received:1,voice_notes_sent:1,known_voice_duration_seconds:12,call_placeholders:1,possible_no_reply:0,possible_dead:0,
 qa_dimensions:{greeting:'Not assessed'},quality_notes:[],top_actions:[],counts_reconciled:true,
 conversations:[
  {id:11,title:'Lead A',classification:'potential_lead',messages:4,needs_review:true,review_reason:'ambiguous intent',voice_sent:1,voice_received:0,voice_seconds:12,call_events:0,possible_consultant_no_reply:false,possible_dead:false},
  {id:12,title:'Chat B',classification:'unclassified',messages:2,needs_review:false,voice_sent:0,voice_received:1,voice_seconds:0,call_events:1,possible_consultant_no_reply:false,possible_dead:false},
  {id:13,title:'Staff C',classification:'internal_staff',messages:3,needs_review:false,voice_sent:0,voice_received:0,voice_seconds:0,call_events:0,possible_consultant_no_reply:true,possible_dead:false},
 ]};
const ctx={URLSearchParams,Date,Intl,Promise,Error,String,Number,Object,Math,Array,Set,Map,JSON,
 sessionStorage:{getItem(){return ''},setItem(){},removeItem(){}},
 document:{body:new Node('body'),getElementById:el,querySelectorAll(){return []},createElement(t){return new Node(t)},createTextNode(t){const n=new Node('#text');n.textContent=t;return n;}},
 setTimeout:(cb)=>cb,clearTimeout:()=>{},
 fetch:async()=>{throw Error('no network in drill test');},
};
vm.createContext(ctx);
vm.runInContext(script+'\nthis.__test={renderAuditPreview,renderAuditDrill};',ctx);
function walk(n,out=[]){out.push(n);for(const c of n.children)walk(c,out);return out;}
function flatten(n){return [n.textContent,...n.children.flatMap(c=>flatten(c))].join(' | ');}

ctx.__test.renderAuditPreview({id:17,employee_id:2,hours:25,created_at:'2026-11-17T10:00:00Z',status:'completed',summary});
const all=walk(el('audit-preview-content'));
const clickable=all.filter(n=>n.tagName==='button'&&String(n.className).includes('audit-stat-clickable'));
// Total Chats, Potential Leads, Needs Review, Internal/Staff, Unclassified (5),
// plus evidence: Voice Received, Voice Sent, Known Voice Seconds, Call Events (4).
assert.ok(clickable.length>=8,'expected many clickable cards, got '+clickable.length);
// Unread Excluded must NOT be clickable (no per-conversation basis).
const unread=all.find(n=>n.children.some(c=>c.textContent==='Unread Excluded'));
assert.ok(unread&&!String(unread.className).includes('audit-stat-clickable'),'Unread Excluded is not a drill card');

function clickCardStarting(label){
 const card=clickable.find(n=>n.children.some(c=>c.textContent===label));
 assert.ok(card,'clickable card not found: '+label);
 assert.equal(typeof card.onclick,'function');
 card.onclick();
 return flatten(el('audit-drill'));
}
// Needs Review -> only Lead A, and its review reason shows.
let drill=clickCardStarting('Needs Review');
assert.ok(drill.includes('Lead A')&&drill.includes('ambiguous intent'),'Needs Review drill shows Lead A + reason');
assert.ok(!drill.includes('Chat B')&&!drill.includes('Staff C'),'Needs Review drill excludes others');
assert.ok(/1 conversation\b/.test(drill),'Needs Review count = 1');

// Potential Leads -> only Lead A.
drill=clickCardStarting('Potential Leads');
assert.ok(drill.includes('Lead A')&&!drill.includes('Chat B')&&!drill.includes('Staff C'));

// Internal / Staff -> only Staff C.
drill=clickCardStarting('Internal / Staff');
assert.ok(drill.includes('Staff C')&&!drill.includes('Lead A'));

// Call Events -> only Chat B (the one with a call event).
drill=clickCardStarting('Call Events');
assert.ok(drill.includes('Chat B')&&!drill.includes('Lead A')&&!drill.includes('Staff C'),'Call drill shows only the chat with a call');

// Voice Sent -> only Lead A.
drill=clickCardStarting('Voice Sent');
assert.ok(drill.includes('Lead A')&&!drill.includes('Chat B'));

// Total Chats -> all three.
drill=clickCardStarting('Total Chats');
assert.ok(drill.includes('Lead A')&&drill.includes('Chat B')&&drill.includes('Staff C'));
assert.ok(/3 conversations/.test(drill),'Total drill count = 3');

console.log('PASS v4.12: audit cards/evidence are clickable and drill down to only their matching conversations');
