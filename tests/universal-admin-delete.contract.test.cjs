'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync('src/universal-admin-delete.js','utf8');
const calls=[];const notices=[];let reason='Duplicate entry',approved=true,rejected=false,refreshes=0;
const root={
 prompt:()=>reason,confirm:()=>approved,alert:m=>notices.push(m),
 renderBrowseSubmissionsList:async()=>{refreshes++;},
 deleteSubmission:async()=>{throw Error('Legacy direct table deletion must not run');},
 sb:{rpc:async(name,args)=>{calls.push({name,args});return rejected?{data:null,error:{message:'Paid/ledger-linked claim blocked'}}:{data:{deleted:true},error:null};}}
};
vm.runInNewContext(source,{window:root,console});
(async()=>{
 assert.equal(root.deleteSubmission.__megAuditedAdminDelete,true);
 assert.equal(root.MEGInstallSCFAuditedAdminDelete(),true);
 assert.equal(await root.deleteSubmission('claim-1'),true);
 assert.equal(calls.length,1);
 assert.equal(calls[0].name,'meg_forms_admin_delete_claim');
 assert.deepEqual(JSON.parse(JSON.stringify(calls[0].args)),{p_form_code:'scf',p_submission_id:'claim-1',p_reason:'Duplicate entry'});
 assert.equal(refreshes,1);
 approved=false;assert.equal(await root.deleteSubmission('claim-2'),false);assert.equal(calls.length,1);
 approved=true;reason='  ';assert.equal(await root.deleteSubmission('claim-3'),false);assert.equal(calls.length,1);
 reason='Paid record';rejected=true;
 assert.equal(await root.deleteSubmission('claim-4'),false);assert.equal(calls.length,2);
 assert.ok(notices.some(s=>s.includes('Paid/ledger-linked claim blocked')));
 assert.equal(refreshes,1);
 assert.equal(/\.from\s*\(|\.delete\s*\(/.test(source),false,'No direct delete fallback');
 console.log('PASS SCF delete: audited RPC only, reason/confirm required, rejects paid records, no false success/no direct deletion');
})().catch(e=>{console.error(e);process.exitCode=1;});
