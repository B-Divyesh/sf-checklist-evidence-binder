import { validateBinder, type Binder } from './model';

const DB_NAME = 'proofbook-vault';
const STORE = 'encrypted';
const META_KEY = 'proofbook:vault-meta';

interface Envelope { iv: number[]; cipher: ArrayBuffer; }
interface Meta { salt: number[]; }

export class CorruptVaultError extends Error {
  readonly key: CryptoKey;
  constructor(key: CryptoKey) {
    super('This binder is damaged and cannot be opened. Restore a valid backup or erase it to start again.');
    this.name = 'CorruptVaultError';
    this.key = key;
  }
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(new Error('The local binder database could not be opened.'));
  });
}

async function derive(passphrase: string, salt: Uint8Array): Promise<CryptoKey> {
  const material = await crypto.subtle.importKey('raw', new TextEncoder().encode(passphrase), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey({ name: 'PBKDF2', salt: salt as BufferSource, iterations: 250_000, hash: 'SHA-256' }, material, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
}

async function putEnvelope(envelope: Envelope): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(envelope, 'binder');
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(new Error('Proofbook could not save to this browser. Export a backup before closing.'));
    tx.onabort = () => reject(new Error('Proofbook could not save to this browser. Export a backup before closing.'));
  });
  db.close();
}

async function getEnvelope(): Promise<Envelope | undefined> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).get('binder');
    req.onsuccess = () => { db.close(); resolve(req.result as Envelope | undefined); };
    req.onerror = () => { db.close(); reject(new Error('Proofbook could not read the local binder.')); };
  });
}

function readMeta(): Meta {
  try {
    const value = JSON.parse(localStorage.getItem(META_KEY) || 'null') as Meta | null;
    if (!value || !Array.isArray(value.salt) || value.salt.length !== 16 || value.salt.some(byte => !Number.isInteger(byte) || byte < 0 || byte > 255)) throw new Error();
    return value;
  } catch {
    throw new Error('The binder key information is damaged. Erase this binder, then restore a backup.');
  }
}

export function hasVault(): boolean { return Boolean(localStorage.getItem(META_KEY)); }

export async function createVault(passphrase: string, binder: Binder): Promise<CryptoKey> {
  const safeBinder = validateBinder(binder);
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await derive(passphrase, salt);
  await saveVault(key, safeBinder);
  localStorage.setItem(META_KEY, JSON.stringify({ salt: [...salt] } satisfies Meta));
  return key;
}

export async function unlockVault(passphrase: string): Promise<{ key: CryptoKey; binder: Binder }> {
  if (!hasVault()) throw new Error('No local binder exists yet.');
  const meta = readMeta();
  const key = await derive(passphrase, new Uint8Array(meta.salt));
  const envelope = await getEnvelope();
  if (!envelope) throw new Error('The encrypted binder is missing. Restore a backup or erase it to start again.');
  let clear: ArrayBuffer;
  try {
    clear = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: new Uint8Array(envelope.iv) }, key, envelope.cipher);
  } catch {
    throw new Error('That passphrase did not unlock this binder. Try again.');
  }
  try {
    const parsed = JSON.parse(new TextDecoder().decode(clear));
    return { key, binder: validateBinder(parsed) };
  } catch {
    throw new CorruptVaultError(key);
  }
}

export async function saveVault(key: CryptoKey, binder: Binder): Promise<void> {
  const safeBinder = validateBinder(binder);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const clear = new TextEncoder().encode(JSON.stringify(safeBinder));
  const cipher = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, clear);
  await putEnvelope({ iv: [...iv], cipher });
}

export async function eraseVault(): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const req = indexedDB.deleteDatabase(DB_NAME);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(new Error('The browser could not erase the binder.'));
    req.onblocked = () => reject(new Error('Close other Proofbook tabs, then erase again.'));
  });
  localStorage.removeItem(META_KEY);
}
