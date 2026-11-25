const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');
const root=path.resolve(__dirname,'..');const html=fs.readFileSync(path.join(root,'index.html'),'utf8');const js=fs.readFileSync(path.join(root,'admin.js'),'utf8');
for(const id of ['top-tabs','chats','chat-list','chat-detail','chats-employee','chats-range','chat-search','chats-create-audit'])
 assert.match(html,new RegExp(`id="${id}"`),`${id} missing`);
// Classification was removed from the chat section (now audit-only): no status filter.
assert.doesNotMatch(html,/id="chats-status"/,'status filter must be gone');
assert.match(html,/admin\.js\?v=4.20/);assert.match(html,/styles\.css\?v=4.20/);
assert.match(js,/\/conversations\?'/);assert.match(js,/q\.set\('search'/);
assert.match(js,/\/admin\/voices\//);assert.match(js,/URL\.createObjectURL/);
assert.match(js,/clearVoicePlayback/);
console.log('PASS reference-style Chats shell and authenticated voice playback workflow');
