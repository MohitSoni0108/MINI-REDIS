import {
  startServer, stopServer, createClient, sendCommand,
  assertEqual, section, printFinalReport
} from "./test-utils.js";

async function testStrings() {
  section("STRING TESTS");
  const socket = await createClient();
  let response;

  response = await sendCommand(socket, "SET name Mohit");
  assertEqual("SET basic", response, "OK");

  response = await sendCommand(socket, "GET name");
  assertEqual("GET basic", response, "Mohit");

  response = await sendCommand(socket, "SET name Rahul");
  assertEqual("SET overwrite", response, "OK");

  response = await sendCommand(socket, "GET name");
  assertEqual("GET overwritten value", response, "Rahul");

  response = await sendCommand(socket, "GET missingKey");
  assertEqual("GET missing key", response, "(nil)");

  socket.destroy();
}

async function testMultiWordValues() {
  section("MULTI-WORD VALUE TESTS");
  const socket = await createClient();
  let response;

  response = await sendCommand(socket, 'SET greeting "hello world"');
  assertEqual("SET quoted multi-word value", response, "OK");

  response = await sendCommand(socket, "GET greeting");
  assertEqual("GET quoted multi-word value", response, "hello world");

  response = await sendCommand(socket, 'SET message "I am building Mini Redis"');
  assertEqual("SET long multi-word value", response, "OK");

  response = await sendCommand(socket, "GET message");
  assertEqual("GET long multi-word value", response, "I am building Mini Redis");

  socket.destroy();
}

async function main() {
  try {
    await startServer();
    await testStrings();
    await testMultiWordValues();
    printFinalReport();
  } catch (error) {
    console.error("\n❌ TEST RUNNER ERROR:", error);
  } finally {
    await stopServer();
  }
}

main();