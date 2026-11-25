'use strict';
// Pure mock DOM: never contacts backend, opens WhatsApp, or touches PostgreSQL.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const script=fs.readFileSync(path.join(root,'admin.js'),'utf8');
const styles=fs.readFileSync(path.join(root,'styles.css'),'utf8');
for(const id of ['audit-viewer','audit-viewer-title','audit-viewer-state','audit-preview-content','audit-refresh','audit-download','audit-close'])
 assert.match(html,new RegExp(`id="${id}"`),`Missing ${id}`);
assert.match(styles,/\.audit-qa-grid/);
assert.match(html,/admin\.js\?v=4.21/);
assert.match(script,/AUDIT_LEAD_TIERS/);
assert.match(script,/qa_dimensions/);
assert.doesNotMatch(script,/innerHTML\s*=/,'Report content must use safe DOM text nodes, not innerHTML');
class Node {
 constructor(tag='div'){this.tagName=tag;this.children=[];this.textContent='';this.value='';this.id='';this.style={};this.attrs={};this.hidden=false;this.className='';this.classList={set:new Set(),add:(x)=>this.classList.set.add(x),remove:(x)=>this.classList.set.delete(x),contains:(x)=>this.classList.set.has(x),toggle:(x,flag)=>{if(flag===undefined)flag=!this.classList.contains(x);if(flag)this.classList.add(x);else this.classList.remove(x);}};}
 append(...children){this.children.push(...children);}
 replaceChildren(...children){this.children=[...children];}
 setAttribute(k,v){this.attrs[k]=v;}
 scrollIntoView(){}
}
const nodes=new Map();function el(id){if(!nodes.has(id))nodes.set(id,new Node());return nodes.get(id);}
for(const id of ['audit-viewer','audit-preview-content','audit-viewer-title','audit-viewer-state','audit-download','report-list','audit-refresh','audit-close','generate','report-employee','report-hours','range','employee'])el(id);
el('range').value='all';el('employee').value='';
let pdfRequested=0;
let statuses=['pending','completed'];
const summary={employee_id:2,hours:25,total_chats:4,potential_leads:1,needs_review:1,unread_excluded:1,possible_internal:0,unclassified:3,
 audit_counts:{responsive:1,dead:1,consultant_no_reply:1,internal_staff:1,empty:0,unclassified:0},
 audit_counts_reconciled:true,audit_evaluated:4,audit_unavailable:0,lead_tier_unassessed:0,
 lead_tiers:{very_hot:1,hot:0,average:0,cold:0},
 conversations:[{id:100,title:'<img src=x onerror=alert(1)>',classification:'unclassified',audit_category:'responsive',
  lead_tier:'very_hot',audit_status:'closed',audit_reason:'Confirmed verified country counselor handoff',
  audit_status_reason:'Transferred to Germany counselor',messages:3,needs_review:true,
  audit_qa:{greeting:{rating:'STRONG',finding:'Professional welcome'},
   first_response_time:{rating:'NONE',finding:'Not assessed'},sop_compliance:{rating:'PARTIAL',finding:'Collected CGPA'}}},
  {id:101,title:'Example Internal',classification:'unclassified',audit_category:'internal_staff',messages:2,needs_review:false}],
 qa_dimensions:{greeting:'STRONG - Professional greeting',sop_compliance:'PARTIAL - CGPA collected'},
 voice_notes_received:2,voice_notes_sent:1,call_placeholders:2,
 quality_notes:['Incomplete timestamps'],top_actions:['Today (0-2 days): Follow up with qualified lead'],
 counts_reconciled:true,audit_bottom_line:'Human validation required.'};
let scheduled=[];
const ctx={URLSearchParams,Date,Intl,Promise,Error,String,Number,Object,Math,Array,Set,Map,
 sessionStorage:{getItem(){return ''},setItem(){},removeItem(){}},
 document:{body:new Node('body'),getElementById:el,querySelectorAll(){return []},createElement(t){return new Node(t)},createTextNode(t){const n=new Node('#text');n.textContent=t;return n;}},
 setTimeout:(cb)=>{scheduled.push(cb);return scheduled.length},clearTimeout:()=>{},
 fetch:async(url,opts)=>{
  if(url==='/audits/17')return {ok:true,json:async()=>({id:17,employee_id:2,hours:25,created_at:'2026-11-17T10:00:00Z',status:statuses.shift()||'completed',summary})};
  if(url==='/audits/17/pdf'){pdfRequested++;return {ok:true,blob:async()=>Buffer.from('pdf')};}
  if(String(url).startsWith('/audits?'))return {ok:true,json:async()=>({jobs:[{id:17,employee_id:2,hours:25,status:'completed',created_at:'2026-11-17T10:00:00Z'}]})};
  throw Error('unexpected API '+url);
 },
};
vm.createContext(ctx);
vm.runInContext(script+'\nthis.__test={openAuditReport,refreshReports,auditTierValue,renderAuditPreview};activeTab="reports";',ctx);
function flatten(n){return [n.textContent,...n.children.flatMap(flatten)].join(' | ')}
(async()=>{
 await ctx.__test.openAuditReport(17,false);
 assert.match(el('audit-viewer-state').textContent,/Queued/);
 assert.equal(pdfRequested,0);
 assert.equal(scheduled.length,1,'Pending audit automatically polls');
 await scheduled.shift()();
 assert.match(el('audit-viewer-state').textContent,/Completed/);
 assert.equal(pdfRequested,0,'PDF is optional, never auto-downloaded');
 assert.ok(!el('audit-download').classList.contains('hidden'));
 const rendered=flatten(el('audit-preview-content'));
 // Headline is deterministic (hybrid): business categories, not the AI responsive/
 // dead/etc. cards. AI category detail stays in the reconciliation note below.
 for(const text of ['Very Hot','Hot','Average','Cold','Clients','Internal / Staff','Unclassified',
                     'STRONG','PARTIAL','SOP Compliance','10-Dimension CSR Quality Framework',
                     'Confirmed verified country counselor handoff','Call Events','Human validation required'])
  assert.ok(rendered.includes(text),`Missing audit intelligence field: ${text}`);
 // Canonical conversation classes now have their own section (contract 4.2); the
 // compat headline (Clients/Internal/Unclassified) is still separate and deterministic.
 assert.ok(rendered.includes('Lead Conversation Classification'),'Canonical classification section present');
 assert.ok(rendered.includes('Responsive Leads'),'Responsive Leads card present');
 assert.ok(rendered.includes('Tier Pending'),'Tier Pending tile present');
 assert.ok(rendered.includes('Lead Outcome & Closure'),'Outcome & Closure section present');
 // The per-chat "Individual Lead Evaluations" section was removed (the 10-dimension framework covers QA).
 assert.ok(!rendered.includes('Individual Lead Evaluations'),'Individual Lead Evaluations removed');
 assert.ok(!rendered.includes('Lead tier rules are not yet finalized'), 'Old placeholder should be replaced');
 assert.ok(rendered.includes('<img src=x onerror=alert(1)>'),'Rendered as textContent, not HTML');
 await ctx.__test.refreshReports();
 assert.ok(flatten(el('report-list')).includes('View report'));
 assert.equal(pdfRequested,0);
 assert.equal(ctx.__test.auditTierValue({},'very_hot'),'Not assessed');
 console.log('PASS v4.13: original n8n categories, tiers, per-chat QA, report preview, optional PDF and safe text nodes');
})().catch(err=>{console.error(err);process.exitCode=1});
