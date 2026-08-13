/**
 * =====================================================================
 * TEST SUITE: DATA TYPE SAFETY & MULTI-KEY COMMANDS
 * =====================================================================
 * This test suite validates two core architectural features:
 * 1. WRONGTYPE Protections: Ensures that operations meant for one data 
 *    type cannot accidentally corrupt a key holding a different data type 
 *    (e.g., preventing LPUSH on a String).
 * 2. Variadic Commands: Verifies that DEL and EXISTS correctly process 
 *    multiple arguments simultaneously and return accurate counts.
 * =====================================================================
 */

import {
  startServer, stopServer, createClient, sendCommand,
  assertEqual, assertContains, section, printFinalReport
} from "./test-utils.js";

async function testWrongType() {
  section("WRONGTYPE TESTS");
  const socket = await createClient();
  await sendCommand(socket, "FLUSHALL");

  let response;

  // 1. String Type Protection
  await sendCommand(socket, "SET stringKey hello");
  response = await sendCommand(socket, "LPUSH stringKey value");
  assertContains("String used as List", response, "WRONGTYPE");
  
  response = await sendCommand(socket, "HSET stringKey field value");
  assertContains("String used as Hash", response, "WRONGTYPE");

  // 2. List Type Protection
  await sendCommand(socket, "LPUSH listKey hello");
  response = await sendCommand(socket, "GET listKey");
  assertContains("List used as String", response, "WRONGTYPE");

  response = await sendCommand(socket, "HSET listKey field value");
  assertContains("List used as Hash", response, "WRONGTYPE");

  // 3. Hash Type Protection
  await sendCommand(socket, "HSET hashKey field value");
  response = await sendCommand(socket, "GET hashKey");
  assertContains("Hash used as String", response, "WRONGTYPE");

  response = await sendCommand(socket, "LPUSH hashKey hello");
  assertContains("Hash used as List", response, "WRONGTYPE");

  socket.destroy();
}

async function testMultiKeyCommands() {
  section("MULTI-KEY TESTS");
  const socket = await createClient();
  await sendCommand(socket, "FLUSHALL");

  let response;

  await sendCommand(socket, "SET key1 one");
  await sendCommand(socket, "SET key2 two");
  await sendCommand(socket, "SET key3 three");
  await sendCommand(socket, "SET key4 four");

  response = await sendCommand(socket, "DEL key1 key2 key3");
  assertEqual("DEL multiple keys", response, "(integer) 3");

  response = await sendCommand(socket, "EXISTS key1 key2 key3 key4");
  assertEqual("EXISTS multiple keys", response, "(integer) 1"); // Only key4 remains

  response = await sendCommand(socket, "DEL key4 missingKey");
  assertEqual("DEL existing + missing keys", response, "(integer) 1");

  socket.destroy();
}

async function main() {
  try {
    await startServer();
    await testWrongType();
    await testMultiKeyCommands();
    printFinalReport();
  } catch (error) {
    console.error("\n❌ TEST RUNNER ERROR:", error);
  } finally {
    await stopServer();
  }
}

main();