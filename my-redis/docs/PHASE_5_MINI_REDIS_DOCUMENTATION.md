# Phase 5 — Mini Redis: Expiry Engine

## Project

**Build Your Own Redis — Mini Redis**

Phase 5 adds real key expiration to the typed in-memory database.

The hackathon makes expiry mandatory through:

```text
EXPIRE
TTL
PERSIST
```

and requires keys to actually expire. 

---

# 1. Phase 5 Objective

Before Phase 5, our storage model was:

```text
KEY
 ↓
┌──────────────────┐
│ type             │
│ value            │
└──────────────────┘
```

After Phase 5:

```text
KEY
 ↓
┌──────────────────────┐
│ type                 │
│ value                │
│ expiresAt             │
└──────────────────────┘
```

The major architectural transition is:

> **KEY → TYPE + VALUE became KEY → TYPE + VALUE + EXPIRATION.**

---

# 2. The Problem We Are Solving

Previously:

```text
SET name Mohit
```

stored the value indefinitely.

Now:

```text
SET name Mohit
EXPIRE name 10
```

means the key should remain available for approximately 10 seconds.

After expiration:

```text
GET name
```

returns:

```text
(nil)
```

Expiration therefore represents real database behavior, not just metadata.

---

# 3. Expiration Mental Model

Instead of creating a separate timer for every key, we store an absolute expiration timestamp.

Example:

```text
Current time:
10:00:00

EXPIRE name 10
        ↓
expiresAt = 10:00:10
```

When the database accesses the key:

```text
GET name
   ↓
Does key exist?
   │
   ├── NO → missing
   │
   ▼
Has expiresAt passed?
   │
   ├── NO  → return value
   │
   └── YES → delete key → missing
```

---

# 4. Why `expiresAt`?

The expiration system stores:

```text
expiresAt
```

rather than creating a separate timer for every key.

The architecture becomes:

```text
KEY
 ↓
TYPE + VALUE + expiresAt
 ↓
Storage Engine
 ↓
Expiration Check
```

This keeps expiration logic centralized in the storage layer.

---

# 5. Storage API After Phase 5

The database now exposes:

```text
set()
get()
del()
exists()
keys()
flushAll()

expire()
ttl()
persist()
```

Conceptually:

```text
                    DATABASE
                       │
       ┌───────────────┼────────────────┐
       ▼               ▼                ▼
     DATA           EXPIRY            GLOBAL
  OPERATIONS      OPERATIONS        OPERATIONS
       │               │                │
   set/get          expire/ttl         keys
   del/exists       persist            flushAll
```

---

# 6. Expiry-Aware `get()`

The most important storage-layer change is that `get()` now checks expiration.

Flow:

```text
database.get(key)
        ↓
Does entry exist?
        │
        ├── NO → undefined
        │
        ▼
Is entry expired?
        │
        ├── YES → delete → undefined
        │
        └── NO → return entry
```

Commands using `database.get()` therefore automatically respect expiration.

---

# 7. `EXPIRE`

Command:

```text
EXPIRE key seconds
```

Example:

```text
SET name Mohit
EXPIRE name 10
```

The database changes from:

```text
name
 ↓
type: string
value: Mohit
expiresAt: null
```

to:

```text
name
 ↓
type: string
value: Mohit
expiresAt: currentTime + 10 seconds
```

Request flow:

```text
EXPIRE name 10
       ↓
Parser
       ↓
Dispatcher
       ↓
EXPIRE Handler
       ↓
database.expire()
       ↓
expiresAt = Date.now() + 10000
```

For an existing key:

```text
(integer) 1
```

For a missing key:

```text
(integer) 0
```

---

# 8. `TTL`

`TTL` asks how many seconds remain before a key expires.

```text
TTL name
```

Important return states:

```text
-2 → key does not exist
-1 → key exists but has no expiration
≥0 → remaining seconds
```

Example:

```text
SET name Mohit
TTL name
```

returns:

```text
(integer) -1
```

After:

```text
EXPIRE name 10
```

`TTL name` returns a positive value that decreases as time passes.

---

# 9. `PERSIST`

`PERSIST` removes the expiration from a key.

Example:

```text
SET name Mohit
EXPIRE name 30
```

Conceptually:

```text
name
 ↓
value: Mohit
expiresAt: +30 sec
```

Then:

```text
PERSIST name
```

changes it to:

```text
name
 ↓
value: Mohit
expiresAt: null
```

The key continues to exist without an expiration.

Return behavior:

```text
(integer) 1
```

when an expiration was removed.

```text
(integer) 0
```

when the key does not exist or had no expiration.

---

# 10. Real Expiration Test

Run:

```text
SET name Mohit
EXPIRE name 5
```

Immediately:

```text
GET name
```

Expected:

```text
Mohit
```

Wait more than five seconds.

Then:

```text
GET name
```

Expected:

```text
(nil)
```

This confirms that the key actually expired.

---

# 11. TTL Testing

Without expiration:

```text
SET name Mohit
TTL name
```

Expected:

```text
(integer) -1
```

For a missing key:

```text
TTL unknown
```

Expected:

```text
(integer) -2
```

With expiration:

```text
SET name Mohit
EXPIRE name 10
TTL name
```

Expected:

```text
(integer) 9
```

or approximately:

```text
(integer) 10
```

depending on execution timing.

---

# 12. PERSIST Testing

Run:

```text
SET name Mohit
EXPIRE name 30
TTL name
```

The TTL should be positive.

Then:

```text
PERSIST name
```

Expected:

```text
(integer) 1
```

Now:

```text
TTL name
```

Expected:

```text
(integer) -1
```

The value remains:

```text
GET name
```

returns:

```text
Mohit
```

---

# 13. Expiration Works Across Data Types

Expiration belongs to the **storage entry**, not to an individual data type.

Therefore all three data types support expiration:

```text
String + expiration
List   + expiration
Hash   + expiration
```

Examples:

```text
SET name Mohit
EXPIRE name 10
```

```text
LPUSH fruits apple
EXPIRE fruits 10
```

```text
HSET user name Mohit
EXPIRE user 10
```

The architecture is:

```text
KEY
 ↓
┌──────────────────────┐
│ type                 │
│ value                │
│ expiresAt             │
└──────────────────────┘
```

---

# 14. Expiration + EXISTS

Suppose:

```text
SET name Mohit
EXPIRE name 2
```

Before expiration:

```text
EXISTS name
```

returns:

```text
(integer) 1
```

After expiration:

```text
EXISTS name
```

returns:

```text
(integer) 0
```

Flow:

```text
EXISTS
 ↓
database.exists()
 ↓
database.get()
 ↓
expiration check
 ↓
expired?
 ├── YES → remove key → false
 └── NO  → true
```

---

# 15. Expiration + KEYS

Suppose:

```text
SET name Mohit
SET city Delhi
EXPIRE name 2
```

Immediately:

```text
KEYS
```

can contain:

```text
name
city
```

After expiration:

```text
KEYS
```

should contain only:

```text
city
```

The storage layer removes expired entries before returning the key list.

---

# 16. Expiration + DEL

Expiration does not interfere with manual deletion.

```text
SET name Mohit
EXPIRE name 10
DEL name
```

`DEL` removes the key immediately.

```text
EXPIRE
   ↓
automatic deletion later

DEL
   ↓
manual deletion now
```

---

# 17. `SET` and Existing Expiration

Suppose:

```text
SET name Mohit
EXPIRE name 10
```

The key now has an expiration.

Then:

```text
SET name Rahul
```

creates the new value without the previous expiration:

```text
name
 ↓
type: string
value: Rahul
expiresAt: null
```

This prevents an old TTL from accidentally applying to a newly assigned value.

---

# 18. Lazy Expiration

The current implementation uses **lazy expiration**.

We do not continuously scan every key.

Expiration is checked when the storage layer accesses the data.

```text
GET
 ↓
check expiration
 ↓
┌───────────────┐
│               │
valid         expired
│               │
▼               ▼
return         delete
value          key
```

For operations such as `KEYS`, expired entries are explicitly removed before the key list is returned.

---

# 19. Complete Expiry Architecture

```text
                         DATABASE
                            │
                            ▼
                           KEY
                            │
             ┌──────────────┼──────────────┐
             ▼              ▼              ▼
          STRING           LIST           HASH
             │              │              │
             └──────────────┼──────────────┘
                            ▼
                       expiresAt
                            │
                            ▼
                    EXPIRATION CHECK
                            │
                     ┌──────┴──────┐
                     ▼             ▼
                  VALID         EXPIRED
                     │             │
                     ▼             ▼
                  RETURN         DELETE
```

---

# 20. Full Request Architecture

After Phase 5:

```text
                         USER
                           │
                           ▼
                     CLI CLIENT
                           │
                           │ TCP
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
             ┌─────────────┴─────────────┐
             ▼                           ▼
        DATA TYPES                    EXPIRY
             │                           │
      ┌──────┼──────┐                    │
      ▼      ▼      ▼                    ▼
   STRING   LIST   HASH             expiresAt
```

---

# 21. Storage Model Evolution

### Phase 3

```text
KEY → VALUE
```

### Phase 4

```text
KEY → TYPE + VALUE
```

### Phase 5

```text
KEY → TYPE + VALUE + EXPIRATION
```

Each phase adds one responsibility while preserving the existing architecture.

---

# 22. Phase 5 Testing Checklist

```text
☐ EXPIRE existing key
☐ EXPIRE missing key
☐ TTL key without expiration → -1
☐ TTL missing key → -2
☐ TTL returns decreasing seconds
☐ Key actually expires
☐ PERSIST removes expiration
☐ PERSIST on non-expiring key → 0
☐ Expiry works for String
☐ Expiry works for List
☐ Expiry works for Hash
☐ EXISTS respects expiration
☐ KEYS removes expired keys
☐ DEL removes expiring keys normally
☐ SET replacement removes old TTL
☐ Multiple clients still work
```

---

# 23. Phase 5 Achievement

## ✅ Expiry Engine Complete

Mini Redis has evolved from:

```text
KEY → TYPE + VALUE
```

to:

```text
KEY → TYPE + VALUE + EXPIRATION
```

We now support:

```text
EXPIRE
TTL
PERSIST
```

with real key expiration.

The most important architectural achievement is:

```text
                 STORAGE ENGINE
                       │
            ┌──────────┴──────────┐
            ▼                     ▼
        DATA TYPES              EXPIRY
            │                     │
     String/List/Hash          expiresAt
```

Expiration is centralized in the storage layer, so the same mechanism works across all supported data types.

---

# 24. Next Phase

## Phase 6 — Persistence Engine

Currently:

```text
SET name Mohit
      ↓
     RAM
      ↓
Node process stops
      ↓
DATA LOST
```

The hackathon requires:

> **Snapshot data to disk and reload it on restart.**

Phase 6 will build:

```text
                 STORAGE ENGINE
                       │
                       ▼
                     MEMORY
                       │
                    SNAPSHOT
                       │
                       ▼
                      DISK
                       │
                    restart
                       │
                       ▼
                     LOAD
                       │
                       ▼
                    MEMORY
```

We will need to persist:

```text
KEY
TYPE
VALUE
expiresAt
```

so expiration state is also preserved across restarts.

---

## Phase 5 Final Mental Model

```text
                 MINI REDIS
                     │
                     ▼
                  DATABASE
                     │
            ┌────────┴────────┐
            ▼                 ▼
        TYPE + VALUE       expiresAt
            │                 │
      ┌─────┼─────┐           │
      ▼     ▼     ▼           ▼
   STRING LIST  HASH      EXPIRATION
                            CHECK
                               │
                         ┌─────┴─────┐
                         ▼           ▼
                       VALID       EXPIRED
                         │           │
                         ▼           ▼
                       DATA        DELETE
```

**Phase 5 = Redis-style typed data + real time-based expiration.**
