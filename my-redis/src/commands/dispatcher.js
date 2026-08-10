import { database } from "../storage/database.js";

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
  const [key, value] = args;

  if (!key || value === undefined) {
    return {
      success: false,
      message: "ERR wrong number of arguments for SET"
    };
  }

  database.set(key, value);

  return {
    success: true,
    message: "OK"
  };
}

function handleGet(args) {
  const [key] = args;

  if (!key) {
    return {
      success: false,
      message: "ERR wrong number of arguments for GET"
    };
  }

  const value = database.get(key);

  if (value === undefined) {
    return {
      success: true,
      message: "(nil)"
    };
  }

  return {
    success: true,
    message: value
  };
}

function handleDel(args) {
  if (args.length === 0) {
    return {
      success: false,
      message: "ERR wrong number of arguments for DEL"
    };
  }

  let deletedCount = 0;

  for (const key of args) {
    if (database.del(key)) {
      deletedCount++;
    }
  }

  return {
    success: true,
    message: `(integer) ${deletedCount}`
  };
}

function handleExists(args) {
  if (args.length === 0) {
    return {
      success: false,
      message: "ERR wrong number of arguments for EXISTS"
    };
  }

  let existingCount = 0;

  for (const key of args) {
    if (database.exists(key)) {
      existingCount++;
    }
  }

  return {
    success: true,
    message: `(integer) ${existingCount}`
  };
}

function handleKeys(args) {
  if (args.length > 0) {
    return {
      success: false,
      message: "ERR KEYS currently takes no arguments"
    };
  }

  const keys = database.keys();

  if (keys.length === 0) {
    return {
      success: true,
      message: "(empty list)"
    };
  }

  return {
    success: true,
    message: keys.join("\n")
  };
}

function handleFlushAll(args) {
  if (args.length > 0) {
    return {
      success: false,
      message: "ERR FLUSHALL takes no arguments"
    };
  }

  database.flushAll();

  return {
    success: true,
    message: "OK"
  };
}