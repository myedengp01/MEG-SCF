'use strict';
const fs=require('node:fs');
const cp=require('node:child_process');
const assert=require('node:assert/strict');
assert.equal(cp.execFileSync('git',['branch','--show-current'],{encoding:'utf8'}).trim(),'feature/universal-claims-v2026-09-17-1430');
const path='index.html';
const html=fs.readFileSync(path,'utf8');
assert.equal(cp.execFileSync('git',['hash-object',path],{encoding:'utf8'}).trim(),'d912a1e895f4654953e6f4135a2b47858801eb60','Unexpected SCF index; stop and inspect');
const patches=[
[`function openReceiptPanel(tr){\n  currentReceiptRow = tr;`,`async function openReceiptPanel(tr){\n  // Persist all edited rows BEFORE launching a mobile camera/gallery. A mobile\n  // browser may suspend or discard the page while its native picker is open.\n  if(!tr || !tr.isConnected) return;\n  const status = document.getElementById('receiptStatus');\n  status.textContent = 'Saving claim before opening receipts…';\n  const draftId = await persistReceiptDraft();\n  if(!draftId){ status.textContent = 'Claim was not saved. Please save the draft before attaching a photo.'; alert(status.textContent); return; }\n  if(!tr.isConnected || currentDraftId !== draftId) return;\n  currentReceiptRow = tr;`],
[`async function uploadReceiptBlob(blob, isA4){`,`async function persistReceiptDraft(){\n  if(!currentUser || !currentPerm?.can_submit || paidReadOnlyMode || adminEditingSubmittedId) return null;\n  try{\n    const record = await ensureSubmissionRecord();\n    if(record.status !== 'draft' || record.submitted_by !== currentUser.id) return null;\n    const payload = buildSubmissionPayload('draft');\n    payload.submitted_at = null;\n    const {data,error} = await sb.from('scf_submissions').update(payload)\n      .eq('id',record.id).eq('submitted_by',currentUser.id).eq('status','draft')\n      .select('id,serial_no,status');\n    if(error || !data?.[0]){ console.error('SCF receipt draft persistence rejected',error); return null; }\n    currentDraftId=data[0].id;\n    setSerialNo(data[0].serial_no || getCurrentSerialNo(),true);\n    setScfCompanyIdentityLocked(true);\n    return data[0].id;\n  }catch(error){ console.error('SCF receipt draft persistence failed',error); return null; }\n}\n\nasync function uploadReceiptBlob(blob, isA4){`],
[`    await renderReceiptThumbs();\n    statusEl.textContent = 'Attached.';`,`    const persistedId = await persistReceiptDraft();\n    if(persistedId !== draftId){\n      statusEl.textContent = 'Photo uploaded but attachment was NOT saved to the claim. Keep this page open and use Save Draft; do not submit yet.';\n      return;\n    }\n    await renderReceiptThumbs();\n    statusEl.textContent = 'Attached and saved.';`]
];
let next=html;
for(const [oldText,newText] of patches){assert.equal(next.split(oldText).length,2,'Missing or duplicate target: '+oldText.slice(0,60));next=next.replace(oldText,newText);}
assert.equal((next.match(/async function persistReceiptDraft\(/g)||[]).length,1);
assert.notEqual(next,html);
fs.writeFileSync(path,next);
console.log('SCF receipt guard: persist complete draft before camera/gallery and persist receipt references after upload. Feature branch only.');
