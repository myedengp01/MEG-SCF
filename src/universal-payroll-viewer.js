/* MEG Universal Claim Management v2026.09.17-14:30
 * SCF Payroll / Account claim list: canonical status display only.
 * Preserves existing payment permissions, confirmation, undo and detail actions.
 */
(function(root){
 'use strict';
 let generation=0;
 function install(){
   if(typeof root.renderPayrollViewerList!=='function' || typeof root.MEGCreateSCFClaimViewModel!=='function') return false;
   if(root.renderPayrollViewerList.__megUniversalPayroll) return true;
   const original=root.renderPayrollViewerList;
   const wrapped=async function(){
     const run=++generation;
     const result=await original.apply(this,arguments);
     const list=root.document.getElementById('payrollViewerList');
     if(!list) return result;
     const rows=Array.from(list.querySelectorAll('.manage-list-item'));
     if(!rows.length) return result;
     const ids=rows.map(row=>{
       const action=row.getAttribute('onclick')||'';
       const match=action.match(/^togglePayrollClaimDetail\('([0-9a-f-]{36})'\)$/i);
       return match?match[1]:'';
     });
     let states;
     try{
       const client=typeof sb!=='undefined'?sb:root.sb;
       states=await root.MEGCreateSCFClaimViewModel(client).reconcile(ids.map(id=>({id})));
     }catch(error){
       console.error('SCF Payroll universal status unavailable',error);
       states=ids.map(id=>({id,universalStatusAvailable:false,universalStatus:null}));
     }
     if(run!==generation || !list.isConnected) return result;
     states.forEach((state,i)=>{
       const row=rows[i];
       if(!row || !row.isConnected) return;
       const previous=row.querySelector('.meg-universal-payroll-status');
       if(previous) previous.remove();
       const badge=root.document.createElement('div');
       badge.className='meg-universal-payroll-status';
       badge.style.cssText='font-size:12px;font-weight:700;margin-top:3px;';
       const known=state.universalStatusAvailable && state.universalStatus;
       badge.textContent=known
         ? (state.universalStatus.claimPaid?'Claim Paid':(state.universalStatus.displayStatus||'Status unavailable'))
         : 'Status unavailable — refresh or contact Finance';
       badge.style.color=known ? (state.universalStatus.claimPaid?'#237a46':'#805f14') : '#a52828';
       row.appendChild(badge);
     });
     return result;
   };
   wrapped.__megUniversalPayroll=true;
   root.renderPayrollViewerList=wrapped;
   return true;
 }
 root.MEGInstallSCFUniversalPayroll=install;
 install();
})(typeof window!=='undefined'?window:globalThis);
