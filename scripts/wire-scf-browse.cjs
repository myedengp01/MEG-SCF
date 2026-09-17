'use strict';
// One-time, SHA-guarded feature-only patch. Never run against main or live claims.
const fs=require('node:fs');
const crypto=require('node:crypto');
const cp=require('node:child_process');
const branch=cp.execFileSync('git',['branch','--show-current'],{encoding:'utf8'}).trim();
if(branch!=='feature/universal-claims-v2026-09-17-1430') throw Error('Refusing to patch outside designated feature branch');
const file='index.html';
const before=fs.readFileSync(file);
const sha=crypto.createHash('sha1').update(`blob ${before.length}\0`).update(before).digest('hex');
if(sha!=='58f39ea3d2d517b9e30914d6fe8c563ff061f989') throw Error(`SCF index changed (${sha}); inspect/rebase instead of replacing concurrent edits`);
for(const target of ['src/universal-claim-view-model.js','src/universal-browse-viewer.js','src/universal-admin-delete.js']){
 if(!fs.existsSync(target)) throw Error(`Missing dependency: ${target}`);
}
const original=before.toString('utf8');
const marker='<script src="./src/universal-claim-view-model.js"></script>\n<script src="./src/universal-browse-viewer.js"></script>\n';
if(original.split(marker).length!==2) throw Error('Expected one existing read-only integration marker');
const inject='<script src="./src/universal-admin-delete.js"></script>\n';
if(original.includes(inject)) throw Error('Admin delete script already wired; refusing double insertion');
const tail=new RegExp('^'+marker.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'<\\/body>\\r?\\n<\\/html>\\r?\\n?$');
// Validate the exact suffix without changing any original bytes.
if(!original.slice(original.indexOf(marker)).match(/^<script src="\.\/src\/universal-claim-view-model\.js"><\/script>\n<script src="\.\/src\/universal-browse-viewer\.js"><\/script>\n<\/body>\r?\n<\/html>\r?\n?$/)) throw Error('Unexpected SCF HTML suffix');
const changed=original.replace(marker,marker+inject);
if(changed.length!==original.length+inject.length) throw Error('Patch length validation failed');
fs.writeFileSync(file,changed);
console.log('PASS SCF SHA guard; appended audited Admin Delete module only');
