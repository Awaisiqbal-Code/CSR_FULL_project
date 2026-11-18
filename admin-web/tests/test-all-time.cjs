'use strict';
// Run: node admin-web/tests/test-all-time.cjs
// No DB/network dependencies; checks the filter payload and dashboard rendering.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const js=fs.readFileSync(path.join(root,'admin.js'),'utf8');
assert.match(html,/<option value="all" selected>All Time<\/option>/);
assert.equal((html.match(/id="a-conv"/g)||[]).length,1);
assert.equal((html.match(/id="a-msg"/g)||[]).length,1);
assert.equal((html.match(/class="metrics"/g)||[]).length,1,'One primary metrics section expected');
const objects=new Map();
function el(id){
 if(!objects.has(id))objects.set(id,{
  value:'',textContent:'',
  classList:{add(){},remove(){},toggle(){}},
  replaceChildren(){},append(){},
  style:{},
 });
 return objects.get(id);
}
el('range').value='all';el('employee').value='2';el('bucket').value='month';
let calls=[];
const mock={
 '/dashboard':{chats:36,messages:654,call_placeholders:0,unread_excluded:6,last_sync_at:'2026-11-12T16:37:46+00:00'},
 '/admin/unread-summary':{note:'Latest sync only',employees:[]},
 '/admin/analytics':{conversations_active_in_range:5,conversations_saved_or_updated_in_range:8,conversations_without_dated_message_in_range:3,messages_with_verified_or_inferred_event_time:20,
   call_placeholders_all_time:0,call_placeholders_undated_all_time:0,undated_event_messages_all_time:0,dated_messages_outside_selected_range:0,
   completed_sync_runs_in_range:3,reports:{completed:4},lead_states:{},series:[],note:'Event dates only',unverified_legacy_messages_received_in_range:0}
};
const ctx={
 URLSearchParams,Date,Intl,Promise,Error,String,Number,Object,Math,
 sessionStorage:{getItem(){return ''},setItem(){},removeItem(){}},
 document:{getElementById:el,querySelectorAll(){return []},createElement(tag){return {...el('__tag'+tag+Math.random()),tagName:tag};},createTextNode(s){return {textContent:s}}},
 fetch:async (url,opts)=>{const pathname=String(url).split('?')[0];calls.push(String(url));assert.ok(mock[pathname],`Unexpected API: ${pathname}`);return {ok:true,json:async()=>mock[pathname]};},
};
vm.createContext(ctx);
vm.runInContext(js+'\nthis.__tests={rangeDates,refreshAnalytics};',ctx,{filename:'admin.js'});
(async()=>{
 assert.equal(ctx.__tests.rangeDates(),null);
 await ctx.__tests.refreshAnalytics();
 assert.equal(el('a-conv').textContent,36);
 assert.equal(el('a-msg').textContent,654);
 assert.equal(el('a-unread').textContent,6);
 assert.ok(calls.some(u=>u.includes('/admin/analytics?')&&u.includes('employee_id=2')&&!u.includes('start=')));
 assert.ok(calls.some(u=>u.includes('/dashboard?employee_id=2')));
 assert.ok(calls.some(u=>u.includes('/admin/unread-summary?employee_id=2')));
 calls=[];
 el('range').value='month';
 await ctx.__tests.refreshAnalytics();
 assert.equal(el('a-conv').textContent,8);
 assert.equal(el('a-conv-label').textContent,'Conversations saved/updated in period');
 assert.match(el('analytics-note').textContent,/3 do not have dated activity/);
 assert.equal(el('a-msg').textContent,20);
 assert.equal(el('a-unread').textContent,6,'Latest unread snapshot must not be misreported as historical');
 assert.ok(calls.some(u=>u.includes('/admin/analytics?')&&u.includes('start=')&&u.includes('end=')));
 el('range').value='customdates';el('from-date').value='2026-11-12';el('to-date').value='2026-11-01';
 assert.throws(()=>ctx.__tests.rangeDates(),/From date must be before/);
 el('range').value='custommonths';el('from-month').value='2026-12';el('to-month').value='2026-11';
 assert.throws(()=>ctx.__tests.rangeDates(),/From month must be before/);
 console.log('PASS: one stats row, All Time initial payload, filtered payload, unread snapshot, invalid date range');
})().catch(err=>{console.error(err);process.exitCode=1;});
