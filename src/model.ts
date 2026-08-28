export type Frequency = 'daily' | 'weekly' | 'monthly';

export interface EvidenceFile {
  name: string;
  type: string;
  size: number;
  data: string;
  addedAt: string;
}

export interface Procedure {
  id: string;
  title: string;
  instructions: string;
  frequency: Frequency;
  evidenceSlots: string[];
  createdAt: string;
  active: boolean;
}

export interface CheckRecord {
  id: string;
  procedureId: string;
  dueAt: string;
  status: 'open' | 'complete';
  evidence: Record<string, EvidenceFile>;
  notes: string;
  signedBy: string;
  completedAt?: string;
  evidencePrunedAt?: string;
}

export interface AuditEvent {
  id: string;
  at: string;
  action: string;
  detail: string;
}

export interface Binder {
  version: 1;
  createdAt: string;
  retentionDays: number;
  procedures: Procedure[];
  records: CheckRecord[];
  audit: AuditEvent[];
}

export function blankBinder(): Binder {
  const now = new Date().toISOString();
  return { version: 1, createdAt: now, retentionDays: 365, procedures: [], records: [], audit: [{ id: crypto.randomUUID(), at: now, action: 'binder.created', detail: 'Encrypted binder created' }] };
}

export function nextDue(dateIso: string, frequency: Frequency): string {
  const date = new Date(dateIso);
  if (frequency === 'daily') date.setDate(date.getDate() + 1);
  if (frequency === 'weekly') date.setDate(date.getDate() + 7);
  if (frequency === 'monthly') date.setMonth(date.getMonth() + 1);
  return date.toISOString();
}

export function isOverdue(record: CheckRecord, now = new Date()): boolean {
  return record.status === 'open' && new Date(record.dueAt).getTime() < now.getTime();
}

export function pruneEvidence(binder: Binder, now = new Date()): number {
  if (binder.retentionDays === 0) return 0;
  const cutoff = now.getTime() - binder.retentionDays * 86_400_000;
  let removed = 0;
  for (const record of binder.records) {
    if (record.completedAt && !record.evidencePrunedAt && new Date(record.completedAt).getTime() < cutoff) {
      removed += Object.keys(record.evidence).length;
      record.evidence = {};
      record.evidencePrunedAt = now.toISOString();
    }
  }
  if (removed) binder.audit.push({ id: crypto.randomUUID(), at: now.toISOString(), action: 'evidence.pruned', detail: `${removed} retained file(s) removed by policy` });
  return removed;
}
