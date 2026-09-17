'use strict';
// One-time, SHA-guarded feature-branch patch. Never run against main or live claims.
const fs=require('node:fs');
const crypto=require('node:crypto');
const cp=require('node:child_process');
const branch=cp.execFileSync('git',['branch','--show-current'],{encoding:'utf8'}).trim();
if(branch!=='feature/universal-claims-v2026-09-17-1430') throw Error('Refusing to patch outside designated feature branch');
const file='index.html';
const before=fs.readFileSync(file);
const sha=crypto.createHash('sha1').update(`blob ${before.length}\0`).update(before).digest('hex');
if(sha!=='2580653d3945964f4002b38db206142cce35b27c') throw Error(`SCF index changed (${sha}); inspect/rebase instead of replacing concurrent edits`);
for(const target of ['src/universal-claim-view-model.js','src/universal-browse-viewer.js']){
 if(!fs.existsSync(target)) throw Error(`Missing dependency: ${target}`);
}
const original=before.toString('utf8');
const ending=/<\/body>\r?\n<\/html>\r?\n?$/;
if(!ending.test(original)) throw Error('Unexpected SCF HTML end; refusing patch');
const inject='<script src="./src/universal-claim-view-model.js"></script>\n<script src="./src/universal-browse-viewer.js"></script>\n';
if(original.includes(inject)) throw Error('Scripts already wired; refusing double insertion');
const changed=original.replace(ending,match=>inject+match);
if(changed===original || changed.length!==original.length+inject.length) throw Error('Patch validation failed');
fs.writeFileSync(file,changed);
console.log('PASS SCF index SHA guard; appended only two read-only development scripts');
