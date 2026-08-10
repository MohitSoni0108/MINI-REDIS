class Database {
  constructor() {
    this.store = new Map();
  }

  set(key, entry) {
    this.store.set(key, entry);
  }

  get(key) {
    return this.store.get(key);
  }

  del(key) {
    return this.store.delete(key);
  }

  exists(key) {
    return this.store.has(key);
  }

  keys() {
    return [...this.store.keys()];
  }

  flushAll() {
    this.store.clear();
  }
}

export const database = new Database();