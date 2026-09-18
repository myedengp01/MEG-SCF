'use strict';
const fs=require('node:fs');
const assert=require('node:assert/strict');
const cp=require('node:child_process');
const html=fs.readFileSync('index.html','utf8');
assert.equal(cp.execFileSync('git',['hash-object','index.html'],{encoding:'utf8'}).trim(),'2580653d3945964f4002b38db206142cce35b27c','Production baseline changed; abort');
const changes=[
["      }else{\n        SCF12_resetForNewClaim();\n      }\n\n      return result;", "      }else{\n        // Mobile auth can reinitialize while a draft is open; never discard it.\n        const existingDraft = Boolean(currentDraftId || adminEditingSubmittedId);\n        const unsavedItems = typeof formHasUnsavedWork === 'function' && formHasUnsavedWork();\n        if(!existingDraft && !unsavedItems) SCF12_resetForNewClaim();\n      }\n\n      return result;"],
["function openReceiptPanel(tr){\n  currentReceiptRow = tr;", "async function openReceiptPanel(tr){\n  if(!tr || !tr.isConnected) return;\n  const draftId = await persistReceiptDraft();\n  if(!draftId){ alert('Unable to save draft. Camera/gallery will not open until the claim is saved.'); return; }\n  if(!tr.isConnected || currentDraftId !== draftId) return;\n  currentReceiptRow = tr;"],
["async function uploadReceiptBlob(blob, isA4){", "async function persistReceiptDraft(){\n  if(!currentUser || !currentPerm?.can_submit || paidReadOnlyMode || adminEditingSubmittedId) return null;\n  try{\n    const record = await ensureSubmissionRecord();\n    if(record.status !== 'draft' || record.submitted_by !== currentUser.id) return null;\n    const payload = buildSubmissionPayload('draft');\n    payload.submitted_at = null;\n    const {data,error} = await sb.from('scf_submissions').update(payload)\n      .eq('id',record.id).eq('submitted_by',currentUser.id).eq('status','draft')\n      .select('id,serial_no,status');\n    if(error || !data?.[0]){ console.error('SCF draft save rejected',error); return null; }\n    currentDraftId=data[0].id;\n    setSerialNo(data[0].serial_no || getCurrentSerialNo(),true);\n    setScfCompanyIdentityLocked(true);\n    return data[0].id;\n  }catch(error){ console.error('SCF draft save failed',error); return null; }\n}\n\nasync function uploadReceiptBlob(blob, isA4){"],
["    await renderReceiptThumbs();\n    statusEl.textContent = 'Attached.';", "    const persistedId = await persistReceiptDraft();\n    if(persistedId !== draftId){\n      statusEl.textContent = 'Photo uploaded but claim save failed. Keep this page open and save the draft.';\n      return;\n    }\n    await renderReceiptThumbs();\n    statusEl.textContent = 'Attached and saved.';"],
['const VERSION_STAMP    = "MEG-FORMS-SCF v2026.09.15-12:00";','const VERSION_STAMP    = "MEG-FORMS-SCF v2026.09.18-13:00";']
];
let out=html;
for(const [before,after] of changes){assert.equal(out.split(before).length,2,'Missing or duplicate target: '+before.slice(0,70));out=out.replace(before,after);}
assert.match(out,/let paidReadOnlyMode\s*=/);
assert.match(out,/function buildSubmissionPayload\(/);
assert.match(out,/function setScfCompanyIdentityLocked\(/);
fs.writeFileSync('index.html',out);
const version=JSON.parse(fs.readFileSync('version.json','utf8'));
assert.equal(version.uvn,'v2026.09.15-12:00');
version.uvn='v2026.09.18-13:00';
fs.writeFileSync('version.json',JSON.stringify(version,null,2)+'\n');
console.log('Isolated SCF mobile draft release applied with synchronized UVN.');