import './style.css';
import { blankBinder, isOverdue, nextDue, pruneEvidence, type Binder, type CheckRecord, type Frequency, type Procedure } from './model';
import { createVault, eraseVault, hasVault, saveVault, unlockVault } from './vault';
import { cachedUnlock, captureLicense, CHECKOUT_URL, storeLicense, verifyLicense } from './license';
import { exportBackup, exportEvidence } from './export';

type View = 'today' | 'overdue' | 'history' | 'settings';
const app = document.querySelector<HTMLDivElement>('#app')!;
let binder: Binder | null = null;
let vaultKey: CryptoKey | null = null;
let view: View = 'today';
let paid = false;
let activeRecordId: string | null = null;
let lastFocus: HTMLElement | null = null;
const dateFmt = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' });

const html = (value: string): string => value.replace(/[&<>'"]/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', "'":'&#39;', '"':'&quot;' })[c]!);
const when = (iso: string): string => dateFmt.format(new Date(iso));
const nowInput = (): string => {
  const d = new Date(Date.now() + 24 * 60 * 60 * 1000); d.setHours(9, 0, 0, 0);
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
};

captureLicense();
paid = cachedUnlock();
renderGate();
setupConnectivity();
setupServiceWorker();
verifyInBackground();

function pageFrame(content: string, unlocked = false): void {
  app.innerHTML = `
    <header class="app-header">
      <a class="wordmark" href="/" aria-label="Proofbook home">PROOF<span>BOOK</span></a>
      <div class="header-tools"><span id="offline-badge" class="offline-badge" role="status">Offline · changes stay here</span>${unlocked ? '<button class="quiet tiny" id="lock">Lock binder</button>' : '<span class="tiny muted">Private by default</span>'}</div>
    </header>
    ${content}
    <footer class="footer"><span>Local-first · AES-GCM encrypted · no tracking</span><nav aria-label="Legal"><a href="/privacy/">Privacy</a><a href="/terms/">Terms</a></nav><span>Hero artwork generated for Proofbook.</span></footer>
    <div id="announcer" class="sr-only" aria-live="polite"></div>`;
  reflectConnectivity();
  document.querySelector('#lock')?.addEventListener('click', () => { binder = null; vaultKey = null; renderGate(); announce('Binder locked.'); });
}

function hero(): string {
  return `<section class="hero" aria-labelledby="hero-title"><div class="hero-copy"><p class="kicker">Private records · ready when asked</p><h1 id="hero-title">Checks happen. Proof stays.</h1><p>Repeat the work, capture the evidence, and hand over a clean read-only bundle later. Proofbook keeps the whole binder encrypted on this device—even when the network disappears.</p><div class="hero-actions"><a class="button primary rec" href="#vault">Open your binder</a><span class="tiny muted">No account. No cloud upload.</span></div></div><figure class="hero-art"><picture><source srcset="/assets/proofbook-hero-420.avif 420w, /assets/proofbook-hero.avif 760w" sizes="(max-width: 760px) calc(100vw - 64px), 500px" type="image/avif"><source srcset="/assets/proofbook-hero-420.webp 420w, /assets/proofbook-hero.webp 760w" sizes="(max-width: 760px) calc(100vw - 64px), 500px" type="image/webp"><img src="/assets/proofbook-hero.webp" width="1024" height="1024" alt="Cut-paper cassette, checklist, evidence photographs, and date stamp arranged like an inspection zine" fetchpriority="high" decoding="async"></picture></figure></section>`;
}

function renderGate(): void {
  if (binder && vaultKey) { renderBinder(); return; }
  const exists = hasVault();
  pageFrame(`<main id="main" class="shell">${hero()}<section id="vault" class="auth-sheet" aria-labelledby="vault-title"><p class="kicker">${exists ? 'Encrypted binder found' : 'First run'}</p><h2 id="vault-title">${exists ? 'Unlock this device’s binder' : 'Make a private binder'}</h2><p>${exists ? 'Enter the passphrase used on this device. It is never sent anywhere.' : 'Choose a passphrase. Proofbook uses it to encrypt procedures, sign-offs, and evidence before saving them in this browser.'}</p><form id="vault-form"><div class="field"><label for="passphrase">Binder passphrase</label><input id="passphrase" name="passphrase" type="password" autocomplete="${exists ? 'current-password' : 'new-password'}" minlength="10" required aria-describedby="pass-hint"><span class="hint" id="pass-hint">At least 10 characters. There is no password recovery.</span></div>${exists ? '' : '<div class="field"><label for="confirm">Repeat passphrase</label><input id="confirm" name="confirm" type="password" autocomplete="new-password" minlength="10" required></div>'}<p id="vault-error" class="error" role="alert"></p><button class="primary rec" type="submit">${exists ? 'Unlock binder' : 'Create encrypted binder'}</button></form><div class="privacy-strip" aria-label="Privacy features"><div><strong>Encrypted</strong><span class="tiny">AES-GCM at rest</span></div><div><strong>Offline</strong><span class="tiny">Works without signal</span></div><div><strong>Portable</strong><span class="tiny">Export anytime</span></div></div></section></main>`);
  document.querySelector<HTMLFormElement>('#vault-form')!.addEventListener('submit', handleVault);
}

async function handleVault(event: SubmitEvent): Promise<void> {
  event.preventDefault();
  const form = event.currentTarget as HTMLFormElement;
  const button = form.querySelector<HTMLButtonElement>('button')!;
  const error = form.querySelector<HTMLElement>('#vault-error')!;
  const passphrase = new FormData(form).get('passphrase') as string;
  error.textContent = '';
  if (passphrase.length < 10) { error.textContent = 'Use at least 10 characters for the passphrase.'; return; }
  if (!hasVault() && passphrase !== new FormData(form).get('confirm')) { error.textContent = 'The two passphrases do not match.'; return; }
  button.disabled = true; button.textContent = hasVault() ? 'Unlocking…' : 'Encrypting…';
  try {
    if (hasVault()) ({ key: vaultKey, binder } = await unlockVault(passphrase));
    else { binder = blankBinder(); vaultKey = await createVault(passphrase, binder); }
    const removed = pruneEvidence(binder!);
    if (removed) await persist();
    renderBinder();
    announce(removed ? `Binder unlocked. ${removed} expired files removed by retention policy.` : 'Binder unlocked.');
  } catch (cause) {
    error.textContent = cause instanceof Error ? cause.message : 'The binder could not be unlocked.';
    button.disabled = false; button.textContent = hasVault() ? 'Unlock binder' : 'Create encrypted binder';
  }
}

function renderBinder(): void {
  const open = binder!.records.filter(r => r.status === 'open');
  const overdue = open.filter(r => isOverdue(r));
  const complete = binder!.records.filter(r => r.status === 'complete');
  pageFrame(`<main id="main" class="shell binder"><nav class="tabs" aria-label="Binder sections">
      ${tab('today', '01', 'Open checks', open.length)}${tab('overdue', '02', 'Overdue', overdue.length)}${tab('history', '03', 'History', complete.length)}${tab('settings', '04', 'Binder setup')}
    </nav><section class="binder-page"><header class="binder-head"><div><p class="kicker">Evidence binder / ${view}</p><h1>${viewTitle()}</h1></div>${view !== 'settings' ? `<button id="new-procedure" class="primary rec">New procedure</button>` : ''}</header><div id="view-content">${renderView()}</div></section></main>${dialogs()}`, true);
  document.querySelectorAll<HTMLButtonElement>('[data-view]').forEach(button => button.addEventListener('click', () => { view = button.dataset.view as View; renderBinder(); }));
  document.querySelector('#new-procedure')?.addEventListener('click', event => openDialog('procedure-dialog', event.currentTarget as HTMLElement));
  wireView();
  wireDialogs();
}

function tab(id: View, num: string, label: string, count?: number): string {
  return `<button class="tab" data-view="${id}" ${view === id ? 'aria-current="page"' : ''}><span class="tab-num">${num}</span>${label}${count !== undefined ? ` · ${count}` : ''}</button>`;
}

function viewTitle(): string {
  return ({ today: 'Open checks', overdue: 'Past due', history: 'Evidence log', settings: 'Binder setup' })[view];
}

function renderView(): string {
  if (view === 'settings') return settingsView();
  const records = view === 'history' ? binder!.records.filter(r => r.status === 'complete').sort((a,b) => (b.completedAt || '').localeCompare(a.completedAt || '')) : binder!.records.filter(r => r.status === 'open' && (view !== 'overdue' || isOverdue(r))).sort((a,b) => a.dueAt.localeCompare(b.dueAt));
  const open = binder!.records.filter(r => r.status === 'open');
  const completed = binder!.records.filter(r => r.status === 'complete').length;
  const onTime = binder!.records.filter(r => r.status === 'complete' && r.completedAt! <= r.dueAt).length;
  const rate = completed ? Math.round(onTime / completed * 100) : 0;
  return `<div class="status-strip" aria-label="Binder status"><div class="stat"><strong>${open.length}</strong><span>open now</span></div><div class="stat overdue"><strong>${open.filter(r => isOverdue(r)).length}</strong><span>past due</span></div><div class="stat"><strong>${rate}%</strong><span>completed on time</span><div class="progress" aria-hidden="true"><span style="width:${rate}%"></span></div></div></div>${records.length ? `<div class="check-list">${records.map(checkCard).join('')}</div>` : emptyView()}`;
}

function procedure(record: CheckRecord): Procedure | undefined { return binder!.procedures.find(p => p.id === record.procedureId); }

function checkCard(record: CheckRecord): string {
  const proc = procedure(record);
  const attached = Object.keys(record.evidence).length;
  const total = proc?.evidenceSlots.length || 0;
  const late = isOverdue(record);
  const state = record.status === 'complete' ? 'complete' : late ? 'overdue' : '';
  return `<article class="check-card ${state}"><div><span class="tag ${record.status === 'complete' ? 'done' : late ? 'late' : ''}">${record.status === 'complete' ? '✓ Complete' : late ? '! Overdue' : '○ Open'}</span><h3>${html(proc?.title || 'Archived procedure')}</h3><div class="meta"><span>${record.status === 'complete' ? 'Completed' : 'Due'} <span class="tabular">${when(record.completedAt || record.dueAt)}</span></span>${record.signedBy ? `<span>Signed by ${html(record.signedBy)}</span>` : ''}</div><div class="evidence-dots" aria-hidden="true">${Array.from({length: total}, (_,i) => `<span class="${i < attached ? 'filled' : ''}"></span>`).join('')}</div><span class="tiny muted">${attached}/${total} evidence items ${record.evidencePrunedAt ? '· files removed by retention policy' : ''}</span></div><button data-record="${record.id}">${record.status === 'complete' ? 'Review record' : 'Record evidence'}</button></article>`;
}

function emptyView(): string {
  const copy = view === 'history' ? ['NO TAPE', 'No completed checks yet', 'Complete a check and its signed evidence record will appear here.'] : view === 'overdue' ? ['ALL CLEAR', 'Nothing is overdue', 'Open checks stay visible in the first tab until you complete them.'] : ['START HERE', 'No checks are waiting', 'Create one recurring procedure, add its evidence slots, and set the first due time.'];
  return `<div class="empty"><div class="empty-mark" aria-hidden="true">${copy[0]}</div><h2>${copy[1]}</h2><p>${copy[2]}</p>${view === 'today' ? '<button id="empty-new" class="signal">Create first procedure</button>' : ''}</div>`;
}

function settingsView(): string {
  const active = binder!.procedures.filter(p => p.active);
  return `<div class="settings-grid" style="margin-top:24px">
    <section class="settings-card"><h2>Own your data</h2><p>Backups contain readable evidence. Store them somewhere protected. Evidence reports are read-only HTML with a SHA-256 manifest fingerprint.</p><div class="action-row"><button id="export-backup">Export backup</button><button id="export-evidence" class="signal">Export evidence bundle</button></div><div class="field"><label for="import-file">Restore a Proofbook JSON backup</label><input id="import-file" type="file" accept="application/json,.json"><span class="hint">This replaces the open binder after confirmation.</span></div></section>
    <section class="settings-card"><h2>Retention</h2><p>Completed file attachments older than this are deleted when you unlock. The check, sign-off, and filename history remain.</p><div class="field"><label for="retention">Keep evidence files</label><select id="retention"><option value="30" ${binder!.retentionDays===30?'selected':''}>30 days</option><option value="90" ${binder!.retentionDays===90?'selected':''}>90 days</option><option value="365" ${binder!.retentionDays===365?'selected':''}>1 year</option><option value="0" ${binder!.retentionDays===0?'selected':''}>Until I delete them</option>${paid ? `<option value="custom" ${![0,30,90,365].includes(binder!.retentionDays)?'selected':''}>Custom…</option>` : ''}</select></div>${paid ? '<div class="field" id="custom-retention" hidden><label for="retention-days">Custom days</label><input id="retention-days" type="number" min="1" max="3650" value="'+binder!.retentionDays+'"></div>' : '<p class="tiny muted">Plus adds custom retention periods; standard controls remain free.</p>'}</section>
    <section class="settings-card full license-card"><p class="kicker" style="color:var(--signal)">${paid ? 'Plus unlocked' : 'Optional one-time unlock'}</p><h2>${paid ? 'Proofbook Plus is active' : 'Unlimited procedures · US$29 once'}</h2><p>${paid ? 'This device can create unlimited procedures and custom retention periods.' : 'The free binder includes two active procedures, full evidence capture, encryption, offline use, backups, and exports. Plus removes the procedure limit and adds custom retention.'}</p>${paid ? '<button id="verify-license">Check license now</button>' : `<div class="action-row"><a class="button signal" href="${CHECKOUT_URL}">Buy Plus — US$29</a></div><form id="license-form"><div class="field"><label for="license-token">Have a license? Paste it</label><input id="license-token" autocomplete="off" required><span class="hint">Verification contacts Sociobot. The rest of your binder stays local.</span></div><button type="submit">Restore purchase</button></form>`}<p class="tiny">One-time purchase. Sociobot/Dodo is merchant of record; refunds are handled there and revoke the license. <a href="/terms/">Terms</a> · <a href="/privacy/">Privacy</a></p></section>
    <section class="settings-card full"><h2>Active procedures</h2>${active.length ? active.map(p => `<div class="file-chip"><span><strong>${html(p.title)}</strong><br><span class="tiny">${p.frequency} · ${p.evidenceSlots.length} evidence slot(s)</span></span><button class="danger" data-delete-procedure="${p.id}">Archive</button></div>`).join('') : '<p>No active procedures.</p>'}</section>
    <section class="settings-card full"><h2>Recent binder activity</h2><p class="tiny muted">A local, encrypted audit trail of material changes.</p>${binder!.audit.slice(-12).reverse().map(event => `<div class="file-chip"><span>${html(event.detail)}</span><span class="tiny tabular">${when(event.at)}</span></div>`).join('')}</section>
    <section class="settings-card full"><h2>Danger zone</h2><p>Erase the encrypted database, procedures, history, and evidence from this browser. This cannot be undone.</p><button id="erase-binder" class="danger">Erase this binder</button></section>
  </div>`;
}

function dialogs(): string {
  return `<dialog id="procedure-dialog" aria-labelledby="procedure-title"><div class="dialog-head"><div><p class="kicker">New repeat</p><h2 id="procedure-title">Add a procedure</h2></div><button class="close" data-close aria-label="Close dialog">×</button></div><form id="procedure-form" class="dialog-body"><div class="field"><label for="procedure-name">Procedure name</label><input id="procedure-name" name="title" maxlength="80" required></div><div class="field"><label for="instructions">Working instructions</label><textarea id="instructions" name="instructions" maxlength="600" aria-describedby="instructions-hint"></textarea><span id="instructions-hint" class="hint">Short operational notes, not compliance advice.</span></div><div class="field"><label for="frequency">Repeat</label><select id="frequency" name="frequency"><option value="daily">Every day</option><option value="weekly" selected>Every week</option><option value="monthly">Every month</option></select></div><div class="field"><label for="first-due">First due</label><input id="first-due" name="due" type="datetime-local" value="${nowInput()}" required></div><div class="field"><label for="slots">Required evidence slots</label><textarea id="slots" name="slots" required aria-describedby="slots-hint">Equipment photo\nCompleted form</textarea><span class="hint" id="slots-hint">One required item per line. A check cannot be completed until each slot has a file.</span></div><p id="procedure-error" class="error" role="alert"></p><div class="dialog-actions"><button type="button" data-close>Cancel</button><button class="primary rec" type="submit">Add procedure</button></div></form></dialog>
  <dialog id="record-dialog" aria-labelledby="record-title"><div class="dialog-head"><div><p class="kicker">Evidence record</p><h2 id="record-title">Record check</h2></div><button class="close" data-close aria-label="Close dialog">×</button></div><div id="record-body" class="dialog-body"></div></dialog>`;
}

function wireView(): void {
  document.querySelector('#empty-new')?.addEventListener('click', event => openDialog('procedure-dialog', event.currentTarget as HTMLElement));
  document.querySelectorAll<HTMLButtonElement>('[data-record]').forEach(button => button.addEventListener('click', () => openRecord(button.dataset.record!, button)));
  if (view !== 'settings') return;
  document.querySelector('#export-backup')?.addEventListener('click', () => { exportBackup(binder!); announce('Readable backup downloaded.'); });
  document.querySelector('#export-evidence')?.addEventListener('click', async () => { const hash = await exportEvidence(binder!); announce(`Evidence bundle downloaded. Fingerprint begins ${hash.slice(0, 12)}.`); });
  document.querySelector<HTMLInputElement>('#import-file')?.addEventListener('change', importBinder);
  document.querySelector<HTMLSelectElement>('#retention')?.addEventListener('change', updateRetention);
  document.querySelector<HTMLInputElement>('#retention-days')?.addEventListener('change', updateCustomRetention);
  document.querySelector<HTMLFormElement>('#license-form')?.addEventListener('submit', restoreLicense);
  document.querySelector('#verify-license')?.addEventListener('click', () => verifyInBackground(true));
  document.querySelectorAll<HTMLButtonElement>('[data-delete-procedure]').forEach(button => button.addEventListener('click', () => archiveProcedure(button.dataset.deleteProcedure!)));
  document.querySelector('#erase-binder')?.addEventListener('click', eraseBinder);
}

function wireDialogs(): void {
  document.querySelectorAll<HTMLButtonElement>('[data-close]').forEach(button => button.addEventListener('click', () => closeDialog(button.closest('dialog')!)));
  document.querySelector<HTMLFormElement>('#procedure-form')?.addEventListener('submit', addProcedure);
  document.querySelectorAll<HTMLDialogElement>('dialog').forEach(dialog => dialog.addEventListener('cancel', event => { event.preventDefault(); closeDialog(dialog); }));
}

function openDialog(id: string, trigger: HTMLElement): void { lastFocus = trigger; const dialog = document.querySelector<HTMLDialogElement>(`#${id}`)!; dialog.showModal(); setTimeout(() => dialog.querySelector<HTMLElement>('input,button,textarea,select')?.focus()); }
function closeDialog(dialog: HTMLDialogElement): void { dialog.close(); lastFocus?.focus(); }

async function addProcedure(event: SubmitEvent): Promise<void> {
  event.preventDefault();
  if (!paid && binder!.procedures.filter(p => p.active).length >= 2) { closeDialog(document.querySelector<HTMLDialogElement>('#procedure-dialog')!); view = 'settings'; renderBinder(); announce('The free binder supports two active procedures. Plus removes this limit.'); return; }
  const form = event.currentTarget as HTMLFormElement;
  const data = new FormData(form);
  const slots = (data.get('slots') as string).split('\n').map(x => x.trim()).filter(Boolean);
  if (!slots.length) { form.querySelector<HTMLElement>('#procedure-error')!.textContent = 'Add at least one evidence slot.'; return; }
  const now = new Date().toISOString();
  const proc: Procedure = { id: crypto.randomUUID(), title: (data.get('title') as string).trim(), instructions: (data.get('instructions') as string).trim(), frequency: data.get('frequency') as Frequency, evidenceSlots: [...new Set(slots)].slice(0, 12), createdAt: now, active: true };
  const record: CheckRecord = { id: crypto.randomUUID(), procedureId: proc.id, dueAt: new Date(data.get('due') as string).toISOString(), status: 'open', evidence: {}, notes: '', signedBy: '' };
  binder!.procedures.push(proc); binder!.records.push(record); binder!.audit.push({ id: crypto.randomUUID(), at: now, action: 'procedure.created', detail: proc.title });
  await persist(); closeDialog(document.querySelector<HTMLDialogElement>('#procedure-dialog')!); renderBinder(); announce(`${proc.title} added.`);
}

function openRecord(id: string, trigger: HTMLElement): void {
  activeRecordId = id;
  const record = binder!.records.find(r => r.id === id)!;
  const proc = procedure(record)!;
  const readOnly = record.status === 'complete';
  const slots = proc.evidenceSlots.map((slot, i) => {
    const file = record.evidence[slot];
    return `<div class="slot"><label for="evidence-${i}">${html(slot)} <span class="error" aria-label="required">*</span></label>${file ? `<div class="file-chip"><span>${html(file.name)} <span class="tiny">(${Math.ceil(file.size/1024)} KB)</span></span>${readOnly ? '' : `<button type="button" data-remove-file="${html(slot)}">Remove</button>`}</div>` : readOnly ? '<p class="muted">File no longer retained.</p>' : `<div class="drop-zone"><input id="evidence-${i}" data-slot="${html(slot)}" type="file" accept="image/*,application/pdf,text/plain,.csv" ${i === 0 ? 'capture="environment"' : ''}><span class="hint">Photo, PDF, text, or CSV · maximum 8 MB</span></div>`}</div>`;
  }).join('');
  document.querySelector<HTMLElement>('#record-title')!.textContent = proc.title;
  document.querySelector<HTMLElement>('#record-body')!.innerHTML = `<p>${html(proc.instructions || 'No working instructions recorded.')}</p><p class="tag ${isOverdue(record) ? 'late' : ''}">${record.status === 'complete' ? `Completed ${when(record.completedAt!)}` : `Due ${when(record.dueAt)}`}</p><form id="record-form">${slots}<div class="field"><label for="record-notes">Notes</label><textarea id="record-notes" name="notes" maxlength="1000" ${readOnly ? 'readonly' : ''}>${html(record.notes)}</textarea></div><div class="field"><label for="signed-by">${readOnly ? 'Signed by' : 'Sign-off name'}</label><input id="signed-by" name="signedBy" maxlength="100" value="${html(record.signedBy)}" ${readOnly ? 'readonly' : 'required'}><span class="hint">A typed operational sign-off, not a digital identity certificate.</span></div><p id="record-error" class="error" role="alert"></p><div class="dialog-actions"><button type="button" data-close>Close</button>${readOnly ? '' : '<button type="submit">Save draft</button><button type="button" id="complete-check" class="primary rec">Complete check</button>'}</div></form>`;
  const dialog = document.querySelector<HTMLDialogElement>('#record-dialog')!;
  dialog.querySelectorAll<HTMLElement>('[data-close]').forEach(el => el.addEventListener('click', () => closeDialog(dialog)));
  dialog.querySelectorAll<HTMLInputElement>('[data-slot]').forEach(input => input.addEventListener('change', attachFile));
  dialog.querySelectorAll<HTMLButtonElement>('[data-remove-file]').forEach(button => button.addEventListener('click', () => removeFile(button.dataset.removeFile!)));
  dialog.querySelector<HTMLFormElement>('#record-form')?.addEventListener('submit', saveDraft);
  dialog.querySelector('#complete-check')?.addEventListener('click', completeCheck);
  openDialog('record-dialog', trigger);
}

async function attachFile(event: Event): Promise<void> {
  const input = event.currentTarget as HTMLInputElement;
  const file = input.files?.[0]; if (!file || !activeRecordId) return;
  const error = document.querySelector<HTMLElement>('#record-error')!;
  if (file.size > 8 * 1024 * 1024) { error.textContent = 'That file is over 8 MB. Choose a smaller file.'; input.value = ''; return; }
  try {
    const data = await new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result as string); reader.onerror = () => reject(new Error('File could not be read.')); reader.readAsDataURL(file); });
    const record = binder!.records.find(r => r.id === activeRecordId)!;
    record.evidence[input.dataset.slot!] = { name: file.name, type: file.type || 'application/octet-stream', size: file.size, data, addedAt: new Date().toISOString() };
    binder!.audit.push({ id: crypto.randomUUID(), at: new Date().toISOString(), action: 'evidence.attached', detail: `${procedure(record)?.title}: ${input.dataset.slot}` });
    await persist();
    const trigger = lastFocus || document.body; closeDialog(document.querySelector<HTMLDialogElement>('#record-dialog')!); renderBinder(); openRecord(record.id, trigger); announce(`${file.name} attached and encrypted.`);
  } catch (cause) { error.textContent = cause instanceof Error ? cause.message : 'File could not be attached.'; }
}

async function removeFile(slot: string): Promise<void> {
  const record = binder!.records.find(r => r.id === activeRecordId)!;
  if (!confirm(`Remove the evidence in “${slot}”? This cannot be undone unless it is in a backup.`)) return;
  delete record.evidence[slot]; binder!.audit.push({ id: crypto.randomUUID(), at: new Date().toISOString(), action: 'evidence.removed', detail: `${procedure(record)?.title}: ${slot}` }); await persist();
  const trigger = lastFocus || document.body; closeDialog(document.querySelector<HTMLDialogElement>('#record-dialog')!); renderBinder(); openRecord(record.id, trigger); announce('Evidence removed.');
}

async function saveDraft(event: SubmitEvent): Promise<void> { event.preventDefault(); await updateRecordForm(); closeDialog(document.querySelector<HTMLDialogElement>('#record-dialog')!); renderBinder(); announce('Draft saved and encrypted.'); }

async function updateRecordForm(): Promise<CheckRecord> {
  const form = document.querySelector<HTMLFormElement>('#record-form')!; const data = new FormData(form);
  const record = binder!.records.find(r => r.id === activeRecordId)!;
  record.notes = (data.get('notes') as string).trim(); record.signedBy = (data.get('signedBy') as string).trim(); await persist(); return record;
}

async function completeCheck(): Promise<void> {
  const record = await updateRecordForm(); const proc = procedure(record)!;
  const missing = proc.evidenceSlots.filter(slot => !record.evidence[slot]);
  const error = document.querySelector<HTMLElement>('#record-error')!;
  if (missing.length) { error.textContent = `Attach required evidence: ${missing.join(', ')}.`; return; }
  if (!record.signedBy) { error.textContent = 'Enter the sign-off name before completing this check.'; document.querySelector<HTMLInputElement>('#signed-by')!.focus(); return; }
  const completedAt = new Date().toISOString(); record.status = 'complete'; record.completedAt = completedAt;
  binder!.records.push({ id: crypto.randomUUID(), procedureId: proc.id, dueAt: nextDue(record.dueAt, proc.frequency), status: 'open', evidence: {}, notes: '', signedBy: '' });
  binder!.audit.push({ id: crypto.randomUUID(), at: completedAt, action: 'check.completed', detail: `${proc.title}, signed by ${record.signedBy}` });
  await persist(); closeDialog(document.querySelector<HTMLDialogElement>('#record-dialog')!); renderBinder(); announce(`${proc.title} completed. The next check is scheduled.`);
}

async function persist(): Promise<void> { if (!vaultKey || !binder) return; try { await saveVault(vaultKey, binder); } catch (cause) { announce(cause instanceof Error ? cause.message : 'Changes could not be saved.'); throw cause; } }

async function updateRetention(event: Event): Promise<void> {
  const select = event.currentTarget as HTMLSelectElement;
  const custom = document.querySelector<HTMLElement>('#custom-retention');
  if (select.value === 'custom') { if (custom) custom.hidden = false; return; }
  binder!.retentionDays = Number(select.value); binder!.audit.push({ id: crypto.randomUUID(), at: new Date().toISOString(), action: 'retention.changed', detail: select.options[select.selectedIndex].text }); await persist(); announce('Retention policy saved.');
}

async function updateCustomRetention(event: Event): Promise<void> { const value = Number((event.currentTarget as HTMLInputElement).value); if (value >= 1 && value <= 3650) { binder!.retentionDays = value; await persist(); announce(`Evidence retention set to ${value} days.`); } }

async function importBinder(event: Event): Promise<void> {
  const input = event.currentTarget as HTMLInputElement; const file = input.files?.[0]; if (!file) return;
  try {
    const imported = JSON.parse(await file.text()) as Binder;
    if (imported.version !== 1 || !Array.isArray(imported.procedures) || !Array.isArray(imported.records) || !Array.isArray(imported.audit)) throw new Error('That file is not a supported Proofbook backup.');
    if (!confirm(`Replace this binder with the backup containing ${imported.procedures.length} procedure(s) and ${imported.records.length} record(s)? Export the current binder first if needed.`)) { input.value = ''; return; }
    binder = imported; binder.audit.push({ id: crypto.randomUUID(), at: new Date().toISOString(), action: 'binder.imported', detail: file.name }); await persist(); renderBinder(); announce('Backup restored into the encrypted binder.');
  } catch (cause) { announce(cause instanceof Error ? cause.message : 'The backup could not be imported.'); input.value = ''; }
}

async function archiveProcedure(id: string): Promise<void> {
  const proc = binder!.procedures.find(p => p.id === id)!;
  if (!confirm(`Archive “${proc.title}”? Its open checks will be removed. Completed evidence history stays available.`)) return;
  proc.active = false; binder!.records = binder!.records.filter(r => r.procedureId !== id || r.status === 'complete'); binder!.audit.push({ id: crypto.randomUUID(), at: new Date().toISOString(), action: 'procedure.archived', detail: proc.title }); await persist(); renderBinder(); announce(`${proc.title} archived.`);
}

async function eraseBinder(): Promise<void> {
  if (!confirm('Permanently erase this binder, including every procedure, sign-off, and evidence file stored on this device? This cannot be undone.')) return;
  await eraseVault(); binder = null; vaultKey = null; renderGate(); announce('The local binder was permanently erased.');
}

async function restoreLicense(event: SubmitEvent): Promise<void> {
  event.preventDefault(); const input = document.querySelector<HTMLInputElement>('#license-token')!; if (!input.value.trim()) return;
  storeLicense(input.value); paid = true; announce('License saved. Verifying in the background.'); renderBinder(); await verifyInBackground(true);
}

async function verifyInBackground(force = false): Promise<void> {
  try { const verdict = await verifyLicense(force); if (!verdict) return; const before = paid; paid = verdict.valid; if (!paid) announce('License no longer active. Free binder limits now apply; your records remain available.'); else if (force) announce('License verified. Proofbook Plus is active.'); if (binder && before !== paid) renderBinder(); }
  catch (cause) { if (force) announce(cause instanceof Error ? cause.message : 'License could not be verified.'); }
}

function announce(message: string): void {
  let live = document.querySelector<HTMLElement>('#announcer');
  if (!live) { live = document.createElement('div'); live.id = 'announcer'; live.className = 'sr-only'; live.setAttribute('aria-live','polite'); document.body.append(live); }
  live.textContent = ''; setTimeout(() => { live!.textContent = message; }, 10);
  const old = document.querySelector('.toast'); old?.remove();
  const toast = document.createElement('div'); toast.className = 'toast'; toast.setAttribute('role','status'); toast.textContent = message; document.body.append(toast); setTimeout(() => toast.remove(), 5000);
}

function reflectConnectivity(): void { document.querySelector('#offline-badge')?.classList.toggle('show', !navigator.onLine); }
function setupConnectivity(): void { addEventListener('online', () => { reflectConnectivity(); announce('Back online. Your binder remains local.'); }); addEventListener('offline', () => { reflectConnectivity(); announce('You are offline. Proofbook will keep saving on this device.'); }); }
function setupServiceWorker(): void {
  if (!('serviceWorker' in navigator) || import.meta.env.DEV) return;
  addEventListener('load', async () => {
    const registration = await navigator.serviceWorker.register('/sw.js');
    registration.addEventListener('updatefound', () => { const worker = registration.installing; worker?.addEventListener('statechange', () => { if (worker.state === 'installed' && navigator.serviceWorker.controller) announce('A Proofbook update is ready. Reload when convenient.'); }); });
  });
}
