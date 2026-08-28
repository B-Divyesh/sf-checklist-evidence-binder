import type { Binder, CheckRecord, Procedure } from './model';

function esc(value: string): string {
  return value.replace(/[&<>'"]/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', "'":'&#39;', '"':'&quot;' })[c]!);
}

export async function fingerprint(value: unknown): Promise<string> {
  const data = new TextEncoder().encode(JSON.stringify(value));
  const digest = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('');
}

function download(name: string, blob: Blob): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function exportBackup(binder: Binder): void {
  download(`proofbook-backup-${new Date().toISOString().slice(0,10)}.json`, new Blob([JSON.stringify(binder, null, 2)], { type: 'application/json' }));
}

export async function exportEvidence(binder: Binder): Promise<string> {
  const completed = binder.records.filter(r => r.status === 'complete');
  const exportedAt = new Date().toISOString();
  const manifest = await Promise.all(completed.map(async record => ({
    id: record.id,
    procedureId: record.procedureId,
    dueAt: record.dueAt,
    completedAt: record.completedAt,
    signedBy: record.signedBy,
    files: await Promise.all(Object.values(record.evidence).map(async file => ({ name: file.name, type: file.type, size: file.size, addedAt: file.addedAt, contentSha256: await fingerprint(file.data) })))
  })));
  const hash = await fingerprint({ exportedAt, manifest });
  const procedureFor = (record: CheckRecord): Procedure | undefined => binder.procedures.find(p => p.id === record.procedureId);
  const sections = completed.map(record => {
    const procedure = procedureFor(record);
    const files = Object.entries(record.evidence).map(([slot, file]) => `<li><strong>${esc(slot)}</strong> — <a download="${esc(file.name)}" href="${file.data}">${esc(file.name)}</a> (${Math.ceil(file.size / 1024)} KB), attached ${esc(new Date(file.addedAt).toLocaleString())}</li>`).join('');
    return `<section><h2>${esc(procedure?.title || 'Archived procedure')}</h2><dl><dt>Due</dt><dd>${esc(new Date(record.dueAt).toLocaleString())}</dd><dt>Completed</dt><dd>${esc(new Date(record.completedAt!).toLocaleString())}</dd><dt>Signed by</dt><dd>${esc(record.signedBy)}</dd></dl><p>${esc(record.notes || 'No notes recorded.')}</p><h3>Evidence</h3>${files ? `<ul>${files}</ul>` : `<p>Evidence files were removed under the binder retention policy.</p>`}</section>`;
  }).join('');
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Proofbook evidence bundle</title><style>body{font:16px/1.55 ui-monospace,monospace;background:#f2ebd8;color:#171814;max-width:900px;margin:auto;padding:32px}h1,h2{font-family:Arial,sans-serif;text-transform:uppercase}header,section{background:#fffdf5;border:2px solid;padding:24px;margin-bottom:20px}code{overflow-wrap:anywhere}dt{font-weight:bold}dd{margin:0 0 8px}a{color:#7e2819}</style></head><body><header><p>READ-ONLY EXPORT</p><h1>Proofbook evidence bundle</h1><p>Exported ${esc(new Date(exportedAt).toLocaleString())}. ${completed.length} completed check(s).</p><p>Manifest SHA-256: <code>${hash}</code></p><p>This bundle is a recordkeeping export, not proof of regulatory compliance. Save the fingerprint separately if you need to compare this exact manifest later.</p></header>${sections || '<section><h2>No completed checks</h2><p>There was no completed evidence to include.</p></section>'}</body></html>`;
  download(`proofbook-evidence-${new Date().toISOString().slice(0,10)}.html`, new Blob([html], { type: 'text/html' }));
  return hash;
}
