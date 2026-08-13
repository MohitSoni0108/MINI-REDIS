import net from "node:net";

import { parseCommand } from "../protocol/parser.js";
import { dispatchCommand } from "../commands/dispatcher.js";
import { loadSnapshot } from "../storage/persistence.js";

const PORT = 6379;
const HOST = "127.0.0.1";

const server = net.createServer((socket) => {
  console.log("Client connected");

  socket.write("Welcome to MyRedis!\n");

  let buffer = "";

  // Ensures commands from one client execute in order.
  let commandQueue = Promise.resolve();

  socket.on("data", (data) => {
    buffer += data.toString();

    let newlineIndex;

    while ((newlineIndex = buffer.indexOf("\n")) !== -1) {
      const line = buffer.slice(0, newlineIndex).trim();

      buffer = buffer.slice(newlineIndex + 1);

      if (!line) {
        continue;
      }

      commandQueue = commandQueue
        .then(async () => {
          try {
            console.log("Received:", line);

            const commandData = parseCommand(line);

            console.log("Parsed command:", commandData);

            const result = await dispatchCommand(commandData);

            socket.write(`${result.message}\n`);
          } catch (error) {
            console.error("Command error:", error);

            socket.write(`ERR ${error.message}\n`);
          }
        })
        .catch((error) => {
          console.error("Command queue error:", error);
        });
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