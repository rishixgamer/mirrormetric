import type {
  AnalysisSession,
  EncryptedHistoryExport,
  EncryptedEnvelope,
} from "../domain/contracts";
import { HISTORY_EXPORT_SCHEMA_VERSION } from "../domain/contracts";
import { migrateAnalysisSession } from "./session";

const DATABASE_NAME = "mirrormetric-local";
const STORE_NAME = "encrypted-sessions";
const DATABASE_VERSION = 1;
const PBKDF2_ITERATIONS = 600_000;

interface StoredRecord {
  readonly id: string;
  readonly createdAt: string;
  readonly envelope: EncryptedEnvelope;
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let index = 0; index < bytes.length; index += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(index, index + 0x8000));
  }
  return btoa(binary);
}

function base64ToBytes(value: string): Uint8Array<ArrayBuffer> {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index++) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

async function deriveKey(
  passphrase: string,
  salt: BufferSource,
): Promise<CryptoKey> {
  if (passphrase.length < 10) {
    throw new Error("Use a local-history passphrase with at least 10 characters.");
  }
  const material = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(passphrase),
    "PBKDF2",
    false,
    ["deriveKey"],
  );
  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      hash: "SHA-256",
      salt,
      iterations: PBKDF2_ITERATIONS,
    },
    material,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

export async function encryptPayload(
  payload: unknown,
  passphrase: string,
): Promise<EncryptedEnvelope> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(passphrase, salt);
  const plaintext = new TextEncoder().encode(JSON.stringify(payload));
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    plaintext,
  );
  return {
    version: 1,
    algorithm: "AES-GCM",
    kdf: "PBKDF2-SHA-256",
    iterations: PBKDF2_ITERATIONS,
    salt: bytesToBase64(salt),
    iv: bytesToBase64(iv),
    ciphertext: bytesToBase64(new Uint8Array(ciphertext)),
  };
}

export async function decryptPayload<T>(
  envelope: EncryptedEnvelope,
  passphrase: string,
): Promise<T> {
  try {
    const salt = base64ToBytes(envelope.salt);
    const iv = base64ToBytes(envelope.iv);
    const key = await deriveKey(passphrase, salt);
    const plaintext = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv },
      key,
      base64ToBytes(envelope.ciphertext),
    );
    return JSON.parse(new TextDecoder().decode(plaintext)) as T;
  } catch {
    throw new Error(
      "The passphrase did not unlock this local record, or the record is damaged.",
    );
  }
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
    request.addEventListener("upgradeneeded", () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    });
    request.addEventListener("success", () => resolve(request.result));
    request.addEventListener("error", () =>
      reject(request.error ?? new Error("Could not open local history.")),
    );
  });
}

function transactionDone(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.addEventListener("complete", () => resolve());
    transaction.addEventListener("abort", () =>
      reject(transaction.error ?? new Error("Local history operation aborted.")),
    );
    transaction.addEventListener("error", () =>
      reject(transaction.error ?? new Error("Local history operation failed.")),
    );
  });
}

export async function saveSession(
  session: AnalysisSession,
  passphrase: string,
): Promise<void> {
  const database = await openDatabase();
  try {
    const envelope = await encryptPayload(session, passphrase);
    const transaction = database.transaction(STORE_NAME, "readwrite");
    transaction.objectStore(STORE_NAME).put({
      id: session.id,
      createdAt: session.createdAt,
      envelope,
    } satisfies StoredRecord);
    await transactionDone(transaction);
  } finally {
    database.close();
  }
}

async function getRecords(): Promise<StoredRecord[]> {
  const database = await openDatabase();
  try {
    const transaction = database.transaction(STORE_NAME, "readonly");
    const request = transaction.objectStore(STORE_NAME).getAll();
    const records = await new Promise<StoredRecord[]>((resolve, reject) => {
      request.addEventListener("success", () =>
        resolve(request.result as StoredRecord[]),
      );
      request.addEventListener("error", () =>
        reject(request.error ?? new Error("Could not read local history.")),
      );
    });
    await transactionDone(transaction);
    return records.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  } finally {
    database.close();
  }
}

export async function listSessions(
  passphrase: string,
): Promise<AnalysisSession[]> {
  const records = await getRecords();
  const sessions: AnalysisSession[] = [];
  for (const record of records) {
    sessions.push(
      migrateAnalysisSession(
        await decryptPayload<unknown>(record.envelope, passphrase),
      ),
    );
  }
  return sessions;
}

export async function deleteSession(id: string): Promise<void> {
  const database = await openDatabase();
  try {
    const transaction = database.transaction(STORE_NAME, "readwrite");
    transaction.objectStore(STORE_NAME).delete(id);
    await transactionDone(transaction);
  } finally {
    database.close();
  }
}

export async function deleteAllSessions(): Promise<void> {
  const database = await openDatabase();
  try {
    const transaction = database.transaction(STORE_NAME, "readwrite");
    transaction.objectStore(STORE_NAME).clear();
    await transactionDone(transaction);
  } finally {
    database.close();
  }
}

export async function exportEncryptedHistory(
  passphrase: string,
): Promise<void> {
  const sessions = await listSessions(passphrase);
  const payload: EncryptedHistoryExport = {
    schemaVersion: HISTORY_EXPORT_SCHEMA_VERSION,
    product: "MirrorMetric",
    format: "mirrormetric-encrypted-export",
    exportedAt: new Date().toISOString(),
    sessions,
  };
  const envelope = await encryptPayload(payload, passphrase);
  downloadJson(
    envelope,
    `mirrormetric-encrypted-${new Date().toISOString().slice(0, 10)}.json`,
  );
}

export function downloadJson(value: unknown, filename: string): void {
  const blob = new Blob([JSON.stringify(value, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
