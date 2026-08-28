import type { Binder } from './model';

const DB_NAME = 'proofbook-vault';
const STORE = 'encrypted';
const META_KEY = 'proofbook:vault-meta';

interface Envelope { iv: number[]; cipher: ArrayBuffer; }
interface Meta { salt: number[]; }

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
  });
  db.close();
}

async function getEnvelope(): Promise<Envelope | undefined> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).get('binder');
    req.onsuccess = () => { db.close(); resolve(req.result as Envelope | undefined); };
    req.onerror = () => reject(new Error('Proofbook could not read the local binder.'));
  });
}

export function hasVault(): boolean { return Boolean(localStorage.getItem(META_KEY)); }

export async function createVault(passphrase: string, binder: Binder): Promise<CryptoKey> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await derive(passphrase, salt);
  localStorage.setItem(META_KEY, JSON.stringify({ salt: [...salt] } satisfies Meta));
  await saveVault(key, binder);
  return key;
}

export async function unlockVault(passphrase: string): Promise<{ key: CryptoKey; binder: Binder }> {
  const raw = localStorage.getItem(META_KEY);
  if (!raw) throw new Error('No local binder exists yet.');
  const meta = JSON.parse(raw) as Meta;
  const key = await derive(passphrase, new Uint8Array(meta.salt));
  const envelope = await getEnvelope();
  if (!envelope) throw new Error('The encrypted binder is missing. Restore a backup or create a new binder.');
  try {
    const clear = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: new Uint8Array(envelope.iv) }, key, envelope.cipher);
    return { key, binder: JSON.parse(new TextDecoder().decode(clear)) as Binder };
  } catch {
    throw new Error('That passphrase did not unlock this binder. Try again.');
  }
}

export async function saveVault(key: CryptoKey, binder: Binder): Promise<void> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const clear = new TextEncoder().encode(JSON.stringify(binder));
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

export async function replaceVault(passphrase: string, binder: Binder): Promise<CryptoKey> {
  if (binder.version !== 1 || !Array.isArray(binder.procedures) || !Array.isArray(binder.records)) throw new Error('This is not a supported Proofbook backup.');
  return createVault(passphrase, binder);
}
