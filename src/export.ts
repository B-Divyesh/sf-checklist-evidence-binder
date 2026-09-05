import { hasRetainedEvidence, type Binder, type CheckRecord, type Procedure } from './model';

function esc(value: string): string {
  return value.replace(/[&<>'"]/g, character => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', "'":'&#39;', '"':'&quot;' })[character]!);
}

export async function fingerprintText(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('');
}

export async function fingerprint(value: unknown): Promise<string> {
  return fingerprintText(JSON.stringify(value));
}

function download(name: string, blob: Blob): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function exportBackup(binder: Binder): void {
  download(`proofbook-backup-${new Date().toISOString().slice(0,10)}.json`, new Blob([JSON.stringify(binder, null, 2)], { type: 'application/json' }));
}

export async function buildEvidenceReport(binder: Binder, exportedAt = new Date().toISOString()): Promise<{ html: string; hash: string; manifestJson: string }> {
  const completed = binder.records.filter(record => record.status === 'complete');
  const procedureFor = (record: CheckRecord): Procedure | undefined => binder.procedures.find(procedure => procedure.id === record.procedureId);
  const manifest = {
    format: 'proofbook-evidence-manifest-v1',
    exportedAt,
    records: await Promise.all(completed.map(async record => {
      const procedure = procedureFor(record);
      return {
        recordId: record.id,
        procedureId: record.procedureId,
        procedureTitle: procedure?.title || 'Archived procedure',
        dueAt: record.dueAt,
        completedAt: record.completedAt,
        signedBy: record.signedBy,
        notes: record.notes,
        evidence: await Promise.all(Object.entries(record.evidence).map(async ([slot, file]) => ({
          slot,
          name: file.name,
          type: file.type,
          size: file.size,
          addedAt: file.addedAt,
          retained: hasRetainedEvidence(file),
          removedAt: file.removedAt || null,
          removalReason: file.removalReason || null,
          contentSha256: hasRetainedEvidence(file) ? await fingerprintText(file.data) : null
        })))
      };
    }))
  };
  const manifestJson = JSON.stringify(manifest, null, 2);
  const hash = await fingerprintText(manifestJson);
  const sections = completed.map(record => {
    const procedure = procedureFor(record);
    const files = Object.entries(record.evidence).map(([slot, file]) => {
      if (!hasRetainedEvidence(file)) return `<li><strong>${esc(slot)}</strong> — ${esc(file.name)} (file removed ${file.removalReason === 'retention' ? 'by retention policy' : 'by the binder owner'})</li>`;
      return `<li><strong>${esc(slot)}</strong> — <a download="${esc(file.name)}" href="${esc(file.data)}">Download ${esc(file.name)}</a> (${Math.ceil(file.size / 1024)} KB)</li>`;
    }).join('');
    return `<section><h2>${esc(procedure?.title || 'Archived procedure')}</h2><dl><dt>Due</dt><dd>${esc(record.dueAt)}</dd><dt>Completed</dt><dd>${esc(record.completedAt!)}</dd><dt>Signed by</dt><dd>${esc(record.signedBy)}</dd></dl><p>${esc(record.notes || 'No notes recorded.')}</p><h3>Evidence</h3>${files ? `<ul>${files}</ul>` : '<p>No evidence filenames are recorded.</p>'}</section>`;
  }).join('');
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Proofbook evidence report</title><style>body{font:16px/1.55 ui-monospace,monospace;background:#f2ebd8;color:#171814;max-width:900px;margin:auto;padding:32px}h1,h2{font-family:Arial,sans-serif;text-transform:uppercase}header,section{background:#fffdf5;border:2px solid;padding:24px;margin-bottom:20px}code,pre{overflow-wrap:anywhere;white-space:pre-wrap}dt{font-weight:bold}dd{margin:0 0 8px}a{color:#7e2819}</style></head><body><header><p>STANDALONE EXPORT</p><h1>Proofbook evidence report</h1><p>Exported ${esc(exportedAt)}. ${completed.length} completed check(s).</p><p>Manifest SHA-256: <code id="manifest-sha256">${hash}</code></p><p>Recalculate SHA-256 from the exact UTF-8 text in the manifest below. Each retained file has its own SHA-256 value.</p></header>${sections || '<section><h2>No completed checks</h2><p>There was no completed evidence to include.</p></section>'}<section><h2>Integrity manifest</h2><pre id="proofbook-manifest">${esc(manifestJson)}</pre></section></body></html>`;
  return { html, hash, manifestJson };
}

export async function exportEvidence(binder: Binder): Promise<string> {
  const report = await buildEvidenceReport(binder);
  download(`proofbook-evidence-${new Date().toISOString().slice(0,10)}.html`, new Blob([report.html], { type: 'text/html' }));
  return report.hash;
}
