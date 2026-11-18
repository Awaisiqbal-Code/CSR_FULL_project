const fs=require('fs'),vm=require('vm'),assert=require('assert');
const src=fs.readFileSync(require('path').join(__dirname,'../extension/content.js'),'utf8');
const begin=src.indexOf('  function __csrDirectionEvidence(row) {');
const end=src.indexOf('  function __lovStampMs(msg, order)',begin);
assert(begin>0&&end>begin);
const code=src.slice(begin,end);
let key='';const root={getBoundingClientRect(){return {width:1000,left:0,right:1000}}};
const ctx={__csrTrustedMessageId:()=>key,document:{querySelector:()=>root}};
vm.createContext(ctx);vm.runInContext(code,ctx);
function node({klass='',nested='',rect=null}={}){
 return {id:'',parentElement:null,classList:{contains:k=>klass===k},querySelector:s=>nested===s||nested==='out'&&s==='.message-out'||nested==='in'&&s==='.message-in'?{}:null,
 getBoundingClientRect:()=>rect||{width:200,left:750,right:950}};
}
key='true_123456789';assert.equal(ctx.__csrDirectionEvidence(node()).fromMe,true);
key='false_123456789';assert.equal(ctx.__csrDirectionEvidence(node({klass:'message-out'})).fromMe,false);
key='';assert.equal(ctx.__csrDirectionEvidence(node({klass:'message-out'})).fromMe,true);
assert.equal(ctx.__csrDirectionEvidence(node({klass:'message-in'})).fromMe,false);
assert.equal(ctx.__csrDirectionEvidence(node({rect:{width:180,left:760,right:940}})).fromMe,true);
assert.equal(ctx.__csrDirectionEvidence(node({rect:{width:180,left:60,right:240}})).fromMe,false);
assert.equal(ctx.__csrDirectionEvidence(node({rect:{width:200,left:390,right:590}})).fromMe,null);
console.log('v4.7 source-direction cases passed');
