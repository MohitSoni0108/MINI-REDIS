import net from "node:net";
import { parseCommand } from "../protocol/parser.js";
import { dispatchCommand } from "../commands/dispatcher.js";

const PORT = 6379;
const HOST = "127.0.0.1";

const server = net.createServer((socket) => {
  console.log("Client connected");

  socket.write("Welcome to MyRedis!\n");

  socket.on("data", (data) => {
    const input = data.toString().trim();

    if (!input) {
      return;
    }

    console.log("Received:", input);

    const commandData = parseCommand(input);

    console.log("Parsed command:", commandData);

    const result = dispatchCommand(commandData);

    socket.write(`${result.message}\n`);
  });

  socket.on("end", () => {
    console.log("Client disconnected");
  });

  socket.on("error", (error) => {
    console.error("Socket error:", error.message);
  });
});

server.on("error", (error) => {
  console.error("Server error:", error.message);
});

server.listen(PORT, HOST, () => {
  console.log(`MyRedis server running on ${HOST}:${PORT}`);
});