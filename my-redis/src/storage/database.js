class Database {
  constructor() {
    this.store = new Map();
  }

  set(key, entry) {
    entry.expiresAt = null;

    this.store.set(key, entry);
  }

  get(key) {
    const entry = this.store.get(key);

    if (!entry) {
      return undefined;
    }

    if (this.isExpired(entry)) {
      this.store.delete(key);
      return undefined;
    }

    return entry;
  }

  del(key) {
    this.get(key);

    return this.store.delete(key);
  }

  exists(key) {
    return this.get(key) !== undefined;
  }

  keys() {
    this.removeExpiredKeys();

    return [...this.store.keys()];
  }

  flushAll() {
    this.store.clear();
  }

  expire(key, seconds) {
    const entry = this.get(key);

    if (!entry) {
      return false;
    }

    entry.expiresAt = Date.now() + seconds * 1000;

    return true;
  }

  ttl(key) {
    const entry = this.get(key);

    if (!entry) {
      return -2;
    }

    if (entry.expiresAt === null) {
      return -1;
    }

    const remainingMilliseconds = entry.expiresAt - Date.now();

    if (remainingMilliseconds <= 0) {
      this.store.delete(key);
      return -2;
    }

    return Math.floor(remainingMilliseconds / 1000);
  }

  persist(key) {
    const entry = this.get(key);

    if (!entry) {
      return false;
    }

    if (entry.expiresAt === null) {
      return false;
    }

    entry.expiresAt = null;

    return true;
  }

  isExpired(entry) {
    return (
      entry.expiresAt !== null &&
      entry.expiresAt <= Date.now()
    );
  }

  removeExpiredKeys() {
    for (const [key, entry] of this.store) {
      if (this.isExpired(entry)) {
        this.store.delete(key);
      }
    }
  }
}

export const database = new Database();