// Kleiner IndexedDB-Wrapper — ein Objektspeicher "days", Key = "<kidId>::<ISO-Datum>"
// Record-Form: { key, kidId, date, checked: {taskId: true}, bonus: {taskId: n}, photos: {taskId: dataURL}, submitted }
// Die Kind-Kennung im Schlüssel trennt Elias' und Lindas Testdaten in derselben Browser-Datenbank.

const DB_NAME = "sternen-challenge";
const DB_VERSION = 2;
const STORE = "days";

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (db.objectStoreNames.contains(STORE)) {
        db.deleteObjectStore(STORE); // Schema-Wechsel (Kind-Trennung) - alte Testdaten sind Wegwerfdaten
      }
      db.createObjectStore(STORE, { keyPath: "key" });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function dayKey(kidId, date) {
  return `${kidId}::${date}`;
}

async function getDay(kidId, date) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).get(dayKey(kidId, date));
    req.onsuccess = () => {
      resolve(
        req.result || {
          key: dayKey(kidId, date),
          kidId,
          date,
          checked: {},
          bonus: {},
          photos: {},
          submitted: false,
        }
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

async function getAllDaysForKid(kidId) {
  const all = await getAllDays();
  return all.filter((r) => r.kidId === kidId);
}

async function deleteAllDaysForKid(kidId) {
  const db = await openDb();
  const toDelete = await getAllDaysForKid(kidId);
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    const store = tx.objectStore(STORE);
    for (const rec of toDelete) store.delete(rec.key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
