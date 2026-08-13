/**
 * =====================================================================
 * TEST SUITE: TCP NETWORKING & CONCURRENCY
 * =====================================================================
 * This suite proves the robustness of the custom TCP server architecture.
 * 1. Pipelining: Proves the server can correctly process multiple commands 
 *    batched into a single TCP packet without confusing boundaries.
 * 2. Fragmentation: Simulates network lag by splitting a single command 
 *    across multiple TCP chunks, proving the buffer waits for the `\n`.
 * 3. Multi-Client: Verifies that the event loop can concurrently handle 
 *    multiple clients sharing state without blocking each other.
 * =====================================================================
 */

import {
  startServer, stopServer, createClient, sendCommand,
  assertEqual, section, pass, fail, printFinalReport
} from "./test-utils.js";

async function testPipelining() {
  section("TCP PIPELINING TEST");
  const socket = await createClient();
  await sendCommand(socket, "FLUSHALL");

  return new Promise((resolve) => {
    let buffer = "";

    socket.on("data", (data) => {
      buffer += data.toString();
      const lines = buffer.split("\n").map(l => l.trim()).filter(Boolean);
      
      // We expect 6 responses for the 6 pipelined commands
      if (lines.length >= 6) {
        const expected = ["OK", "OK", "OK", "1", "2", "3"];
        const actual = lines.slice(-6);

        if (JSON.stringify(actual) === JSON.stringify(expected)) {
          pass("Multiple commands in one TCP write");
        } else {
          fail("Multiple commands in one TCP write", expected.join(" | "), actual.join(" | "));
        }
        socket.destroy();
        resolve();
      }
    });

    // Fire 6 commands at once!
    socket.write(
      "SET pipeA 1\n" +
      "SET pipeB 2\n" +
      "SET pipeC 3\n" +
      "GET pipeA\n" +
      "GET pipeB\n" +
      "GET pipeC\n"
    );
  });
}

async function testFragmentation() {
  section("TCP FRAGMENTATION TEST");
  const socket = await createClient();
  await sendCommand(socket, "FLUSHALL");

  let responseReceived = false;

  const responsePromise = new Promise((resolve, reject) => {
    socket.on("data", (data) => {
      const response = data.toString().trim();
      if (response === "OK") {
        responseReceived = true;
        resolve();
      }
    });
    socket.on("error", reject);
  });

  // Send the first half of the command
  socket.write("SET frag");

  // Wait 200ms (Simulating network lag)
  await new Promise(resolve => setTimeout(resolve, 200));

  // Send the second half with the newline!
  socket.write("ment hello\n");

  await responsePromise;

  if (responseReceived) {
    pass("Command split across TCP packets handled correctly");
  } else {
    fail("Command split across TCP packets", "OK", "No Response");
  }

  socket.destroy();
}

async function testMultipleClients() {
  section("MULTI-CLIENT TEST");
  
  // Open 3 simultaneous connections
  const clientA = await createClient();
  const clientB = await createClient();
  const clientC = await createClient();

  let response;

  response = await sendCommand(clientA, "SET shared A");
  assertEqual("Client A writes", response, "OK");

  response = await sendCommand(clientB, "GET shared");
  assertEqual("Client B reads Client A's data", response, "A");

  response = await sendCommand(clientC, "SET shared C");
  assertEqual("Client C updates shared data", response, "OK");

  response = await sendCommand(clientA, "GET shared");
  assertEqual("Client A sees Client C's update", response, "C");

  clientA.destroy();
  clientB.destroy();
  clientC.destroy();
}

async function main() {
  try {
    await startServer();
    await testPipelining();
    await testFragmentation();
    await testMultipleClients();
    printFinalReport();
  } catch (error) {
    console.error("\n❌ TEST RUNNER ERROR:", error);
  } finally {
    await stopServer();
  }
}

main();