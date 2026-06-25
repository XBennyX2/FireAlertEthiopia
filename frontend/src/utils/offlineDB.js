const DB_NAME    = 'firealert-offline-db';
const DB_VERSION = 1;
const STORE_NAME  = 'pendingReports';

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'localId' });
        store.createIndex('createdAt', 'createdAt', { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror   = () => reject(request.error);
  });
}

// ── Save a report locally when offline ─────────────────────────────
export async function saveOfflineReport(reportData, mediaFile) {
  const db = await openDB();

  // Convert the file to a base64 string so it can be stored in IndexedDB
  let mediaBase64 = null;
  let mediaType    = null;
  let mediaName    = null;

  if (mediaFile) {
    mediaBase64 = await fileToBase64(mediaFile);
    mediaType   = mediaFile.type;
    mediaName   = mediaFile.name;
  }

  const localId = `offline-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  const record = {
    localId,
    ...reportData,
    mediaBase64,
    mediaType,
    mediaName,
    createdAt: new Date().toISOString(),
    syncStatus: 'pending', // pending | syncing | failed
    syncError: null,
  };

  return new Promise((resolve, reject) => {
    const tx    = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req   = store.add(record);
    req.onsuccess = () => resolve(record);
    req.onerror   = () => reject(req.error);
  });
}

// ── Get all pending offline reports ─────────────────────────────────
export async function getOfflineReports() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx    = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const req   = store.getAll();
    req.onsuccess = () => resolve(req.result.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
    req.onerror   = () => reject(req.error);
  });
}

// ── Delete a single offline report ──────────────────────────────────
export async function deleteOfflineReport(localId) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx    = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req   = store.delete(localId);
    req.onsuccess = () => resolve(true);
    req.onerror   = () => reject(req.error);
  });
}

// ── Update sync status of a report ───────────────────────────────────
export async function updateOfflineReportStatus(localId, syncStatus, syncError = null) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx    = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const getReq = store.get(localId);

    getReq.onsuccess = () => {
      const record = getReq.result;
      if (!record) return resolve(null);
      record.syncStatus = syncStatus;
      record.syncError  = syncError;
      const putReq = store.put(record);
      putReq.onsuccess = () => resolve(record);
      putReq.onerror   = () => reject(putReq.error);
    };
    getReq.onerror = () => reject(getReq.error);
  });
}

// ── Count pending reports ────────────────────────────────────────────
export async function getPendingCount() {
  const reports = await getOfflineReports();
  return reports.filter(r => r.syncStatus === 'pending' || r.syncStatus === 'failed').length;
}

// ── Helpers ───────────────────────────────────────────────────────────
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function base64ToFile(base64, filename, mimeType) {
  const arr  = base64.split(',');
  const bstr = atob(arr[1]);
  let n      = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new File([u8arr], filename, { type: mimeType });
}