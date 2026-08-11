# Phase 6 — Persistence Engine

## Mini Redis — Hackathon Project

Phase 6 introduces **persistence** to Mini Redis.

Before Phase 6, all database data lived only in memory:

```text
Client
  ↓
Mini Redis
  ↓
RAM
  ↓
Server restart
  ↓
Data lost
```

The goal of Phase 6 is:

```text
RAM
 ↓
Snapshot
 ↓
Disk
 ↓
Server Restart
 ↓
Load Snapshot
 ↓
RAM
```

The hackathon requires Mini Redis to support snapshotting data to disk and reloading it when the server restarts.

---

# 1. Phase 6 Objective

The storage model from Phase 5 was:

```text
KEY
 ↓
┌──────────────────────┐
│ type                 │
│ value                │
│ expiresAt            │
└──────────────────────┘
```

Phase 6 makes this state persistent.

We now need to save:

```text
KEY
TYPE
VALUE
expiresAt
```

to disk.

This is important because `expiresAt` was introduced in Phase 5. Persistence must preserve it so expiration continues to work after a restart.

---

# 2. Persistence Mental Model

The complete lifecycle is:

```text
                    CLIENT
                       │
                       ▼
                  COMMAND
                       │
                       ▼
                  DATABASE
                       │
                       ▼
                     RAM
                       │
                  SNAPSHOT
                       │
                       ▼
                    DISK
                       │
                  SERVER STOP
                       │
                  SERVER START
                       │
                       ▼
                 LOAD SNAPSHOT
                       │
                       ▼
                 EXPIRATION CHECK
                       │
                       ▼
                     RAM
```

The important connection is:

> **Persistence turns our in-memory database into a database whose state survives process restarts.**

---

# 3. Why JSON?

For the current Mini Redis implementation, the snapshot is stored as JSON.

Reasons:

- Node.js has built-in JSON support.
- The format is easy to inspect.
- Our current String, List, and Hash values can be represented naturally.
- No external persistence database is required.

Our snapshot file is:

```text
data/
└── dump.json
```

---

# 4. Snapshot Structure

A snapshot can look like:

```json
{
  "name": {
    "type": "string",
    "value": "Mohit",
    "expiresAt": null
  },
  "fruits": {
    "type": "list",
    "value": ["apple", "banana"],
    "expiresAt": null
  },
  "user": {
    "type": "hash",
    "value": {
      "name": "Mohit",
      "age": "22"
    },
    "expiresAt": null
  }
}
```

For an expiring key:

```json
{
  "temporary": {
    "type": "string",
    "value": "hello",
    "expiresAt": 1790000000000
  }
}
```

---

# 5. New Persistence Module

We created:

```text
src/storage/persistence.js
```

Its responsibilities are:

```text
saveSnapshot()
loadSnapshot()
```

Architecture:

```text
Storage Engine
      │
      ├── exportData()
      │       ↓
      │   Snapshot
      │       ↓
      │   dump.json
      │
      └── importData()
              ↑
          dump.json
```

---

# 6. `saveSnapshot()`

The save process is:

```text
database.exportData()
        ↓
JavaScript object
        ↓
JSON.stringify()
        ↓
writeFile()
        ↓
data/dump.json
```

Conceptually:

```text
RAM
 ↓
Database Map
 ↓
Serializable Object
 ↓
JSON
 ↓
Disk
```

The snapshot is written after successful mutating commands.

---

# 7. `loadSnapshot()`

The loading process is the reverse:

```text
data/dump.json
        ↓
readFile()
        ↓
JSON.parse()
        ↓
JavaScript object
        ↓
database.importData()
        ↓
RAM
```

At server startup:

```text
loadSnapshot()
      ↓
restore database
      ↓
start TCP server
```

This ensures clients don't access an empty database while the snapshot is still loading.

---

# 8. `exportData()`

Our actual storage uses a JavaScript `Map`.

Conceptually:

```text
Map
 ↓
Object.fromEntries()
 ↓
Object
 ↓
JSON
```

Example:

```text
Map:

"name" → {
  type: "string",
  value: "Mohit",
  expiresAt: null
}
```

becomes:

```json
{
  "name": {
    "type": "string",
    "value": "Mohit",
    "expiresAt": null
  }
}
```

---

# 9. `importData()`

When loading the snapshot:

```text
JSON
 ↓
Object
 ↓
Map
```

But we don't blindly restore every entry.

We first check:

```text
Is the entry expired?
```

The flow is:

```text
Snapshot
   ↓
Entry
   ↓
Expiration check
   │
   ├── expired → DON'T RESTORE
   │
   └── valid → RESTORE
```

This prevents expired keys from coming back after a restart.

---

# 10. Phase 5 + Phase 6 Connection

This is one of the most important architectural connections.

### Phase 5 introduced:

```text
expiresAt
```

### Phase 6 persists:

```text
expiresAt → disk
```

### After restart:

```text
disk
 ↓
expiresAt
 ↓
expiration check
 ↓
restore only if valid
```

Therefore:

> **Persistence does NOT bypass expiration.**

---

# 11. Which Commands Need Persistence?

Commands that modify database state need a new snapshot.

### Strings

```text
SET
DEL
```

### Lists

```text
LPUSH
RPUSH
LPOP
RPOP
```

### Hashes

```text
HSET
HDEL
```

### Global operations

```text
FLUSHALL
```

### Expiration state

```text
EXPIRE
PERSIST
```

Read operations such as:

```text
GET
TTL
EXISTS
KEYS
```

do not intentionally modify the database and therefore do not need a snapshot after every call.

---

# 12. Centralized Persistence

We avoided putting:

```text
saveSnapshot()
```

inside every individual handler.

Instead:

```text
Command
   ↓
Dispatcher
   ↓
Handler
   ↓
Database mutation
   ↓
Successful?
   │
   ├── NO → return error
   │
   └── YES
        ↓
   saveSnapshot()
```

This keeps persistence centralized.

---

# 13. Successful Mutation Rule

A failed command should not create a new snapshot.

For example:

```text
LPUSH name hello
```

when:

```text
name → String
```

should produce:

```text
WRONGTYPE
```

The database hasn't changed.

Therefore:

```text
WRONGTYPE
   ↓
NO snapshot
```

Whereas:

```text
LPUSH fruits apple
```

successfully changes the database:

```text
LPUSH
 ↓
Database changed
 ↓
saveSnapshot()
```

---

# 14. Server Startup Architecture

The final startup flow is:

```text
                 SERVER START
                      │
                      ▼
                loadSnapshot()
                      │
                      ▼
                Restore RAM
                      │
                      ▼
                 server.listen()
                      │
                      ▼
               Accept clients
```

We specifically want:

```text
LOAD FIRST
   ↓
SERVER SECOND
```

not:

```text
CLIENT CONNECT
   ↓
LOAD DATABASE
```

The snapshot should be loaded once when the server starts.

---

# 15. Persistence Test — String

Run:

```text
SET name Mohit
```

Expected:

```text
OK
```

Then:

```text
GET name
```

Expected:

```text
Mohit
```

Check:

```text
data/dump.json
```

The key should exist in the snapshot.

---

# 16. Restart Test

Stop the server:

```text
Ctrl + C
```

Start it again:

```bash
npm run server
```

The server should load the snapshot.

Then:

```text
GET name
```

Expected:

```text
Mohit
```

This proves:

```text
RAM
 ↓
Disk
 ↓
Restart
 ↓
RAM
```

---

# 17. List Persistence Test

Run:

```text
LPUSH fruits apple
RPUSH fruits banana
LRANGE fruits 0 1
```

Expected:

```text
apple
banana
```

Restart the server.

Run:

```text
LRANGE fruits 0 1
```

Expected:

```text
apple
banana
```

This proves List data survives restart.

---

# 18. Hash Persistence Test

Run:

```text
HSET user name Mohit
HSET user age 22
```

Then:

```text
HGET user name
HGET user age
```

Expected:

```text
Mohit
22
```

Restart the server.

Run:

```text
HGET user name
HGET user age
```

The values should still exist.

This proves Hash data survives restart.

---

# 19. Updated Data Persistence

Run:

```text
SET name Mohit
```

Then:

```text
SET name Rahul
```

Check:

```text
GET name
```

Expected:

```text
Rahul
```

Restart.

Then:

```text
GET name
```

Expected:

```text
Rahul
```

This proves the new state replaces the old persisted state.

---

# 20. Expiration + Persistence Test

Run:

```text
SET temporary hello
EXPIRE temporary 20
```

Then:

```text
TTL temporary
```

Expected:

```text
positive number
```

The snapshot must contain:

```text
expiresAt: <timestamp>
```

Restart before expiration.

Then:

```text
GET temporary
```

Expected:

```text
hello
```

The TTL should still be positive, although lower because time has passed.

This proves:

```text
VALUE + expiresAt
       ↓
      DISK
       ↓
    RESTART
       ↓
     LOAD
       ↓
 EXPIRATION CONTINUES
```

---

# 21. Expired Key Must Not Resurrect

Run:

```text
SET temporary2 hello
EXPIRE temporary2 5
```

Wait more than five seconds.

Then:

```text
GET temporary2
```

Expected:

```text
(nil)
```

Restart the server.

Then:

```text
GET temporary2
```

Expected:

```text
(nil)
```

The loader must reject the expired snapshot entry.

---

# 22. DEL Persistence Test

Run:

```text
SET deleteMe test
DEL deleteMe
```

Then restart.

```text
GET deleteMe
```

Expected:

```text
(nil)
```

This proves deletion is reflected in the snapshot.

---

# 23. PERSIST Persistence Test

Run:

```text
SET permanent hello
EXPIRE permanent 30
```

Then:

```text
PERSIST permanent
```

Expected:

```text
(integer) 1
```

Now:

```text
TTL permanent
```

Expected:

```text
(integer) -1
```

Restart.

Again:

```text
TTL permanent
```

Expected:

```text
(integer) -1
```

The value should remain:

```text
GET permanent
```

→

```text
hello
```

---

# 24. FLUSHALL Persistence Test

Create data:

```text
SET a 1
SET b 2
LPUSH list hello
HSET user name Mohit
```

Then:

```text
FLUSHALL
```

Expected:

```text
OK
```

Then:

```text
KEYS
```

should return an empty database.

Restart.

Run:

```text
KEYS
```

It should still be empty.

This proves that the empty state itself is persisted.

---

# 25. Phase 6 Test Checklist

```text
PERSISTENCE
────────────────────────────
☐ Snapshot file created
☐ String survives restart
☐ List survives restart
☐ Hash survives restart
☐ Updated values survive restart
☐ Snapshot loads on startup

EXPIRATION + PERSISTENCE
────────────────────────────
☐ expiresAt is persisted
☐ Non-expired key survives restart
☐ TTL continues after restart
☐ Expired key does not resurrect

MUTATIONS
────────────────────────────
☐ DEL persists
☐ PERSIST persists
☐ FLUSHALL persists
☐ List mutations persist
☐ Hash mutations persist
```

---

# 26. Phase 6 Architecture

```text
                         CLIENT
                           │
                           ▼
                      TCP SERVER
                           │
                           ▼
                        PARSER
                           │
                           ▼
                      DISPATCHER
                           │
                           ▼
                   COMMAND HANDLER
                           │
                           ▼
                    STORAGE ENGINE
                           │
          ┌────────────────┼────────────────┐
          ▼                ▼                ▼
       STRING             LIST             HASH
          │                │                │
          └────────────────┼────────────────┘
                           │
                           ▼
                       expiresAt
                           │
                           ▼
                          RAM
                           │
                       SNAPSHOT
                           │
                           ▼
                       dump.json
                           │
                           ▼
                          DISK
                           │
                        RESTART
                           │
                           ▼
                    LOAD SNAPSHOT
                           │
                           ▼
                    EXPIRATION CHECK
                           │
                           ▼
                          RAM
```

---

# 27. Phase 6 Mental Model

```text
                MINI REDIS
                     │
                     ▼
                   RAM
                     │
                WRITE COMMAND
                     │
                     ▼
               DATABASE CHANGES
                     │
                     ▼
                SAVE SNAPSHOT
                     │
                     ▼
                   DISK
                     │
                  RESTART
                     │
                     ▼
                LOAD SNAPSHOT
                     │
                     ▼
              CHECK expiresAt
                     │
              ┌──────┴──────┐
              ▼             ▼
           VALID          EXPIRED
              │             │
              ▼             ▼
           RESTORE        DISCARD
              │
              ▼
              RAM
```

---

# 28. Phase 6 Achievement

## ✅ Persistence Engine Complete

Mini Redis can now:

- Snapshot its in-memory state to disk.
- Reload the state when the server starts.
- Preserve String, List, and Hash data.
- Preserve expiration timestamps.
- Continue expiration correctly after restart.
- Avoid restoring already-expired keys.
- Persist mutations such as deletion and expiration changes.

The architectural evolution is:

```text
Phase 3
KEY → VALUE

Phase 4
KEY → TYPE + VALUE

Phase 5
KEY → TYPE + VALUE + expiresAt

Phase 6
KEY → TYPE + VALUE + expiresAt
                  │
                  ▼
               SNAPSHOT
                  │
                  ▼
                 DISK
```

---

# 29. What We Learned

The biggest lesson from Phase 6 is that **persistence is not simply writing data to a file**.

We had to connect several layers:

```text
Command
  ↓
Dispatcher
  ↓
Database mutation
  ↓
Snapshot
  ↓
Disk
  ↓
Restart
  ↓
Snapshot loading
  ↓
Expiration validation
  ↓
Restored database
```

This phase also introduced an important Node.js concept:

```text
async function
      ↓
Promise
      ↓
await
```

because snapshot operations use asynchronous filesystem APIs.

---

# 30. Next Phase

With the persistence engine complete, Mini Redis has now covered:

```text
TCP Server             ✅
Multiple Clients       ✅
Core Commands          ✅
String                 ✅
List                   ✅
Hash                   ✅
Expiration             ✅
Persistence            ✅
CLI Client             ✅
```

The next phase can focus on the remaining requirements, robustness, compatibility, testing, and bonus functionality.

---

## Final Phase 6 Summary

> **Phase 6 transformed Mini Redis from an in-memory process into a restart-resilient database.**

The core mental model is:

```text
RAM
 ↓
SNAPSHOT
 ↓
DISK
 ↓
RESTART
 ↓
LOAD
 ↓
VALIDATE EXPIRATION
 ↓
RAM
```

**Phase 6 = Persistence + Restart Recovery + Expiration Preservation.**
