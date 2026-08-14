# Mini Redis

A Redis-like in-memory database built from scratch using **Node.js** and the native TCP networking module.

This project was built to understand how a database server works internally rather than simply using an existing database implementation.

Instead of relying on Redis itself, Mini Redis implements its own:

- TCP server
- TCP stream handling
- Command protocol
- Parser / tokenizer
- Command dispatcher
- In-memory database
- String, List and Hash data types
- Key expiration
- Snapshot persistence
- CLI client
- Multi-client support
- Automated integration tests

The project focuses on understanding the complete flow:

**Client → TCP → Parser → Validation → Dispatcher → Data Structure → Persistence**

---

# 📌 Project Overview

Mini Redis is a simplified Redis-like database server that accepts commands over a raw TCP connection.

A user interacts with the system through a custom CLI client:

```text
myredis> SET name Mohit
OK

myredis> GET name
Mohit
```

Under the hood:

```text
┌──────────────────┐
│    CLI Client    │
└────────┬─────────┘
         │
         │ TCP
         ▼
┌──────────────────┐
│   TCP Server     │
│                  │
│ Stream Buffer    │
│ Command Queue    │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ Parser / Tokenizer│
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ Argument          │
│ Validation        │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ Command Dispatcher│
└────────┬─────────┘
         │
         ▼
┌─────────────────────────┐
│     In-Memory Database  │
│                         │
│  Strings | Lists | Hashes│
└────────┬────────────────┘
         │
         ▼
┌──────────────────┐
│ Snapshot          │
│ Persistence       │
└──────────────────┘
```

---

# 🎯 Project Goals

The main goal was to understand the internal architecture behind a Redis-like system by building the important components ourselves.

The project was developed incrementally, starting from basic in-memory storage and eventually adding:

1. Data structures
2. Command execution
3. TCP networking
4. Parsing
5. Validation
6. Expiration
7. Persistence
8. Multi-client handling
9. Robust TCP stream processing
10. Automated integration testing

The emphasis was on **connecting the concepts together**, not simply implementing isolated commands.

---

# 🚀 Core Features

## 1. Custom TCP Server

Mini Redis uses Node.js's native `net` module to create a TCP server.

The server listens on:

```text
127.0.0.1:6379
```

Clients communicate directly with the server through TCP.

No Express or HTTP layer is used.

---

## 2. TCP Stream Handling

TCP is a byte stream rather than a message-based protocol.

Therefore, the server cannot assume:

```text
1 TCP packet = 1 command
```

Mini Redis handles:

### Fragmentation

A command may arrive in multiple pieces:

```text
SET part
```

followed later by:

```text
ial value
```

The server buffers the data until a complete command is received.

### Pipelining

Multiple commands may arrive in a single TCP write:

```text
SET a 1
SET b 2
SET c 3
GET a
GET b
GET c
```

The server separates and processes each command independently.

### Command Ordering

Commands from the same client are processed in order using a command queue.

This ensures:

```text
SET counter 1
SET counter 2
GET counter
```

returns:

```text
2
```

---

# 3. Custom Command Parser

Mini Redis contains its own command parsing layer.

The parser converts raw TCP input:

```text
SET name Mohit
```

into structured command data:

```js
{
  command: "SET",
  args: ["name", "Mohit"]
}
```

The parser is **quote-aware**, allowing values containing spaces:

```text
SET message "I am learning Redis"
```

which becomes:

```text
{
  command: "SET",
  args: [
    "message",
    "I am learning Redis"
  ]
}
```

This tokenizer is also used for commands such as:

```text
HSET user bio "I am learning Redis"
```

---

# 4. Command Validation

Commands are validated before reaching their handlers.

The validation layer checks:

* Supported command
* Minimum number of arguments
* Maximum number of arguments where applicable
* Valid field/value pairs
* Command-specific requirements

Conceptually:

```text
Raw Command
     ↓
Parser
     ↓
Validation
     ↓
Dispatcher
     ↓
Handler
```

This prevents malformed commands from reaching the database layer.

---

# 5. Command Dispatcher

The dispatcher acts as the central routing layer.

For example:

```text
SET
 ↓
String Handler

LPUSH
 ↓
List Handler

HSET
 ↓
Hash Handler

EXPIRE
 ↓
Expiration Handler
```

The dispatcher separates:

* Protocol handling
* Validation
* Command routing
* Actual database operations

This keeps the architecture modular.

---

# 🗃️ Supported Data Types

Mini Redis currently implements three core Redis-style data types.

---

## String

Basic operations:

```text
SET key value
GET key
```

Examples:

```text
SET name Mohit
GET name
```

Result:

```text
Mohit
```

Strings support:

* Creation
* Reading
* Overwriting
* Multi-word values
* Persistence
* Expiration

---

# 📚 Lists

Supported commands:

```text
LPUSH
RPUSH
LPOP
RPOP
LRANGE
```

Example:

```text
RPUSH fruits apple banana mango
```

Then:

```text
LRANGE fruits 0 -1
```

returns the complete list.

### Negative Indexing

Mini Redis supports Redis-style negative list indexes.

For:

```text
[a, b, c, d]
```

the indexes are:

```text
 0   1   2   3
-4  -3  -2  -1
```

Therefore:

```text
LRANGE list 0 -1
```

returns the complete list.

---

# 🧩 Hashes

Supported commands:

```text
HSET
HGET
HGETALL
HDEL
HEXISTS
```

Example:

```text
HSET user name Mohit age 22 city Delhi
```

creates:

```text
user
├── name → Mohit
├── age  → 22
└── city → Delhi
```

Multiple field/value pairs are processed dynamically.

Multi-word values are also supported:

```text
HSET profile bio "I am learning Redis"
```

---

# 🔐 Type Safety

A key is associated with a specific data type.

For example:

```text
SET user Mohit
```

creates a String.

Trying to use the same key as a List:

```text
LPUSH user hello
```

returns a `WRONGTYPE` error.

The same protection exists between:

```text
String ↔ List
String ↔ Hash
List ↔ Hash
```

This prevents incompatible operations from corrupting the stored data.

---

# 🗝️ Key Management

Mini Redis supports:

```text
DEL
EXISTS
KEYS
FLUSHALL
```

### Multiple Keys

`DEL` supports multiple keys:

```text
DEL key1 key2 key3
```

and returns the number of keys actually deleted.

`EXISTS` also supports multiple keys:

```text
EXISTS key1 key2 key3
```

and returns the number of supplied keys that exist.

---

# ⏳ Key Expiration

Mini Redis implements key expiration using:

```text
EXPIRE
TTL
PERSIST
```

Example:

```text
SET temporary hello
EXPIRE temporary 30
```

Check remaining lifetime:

```text
TTL temporary
```

A key without an expiration returns:

```text
-1
```

A missing key returns:

```text
-2
```

---

## Lazy Expiration

Expired keys are removed when they are accessed.

Conceptually:

```text
GET key
   ↓
Check expiration
   ↓
Expired?
 ┌─┴─┐
Yes  No
 │    │
 ▼    ▼
Delete Return value
```

This keeps expiration logic simple while ensuring expired keys are not returned to clients.

---

# 💾 Persistence

Mini Redis uses **snapshot persistence**.

The in-memory database is serialized into:

```text
data/dump.json
```

Conceptually:

```text
In-Memory Database
        │
        ▼
   Snapshot
        │
        ▼
   dump.json
```

When the server starts:

```text
dump.json
    ↓
Load Snapshot
    ↓
Restore Database
    ↓
Start Server
```

Persistence was tested across complete server restarts.

Stored:

* Strings
* Lists
* Hashes
* Expiration information

can survive a server restart.

---

# 🌐 Multi-Client Support

The TCP server can accept multiple clients simultaneously.

Example:

```text
Client A ─────┐
              │
Client B ─────┼──→ MyRedis Server
              │
Client C ─────┘
```

All clients interact with the same in-memory database.

Commands from each individual client maintain their own execution order.

The system was also tested with multiple simultaneous clients and concurrent writes.

---

# 🧪 Automated Testing

The project contains dedicated integration test files:

```text
test/
├── 01-strings-test.js
├── 02-lists-test.js
├── 03-hashes-test.js
├── 04-types-multikey-test.js
├── 05-expiration-test.js
├── 06-tcp-networking-test.js
├── 07-persistence-test.js
└── test-utils.js
```

The tests communicate with the **actual running TCP server**, rather than testing only internal functions.

This makes the tests closer to how an external client or examiner interacts with the system.

---

# 🔬 Testing Coverage

The test suite covers:

### Strings

* SET
* GET
* Overwrite
* Missing keys
* Multi-word values

### Lists

* LPUSH
* RPUSH
* LPOP
* RPOP
* LRANGE
* Negative indexes

### Hashes

* HSET
* Multiple field/value pairs
* Multi-word values
* HGET
* HGETALL
* HDEL
* HEXISTS

### Key Management

* DEL
* Multi-key DEL
* EXISTS
* Multi-key EXISTS
* KEYS
* FLUSHALL

### Expiration

* EXPIRE
* TTL
* PERSIST
* Lazy expiration
* Expiration persistence

### Error Handling

* WRONGTYPE
* Invalid argument counts
* Invalid expiration values
* Unknown commands

### Networking

* TCP fragmentation
* TCP pipelining
* Multiple clients
* Command ordering

### Persistence

* Server restart recovery
* String persistence
* List persistence
* Hash persistence
* TTL persistence

---

# ▶️ Installation

Clone the repository:

```bash
git clone https://github.com/MohitSoni0108/MINI-REDIS.git
```

Enter the repository:

```bash
cd MINI-REDIS
```

Install dependencies:

```bash
npm install
```

---

# ▶️ Running the Server

Start the Mini Redis server:

```bash
npm run server
```

Expected output:

```text
MyRedis server running on 127.0.0.1:6379
```

---

# 💻 Running the CLI Client

Open another terminal in the project directory:

```bash
npm run client
```

You should see:

```text
Connected to MyRedis server
myredis> Welcome to MyRedis!
```

Now commands can be entered interactively:

```text
myredis> SET name Mohit
OK

myredis> GET name
Mohit
```

---

# 🧪 Running the Complete Core Test Suite

The entire core test suite can be executed with:

```bash
npm run test:core
```

This runs the individual test modules sequentially:

```text
Strings
   ↓
Lists
   ↓
Hashes
   ↓
Types + Multi-Key
   ↓
Expiration
   ↓
TCP Networking
   ↓
Persistence
```

The tests were run against the actual Mini Redis server and used to validate the mandatory core functionality.

---

# 📁 Project Structure

```text
MINI-REDIS/
│
├── data/
│   └── dump.json
│
├── docs/
│   ├── PHASE_1_MINI_REDIS_DOCUMENTATION.md
│   ├── PHASE_2_MINI_REDIS_DOCUMENTATION.md
│   ├── PHASE_3_MINI_REDIS_DOCUMENTATION.md
│   ├── PHASE_4_MINI_REDIS_DOCUMENTATION.md
│   ├── PHASE_5_MINI_REDIS_DOCUMENTATION.md
│   ├── PHASE_6_MINI_REDIS_DOCUMENTATION.md
│   ├── PHASE_7_MINI_REDIS_DOCUMENTATION.md
│   └── SYSTEM ARCHITECTURE.txt
│
├── src/
│   ├── client/
│   │   └── cli.js
│   │
│   ├── commands/
│   │   └── dispatcher.js
│   │
│   ├── protocol/
│   │   └── parser.js
│   │
│   ├── server/
│   │   └── server.js
│   │
│   └── storage/
│       ├── database.js
│       ├── persistence.js
│       └── dataTypes/
│           ├── hashes.js
│           ├── lists.js
│           └── strings.js
│
├── test/
│   ├── 01-strings-test.js
│   ├── 02-lists-test.js
│   ├── 03-hashes-test.js
│   ├── 04-types-multikey-test.js
│   ├── 05-expiration-test.js
│   ├── 06-tcp-networking-test.js
│   ├── 07-persistence-test.js
│   └── test-utils.js
│
├── package.json
├── package-lock.json
└── nodemon.json
```

---

# 🧠 Architecture & Data Flow

A complete command travels through the system as follows:

```text
                 USER
                  │
                  ▼
             CLI CLIENT
                  │
                  │ TCP
                  ▼
          ┌───────────────┐
          │  TCP SERVER   │
          └───────┬───────┘
                  │
                  ▼
          STREAM BUFFER
                  │
                  ▼
          COMMAND QUEUE
                  │
                  ▼
         PARSER / TOKENIZER
                  │
                  ▼
        ARGUMENT VALIDATION
                  │
                  ▼
          COMMAND DISPATCHER
                  │
        ┌─────────┼─────────┐
        ▼         ▼         ▼
     STRING     LIST       HASH
        │         │         │
        └─────────┼─────────┘
                  ▼
          IN-MEMORY DATABASE
                  │
          ┌───────┴───────┐
          ▼               ▼
    EXPIRATION        PERSISTENCE
                          │
                          ▼
                     dump.json
```

This separation allows each layer to have a clear responsibility.

---

# 🧱 Design Principles

The project was developed around several important systems concepts.

### Separation of Concerns

Networking, parsing, validation, command routing, storage and persistence are kept as separate responsibilities.

### Stream-Oriented Networking

TCP is treated as a byte stream rather than a packet/message protocol.

### Centralized Validation

Command argument validation happens before handlers execute.

### Data-Type Enforcement

Keys maintain their data type and incompatible operations return `WRONGTYPE`.

### Persistence Separation

The in-memory database and persistence layer are separate components.

### Test-Driven Debugging

Failures discovered through integration tests were traced back to their actual layer instead of patching symptoms.

---

# ⚠️ Known Limitations

## Full Snapshot Persistence

Mini Redis currently uses full snapshot persistence.

After a mutating command, the current database state is persisted as a snapshot.

For a small hackathon-scale database this provides simple and understandable restart recovery.

However, rewriting the complete database after every mutation would become inefficient for very large datasets because of increased disk I/O.

A production-oriented implementation could improve this using:

* Debounced or batched snapshots
* Background persistence
* Append-Only File (AOF)
* Incremental/delta persistence
* Write-ahead logging
* Periodic snapshots combined with a log

This is a known scalability limitation rather than a core correctness issue.

---

# 🚫 Features Outside the Current Core Scope

Mini Redis intentionally focuses on the mandatory core database functionality implemented during the project.

The following advanced Redis capabilities are outside the current implementation scope:

* RESP protocol
* Pub/Sub
* MULTI / EXEC transactions
* AOF persistence
* Eviction policies
* Replication
* EVAL / Lua scripting
* AUTH

The project focuses on understanding and implementing the core architecture first.

---

# 🔮 Future Improvements

If the project were extended beyond the current scope, possible improvements would include:

1. RESP-compatible protocol
2. Append-only persistence
3. More efficient persistence scheduling
4. Memory eviction policies
5. Pub/Sub
6. Transactions
7. Replication
8. Authentication
9. More Redis-compatible commands
10. Improved protocol framing
11. Performance benchmarking
12. More advanced concurrency handling

---

# 📚 Learning Outcomes

Building Mini Redis provided practical understanding of:

* TCP networking with Node.js
* TCP stream fragmentation and pipelining
* Client/server architecture
* Protocol design
* Tokenization and parsing
* Command dispatching
* In-memory data structures
* Type enforcement
* Key expiration
* Persistence
* Multi-client systems
* Error handling
* Integration testing
* Concurrency
* Debugging distributed layers
* Designing modular backend systems

The biggest learning was understanding how the individual concepts connect:

```text
Networking
     ↓
Protocol
     ↓
Parser
     ↓
Command System
     ↓
Data Structures
     ↓
Database
     ↓
Persistence
```

Rather than learning each component independently, Mini Redis provided a single system in which all of them work together.

---

# 🏁 Project Status

## Core Features

**Implemented and tested.**

Mini Redis currently provides:

* Custom TCP server
* CLI client
* Multiple client connections
* TCP buffering
* TCP fragmentation handling
* TCP pipelining
* Command ordering
* Quote-aware command tokenizer
* String data type
* List data type
* Hash data type
* Multi-word values
* Multi-pair HSET
* Multi-key DEL
* Multi-key EXISTS
* WRONGTYPE protection
* EXPIRE
* TTL
* PERSIST
* Lazy expiration
* Snapshot persistence
* Restart recovery
* Automated integration testing

---

# 👨‍💻 Author

**Mohit Soni**

Built as a hands-on systems project to understand how a Redis-like in-memory database works internally using Node.js.

---

# ⭐ Final Note

Mini Redis started as a simple idea:

```text
"Can I build Redis-like functionality myself?"
```

It evolved into a complete learning project covering:

```text
TCP Networking
      +
Protocol Design
      +
Parsing
      +
Data Structures
      +
Database Architecture
      +
Expiration
      +
Persistence
      +
Concurrency
      +
Automated Testing
```

The objective was not to recreate the entire Redis codebase.

The objective was to understand the **engineering ideas behind a database server by building one from scratch.**
