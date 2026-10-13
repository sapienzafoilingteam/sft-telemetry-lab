let dbPromise;
function database() {
  if (!dbPromise)
    dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open("sft-telemetry-lab", 1);
      request.onupgradeneeded = () =>
        request.result.createObjectStore("sessions", { keyPath: "id" });
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => {
        dbPromise = null;
        reject(new Error("Archivio non disponibile in questo browser."));
      };
    });
  return dbPromise;
}
async function operation(mode, callback) {
  const db = await database();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("sessions", mode);
    const req = callback(tx.objectStore("sessions"));
    tx.oncomplete = () => resolve(req.result);
    tx.onerror = tx.onabort = () =>
      reject(
        new Error(
          "Salvataggio non riuscito. Esporta la sessione e controlla lo spazio disponibile.",
        ),
      );
  });
}
export const listSessions = () =>
  operation("readonly", (store) => store.getAll());
export const saveSession = (session) =>
  operation("readwrite", (store) => store.put(session));
export const deleteSession = (id) =>
  operation("readwrite", (store) => store.delete(id));
