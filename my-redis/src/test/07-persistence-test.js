/**
 * =====================================================================
 * TEST SUITE: DISK PERSISTENCE & RECOVERY
 * =====================================================================
 * This suite proves the database can safely serialize state to the disk 
 * (dump.json) and accurately reconstruct the memory map upon reboot.
 * 1. Data Survival: Tests Strings, Lists, and Hashes to ensure complex 
 *    objects aren't corrupted during JSON serialization.
 * 2. Expiry Survival: Ensures that TTL timestamps are accurately saved 
 *    and remain valid even if the server is offline during the countdown.
 * =====================================================================
 */

import {
  startServer, stopServer, createClient, sendCommand,
  assertEqual, assertContains, assertNumberRange, section, printFinalReport
} from "./test-utils.js";

async function testPersistence() {
  section("PERSISTENCE TEST");
  const socket = await createClient();
  await sendCommand(socket, "FLUSHALL");

  // Write complex data types
  await sendCommand(socket, 'SET persistentString "hello world"');
  await sendCommand(socket, "RPUSH persistentList one two three");
  await sendCommand(socket, 'HSET persistentHash name Mohit bio "learning Redis"');
  
  socket.destroy();

  // COMPLETELY KILL THE SERVER
  await stopServer();
  
  // RESTART THE SERVER
  await startServer();

  const restoredClient = await createClient();
  let response;

  response = await sendCommand(restoredClient, "GET persistentString");
  assertEqual("String survives restart", response, "hello world");

  response = await sendCommand(restoredClient, "LRANGE persistentList 0 -1");
  assertContains("List survives restart", response, "one"); 

  response = await sendCommand(restoredClient, "HGET persistentHash bio");
  assertEqual("Multi-word hash value survives restart", response, "learning Redis");

  restoredClient.destroy();
}

async function testTTLPersistence() {
  section("TTL PERSISTENCE TEST");
  const socket = await createClient();
  await sendCommand(socket, "FLUSHALL");

  await sendCommand(socket, 'SET persistentTTL "temporary data"');
  await sendCommand(socket, "EXPIRE persistentTTL 30"); // 30 seconds

  socket.destroy();

  // KILL AND RESTART
  await stopServer();
  await startServer();

  const restoredClient = await createClient();
  let response;

  response = await sendCommand(restoredClient, "TTL persistentTTL");
  
  // CLEANUP FIX: Remove "(integer) " so the math checker doesn't fail
  const rawNumber = response.replace("(integer) ", "").trim();
  assertNumberRange("TTL continues ticking across restarts", rawNumber, 1, 30);

  response = await sendCommand(restoredClient, "GET persistentTTL");
  assertEqual("TTL value is still accessible", response, "temporary data");

  restoredClient.destroy();
}

async function main() {
  try {
    await startServer(); 
    await testPersistence();
    await testTTLPersistence();
    printFinalReport();
  } catch (error) {
    console.error("\n❌ TEST RUNNER ERROR:", error);
  } finally {
    // Ensures the server is always killed at the end
    await stopServer(); 
  }
}

main();