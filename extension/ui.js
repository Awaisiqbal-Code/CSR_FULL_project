/* Employee-only UI. No admin, reporting, chatbot, team or settings screens. */
'use strict';
const $=id=>document.getElementById(id);
let employee=null;
function visible(id){for(const key of ['auth','workspace'])$(key).classList.toggle('hidden',key!==id);}
function notice(msg,bad=false){const n=$('notice');n.textContent=msg;n.classList.toggle('error',bad);n.classList.remove('hidden');}
function clear(){ $('notice').classList.add('hidden'); }
function ask(type,extra={}){return new Promise((resolve,reject)=>chrome.runtime.sendMessage({type,...extra},result=>{
  if(chrome.runtime.lastError)return reject(new Error(chrome.runtime.lastError.message));
  if(!result?.ok)return reject(new Error(result?.error||'Backend unavailable'));
  resolve(result);
}));}
async function withBusy(button,fn){button.disabled=true;clear();try{await fn();}catch(e){notice(e.message,true);}finally{button.disabled=false;}}
function employeeId(user){const match=String(user.employee_code||user.id||'').match(/^(?:EMP-)?0*(\d+)(-\d+)?$/i);return match?match[1].padStart(3,'0')+(match[2]||''):String(user.id||'');}
async function stats(){const d=await ask('CSR_DASHBOARD');$('metric-chats').textContent=d.chats;$('metric-messages').textContent=d.messages;$('metric-unread').textContent=d.unread_excluded;
  $('sync-summary').textContent=d.last_sync_at?`Last saved sync: ${new Date(d.last_sync_at).toLocaleString()}`:'No sync saved yet. WhatsApp Web must be open.';
}
async function workspace(user){
  if(user.role!=='employee')throw new Error('Admin accounts use the Admin Web Portal.');
  employee=user;visible('workspace');$('hello').textContent=`Welcome, ${user.name.split(' ')[0]}`;
  $('identity-line').textContent=`Employee ${employeeId(user)} · ${user.email}`;
  await stats();
}
async function init(){try{
  // Backend URL is hardcoded in background.js (DEFAULT_API_BASE); no setup screen.
  const me=await ask('CSR_ME');if(me.user)await workspace(me.user);else visible('auth');
}catch(e){visible('auth');notice(e.message,true);}}
function mode(signup){$('login-form').classList.toggle('hidden',signup);$('signup-form').classList.toggle('hidden',!signup);$('forgot-form').classList.add('hidden');$('mode-signup').classList.toggle('selected',signup);$('mode-login').classList.toggle('selected',!signup);}
$('mode-login').onclick=()=>mode(false);$('mode-signup').onclick=()=>mode(true);
// Eye toggle: reveal/hide the typed password on the login and signup forms.
function wirePasswordEye(inputId,btnId){const input=$(inputId),btn=$(btnId);if(!input||!btn)return;
 btn.onclick=()=>{const show=input.type==='password';input.type=show?'text':'password';btn.textContent=show?'Hide':'Show';btn.setAttribute('aria-label',(show?'Hide':'Show')+' password');};}
wirePasswordEye('login-password','login-eye');wirePasswordEye('sign-password','sign-eye');wirePasswordEye('forgot-password','forgot-eye');
// Forgot password: submit a NEW password that waits for admin approval before it works.
$('forgot-link').onclick=()=>{$('login-form').classList.add('hidden');$('signup-form').classList.add('hidden');$('forgot-form').classList.remove('hidden');};
$('forgot-back').onclick=()=>mode(false);
$('forgot-form').addEventListener('submit',e=>{e.preventDefault();withBusy($('forgot-form').querySelector('.primary'),async()=>{
  const pw=$('forgot-password').value,cf=$('forgot-confirm').value;
  if(pw.length<8){notice('New password must be at least 8 characters',true);return;}
  if(pw!==cf){notice('Passwords do not match',true);return;}
  const r=await ask('CSR_FORGOT_PASSWORD',{data:{email:$('forgot-email').value.trim(),new_password:pw}});
  $('forgot-password').value='';$('forgot-confirm').value='';mode(false);
  notice(r.message||'Password change requested. It will work after an admin approves it.');
});});
$('login-form').addEventListener('submit',e=>{e.preventDefault();withBusy($('login-form').querySelector('button'),async()=>{
  const r=await ask('CSR_LOGIN',{data:{email:$('login-email').value.trim(),password:$('login-password').value}});
  $('login-password').value='';await workspace(r.user);
});});
$('signup-form').addEventListener('submit',e=>{e.preventDefault();withBusy($('signup-form').querySelector('button'),async()=>{
  const data={full_name:$('sign-name').value,email:$('sign-email').value,phone:$('sign-phone').value,
    whatsapp_number:$('sign-wa').value,department:$('sign-dept').value,designation:$('sign-designation').value,
    password:$('sign-password').value};
  const r=await ask('CSR_SIGNUP',{data});$('sign-password').value='';mode(false);
  notice(`Signup received. Employee ID: ${employeeId({id:r.user_id,employee_code:r.employee_code})}. Admin approval is required.`);
});});
$('logout').onclick=()=>withBusy($('logout'),async()=>{await ask('CSR_LOGOUT');employee=null;visible('auth');notice('Signed out.');});
$('refresh-dashboard').onclick=()=>withBusy($('refresh-dashboard'),async()=>{await stats();notice('Statistics refreshed.');});
$('sync-now').onclick=()=>withBusy($('sync-now'),async()=>{
  const data=await ask('CSR_SYNC');await stats();
  notice(`Chats synchronized successfully. ${data.newMessages} new messages saved.`);
});
$('fullpage').onclick=()=>chrome.tabs.create({url:chrome.runtime.getURL('popup.html')});
init();
