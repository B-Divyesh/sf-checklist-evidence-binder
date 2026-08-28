import { describe, expect, it, vi } from 'vitest';
import { blankBinder, isOverdue, nextDue, pruneEvidence, type Binder, type CheckRecord } from './model';

describe('recurring checks', () => {
  it('moves weekly due dates forward seven days', () => {
    expect(nextDue('2026-08-28T09:00:00.000Z', 'weekly')).toBe('2026-09-04T09:00:00.000Z');
  });

  it('only marks open past records overdue', () => {
    const base: CheckRecord = { id: 'r', procedureId: 'p', dueAt: '2026-08-01T00:00:00.000Z', status: 'open', evidence: {}, notes: '', signedBy: '' };
    expect(isOverdue(base, new Date('2026-08-02T00:00:00.000Z'))).toBe(true);
    expect(isOverdue({ ...base, status: 'complete' }, new Date('2026-08-02T00:00:00.000Z'))).toBe(false);
  });
});

describe('retention', () => {
  it('removes old evidence but retains record metadata', () => {
    vi.stubGlobal('crypto', { randomUUID: () => 'audit-id' });
    const binder: Binder = { ...blankBinder(), retentionDays: 30, records: [{ id: 'r', procedureId: 'p', dueAt: '2026-01-01T00:00:00.000Z', status: 'complete', completedAt: '2026-01-02T00:00:00.000Z', evidence: { Photo: { name: 'proof.jpg', type: 'image/jpeg', size: 4, data: 'data:image/jpeg;base64,AAAA', addedAt: '2026-01-02T00:00:00.000Z' } }, notes: 'safe', signedBy: 'Rae' }] };
    expect(pruneEvidence(binder, new Date('2026-03-01T00:00:00.000Z'))).toBe(1);
    expect(binder.records[0].evidence).toEqual({});
    expect(binder.records[0].signedBy).toBe('Rae');
    vi.unstubAllGlobals();
  });
});
