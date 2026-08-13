/**
 * =====================================================================
 * TEST SUITE: KEY EXPIRATION (TTL) & PERSISTENCE
 * =====================================================================
 * This test suite verifies the database's time-to-live mechanism:
 * 1. EXPIRE: Ensures keys are marked with accurate expiry timestamps.
 * 2. TTL: Validates that remaining time is tracked correctly, returning 
 *    -1 for permanent keys and -2 for non-existent/expired keys.
 * 3. EXPIRED KEY EVICTION: Confirms that once a TTL hits zero, the key 
 *    is fully unreadable by GET and EXISTS commands.
 * 4. PERSIST: Checks the ability to remove a TTL and make a key permanent.
 * =====================================================================
 */

import {
  startServer, stopServer, createClient, sendCommand,
  assertEqual, section, printFinalReport
} from "./test-utils.js";

async function testExpiration() {
  section("EXPIRATION TESTS");
  const socket = await createClient();
  await sendCommand(socket, "FLUSHALL");

  let response;

  await sendCommand(socket, 'SET temporary "hello world"');
  response = await sendCommand(socket, "EXPIRE temporary 2");
  assertEqual("EXPIRE successful", response, "(integer) 1");

  response = await sendCommand(socket, "GET temporary");
  assertEqual("GET before expiration works", response, "hello world");

  // Wait for 2.5 seconds to let the key expire
  await new Promise((resolve) => setTimeout(resolve, 2500));

  response = await sendCommand(socket, "GET temporary");
  assertEqual("GET after expiration returns (nil)", response, "(nil)");

  response = await sendCommand(socket, "EXISTS temporary");
  assertEqual("EXISTS after expiration returns 0", response, "(integer) 0");

  response = await sendCommand(socket, "TTL temporary");
  assertEqual("TTL missing/expired key returns -2", response, "(integer) -2");

  socket.destroy();
}

async function testPersist() {
  section("PERSIST TESTS");
  const socket = await createClient();
  await sendCommand(socket, "FLUSHALL");

  let response;

  await sendCommand(socket, "SET permanent hello");
  await sendCommand(socket, "EXPIRE permanent 30");

  response = await sendCommand(socket, "PERSIST permanent");
  assertEqual("PERSIST successful", response, "(integer) 1");

  response = await sendCommand(socket, "TTL permanent");
  assertEqual("TTL after PERSIST returns -1", response, "(integer) -1");

  socket.destroy();
}

async function main() {
  try {
    await startServer();
    await testExpiration();
    await testPersist();
    printFinalReport();
  } catch (error) {
    console.error("\n❌ TEST RUNNER ERROR:", error);
  } finally {
    await stopServer();
  }
}

main();