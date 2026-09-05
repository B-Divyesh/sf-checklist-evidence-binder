export type Frequency = 'daily' | 'weekly' | 'monthly';

export interface EvidenceFile {
  name: string;
  type: string;
  size: number;
  data: string;
  addedAt: string;
  removedAt?: string;
  removalReason?: 'retention' | 'user';
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

export class BinderValidationError extends Error {
  constructor() {
    super('This backup is invalid. Your current binder was not replaced.');
    this.name = 'BinderValidationError';
  }
}

const fail = (): never => { throw new BinderValidationError(); };
const object = (value: unknown): Record<string, unknown> => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail();
  return value as Record<string, unknown>;
};
const string = (value: unknown, max: number, allowEmpty = false): string => {
  if (typeof value !== 'string' || value.length > max || (!allowEmpty && !value.trim())) fail();
  return value as string;
};
const date = (value: unknown): string => {
  const result = string(value, 40);
  if (!Number.isFinite(Date.parse(result))) fail();
  return result;
};
const integer = (value: unknown, min: number, max: number): number => {
  if (!Number.isInteger(value) || (value as number) < min || (value as number) > max) fail();
  return value as number;
};

export function blankBinder(): Binder {
  const now = new Date().toISOString();
  return {
    version: 1,
    createdAt: now,
    retentionDays: 365,
    procedures: [],
    records: [],
    audit: [{ id: crypto.randomUUID(), at: now, action: 'binder.created', detail: 'Encrypted binder created' }]
  };
}

export function sampleBinder(now = new Date()): Binder {
  const at = (days: number, hour = 9): string => {
    const value = new Date(now);
    value.setDate(value.getDate() + days);
    value.setHours(hour, 0, 0, 0);
    return value.toISOString();
  };
  const textFile = (name: string, content: string, addedAt: string): EvidenceFile => ({
    name,
    type: 'text/plain',
    size: new TextEncoder().encode(content).length,
    data: `data:text/plain;base64,${btoa(content)}`,
    addedAt
  });
  const procedures: Procedure[] = [
    { id: 'demo-cold-room', title: 'Cold room opening check', instructions: 'Read the display before stock is moved. Record any action taken.', frequency: 'daily', evidenceSlots: ['Temperature display', 'Opening log'], createdAt: at(-12), active: true },
    { id: 'demo-fire-exit', title: 'Weekly fire exit walk', instructions: 'Walk both exit routes. Record blocked access or damaged signs.', frequency: 'weekly', evidenceSlots: ['Exit route photo', 'Signed walk sheet'], createdAt: at(-28), active: true }
  ];
  const records: CheckRecord[] = [
    {
      id: 'demo-complete', procedureId: 'demo-cold-room', dueAt: at(-1, 10), status: 'complete',
      completedAt: at(-1, 9), signedBy: 'Rae Morgan', notes: 'Display read 3.8 °C. No action needed.',
      evidence: {
        'Temperature display': textFile('cold-room-display.txt', 'Cold room display: 3.8 C', at(-1, 9)),
        'Opening log': textFile('opening-log.txt', 'Door seal clear. Alarm tested.', at(-1, 9))
      }
    },
    { id: 'demo-next', procedureId: 'demo-cold-room', dueAt: at(1, 10), status: 'open', evidence: {}, notes: '', signedBy: '' },
    { id: 'demo-overdue', procedureId: 'demo-fire-exit', dueAt: at(-1, 15), status: 'open', evidence: {}, notes: '', signedBy: '' }
  ];
  return {
    version: 1,
    createdAt: at(-28),
    retentionDays: 365,
    procedures,
    records,
    audit: [
      { id: 'demo-audit-1', at: at(-28), action: 'binder.created', detail: 'Sample binder created' },
      { id: 'demo-audit-2', at: at(-1, 9), action: 'check.completed', detail: 'Cold room opening check, signed by Rae Morgan' }
    ]
  };
}

export function validateBinder(value: unknown): Binder {
  const root = object(value);
  if (root.version !== 1) fail();
  const proceduresValue = root.procedures;
  const recordsValue = root.records;
  const auditValue = root.audit;
  if (!Array.isArray(proceduresValue) || proceduresValue.length > 10_000 || !Array.isArray(recordsValue) || recordsValue.length > 100_000 || !Array.isArray(auditValue) || auditValue.length > 100_000) fail();
  const procedureInputs = proceduresValue as unknown[];
  const recordInputs = recordsValue as unknown[];
  const auditInputs = auditValue as unknown[];

  const procedureIds = new Set<string>();
  const procedures = procedureInputs.map(value => {
    const item = object(value);
    const id = string(item.id, 100);
    if (procedureIds.has(id)) fail();
    procedureIds.add(id);
    if (!Array.isArray(item.evidenceSlots) || item.evidenceSlots.length < 1 || item.evidenceSlots.length > 12) fail();
    const evidenceSlots = (item.evidenceSlots as unknown[]).map(slot => string(slot, 80));
    if (new Set(evidenceSlots).size !== evidenceSlots.length) fail();
    if (!['daily', 'weekly', 'monthly'].includes(item.frequency as string) || typeof item.active !== 'boolean') fail();
    return {
      id,
      title: string(item.title, 80),
      instructions: string(item.instructions, 600, true),
      frequency: item.frequency as Frequency,
      evidenceSlots,
      createdAt: date(item.createdAt),
      active: item.active as boolean
    };
  });

  const recordIds = new Set<string>();
  const records = recordInputs.map(value => {
    const item = object(value);
    const id = string(item.id, 100);
    const procedureId = string(item.procedureId, 100);
    if (recordIds.has(id) || !procedureIds.has(procedureId) || !['open', 'complete'].includes(item.status as string)) fail();
    recordIds.add(id);
    const proc = procedures.find(procedure => procedure.id === procedureId)!;
    const evidenceValue = object(item.evidence);
    const evidence: Record<string, EvidenceFile> = {};
    for (const [slot, rawFile] of Object.entries(evidenceValue)) {
      if (!proc.evidenceSlots.includes(slot)) fail();
      const file = object(rawFile);
      const data = string(file.data, 12_000_000, true);
      const removedAt = file.removedAt === undefined ? undefined : date(file.removedAt);
      const removalReason = file.removalReason === undefined ? undefined : file.removalReason;
      if (data && !data.startsWith('data:')) fail();
      if (!data && (!removedAt || !['retention', 'user'].includes(removalReason as string))) fail();
      evidence[slot] = {
        name: string(file.name, 255),
        type: string(file.type, 120),
        size: integer(file.size, 0, 8 * 1024 * 1024),
        data,
        addedAt: date(file.addedAt),
        ...(removedAt ? { removedAt, removalReason: removalReason as 'retention' | 'user' } : {})
      };
    }
    const status = item.status as 'open' | 'complete';
    const completedAt = item.completedAt === undefined ? undefined : date(item.completedAt);
    const signedBy = string(item.signedBy, 100, status === 'open');
    if (status === 'complete' && !completedAt) fail();
    return {
      id,
      procedureId,
      dueAt: date(item.dueAt),
      status,
      evidence,
      notes: string(item.notes, 1000, true),
      signedBy,
      ...(completedAt ? { completedAt } : {}),
      ...(item.evidencePrunedAt === undefined ? {} : { evidencePrunedAt: date(item.evidencePrunedAt) })
    };
  });

  const auditIds = new Set<string>();
  const audit = auditInputs.map(value => {
    const item = object(value);
    const id = string(item.id, 100);
    if (auditIds.has(id)) fail();
    auditIds.add(id);
    return { id, at: date(item.at), action: string(item.action, 80), detail: string(item.detail, 500, true) };
  });

  return {
    version: 1,
    createdAt: date(root.createdAt),
    retentionDays: integer(root.retentionDays, 0, 3650),
    procedures,
    records,
    audit
  };
}

export function parseBackup(text: string): Binder {
  try { return validateBinder(JSON.parse(text)); }
  catch { throw new BinderValidationError(); }
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

export function hasRetainedEvidence(file: EvidenceFile | undefined): boolean {
  return Boolean(file?.data);
}

export function pruneEvidence(binder: Binder, now = new Date()): number {
  if (binder.retentionDays === 0) return 0;
  const cutoff = now.getTime() - binder.retentionDays * 86_400_000;
  let removed = 0;
  for (const record of binder.records) {
    if (record.completedAt && new Date(record.completedAt).getTime() < cutoff) {
      let removedFromRecord = false;
      for (const file of Object.values(record.evidence)) {
        if (!file.data) continue;
        file.data = '';
        file.removedAt = now.toISOString();
        file.removalReason = 'retention';
        removed += 1;
        removedFromRecord = true;
      }
      if (removedFromRecord) record.evidencePrunedAt = now.toISOString();
    }
  }
  if (removed) binder.audit.push({ id: crypto.randomUUID(), at: now.toISOString(), action: 'evidence.pruned', detail: `${removed} retained file(s) removed by policy` });
  return removed;
}
