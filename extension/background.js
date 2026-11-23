/* Scholarshiphive CSR Employee Collector — v3.0
 * Existing WhatsApp DOM collector is unchanged except for dynamic date cutoff
 * and normalized timestamps. No n8n, chatbot, admin APIs, or employee auto-sync toggle.
 */
'use strict';
const SESSION_KEY='csr.auth';
const BASE_KEY='csr.apiBase';
// Hardcoded backend URL so counselors never enter or see it. BEFORE distributing the
// extension, replace the subdomain below with your real Railway API service URL.
// Must be a https://<name>.up.railway.app host (or http://127.0.0.1:8000 for local dev).
const DEFAULT_API_BASE='http://127.0.0.1:8000';
const LAST_KEY='csr.lastSync';
const ALARM='csr-sync-15m';
const VOICE_ALARM='csr-voice-1m';
const VOICE_KICK='csr-voice-kick';
let voiceRunning=false;
let running=false;

chrome.runtime.onInstalled.addListener(async()=>{
  await chrome.sidePanel.setPanelBehavior({openPanelOnActionClick:true});
  chrome.alarms.create(ALARM,{periodInMinutes:15});
  chrome.alarms.create(VOICE_ALARM,{periodInMinutes:1});
  // Old user-controlled autoSync preference intentionally retired.
  await chrome.storage.local.remove('csr.autoSync');
});
chrome.runtime.onStartup.addListener(()=>{chrome.alarms.create(ALARM,{periodInMinutes:15});chrome.alarms.create(VOICE_ALARM,{periodInMinutes:1});});
function isUI(sender){return !!sender.url && sender.url.startsWith(chrome.runtime.getURL(''));}
function allowedBase(value){
  const url=String(value||'').trim().replace(/\/+$/,'');
  if(!(/^https:\/\/[a-z0-9-]+\.up\.railway\.app$/i.test(url)||/^http:\/\/(localhost|127\.0\.0\.1):8000$/.test(url)))
    throw new Error('Enter your local http://127.0.0.1:8000 or Railway HTTPS API URL.');
  return url;
}
async function base(){const cfg=await chrome.storage.local.get([BASE_KEY]);return allowedBase(cfg[BASE_KEY]||DEFAULT_API_BASE);}
async function auth(){return (await chrome.storage.session.get([SESSION_KEY]))[SESSION_KEY]||null;}
async function api(path,method='GET',body){
  const a=await auth();
  const response=await fetch((await base())+path,{method,headers:{...(body?{'Content-Type':'application/json'}:{}),...(a?.token?{Authorization:'Bearer '+a.token}:{})},body:body?JSON.stringify(body):undefined,cache:'no-store'});
  let data;try{data=await response.json();}catch{throw new Error(`Invalid server response (HTTP ${response.status})`);}
  if(!response.ok){if(response.status===401)await chrome.storage.session.remove(SESSION_KEY);throw new Error(typeof data.detail==='string'?data.detail:`Server error (${response.status})`);}
  return data;
}
function sendToTab(id,msg){return new Promise((resolve,reject)=>chrome.tabs.sendMessage(id,msg,r=>{
  if(chrome.runtime.lastError)return reject(new Error(chrome.runtime.lastError.message));
  if(!r||r.ok===false)return reject(new Error(r?.error||'WhatsApp Web collector unavailable'));
  resolve(r);
}));}
const normalized=s=>String(s||'').replace(/[\u202a-\u202e\u2066-\u2069]/g,'').replace(/\s+/g,' ').trim().toLowerCase();
// Use the chat-list label (the requested chat identity), not the header subtitle.
// Some WhatsApp group headers contain comma-separated members instead of the group name.
function preferredTitle(requested,header){
  const fromList=String(requested||'').trim();
  const fromHeader=String(header||'').trim();
  const placeholder=/^(?:click here for contact info|contact info|chat|unknown|undefined)$/i;
  if(fromList && !placeholder.test(fromList))return fromList.slice(0,200);
  if(fromHeader && !placeholder.test(fromHeader) && fromHeader.split(',').length<=3)return fromHeader.slice(0,200);
  return fromList||fromHeader||'Unknown chat';
}
function visiblePhone(...values){
  for(const value of values){
    const raw=String(value||'').trim();
    if(!/^\+?[0-9 ()-]{7,25}$/.test(raw))continue;
    const cleaned=raw.replace(/[\s()-]/g,'');
    if(/^\+?[0-9]{7,18}$/.test(cleaned))return cleaned;
  }
  return ''; // Named contacts do not expose a phone number in the collector.
}


async function collectAndSync(){
  if(running)throw new Error('Another sync is running.');
  running=true;
  let plan=null;
  try{
    const a=await auth();
    if(!a?.token||a.user?.role!=='employee')throw new Error('Employee login required.');
    const tabs=await chrome.tabs.query({url:'https://web.whatsapp.com/*'});
    if(!tabs.length)throw new Error('Open WhatsApp Web and connect your authorized account.');
    const tab=tabs.find(t=>t.active)||tabs[0];
    // Server owns the checkpoint; device storage reset cannot trigger a new 8-day import.
    plan=await api('/sync/start','POST',{});
    const cutoffMs=Date.parse(plan.since_at);
    if(!Number.isFinite(cutoffMs))throw new Error('Invalid sync checkpoint returned by server.');
    const gap=Math.max(0,Date.now()-cutoffMs);
    // List scan receives an extra day for date-label edge cases. Message loader
    // still filters against the exact server-issued cutoff.
    const dayRange=Math.min(730,Math.max(1,Math.ceil(gap/86400000)+1));
    const read=await sendToTab(tab.id,{type:'GET_CHATS',dayRange});
    const unique=new Map();
    for(const item of Array.isArray(read.chats)?read.chats:[]){
      const value=item&&(item.id||item.title||item.name);
      if(value&&!unique.has(normalized(value)))unique.set(normalized(value),value);
    }
    const ids=[...unique.values()];
    const unread=Number(read.unreadCount)||0;
    let seen=0,saved=0,review=0;
    const post=async chats=>{
      const result=await api('/sync/chats','POST',{
        sync_run_id:plan.run_id,chats,unread_count:unread,
        window_hours:Math.max(1,Math.min(17544,Math.ceil(gap/3600000)))
      });
      seen+=result.conversations_seen;
      saved+=result.new_messages;
      review+=result.needs_review;
    };
    for(let i=0;i<ids.length;i+=30){
      const batch=ids.slice(i,i+30);
      const result=await sendToTab(tab.id,{type:'SCRAPE_CHATS',ids:batch,cutoffMs});
      const found=Array.isArray(result.chats)?result.chats:[];
      const missing=Array.isArray(result.skipped)?result.skipped:[];
      const processed=new Set();
      const rows=[];
      const names=new Map(batch.map(id=>[normalized(id),String(id)]));
      for(const c of found){
        const key=normalized(c.reqId||c.id||c.title);
        if(!names.has(key)||processed.has(key))continue;
        processed.add(key);
        const messages=Array.isArray(c.messages)?c.messages:[];
        rows.push({id:key,title:preferredTitle(names.get(key),c.title),
          contact_number:visiblePhone(c.contactNumber,c.contact_number,c.phone,names.get(key),c.title),
          messages:messages.map(m=>({sender:String(m.sender||'').slice(0,160),
            fromMe:Boolean(m.fromMe),text:String(m.text||'').slice(0,100000),
            timestamp:String(m.timestamp||'').slice(0,110),
            timestamp_ms:Number.isFinite(m.timestampMs)?m.timestampMs:null,
            timestamp_quality:String(m.timestampQuality||'unknown'),
            media:String(m.media||'').slice(0,90),mediaDuration:String(m.mediaDuration||'').slice(0,60),
            id:String(m.id||'').slice(0,200),source_message_id:String(m.sourceMessageId||'').slice(0,200)})),
          needs_review:messages.length===0,
          review_reason:messages.length?'':'No extractable messages; manual review required'});
      }
      for(const m of missing){const key=normalized(m.id||m.title||m.reqId);
        if(!names.has(key)||processed.has(key))continue;
        processed.add(key);rows.push({id:key,title:preferredTitle(names.get(key),''),
          contact_number:visiblePhone(names.get(key)),messages:[],needs_review:true,
          review_reason:String(m.error||'Unable to extract conversation').slice(0,290)});
      }
      for(const id of batch){const key=normalized(id);
        if(!processed.has(key))rows.push({id:key,title:preferredTitle(id,''),
          contact_number:visiblePhone(id),messages:[],needs_review:true,
          review_reason:'Collector did not return this chat'});
      }
      for(let j=0;j<rows.length;j+=15)await post(rows.slice(j,j+15));
    }
    if(!ids.length)await post([]);
    // No checkpoint advancement before every batch has been acknowledged.
    await api('/sync/finish','POST',{run_id:plan.run_id});
    // Audio is intentionally NOT awaited by the text sync; queue resumes separately.
    chrome.alarms.create(VOICE_KICK,{when:Date.now()+1500});
    const last={at:new Date().toISOString(),conversations:seen,newMessages:saved,
      needsReview:review,unreadExcluded:unread,initial:plan.initial};
    await chrome.storage.local.set({[LAST_KEY]:last});
    return {ok:true,...last};
  }finally{running=false;}
}
async function drainVoiceQueue(){
  if(voiceRunning || running)return;
  const user=await auth();if(!user?.token||user.user?.role!=='employee')return;
  voiceRunning=true;
  try{
    const tabs=await chrome.tabs.query({url:'https://web.whatsapp.com/*'});
    if(!tabs.length)return;
    const tab=tabs.find(t=>t.active)||tabs[0];
    const pending=(await api('/sync/voice-pending?limit=20')).voices||[];
    // Diagnostic only: never store audio bytes or message contents in Chrome.
    await chrome.storage.local.set({'csr.voiceStatus':{
      pending:pending.length,last_checked_at:new Date().toISOString(),
      state:pending.length?'processing':'idle'
    }});
    for(const voice of pending){
      try{
        // No global preload: one voice at a time, <=4MiB, bounded by content resolver.
        const result=await sendToTab(tab.id,{type:'CSR_FETCH_VOICE',sourceMessageId:voice.source_message_id});
        if(!result.dataUrl)throw new Error('No audio bytes available');
        await api('/sync/voice-upload','POST',{message_id:voice.message_id,data_url:result.dataUrl});
        await chrome.storage.local.set({'csr.voiceStatus':{
          state:'uploaded',last_checked_at:new Date().toISOString(),message_id:voice.message_id
        }});
      }catch(err){
        // Record a short reason for debugging; no contact IDs, no audio bytes.
        const reason=String(err?.message||err).slice(0,180);
        console.warn('CSR voice collection failed:',reason);
        await chrome.storage.local.set({'csr.voiceStatus':{
          state:'failed',last_checked_at:new Date().toISOString(),reason
        }});
        try{await api('/sync/voice-failure','POST',{
          message_id:voice.message_id,reason
        });}catch{}
      }
    }
  }catch(err){console.warn('CSR voice queue deferred:',err.message);}
  finally{voiceRunning=false;}
}
chrome.alarms.onAlarm.addListener(async alarm=>{
  if(alarm.name===ALARM){
    if(!(await auth())?.token)return;
    try{await collectAndSync();}catch(err){console.warn('CSR auto-sync deferred:',err.message);}
  }
  if(alarm.name===VOICE_ALARM||alarm.name===VOICE_KICK){
    await drainVoiceQueue();
  }
});
chrome.runtime.onMessage.addListener((msg,sender,respond)=>{
  if(!msg||!isUI(sender))return;
  (async()=>{
    switch(msg.type){
      case 'CSR_CONFIG':{
        if(msg.apiBase){const url=allowedBase(msg.apiBase);const prior=await chrome.storage.local.get([BASE_KEY]);
          if(prior[BASE_KEY]&&prior[BASE_KEY]!==url)await chrome.storage.session.remove(SESSION_KEY);
          await chrome.storage.local.set({[BASE_KEY]:url});}
        const stored=await chrome.storage.local.get([BASE_KEY,LAST_KEY]);
        return {apiBase:stored[BASE_KEY]||DEFAULT_API_BASE,lastSync:stored[LAST_KEY]||null};
      }
      case 'CSR_SIGNUP':return await api('/auth/signup','POST',msg.data);
      case 'CSR_LOGIN':{
        const result=await api('/auth/login','POST',msg.data);
        if(result.user?.role!=='employee')throw new Error('Admin accounts use the separate Admin Portal.');
        await chrome.storage.session.set({[SESSION_KEY]:{token:result.access_token,user:result.user}});
        // Re-arm after Chrome/extension restarts; voice transfers stay separate
        // from the successful text sync and retry only while WhatsApp is open.
        chrome.alarms.create(VOICE_ALARM,{periodInMinutes:1});
        chrome.alarms.create(VOICE_KICK,{when:Date.now()+2000});
        return {user:result.user};
      }
      case 'CSR_ME':{
        const a=await auth();if(!a)return {user:null};
        try{const user=await api('/auth/me');
          if(user.role!=='employee'){await chrome.storage.session.remove(SESSION_KEY);return {user:null};}
          await chrome.storage.session.set({[SESSION_KEY]:{token:a.token,user}});return {user};}
        catch(e){if(/expired|invalid/i.test(e.message))return {user:null};throw e;}
      }
      case 'CSR_LOGOUT':{try{await api('/auth/logout','POST',{});}catch{}
        await chrome.storage.session.remove(SESSION_KEY);return {done:true};}
      case 'CSR_DASHBOARD':return await api('/dashboard');
      case 'CSR_SYNC':{
        const result=await collectAndSync();
        chrome.alarms.create(VOICE_ALARM,{periodInMinutes:1});
        chrome.alarms.create(VOICE_KICK,{when:Date.now()+2000});
        return result;
      }
      default:throw new Error('Unsupported extension action');
    }
  })().then(data=>respond({ok:true,...data}),err=>respond({ok:false,error:err.message}));
  return true;
});
