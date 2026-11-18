// Node.js smoke tests for employee-only extension, 8-day initial sync and incremental sync.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync(__dirname+'/../extension/background.js','utf8');
const local={'csr.apiBase':'http://127.0.0.1:8000'};
const session={};const routes=[];const collector=[];
let listener=null;let lastSuccess=null;let nextRun=1;let fail=false;
const hooks={};
const chrome={
 runtime:{getURL:s=>'chrome-extension://abc/'+s,onInstalled:{addListener:fn=>hooks.install=fn},onStartup:{addListener:fn=>hooks.startup=fn},onMessage:{addListener:fn=>listener=fn}},
 sidePanel:{setPanelBehavior:async()=>{}},
 storage:{local:{get:async keys=>Object.fromEntries((Array.isArray(keys)?keys:[keys]).map(k=>[k,local[k]])),set:async data=>Object.assign(local,data),remove:async key=>delete local[key]},session:{get:async keys=>Object.fromEntries(keys.map(k=>[k,session[k]])),set:async data=>Object.assign(session,data),remove:async key=>delete session[key]}},
 alarms:{create:()=>{},onAlarm:{addListener:fn=>hooks.alarm=fn}},
 tabs:{query:async()=>[{id:1,active:true}],sendMessage:(_tab,payload,cb)=>{
   collector.push(payload);
   if(payload.type==='GET_CHATS')cb({ok:true,chats:[{id:'A',title:'Customer A'},{id:'B',title:'Customer B'}],unreadCount:2});
   else if(payload.type==='SCRAPE_CHATS')cb({ok:true,chats:[{reqId:'A',title:'Customer A',messages:[{sender:'Customer',text:'Scholarship?',timestampMs:Date.now(),timestampQuality:'exact'}]}],skipped:[{id:'B',error:'Not available'}]});
   else cb({ok:false,error:'Unexpected message'});
 }}
};
const fixedNow=Date.now();
async function fetchStub(url,options){const path=url.replace('http://127.0.0.1:8000','');const data=options.body?JSON.parse(options.body):{};routes.push({path,data,method:options.method});
 if(path==='/auth/login')return response({access_token:'employee-token',user:{id:4,name:'Ali',employee_code:'EMP-00000004',role:'employee'}});
 if(path==='/auth/me')return response({id:4,name:'Ali',role:'employee'});
 if(path==='/sync/start'){
   const d=new Date();const cutoff=lastSuccess?new Date(lastSuccess-5*60*1000):new Date(d.getTime()-8*86400000);
   return response({run_id:'run-'+nextRun++,since_at:cutoff.toISOString(),until_at:d.toISOString(),initial:lastSuccess===null});
 }
 if(path==='/sync/chats')return fail?response({detail:'Test network failure'},500):response({conversations_seen:data.chats.length,new_messages:1,needs_review:1});
 if(path==='/sync/finish'){lastSuccess=Date.now();return response({ok:true,completed_at:new Date(lastSuccess).toISOString()});}
 if(path==='/dashboard')return response({chats:2,messages:1,unread_excluded:2});
 if(path.startsWith('/sync/voice-pending'))return response({voices:[{message_id:12,source_message_id:'true_test_voice_id'}]});
 if(path==='/sync/voice-failure')return response({status:'retry',attempts:1});
 return response({detail:'unsupported'},404);
}
function response(data,status=200){return {ok:status<400,status,json:async()=>data};}
vm.runInNewContext(source,{chrome,fetch:fetchStub,Date,console,Promise,Error,Number,String,Math,JSON,Set,Map,encodeURIComponent});
function message(type,extra={},url='chrome-extension://abc/popup.html'){
 return new Promise((resolve,reject)=>{
  const out=listener({type,...extra},{url},value=>resolve(value));
  if(out!==true)resolve({ignored:true});
 });
}
(async()=>{
 assert.equal((await message('CSR_CONFIG')).apiBase,'http://127.0.0.1:8000');
 await message('CSR_LOGIN',{data:{email:'ali@example.com',password:'test'}});
 const first=await message('CSR_SYNC');assert.equal(first.ok,true,first.error);assert.equal(first.initial,true);
 const firstPayload=collector.filter(c=>c.type==='GET_CHATS')[0];assert.ok(firstPayload.dayRange>=8 && firstPayload.dayRange<=10,`unexpected first window ${firstPayload.dayRange}`);
 const scrape=collector.find(c=>c.type==='SCRAPE_CHATS');assert.equal(scrape.ids.length,2);assert.ok(Number.isFinite(scrape.cutoffMs));
 assert.equal(routes.filter(x=>x.path==='/sync/finish').length,1);
 const upload=routes.find(x=>x.path==='/sync/chats');assert.equal(upload.data.unread_count,2);assert.equal(upload.data.chats[1].needs_review,true);assert.ok(upload.data.sync_run_id);
 const second=await message('CSR_SYNC');assert.equal(second.ok,true,second.error);assert.equal(second.initial,false);
 const later=collector.filter(x=>x.type==='GET_CHATS').at(-1);assert.ok(later.dayRange<=2,`unexpected incremental window ${later.dayRange}`);
 fail=true;const broken=await message('CSR_SYNC');assert.equal(broken.ok,false);assert.equal(routes.filter(x=>x.path==='/sync/finish').length,2,'failed sync must not advance watermark');
 assert.equal((await message('CSR_DASHBOARD')).chats,2);
 assert.equal((await message('CSR_AUDIT_CREATE')).ok,false,'employees do not have reporting actions');
 assert.equal(listener({type:'CSR_SYNC'},{url:'https://web.whatsapp.com/'},()=>{}),undefined,'content script cannot read privileged tokens');
 assert.equal(source.includes('CSR_AUTO'),false,'employee cannot change auto sync');
 await hooks.alarm({name:'csr-voice-1m'});
 assert.equal(local['csr.voiceStatus'].state,'failed','Voice queue must distinguish an actual audio-fetch failure from a never-attempted pending record');
 assert.ok(local['csr.voiceStatus'].reason,'Failure reason is available for troubleshooting');
 console.log('PASS employee-only auth, initial 8-day import, incremental cutoff, failed-sync checkpoint safety, no privileged admin actions');
})().catch(err=>{console.error(err);process.exit(1);});
