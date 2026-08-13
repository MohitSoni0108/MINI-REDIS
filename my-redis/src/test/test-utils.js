import net from "node:net";
import { spawn } from "node:child_process";

const HOST = "127.0.0.1";
const PORT = 6379;
export const results = [];
let serverProcess = null;

export function pass(name) {
  results.push({ name, passed: true });
  console.log(`  ✓ ${name}`);
}

export function fail(name, expected, actual) {
  results.push({ name, passed: false, expected, actual });
  console.log(`  ✗ ${name}`);
  console.log(`    Expected: ${expected}`);
  console.log(`    Received: ${actual}`);
}

export function createClient() {
  return new Promise((resolve, reject) => {
    const socket = net.createConnection({ host: HOST, port: PORT });
    socket.on("error", reject);

    // Consume the "Welcome to MyRedis!\n" message first
    const onWelcome = (data) => {
      // Once we receive the welcome message, we remove this listener
      socket.off("data", onWelcome); 
      // Now the socket is ready for the actual tests!
      resolve(socket); 
    };

    socket.on("data", onWelcome);
  });
}

export async function sendCommand(socket, command) {
  return new Promise((resolve) => {
    let buffer = "";
    const onData = (data) => {
      buffer += data.toString();
      const newlineIndex = buffer.indexOf("\n");
      if (newlineIndex === -1) return;
      const response = buffer.slice(0, newlineIndex).trim();
      socket.off("data", onData);
      resolve(response);
    };
    socket.on("data", onData);
    socket.write(`${command}\n`);
  });
}

export function waitForServer(timeout = 10000) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const tryConnect = () => {
      const socket = net.createConnection({ host: HOST, port: PORT }, () => {
        socket.destroy();
        resolve();
      });
      socket.on("error", () => {
        socket.destroy();
        if (Date.now() - start >= timeout) {
          reject(new Error("Timed out waiting for MyRedis server"));
          return;
        }
        setTimeout(tryConnect, 200);
      });
    };
    tryConnect();
  });
}

export async function startServer() {
  console.log("\nStarting MyRedis server...\n");
  serverProcess = spawn(process.execPath, ["src/server/server.js"], {
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true
  });
  await waitForServer();
  console.log("Server is ready.\n");
}

export async function stopServer() {
  if (!serverProcess) return;
  return new Promise((resolve) => {
    serverProcess.once("exit", () => {
      serverProcess = null;
      resolve();
    });
    serverProcess.kill();
    setTimeout(() => {
      if (serverProcess) {
        serverProcess = null;
        resolve();
      }
    }, 2000);
  });
}

export function assertEqual(name, actual, expected) {
  if (actual === expected) pass(name);
  else fail(name, expected, actual);
}

export function assertContains(name, actual, expected) {
  if (actual.includes(expected)) pass(name);
  else fail(name, `contains "${expected}"`, actual);
}

export function assertNumberRange(name, actual, min, max) {
  const number = Number(actual);
  if (Number.isFinite(number) && number >= min && number <= max) pass(name);
  else fail(name, `number between ${min} and ${max}`, actual);
}

export function section(title) {
  console.log(`\n${"=".repeat(60)}`);
  console.log(title);
  console.log("=".repeat(60));
}

export function printFinalReport() {
  console.log("\n" + "=".repeat(60));
  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;
  console.log(`TOTAL  : ${results.length}\nPASSED : ${passed}\nFAILED : ${failed}`);
  if (failed === 0) console.log("\n🎉 ALL TESTS IN THIS SUITE PASSED\n");
  else console.log("\n❌ SOME TESTS FAILED\n");
  console.log("=".repeat(60) + "\n");
}