'use strict';
// v4.12: deterministic management-analytics sections render and every box drills
// down to only its matching conversations. Pure mock DOM; no backend/DB/WhatsApp.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const script=fs.readFileSync(path.join(root,'admin.js'),'utf8');
assert.doesNotMatch(script,/innerHTML\s*=/,'Management content must use safe DOM text nodes');
class Node {
 constructor(tag='div'){this.tagName=tag;this.children=[];this.textContent='';this.value='';this.id='';this.type='';this.title='';this.style={};this.attrs={};this.onclick=null;this.className='';this.classList={set:new Set(),add:(x)=>this.classList.set.add(x),remove:(x)=>this.classList.set.delete(x),contains:(x)=>this.classList.set.has(x),toggle:(x,flag)=>{if(flag===undefined)flag=!this.classList.contains(x);if(flag)this.classList.add(x);else this.classList.remove(x);}};}
 append(...c){this.children.push(...c);}
 replaceChildren(...c){this.children=[...c];}
 setAttribute(k,v){this.attrs[k]=v;}
 scrollIntoView(){}
}
const nodes=new Map();function el(id){if(!nodes.has(id))nodes.set(id,new Node());return nodes.get(id);}
for(const id of ['audit-preview-content','audit-drill','range','employee'])el(id);
el('range').value='all';el('employee').value='';
const summary={employee_id:2,hours:25,total_chats:3,
 new_leads:1,new_lead_responded:1,new_lead_awaiting_counselor:0,nnr_awaiting_customer:0,
 nr_from_lead:2,nr_from_counsellor:1,
 follow_up_conversations:1,follow_up_touches:1,old_followup_awaiting:0,old_client_follow_up:1,
 avg_new_lead_first_response_seconds:360,new_lead_first_response_samples:1,new_lead_first_response_missing:0,
 avg_overall_response_seconds:420,median_overall_response_seconds:120,p90_overall_response_seconds:900,overall_response_samples:2,
 reply_states:{replied:2,awaiting_counselor_reply:1},
 lead_tiers:{close_to_conversion:0,very_hot:1,hot:0,average:0,cold:0},
 country_leads:{Italy:1,France:1},multi_country_leads:1,unknown_country_leads:0,
 calls_inbound:1,calls_outbound:0,new_lead_calls:0,follow_up_calls:1,
 responded_text_voice:2,responded_all_channel:2,
 potential_leads:2,needs_review:0,unread_excluded:0,possible_internal:0,unclassified:1,
 qa_dimensions:{greeting:'Not assessed'},quality_notes:[],top_actions:[],counts_reconciled:true,
 conversations:[
  {id:1,title:'New Lead',classification:'potential_lead',messages:2,is_new_lead:true,is_follow_up:false,new_lead_responded:true,reply_state:'replied',lead_tier:'very_hot',countries:['Italy','France'],first_response_seconds:360,response_pairs:1,calls_inbound:0,calls_outbound:0,new_lead_calls:0,follow_up_calls:0,voice_sent:0,voice_received:0,voice_seconds:0,call_events:0},
  {id:2,title:'Follow Up',classification:'potential_lead',messages:3,is_new_lead:false,is_follow_up:true,reply_state:'awaiting_counselor_reply',lead_tier:null,countries:[],response_pairs:1,calls_inbound:1,calls_outbound:0,new_lead_calls:0,follow_up_calls:1,voice_sent:0,voice_received:0,voice_seconds:0,call_events:1},
  {id:3,title:'Chatter',classification:'unclassified',messages:1,is_new_lead:false,is_follow_up:false,reply_state:'replied',lead_tier:null,countries:[],response_pairs:0,calls_inbound:0,calls_outbound:0,new_lead_calls:0,follow_up_calls:0,voice_sent:0,voice_received:0,voice_seconds:0,call_events:0},
 ]};
const ctx={URLSearchParams,Date,Intl,Promise,Error,String,Number,Object,Math,Array,Set,Map,JSON,
 sessionStorage:{getItem(){return ''},setItem(){},removeItem(){}},
 document:{body:new Node('body'),getElementById:el,querySelectorAll(){return []},createElement(t){return new Node(t)},createTextNode(t){const n=new Node('#text');n.textContent=t;return n;}},
 setTimeout:(cb)=>cb,clearTimeout:()=>{},fetch:async()=>{throw Error('no network');}};
vm.createContext(ctx);
vm.runInContext(script+'\nthis.__test={renderAuditPreview};',ctx);
function walk(n,out=[]){out.push(n);for(const c of n.children)walk(c,out);return out;}
function flatten(n){return [n.textContent,...n.children.flatMap(c=>flatten(c))].join(' | ');}

ctx.__test.renderAuditPreview({id:9,employee_id:2,hours:25,created_at:'2026-11-17T10:00:00Z',status:'completed',summary});
const page=flatten(el('audit-preview-content'));
for(const s of ['Management Metrics','New Leads','Overall Follow-up','Old Client Follow-up','NR From Lead','NR From Conseller','No Response on Old Follow up from consellers','Response Time','Conversation Reply State','Responses by Channel','Country Pipeline','Avg New-Lead First Response','6m 0s','Italy','France','Multi-country'])
 assert.ok(page.includes(s),'missing section/label: '+s);
assert.ok(!page.includes('Active Conversations')&&!page.includes('Worked-on Chats'),'deleted metrics must not render');

const all=walk(el('audit-preview-content'));
const clickable=all.filter(n=>n.tagName==='button'&&String(n.className).includes('audit-stat-clickable'));
function click(label){
 const card=clickable.find(n=>n.children.some(c=>c.textContent===label));
 assert.ok(card,'clickable card not found: '+label);card.onclick();return flatten(el('audit-drill'));
}
// New Leads -> only the new lead.
let d=click('New Leads');
assert.ok(d.includes('New Lead')&&!d.includes('Follow Up')&&!d.includes('Chatter'),'New Leads drill shows only the new lead');
// Overall Follow-up -> only the follow-up.
d=click('Overall Follow-up');
assert.ok(d.includes('Follow Up')&&!d.includes('New Lead'),'Follow-up drill shows only follow-up');
// Old Client Follow-up -> only the follow-up that is a Client.
d=click('Old Client Follow-up');
assert.ok(d.includes('Follow Up')&&!d.includes('Chatter'),'Old Client Follow-up drill scoped to client follow-ups');
// NR From Conseller -> only the chat awaiting counsellor reply.
d=click('NR From Conseller');
assert.ok(d.includes('Follow Up')&&!d.includes('Chatter'),'NR From Conseller drill scoped correctly');
// Country Italy -> only the lead considering Italy.
d=click('Italy');
assert.ok(d.includes('New Lead')&&!d.includes('Follow Up'),'Italy drill shows only Italy lead');
// Reply state Awaiting Counselor Reply -> only the follow-up.
d=click('Awaiting Counselor Reply');
assert.ok(d.includes('Follow Up')&&!d.includes('Chatter'),'reply-state drill scoped correctly');
// Follow-up Calls -> only the follow-up (it had the call event).
d=click('Follow-up Calls');
assert.ok(d.includes('Follow Up')&&!d.includes('New Lead'),'follow-up calls drill scoped correctly');

console.log('PASS v4.12: management-analytics sections render and drill down to only their conversations');
