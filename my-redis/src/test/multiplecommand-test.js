import net from "node:net";

const socket = net.createConnection(
  {
    host: "127.0.0.1",
    port: 6379
  },
  () => {
    console.log("Connected");

    socket.write(
      "SET a 1\n" +
      "SET b 2\n" +
      "SET c 3\n" +
      "GET a\n" +
      "GET b\n" +
      "GET c\n"
    );
  }
);

socket.on("data", (data) => {
  console.log("SERVER:", data.toString());
});

socket.on("error", (error) => {
  console.error("ERROR:", error.message);
});