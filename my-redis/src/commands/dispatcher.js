export function dispatchCommand(commandData) {
  const { command, args } = commandData;

  switch (command) {
    case "SET":
      return handleSet(args);

    case "GET":
      return handleGet(args);

    case "DEL":
      return handleDel(args);

    case "EXISTS":
      return handleExists(args);

    case "KEYS":
      return handleKeys(args);

    case "FLUSHALL":
      return handleFlushAll(args);

    default:
      return {
        success: false,
        message: `Unknown command: ${command}`
      };
  }
}

function handleSet(args) {
  return {
    success: true,
    message: `SET command received with arguments: ${args.join(", ")}`
  };
}

function handleGet(args) {
  return {
    success: true,
    message: `GET command received with arguments: ${args.join(", ")}`
  };
}

function handleDel(args) {
  return {
    success: true,
    message: `DEL command received with arguments: ${args.join(", ")}`
  };
}

function handleExists(args) {
  return {
    success: true,
    message: `EXISTS command received with arguments: ${args.join(", ")}`
  };
}

function handleKeys(args) {
  return {
    success: true,
    message: `KEYS command received with arguments: ${args.join(", ")}`
  };
}

function handleFlushAll(args) {
  return {
    success: true,
    message: `FLUSHALL command received`
  };
}