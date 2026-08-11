import net from "node:net";

import { parseCommand } from "../protocol/parser.js";
import { dispatchCommand } from "../commands/dispatcher.js";
import { loadSnapshot } from "../storage/persistence.js";


  process.on("uncaughtException", (error) => {
  console.error("UNCAUGHT EXCEPTION:", error);
});

process.on("unhandledRejection", (error) => {
  console.error("UNHANDLED REJECTION:", error);
});


const PORT = 6379;
const HOST = "127.0.0.1";

const server = net.createServer((socket) => {

  
  
  
  console.log("Client connected");

  socket.write("Welcome to MyRedis!\n");

  socket.on("data", async (data) => {
    try {
      const input = data.toString().trim();

      if (!input) {
        return;
      }

      console.log("Received:", input);

      const commandData = parseCommand(input);

      console.log("Parsed command:", commandData);

      const result = await dispatchCommand(commandData);

      socket.write(`${result.message}\n`);
    } catch (error) {
      console.error("Command error:", error);

      socket.write(`ERR ${error.message}\n`);
    }
  });

  socket.on("end", () => {
    console.log("Client disconnected");
  });

socket.on("close", (hadError) => {
  console.log("Socket closed. Had error:", hadError);
});

  socket.on("error", (error) => {
    console.error("Socket error:", error.message);
  });
});

server.on("error", (error) => {
  console.error("Server error:", error.message);
});

async function startServer() {
  try {
    await loadSnapshot();

    server.listen(PORT, HOST, () => {
      console.log(
        `MyRedis server running on ${HOST}:${PORT}`
      );
    });
  } catch (error) {
    console.error("Failed to start server:", error);
  }
}

startServer();