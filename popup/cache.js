// OpenProject Assistant - IndexedDB Cache Module
// Provides offline support and faster data access

const CacheDB = {
  dbName: 'OpenProjectAssistant',
  version: 1,
  db: null,

  // Open or create IndexedDB database and set up object stores
  async init() {
    if (this.db) return this.db;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => {
        console.error('IndexedDB error:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        console.log('IndexedDB initialized successfully');
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        // Create object stores
        if (!db.objectStoreNames.contains('workPackages')) {
          const wpStore = db.createObjectStore('workPackages', { keyPath: 'id' });
          wpStore.createIndex('updatedAt', 'updatedAt', { unique: false });
          wpStore.createIndex('subject', 'subject', { unique: false });
        }

        if (!db.objectStoreNames.contains('worklogs')) {
          const wlStore = db.createObjectStore('worklogs', { keyPath: 'id' });
          wlStore.createIndex('spentOn', 'spentOn', { unique: false });
          wlStore.createIndex('workPackageId', 'workPackageId', { unique: false });
        }

        if (!db.objectStoreNames.contains('projects')) {
          db.createObjectStore('projects', { keyPath: 'id' });
        }

        if (!db.objectStoreNames.contains('metadata')) {
          db.createObjectStore('metadata', { keyPath: 'key' });
        }

        console.log('IndexedDB schema created');
      };
    });
  },

  // Store data in IndexedDB (clears old data first, uses Promise.all for batch operations)
  async cache(storeName, data, metadata = {}) {
    try {
      await this.init();
      const tx = this.db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);

      // Clear old data first and batch operations
      return new Promise((resolve, reject) => {
        store.clear().onsuccess = () => {
          try {
            // Add new data using Promise.all for better performance
            if (Array.isArray(data)) {
              const promises = data.map(item => {
                return new Promise((res, rej) => {
                  const request = store.put(item);
                  request.onsuccess = res;
                  request.onerror = () => rej(request.error);
                });
              });

              Promise.all(promises)
                .then(() => this.updateMetadata(storeName, data, metadata))
                .then(() => resolve(true))
                .catch(reject);
            } else {
              const request = store.put(data);
              request.onsuccess = () => {
                this.updateMetadata(storeName, data, metadata)
                  .then(() => resolve(true))
                  .catch(reject);
              };
              request.onerror = () => reject(request.error);
            }
          } catch (error) {
            reject(error);
          }
        };
        store.clear().onerror = () => reject(store.clear().error);
      });
    } catch (error) {
      console.error(`Error caching ${storeName}:`, error);
      return false;
    }
  },

  // Store metadata about cached data (timestamp, count, etc.)
  async updateMetadata(storeName, data, metadata = {}) {
    const metaTx = this.db.transaction('metadata', 'readwrite');
    const metaStore = metaTx.objectStore('metadata');

    return new Promise((resolve, reject) => {
      const request = metaStore.put({
        key: `${storeName}_lastUpdate`,
        timestamp: Date.now(),
        count: Array.isArray(data) ? data.length : 1,
        ...metadata
      });
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  },

  // Retrieve all cached data from a store
  async get(storeName) {
    try {
      await this.init();
      const tx = this.db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const request = store.getAll();

      return new Promise((resolve, reject) => {
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error(`Error getting ${storeName}:`, error);
      return [];
    }
  },

  // Retrieve a single item from cache by its ID
  async getById(storeName, id) {
    try {
      await this.init();
      const tx = this.db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const request = store.get(id);

      return new Promise((resolve, reject) => {
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error(`Error getting item ${id} from ${storeName}:`, error);
      return null;
    }
  },

  // Search cached data using an index (e.g., find by updatedAt or subject)
  async search(storeName, indexName, query) {
    try {
      await this.init();
      const tx = this.db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const index = store.index(indexName);
      const request = index.getAll(query);

      return new Promise((resolve, reject) => {
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error(`Error searching ${storeName}:`, error);
      return [];
    }
  },

  // Retrieve metadata entry (timestamp, count, etc.)
  async getMetadata(key) {
    try {
      await this.init();
      const tx = this.db.transaction('metadata', 'readonly');
      const store = tx.objectStore('metadata');
      const request = store.get(key);

      return new Promise((resolve, reject) => {
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error(`Error getting metadata ${key}:`, error);
      return null;
    }
  },

  // Check if cached data is still fresh (not older than maxAge in milliseconds)
  async isCacheFresh(storeName, maxAge = 5 * 60 * 1000) {
    const metadata = await this.getMetadata(`${storeName}_lastUpdate`);
    if (!metadata) return false;

    const age = Date.now() - metadata.timestamp;
    return age < maxAge;
  },

  // Delete all cached data from all stores
  async clearAll() {
    try {
      await this.init();
      const storeNames = ['workPackages', 'worklogs', 'projects', 'metadata'];

      for (const storeName of storeNames) {
        const tx = this.db.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        await store.clear();
      }

      console.log('All cache cleared');
      return true;
    } catch (error) {
      console.error('Error clearing cache:', error);
      return false;
    }
  },

  // Get cache statistics (count, last update time, age) for all stores
  async getStats() {
    try {
      await this.init();
      const stats = {};
      const storeNames = ['workPackages', 'worklogs', 'projects'];

      for (const storeName of storeNames) {
        const data = await this.get(storeName);
        const metadata = await this.getMetadata(`${storeName}_lastUpdate`);

        stats[storeName] = {
          count: data.length,
          lastUpdate: metadata ? new Date(metadata.timestamp) : null,
          age: metadata ? Date.now() - metadata.timestamp : null
        };
      }

      return stats;
    } catch (error) {
      console.error('Error getting cache stats:', error);
      return {};
    }
  }
};

// Export for use in popup.js
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CacheDB;
}
