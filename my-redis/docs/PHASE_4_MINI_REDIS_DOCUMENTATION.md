# Phase 4 — Mini Redis: Redis Data Types

## Objective

Phase 4 upgraded Mini Redis from a basic key-value store into a typed in-memory database.

The hackathon requires at least 3 data types from Strings, Lists, Hashes, Sets, and Sorted Sets. We selected:

```text
Strings
Lists
Hashes
```

The major transition was:

```text
KEY → VALUE
```

to:

```text
KEY → TYPE + VALUE
```

---

## 1. Data Type Architecture

A String can be represented as:

```text
name
 ↓
type: string
value: Mohit
```

A List:

```text
fruits
 ↓
type: list
value: [banana, apple]
```

A Hash:

```text
user
 ↓
type: hash
value:
{
    name: Mohit,
    age: 22
}
```

This type metadata allows commands to verify that they are operating on the correct kind of value.

---

## 2. Project Structure

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
│       ├── database.js
│       │
│       └── dataTypes/
│           ├── strings.js
│           ├── lists.js
│           └── hashes.js
│
└── docs/
    ├── PHASE_1_...
    ├── PHASE_2_...
    ├── PHASE_3_MINI_REDIS_DOCUMENTATION.md
    └── PHASE_4_MINI_REDIS_DOCUMENTATION.md
```

---

## 3. Strings

Strings are the simplest data type.

Conceptual representation:

```js
{
  type: "string",
  value: "Mohit"
}
```

Commands:

```text
SET
GET
```

Example:

```text
SET name Mohit
```

creates:

```text
name
 ↓
type: string
value: Mohit
```

Then:

```text
GET name
```

returns:

```text
Mohit
```

---

## 4. Lists

A List is an ordered collection.

Conceptual representation:

```js
{
  type: "list",
  value: []
}
```

Example:

```text
LPUSH fruits apple
```

creates:

```text
fruits
 ↓
type: list
value: [apple]
```

The implemented commands are:

```text
LPUSH
RPUSH
LPOP
RPOP
LRANGE
```

### LPUSH

Adds elements to the beginning:

```text
LPUSH fruits apple
LPUSH fruits banana
```

Result:

```text
[banana, apple]
```

### RPUSH

Adds elements to the end:

```text
RPUSH fruits orange
```

Result:

```text
[banana, apple, orange]
```

### LPOP

Removes and returns the first element.

```text
[banana, apple, orange]
        ↓
      LPOP
        ↓
      banana
```

Remaining:

```text
[apple, orange]
```

### RPOP

Removes and returns the last element.

```text
[banana, apple, orange]
             ↓
           RPOP
             ↓
           orange
```

Remaining:

```text
[banana, apple]
```

### LRANGE

Reads a range of list elements:

```text
LRANGE fruits 0 2
```

Example result:

```text
banana
apple
orange
```

The current implementation uses a simple JavaScript array range operation. Full Redis-compatible negative-index behavior remains a later refinement.

---

## 5. Hashes

A Hash is a collection of field/value pairs under one key.

Conceptual representation:

```js
{
  type: "hash",
  value: {}
}
```

Example:

```text
HSET user name Mohit
HSET user age 22
```

creates:

```text
user
 ↓
type: hash
value:
{
    name: Mohit,
    age: 22
}
```

Implemented commands:

```text
HSET
HGET
HGETALL
HDEL
HEXISTS
```

### HSET

Creates or updates a field:

```text
HSET user name Mohit
```

then:

```text
HSET user age 22
```

produces:

```text
{
    name: Mohit,
    age: 22
}
```

### HGET

```text
HGET user name
```

returns:

```text
Mohit
```

### HGETALL

```text
HGETALL user
```

returns the fields and values:

```text
name
Mohit
age
22
```

### HDEL

```text
HDEL user age
```

removes the field and returns the number of fields deleted.

### HEXISTS

```text
HEXISTS user name
```

returns:

```text
(integer) 1
```

while a missing field returns:

```text
(integer) 0
```

---

## 6. Type Safety — WRONGTYPE

The storage engine now knows what type each key contains.

For example:

```text
SET name Mohit
```

creates:

```text
name → string
```

Trying:

```text
LPUSH name hello
```

is invalid because `LPUSH` requires a List.

The server returns:

```text
WRONGTYPE operation against a key holding the wrong kind of value
```

Mental model:

```text
Command
   ↓
Does key exist?
   ↓
What is its type?
   │
   ├── Correct type → Execute
   │
   └── Wrong type   → WRONGTYPE
```

This is one of the main reasons the storage model changed to `TYPE + VALUE`.

---

## 7. Shared Storage Architecture

All three types live inside the same database:

```text
                    DATABASE
                       │
          ┌────────────┼────────────┐
          ▼            ▼            ▼
        name         fruits        user
          │            │            │
          ▼            ▼            ▼
       STRING         LIST         HASH
          │            │            │
       "Mohit"    [banana, apple]  {
                                    name: Mohit,
                                    age: 22
                                  }
```

The networking architecture remains unchanged:

```text
CLI
 ↓
TCP
 ↓
Server
 ↓
Parser
 ↓
Dispatcher
 ↓
Command Handler
 ↓
Storage Engine
 ↓
Typed Data
```

---

## 8. Why This Architecture Matters

We did not create separate databases for Strings, Lists, and Hashes.

Instead:

```text
                 STORAGE ENGINE
                       │
          ┌────────────┼────────────┐
          ▼            ▼            ▼
       STRING         LIST         HASH
```

All commands use the same central storage engine.

This allows future data types to be added without redesigning the networking layer.

---

## 9. Testing Checklist

### Strings

```text
☐ SET
☐ GET
☐ GET missing key
☐ String WRONGTYPE
```

### Lists

```text
☐ LPUSH
☐ RPUSH
☐ LPOP
☐ RPOP
☐ LRANGE
☐ List WRONGTYPE
```

### Hashes

```text
☐ HSET
☐ HGET
☐ HGETALL
☐ HDEL
☐ HEXISTS
☐ Hash WRONGTYPE
```

### Existing commands

```text
☐ DEL still works
☐ EXISTS still works
☐ KEYS still works
☐ FLUSHALL still works
☐ Multiple clients still work
```

---

## 10. Important Current Limitation

The command parser is still based on whitespace splitting.

Therefore:

```text
SET message hello world
```

is interpreted as:

```text
["message", "hello", "world"]
```

rather than treating `hello world` as one value.

This is intentionally not solved in the data-type phase. The command/protocol layer can be improved later when we implement a more complete Redis-compatible protocol.

---

## 11. Phase 4 Mental Model

```text
                  KEY
                   │
                   ▼
            ┌──────────────┐
            │ TYPE + VALUE │
            └──────────────┘
                   │
       ┌───────────┼───────────┐
       ▼           ▼           ▼
    STRING        LIST        HASH
       │           │           │
       ▼           ▼           ▼
     value       array       fields
```

Commands are type-specific:

```text
STRING
 ├── SET
 └── GET

LIST
 ├── LPUSH
 ├── RPUSH
 ├── LPOP
 ├── RPOP
 └── LRANGE

HASH
 ├── HSET
 ├── HGET
 ├── HGETALL
 ├── HDEL
 └── HEXISTS
```

---

## 12. Complete Architecture After Phase 4

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
          ┌────────────────┼────────────────┐
          ▼                ▼                ▼
       STRING             LIST             HASH
          │                │                │
          ▼                ▼                ▼
       "Mohit"      [banana, apple]    {name: Mohit,
                                         age: 22}
```

---

## 13. Phase 4 Achievement

### ✅ Redis Data Types Complete

Mini Redis has evolved from:

```text
KEY → VALUE
```

into:

```text
KEY → TYPE + VALUE
```

We implemented:

```text
Strings
Lists
Hashes
```

with:

```text
Strings:
SET, GET

Lists:
LPUSH, RPUSH, LPOP, RPOP, LRANGE

Hashes:
HSET, HGET, HGETALL, HDEL, HEXISTS
```

We also introduced:

```text
Type metadata
      ↓
Type validation
      ↓
WRONGTYPE protection
```

This establishes the data-model foundation required for the remaining Mini Redis features.

---

## 14. Next Phase

# Phase 5 — Expiry Engine

The storage model will evolve from:

```text
KEY
 ↓
┌──────────────────┐
│ type             │
│ value            │
└──────────────────┘
```

toward:

```text
KEY
 ↓
┌──────────────────────┐
│ type                 │
│ value                │
│ expiresAt            │
└──────────────────────┘
```

We will implement:

```text
EXPIRE
TTL
PERSIST
```

and connect expiration behavior to the existing storage engine.

The goal is to make keys automatically become unavailable after their configured lifetime.
