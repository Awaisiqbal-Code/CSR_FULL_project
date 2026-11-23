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
assert.match(html,/admin\.js\?v=4\.18/);
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
const summary={employee_id:2,hours:25,total_chats:3,potential_leads:1,needs_review:1,unread_excluded:1,possible_internal:1,unclassified:1,
 conversations:[{title:'<img src=x onerror=alert(1)>',classification:'potential_lead',messages:3,needs_review:true}],
 qa_dimensions:{greeting:'Not assessed',first_response_time:'Evidence available'},voice_notes_received:2,voice_notes_sent:1,
 call_placeholders:2,quality_notes:['Incomplete timestamps'],top_actions:['Follow up with qualified lead'],counts_reconciled:true};
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
 for(const s of ['Very Hot','Hot','Average','Cold','Not assessed','Greeting Quality','SOP Compliance','Call Events','Follow up with qualified lead'])assert.ok(rendered.includes(s),s);
 assert.ok(rendered.includes('<img src=x onerror=alert(1)>'),'Rendered as textContent, not HTML');
 await ctx.__test.refreshReports();
 assert.ok(flatten(el('report-list')).includes('View report'));
 assert.equal(pdfRequested,0);
 assert.equal(ctx.__test.auditTierValue({},'very_hot'),'Not assessed');
 console.log('PASS v4.11: queued -> auto-completed preview, optional PDF, tier preservation, 10 QA dimensions, text-safe DOM, history');
})().catch(err=>{console.error(err);process.exitCode=1});
