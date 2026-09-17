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
if(sha!=='55d6b39d701b7e7b24002a145ee3c72115997094') throw Error(`SCF index changed (${sha}); inspect/rebase instead of replacing concurrent edits`);
for(const target of ['src/universal-claim-view-model.js','src/universal-browse-viewer.js','src/universal-admin-delete.js','src/universal-payroll-viewer.js']){
 if(!fs.existsSync(target)) throw Error(`Missing dependency: ${target}`);
}
const original=before.toString('utf8');
const ending='<script src="./src/universal-claim-view-model.js"></script>\n<script src="./src/universal-browse-viewer.js"></script>\n<script src="./src/universal-admin-delete.js"></script>\n';
if(original.split(ending).length!==2) throw Error('Expected exactly one current integration suffix');
const suffix=original.slice(original.indexOf(ending));
if(!/^<script src="\.\/src\/universal-claim-view-model\.js"><\/script>\n<script src="\.\/src\/universal-browse-viewer\.js"><\/script>\n<script src="\.\/src\/universal-admin-delete\.js"><\/script>\n<\/body>\r?\n<\/html>\r?\n?$/.test(suffix)) throw Error('Unexpected HTML suffix');
const inject='<script src="./src/universal-payroll-viewer.js"></script>\n';
if(original.includes(inject)) throw Error('Payroll status script already wired');
const changed=original.replace(ending,ending+inject);
if(changed.length!==original.length+inject.length) throw Error('Patch length validation failed');
fs.writeFileSync(file,changed);
console.log('PASS SCF SHA guard; appended only read-only Payroll status script');
