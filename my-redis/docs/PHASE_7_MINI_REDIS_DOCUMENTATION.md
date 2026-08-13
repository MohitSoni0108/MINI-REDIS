# Mini Redis — Phase 7 Documentation

## Overview

Phase 7 was focused on taking the Mini Redis implementation from a
working prototype to a more reliable and protocol-correct TCP database
server.

The earlier phases gave us the core database functionality:

Client → TCP Server → Parser → Dispatcher → Storage → Persistence

In Phase 7, we hardened every layer around that flow:

Client
  ↓
TCP Stream Handling
  ↓
Parser / Tokenizer
  ↓
Argument Validation
  ↓
Command Dispatcher
  ↓
Type Validation
  ↓
Data Structures
  ↓
Expiration
  ↓
Persistence

The main objective was not to add random new features, but to identify
real problems through strict testing and fix them systematically.

---

# 1. TCP Stream Handling

## Problem

Initially, the server assumed:

    one `data` event = one complete command

This is incorrect because TCP provides a byte stream rather than
individual messages.

A command could arrive as:

    SET part

followed later by:

    ial value1\n

Or multiple commands could arrive together:

    SET a 1
    SET b 2
    SET c 3
    GET a

Without buffering, the server could interpret these incorrectly.

---

## Solution

We introduced a per-client TCP buffer.

    Incoming TCP data
           ↓
       Buffer data
           ↓
    Search for "\n"
           ↓
    Complete command
           ↓
       Parse command
           ↓
       Execute command

Incomplete data remains in the buffer until the rest of the command
arrives.

---

## Command Queue

We also introduced a per-client command queue so commands from the same
client execute in the correct order.

Example:

    SET counter 1
    SET counter 2
    GET counter

Execution:

    SET 1
      ↓
    SET 2
      ↓
    GET
      ↓
    2

Different clients can still operate concurrently.

    Client A → A1 → A2 → A3
    Client B → B1 → B2 → B3

---

## Testing

We tested:

- Multiple commands in one TCP write
- A command split across multiple TCP packets
- Multiple simultaneous clients
- Persistence after buffered commands

All tests passed.

### Result

TCP handling is now based on the correct stream model rather than the
incorrect packet/message model.

---

# 2. LRANGE Negative Index Support

## Problem

The initial `LRANGE` implementation used:

    array.slice(start, end + 1)

This failed for negative indexes.

For example:

    LRANGE mylist 0 -1

incorrectly produced an empty list.

---

## Solution

Negative indexes are now converted into real array positions.

For a list:

    [a, b, c, d]

indexes are:

     0   1   2   3
    -4  -3  -2  -1

Therefore:

    -1 → last element
    -2 → second-last element

Example:

    LRANGE mylist 0 -1

now returns the complete list.

---

## Additional Handling

We also handle:

- Negative start indexes
- Negative end indexes
- Excessively negative indexes
- Excessively positive indexes
- Invalid numeric indexes
- Start index greater than end index

---

## Testing

Verified:

    LRANGE list 0 -1
    LRANGE list -1 -1
    LRANGE list -2 -1
    LRANGE list -4 -2
    LRANGE list -100 100

All required cases passed.

---

# 3. Multi-Word SET Values

## Problem

The original parser split input purely on whitespace.

Therefore:

    SET greeting hello world

was interpreted as:

    SET
    greeting
    hello
    world

The `SET` validator therefore rejected the command.

---

## Solution

We redesigned the protocol to support quoted values.

Examples:

    SET name Mohit

    SET greeting "hello world"

The parser now understands:

    command
      ↓
    key
      ↓
    value

while preserving spaces inside quoted values.

Example:

    SET greeting "hello world"

becomes:

    command = SET
    key = greeting
    value = hello world

---

# 4. Quote-Aware Command Parser

This became a larger improvement than just fixing `SET`.

The parser was upgraded from simple whitespace splitting to a
quote-aware tokenizer.

Conceptually:

    Raw command
         ↓
    Quote-aware tokenizer
         ↓
    Tokens
         ↓
    Command + arguments

Example:

    HSET user bio "I am learning Redis"

becomes:

    HSET
    user
    bio
    I am learning Redis

instead of incorrectly splitting the quoted value into multiple tokens.

The parser supports quoted values using double or single quotes.

---

# 5. HSET Multiple Field/Value Pairs

## Problem

The previous HSET implementation could process one field/value pair but
silently ignored additional pairs.

For example:

    HSET user name Mohit age 22

could store:

    name → Mohit

while silently losing:

    age → 22

This was dangerous because data was being discarded without an error.

---

## New HSET Model

HSET now follows:

    HSET key field value [field value ...]

Example:

    HSET user name Mohit age 22 city Delhi

becomes:

    user
      ├── name → Mohit
      ├── age  → 22
      └── city → Delhi

---

## Multiple Pairs + Multi-Word Values

The new parser allows:

    HSET user name Mohit bio "I am learning Redis" age 22

which becomes:

    name → Mohit
    bio  → I am learning Redis
    age  → 22

---

## HSET Validation

We also added pair validation.

The arguments after the key must always form complete
field/value pairs.

Valid:

    HSET user name Mohit

    HSET user name Mohit age 22

Invalid:

    HSET user name Mohit age

The invalid command returns:

    ERR wrong number of arguments for HSET

This prevents incomplete data from being silently stored.

---

# 6. HEXISTS Fix

## Problem

`HEXISTS` was already implemented in the dispatcher/handler layer,
but it was missing from the central command validation rules.

Therefore:

    HEXISTS user name

was rejected as:

    ERR unknown command 'HEXISTS'

The dispatcher never reached the existing implementation.

---

## Solution

Added:

    HEXISTS: { min: 2, max: 2 }

to the command validation rules.

Now the flow is:

    HEXISTS
       ↓
    Validation
       ↓
    Dispatcher
       ↓
    Handler
       ↓
    Database

---

## Testing

Verified:

    HEXISTS user name

returns:

    1

For a missing field:

    HEXISTS user age

returns:

    0

For a missing hash:

    HEXISTS unknown name

returns:

    0

Wrong data types still return `WRONGTYPE`.

---

# 7. Multi-Key DEL and EXISTS

## Problem

The existing `DEL` and `EXISTS` handlers already supported multiple
keys, but the validation layer restricted them to one key.

The rules incorrectly contained:

    DEL: { min: 1, max: 1 }
    EXISTS: { min: 1, max: 1 }

Therefore:

    DEL a b c

and:

    EXISTS a b c

were rejected before reaching the handlers.

---

## Solution

Changed the validation rules to:

    DEL: { min: 1 }
    EXISTS: { min: 1 }

This means at least one key is required, but there is no artificial
maximum.

---

## Examples

    DEL a b c

returns the number of keys actually deleted.

    EXISTS a b c

returns the number of supplied keys that currently exist.

We also tested:

- Existing + missing keys
- Duplicate keys
- Missing arguments
- Persistence after deletion

---

# 8. Dead Code Cleanup

The dispatcher contained an older commented-out implementation of
`dispatchCommand()`.

This created unnecessary confusion and made the codebase look as if
two implementations existed.

We removed the obsolete implementation.

The dispatcher now has one active source of truth for command routing.

---

# 9. Persistence Strategy

## Existing Design

Mini Redis currently uses snapshot persistence.

The in-memory database is serialized into a snapshot file.

Conceptually:

    Database
       ↓
    Snapshot
       ↓
    dump.json

After a restart:

    dump.json
       ↓
    Load snapshot
       ↓
    Restore database
       ↓
    Server starts

---

## Important Finding

Strict testing showed that persistence is functionally correct.

We verified:

- Data survives a complete server restart
- TTL information survives restart
- Snapshot remains valid
- 200 concurrent writes completed successfully
- No data corruption occurred in the stress test

---

## Known Limitation

The current strategy rewrites the complete snapshot after mutations.

For a large database this can create unnecessary disk I/O.

This is a scalability limitation, not a correctness failure.

Possible future improvements include:

- Debounced/batched snapshots
- Background persistence
- Append-only file (AOF)
- Incremental/delta persistence
- Write-ahead logging
- Periodic snapshots combined with a log

For the scope of this hackathon, the current snapshot implementation
provides reliable persistence while keeping the architecture simple and
understandable.

---

# 10. Phase 7 Testing Strategy

Phase 7 was driven by strict testing rather than assumptions.

The testing process was:

    Test
      ↓
    Identify failure
      ↓
    Understand root cause
      ↓
    Modify only required layer
      ↓
    Run focused test
      ↓
    Run regression tests
      ↓
    Continue

This prevented unrelated parts of the system from being changed
unnecessarily.

---

# 11. Final Phase 7 Architecture

After Phase 7, the Mini Redis architecture is:

    ┌─────────────────────┐
    │       CLI Client    │
    └──────────┬──────────┘
               │
               │ TCP
               ▼
    ┌─────────────────────┐
    │     TCP Server      │
    │                     │
    │ Per-client Buffer   │
    │ Command Queue       │
    └──────────┬──────────┘
               │
               ▼
    ┌─────────────────────┐
    │  Quote-aware Parser │
    └──────────┬──────────┘
               │
               ▼
    ┌─────────────────────┐
    │ Argument Validation │
    └──────────┬──────────┘
               │
               ▼
    ┌─────────────────────┐
    │     Dispatcher      │
    └──────────┬──────────┘
               │
       ┌───────┼────────┐
       ▼       ▼        ▼
    String    List     Hash
       │       │        │
       └───────┼────────┘
               ▼
    ┌─────────────────────┐
    │   Expiration Logic  │
    └──────────┬──────────┘
               │
               ▼
    ┌─────────────────────┐
    │   In-Memory Store   │
    └──────────┬──────────┘
               │
               ▼
    ┌─────────────────────┐
    │ Snapshot Persistence│
    │      dump.json      │
    └─────────────────────┘

---

# 12. What Phase 7 Taught

The major learning from Phase 7 was that building a database is not
only about implementing commands.

A reliable system also needs:

    Correct TCP stream handling
              +
    Correct parsing
              +
    Argument validation
              +
    Type safety
              +
    Edge-case handling
              +
    Multi-client behavior
              +
    Persistence
              +
    Regression testing

The project evolved from:

    "A server that can execute Redis-like commands"

into:

    "A TCP-based database system that correctly handles
     streams, parsing, validation, data types, concurrency,
     expiration and persistence."

---

# 13. Phase 7 Completion Checklist

## TCP

- [x] Multiple commands in one TCP packet
- [x] Fragmented commands across packets
- [x] Per-client buffering
- [x] Per-client command ordering
- [x] Multiple clients

## Parser

- [x] Case-insensitive commands
- [x] Quoted values
- [x] Multi-word SET values
- [x] Multi-word HSET values
- [x] Unterminated quote detection

## Commands

- [x] Negative LRANGE indexes
- [x] HEXISTS
- [x] Multi-key DEL
- [x] Multi-key EXISTS
- [x] Multi-pair HSET

## Reliability

- [x] WRONGTYPE protection
- [x] Argument validation
- [x] Invalid input handling
- [x] Edge-case testing
- [x] Multi-client testing

## Persistence

- [x] Snapshot persistence
- [x] Restart recovery
- [x] TTL persistence
- [x] Concurrent-write verification
- [x] Known limitation documented

## Code Quality

- [x] Removed obsolete dispatcher implementation
- [x] Reduced silent data loss
- [x] Centralized command validation
- [x] Clear separation of parser, dispatcher, handlers and storage

---

# Final Result

Phase 7 completed the **robustness and reliability layer** of Mini
Redis.

The core architecture now supports:

    TCP Networking
        ↓
    Multiple Clients
        ↓
    Stream-safe Command Processing
        ↓
    Quote-aware Parsing
        ↓
    Command Validation
        ↓
    String + List + Hash
        ↓
    Expiration
        ↓
    Persistence
        ↓
    Restart Recovery

The next step is not another major feature.

The next step is a **complete final regression test against the original
strict core-feature test suite**, followed by repository cleanup,
README/documentation, final architecture presentation and submission
preparation.