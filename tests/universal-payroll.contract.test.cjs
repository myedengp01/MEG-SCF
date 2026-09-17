'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const ids=['11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222222','33333333-3333-4333-8333-333333333333'];
function item(id){const badges=[];return {isConnected:true,badges,getAttribute:key=>key==='onclick'?`togglePayrollClaimDetail('${id}')`:null,querySelector:s=>s==='.meg-universal-payroll-status'?badges.at(-1)||null:null,appendChild:b=>{badges.push(b);b.remove=()=>{const at=badges.indexOf(b);if(at>=0)badges.splice(at,1);};}};}
const items=ids.map(item);
const list={isConnected:true,querySelectorAll:s=>s==='.manage-list-item'?items:[]};
const calls=[];
const root={document:{getElementById:id=>id==='payrollViewerList'?list:null,createElement:()=>({textContent:'',style:{}})},sb:{rpc:async(name,args)=>{calls.push({name,args});return {error:null,data:[{form_code:'scf',submission_id:ids[0],workflow_status:'submitted',display_status:'Claim Paid',payment_status:'done',claim_paid:true,can_mark_paid:false},{form_code:'scf',submission_id:ids[1],workflow_status:'submitted',display_status:'Pending Payment',payment_status:'pending',claim_paid:false,can_mark_paid:false}]};}},renderPayrollViewerList:async()=>undefined};
const ctx={window:root,console};
vm.runInNewContext(fs.readFileSync('src/universal-claim-view-model.js','utf8'),ctx);
vm.runInNewContext(fs.readFileSync('src/universal-payroll-viewer.js','utf8'),ctx);
(async()=>{
 assert.equal(root.renderPayrollViewerList.__megUniversalPayroll,true);
 await root.renderPayrollViewerList();
 assert.equal(items[0].badges[0].textContent,'Claim Paid');
 assert.equal(items[1].badges[0].textContent,'Pending Payment');
 assert.match(items[2].badges[0].textContent,/Status unavailable/);
 assert.equal(calls.length,1);
 assert.equal(calls[0].name,'meg_forms_claim_status_batch');
 assert.equal(calls[0].args.p_form_code,'scf');
 await root.renderPayrollViewerList();
 assert.equal(items.every(r=>r.badges.length===1),true);
 assert.equal(/\.rpc\(['"](?:scf_set_payment_status|meg_forms_set_payment_done)/.test(fs.readFileSync('src/universal-payroll-viewer.js','utf8')),false);
 console.log('PASS SCF Payroll: canonical paid/pending, unknown fail-closed, one batch, no duplicate badges, no payment writes');
})().catch(e=>{console.error(e);process.exitCode=1;});
