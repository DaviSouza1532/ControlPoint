// js/offlineStore.js
// Armazenamento local IndexedDB para Offline-First e sincronização PWA

class OfflineStore {
    constructor() {
        this.dbName = 'ControlPointDB';
        this.dbVersion = 1;
        this.db = null;
        this.initDB();
    }

    async initDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.dbVersion);

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains('punches')) {
                    db.createObjectStore('punches', { keyPath: 'id' });
                }
            };

            request.onsuccess = (event) => {
                this.db = event.target.result;
                console.log('IndexedDB OfflineStore inicializado com sucesso.');
                resolve(this.db);
            };

            request.onerror = (event) => {
                console.error('Erro ao abrir IndexedDB:', event.target.error);
                reject(event.target.error);
            };
        });
    }

    async saveOfflinePunch(punchRecord) {
        if (!this.db) await this.initDB();

        return new Promise((resolve, reject) => {
            const tx = this.db.transaction('punches', 'readwrite');
            const store = tx.objectStore('punches');
            const request = store.put(punchRecord);

            request.onsuccess = () => resolve(true);
            request.onerror = (err) => reject(err);
        });
    }

    async getUnsyncedPunches() {
        if (!this.db) await this.initDB();

        return new Promise((resolve, reject) => {
            const tx = this.db.transaction('punches', 'readonly');
            const store = tx.objectStore('punches');
            const request = store.getAll();

            request.onsuccess = () => {
                const all = request.result || [];
                const unsynced = all.filter(p => p.sincronizado_offline === false || p.sincronizado_offline === true);
                resolve(unsynced);
            };
            request.onerror = (err) => reject(err);
        });
    }

    async markSynced(punchId) {
        if (!this.db) await this.initDB();

        return new Promise((resolve, reject) => {
            const tx = this.db.transaction('punches', 'readwrite');
            const store = tx.objectStore('punches');
            const deleteRequest = store.delete(punchId);

            deleteRequest.onsuccess = () => resolve(true);
            deleteRequest.onerror = (err) => reject(err);
        });
    }
}

window.offlineStore = new OfflineStore();
