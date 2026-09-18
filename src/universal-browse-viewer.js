/* MEG Universal Claim Management v2026.09.17-14:30
 * SCF Browse Submissions: read-only canonical payment labels only.
 * Requires the original index.html and src/universal-claim-view-model.js first.
 * This intentionally does NOT change legacy confirm/undo/edit/delete permissions.
 */
(function(root){
  'use strict';
  let renderGeneration=0;
  function install(){
    if(typeof root.renderBrowseSubmissionsList!=='function' ||
       typeof root.MEGCreateSCFClaimViewModel!=='function') return false;
    if(root.renderBrowseSubmissionsList.__megUniversalStatus) return true;
    const original=root.renderBrowseSubmissionsList;
    const wrapped=async function(){
      const generation=++renderGeneration;
      const result=await original.apply(this,arguments);
      const list=root.document.getElementById('browseSubmissionsList');
      if(!list) return result;
      const rows=Array.from(list.querySelectorAll('.manage-list-item'));
      if(!rows.length) return result;
      const ids=rows.map(row=>{
        const button=row.querySelector('button[onclick*="loadSubmissionForEdit"],button[onclick*="loadPaidSubmissionReadOnly"]');
        const action=button?.getAttribute('onclick')||'';
        const match=action.match(/(?:loadSubmissionForEdit|loadPaidSubmissionReadOnly)\('([0-9a-f-]{36})'\)/i);
        return match?match[1]:'';
      });
      let resolved;
      try{
        // Existing classic script declares global lexical const sb, not window.sb.
        const client=typeof sb!=='undefined'?sb:root.sb;
        resolved=await root.MEGCreateSCFClaimViewModel(client).reconcile(ids.map(id=>({id})));
      }catch(error){
        console.error('SCF Browse Submissions status read failed',error);
        resolved=ids.map(id=>({id,universalStatusAvailable:false,universalStatus:null}));
      }
      if(generation!==renderGeneration || !list.isConnected) return result;
      resolved.forEach((entry,index)=>{
        const row=rows[index];
        if(!row?.isConnected) return;
        const old=row.querySelector('.meg-universal-status');
        if(old) old.remove();
        const badge=root.document.createElement('div');
        badge.className='meg-universal-status';
        badge.style.cssText='font-size:12px;font-weight:700;margin-top:3px;';
        badge.textContent=entry.universalStatusAvailable && entry.universalStatus
          ? (entry.universalStatus.claimPaid?'Claim Paid':(entry.universalStatus.displayStatus||'Status unavailable'))
          : 'Status unavailable — refresh or contact Finance';
        badge.style.color=entry.universalStatusAvailable
          ? (entry.universalStatus.claimPaid?'#237a46':'#805f14'):'#a52828';
        row.appendChild(badge);
      });
      return result;
    };
    wrapped.__megUniversalStatus=true;
    root.renderBrowseSubmissionsList=wrapped;
    return true;
  }
  root.MEGInstallSCFUniversalBrowse=install;
  install();
})(typeof window!=='undefined'?window:globalThis);
