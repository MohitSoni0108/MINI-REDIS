import net from "node:net";
import readline from "node:readline";

const PORT = 6379;
const HOST = "127.0.0.1";

const socket = net.createConnection(
  {
    host: HOST,
    port: PORT
  },
  () => {
    console.log("Connected to MyRedis server");
    process.stdout.write("myredis> ");
  }
);

socket.on("data", (data) => {
  process.stdout.write(data.toString());

  process.stdout.write("myredis> ");
});

socket.on("end", () => {
  console.log("\nDisconnected from server");
  process.exit(0);
});

socket.on("error", (error) => {
  console.error("Connection error:", error.message);
  process.exit(1);
});

const terminal = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

terminal.on("line", (input) => {
  const command = input.trim();

  if (command.length === 0) {
    process.stdout.write("myredis> ");
    return;
  }

  socket.write(`${command}\n`);
});