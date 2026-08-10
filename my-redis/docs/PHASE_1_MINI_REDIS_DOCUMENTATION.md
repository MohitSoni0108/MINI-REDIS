# Day 1 --- Mini Redis: TCP Networking Foundation

## Project

**Build Your Own Redis --- Mini Redis**

Today we started building a simplified Redis-like in-memory key-value
database from scratch using **Node.js**.

The hackathon requires a custom TCP server that can handle multiple
clients, core commands, expiry, multiple data types, persistence, and a
CLI client. Day 1 focused only on the networking foundation.

------------------------------------------------------------------------

## 1. What We Built Today

We built the first working layer of Mini Redis:

-   A Node.js TCP server using the built-in `node:net` module
-   A CLI TCP client
-   TCP communication between client and server
-   User input through Node.js `readline`
-   Server responses back to the client
-   Multiple simultaneous client connections

### Current architecture

``` text
USER
  ↓
CLI CLIENT
  ↓
TCP SOCKET
  ↓
TCP SERVER
  ↓
CONNECTION HANDLER
  ↓
RESPONSE
  ↓
TCP
  ↓
CLI CLIENT
  ↓
USER
```

------------------------------------------------------------------------

## 2. The Core Concept --- TCP

TCP is the communication layer we are using between our CLI client and
Mini Redis server.

Node.js provides the built-in `node:net` module for TCP networking.

The basic model is:

``` text
CLIENT
   │
   │ TCP connection
   ▼
SERVER
```

The server listens on an IP address and port. When a client connects,
Node.js provides a socket representing that connection.

``` text
             TCP SERVER
           /      |      \
          /       |       \
     Socket A  Socket B  Socket C
        │         │         │
     Client A  Client B  Client C
```

This is the foundation for the hackathon's multiple-client requirement.

------------------------------------------------------------------------

## 3. Server vs Client

A major concept from Day 1 is that the client and server have different
responsibilities.

### CLI Client

The client:

1.  Takes input from the user
2.  Sends that input through TCP
3.  Receives the server response
4.  Displays the response

### TCP Server

The server:

1.  Starts listening on a port
2.  Accepts client connections
3.  Receives data
4.  Sends a response
5.  Maintains a separate socket for each connection

The database itself will eventually live behind the server.

------------------------------------------------------------------------

## 4. Node.js Modules Used

### `node:net`

Used to create the TCP server and TCP client.

Important concepts:

``` text
net.createServer()
net.createConnection()
socket.write()
socket.on("data")
socket.on("end")
socket.on("error")
server.listen()
```

### `node:readline`

Used by the CLI client to read commands from the terminal.

The eventual Redis command flow will start with terminal input captured
through this interface.

------------------------------------------------------------------------

## 5. Socket Mental Model

A socket represents the communication channel between the client and
server.

``` text
CLIENT
   │
   │ socket.write()
   ▼
  TCP
   │
   ▼
SERVER SOCKET
   │
   │ data event
   ▼
SERVER
```

The server can also write back through the same socket:

``` text
SERVER
   │
   │ socket.write()
   ▼
  TCP
   │
   ▼
CLIENT
```

Therefore communication is two-way.

------------------------------------------------------------------------

## 6. Multiple Clients

The server is not designed for only one client.

For example:

``` text
                    TCP SERVER
                        │
          ┌─────────────┼─────────────┐
          │             │             │
          ▼             ▼             ▼
      Client A      Client B      Client C
       Socket A      Socket B      Socket C
```

Each client connection has its own socket.

Later, all of these clients will interact with the same Mini Redis
database:

``` text
Client A ──┐
Client B ──┼──► TCP Server ──► Shared Database
Client C ──┘
```

This connection between **networking and shared database state** will
become important when we implement concurrency and storage.

------------------------------------------------------------------------

## 7. Current Project Structure

After Day 1:

``` text
my-redis/
│
├── package.json
│
└── src/
    ├── server/
    │   └── server.js
    │
    └── client/
        └── cli.js
```

### `package.json`

Configured the project to use ES modules:

``` json
"type": "module"
```

and added scripts for starting the server and client.

### `src/server/server.js`

Responsible for:

-   Creating the TCP server
-   Listening on `127.0.0.1:6379`
-   Accepting connections
-   Reading incoming data
-   Sending responses
-   Handling connection and socket errors

### `src/client/cli.js`

Responsible for:

-   Creating a TCP connection
-   Reading terminal input
-   Sending input to the server
-   Displaying server responses
-   Handling disconnects and connection errors

------------------------------------------------------------------------

## 8. Day 1 Request Flow

For the current implementation, if the user enters:

``` text
hello
```

the flow is:

``` text
USER
 ↓
readline
 ↓
CLI CLIENT
 ↓
socket.write()
 ↓
TCP
 ↓
SERVER SOCKET
 ↓
data event
 ↓
SERVER
 ↓
socket.write()
 ↓
TCP
 ↓
CLIENT
 ↓
USER
```

The server currently echoes the received message.

For example:

``` text
myredis> hello
Server received: hello
```

This is intentional. We have not implemented the Redis command system
yet.

------------------------------------------------------------------------

## 9. What We Have NOT Built Yet

Day 1 is only the networking foundation.

We have NOT implemented:

-   `SET`
-   `GET`
-   `DEL`
-   `EXISTS`
-   `KEYS`
-   `FLUSHALL`
-   `EXPIRE`
-   `TTL`
-   `PERSIST`
-   Redis data types
-   Storage engine
-   Persistence
-   Snapshot/recovery
-   Redis protocol
-   Bonus features

These will be built in later phases.

------------------------------------------------------------------------

## 10. Connection to the Final Architecture

The complete Mini Redis architecture will eventually become:

``` text
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
                     /     |      \
                    /      |       \
               Strings    Lists    Hashes
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

Day 1 completed only the top part:

``` text
USER
 ↓
CLI CLIENT
 ↓
TCP
 ↓
TCP SERVER
 ↓
CONNECTION
```

This gives us the foundation on which the rest of Mini Redis will be
built.

------------------------------------------------------------------------

## 11. Testing Done Today

### Test 1 --- Start server

``` bash
npm run server
```

Expected:

``` text
MyRedis server running on 127.0.0.1:6379
```

### Test 2 --- Connect client

In another terminal:

``` bash
npm run client
```

Expected:

``` text
Connected to MyRedis server
Welcome to MyRedis!
myredis>
```

### Test 3 --- Send data

``` text
myredis> hello
```

Expected:

``` text
Server received: hello
```

### Test 4 --- Multiple clients

Open another terminal and run:

``` bash
npm run client
```

Both clients should be able to connect to the same server and
communicate independently.

------------------------------------------------------------------------

## 12. Day 1 Learning Summary

### Concepts learned

-   TCP server
-   TCP client
-   IP address + port
-   TCP socket
-   Client-server architecture
-   `node:net`
-   `net.createServer()`
-   `net.createConnection()`
-   `socket.write()`
-   `socket.on("data")`
-   `socket.on("end")`
-   `socket.on("error")`
-   Node.js `readline`
-   Multiple TCP connections
-   Basic request/response flow

### Main mental model

``` text
                 NETWORK
                    │
        ┌───────────┴───────────┐
        │                       │
      CLIENT                  SERVER
        │                       │
    readline              node:net
        │                       │
        └────── TCP SOCKET ─────┘
                    │
                    ▼
             DATA EXCHANGE
```

------------------------------------------------------------------------

## 13. Day 1 Achievement

**Mini Redis --- Day 1 COMPLETE ✅**

We successfully established the networking foundation of our Redis-like
database.

The important achievement is not just writing a TCP server. It is
understanding the first layer of the final system:

> A database server first needs a reliable way for clients to
> communicate with it.

Tomorrow, we move one layer deeper:

``` text
TCP
 ↓
CONNECTION
 ↓
COMMAND PARSER
 ↓
STRUCTURED COMMAND
```

### Next Phase

**Phase 2 --- Command Parsing & Dispatching**

Goal:

Turn raw input such as:

``` text
SET name Mohit
```

into a structured command that the server can understand and eventually
execute.

------------------------------------------------------------------------

## Hackathon Alignment

The hackathon's mandatory requirements include a custom TCP server
handling multiple clients and a CLI client for sending commands and
receiving responses. Day 1 directly established this networking/client
foundation. The remaining mandatory database functionality will be
implemented in later phases.
