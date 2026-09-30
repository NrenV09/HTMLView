import { HostedProject } from '../types/workspace';
import { STARTER_PROJECTS } from '../data/starterProjects';

const DB_NAME = 'staticdock_offline_host_v1';
const STORE_NAME = 'projects';
const DB_VERSION = 1;

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function loadAllProjects(): Promise<HostedProject[]> {
  try {
    const db = await openDb();
    const existing = await new Promise<HostedProject[]>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });

    if (existing.length === 0) {
      await saveManyProjects(STARTER_PROJECTS);
      return [...STARTER_PROJECTS];
    }

    return existing.sort((a, b) => b.updatedAt - a.updatedAt);
  } catch {
    return [...STARTER_PROJECTS];
  }
}

export async function saveProject(project: HostedProject): Promise<void> {
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.put(project);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    // Fallback silently if IndexedDB is restricted
  }
}

export async function saveManyProjects(projects: HostedProject[]): Promise<void> {
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      for (const proj of projects) {
        store.put(proj);
      }
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    // Fallback silently
  }
}

export async function deleteProjectFromDb(projectId: string): Promise<void> {
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.delete(projectId);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    // Ignore
  }
}

export async function resetStarterProjectsInDb(): Promise<HostedProject[]> {
  await saveManyProjects(STARTER_PROJECTS);
  return loadAllProjects();
}
