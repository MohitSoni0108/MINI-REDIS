# Day 2 — Mini Redis: Command Parsing & Dispatching

## Objective

Day 2 continued from the TCP networking foundation built on Day 1.

Today we added the layer that allows Mini Redis to understand raw client input and route each command to the correct handler.

The new flow is:

```text
USER
 ↓
CLI CLIENT
 ↓
TCP
 ↓
TCP SERVER
 ↓
PARSER
 ↓
STRUCTURED COMMAND
 ↓
COMMAND DISPATCHER
 ↓
COMMAND HANDLER
 ↓
RESPONSE
```

## 1. What We Built

We added:

```text
src/
├── protocol/
│   └── parser.js
│
└── commands/
    └── dispatcher.js
```

and updated:

```text
src/server/server.js
```

The server now:

1. Receives raw TCP data.
2. Converts it to text.
3. Passes it to the parser.
4. Gets a structured command.
5. Sends the structured command to the dispatcher.
6. Routes it to the correct handler.
7. Sends the handler response back to the client.

---

## 2. Why Do We Need a Parser?

TCP transports data. It does not understand Redis commands.

For example:

```text
SET name Mohit
```

arrives as raw application data.

The parser converts that raw input into something the application can understand:

```text
RAW TCP DATA
     ↓
   PARSER
     ↓
STRUCTURED COMMAND
```

For:

```text
SET name Mohit
```

we produce:

```js
{
  command: "SET",
  args: ["name", "Mohit"]
}
```

---

## 3. Parser

File:

```text
src/protocol/parser.js
```

The parser:

- Removes surrounding whitespace.
- Splits the input into parts.
- Treats the first part as the command.
- Treats the remaining parts as arguments.
- Normalizes the command name to uppercase.

Example:

```text
SET name Mohit
```

becomes:

```js
["SET", "name", "Mohit"]
```

and finally:

```js
{
  command: "SET",
  args: ["name", "Mohit"]
}
```

### Command normalization

These:

```text
SET name Mohit
set name Mohit
SeT name Mohit
```

all produce:

```js
{
  command: "SET",
  args: ["name", "Mohit"]
}
```

Only the command name is normalized.

---

## 4. Dispatcher

File:

```text
src/commands/dispatcher.js
```

The dispatcher receives the structured command and decides which handler should execute.

Mental model:

```text
                 DISPATCHER
                     │
        ┌────────────┼────────────┐
        ▼            ▼            ▼
       SET          GET          DEL
        │            │            │
        ▼            ▼            ▼
    SET Handler  GET Handler  DEL Handler
```

The current dispatcher recognizes the mandatory core commands:

```text
SET
GET
DEL
EXISTS
KEYS
FLUSHALL
```

These are part of the hackathon's mandatory core feature list. The handlers at this stage only confirm that the correct command reached the correct place; they do not yet operate on a database. 

---

## 5. Unknown Commands

The dispatcher has a fallback for unsupported commands.

For example:

```text
RANDOM something
```

results in:

```text
Unknown command: RANDOM
```

This establishes a clear boundary between recognized and unsupported commands.

---

## 6. Updated Request Flow

For:

```text
SET name Mohit
```

the complete Day 2 flow is:

```text
CLIENT
   │
   │ "SET name Mohit"
   ▼
TCP SOCKET
   │
   ▼
SERVER
   │
   ▼
PARSER
   │
   ▼
{
  command: "SET",
  args: ["name", "Mohit"]
}
   │
   ▼
DISPATCHER
   │
   ▼
SET HANDLER
   │
   ▼
RESPONSE
   │
   ▼
TCP SOCKET
   │
   ▼
CLIENT
```

---

## 7. Separation of Responsibilities

We now have three clearly separated responsibilities.

### TCP Server

Responsible for:

```text
Communication
```

It should not contain database logic.

### Parser

Responsible for:

```text
Understanding the structure of the request
```

It converts raw input into structured data.

### Dispatcher

Responsible for:

```text
Routing the command
```

It decides which handler should execute.

Therefore:

```text
NETWORKING
    ↓
PARSING
    ↓
DISPATCHING
    ↓
COMMAND EXECUTION
```

This separation will allow the command handlers to connect cleanly to the storage engine later.

---

## 8. Current Project Structure

After Day 2:

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
│   └── commands/
│       └── dispatcher.js
│
└── docs/
    └── DAY_1_MINI_REDIS_DOCUMENTATION.md
```

---

## 9. Testing

### SET

Input:

```text
SET name Mohit
```

Expected parsed command:

```js
{
  command: "SET",
  args: ["name", "Mohit"]
}
```

### GET

```text
GET name
```

Expected:

```js
{
  command: "GET",
  args: ["name"]
}
```

### DEL

```text
DEL name
```

Expected:

```js
{
  command: "DEL",
  args: ["name"]
}
```

### Other core commands

Test:

```text
EXISTS name
KEYS
FLUSHALL
```

Each should reach its corresponding handler.

### Lowercase command

```text
set name Mohit
```

should become:

```text
SET
```

### Unknown command

```text
RANDOM something
```

should return:

```text
Unknown command: RANDOM
```

### Multiple clients

The Day 1 multiple-client functionality should continue working. Multiple clients should still be able to connect to the same server and send commands independently.

---

## 10. What We Have NOT Built Yet

At the end of Day 2, commands do not operate on real database data.

For example:

```text
SET name Mohit
```

does not yet create:

```text
name → Mohit
```

in memory.

Currently:

```text
SET
 ↓
Parser
 ↓
Dispatcher
 ↓
SET Handler
```

The following are still pending:

- In-memory storage engine
- Actual SET/GET/DEL/EXISTS/KEYS/FLUSHALL behavior
- Data types
- Expiry
- Persistence
- Restart recovery
- Full database testing

---

## 11. Main Mental Model

### Day 1

```text
CLIENT
   ↓
TCP
   ↓
SERVER
```

### Day 2

```text
CLIENT
   ↓
TCP
   ↓
SERVER
   ↓
PARSER
   ↓
DISPATCHER
   ↓
HANDLER
```

### Final system direction

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
                    STORAGE ENGINE
                           │
              ┌────────────┼────────────┐
              ▼            ▼            ▼
           Strings       Lists        Hashes
                           │
                           ▼
                      EXPIRY ENGINE
                           │
                           ▼
                   PERSISTENCE ENGINE
                           │
                           ▼
                          DISK
```

---

## 12. Day 2 Achievement

### ✅ Command Parsing & Dispatching Complete

Today Mini Redis moved from:

> **A TCP server that receives text**

to:

> **A server that can understand and route database commands.**

The key architectural achievement is the separation of:

```text
Communication
     ↓
Parsing
     ↓
Routing
     ↓
Execution
```

This creates the clean foundation needed to connect real command handlers to the database layer.

---

## 13. Next Phase

### Phase 3 — In-Memory Storage Engine

The next goal is to make Mini Redis actually store data.

We will transform:

```text
SET name Mohit
```

from:

```text
SET Handler
    ↓
"command received"
```

into:

```text
SET Handler
    ↓
Storage Engine
    ↓
name → "Mohit"
```

Then:

```text
GET name
    ↓
Storage Engine
    ↓
"Mohit"
```

At that point Mini Redis will begin functioning as an actual key-value database.
