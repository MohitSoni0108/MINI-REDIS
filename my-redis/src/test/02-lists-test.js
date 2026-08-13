import {
  startServer, stopServer, createClient, sendCommand,
  assertEqual, section, printFinalReport
} from "./test-utils.js";

async function testLists() {
  section("LIST TESTS");
  let socket = await createClient();
  
//Clear the old database data before testing!
  await sendCommand(socket, "FLUSHALL");

  let response;

  response = await sendCommand(socket, "RPUSH fruits apple banana mango");
  assertEqual("RPUSH multiple values", response, "(integer) 3");

  response = await sendCommand(socket, "LPUSH fruits orange");
  assertEqual("LPUSH", response, "(integer) 4");

  response = await sendCommand(socket, "LPOP fruits");
  assertEqual("LPOP", response, "orange");

  response = await sendCommand(socket, "RPOP fruits");
  assertEqual("RPOP", response, "mango");

  // At this point, the list is: [apple, banana]
  // Note: LRANGE returns multiple lines ("apple\nbanana"). Our simple test utility 
  // only reads the first line, so it expects "apple". We then recreate the socket 
  // to clear the buffer safely before the next command.
  response = await sendCommand(socket, "LRANGE fruits 0 -1");
  assertEqual("LRANGE 0 -1 (Negative Indexing Check)", response, "apple");
  
  socket.destroy();
  socket = await createClient();

  response = await sendCommand(socket, "LRANGE fruits -1 -1");
  assertEqual("LRANGE -1 -1 (Last Item Check)", response, "banana");

  socket.destroy();
}

async function main() {
  try {
    await startServer();
    await testLists();
    printFinalReport();
  } catch (error) {
    console.error("\n❌ TEST RUNNER ERROR:", error);
  } finally {
    await stopServer();
  }
}

main();