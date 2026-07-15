// Kleiner IndexedDB-Wrapper — ein Objektspeicher "days", Key = ISO-Datum (YYYY-MM-DD)
// Record-Form: { date, checked: {taskId: true}, bonus: {taskId: n}, photos: {taskId: dataURL} }

const DB_NAME = "sternen-challenge";
const DB_VERSION = 1;
const STORE = "days";

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "date" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function getDay(date) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).get(date);
    req.onsuccess = () => {
      resolve(
        req.result || { date, checked: {}, bonus: {}, photos: {}, submitted: false }
      );
    };
    req.onerror = () => reject(req.error);
  });
}

async function putDay(record) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(record);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function getAllDays() {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}
