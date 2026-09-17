/* MEG Universal Claim Management v2026.09.17-14:30
 * Replace SCF Browse's misleading direct table DELETE with audited RPC.
 * Server validates authenticated per-form Admin, paid/ledger restrictions and writes audit.
 * This module does not delete records itself; no hidden fallback to table.delete().
 */
(function(root){
 'use strict';
 function install(){
   if(typeof root.deleteSubmission!=='function') return false;
   if(root.deleteSubmission.__megAuditedAdminDelete) return true;
   root.deleteSubmission=async function(id){
     const submissionId=String(id||'').trim();
     if(!submissionId){root.alert('A claim ID is required.');return false;}
     // UI guard is advisory. RPC itself is the only authority.
     if(typeof currentPerm!=='undefined' && (!currentPerm || currentPerm.is_admin!==true)){
       root.alert('SCF Admin permission is required to delete a claim.');return false;
     }
     const reason=root.prompt('Enter a reason for deleting this claim (audit history required):');
     if(reason===null) return false;
     if(String(reason).trim().length<3){root.alert('A deletion reason of at least 3 characters is required.');return false;}
     if(!root.confirm('Permanently delete this claim? Paid, completed or ledger-linked claims are blocked by the server. An audit record will be retained.')) return false;
     try{
       // Classic SCF script defines a global lexical const sb, not window.sb.
       const client=typeof sb!=='undefined'?sb:root.sb;
       if(!client || typeof client.rpc!=='function') throw new Error('Database connection unavailable');
       const {data,error}=await client.rpc('meg_forms_admin_delete_claim',{
         p_form_code:'scf',p_submission_id:submissionId,p_reason:String(reason).trim()
       });
       if(error) throw error;
       if(!data || data.deleted!==true){
         root.alert('Claim was not deleted; it may no longer exist.');
         if(typeof root.renderBrowseSubmissionsList==='function') await root.renderBrowseSubmissionsList();
         return false;
       }
       if(typeof currentDraftId!=='undefined' && String(currentDraftId)===submissionId){
         currentDraftId=null;
         if(typeof adminEditingSubmittedId!=='undefined') adminEditingSubmittedId=null;
         if(typeof serialLocked!=='undefined') serialLocked=false;
         if(typeof setScfCompanyIdentityLocked==='function') setScfCompanyIdentityLocked(false);
       }
       root.alert('Claim deleted. Audit history retained.');
       if(typeof root.renderBrowseSubmissionsList==='function') await root.renderBrowseSubmissionsList();
       return true;
     }catch(error){
       root.alert('Delete rejected: '+(error?.message||String(error)));
       return false;
     }
   };
   root.deleteSubmission.__megAuditedAdminDelete=true;
   return true;
 }
 root.MEGInstallSCFAuditedAdminDelete=install;
 install();
})(typeof window!=='undefined'?window:globalThis);
