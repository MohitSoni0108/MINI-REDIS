# Phase 3 — Mini Redis: In-Memory Storage Engine

## Project

**Build Your Own Redis — Mini Redis**

Phase 3 connects the command system built in the previous phases to a real in-memory storage engine.

The goal is to make Mini Redis actually store, retrieve, delete, and inspect key-value data.

---

# 1. Phase 3 Objective

Before Phase 3:

```text
SET name Mohit
    ↓
SET Handler
    ↓
"SET command received"
```

After Phase 3:

```text
SET name Mohit
    ↓
SET Handler
    ↓
Storage Engine
    ↓
name → Mohit
```

And:

```text
GET name
    ↓
GET Handler
    ↓
Storage Engine
    ↓
Mohit
```

The important transition is:

> **Mini Redis moves from understanding commands to actually storing database state.**

---

# 2. What We Built

We created the storage module:

```text
src/storage/database.js
```

The current project structure is:

```text
my-redis/
│
├── package.json
│
├── src/
│   ├── server/
│   │   └── server.js
│   │
│   ├── client/
│   │   └── cli.js
│   │
│   ├── protocol/
│   │   └── parser.js
│   │
│   ├── commands/
│   │   └── dispatcher.js
│   │
│   └── storage/
│       └── database.js
│
└── docs/
    ├── DAY_1_MINI_REDIS_DOCUMENTATION.md
    └── DAY_2_MINI_REDIS_DOCUMENTATION.md
```

The documentation naming will now follow the implementation phases:

```text
docs/
├── PHASE_1_...
├── PHASE_2_...
└── PHASE_3_...
```

---

# 3. Storage Engine Mental Model

The central database model is:

```text
KEY → VALUE
```

For example:

```text
name → Mohit
age  → 22
city → Delhi
```

Conceptually:

```text
┌────────────────────────┐
│      IN-MEMORY DB      │
├──────────┬─────────────┤
│ Key      │ Value       │
├──────────┼─────────────┤
│ name     │ Mohit       │
│ age      │ 22          │
│ city     │ Delhi       │
└──────────┴─────────────┘
```

The database currently exists only in the Node.js process memory.

---

# 4. Why We Use `Map`

The first storage implementation uses JavaScript's built-in `Map`.

The operations map naturally to our database commands:

```text
Map.set()      → SET
Map.get()      → GET
Map.delete()   → DEL
Map.has()      → EXISTS
Map.keys()     → KEYS
Map.clear()    → FLUSHALL
```

Therefore:

```text
Database
   ↓
Map
   ↓
KEY → VALUE
```

This gives us a simple and efficient starting point for the core key-value engine.

---

# 5. Database Abstraction

Instead of allowing every command handler to directly manipulate the `Map`, we created a `Database` class.

Conceptually:

```text
SET Handler ──┐
GET Handler ──┤
DEL Handler ──┼──► Database
EXISTS ───────┤
KEYS ─────────┤
FLUSHALL ─────┘
```

The command layer therefore does not need to know the internal storage implementation.

Currently:

```text
Database → Map
```

Later the storage representation will become more sophisticated when we add:

- Redis data types
- expiration metadata
- persistence

The command layer can continue communicating through the storage abstraction.

---

# 6. Storage API

The database currently exposes:

```text
set(key, value)
get(key)
del(key)
exists(key)
keys()
flushAll()
```

### SET

```text
SET name Mohit
```

stores:

```text
name → Mohit
```

### GET

```text
GET name
```

retrieves:

```text
Mohit
```

### DEL

```text
DEL name
```

removes the key.

### EXISTS

```text
EXISTS name
```

checks whether the key exists.

### KEYS

```text
KEYS
```

returns the stored keys.

### FLUSHALL

```text
FLUSHALL
```

clears the complete in-memory database.

---

# 7. Updated Architecture

The system now looks like:

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
                  CONNECTION HANDLER
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
                   ┌───────────────┐
                   │    DATABASE   │
                   │               │
                   │  Map<Key,Val> │
                   └───────────────┘
```

The important relationship is:

```text
NETWORK
   ↓
COMMAND
   ↓
HANDLER
   ↓
STORAGE
```

---

# 8. SET Request Flow

For:

```text
SET name Mohit
```

the complete flow is:

```text
USER
 ↓
CLI
 ↓
TCP
 ↓
SERVER
 ↓
PARSER
 ↓
DISPATCHER
 ↓
SET HANDLER
 ↓
database.set("name", "Mohit")
 ↓
Map
 ↓
name → Mohit
```

The server then returns:

```text
OK
```

to the client.

---

# 9. GET Request Flow

For:

```text
GET name
```

the flow becomes:

```text
USER
 ↓
CLI
 ↓
TCP
 ↓
SERVER
 ↓
PARSER
 ↓
DISPATCHER
 ↓
GET HANDLER
 ↓
database.get("name")
 ↓
Map
 ↓
Mohit
 ↓
CLIENT
```

This is our first actual database read.

---

# 10. DEL Request Flow

For:

```text
DEL name
```

the handler calls:

```text
database.del("name")
```

The key is removed from the in-memory database.

Example:

```text
DEL name
(integer) 1
```

The returned number represents the number of keys deleted.

---

# 11. EXISTS Request Flow

For:

```text
EXISTS name
```

the storage engine checks:

```text
database.exists("name")
```

The result is converted into the command response:

```text
true  → (integer) 1
false → (integer) 0
```

---

# 12. KEYS Request Flow

For:

```text
KEYS
```

the storage engine retrieves the current keys.

Example database:

```text
name → Mohit
city → Delhi
age  → 22
```

`KEYS` returns:

```text
name
city
age
```

---

# 13. FLUSHALL Request Flow

For:

```text
FLUSHALL
```

the database calls its clear operation.

Before:

```text
name → Mohit
city → Delhi
age  → 22
```

After:

```text
(empty)
```

The response is:

```text
OK
```

---

# 14. Testing

## Test 1 — SET

```text
SET name Mohit
```

Expected:

```text
OK
```

## Test 2 — GET

```text
GET name
```

Expected:

```text
Mohit
```

## Test 3 — Missing Key

```text
GET unknown
```

Expected:

```text
(nil)
```

## Test 4 — EXISTS

```text
EXISTS name
```

Expected:

```text
(integer) 1
```

For a missing key:

```text
EXISTS unknown
```

Expected:

```text
(integer) 0
```

## Test 5 — DEL

```text
SET name Mohit
DEL name
GET name
```

Expected:

```text
OK
(integer) 1
(nil)
```

## Test 6 — Multiple-Key DEL

```text
SET name Mohit
SET city Delhi
SET age 22
DEL name city
```

Expected:

```text
(integer) 2
```

## Test 7 — KEYS

```text
SET name Mohit
SET city Delhi
SET language JavaScript
KEYS
```

Expected to contain:

```text
name
city
language
```

## Test 8 — FLUSHALL

```text
FLUSHALL
KEYS
```

Expected:

```text
OK
(empty list)
```

## Test 9 — Multiple Clients

The multiple-client functionality from Phase 1 must continue working.

Multiple clients should be able to connect to the same server and access the same in-memory database.

---

# 15. Important Restart Observation

The current database is completely in memory.

For example:

```text
SET name Mohit
```

stores:

```text
name → Mohit
```

inside the Node.js process.

If the server is stopped:

```text
Node.js process stops
        ↓
Memory disappears
        ↓
Map disappears
```

After restarting:

```text
GET name
```

returns:

```text
(nil)
```

This is expected for the current phase.

There is no persistence yet.

The hackathon requires snapshotting data to disk and reloading it after restart, which will be implemented in a later phase.

---

# 16. Current Limitation

Our current parser separates arguments using whitespace.

Therefore:

```text
SET message hello world
```

is interpreted as multiple arguments:

```text
["message", "hello", "world"]
```

rather than treating `hello world` as one value.

We are intentionally not solving this in the storage phase.

The command/protocol layer can be improved later when we make the command format more robust.

---

# 17. What We Have NOT Built Yet

The storage engine is intentionally simple at this stage.

Not implemented yet:

- Redis data types
- Lists
- Hashes
- Sets
- Sorted Sets
- Expiry
- TTL
- PERSIST
- Snapshot persistence
- Restart recovery
- RESP protocol
- Bonus features

The hackathon requires at least three data types, real key expiration, and persistence, so these remain future phases.

---

# 18. Complete Mental Model After Phase 3

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
              ┌───────────────┐
              │    DATABASE   │
              │               │
              │  Map<Key,Val> │
              └───────────────┘
                      │
                      ▼
                    RAM
```

The central principle is:

> **The networking layer communicates, the command layer decides what operation is required, and the storage layer owns the actual database state.**

---

# 19. Phase 3 Achievement

## ✅ In-Memory Storage Engine Complete

Mini Redis has moved from:

```text
A TCP server that understands commands
```

to:

```text
A working in-memory key-value database
```

We can now perform:

```text
SET
GET
DEL
EXISTS
KEYS
FLUSHALL
```

against real in-memory state.

The main architectural achievement is:

```text
TCP Server
    ↓
Parser
    ↓
Dispatcher
    ↓
Command Handler
    ↓
Storage Engine
    ↓
In-Memory Database
```

---

# 20. Next Phase

## Phase 4 — Redis Data Types

The hackathon requires at least **3 data types** from:

```text
Strings
Lists
Hashes
Sets
Sorted Sets
```

with their standard commands.

Our current storage model is:

```text
KEY → VALUE
```

We now need to evolve it conceptually toward:

```text
KEY
 ↓
┌──────────────────┐
│ type             │
│ value            │
└──────────────────┘
```

For example:

```text
name
 ↓
type: string
value: Mohit
```

or:

```text
users
 ↓
type: hash
value: {...}
```

Phase 4 will introduce the Redis data-type abstraction while keeping the existing networking, parser, dispatcher, and storage architecture connected.
