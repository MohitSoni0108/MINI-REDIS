import {
  startServer, stopServer, createClient, sendCommand,
  assertEqual, section, printFinalReport
} from "./test-utils.js";

async function testHashes() {
  section("HASH TESTS");
  const socket = await createClient();
// NEW: Clear the old database data before testing!
  await sendCommand(socket, "FLUSHALL");

  let response;

  response = await sendCommand(socket, "HSET user name Mohit");
  assertEqual("HSET single pair", response, "(integer) 1");

  response = await sendCommand(socket, "HGET user name");
  assertEqual("HGET", response, "Mohit");

  response = await sendCommand(socket, "HSET user age 22 city Delhi");
  assertEqual("HSET multiple pairs", response, "(integer) 2");

  response = await sendCommand(socket, "HGET user age");
  assertEqual("HGET age", response, "22");

  response = await sendCommand(socket, "HGET user city");
  assertEqual("HGET city", response, "Delhi");

  response = await sendCommand(socket, 'HSET profile bio "I am learning Redis"');
  assertEqual("HSET multi-word value", response, "(integer) 1");

  response = await sendCommand(socket, "HGET profile bio");
  assertEqual("HGET multi-word value", response, "I am learning Redis");

  response = await sendCommand(socket, "HEXISTS user name");
  assertEqual("HEXISTS existing field", response, "(integer) 1");

  response = await sendCommand(socket, "HEXISTS user missing");
  assertEqual("HEXISTS missing field", response, "(integer) 0");

  response = await sendCommand(socket, "HDEL user age");
  assertEqual("HDEL", response, "(integer) 1");

  response = await sendCommand(socket, "HEXISTS user age");
  assertEqual("HEXISTS after HDEL", response, "(integer) 0");

  socket.destroy();
}

async function main() {
  try {
    await startServer();
    await testHashes();
    printFinalReport();
  } catch (error) {
    console.error("\n❌ TEST RUNNER ERROR:", error);
  } finally {
    await stopServer();
  }
}

main();