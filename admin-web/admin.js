/* Scholarshiphive CSR Admin v4.4 — evidence-backed conversations & call insights. */
'use strict';
const $=id=>document.getElementById(id);
let token=sessionStorage.getItem('csr-admin-token')||'';
let employees=[];
let counselorCards=[];
let latestOverviewSummary=null;
let latestOverviewClasses={};
let overviewCardsSerial=0;
let overviewSummarySerial=0;
let activeTab='overview';
let chatsKind='';  // '' = all, 'chats' = 1:1 only, 'groups' = groups only
let chatOffset=0;
let selectedConversationId=null;
let displayedConversations=[];
let playbackUrl=null;
let chatRefreshSerial=0;
let chatSummarySerial=0;
let callListSerial=0;
const CHAT_PAGE_SIZE=100;
function toast(text,bad=false){const n=$('toast');n.textContent=text;n.classList.toggle('bad',bad);n.classList.remove('hidden');}
async function api(path,method='GET',data,binary=false){
  const r=await fetch(path,{method,cache:'no-store',headers:{...(token?{'Authorization':'Bearer '+token}:{}),...(data?{'Content-Type':'application/json'}:{})},body:data?JSON.stringify(data):undefined});
  if(binary){if(!r.ok)throw Error(`Report download failed (${r.status})`);return r.blob();}
  const out=await r.json();if(!r.ok)throw Error(typeof out.detail==='string'?out.detail:`Request failed (${r.status})`);return out;
}
function e(tag,text='',cls=''){const el=document.createElement(tag);el.textContent=String(text);if(cls)el.className=cls;return el;}
function formatId(user){const match=String(user.employee_code||user.id).match(/^(?:EMP-)?0*(\d+)(-\d+)?$/i);return match?match[1].padStart(3,'0')+(match[2]||''):String(user.id);}
function employeeLabel(id){const u=employees.find(u=>Number(u.id)===Number(id));return u?`${u.name} (${formatId(u)})`:`Employee record #${id}`;}
function stamp(value){return value?new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Karachi',day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false}).format(new Date(value))+' PKT':'—';}
function showApp(user){document.body.classList.remove('login-view');document.body.classList.add('admin-view');$('login-pane').classList.add('hidden');$('app-pane').classList.remove('hidden');$('nav-actions').classList.remove('hidden');$('top-tabs').classList.remove('hidden');$('admin-name').textContent=user.name;}
function setTab(name){if(name!=='reports')stopAuditPolling();activeTab=name;$('global-filters').classList.toggle('hidden',name==='team'||name==='chats');$('main-heading').classList.toggle('hidden',name==='chats');document.querySelectorAll('.tab-section').forEach(el=>el.classList.toggle('hidden',el.id!==name));document.querySelectorAll('.tabs button').forEach(b=>b.classList.toggle('selected',b.dataset.tab===name));if(name==='chats'){selectedConversationId=null;clearVoicePlayback();refreshChats();}if(name==='reports'){refreshReports();if(activeAuditJobId!==null)openAuditReport(activeAuditJobId,false);}if(name==='team')refreshTeam();}
async function init(){if(!token)return;try{const me=await api('/auth/me');if(me.role!=='admin')throw Error('Admin access only');showApp(me);await loadEmployees();setDates();await refreshAnalytics();await Promise.all([refreshEmployeeCards(),refreshOverviewResponse()]);}catch(err){token='';sessionStorage.removeItem('csr-admin-token');$('login-pane').classList.remove('hidden');$('app-pane').classList.add('hidden');}}
async function loadEmployees(){const r=await api('/admin/employees');employees=r.employees.filter(x=>x.role==='employee');
 // Dashboard dropdowns list only APPROVED counsellors; the Team tab still uses the
 // full `employees` list so pending/disabled accounts can be managed.
 const approved=employees.filter(u=>u.approved);
 for(const id of ['employee','report-employee','chats-employee']){
 const el=$(id);const old=el.value;el.replaceChildren();if(id==='employee'||id==='chats-employee'){const op=e('option','All employees');op.value='';el.append(op);}
 for(const u of approved){const op=e('option',`${u.name} (${formatId(u)})`);op.value=u.id;el.append(op);}
 if([...el.options].some(o=>o.value===old))el.value=old;
}}
const today=()=>{const parts=new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Karachi',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());const v=Object.fromEntries(parts.map(p=>[p.type,p.value]));return `${v.year}-${v.month}-${v.day}`;};
const iso=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
function rangeDates(){const kind=$('range').value;if(kind==='all')return null;const t=today();const [y,m,d]=t.split('-').map(Number);const current=new Date(y,m-1,d);
 if(kind==='today')return [t,t];
 if(kind==='7days'){const x=new Date(current);x.setDate(x.getDate()-6);return [iso(x),t];}
 if(kind==='month')return [iso(new Date(y,m-1,1)),t];
 if(kind==='lastmonth')return [iso(new Date(y,m-2,1)),iso(new Date(y,m-1,0))];
 if(kind==='custommonths'){const s=$('from-month').value,finish=$('to-month').value;if(!s||!finish)throw Error('Select both months');if(s>finish)throw Error('From month must be before To month');const [yy,mm]=finish.split('-').map(Number);return [s+'-01',iso(new Date(yy,mm,0))];}
 if(kind==='customdates'){const start=$('from-date').value,end=$('to-date').value;if(!start||!end)throw Error('Select both dates');if(start>end)throw Error('From date must be before To date');return [start,end];}
 throw Error('Invalid date range');
}
function chatRangeDates(){
 const mode=$('chats-range').value;if(mode==='all')return null;
 const value=today();const [y,m,d]=value.split('-').map(Number);
 if(mode==='month')return [iso(new Date(y,m-1,1)),value];
 if(mode==='7days'){const date=new Date(y,m-1,d);date.setDate(date.getDate()-6);return [iso(date),value];}
 if(mode==='custom'){const a=$('chats-from').value,b=$('chats-to').value;if(!a||!b||a>b)throw Error('Select a valid custom date range');return [a,b];}
 return null;
}
function setDates(){const now=today();$('from-date').value=now;$('to-date').value=now;$('from-month').value=now.slice(0,7);$('to-month').value=now.slice(0,7);$('chats-from').value=now;$('chats-to').value=now;}
function updateRangeVisibility(){const mode=$('range').value;$('month-controls').classList.toggle('hidden',mode!=='custommonths');$('date-controls').classList.toggle('hidden',mode!=='customdates');}
function renderBars(rows){const el=$('bar-chart');el.replaceChildren();if(!rows.length){el.append(e('p','No dated messages found in this period.'));return;}const highest=Math.max(1,...rows.map(x=>x.messages));for(const row of rows){const bar=e('div','','bar-item');bar.title=`${row.period}: ${row.messages} messages, ${row.conversations} conversations`;
 bar.append(e('b',row.messages));const block=e('div','','bar-shape');block.style.height=`${Math.max(3,150*row.messages/highest)}px`;bar.append(block,e('small',row.period));el.append(bar);}}
function renderPie(classes,targetId='pie-chart'){const el=$(targetId);el.replaceChildren();const entries=Object.entries(classes).filter(x=>x[1]>0);if(!entries.length){el.append(e('p','No classified conversations in the selected period.'));return;}
 const total=entries.reduce((a,x)=>a+x[1],0),colors=['#213a61','#7edfc0','#ebb469','#8a9fbe','#5baaa6','#bd9cbd'];let angle=0;const slices=[];
 entries.forEach(([name,n],i)=>{const end=angle+(100*n/total);slices.push(`${colors[i%colors.length]} ${angle}% ${end}%`);angle=end;});
 const pie=e('div','','pie');pie.style.background=`conic-gradient(${slices.join(', ')})`;const labels=e('div','','legend');entries.forEach(([name,n],i)=>{const row=e('div');const swatch=e('span');swatch.style.background=colors[i%colors.length];row.append(swatch,document.createTextNode(`${name.replaceAll('_',' ')}: ${n}`));labels.append(row);});el.append(pie,labels);
}

function humanNumber(value){return Number(value||0).toLocaleString('en-US');}
function statusDisplay(state){
 const titles={unclassified:'Unclassified',needs_review:'Needs review',potential_lead:'Client',internal:'Internal / Staff',internal_staff:'Internal / Staff'};
 return titles[state]||String(state).replaceAll('_',' ').replace(/\b\w/g,c=>c.toUpperCase());
}
function renderCounselorCards(){
 const host=$('employee-cards');if(!host)return;
 host.replaceChildren();
 const query=String($('employee-search').value||'').trim().toLowerCase();
 const active=String($('employee').value||'');
 const visible=counselorCards.filter(item=>{
  const user=employees.find(u=>Number(u.id)===Number(item.employee_id));
  return !query || [item.name,item.employee_code,user?.email||'',formatId(user||{employee_code:item.employee_code,id:item.employee_id})].some(v=>String(v).toLowerCase().includes(query));
 });
 $('counselor-count-pill').textContent=`${visible.length} shown · ${counselorCards.length} counselors`;
 if(!visible.length){host.append(e('p','No counselors match this search.','muted'));return;}
 for(const item of visible){
  const card=e('div','','counselor-card'+(active===String(item.employee_id)?' active':''));
  const user=employees.find(u=>Number(u.id)===Number(item.employee_id));
  const fullname=user?.name||item.name||'Employee';
  const avatar=e('span',fullname.split(/\s+/).slice(0,2).map(x=>x[0]||'').join('').toUpperCase(),'counselor-avatar');
  const heading=e('div','','counselor-card-top');const identity=e('div','','counselor-card-person');
  identity.append(e('strong',fullname),e('small',`Employee ${user?formatId(user):item.employee_code||item.employee_id}`));
  heading.append(avatar,identity);
  const select=e('button','View stats','counselor-card-select');
  select.type='button';select.setAttribute('aria-label',`View ${fullname} analytics`);
  select.onclick=()=>selectCounselor(item.employee_id);heading.append(select);
  const kpis=e('div','','counselor-card-count');
  const kpiStat=(num,label)=>{const b=e('div','','counselor-card-stat');b.append(e('strong',humanNumber(num)),e('span',label));return b;};
  kpis.append(kpiStat(item.conversations,'conversations'),kpiStat(item.messages,'messages'));
  const sync=e('div',item.last_sync_at?('Last sync: '+stamp(item.last_sync_at)):'No sync yet','counselor-sync');
  const foot=e('div','','counselor-card-footer');
  const unread=e('span',`${item.unread_excluded} unread excluded`,'counselor-unread');
  const chats=e('button','Show chats →','counselor-show-chats');
  chats.type='button';chats.setAttribute('aria-label',`Show chats for ${fullname}`);
  chats.onclick=()=>openCounselorChats(item.employee_id);
  foot.append(unread,chats);card.append(heading,kpis,sync,foot);
  // An employee card is also selectable by clicking its blank surface.
  card.onclick=event=>{if(event.target.closest?.('button'))return;selectCounselor(item.employee_id);};
  host.append(card);
 }
}
async function selectCounselor(employeeId){
 $('employee').value=String(employeeId);
 renderCounselorCards();
 await Promise.all([refreshAnalytics(),refreshOverviewResponse()]);
}
function openCounselorChats(employeeId){
 $('chats-employee').value=String(employeeId);
 $('chats-activity').value='';
 const period=rangeDates();
 const mode=$('range').value;
 $('chats-range').value=!period?'all':mode==='month'?'month':mode==='7days'?'7days':'custom';
 if(period&&$('chats-range').value==='custom'){$('chats-from').value=period[0];$('chats-to').value=period[1];}
 $('chats-custom-dates').classList.toggle('hidden',$('chats-range').value!=='custom');
 setTab('chats');
}
// Conversation-status cards and the status-distribution bars were removed from the
// Overview: lead classification now lives only in the Audit report (no duplication).
async function refreshEmployeeCards(){
 const serial=++overviewCardsSerial;
 try{
  const dates=rangeDates();const q=new URLSearchParams();
  if(dates){q.set('start',dates[0]);q.set('end',dates[1]);}
  const data=await api('/admin/employee-cards?'+q);
  if(serial!==overviewCardsSerial)return;
  counselorCards=data.employees||[];renderCounselorCards();
 }catch(err){toast('Employee cards: '+err.message,true);}
}
async function refreshOverviewResponse(){
 const serial=++overviewSummarySerial;
 try{
  const q=new URLSearchParams();const dates=rangeDates();
  if(dates){q.set('start',dates[0]);q.set('end',dates[1]);}
  if($('employee').value)q.set('employee_id',$('employee').value);
  const data=await api('/admin/chats/summary?'+q);
  if(serial!==overviewSummarySerial)return;
  latestOverviewSummary=data;
  // Classification cards and the classification pie were removed from the Overview;
  // lead category is shown only in the Audit report. Response coverage stays.
  renderPie({'Counselor replied':data.responded_chats||0,'No reply observed':data.no_reply_observed_chats||0,'Cannot verify':data.response_unverifiable_chats||0},'response-pie-chart');
  $('response-coverage-note').textContent=`${data.response_pairs||0} verified response pairs · Median: ${formattedDuration(data.median_response_seconds)} (typical) · Avg ${formattedDuration(data.avg_response_seconds)} · p90 ${formattedDuration(data.p90_response_seconds)}. Median is robust to overnight waits; no-reply is not an SLA violation.`;
  // Extra Key-metric tiles pulled from the Conversations analytics (same source as
  // the Chats overview) so the dashboard surfaces response + voice signals too.
  $('a-voice').textContent=humanNumber(data.voice_notes||0);
  $('a-avg-response').textContent=formattedDuration(data.median_response_seconds);
  $('a-avg-response-hint').textContent=`typical · avg ${formattedDuration(data.avg_response_seconds)} · p90 ${formattedDuration(data.p90_response_seconds)}`;
  $('a-replied').textContent=humanNumber(data.responded_chats||0);
  $('a-noreply').textContent=humanNumber(data.no_reply_observed_chats||0);
 }catch(err){toast('Response insights: '+err.message,true);}
}

async function refreshAnalytics(){try{
 const dates=rangeDates();const qs=new URLSearchParams({bucket:$('bucket').value});
 if(dates){qs.set('start',dates[0]);qs.set('end',dates[1]);}
 const selected=$('employee').value;if(selected)qs.set('employee_id',selected);
 const owner=selected?'?'+new URLSearchParams({employee_id:selected}):'';
 const [d,all,unread]=await Promise.all([api('/admin/analytics?'+qs),api('/dashboard'+owner),api('/admin/unread-summary'+owner)]);
 if(dates && (!Number.isFinite(Number(d.conversations_saved_or_updated_in_range)) || d.conversations_saved_or_updated_in_range==null)){throw Error('Updated Admin analytics API not detected. Copy v3.5 backend/app/main.py into your backend and restart the API.');}
 if(d.call_placeholders_all_time==null || all.call_placeholders==null){throw Error('Admin v3.7 requires updated backend/app/main.py; restart FastAPI after copying the patch.');}
 // All Time mirrors employee DB totals. Filtered messages use event dates;
 // filtered conversations show DB-created/updated chats, or dated activity.
 // Never mix these two bases without explaining the difference.
 $('a-conv-label').textContent=dates?'Conversations saved/updated in period':'Conversations (all saved)';
 $('a-msg-label').textContent=dates?'Messages (dated in period)':'Messages saved (all time)';
 $('a-conv').textContent=dates?d.conversations_saved_or_updated_in_range:all.chats;
 $('a-msg').textContent=dates?d.messages_with_verified_or_inferred_event_time:all.messages;
 $('a-unread').textContent=all.unread_excluded;
 // Last sync moved to each counsellor card; no longer a dashboard key metric.
 // Show WHY WhatsApp event-time totals may be lower than stored totals.
 // A NULL occurred_at is unknown, not evidence that a message is in this month.
 const undatedCount=Number(d.undated_event_messages_all_time||0);
 const outsideCount=Number(d.dated_messages_outside_selected_range||0);
 const calls=Number(d.call_placeholders_all_time||0);
 const undatedCalls=Number(d.call_placeholders_undated_all_time||0);
 $('call-count').textContent=String(calls);
 $('a-call').textContent=String(dates?Number(d.dated_call_events_in_range||0):calls);
 $('a-call-label').textContent=dates?'Dated call events in period':'Call events (all saved)';
 $('a-call-hint').textContent=dates?`${undatedCalls} undated calls excluded from period`:`${undatedCalls} calls missing source dates · Click for details`;
 $('call-note').textContent=`${undatedCalls} call event(s) have no source date. Saved for review, excluded from message totals. No call was deleted or merged.`;
 if(dates){
   const datedChats=Number(d.conversations_active_in_range||0);
   const savedChats=Number(d.conversations_saved_or_updated_in_range||0);
   $('a-conv-hint').textContent=`${datedChats} with dated message activity; ${Math.max(0,savedChats-datedChats)} without dated activity in period`;
   $('a-msg-hint').textContent=`${undatedCount} messages without source date${outsideCount?`; ${outsideCount} dated outside range`:''}. Calls excluded: ${calls}`;
 }else{
   $('a-conv-hint').textContent='All stored chats, regardless of message date';
   $('a-msg-hint').textContent=undatedCount?`${undatedCount} messages missing date; ${calls} call placeholders excluded`:`${calls} call placeholders tracked separately`;
 }
 $('a-sync').textContent=d.completed_sync_runs_in_range;
 $('a-reports').textContent=d.reports.completed||0;
 for(const span of document.querySelectorAll('.range-descriptor'))span.textContent=dates?'(selected period)':'(all time)';
 renderBars(d.series);
 const status=$('report-status');status.replaceChildren();
 for(const [kind,n] of Object.entries(d.reports))status.append(e('span',`${kind}: ${n}`,'tag'));
 const detail=$('unread-breakdown');detail.replaceChildren();
 detail.append(e('p',unread.note,'muted'));
 for(const item of unread.employees){
   detail.append(e('p',`${item.name} (${formatId(item)}): ${item.unread_excluded} unread excluded · last completed sync ${stamp(item.last_completed_sync_at || item.snapshot_recorded_at)}`));
 }
 const totalUndated=Number(d.undated_event_messages_all_time||0);
 const outside=Number(d.dated_messages_outside_selected_range||0);
 $('analytics-note').textContent=dates
    ? `${d.note} Conversations: ${d.conversations_saved_or_updated_in_range} saved/updated in range, of which ${d.conversations_active_in_range} have dated message activity; ${d.conversations_without_dated_message_in_range} do not have dated activity in range. Messages: ${d.messages_with_verified_or_inferred_event_time} with event dates inside range, ${outside} outside range, ${totalUndated} messages missing event dates. ${calls} call placeholders stored separately (${undatedCalls} undated). No undated event is assigned a month.`
    : `${d.note} ${totalUndated} of ${d.all_saved_messages} saved messages have no usable event date. ${calls} separate call placeholders (${undatedCalls} undated) are excluded from message counts.`;
 }catch(err){toast(err.message,true);}}
function row(container,title,desc,actions=[]){const r=e('div','','list-row');const left=e('div');left.append(e('strong',title),e('p',desc));r.append(left);const rights=e('div','','list-actions');actions.forEach(([label,callback])=>{const b=e('button',label,'secondary');b.onclick=()=>Promise.resolve(callback()).catch(err=>toast(err.message,true));rights.append(b);});r.append(rights);container.append(r);}
function clearVoicePlayback(){if(playbackUrl){URL.revokeObjectURL(playbackUrl);playbackUrl=null;}}
function miniTime(value){if(!value)return 'Time unavailable';try{return new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Karachi',hour:'2-digit',minute:'2-digit'}).format(new Date(value));}catch{return 'Time unavailable';}}
function dateGroupKey(value){
 if(!value)return 'undated';
 const dt=new Date(value);if(!Number.isFinite(dt.getTime()))return 'undated';
 return new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Karachi',year:'numeric',month:'2-digit',day:'2-digit'}).format(dt);
}
function chatDayLabel(value){
 if(!value)return 'Date unavailable · source did not provide a reliable date';
 const dt=new Date(value);if(!Number.isFinite(dt.getTime()))return 'Date unavailable';
 return new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Karachi',weekday:'long',day:'numeric',month:'long',year:'numeric'}).format(dt);
}
function safeCallDurationText(value){
 const raw=String(value||'').trim();
 return /^(?:\d{1,2}:\d{2}(?::\d{2})?|\d+\s*(?:s|sec|seconds|m|min|minutes)(?:\s+\d+\s*(?:s|sec|seconds))?)$/i.test(raw)?raw:'Duration unavailable';
}
function statusClass(state,needsReview){if(needsReview)return 'review';if(state==='potential_lead')return 'lead';if(state==='internal')return 'internal';return 'plain';}
function statusLabel(state,needsReview){return needsReview?'Needs review':String(state||'unclassified').replaceAll('_',' ');}
function chatEmpty(text){
 const detail=$('chat-detail');detail.replaceChildren();
 const empty=e('div','','chat-empty');
 empty.append(e('span','☏'),e('h2',text||'Select a conversation'),e('p','Select a chat to inspect its stored messages. Press Esc to return to analytics.'));
 detail.append(empty);
}
function showChatLoading(){const host=$('chat-detail');host.replaceChildren(e('p','Loading analytics…','loading-note'));}
function selectOverview(){selectedConversationId=null;clearVoicePlayback();renderInbox();refreshChatSummary();}
function formattedDuration(secs){
 if(secs===null||secs===undefined||!Number.isFinite(Number(secs)))return 'Not available';
 const value=Math.round(Number(secs));if(value<60)return value+' sec';
 if(value<3600)return Math.floor(value/60)+'m '+String(value%60).padStart(2,'0')+'s';
 return Math.floor(value/3600)+'h '+Math.floor((value%3600)/60)+'m';
}
function overviewStat(label,value,help,action){
 const card=e(action?'button':'div','','workspace-stat'+(action?' workspace-stat-clickable':''));
 if(action){card.type='button';card.onclick=action;card.title='Click to inspect matching conversations or evidence';}
 card.append(e('small',label),e('strong',String(value)));
 if(help)card.append(e('span',help,'workspace-stat-note'));
 return card;
}
function filterChatInsight(activity=''){
 if(!$('chats-employee').value){
   toast('Select one counselor to view matching individual conversations. Company-wide analytics stay summary-only.');
   return;
 }
 $('chats-activity').value=activity;
 refreshChats();
}

function overviewDonut(label,entries){
 const panel=e('section','','workspace-graph-card');panel.append(e('h3',label));
 const filtered=Object.entries(entries).filter(([key,n])=>Number(n)>0);const sum=filtered.reduce((x,kv)=>x+Number(kv[1]),0);
 if(!sum){panel.append(e('p','No available data for this selection.','muted'));return panel;}
 const colors=['#213a61','#80dbc0','#e4b26d','#859bc3','#b79bc6','#67b9b0'];let from=0;
 const slices=filtered.map(([key,n],i)=>{const to=from+Number(n)*100/sum;const part=`${colors[i%colors.length]} ${from}% ${to}%`;from=to;return part;});
 const layout=e('div','','workspace-donut-layout');const pie=e('div','','workspace-donut');pie.style.background='conic-gradient('+slices.join(', ')+')';pie.append(e('span',String(sum)));
 const legend=e('div','','workspace-legend');filtered.forEach(([key,n],i)=>{const line=e('div','','workspace-legend-row');const dot=e('span','','workspace-dot');dot.style.background=colors[i%colors.length];line.append(dot,e('span',key.replaceAll('_',' ')),e('b',n));legend.append(line);});layout.append(pie,legend);panel.append(layout);return panel;
}
function activityChart(series){
 const panel=e('section','','workspace-graph-card workspace-wide');panel.append(e('h3','Message activity by date'));
 if(!series.length){panel.append(e('p','No timestamped message activity in this range.','muted'));return panel;}
 const recent=series.slice(-14);const max=Math.max(1,...recent.map(i=>Number(i.messages)||0));const bars=e('div','','workspace-mini-chart');
 for(const item of recent){const b=e('div','','workspace-mini-bar');const block=e('span','','workspace-mini-shape');block.style.height=Math.max(4,Math.round(110*(Number(item.messages)||0)/max))+'px';b.title=`${item.date}: ${item.messages} saved message events`;b.append(e('small',item.messages),block,e('small',item.date.slice(5)));bars.append(b);}panel.append(bars);return panel;
}
function renderChatOverview(data){
 if(activeTab!=='chats'||selectedConversationId!==null)return;
 const host=$('chat-detail');host.replaceChildren();
 const wrap=e('div','','workspace-analytics');const title=e('div','','workspace-analytics-heading');
 const scope=$('chats-employee').value?employeeLabel($('chats-employee').value):'All employees';
 title.append(e('div','CONVERSATION INTELLIGENCE','eyebrow'),e('h2',scope+' — Chats overview'),e('p',data.scope==='all_time'?'All saved history':'Chats saved/updated in selected dates; messages counted by source event date','muted'));wrap.append(title);
 const stats=e('div','','workspace-stats');
 stats.append(overviewStat('Conversations',data.total_conversations,'Saved chats in selected scope',()=>filterChatInsight()));
 stats.append(overviewStat(data.scope==='date_range'?'Dated messages':'Messages saved',data.messages,'Call events are separate',()=>filterChatInsight()));
 stats.append(overviewStat('Unread excluded',data.unread_excluded_latest,'Latest sync snapshot · no message contents',()=>toast('Unread excluded chats are not saved as readable messages, so a per-chat unread filter is unavailable.')));
 stats.append(overviewStat('Call events',data.call_events,'View event list and known timing',()=>showCallEvents()));
 stats.append(overviewStat('Voice notes',data.voice_notes,'View chats containing detected voice',()=>filterChatInsight('voice')));
 stats.append(overviewStat('Median response time',formattedDuration(data.median_response_seconds),`typical · avg ${formattedDuration(data.avg_response_seconds)} · ${data.response_pairs} replies`,()=>filterChatInsight('replied')));
 stats.append(overviewStat('Chats replied (period)',data.responded_chats,'Had ≥1 timestamped reply — historical, not latest-turn status',()=>filterChatInsight('replied')));
 stats.append(overviewStat('Currently awaiting reply',Number(data.currently_awaiting_reply||0),'Latest customer turn has no later reply (may overlap No reply)',()=>filterChatInsight('no_reply')));
 stats.append(overviewStat('No reply observed',data.no_reply_observed_chats,'Never replied in available history · not a proven SLA violation',()=>filterChatInsight('no_reply')));
 stats.append(overviewStat('Needs review',Number(data.needs_review||0),'Independent flag — any category may need review',()=>filterChatInsight()));
 wrap.append(stats);
 const charts=e('div','','workspace-graphs');
 charts.append(overviewDonut('Response coverage',{'Counselor replied':data.responded_chats,'No reply observed':data.no_reply_observed_chats,'Not verifiable':data.response_unverifiable_chats}));
 charts.append(activityChart(data.daily_activity||[]));wrap.append(charts);
 const extras=e('div','','workspace-details');
 const calls=e('section','','workspace-graph-card');calls.append(e('h3','Call events & timing'));
 calls.append(e('p',`${data.call_events} recorded placeholders · ${data.calls_without_date} without event date · ${data.calls_with_duration} with known duration`,'muted'));
 calls.append(e('p','Known call duration total: '+(data.calls_with_duration?formattedDuration(data.known_call_duration_seconds):'Not available'),'muted'));
 for(const entry of (data.recent_calls||[]).slice(0,5))calls.append(e('p',(entry.occurred_at?stamp(entry.occurred_at):'Time unavailable')+' · '+(entry.duration_seconds!=null?formattedDuration(entry.duration_seconds):'Duration unavailable'),'workspace-call-row'));
 const viewCalls=e('button','Open call events →','secondary call-list-opener');viewCalls.onclick=showCallEvents;calls.append(viewCalls);
 if(!data.recent_calls?.length)calls.append(e('p','No date-supported calls in this scope.','muted'));
 const quality=e('section','','workspace-graph-card');quality.append(e('h3','Coverage & data quality'));
 quality.append(e('p',`${data.incoming_messages} customer messages · ${data.counselor_messages} sent by counselors`,'muted'));
 quality.append(e('p',`${data.voice_notes} voice placeholders · ${data.media_placeholders} other media placeholders`,'muted'));
 quality.append(e('p',`${data.undated_messages} undated messages in scope · ${data.chats_with_pending_reply} previously replied chats with unanswered latest inbound message`,'muted'));
 quality.append(e('p','Email reply statistics are not available: email is not integrated with this WhatsApp collector.','muted'));
 quality.append(e('p','Unread is a latest-sync snapshot. Response time needs timestamps; missing data is not guessed.','workspace-quality-note'));
 extras.append(calls,quality);wrap.append(extras);
 host.append(wrap);
}
async function showCallEvents(){
 if(activeTab!=='chats')setTab('chats');
 if(!$('chats-employee').value){toast('Select a counselor to view individual call events. All Employees remains graphs only.');return;}
 ++chatSummarySerial; // prevent an earlier summary fetch from overwriting this detail list
 const serial=++callListSerial;
 const host=$('chat-detail');host.replaceChildren(e('p','Loading saved call events…','loading-note'));
 const q=new URLSearchParams({limit:'200'});
 if($('chats-employee').value)q.set('employee_id',$('chats-employee').value);
 try{
   const dates=chatRangeDates();if(dates){q.set('start',dates[0]);q.set('end',dates[1]);}
   const response=await api('/admin/calls?'+q);
   if(serial!==callListSerial||activeTab!=='chats'||selectedConversationId!==null)return;
   const wrap=e('div','','call-events-view');
   const title=e('div','','call-events-heading');
   const back=e('button','← Back to analytics','secondary');back.onclick=selectOverview;
   title.append(e('h2','Call events'),back);wrap.append(title);
   wrap.append(e('p',response.note+' Event dates and durations are shown only when actually available.','muted'));
   const rows=e('div','','call-events-list');
   if(!response.events.length)rows.append(e('p','No call events with confirmed dates in this selection.','muted'));
   for(const call of response.events){
     const row=e('button','','call-event-row');row.type='button';
     const who=e('strong',call.contact_name||'Unknown contact');
     const line=e('span',(call.direction==='unverified'?'Caller unverified':call.direction+' · '+call.actor)+' · '+(call.occurred_at?stamp(call.occurred_at):(call.source_time||'Date unavailable')));
     const duration=e('span','Duration: '+(call.duration_seconds==null?'Unavailable':formattedDuration(call.duration_seconds)));
     row.append(who,line,duration);
     row.onclick=async()=>{
       if(!$('chats-employee').value){$('chats-employee').value=String(call.employee_id);await refreshChats();}
       await openConversation({id:call.conversation_id},call.id);
     };
     rows.append(row);
   }
   wrap.append(rows);host.replaceChildren(wrap);
 }catch(err){if(serial!==callListSerial)return;chatEmpty('Call event details unavailable');toast(err.message,true);}
}

async function refreshChatSummary(){
 const serial=++chatSummarySerial;selectedConversationId=null;clearVoicePlayback();showChatLoading();
 const q=new URLSearchParams();if($('chats-employee').value)q.set('employee_id',$('chats-employee').value);
 try{const dates=chatRangeDates();if(dates){q.set('start',dates[0]);q.set('end',dates[1]);}
  const data=await api('/admin/chats/summary?'+q);
  if(serial!==chatSummarySerial||activeTab!=='chats'||selectedConversationId!==null)return;
  renderChatOverview(data);
 }catch(err){if(serial!==chatSummarySerial)return;chatEmpty('Analytics unavailable');toast('Chats analytics: '+err.message,true);}
}
function renderInbox(){
 const parent=$('chat-list');parent.replaceChildren();
 for(const item of displayedConversations){
  const button=e('button','','inbox-chat'+(selectedConversationId===item.id?' active':''));button.type='button';button.setAttribute('role','option');button.setAttribute('aria-selected',String(selectedConversationId===item.id));
  const icon=e('span',(item.title||'?').slice(0,2).toUpperCase(),'chat-avatar');
  const content=e('div','','inbox-content');const top=e('div','','inbox-top');
  const title=String(item.title||'').trim();const number=String(item.contact_number||'').trim();
  top.append(e('strong',title||number||'Unknown contact'),e('small',miniTime(item.last_message_at||item.last_seen_at)));
  content.append(top);
  if(number && number!==title)content.append(e('small',number,'inbox-contact-number'));
  content.append(e('p',item.last_preview||'No message preview','inbox-preview'));
  const foot=e('div','','inbox-foot');foot.append(e('small',employeeLabel(item.employee_id)));content.append(foot);
  button.append(icon,content);button.onclick=()=>openConversation(item);parent.append(button);
 }
 if(!displayedConversations.length)parent.append(e('p','No conversations found.','inbox-no-results'));
 $('chat-count-pill').textContent=String(displayedConversations.length)+' loaded';
}
async function loadVoice(msg,host){const btn=host.querySelector('button');if(btn)btn.disabled=true;
 try{
  const blob=await api('/admin/voices/'+msg.id,'GET',null,true);
  if(!blob.size||!String(blob.type||'').toLowerCase().startsWith('audio/'))throw Error('Backend did not return a valid audio file');
  clearVoicePlayback();playbackUrl=URL.createObjectURL(blob);
  const player=e('audio');player.controls=true;player.preload='metadata';player.src=playbackUrl;
  host.replaceChildren(player);player.play().catch(()=>{});
 }catch(err){toast('Voice playback unavailable: '+err.message,true);if(btn)btn.disabled=false;}
}
function actualSenderName(msg,conversation){
 // Always use the recorded sender where reliable, but keep counselor/customer
 // identities distinct. Do not invent telephone numbers or group participants.
 if(msg.from_me)return employeeLabel(conversation.employee_id);
 const raw=String(msg.sender||'').trim();
 if(raw && !/^(?:you|me|contact|unknown|undefined|null)$/i.test(raw))return raw;
 return conversation.contact_number || conversation.title || 'Contact (name unavailable)';
}
function renderMessage(msg,conversation){
 const outer=e('div','','chat-message '+(msg.from_me?'mine':'theirs'));
 if(msg.direction_source==='stored_unverified')outer.title='Message direction is not confirmed by a WhatsApp ID';
 const bubble=e('div','','bubble');
 bubble.append(e('strong',actualSenderName(msg,conversation),'bubble-sender'));
 if(msg.text)bubble.append(e('p',msg.text,'bubble-text'));
 const kind=String(msg.media||'').toLowerCase();
 if(kind==='voice'||kind==='audio'){
  const panel=e('div','','voice-bubble');panel.append(e('span','♫','voice-icon'));
  const body=e('div','','voice-info');body.append(e('strong','Voice message'));
  const voiceState=msg.voice_status==='available'?'Audio saved':
    msg.voice_status==='failed'?'Audio collection failed':
    msg.voice_status==='source_missing'?'Source ID unavailable — re-sync WhatsApp':
    msg.voice_status==='retry'?'Audio retry queued · Employee WhatsApp required':
    msg.voice_status==='pending'?'Audio queued · Waiting for employee WhatsApp':
    msg.voice_status==='not_captured'?'Metadata only · Audio not yet captured':'Audio collection status unknown';
  body.append(e('small',(msg.duration?msg.duration+' · ':'')+voiceState));
  if(msg.voice_error)body.append(e('small',String(msg.voice_error).slice(0,145),'voice-error-detail'));
  panel.append(body);
  if(msg.voice_status==='available'){const btn=e('button','▶ Play','play-voice');btn.onclick=()=>loadVoice(msg,panel);panel.append(btn);}
  else if(msg.voice_status==='failed'){const btn=e('button','↻ Retry','play-voice');btn.title=msg.voice_error||'Retry audio collection';btn.onclick=async()=>{
      try{await api('/admin/voices/'+msg.id+'/retry','POST',{});toast('Voice queued for another collection attempt. WhatsApp Web must be available.');btn.disabled=true;}
      catch(err){toast(err.message,true);}
    };panel.append(btn);}
  bubble.append(panel);
 }else if(kind==='call'){
   const details=e('button','☎ Call event · '+safeCallDurationText(msg.duration)+' · View details','call-event-inline');details.type='button';
   const box=e('div','','call-event-expanded hidden');
   const caller=msg.direction_source==='whatsapp_id'?(msg.from_me?employeeLabel(conversation.employee_id):actualSenderName(msg,conversation)):(msg.from_me?employeeLabel(conversation.employee_id):'Caller not confirmed');
   box.append(e('p','Caller: '+caller),e('p','Date / time: '+(msg.occurred_at?stamp(msg.occurred_at):(msg.timestamp||'Unknown'))),
              e('p','Duration: '+safeCallDurationText(msg.duration)),e('p','Audio recording not available; this is saved call metadata.'));
   details.onclick=()=>box.classList.toggle('hidden');bubble.append(details,box);
 }
 else if(kind==='image'||kind==='video'||kind==='document')bubble.append(e('div','▣ '+kind[0].toUpperCase()+kind.slice(1)+' detected · File not stored','media-placeholder'));
 else if(kind && !msg.text)bubble.append(e('div','▣ '+kind+' detected','media-placeholder'));
 const foot=e('div','','bubble-meta');
 foot.append(e('span',msg.occurred_at?miniTime(msg.occurred_at):msg.timestamp||'Date unavailable'));bubble.append(foot);outer.append(bubble);return outer;
}
async function openConversation(item,focusMessageId=null){
 selectedConversationId=item.id;clearVoicePlayback();renderInbox();
 const host=$('chat-detail');host.replaceChildren(e('p','Loading conversation…','loading-note'));
 try{const data=await api('/conversations/'+item.id);if(selectedConversationId!==item.id)return;
  const c=data.conversation;
  const head=e('div','','conversation-header');const avatar=e('span',(c.title||'?').slice(0,2).toUpperCase(),'chat-avatar');
  const main=e('div','','conversation-identity');main.append(e('strong',c.title||'Unknown contact'),e('small',employeeLabel(c.employee_id)+(c.contact_number?' · '+c.contact_number:'')));
  const meta=e('div','','conversation-head-actions');
  const close=e('button','✕','chat-close');close.title='Close chat (Esc)';close.setAttribute('aria-label','Close chat and show analytics');close.onclick=selectOverview;
  meta.append(close);head.append(avatar,main,meta);host.replaceChildren(head);
  if(c.needs_review&&c.review_reason)host.append(e('p','Needs review: '+c.review_reason,'review-banner'));
  const area=e('div','','messages-scroller');
  area.append(e('div','SYNCHRONIZED MESSAGE PREVIEW · STORED IN COMPANY DATABASE','chat-date-separator intro-separator'));
  let previousDay=null;const seenVoiceIds=new Set();let shownCount=0;
  for(const msg of data.messages){
    const kind=String(msg.media||'').toLowerCase();
    // Only identical authoritative original WhatsApp IDs can prove a duplicate.
    if((kind==='voice'||kind==='audio')&&msg.source_id){
      if(seenVoiceIds.has(msg.source_id))continue;
      seenVoiceIds.add(msg.source_id);
    }
    const day=dateGroupKey(msg.occurred_at);
    if(day!==previousDay){area.append(e('div',chatDayLabel(msg.occurred_at),'chat-date-separator'));previousDay=day;}
    const rendered=renderMessage(msg,c);rendered.dataset.messageId=String(msg.id);area.append(rendered);shownCount++;
  }
  if(!shownCount)area.append(e('p','No extractable messages saved for this conversation.','muted'));
  host.append(area);
  const footer=e('div','','chat-detail-footer');
  for(const [label,value] of [['Assigned counselor',employeeLabel(c.employee_id)],['Messages available',data.messages.length+' saved records']]){
    const stat=e('div');stat.append(e('small',label),e('strong',String(value)));footer.append(stat);
  }
  host.append(footer);area.scrollTop=area.scrollHeight;
  if(focusMessageId){const target=area.querySelector('[data-message-id="'+String(Number(focusMessageId))+'"]');target?.scrollIntoView({block:'center',behavior:'smooth'});target?.classList.add('focused-call');}

 }catch(err){toast(err.message,true);chatEmpty('Conversation unavailable');}
}
async function refreshChats(append=false){
 const serial=++chatRefreshSerial;
 const chosen=$('chats-employee').value;
 // All Employees is analytics-only: never render or fetch the inbox here.
 const onlySummary=!chosen;
 $('conversation-workspace').classList.toggle('workspace-all-employees',onlySummary);
 $('chat-search').disabled=onlySummary;
 if(!append){chatOffset=0;displayedConversations=[];selectedConversationId=null;clearVoicePlayback();renderInbox();refreshChatSummary();}
 if(onlySummary){
   $('chat-list-summary').textContent='Company-wide overview · select an employee to open their inbox';
   $('load-more-chats').classList.add('hidden');return;
 }
 try{
  const q=new URLSearchParams({limit:String(CHAT_PAGE_SIZE),offset:String(chatOffset),employee_id:chosen});
  if($('chats-activity').value)q.set('activity',$('chats-activity').value);
  if(chatsKind)q.set('kind',chatsKind);
  if($('chat-search').value.trim())q.set('search',$('chat-search').value.trim());
  const dates=chatRangeDates();if(dates){q.set('start',dates[0]);q.set('end',dates[1]);}
  const data=await api('/conversations?'+q);if(serial!==chatRefreshSerial||activeTab!=='chats')return;
  displayedConversations.push(...data.conversations);chatOffset+=data.conversations.length;
  // Server uses latest confirmed WhatsApp message time. Keep the same stable
  // ordering if pages were loaded while a background sync updated the list.
  const activityAt=item=>{const s=item.last_message_at||item.last_seen_at||'';const t=Date.parse(s);return Number.isFinite(t)?t:0;};
  displayedConversations.sort((a,b)=>activityAt(b)-activityAt(a)||Number(b.id)-Number(a.id));
  $('chat-list-summary').textContent=`${data.total} saved conversation${data.total===1?'':'s'} · ${employeeLabel(chosen)}`;
  $('load-more-chats').classList.toggle('hidden',!data.has_more);
  renderInbox();
  // Deliberately do not auto-open the first conversation: summary stays visible.
 }catch(err){if(serial!==chatRefreshSerial)return;toast(err.message,true);}
}
// Audit v4.11: existing authorized audit summary and PDF endpoints, no collector changes.
// Never infer lead-tier counts or QA scores from a generic Potential Lead classification.
const AUDIT_QA_LABELS={greeting:'Greeting Quality',first_response_time:'First Response Time',needs_discovery:'Needs Discovery',product_knowledge:'Product Knowledge',objection_handling:'Objection Handling',upselling:'Upselling',closing:'Closing',follow_up:'Follow-up',professional_tone:'Professional Tone',sop_compliance:'SOP Compliance'};
const AUDIT_LEAD_TIERS=[['close_to_conversion','Close to Conversion'],['very_hot','Very Hot'],['hot','Hot'],['average','Average'],['cold','Cold']];
let activeAuditJobId=null;
let auditPollHandle=null;
let auditRequestSerial=0;
function stopAuditPolling(){if(auditPollHandle!==null){clearTimeout(auditPollHandle);auditPollHandle=null;}}
function auditTitle(host,text){const heading=e('h3',text,'audit-section-title');host.append(heading);return heading;}
function auditParagraph(host,text,cls=''){host.append(e('p',text,cls));}
// Drill-down state for the currently open audit report. Every stat/evidence/tier
// card filters THIS conversations array; the panel shows only matching records.
let auditDrillConversations=[];
// Business category is the DETERMINISTIC classification (hybrid model); AI's
// audit_category is only a fallback, so drill-downs match the headline counts
// with or without AI.
function auditCategoryOf(chat){return chat.classification||chat.audit_category||'unclassified';}
function auditStat(label,value,predicate){
 const empty=value===null||value===undefined;
 const num=Number(value);
 const matches=(!empty&&typeof predicate==='function')?auditDrillConversations.filter(predicate):null;
 const clickable=Array.isArray(matches)&&matches.length>0;
 const card=e(clickable?'button':'div','','audit-stat'+(clickable?' audit-stat-clickable':''));
 if(clickable)card.type='button';
 card.append(e('small',label),e('strong',empty?'—':String(value)));
 if(clickable){
  card.title='Click to see the '+matches.length+' conversation(s) in “'+label+'”';
  card.append(e('span','View details ›','audit-stat-cue'));
  card.onclick=()=>renderAuditDrill(label,matches);
 }else if(!empty&&typeof predicate==='function'&&num>0){
  // A positive count with no per-conversation basis (e.g. Unread Excluded or a
  // message-level sum) — explain rather than silently stay dead.
  card.classList.add('audit-stat-note');card.title='Details for this metric are shown in the report sections below.';
 }
 return card;
}
const AUDIT_DRILL_COLUMNS=['Conversation','Category','Lead tier','Reply state','Country','Voice (in/out)','Calls','Flags'];
function auditDrillRows(matches){
 return matches.slice(0,300).map(chat=>{
  const tier=AUDIT_LEAD_TIERS.find(([key])=>chat.lead_tier===key);
  const reply=chat.reply_state?statusDisplay(chat.reply_state):(chat.possible_consultant_no_reply?'Awaiting counselor reply':(chat.possible_dead?'No inbound reply':'—'));
  const country=Array.isArray(chat.countries)&&chat.countries.length?chat.countries.join(', '):'Unknown';
  const voice=`${chat.voice_received??0} / ${chat.voice_sent??0}`+((chat.voice_seconds??0)>0?` · ${chat.voice_seconds}s`:'');
  const flags=[chat.needs_review?'Needs review'+(chat.review_reason?(': '+chat.review_reason):''):null,
   chat.audit_status?('Status: '+chat.audit_status):null,
   chat.audit_analysis_status==='unavailable'?'AI unavailable':null,
   chat.audit_reason||null].filter(Boolean).join(' · ')||'—';
  const cat=statusDisplay(auditCategoryOf(chat));
  return [auditField(chat.title),cat,tier?tier[1]:'Not assessed',reply,country,voice,String(chat.call_events??0),flags];
 });
}
function closeAuditDrill(){const panel=$('audit-drill');if(!panel)return;panel.classList.add('hidden');panel.onclick=null;panel.replaceChildren();}
function renderAuditDrill(label,matches){
 const panel=$('audit-drill');if(!panel)return;
 panel.replaceChildren();panel.classList.remove('hidden');
 const rows=auditDrillRows(matches);
 const dialog=e('div','','audit-modal');
 const head=e('div','','audit-drill-head');
 head.append(e('h3',label+' · '+matches.length+' conversation'+(matches.length===1?'':'s'),'audit-section-title'));
 const acts=e('div','','audit-modal-actions');
 const dl=e('button','⬇ Download PDF','secondary');dl.type='button';dl.onclick=()=>downloadDrillPdf(dl,label,AUDIT_DRILL_COLUMNS,rows);
 const close=e('button','Close ✕','subtle');close.type='button';close.onclick=closeAuditDrill;
 acts.append(dl,close);head.append(acts);dialog.append(head);
 auditParagraph(dialog,'Showing only the conversations included in this metric, with their saved evidence. Business category, reply state and review flags are independent dimensions.','audit-footnote');
 const table=e('table','','audit-register');const thead=e('thead');const hr=e('tr');
 for(const col of AUDIT_DRILL_COLUMNS)hr.append(e('th',col));
 thead.append(hr);table.append(thead);
 const body=e('tbody');
 for(const r of rows){const tr=e('tr');for(const v of r)tr.append(e('td',v));body.append(tr);}
 table.append(body);const wrap=e('div','','audit-table-wrap');wrap.append(table);dialog.append(wrap);
 if(matches.length>300)auditParagraph(dialog,`Showing first 300 of ${matches.length}. Narrow the filter or download the overall PDF for the full set.`,'audit-footnote');
 panel.append(dialog);
 panel.onclick=ev=>{if(ev.target===panel)closeAuditDrill();};
}
async function downloadDrillPdf(btn,label,columns,rows){
 if(activeAuditJobId===null){toast('Open a report first',true);return;}
 const prev=btn?btn.textContent:'';if(btn){btn.disabled=true;btn.textContent='Preparing…';}
 try{
  const pdf=await api(`/audits/${activeAuditJobId}/drill-pdf`,'POST',{label,columns,rows},true);
  const url=URL.createObjectURL(pdf);const a=document.createElement('a');a.href=url;
  a.download=`Scholarshiphive-${String(label).replace(/[^a-z0-9]+/gi,'-').replace(/^-+|-+$/g,'')||'detail'}.pdf`;
  document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),10000);
 }catch(err){toast(err.message,true);}
 finally{if(btn){btn.disabled=false;btn.textContent=prev;}}
}
function auditSection(container,label){const section=e('section','','audit-report-section');auditTitle(section,label);container.append(section);return section;}
function auditList(section,items,empty){if(!Array.isArray(items)||!items.length){auditParagraph(section,empty,'muted');return;}const ul=e('ul','','audit-bullets');for(const item of items)ul.append(e('li',String(item)));section.append(ul);}
function auditField(value){return value===null||value===undefined||String(value).trim()===''?'—':String(value);}
function auditTierValue(raw,key){
 // Legacy tiers are retained. Absence of verified assignments is never presented as zero.
 if(!raw||typeof raw!=='object'||!Object.prototype.hasOwnProperty.call(raw,key))return 'Not assessed';
 const value=raw[key];return Number.isInteger(value)&&value>=0?value:'Not assessed';
}
function fmtDuration(seconds){
 if(seconds===null||seconds===undefined)return 'N/A';
 const s=Math.round(Number(seconds));if(!Number.isFinite(s))return 'N/A';
 const mm=Math.floor(s/60),ss=s%60;return mm?`${mm}m ${ss}s`:`${ss}s`;
}
function auditMetricGrid(section,defs,gridCls='audit-stat-grid'){
 const grid=e('div','',gridCls);
 for(const [label,value,pred] of defs)grid.append(auditStat(label,value,pred));
 section.append(grid);return grid;
}
// Deterministic management-analytics sections (spec 18 Nov 2026). Shown only when
// the report carries the new deterministic keys; legacy reports are unaffected.
function renderManagementAnalytics(out,summary,C){
 if(summary.new_leads===undefined)return;
 const nl=c=>!!c.is_new_lead;
 const mgmt=auditSection(out,'Management Metrics');
 auditMetricGrid(mgmt,[
  ['New Leads',summary.new_leads,nl],
  ['New Lead Responded',summary.new_lead_responded,c=>nl(c)&&c.new_lead_responded],
  ['NR From Lead',summary.nr_from_lead,c=>c.reply_state==='replied'],
  ['NR From Conseller',summary.nr_from_counsellor,c=>c.reply_state==='awaiting_counselor_reply'],
  ['Overall Follow-up',summary.follow_up_conversations,c=>!!c.is_follow_up],
  ['Old Client Follow-up',summary.old_client_follow_up,c=>!!c.is_follow_up&&C(c)==='potential_lead'],
  ['No Response on Old Follow up from consellers',summary.old_followup_awaiting,c=>c.is_follow_up&&c.reply_state==='awaiting_counselor_reply'],
 ]);
 auditParagraph(mgmt,'NR From Conseller = the customer wrote last and the counseller has not replied yet (also shown as "Awaiting reply from counsellers"). NR From Lead = the counseller replied and the lead/customer has gone silent. Both are overall (new + follow-up). Old Client Follow-up counts follow-up chats that are Clients.','audit-footnote');

 // "Awaiting Counselor Reply" is intentionally omitted here: it is the same number
 // as "NR From Conseller" in Management Metrics above, shown there instead.
 const states=[['replied','Replied'],['no_reply_observed','No Reply Observed'],['no_action_required','No Action Required'],['unknown','Unknown']];
 const rs=summary.reply_states||{};
 const stateSection=auditSection(out,'Conversation Reply State');
 auditMetricGrid(stateSection,states.map(([key,label])=>[label,rs[key]||0,c=>c.reply_state===key]));

 const chan=auditSection(out,'Responses by Channel');
 auditMetricGrid(chan,[
  ['Responded (Text / Voice)',summary.responded_text_voice,c=>c.reply_state==='replied'],
  ['Responded (All Channels)',summary.responded_all_channel,c=>c.reply_state==='replied'||(c.calls_outbound||0)>0],
  ['Inbound Calls',summary.calls_inbound,c=>(c.calls_inbound||0)>0],
  ['Outbound Calls',summary.calls_outbound,c=>(c.calls_outbound||0)>0],
  ['New-Lead Calls',summary.new_lead_calls,c=>(c.new_lead_calls||0)>0],
  ['Follow-up Calls',summary.follow_up_calls,c=>(c.follow_up_calls||0)>0],
 ],'audit-stat-grid audit-stat-grid-small');
 auditParagraph(chan,'Calls are a separate response channel. The all-channel figure additionally credits an outbound call as a counselor touch; it is reported alongside the text/voice figure, never merged into it. "Answered" is not inferred, and missed/unknown-length calls are never counted as replies.','audit-footnote');

 const cl=summary.country_leads||{};const countryKeys=Object.keys(cl);
 const country=auditSection(out,'Country Pipeline (Clients)');
 if(!countryKeys.length&&!summary.multi_country_leads&&!summary.unknown_country_leads){
  auditParagraph(country,'No study-destination evidence found in this period. Country is never guessed from name, language or counselor.','muted');
 }else{
  const defs=countryKeys.map(name=>[name,cl[name],c=>C(c)==='potential_lead'&&Array.isArray(c.countries)&&c.countries.includes(name)]);
  defs.push(['Multi-country',summary.multi_country_leads,c=>C(c)==='potential_lead'&&Array.isArray(c.countries)&&c.countries.length>1]);
  defs.push(['Unknown country',summary.unknown_country_leads,c=>C(c)==='potential_lead'&&(!Array.isArray(c.countries)||!c.countries.length)]);
  auditMetricGrid(country,defs);
  auditParagraph(country,'A lead considering several countries is counted once per country here, but only once in the distinct global lead total. Primary country is set only when the customer states one explicitly.','audit-footnote');
 }
}
function renderResponseTime(out,summary){
 const nl=c=>!!c.is_new_lead;
 const resp=auditSection(out,'Response Time');
 auditMetricGrid(resp,[
  ['Avg New-Lead First Response',fmtDuration(summary.avg_new_lead_first_response_seconds),c=>nl(c)&&c.first_response_seconds!=null],
  ['Median Overall Response',fmtDuration(summary.median_overall_response_seconds),c=>(c.response_pairs||0)>0],
 ],'audit-stat-grid audit-stat-grid-small');
 auditParagraph(resp,`Median overall response is the typical reply speed (robust to overnight waits) · avg ${fmtDuration(summary.avg_overall_response_seconds)} · p90 ${fmtDuration(summary.p90_overall_response_seconds)}. New-lead first-response sample: ${summary.new_lead_first_response_samples??0} pair(s), ${summary.new_lead_first_response_missing??0} missing/invalid. Overall-response sample: ${summary.overall_response_samples??0} completed turn pair(s). Missing or invalid pairs are shown as N/A, never 0.`,'audit-footnote');
}
function renderVoiceEvidence(out,summary){
 const evidence=auditSection(out,'Voice, Calls & Response Evidence');const evidenceGrid=e('div','','audit-stat-grid audit-stat-grid-small');
 const evDefs=[['Voice Received','voice_notes_received',c=>(c.voice_received??0)>0],['Voice Sent','voice_notes_sent',c=>(c.voice_sent??0)>0],['Known Voice Seconds','known_voice_duration_seconds',c=>(c.voice_seconds??0)>0],['Call Events','call_placeholders',c=>(c.call_events??0)>0],['Possible No Reply','possible_no_reply',c=>c.possible_consultant_no_reply&&c.classification==='potential_lead'],['Possible Dead Chats','possible_dead',c=>c.possible_dead&&c.classification==='potential_lead']];
 for(const [label,key,pred] of evDefs)evidenceGrid.append(auditStat(label,summary[key],pred));
 evidence.append(evidenceGrid);auditParagraph(evidence,'Audio and call content cannot be evaluated unless verified transcripts are available. Reply gaps and dead chats are possible indicators, not proven violations.','audit-footnote');
}
function renderAuditPreview(item){
 const out=$('audit-preview-content');out.replaceChildren();
 const summary=item.summary&&typeof item.summary==='object'?item.summary:{};
 auditDrillConversations=Array.isArray(summary.conversations)?summary.conversations:[];
 const C=auditCategoryOf; // per-chat effective category (AI audit_category or deterministic classification)
 const header=e('div','','audit-report-header');header.append(e('span','CONFIDENTIAL · INTERNAL REVIEW','audit-eyebrow'));
 header.append(e('h3','WhatsApp Sales & CSR Audit'));
 auditParagraph(header,`${employeeLabel(item.employee_id)} · ${item.period_label||('Last '+item.hours+' hours')} · Generated ${stamp(item.scheduled_for||item.created_at)}`,'audit-report-subtitle');out.append(header);
 const stats=e('div','','audit-stat-grid');
 // Headline is DETERMINISTIC (hybrid): always the rule-based business categories so
 // it matches the chat data and never collapses to 0 when AI is unavailable. AI
 // enrichment, when present, shows in the Executive Summary / reconciliation note.
 const defs=[['Total Chats','total_chats',()=>true],['Clients','potential_leads',c=>C(c)==='potential_lead'],['Internal / Staff','possible_internal',c=>C(c)==='internal_staff'],['Unclassified','unclassified',c=>C(c)==='unclassified'],['Needs Review','needs_review',c=>!!c.needs_review],['Unread Excluded','unread_excluded',null]];
 for(const [label,key,pred] of defs)stats.append(auditStat(label,summary[key],pred));
 out.append(stats);
 auditParagraph(out,'Tip: click any highlighted box, pipeline tier or evidence card below to open a popup of only its matching conversations — with a Download PDF button for that subset.','audit-footnote');
 const drill=e('section','','audit-drill hidden');drill.id='audit-drill';out.append(drill);
 // Lead Pipeline is shown first (before Management Metrics).
 const pipeline=auditSection(out,'Lead Pipeline — Retained Tiers');const tiers=e('div','','audit-tiers');
 for(const [key,label] of AUDIT_LEAD_TIERS){
  const matches=auditDrillConversations.filter(c=>c.lead_tier===key);
  const clickable=matches.length>0;
  const tile=e(clickable?'button':'div','','audit-tier'+(clickable?' audit-stat-clickable':''));if(clickable)tile.type='button';
  tile.append(e('span',label),e('strong',auditTierValue(summary.lead_tiers,key)));
  if(clickable){tile.append(e('span','View details ›','audit-stat-cue'));tile.title='Click to see the '+matches.length+' '+label+' lead(s)';tile.onclick=()=>renderAuditDrill(label+' leads',matches);}
  tiers.append(tile);
 }pipeline.append(tiers);
 if(summary.audit_counts){
  auditParagraph(pipeline,`${summary.lead_tier_unassessed??0} responsive lead(s) have insufficient evidence for a reliable tier. Legacy CGPA bands are guidelines, not university eligibility decisions.`,'audit-footnote');
 }else{
  auditParagraph(pipeline,'Lead tiers have not been AI-evaluated; unassessed values are not shown as zero.','audit-footnote');
 }
 renderManagementAnalytics(out,summary,C);
 const executive=auditSection(out,'Executive Summary');
 auditParagraph(executive,summary.executive_summary||'No AI executive analysis available. Review the evidence-based indicators below.');
 auditParagraph(executive,summary.ai_status||'Rule-based analysis; human review required','audit-footnote');
 // Voice/calls evidence, then Response Time, shown before the Lead Register.
 renderVoiceEvidence(out,summary);
 renderResponseTime(out,summary);
 const register=auditSection(out,'Lead Register / Conversation Classification');
 if(!Array.isArray(summary.conversations)||!summary.conversations.length)auditParagraph(register,'No synchronized conversations in this reporting window.','muted');
 else{
  const table=e('table','','audit-register');const thead=e('thead');const h=e('tr');for(const label of ['Conversation','Classification','Lead tier','Messages / Flags'])h.append(e('th',label));thead.append(h);table.append(thead);
  const body=e('tbody');for(const chat of summary.conversations.slice(0,120)){
   const tr=e('tr');const tier=AUDIT_LEAD_TIERS.find(([key])=>chat.lead_tier===key);
   const flags=[`${chat.messages??0} messages`,chat.audit_status?`Status: ${chat.audit_status}`:null,
    chat.needs_review?'Needs review':null,
    chat.audit_analysis_status==='unavailable'?'AI unavailable':null,
    chat.audit_reason?chat.audit_reason:null].filter(Boolean).join(' · ');
   const classified=chat.audit_category?statusDisplay(chat.audit_category):statusDisplay(chat.classification||'unclassified');
   for(const value of [auditField(chat.title),classified,tier?tier[1]:'Not assessed',flags])tr.append(e('td',value));body.append(tr);
  }table.append(body);const wrap=e('div','','audit-table-wrap');wrap.append(table);register.append(wrap);
  if(summary.conversations.length>120)auditParagraph(register,`Showing first 120 of ${summary.conversations.length} synchronized conversations.`,'audit-footnote');
 }
 const qa=auditSection(out,'10-Dimension CSR Quality Framework');const qaGrid=e('div','','audit-qa-grid');
 for(const [key,label] of Object.entries(AUDIT_QA_LABELS)){
  const card=e('div','','audit-qa-card');card.append(e('strong',label));auditParagraph(card,auditField(summary.qa_dimensions?.[key]),'audit-qa-finding');qaGrid.append(card);
 }qa.append(qaGrid);
 const next=auditSection(out,'Management Actions');auditList(next,summary.top_actions,'No specific actions provided.');
 const quality=auditSection(out,'Data Quality & Verification');auditList(quality,summary.quality_notes,'No additional quality notes.');
 auditParagraph(quality,summary.coverage_note||'This report covers available synchronized data only.','audit-footnote');
 auditParagraph(quality,`Business category counts reconciled: ${summary.counts_reconciled===true?'Yes':summary.counts_reconciled===false?'No':'Not checked'}`,'audit-footnote');
 if(summary.audit_counts){
  auditParagraph(quality,`AI audit categories reconciled: ${summary.audit_counts_reconciled===true?'Yes':'No'} · Evaluated ${summary.audit_evaluated??0}/${summary.total_chats} · Unavailable ${summary.audit_unavailable??0}.`,'audit-footnote');
  if(summary.audit_bottom_line)auditParagraph(quality,`Management bottom line: ${summary.audit_bottom_line}`,'audit-footnote');
 }
}
async function downloadAuditPdf(jobId){
 const pdf=await api(`/audits/${jobId}/pdf`,'GET',null,true);
 const url=URL.createObjectURL(pdf);const a=document.createElement('a');a.href=url;a.download=`Scholarshiphive-Audit-${jobId}.pdf`;
 document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),10000);
}
async function openAuditReport(jobId,scroll=true){
 activeAuditJobId=Number(jobId);const serial=++auditRequestSerial;stopAuditPolling();
 const viewer=$('audit-viewer');viewer.classList.remove('hidden');$('audit-preview-content').replaceChildren();
 $('audit-viewer-title').textContent='Loading report…';$('audit-viewer-state').textContent='Loading report status…';$('audit-download').classList.add('hidden');
 if(scroll)viewer.scrollIntoView({behavior:'smooth',block:'start'});
 try{
  const item=await api(`/audits/${jobId}`);if(serial!==auditRequestSerial||activeAuditJobId!==Number(jobId))return;
  $('audit-viewer-title').textContent=`${employeeLabel(item.employee_id)} · ${stamp(item.scheduled_for||item.created_at)}`;
  if(item.status==='completed'){
    $('audit-viewer-state').textContent=`Completed · ${stamp(item.scheduled_for||item.created_at)} · View the full report below. PDF is optional.`;
    renderAuditPreview(item);$('audit-download').classList.remove('hidden');
  }else if(item.status==='failed'){
    $('audit-viewer-state').textContent='Audit failed';
    auditParagraph($('audit-preview-content'),item.error||'Worker did not finish this report. Check worker logs and retry only when safe.','audit-error');
  }else{
    $('audit-viewer-state').textContent=item.status==='processing'?'Analyzing conversations…':'Queued — waiting for audit worker…';
    auditParagraph($('audit-preview-content'),'This report will open here automatically after processing. You can leave this tab; completed reports remain in Report History.','muted');
    if(activeTab==='reports')auditPollHandle=setTimeout(async()=>{await openAuditReport(jobId,false);},4000);
  }
 }catch(err){if(serial!==auditRequestSerial)return;$('audit-viewer-state').textContent='Could not load audit';auditParagraph($('audit-preview-content'),err.message,'audit-error');}
}
let reportJobs=[];
async function refreshReports(){try{
 const dates=rangeDates();const q=new URLSearchParams();
 if(dates){q.set('start',dates[0]);q.set('end',dates[1]);}if($('employee').value)q.set('employee_id',$('employee').value);
 reportJobs=(await api('/audits?'+q)).jobs||[];
 renderReportList();
 }catch(err){toast(err.message,true);}}
// Client-side filter of the loaded reports by the "Search counselor" box (name / ID),
// so typing a counsellor's name narrows Report History without a round-trip.
function renderReportList(){
 const c=$('report-list');if(!c)return;c.replaceChildren();
 const query=String($('employee-search').value||'').trim().toLowerCase();
 const match=job=>{
  if(!query)return true;
  const user=(employees||[]).find(u=>Number(u.id)===Number(job.employee_id));
  return [employeeLabel(job.employee_id),user?.name||'',user?.employee_code||'',formatId(user||{employee_code:'',id:job.employee_id})]
    .some(v=>String(v).toLowerCase().includes(query));
 };
 const rows=reportJobs.filter(match);
 for(const job of rows){
  const actions=[['View report',()=>openAuditReport(job.id)]];
  const when=stamp(job.scheduled_for||job.created_at);
  const kind=job.auto_generated?'Auto':'Manual';
  row(c,`${employeeLabel(job.employee_id)} — ${job.status}`,`${job.period_label||('Last '+job.hours+' hours')} · ${when} · ${kind}`,actions);
 }
 if(!reportJobs.length)c.append(e('p','No reports yet.','muted'));
 else if(!rows.length)c.append(e('p','No reports match this search.','muted'));
}

async function refreshTeam(){try{await loadEmployees();renderTeamList();}catch(err){toast(err.message,true);}}
function renderTeamList(){
 const c=$('team-list');if(!c)return;c.replaceChildren();
 const query=String(($('team-search')||{}).value||'').trim().toLowerCase();
 const list=employees.filter(u=>!query||[u.name,u.email,u.employee_code,formatId(u)].some(v=>String(v||'').toLowerCase().includes(query)));
 if(!list.length){c.append(e('p',employees.length?'No employees match this search.':'No employees yet.','muted'));return;}
 for(const user of list){
 const r=e('div','','list-row');
 const left=e('div');left.append(e('strong',`${user.name} (${formatId(user)})`),e('p',`${user.email} · ${user.approved?'Approved':'Pending approval'} · ${user.active?'Active':'Disabled'}`));
 const rights=e('div','','list-actions');
 const approveBtn=e('button',user.approved?'Revoke approval':'Approve','secondary');
 approveBtn.onclick=()=>api(`/admin/employees/${user.id}`,'PATCH',{approved:!user.approved}).then(refreshTeam).catch(err=>toast(err.message,true));
 const activeBtn=e('button',user.active?'Disable':'Enable','secondary');
 activeBtn.onclick=()=>api(`/admin/employees/${user.id}`,'PATCH',{active:!user.active}).then(refreshTeam).catch(err=>toast(err.message,true));
 // Password field with an eye toggle to reveal/hide what is typed.
 const pwWrap=e('div','','team-pw-wrap');
 const pw=e('input','','team-pw-input');pw.type='password';pw.placeholder='New password (8+)';pw.autocomplete='new-password';
 const eye=e('button','Show','subtle team-pw-eye');eye.type='button';eye.setAttribute('aria-label','Show password');
 eye.onclick=()=>{const show=pw.type==='password';pw.type=show?'text':'password';eye.textContent=show?'Hide':'Show';eye.setAttribute('aria-label',(show?'Hide':'Show')+' password');};
 pwWrap.append(pw,eye);
 const setBtn=e('button','Set password','secondary');
 setBtn.onclick=async()=>{const v=pw.value;if(v.length<8){toast('Password must be at least 8 characters',true);return;}try{await api(`/admin/employees/${user.id}/password`,'POST',{password:v});pw.value='';pw.type='password';eye.textContent='Show';toast('Password updated for '+user.name);}catch(err){toast(err.message,true);}};
 rights.append(approveBtn,activeBtn,pwWrap,setBtn);
 // Employee-requested password change awaiting approval: show it and let the admin
 // approve (new password takes effect) or reject (discard the request).
 if(user.pending_password_change){
  left.append(e('p','⚠ Password change requested — verify with the employee before approving','review'));
  const approveCh=e('button','Approve password change','primary');
  approveCh.onclick=()=>api(`/admin/employees/${user.id}/password-change/approve`,'POST',{}).then(()=>{toast('Password change approved for '+user.name);refreshTeam();}).catch(err=>toast(err.message,true));
  const rejectCh=e('button','Reject change','subtle');
  rejectCh.onclick=()=>api(`/admin/employees/${user.id}/password-change/reject`,'POST',{}).then(()=>{toast('Password change rejected');refreshTeam();}).catch(err=>toast(err.message,true));
  rights.append(approveCh,rejectCh);
 }
 // Delete is offered only for a disabled or not-yet-approved account.
 if(!(user.approved&&user.active)){
  const delBtn=e('button','Delete','danger');
  delBtn.onclick=async()=>{if(!confirm(`Delete ${user.name} (${formatId(user)}) and all of their synced data? This cannot be undone.`))return;try{await api(`/admin/employees/${user.id}`,'DELETE');toast('Deleted '+user.name);await refreshTeam();}catch(err){toast(err.message,true);}};
  rights.append(delBtn);
 }
 r.append(left,rights);c.append(r);
}}
$('login-form').onsubmit=async event=>{event.preventDefault();try{const r=await api('/auth/login','POST',{email:$('email').value,password:$('password').value});if(r.user.role!=='admin')throw Error('Admin access required');token=r.access_token;sessionStorage.setItem('csr-admin-token',token);$('password').value='';showApp(r.user);await loadEmployees();setDates();await refreshAnalytics();await Promise.all([refreshEmployeeCards(),refreshOverviewResponse()]);}catch(err){token='';toast(err.message,true);}};
$('toggle-password').onclick=()=>{
  const input=$('password');
  const visible=input.type==='password';
  input.type=visible?'text':'password';
  $('toggle-password').textContent=visible?'Hide':'Show';
  $('toggle-password').setAttribute('aria-label',visible?'Hide password':'Show password');
  $('toggle-password').setAttribute('aria-pressed',String(visible));
};
$('logout').onclick=()=>{sessionStorage.removeItem('csr-admin-token');token='';location.reload();};
document.querySelectorAll('.tabs button').forEach(b=>b.onclick=()=>setTab(b.dataset.tab));
$('range').onchange=updateRangeVisibility;
$('employee-search').oninput=()=>{renderCounselorCards();if(activeTab==='reports')renderReportList();};
$('team-search').oninput=renderTeamList;
$('employee').onchange=async()=>{renderCounselorCards();await Promise.all([refreshAnalytics(),refreshOverviewResponse()]);};
$('bucket').onchange=refreshAnalytics;
$('call-event-metric').onclick=()=>{
 $('chats-employee').value=$('employee').value;
 $('chats-activity').value='calls';
 const dates=rangeDates();$('chats-range').value=dates?'custom':'all';
 if(dates){$('chats-from').value=dates[0];$('chats-to').value=dates[1];}
 $('chats-custom-dates').classList.toggle('hidden',!dates);
 setTab('chats');showCallEvents();
};
$('call-event-metric').onkeydown=event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();$('call-event-metric').click();}};
$('reset-overview').onclick=async()=>{
 $('employee-search').value='';$('employee').value='';$('range').value='all';$('bucket').value='month';
 updateRangeVisibility();renderCounselorCards();
 await Promise.all([refreshAnalytics(),refreshOverviewResponse(),refreshEmployeeCards()]);
};
$('apply').onclick=async()=>{await Promise.all([refreshAnalytics(),refreshOverviewResponse(),refreshEmployeeCards()]);if(activeTab==='chats')refreshChats();if(activeTab==='reports')refreshReports();};
$('refresh-chats').onclick=()=>refreshChats();
document.addEventListener?.('keydown',event=>{if(event.key==='Escape'&&activeTab==='chats'&&selectedConversationId!==null){event.preventDefault();selectOverview();}});
for(const id of ['chats-employee','chats-activity','chats-range','chats-from','chats-to'])$(id).onchange=()=>{if(id==='chats-range')$('chats-custom-dates').classList.toggle('hidden',$('chats-range').value!=='custom');refreshChats();};
let searchDelay=null;$('chat-search').oninput=()=>{clearTimeout(searchDelay);searchDelay=setTimeout(()=>refreshChats(),300);};
for(const [id,val] of [['kind-all',''],['kind-chats','chats'],['kind-groups','groups']])$(id).onclick=()=>{chatsKind=val;for(const b of ['kind-all','kind-chats','kind-groups'])$(b).classList.toggle('selected',b===id);refreshChats();};
$('chats-create-audit').onclick=()=>setTab('reports');
$('load-more-chats').onclick=()=>refreshChats(true);
$('audit-refresh').onclick=()=>{if(activeAuditJobId!==null)openAuditReport(activeAuditJobId,false);};
$('audit-download').onclick=async()=>{if(activeAuditJobId===null)return;try{await downloadAuditPdf(activeAuditJobId);}catch(err){toast(err.message,true);}};
$('audit-close').onclick=()=>{stopAuditPolling();auditRequestSerial++;activeAuditJobId=null;$('audit-viewer').classList.add('hidden');$('audit-preview-content').replaceChildren();};
(function(){const sel=$('report-period');if(!sel||typeof sel.addEventListener!=='function')return;const sync=()=>{const custom=sel.value==='custom';const f=$('report-from-label'),t=$('report-to-label');if(f)f.classList.toggle('hidden',!custom);if(t)t.classList.toggle('hidden',!custom);};sel.addEventListener('change',sync);sync();})();
$('generate').onclick=async()=>{
 const button=$('generate');button.disabled=true;
 try{const id=Number($('report-employee').value);if(!id)throw Error('Select an employee');
  const period=$('report-period').value;const payload={employee_id:id,period};
  if(period==='custom'){
    const from=$('report-from').value,to=$('report-to').value;
    if(!from||!to)throw Error('Select both custom dates');
    payload.start=from;payload.end=to;
  }
  const result=await api('/audits','POST',payload);
  toast(`Report #${result.job_id} queued. The report will appear in this portal when ready.`);
  await openAuditReport(result.job_id);await refreshReports();
 }catch(err){toast(err.message,true);}finally{button.disabled=false;}
};
init();
