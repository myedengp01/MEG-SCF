'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const IDs=['11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222222','33333333-3333-4333-8333-333333333333'];
function item(id){
 const badge=[];
 return {isConnected:true,badge,
   querySelector(selector){
     if(selector==='.meg-universal-status') return badge.at(-1)||null;
     if(selector.includes('button[onclick')) return {getAttribute:()=>`loadSubmissionForEdit('${id}')`};
     return null;
   },
   appendChild(el){badge.push(el);el.remove=()=>{const at=badge.indexOf(el);if(at>=0)badge.splice(at,1);};}
 };
}
const rows=IDs.map(item);
const list={isConnected:true,querySelectorAll:s=>s==='.manage-list-item'?rows:[]};
const calls=[];
const client={rpc:async (name,args)=>{
 calls.push({name,args});
 return {error:null,data:[
   {form_code:'scf',submission_id:IDs[0],workflow_status:'submitted',display_status:'Claim Paid',payment_status:'done',claim_paid:true,can_mark_paid:false},
   {form_code:'scf',submission_id:IDs[1],workflow_status:'submitted',display_status:'Pending Payment',payment_status:'pending',claim_paid:false,can_mark_paid:true}
 ]};
}};
const root={document:{getElementById:id=>id==='browseSubmissionsList'?list:null,createElement:()=>({textContent:'',style:{}})},
 sb:client,renderBrowseSubmissionsList:async()=>undefined};
const ctx={window:root,console};
vm.runInNewContext(fs.readFileSync('src/universal-claim-view-model.js','utf8'),ctx);
vm.runInNewContext(fs.readFileSync('src/universal-browse-viewer.js','utf8'),ctx);
(async()=>{
 assert.equal(root.renderBrowseSubmissionsList.__megUniversalStatus,true);
 await root.renderBrowseSubmissionsList();
 assert.equal(rows[0].badge[0].textContent,'Claim Paid');
 assert.equal(rows[1].badge[0].textContent,'Pending Payment');
 assert.match(rows[2].badge[0].textContent,/Status unavailable/);
 assert.equal(calls.length,1);
 assert.equal(calls[0].name,'meg_forms_claim_status_batch');
 assert.equal(calls[0].args.p_form_code,'scf');
 assert.equal(calls[0].args.p_submission_ids.length,3);
 await root.renderBrowseSubmissionsList();
 assert.equal(rows.every(r=>r.badge.length===1),true);
 assert.equal(typeof root.deleteSubmission,'undefined');
 console.log('PASS SCF browse: canonical paid/pending, unknown fail-closed, one batch, no duplicate badges, no writes');
})().catch(e=>{console.error(e);process.exitCode=1;});
