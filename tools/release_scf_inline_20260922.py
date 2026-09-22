#!/usr/bin/env python3
"""Guarded SCF inline release. Fails without modifying live claims if source changes."""
from pathlib import Path
import json

p = Path('index.html')
s = p.read_text(encoding='utf-8')
old_uvn, new_uvn = 'v2026.09.20:13:30', 'v2026.09.22-20:00'
assert old_uvn in s and 'universal-payment-inline.js?v=20260922-2000' not in s

def replace_once(old, new, name):
    global s
    count = s.count(old)
    assert count == 1, f'{name}: expected exactly one source anchor, got {count}'
    s = s.replace(old, new, 1)

replace_once(
    '  listEl.innerHTML = data.map(sub => `\n    <div class="manage-list-item" style="flex-direction:column;align-items:flex-start;gap:4px;">',
    '  listEl.innerHTML = data.map(sub => `\n    <div class="manage-list-item" data-meg-scf-row="true" style="flex-direction:column;align-items:flex-start;gap:4px;">',
    'browse row')
# Remove the old standalone Confirm Payment / Paid block, replacing it with an inline
# status next to View and Delete. Existing server-side 60-day Undo is preserved.
replace_once(
    "      ${sub.status==='submitted' ? `<div style=\"font-size:12px;\">${renderPaymentBadge(sub)}</div>` : ''}\n",
    '', 'legacy standalone payment block')
replace_once(
    '''        <button class="manage-delete-btn" style="font-size:12px;" onclick="deleteSubmission('${sub.id}')">🗑 Delete</button>''',
    '''        <button class="manage-delete-btn" data-meg-scf-delete="true" style="display:none;font-size:12px;" onclick="event.stopPropagation();window.megScfAdminDelete('${sub.id}')">🗑 Delete</button>
        <span data-meg-scf-id="${sub.id}" data-meg-scf-local-paid="${sub.payment_confirmed===true}" data-meg-scf-admin="true" style="display:inline-flex;align-items:center;flex-wrap:wrap;gap:3px;">Checking payment status…</span>''',
    'browse actions')
replace_once(
    '''    <div class="manage-list-item" style="flex-direction:column;align-items:flex-start;gap:4px;cursor:pointer;" onclick="togglePayrollClaimDetail('${row.id}')">''',
    '''    <div class="manage-list-item" data-meg-scf-row="true" style="flex-direction:column;align-items:flex-start;gap:4px;cursor:pointer;" onclick="togglePayrollClaimDetail('${row.id}')">''',
    'payroll row')
replace_once(
    '''        <span style="font-weight:600;">${escapeHtml(row.claimed_by)} — ${escapeHtml(row.serial_no)}</span>''',
    '''        <span style="font-weight:600;">${escapeHtml(row.claimed_by)} — ${escapeHtml(row.serial_no)}</span>
        <span data-meg-scf-id="${row.id}" data-meg-scf-local-paid="${row.payment_confirmed===true}" data-meg-scf-admin="false" style="display:inline-flex;align-items:center;flex-wrap:wrap;gap:3px;" onclick="event.stopPropagation()">Checking payment status…</span>''',
    'payroll inline status')
# Route every legacy deleteSubmission caller through the audited permission-checked RPC.
replace_once(
    '''async function deleteSubmission(id){
  if(!confirm('Permanently delete this submission? This cannot be undone.')) return;
  const { error } = await sb.from('scf_submissions').delete().eq('id', id);
  if(error){ alert('Failed to delete: ' + error.message); return; }
  if(currentDraftId === id){ currentDraftId = null; adminEditingSubmittedId = null; serialLocked = false; setScfCompanyIdentityLocked(false); }
  await renderBrowseSubmissionsList();
}''',
    '''async function deleteSubmission(id){
  if(typeof window.megScfAdminDelete !== 'function'){
    alert('Secure Admin Delete is unavailable. No claim was deleted.'); return;
  }
  await window.megScfAdminDelete(id);
}''',
    'legacy delete guard')
assert '</body>' in s
s = s.replace(old_uvn, new_uvn)
replace_once('</body>', '<script src="./universal-payment-inline.js?v=20260922-2000" defer></script>\n</body>', 'script wiring')
assert s.count('data-meg-scf-id=') == 2
assert s.count('data-meg-scf-delete=') == 1
assert s.count('universal-payment-inline.js?v=20260922-2000') == 1
assert "sb.from('scf_submissions').delete().eq('id', id)" not in s
assert Path('universal-payment-inline.js').exists()
p.write_text(s, encoding='utf-8')
Path('version.json').write_text(json.dumps({'version': new_uvn, 'uvn': new_uvn}, indent=2) + '\n', encoding='utf-8')
assert json.loads(Path('version.json').read_text())['uvn'] == new_uvn
print('PASS: SCF inline Claim Paid, secure Delete and UVN integrated; no database records changed')
