'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const js=fs.readFileSync(path.join(root,'admin.js'),'utf8');
assert.match(html,/admin\.js\?v=4.20/);
assert.match(html,/styles\.css\?v=4.20/);
assert.match(html,/id="a-conv-hint"/);
assert.match(html,/id="a-msg-hint"/);
const elems=new Map();
function el(id){if(!elems.has(id))elems.set(id,{value:'',textContent:'',classList:{add(){},remove(){},toggle(){}},append(){},replaceChildren(){},style:{}});return elems.get(id);}
el('range').value='month';el('employee').value='2';el('bucket').value='day';
let dashboard={chats:36,messages:629,call_placeholders:4,unread_excluded:6,last_sync_at:null};
let analytics={conversations_active_in_range:27,conversations_saved_or_updated_in_range:36,conversations_without_dated_message_in_range:9,messages_with_verified_or_inferred_event_time:627,undated_event_messages_all_time:27,all_saved_messages:629,call_placeholders_all_time:4,call_placeholders_undated_all_time:4,dated_messages_outside_selected_range:0,completed_sync_runs_in_range:5,reports:{completed:4},lead_states:{},series:[],note:'message event dates only'};
const context={
  URLSearchParams,Date,Intl,Promise,Error,String,Number,Object,Math,
  sessionStorage:{getItem(){return ''},setItem(){},removeItem(){}},
  document:{getElementById:el,querySelectorAll(){return []},createElement(t){return {...el('_'+t+Math.random()),tagName:t};},createTextNode(s){return {textContent:s}}},
  fetch:async (url)=>{const p=String(url).split('?')[0];let result;
  if(p==='/dashboard')result=dashboard;
  if(p==='/admin/analytics')result=analytics;
  if(p==='/admin/unread-summary')result={note:'latest unread only',employees:[]};
  assert.ok(result,`Unexpected fetch: ${url}`);return {ok:true,json:async()=>result};}
};
vm.createContext(context);
vm.runInContext(js+'\nthis.__test={refreshAnalytics};',context);
(async()=>{
  await context.__test.refreshAnalytics();
  assert.equal(el('a-conv-label').textContent,'Conversations saved/updated in period');
  assert.equal(el('a-conv').textContent,36);
  assert.match(el('a-conv-hint').textContent,/27 with dated message activity; 9 without/);
  assert.equal(el('a-msg').textContent,627);
  assert.match(el('a-msg-hint').textContent,/27 messages without source date/);
  el('employee').value='3';
  dashboard={chats:10,messages:70,call_placeholders:0,unread_excluded:7,last_sync_at:null};
  analytics={...analytics,conversations_active_in_range:7,conversations_saved_or_updated_in_range:10,conversations_without_dated_message_in_range:3,messages_with_verified_or_inferred_event_time:70,undated_event_messages_all_time:6,all_saved_messages:70,call_placeholders_all_time:0,call_placeholders_undated_all_time:0};
  await context.__test.refreshAnalytics();
  assert.equal(el('a-conv').textContent,10);
  assert.match(el('a-conv-hint').textContent,/7 with dated message activity; 3 without/);
  assert.equal(el('a-msg').textContent,70);
  assert.match(el('a-msg-hint').textContent,/6 messages without source date/);
  el('range').value='all';
  await context.__test.refreshAnalytics();
  assert.equal(el('a-conv').textContent,10);
  assert.equal(el('a-msg').textContent,70);
  console.log('PASS: v3.6 cache bust and accurate Abdullah/Hammad labels, undated counts, and All Time totals');
})().catch(err=>{console.error(err);process.exitCode=1;});
