import './style.css';
import { blankBinder, hasRetainedEvidence, isOverdue, nextDue, parseBackup, pruneEvidence, sampleBinder, type Binder, type CheckRecord, type Frequency, type Procedure } from './model';
import { CorruptVaultError, createVault, eraseVault, hasVault, saveVault, unlockVault } from './vault';
import { exportBackup, exportEvidence } from './export';

type View = 'today' | 'overdue' | 'history' | 'settings';
const app = document.querySelector<HTMLDivElement>('#app')!;
const VIEW_PATH: Record<View, string> = { today: '/checks', overdue: '/overdue', history: '/history', settings: '/settings' };
const BUILD_ID = '1.1.0';
let binder: Binder | null = null;
let vaultKey: CryptoKey | null = null;
let demoMode = isDemoLocation();
let view: View = viewFromLocation();
let activeRecordId: string | null = null;
let lastFocus: HTMLElement | null = null;
const dateFmt = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' });

const html = (value: string): string => value.replace(/[&<>'"]/g, character => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', "'":'&#39;', '"':'&quot;' })[character]!);
const when = (iso: string): string => dateFmt.format(new Date(iso));
const nowInput = (): string => {
  const date = new Date(Date.now() + 24 * 60 * 60 * 1000);
  date.setHours(9, 0, 0, 0);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};

if (demoMode) {
  binder = sampleBinder();
  renderBinder();
} else {
  renderGate();
}
setupConnectivity();
setupServiceWorker();

function isDemoLocation(): boolean {
  return location.pathname.replace(/\/$/, '') === '/demo' || new URL(location.href).searchParams.get('demo') === '1';
}

function viewFromLocation(): View {
  if (isDemoLocation()) {
    const requested = new URL(location.href).searchParams.get('view');
    return requested && ['today', 'overdue', 'history', 'settings'].includes(requested) ? requested as View : 'today';
  }
  return (Object.entries(VIEW_PATH).find(([, path]) => path === location.pathname.replace(/\/$/, ''))?.[0] as View | undefined) || 'today';
}

function setTitle(): void {
  const route = demoMode ? '/demo/' : binder ? VIEW_PATH[view] : '/';
  if (demoMode) document.title = 'Demo — Proofbook';
  else if (binder) document.title = `${viewTitle()} — Proofbook`;
  else document.title = location.pathname === '/' ? 'Proofbook — repeat checks and keep evidence' : 'Unlock binder — Proofbook';
  document.querySelector<HTMLLinkElement>('link[rel="canonical"]')?.setAttribute('href', `https://checklist-evidence-binder.sociobot.in${route}`);
  document.querySelector<HTMLMetaElement>('meta[property="og:url"]')?.setAttribute('content', `https://checklist-evidence-binder.sociobot.in${route}`);
}

function pageFrame(content: string, unlocked = false): void {
  const nav = unlocked
    ? `<a href="${viewHref('today')}" data-view="today" ${view === 'today' ? 'aria-current="page"' : ''}>Checks</a><a href="${viewHref('history')}" data-view="history" ${view === 'history' ? 'aria-current="page"' : ''}>History</a><a href="${viewHref('settings')}" data-view="settings" ${view === 'settings' ? 'aria-current="page"' : ''}>Setup</a><a href="/privacy/">Privacy</a>`
    : '<a href="/demo/">Demo</a><a href="/#how">How it works</a><a href="/privacy/">Privacy</a>';
  app.innerHTML = `
    <header class="app-header">
      <a class="wordmark" href="/" aria-label="Proofbook home">PROOF<span>BOOK</span></a>
      <nav class="site-nav" aria-label="Primary">${nav}</nav>
      <div class="header-tools"><span id="offline-badge" class="offline-badge" role="status">Offline</span>${unlocked && !demoMode ? '<button class="quiet" id="lock">Lock binder</button>' : ''}</div>
    </header>
    ${demoMode ? '<aside class="demo-banner" aria-label="Demo controls"><strong>Demo — sample data, nothing is saved</strong><div><button id="reset-demo">Reset demo</button><a class="button" href="/">Start for real</a></div></aside>' : ''}
    ${content}
    <footer class="footer"><span>Repeat checks and keep the evidence on this device.</span><nav aria-label="Footer"><a href="/privacy/">Privacy</a><a href="/terms/">Terms</a></nav><span>Built by Param Factory · v${BUILD_ID} · original generated artwork</span></footer>
    <div id="announcer" class="sr-only" aria-live="polite" aria-atomic="true"></div>`;
  reflectConnectivity();
  document.querySelector('#lock')?.addEventListener('click', () => {
    binder = null;
    vaultKey = null;
    view = 'today';
    history.pushState({}, '', '/');
    renderGate();
    announce('Binder locked.');
  });
  document.querySelector('#reset-demo')?.addEventListener('click', () => {
    binder = sampleBinder();
    view = 'today';
    history.replaceState({}, '', '/demo/');
    renderBinder(true);
    announce('Sample data reset.');
  });
  document.querySelectorAll<HTMLAnchorElement>('[data-view]').forEach(link => link.addEventListener('click', event => {
    event.preventDefault();
    goToView(link.dataset.view as View);
  }));
}

function hero(): string {
  return `<section class="hero" aria-labelledby="hero-title"><div class="hero-copy"><p class="kicker">Private evidence binder</p><h1 id="hero-title">Repeat checks and keep the evidence</h1><p>For small teams that need to show a client, manager, or inspector what was checked.</p><div class="hero-actions"><a class="button primary rec" href="/demo/">Try it with sample data</a><span class="action-note">See a completed check and one overdue check.</span></div><a class="text-action" href="#vault">Create your binder</a><ul class="plain-facts"><li>Encrypted on this device.</li><li>Works offline after the first visit.</li><li>All features are free to use.</li></ul></div><figure class="hero-art"><picture><source srcset="/assets/proofbook-hero-420.avif 420w, /assets/proofbook-hero.avif 760w" sizes="(max-width: 760px) calc(100vw - 48px), 500px" type="image/avif"><source srcset="/assets/proofbook-hero-420.webp 420w, /assets/proofbook-hero.webp 760w" sizes="(max-width: 760px) calc(100vw - 48px), 500px" type="image/webp"><img src="/assets/proofbook-hero.webp" width="1024" height="1024" alt="Cassette, checklist, evidence photos, and date stamp arranged as a field record" fetchpriority="high" decoding="async"></picture></figure></section>`;
}

function renderGate(): void {
  setTitle();
  const exists = hasVault();
  pageFrame(`<main id="main" class="shell">${hero()}<section id="vault" class="auth-sheet" aria-labelledby="vault-title"><p class="kicker">${exists ? 'Encrypted binder found' : 'First use'}</p><h2 id="vault-title">${exists ? 'Unlock this binder' : 'Create a private binder'}</h2><p>${exists ? 'Enter the passphrase used on this device.' : 'Choose a passphrase to encrypt procedures, sign-offs, and files in this browser.'}</p><form id="vault-form"><div class="field"><label for="passphrase">Binder passphrase</label><input id="passphrase" name="passphrase" type="password" autocomplete="${exists ? 'current-password' : 'new-password'}" minlength="10" required aria-describedby="pass-hint"><span class="hint" id="pass-hint">Use at least 10 characters. The passphrase is not stored or sent.</span></div>${exists ? '' : '<div class="field"><label for="confirm">Repeat passphrase</label><input id="confirm" name="confirm" type="password" autocomplete="new-password" minlength="10" required></div>'}<p id="vault-error" class="error" role="alert"></p><button class="primary rec" type="submit">${exists ? 'Unlock binder' : 'Create encrypted binder'}</button></form>${exists ? `<details id="recovery"><summary>Restore or erase this binder</summary><p>Use a valid backup if this binder cannot open. The current binder changes only after the backup passes every check.</p><div class="field"><label for="recovery-file">Valid Proofbook JSON backup</label><input id="recovery-file" type="file" accept="application/json,.json"><span class="hint">The passphrase above becomes the passphrase for the restored binder.</span></div><button id="erase-locked" class="danger">Erase this binder</button></details>` : ''}</section><section id="how" class="information-section"><p class="kicker">How it works</p><h2>Record a check in three steps</h2><ol class="steps"><li><strong>Name the check.</strong><span>Set its due time and required evidence files.</span></li><li><strong>Attach the evidence.</strong><span>Add each file, notes, and the sign-off name.</span></li><li><strong>Export the record.</strong><span>Download a report with its exact SHA-256 manifest.</span></li></ol></section><section class="information-section limits"><p class="kicker">Limits and privacy</p><h2>Know what the binder does not do</h2><p>Proofbook does not certify compliance or provide legal advice. It does not sync teams or store your binder on a server.</p><p>Keep your own backup. Clearing browser data or losing the passphrase can remove access.</p></section></main>`);
  document.querySelector<HTMLFormElement>('#vault-form')!.addEventListener('submit', handleVault);
  document.querySelector<HTMLInputElement>('#recovery-file')?.addEventListener('change', restoreLockedBinder);
  document.querySelector('#erase-locked')?.addEventListener('click', eraseLockedBinder);
}

async function handleVault(event: SubmitEvent): Promise<void> {
  event.preventDefault();
  const form = event.currentTarget as HTMLFormElement;
  const button = form.querySelector<HTMLButtonElement>('button[type="submit"]')!;
  const error = form.querySelector<HTMLElement>('#vault-error')!;
  const data = new FormData(form);
  const passphrase = data.get('passphrase') as string;
  error.textContent = '';
  if (passphrase.length < 10) { error.textContent = 'Use at least 10 characters for the passphrase.'; return; }
  if (!hasVault() && passphrase !== data.get('confirm')) { error.textContent = 'The two passphrases do not match.'; return; }
  button.disabled = true;
  button.textContent = hasVault() ? 'Unlocking…' : 'Encrypting…';
  try {
    if (hasVault()) ({ key: vaultKey, binder } = await unlockVault(passphrase));
    else { binder = blankBinder(); vaultKey = await createVault(passphrase, binder); }
    const removed = pruneEvidence(binder!);
    if (removed) await persist();
    goToView(view, true);
    announce(removed ? `Binder unlocked. ${removed} expired files were removed.` : 'Binder unlocked.');
  } catch (cause) {
    if (cause instanceof CorruptVaultError) {
      vaultKey = cause.key;
      document.querySelector<HTMLDetailsElement>('#recovery')!.open = true;
    }
    error.textContent = cause instanceof Error ? cause.message : 'The binder could not be unlocked.';
    button.disabled = false;
    button.textContent = hasVault() ? 'Unlock binder' : 'Create encrypted binder';
  }
}

async function restoreLockedBinder(event: Event): Promise<void> {
  const input = event.currentTarget as HTMLInputElement;
  const file = input.files?.[0];
  const error = document.querySelector<HTMLElement>('#vault-error')!;
  const passphrase = document.querySelector<HTMLInputElement>('#passphrase')!.value;
  if (!file) return;
  if (passphrase.length < 10) { error.textContent = 'Enter a new passphrase with at least 10 characters before restoring.'; input.value = ''; return; }
  try {
    const restored = parseBackup(await file.text());
    if (!confirm(`Replace this browser's binder with ${restored.procedures.length} procedure(s) from ${file.name}?`)) { input.value = ''; return; }
    restored.audit.push({ id: crypto.randomUUID(), at: new Date().toISOString(), action: 'binder.restored', detail: file.name });
    const key = await createVault(passphrase, restored);
    binder = restored;
    vaultKey = key;
    goToView('today', true);
    announce('Valid backup restored.');
  } catch (cause) {
    error.textContent = cause instanceof Error ? cause.message : 'This backup is invalid. Your current binder was not replaced.';
    input.value = '';
  }
}

async function eraseLockedBinder(): Promise<void> {
  if (!confirm('Permanently erase this damaged or locked binder from this browser? This cannot be undone.')) return;
  await eraseVault();
  vaultKey = null;
  binder = null;
  renderGate();
  announce('The local binder was erased.');
}

function viewHref(next: View): string {
  return demoMode ? `/demo/?view=${next}` : VIEW_PATH[next];
}

function goToView(next: View, replace = false): void {
  view = next;
  const href = viewHref(next);
  if (location.pathname + location.search !== href) history[replace ? 'replaceState' : 'pushState']({}, '', href);
  renderBinder(true);
}

function renderBinder(focusHeading = false): void {
  if (!binder) { renderGate(); return; }
  setTitle();
  const open = binder.records.filter(record => record.status === 'open');
  const overdue = open.filter(record => isOverdue(record));
  const complete = binder.records.filter(record => record.status === 'complete');
  pageFrame(`<main id="main" class="shell binder"><nav class="tabs" aria-label="Binder sections">
      ${tab('today', '01', 'Open checks', open.length)}${tab('overdue', '02', 'Overdue', overdue.length)}${tab('history', '03', 'History', complete.length)}${tab('settings', '04', 'Binder setup')}
    </nav><section class="binder-page"><header class="binder-head"><div><p class="kicker">${demoMode ? 'Sample evidence binder' : 'Evidence binder'}</p><h1 tabindex="-1">${viewTitle()}</h1></div>${view !== 'settings' ? '<button id="new-procedure" class="primary rec">New procedure</button>' : ''}</header><div id="view-content">${renderView()}</div></section></main>${dialogs()}`, true);
  document.querySelector('#new-procedure')?.addEventListener('click', event => openDialog('procedure-dialog', event.currentTarget as HTMLElement));
  wireView();
  wireDialogs();
  if (focusHeading) {
    const heading = document.querySelector<HTMLElement>('main h1')!;
    requestAnimationFrame(() => heading.focus());
    announce(`${viewTitle()} page`);
  }
}

function tab(id: View, num: string, label: string, count?: number): string {
  return `<a class="tab" href="${viewHref(id)}" data-view="${id}" ${view === id ? 'aria-current="page"' : ''}><span class="tab-num">${num}</span>${label}${count !== undefined ? ` · ${count}` : ''}</a>`;
}

function viewTitle(): string {
  return ({ today: 'Open checks', overdue: 'Past due', history: 'Evidence log', settings: 'Binder setup' })[view];
}

function renderView(): string {
  if (view === 'settings') return settingsView();
  const records = view === 'history'
    ? binder!.records.filter(record => record.status === 'complete').sort((a, b) => (b.completedAt || '').localeCompare(a.completedAt || ''))
    : binder!.records.filter(record => record.status === 'open' && (view !== 'overdue' || isOverdue(record))).sort((a, b) => a.dueAt.localeCompare(b.dueAt));
  const open = binder!.records.filter(record => record.status === 'open');
  const completed = binder!.records.filter(record => record.status === 'complete').length;
  const onTime = binder!.records.filter(record => record.status === 'complete' && record.completedAt! <= record.dueAt).length;
  const rate = completed ? Math.round(onTime / completed * 100) : 0;
  return `${demoMode && view === 'today' ? completedSampleOverview() : ''}<div class="status-strip" aria-label="Binder status"><div class="stat"><strong>${open.length}</strong><span>open now</span></div><div class="stat overdue"><strong>${open.filter(record => isOverdue(record)).length}</strong><span>past due</span></div><div class="stat"><strong>${rate}%</strong><span>completed on time</span><progress value="${rate}" max="100">${rate}%</progress></div></div>${records.length ? `<div class="check-list">${records.map(checkCard).join('')}</div>` : emptyView()}`;
}

function procedure(record: CheckRecord): Procedure | undefined { return binder!.procedures.find(item => item.id === record.procedureId); }

function completedSampleOverview(): string {
  const record = binder!.records.find(item => item.status === 'complete');
  if (!record) return '';
  const proc = procedure(record);
  const files = Object.values(record.evidence).filter(hasRetainedEvidence);
  return `<section class="completed-sample" aria-labelledby="completed-sample-title"><div><p class="kicker">Completed sample</p><h2 id="completed-sample-title">Completed check ready to review</h2><p class="completed-sample-name">${html(proc?.title || 'Archived procedure')}</p><div class="meta"><span>Completed <span class="tabular">${when(record.completedAt || record.dueAt)}</span></span>${record.signedBy ? `<span>Signed by ${html(record.signedBy)}</span>` : ''}</div><ul class="sample-files" aria-label="Completed evidence files">${files.map(file => `<li><a download="${html(file.name)}" href="${html(file.data)}">Download ${html(file.name)}</a></li>`).join('')}</ul></div><button data-record="${record.id}">Review completed check</button></section>`;
}

function checkCard(record: CheckRecord): string {
  const proc = procedure(record);
  const attached = Object.values(record.evidence).filter(hasRetainedEvidence).length;
  const total = proc?.evidenceSlots.length || 0;
  const late = isOverdue(record);
  const state = record.status === 'complete' ? 'complete' : late ? 'overdue' : '';
  const dots = proc?.evidenceSlots.map(slot => `<span class="${hasRetainedEvidence(record.evidence[slot]) ? 'filled' : ''}"></span>`).join('') || '';
  return `<article class="check-card ${state}"><div><span class="tag ${record.status === 'complete' ? 'done' : late ? 'late' : ''}">${record.status === 'complete' ? '✓ Complete' : late ? '! Overdue' : '○ Open'}</span><h2>${html(proc?.title || 'Archived procedure')}</h2><div class="meta"><span>${record.status === 'complete' ? 'Completed' : 'Due'} <span class="tabular">${when(record.completedAt || record.dueAt)}</span></span>${record.signedBy ? `<span>Signed by ${html(record.signedBy)}</span>` : ''}</div><div class="evidence-dots" aria-hidden="true">${dots}</div><span class="tiny muted">${attached}/${total} evidence files${record.evidencePrunedAt ? ' · files removed by retention policy' : ''}</span></div><button data-record="${record.id}">${record.status === 'complete' ? 'Review record' : 'Record evidence'}</button></article>`;
}

function emptyView(): string {
  const copy = view === 'history'
    ? ['No completed checks yet', 'Complete a check to add its signed record here.']
    : view === 'overdue'
      ? ['Nothing is overdue', 'Open checks stay on the first tab until they are complete.']
      : ['No checks are waiting', 'Create a procedure, name its evidence files, and set the first due time.'];
  return `<div class="empty"><h2>${copy[0]}</h2><p>${copy[1]}</p>${view === 'today' ? '<button id="empty-new" class="signal">Create first procedure</button>' : ''}</div>`;
}

function settingsView(): string {
  const active = binder!.procedures.filter(item => item.active);
  return `<div class="settings-grid">
    <section class="settings-card"><h2>Export and restore</h2><p>Backups contain readable evidence. Store them somewhere protected.</p><div class="action-row"><button id="export-backup">Export JSON backup</button><button id="export-evidence" class="signal">Export evidence report</button></div><div class="field"><label for="import-file">Restore a Proofbook JSON backup</label><input id="import-file" type="file" accept="application/json,.json"><span class="hint">A valid backup replaces this binder only after confirmation.</span></div></section>
    <section class="settings-card"><h2>File retention</h2><p>Old files are removed when you unlock. Filenames, checks, and sign-offs stay in the record.</p><div class="field"><label for="retention">Keep evidence files</label><select id="retention"><option value="30" ${binder!.retentionDays===30?'selected':''}>30 days</option><option value="90" ${binder!.retentionDays===90?'selected':''}>90 days</option><option value="365" ${binder!.retentionDays===365?'selected':''}>1 year</option><option value="0" ${binder!.retentionDays===0?'selected':''}>Until I delete them</option><option value="custom" ${![0,30,90,365].includes(binder!.retentionDays)?'selected':''}>Custom</option></select></div><div class="field" id="custom-retention" ${![0,30,90,365].includes(binder!.retentionDays) ? '' : 'hidden'}><label for="retention-days">Custom days</label><input id="retention-days" type="number" min="1" max="3650" value="${binder!.retentionDays || 365}"></div></section>
    <section class="settings-card full"><h2>Active procedures</h2>${active.length ? active.map(item => `<div class="file-chip"><span><strong>${html(item.title)}</strong><br><span class="tiny">${item.frequency} · ${item.evidenceSlots.length} evidence slots</span></span><button class="danger" data-delete-procedure="${item.id}">Archive</button></div>`).join('') : '<p>No active procedures.</p>'}</section>
    <section class="settings-card full"><h2>Recent binder activity</h2><p class="tiny muted">Material changes are recorded inside this encrypted binder.</p>${binder!.audit.length ? binder!.audit.slice(-12).reverse().map(event => `<div class="file-chip"><span>${html(event.detail)}</span><span class="tiny tabular">${when(event.at)}</span></div>`).join('') : '<p>No activity recorded.</p>'}</section>
    <section class="settings-card full"><h2>Erase this binder</h2><p>Erase every procedure, sign-off, and evidence file from this browser.</p><button id="erase-binder" class="danger">Erase this binder</button></section>
  </div>`;
}

function dialogs(): string {
  return `<dialog id="procedure-dialog" aria-labelledby="procedure-title"><div class="dialog-head"><div><p class="kicker">New procedure</p><h2 id="procedure-title">Add a procedure</h2></div><button class="close" data-close aria-label="Close dialog">×</button></div><form id="procedure-form" class="dialog-body"><div class="field"><label for="procedure-name">Procedure name</label><input id="procedure-name" name="title" maxlength="80" required></div><div class="field"><label for="instructions">Working instructions</label><textarea id="instructions" name="instructions" maxlength="600" aria-describedby="instructions-hint"></textarea><span id="instructions-hint" class="hint">Add short operational notes, not compliance advice.</span></div><div class="field"><label for="frequency">Repeat</label><select id="frequency" name="frequency"><option value="daily">Every day</option><option value="weekly" selected>Every week</option><option value="monthly">Every month</option></select></div><div class="field"><label for="first-due">First due</label><input id="first-due" name="due" type="datetime-local" value="${nowInput()}" required></div><div class="field"><label for="slots">Required evidence files</label><textarea id="slots" name="slots" required aria-describedby="slots-hint">Equipment photo\nCompleted form</textarea><span class="hint" id="slots-hint">Use one name per line. Each file is required before completion.</span></div><p id="procedure-error" class="error" role="alert"></p><div class="dialog-actions"><button type="button" data-close>Cancel</button><button class="primary rec" type="submit">Add procedure</button></div></form></dialog>
  <dialog id="record-dialog" aria-labelledby="record-title"><div class="dialog-head"><div><p class="kicker">Evidence record</p><h2 id="record-title">Record check</h2></div><button class="close" data-close aria-label="Close dialog">×</button></div><div id="record-body" class="dialog-body"></div></dialog>`;
}

function wireView(): void {
  document.querySelector('#empty-new')?.addEventListener('click', event => openDialog('procedure-dialog', event.currentTarget as HTMLElement));
  document.querySelectorAll<HTMLButtonElement>('[data-record]').forEach(button => button.addEventListener('click', () => openRecord(button.dataset.record!, button)));
  if (view !== 'settings') return;
  document.querySelector('#export-backup')?.addEventListener('click', () => { exportBackup(binder!); announce('JSON backup downloaded.'); });
  document.querySelector('#export-evidence')?.addEventListener('click', async () => { const hash = await exportEvidence(binder!); announce(`Evidence report downloaded. Manifest starts ${hash.slice(0, 12)}.`); });
  document.querySelector<HTMLInputElement>('#import-file')?.addEventListener('change', importBinder);
  document.querySelector<HTMLSelectElement>('#retention')?.addEventListener('change', updateRetention);
  document.querySelector<HTMLInputElement>('#retention-days')?.addEventListener('change', updateCustomRetention);
  document.querySelectorAll<HTMLButtonElement>('[data-delete-procedure]').forEach(button => button.addEventListener('click', () => archiveProcedure(button.dataset.deleteProcedure!)));
  document.querySelector('#erase-binder')?.addEventListener('click', eraseBinder);
}

function wireDialogs(): void {
  document.querySelectorAll<HTMLButtonElement>('[data-close]').forEach(button => button.addEventListener('click', () => closeDialog(button.closest('dialog')!)));
  document.querySelector<HTMLFormElement>('#procedure-form')?.addEventListener('submit', addProcedure);
  document.querySelectorAll<HTMLDialogElement>('dialog').forEach(dialog => dialog.addEventListener('cancel', event => { event.preventDefault(); closeDialog(dialog); }));
}

function openDialog(id: string, trigger: HTMLElement): void {
  lastFocus = trigger;
  const dialog = document.querySelector<HTMLDialogElement>(`#${id}`)!;
  dialog.showModal();
  requestAnimationFrame(() => dialog.querySelector<HTMLElement>('.dialog-body input, .dialog-body textarea, .dialog-body select, .dialog-body a, .dialog-body button')?.focus());
}

function closeDialog(dialog: HTMLDialogElement): void {
  dialog.close();
  lastFocus?.focus();
}

async function addProcedure(event: SubmitEvent): Promise<void> {
  event.preventDefault();
  const form = event.currentTarget as HTMLFormElement;
  const data = new FormData(form);
  const slots = (data.get('slots') as string).split('\n').map(value => value.trim()).filter(Boolean);
  if (!slots.length) { form.querySelector<HTMLElement>('#procedure-error')!.textContent = 'Add at least one required evidence file.'; return; }
  const due = new Date(data.get('due') as string);
  if (!Number.isFinite(due.getTime())) { form.querySelector<HTMLElement>('#procedure-error')!.textContent = 'Choose a valid first due time.'; return; }
  const now = new Date().toISOString();
  const proc: Procedure = { id: crypto.randomUUID(), title: (data.get('title') as string).trim(), instructions: (data.get('instructions') as string).trim(), frequency: data.get('frequency') as Frequency, evidenceSlots: [...new Set(slots)].slice(0, 12), createdAt: now, active: true };
  const record: CheckRecord = { id: crypto.randomUUID(), procedureId: proc.id, dueAt: due.toISOString(), status: 'open', evidence: {}, notes: '', signedBy: '' };
  binder!.procedures.push(proc);
  binder!.records.push(record);
  binder!.audit.push({ id: crypto.randomUUID(), at: now, action: 'procedure.created', detail: proc.title });
  await persist();
  closeDialog(document.querySelector<HTMLDialogElement>('#procedure-dialog')!);
  renderBinder();
  announce(`${proc.title} added.`);
}

function openRecord(id: string, trigger: HTMLElement): void {
  activeRecordId = id;
  const record = binder!.records.find(item => item.id === id)!;
  const proc = procedure(record)!;
  const readOnly = record.status === 'complete';
  const slots = proc.evidenceSlots.map((slot, index) => {
    const file = record.evidence[slot];
    let control: string;
    if (hasRetainedEvidence(file)) {
      control = `<div class="file-chip"><span>${html(file.name)} <span class="tiny">(${Math.ceil(file.size/1024)} KB)</span></span><span class="file-actions"><a class="button compact" download="${html(file.name)}" href="${html(file.data)}">Download file</a><button type="button" class="compact danger" data-remove-file="${html(slot)}">Remove file</button></span></div>`;
    } else if (file?.removedAt) {
      control = `<p class="notice warn">${html(file.name)} was removed ${file.removalReason === 'retention' ? 'by the retention policy' : 'by the binder owner'} on ${when(file.removedAt)}.</p>`;
    } else if (readOnly) {
      control = '<p class="muted">No file is retained for this item.</p>';
    } else {
      control = `<div class="drop-zone"><input id="evidence-${index}" aria-label="${html(slot)} required" data-slot="${html(slot)}" type="file" accept="image/*,application/pdf,text/plain,.csv" ${index === 0 ? 'capture="environment"' : ''}><span class="hint">Photo, PDF, text, or CSV. Maximum 8 MB.</span></div>`;
    }
    return `<div class="slot"><p class="slot-label">${html(slot)} <span class="required">required</span></p>${control}</div>`;
  }).join('');
  document.querySelector<HTMLElement>('#record-title')!.textContent = proc.title;
  document.querySelector<HTMLElement>('#record-body')!.innerHTML = `<p>${html(proc.instructions || 'No working instructions recorded.')}</p><p class="tag ${isOverdue(record) ? 'late' : ''}">${record.status === 'complete' ? `Completed ${when(record.completedAt!)}` : `Due ${when(record.dueAt)}`}</p><form id="record-form">${slots}<div class="field"><label for="record-notes">Notes</label><textarea id="record-notes" name="notes" maxlength="1000" ${readOnly ? 'readonly' : ''}>${html(record.notes)}</textarea></div><div class="field"><label for="signed-by">${readOnly ? 'Signed by' : 'Sign-off name'}</label><input id="signed-by" name="signedBy" maxlength="100" value="${html(record.signedBy)}" ${readOnly ? 'readonly' : 'required'}><span class="hint">This is an operational sign-off, not an identity certificate.</span></div><p id="record-error" class="error" role="alert"></p><div class="dialog-actions"><button type="button" data-close>Close</button>${readOnly ? '' : '<button type="submit">Save draft</button><button type="button" id="complete-check" class="primary rec">Complete check</button>'}</div></form>`;
  const dialog = document.querySelector<HTMLDialogElement>('#record-dialog')!;
  dialog.querySelectorAll<HTMLElement>('[data-close]').forEach(element => element.addEventListener('click', () => closeDialog(dialog)));
  dialog.querySelectorAll<HTMLInputElement>('[data-slot]').forEach(input => input.addEventListener('change', attachFile));
  dialog.querySelectorAll<HTMLButtonElement>('[data-remove-file]').forEach(button => button.addEventListener('click', () => removeFile(button.dataset.removeFile!)));
  dialog.querySelector<HTMLFormElement>('#record-form')?.addEventListener('submit', saveDraft);
  dialog.querySelector('#complete-check')?.addEventListener('click', completeCheck);
  openDialog('record-dialog', trigger);
}

async function attachFile(event: Event): Promise<void> {
  const input = event.currentTarget as HTMLInputElement;
  const file = input.files?.[0];
  if (!file || !activeRecordId) return;
  const error = document.querySelector<HTMLElement>('#record-error')!;
  if (file.size > 8 * 1024 * 1024) { error.textContent = 'That file is over 8 MB. Choose a smaller file.'; input.value = ''; return; }
  try {
    const data = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error('The file could not be read. Choose it again.'));
      reader.readAsDataURL(file);
    });
    const record = binder!.records.find(item => item.id === activeRecordId)!;
    record.evidence[input.dataset.slot!] = { name: file.name, type: file.type || 'application/octet-stream', size: file.size, data, addedAt: new Date().toISOString() };
    binder!.audit.push({ id: crypto.randomUUID(), at: new Date().toISOString(), action: 'evidence.attached', detail: `${procedure(record)?.title}: ${input.dataset.slot}` });
    await persist();
    const recordId = record.id;
    closeDialog(document.querySelector<HTMLDialogElement>('#record-dialog')!);
    renderBinder();
    const trigger = document.querySelector<HTMLElement>(`[data-record="${recordId}"]`)!;
    openRecord(recordId, trigger);
    announce(`${file.name} attached.`);
  } catch (cause) {
    error.textContent = cause instanceof Error ? cause.message : 'The file could not be attached. Choose it again.';
  }
}

async function removeFile(slot: string): Promise<void> {
  const record = binder!.records.find(item => item.id === activeRecordId)!;
  const file = record.evidence[slot];
  if (!file || !confirm(`Remove ${file.name} from “${slot}”? The filename stays in the record.`)) return;
  if (record.status === 'complete') {
    file.data = '';
    file.removedAt = new Date().toISOString();
    file.removalReason = 'user';
  } else {
    delete record.evidence[slot];
  }
  binder!.audit.push({ id: crypto.randomUUID(), at: new Date().toISOString(), action: 'evidence.removed', detail: `${procedure(record)?.title}: ${slot}` });
  await persist();
  const recordId = record.id;
  closeDialog(document.querySelector<HTMLDialogElement>('#record-dialog')!);
  renderBinder();
  openRecord(recordId, document.querySelector<HTMLElement>(`[data-record="${recordId}"]`)!);
  announce('Evidence file removed.');
}

async function saveDraft(event: SubmitEvent): Promise<void> {
  event.preventDefault();
  await updateRecordForm();
  closeDialog(document.querySelector<HTMLDialogElement>('#record-dialog')!);
  renderBinder();
  announce('Draft saved.');
}

async function updateRecordForm(): Promise<CheckRecord> {
  const form = document.querySelector<HTMLFormElement>('#record-form')!;
  const data = new FormData(form);
  const record = binder!.records.find(item => item.id === activeRecordId)!;
  record.notes = (data.get('notes') as string).trim();
  record.signedBy = (data.get('signedBy') as string).trim();
  await persist();
  return record;
}

async function completeCheck(): Promise<void> {
  const record = await updateRecordForm();
  const proc = procedure(record)!;
  const missing = proc.evidenceSlots.filter(slot => !hasRetainedEvidence(record.evidence[slot]));
  const error = document.querySelector<HTMLElement>('#record-error')!;
  if (missing.length) { error.textContent = `Attach required evidence: ${missing.join(', ')}.`; return; }
  if (!record.signedBy) { error.textContent = 'Enter the sign-off name before completing this check.'; document.querySelector<HTMLInputElement>('#signed-by')!.focus(); return; }
  const completedAt = new Date().toISOString();
  record.status = 'complete';
  record.completedAt = completedAt;
  binder!.records.push({ id: crypto.randomUUID(), procedureId: proc.id, dueAt: nextDue(record.dueAt, proc.frequency), status: 'open', evidence: {}, notes: '', signedBy: '' });
  binder!.audit.push({ id: crypto.randomUUID(), at: completedAt, action: 'check.completed', detail: `${proc.title}, signed by ${record.signedBy}` });
  await persist();
  closeDialog(document.querySelector<HTMLDialogElement>('#record-dialog')!);
  renderBinder();
  announce(`${proc.title} completed. The next check is scheduled.`);
}

async function persist(): Promise<void> {
  if (demoMode) return;
  if (!vaultKey || !binder) throw new Error('The binder is locked. Unlock it and try again.');
  try { await saveVault(vaultKey, binder); }
  catch (cause) { announce(cause instanceof Error ? cause.message : 'Changes could not be saved.'); throw cause; }
}

async function updateRetention(event: Event): Promise<void> {
  const select = event.currentTarget as HTMLSelectElement;
  const custom = document.querySelector<HTMLElement>('#custom-retention')!;
  if (select.value === 'custom') { custom.hidden = false; document.querySelector<HTMLInputElement>('#retention-days')!.focus(); return; }
  custom.hidden = true;
  binder!.retentionDays = Number(select.value);
  binder!.audit.push({ id: crypto.randomUUID(), at: new Date().toISOString(), action: 'retention.changed', detail: select.options[select.selectedIndex].text });
  await persist();
  announce('File retention saved.');
}

async function updateCustomRetention(event: Event): Promise<void> {
  const input = event.currentTarget as HTMLInputElement;
  const value = Number(input.value);
  if (!Number.isInteger(value) || value < 1 || value > 3650) { input.setCustomValidity('Enter a whole number from 1 to 3650.'); input.reportValidity(); return; }
  input.setCustomValidity('');
  binder!.retentionDays = value;
  binder!.audit.push({ id: crypto.randomUUID(), at: new Date().toISOString(), action: 'retention.changed', detail: `${value} days` });
  await persist();
  announce(`File retention set to ${value} days.`);
}

async function importBinder(event: Event): Promise<void> {
  const input = event.currentTarget as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;
  try {
    const imported = parseBackup(await file.text());
    if (!confirm(`Replace this binder with ${imported.procedures.length} procedure(s) and ${imported.records.length} record(s) from ${file.name}?`)) { input.value = ''; return; }
    imported.audit.push({ id: crypto.randomUUID(), at: new Date().toISOString(), action: 'binder.imported', detail: file.name });
    if (!demoMode) await saveVault(vaultKey!, imported);
    binder = imported;
    renderBinder();
    announce('Valid backup restored.');
  } catch {
    announce('This backup is invalid. Your current binder was not replaced.');
    input.value = '';
  }
}

async function archiveProcedure(id: string): Promise<void> {
  const proc = binder!.procedures.find(item => item.id === id)!;
  if (!confirm(`Archive “${proc.title}”? Open checks will be removed. Completed records stay available.`)) return;
  proc.active = false;
  binder!.records = binder!.records.filter(record => record.procedureId !== id || record.status === 'complete');
  binder!.audit.push({ id: crypto.randomUUID(), at: new Date().toISOString(), action: 'procedure.archived', detail: proc.title });
  await persist();
  renderBinder();
  announce(`${proc.title} archived.`);
}

async function eraseBinder(): Promise<void> {
  if (demoMode) { binder = sampleBinder(); view = 'today'; renderBinder(); announce('Sample data reset.'); return; }
  if (!confirm('Permanently erase every procedure, sign-off, and evidence file from this browser? This cannot be undone.')) return;
  await eraseVault();
  binder = null;
  vaultKey = null;
  history.pushState({}, '', '/');
  renderGate();
  announce('The local binder was erased.');
}

function announce(message: string): void {
  let live = document.querySelector<HTMLElement>('#announcer');
  if (!live) {
    live = document.createElement('div');
    live.id = 'announcer';
    live.className = 'sr-only';
    live.setAttribute('aria-live', 'polite');
    document.body.append(live);
  }
  live.textContent = '';
  setTimeout(() => { live!.textContent = message; }, 10);
  document.querySelector('.toast')?.remove();
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.setAttribute('role', 'status');
  toast.textContent = message;
  document.body.append(toast);
  setTimeout(() => toast.remove(), 5000);
}

function showUpdate(): void {
  document.querySelector('.update-toast')?.remove();
  const toast = document.createElement('div');
  toast.className = 'toast update-toast';
  toast.setAttribute('role', 'status');
  toast.innerHTML = '<span>A Proofbook update is ready.</span><button type="button">Reload update</button>';
  toast.querySelector('button')!.addEventListener('click', () => location.reload());
  document.body.append(toast);
}

function reflectConnectivity(): void { document.querySelector('#offline-badge')?.classList.toggle('show', !navigator.onLine); }
function setupConnectivity(): void {
  addEventListener('online', () => { reflectConnectivity(); announce('Back online.'); });
  addEventListener('offline', () => { reflectConnectivity(); announce('You are offline. Changes still work on this device.'); });
}

function setupServiceWorker(): void {
  if (!('serviceWorker' in navigator) || import.meta.env.DEV) return;
  addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      registration.addEventListener('updatefound', () => {
        const worker = registration.installing;
        worker?.addEventListener('statechange', () => {
          if (worker.state === 'installed' && navigator.serviceWorker.controller) showUpdate();
        });
      });
    } catch { announce('Offline setup could not finish. Reload while online to try again.'); }
  });
}

addEventListener('popstate', () => {
  const nextDemoMode = isDemoLocation();
  view = viewFromLocation();
  if (nextDemoMode !== demoMode) {
    demoMode = nextDemoMode;
    binder = demoMode ? sampleBinder() : null;
    vaultKey = null;
  }
  if (binder) renderBinder(true); else renderGate();
});
