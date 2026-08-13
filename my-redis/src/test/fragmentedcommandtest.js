import net from "node:net";

const socket = net.createConnection(
  {
    host: "127.0.0.1",
    port: 6379
  },
  () => {
    console.log("Connected");

    socket.write("SET part");

    setTimeout(() => {
      socket.write("ial value1\n");
    }, 200);
  }
);

socket.on("data", (data) => {
  console.log("SERVER:", data.toString());
});

socket.on("error", (error) => {
  console.error("ERROR:", error.message);
});