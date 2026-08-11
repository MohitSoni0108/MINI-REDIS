import { database } from "../storage/database.js";
import { createString, isString } from "../storage/dataTypes/strings.js";
import { createList, isList } from "../storage/dataTypes/lists.js";
import { createHash, isHash } from "../storage/dataTypes/hashes.js";
import { saveSnapshot } from "../storage/persistence.js";


const MUTATING_COMMANDS = new Set([
  "SET",
  "DEL",
  "FLUSHALL",

  "LPUSH",
  "RPUSH",
  "LPOP",
  "RPOP",

  "HSET",
  "HDEL",

  "EXPIRE",
  "PERSIST"
]);




// export async function dispatchCommand(commandData) {
//   const { command, args } = commandData;

// if (MUTATING_COMMANDS.has(command)) {
//   await saveSnapshot();
// }
//   switch (command) {
//     case "SET":
//       return handleSet(args);

//     case "GET":
//       return handleGet(args);

//     case "DEL":
//       return handleDel(args);

//     case "EXISTS":
//       return handleExists(args);

//     case "KEYS":
//       return handleKeys(args);

//     case "FLUSHALL":
//       return handleFlushAll(args);


// case "LPUSH":
//   return handleLPush(args);

// case "RPUSH":
//   return handleRPush(args);

// case "LPOP":
//   return handleLPop(args);

// case "RPOP":
//   return handleRPop(args);

// case "LRANGE":
//   return handleLRange(args);


// case "HSET":
//   return handleHSet(args);

// case "HGET":
//   return handleHGet(args);

// case "HGETALL":
//   return handleHGetAll(args);

// case "HDEL":
//   return handleHDel(args);

// case "HEXISTS":
//   return handleHExists(args);


// case "EXPIRE":
//   return handleExpire(args);

// case "TTL":
//   return handleTTL(args);

// case "PERSIST":
//   return handlePersist(args);

//     default:
//       return {
//         success: false,
//         message: `Unknown command: ${command}`
//       };
//   }
// }

export async function dispatchCommand(commandData) {
  const { command, args } = commandData;
  
  let result; // 1. Create a variable to hold the handler's response

  // 2. Change "return" to "result =" and add "break;" so the function doesn't exit yet
  switch (command) {
    case "SET":
      result = handleSet(args);
      break;

    case "GET":
      result = handleGet(args);
      break;

    case "DEL":
      result = handleDel(args);
      break;

    case "EXISTS":
      result = handleExists(args);
      break;

    case "KEYS":
      result = handleKeys(args);
      break;

    case "FLUSHALL":
      result = handleFlushAll(args);
      break;

    case "LPUSH":
      result = handleLPush(args);
      break;

    case "RPUSH":
      result = handleRPush(args);
      break;

    case "LPOP":
      result = handleLPop(args);
      break;

    case "RPOP":
      result = handleRPop(args);
      break;

    case "LRANGE":
      result = handleLRange(args);
      break;

    case "HSET":
      result = handleHSet(args);
      break;

    case "HGET":
      result = handleHGet(args);
      break;

    case "HGETALL":
      result = handleHGetAll(args);
      break;

    case "HDEL":
      result = handleHDel(args);
      break;

    case "HEXISTS":
      result = handleHExists(args);
      break;

    case "EXPIRE":
      result = handleExpire(args);
      break;

    case "TTL":
      result = handleTTL(args);
      break;

    case "PERSIST":
      result = handlePersist(args);
      break;

    default:
      result = {
        success: false,
        message: `Unknown command: ${command}`
      };
      break;
  }

  // 3. Only save if it's a mutating command AND the command was successful
  if (MUTATING_COMMANDS.has(command) && result.success) {
    await saveSnapshot();
  }

  // 4. Finally, return the result back to the caller
  return result;
}


//string functions 

function handleSet(args) {
  const [key, value] = args;

  if (!key || value === undefined) {
    return {
      success: false,
      message: "ERR wrong number of arguments for SET"
    };
  }

  database.set(key, createString(value));

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

  const entry = database.get(key);

  if (!entry) {
    return {
      success: true,
      message: "(nil)"
    };
  }

  if (!isString(entry)) {
    return {
      success: false,
      message: "WRONGTYPE operation against a key holding the wrong kind of value"
    };
  }

  return {
    success: true,
    message: entry.value
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

//list functions
function handleLPush(args) {
  const [key, ...values] = args;

  if (!key || values.length === 0) {
    return {
      success: false,
      message: "ERR wrong number of arguments for LPUSH"
    };
  }

  let entry = database.get(key);

  if (!entry) {
    entry = createList();
    database.set(key, entry);
  }

  if (!isList(entry)) {
    return {
      success: false,
      message: "WRONGTYPE operation against a key holding the wrong kind of value"
    };
  }

  for (const value of values) {
    entry.value.unshift(value);
  }

  return {
    success: true,
    message: `(integer) ${entry.value.length}`
  };
}
function handleRPush(args) {
  const [key, ...values] = args;

  if (!key || values.length === 0) {
    return {
      success: false,
      message: "ERR wrong number of arguments for RPUSH"
    };
  }

  let entry = database.get(key);

  if (!entry) {
    entry = createList();
    database.set(key, entry);
  }

  if (!isList(entry)) {
    return {
      success: false,
      message: "WRONGTYPE operation against a key holding the wrong kind of value"
    };
  }

  for (const value of values) {
    entry.value.push(value);
  }

  return {
    success: true,
    message: `(integer) ${entry.value.length}`
  };
}
function handleLPop(args) {
  const [key] = args;

  if (!key) {
    return {
      success: false,
      message: "ERR wrong number of arguments for LPOP"
    };
  }

  const entry = database.get(key);

  if (!entry) {
    return {
      success: true,
      message: "(nil)"
    };
  }

  if (!isList(entry)) {
    return {
      success: false,
      message: "WRONGTYPE operation against a key holding the wrong kind of value"
    };
  }

  const value = entry.value.shift();

  if (entry.value.length === 0) {
    database.del(key);
  }

  return {
    success: true,
    message: value
  };
}
function handleRPop(args) {
  const [key] = args;

  if (!key) {
    return {
      success: false,
      message: "ERR wrong number of arguments for RPOP"
    };
  }

  const entry = database.get(key);

  if (!entry) {
    return {
      success: true,
      message: "(nil)"
    };
  }

  if (!isList(entry)) {
    return {
      success: false,
      message: "WRONGTYPE operation against a key holding the wrong kind of value"
    };
  }

  const value = entry.value.pop();

  if (entry.value.length === 0) {
    database.del(key);
  }

  return {
    success: true,
    message: value
  };
}
function handleLRange(args) {
  const [key, start, end] = args;

  if (!key || start === undefined || end === undefined) {
    return {
      success: false,
      message: "ERR wrong number of arguments for LRANGE"
    };
  }

  const entry = database.get(key);

  if (!entry) {
    return {
      success: true,
      message: "(empty list)"
    };
  }

  if (!isList(entry)) {
    return {
      success: false,
      message: "WRONGTYPE operation against a key holding the wrong kind of value"
    };
  }

  const startIndex = Number(start);
  const endIndex = Number(end);

  if (Number.isNaN(startIndex) || Number.isNaN(endIndex)) {
    return {
      success: false,
      message: "ERR invalid range"
    };
  }

  const result = entry.value.slice(
    startIndex,
    endIndex + 1
  );

  return {
    success: true,
    message: result.length > 0
      ? result.join("\n")
      : "(empty list)"
  };
}

//hash functions
function handleHSet(args) {
  const [key, field, value] = args;

  if (!key || !field || value === undefined) {
    return {
      success: false,
      message: "ERR wrong number of arguments for HSET"
    };
  }

  let entry = database.get(key);

  if (!entry) {
    entry = createHash();
    database.set(key, entry);
  }

  if (!isHash(entry)) {
    return {
      success: false,
      message: "WRONGTYPE operation against a key holding the wrong kind of value"
    };
  }

  const isNewField = !(field in entry.value);

  entry.value[field] = value;

  return {
    success: true,
    message: `(integer) ${isNewField ? 1 : 0}`
  };
}

function handleHGet(args) {
  const [key, field] = args;

  if (!key || !field) {
    return {
      success: false,
      message: "ERR wrong number of arguments for HGET"
    };
  }

  const entry = database.get(key);

  if (!entry) {
    return {
      success: true,
      message: "(nil)"
    };
  }

  if (!isHash(entry)) {
    return {
      success: false,
      message: "WRONGTYPE operation against a key holding the wrong kind of value"
    };
  }

  if (!(field in entry.value)) {
    return {
      success: true,
      message: "(nil)"
    };
  }

  return {
    success: true,
    message: entry.value[field]
  };
}
function handleHGetAll(args) {
  const [key] = args;

  if (!key) {
    return {
      success: false,
      message: "ERR wrong number of arguments for HGETALL"
    };
  }

  const entry = database.get(key);

  if (!entry) {
    return {
      success: true,
      message: "(empty hash)"
    };
  }

  if (!isHash(entry)) {
    return {
      success: false,
      message: "WRONGTYPE operation against a key holding the wrong kind of value"
    };
  }

  const result = [];

  for (const [field, value] of Object.entries(entry.value)) {
    result.push(field);
    result.push(value);
  }

  return {
    success: true,
    message: result.length > 0
      ? result.join("\n")
      : "(empty hash)"
  };
}
function handleHDel(args) {
  const [key, ...fields] = args;

  if (!key || fields.length === 0) {
    return {
      success: false,
      message: "ERR wrong number of arguments for HDEL"
    };
  }

  const entry = database.get(key);

  if (!entry) {
    return {
      success: true,
      message: "(integer) 0"
    };
  }

  if (!isHash(entry)) {
    return {
      success: false,
      message: "WRONGTYPE operation against a key holding the wrong kind of value"
    };
  }

  let deletedCount = 0;

  for (const field of fields) {
    if (field in entry.value) {
      delete entry.value[field];
      deletedCount++;
    }
  }

  if (Object.keys(entry.value).length === 0) {
    database.del(key);
  }

  return {
    success: true,
    message: `(integer) ${deletedCount}`
  };
}
function handleHExists(args) {
  const [key, field] = args;

  if (!key || !field) {
    return {
      success: false,
      message: "ERR wrong number of arguments for HEXISTS"
    };
  }

  const entry = database.get(key);

  if (!entry) {
    return {
      success: true,
      message: "(integer) 0"
    };
  }

  if (!isHash(entry)) {
    return {
      success: false,
      message: "WRONGTYPE operation against a key holding the wrong kind of value"
    };
  }

  return {
    success: true,
    message: `(integer) ${field in entry.value ? 1 : 0}`
  };
}

//expiration functions 
function handleExpire(args) {
  const [key, seconds] = args;

  if (!key || seconds === undefined) {
    return {
      success: false,
      message: "ERR wrong number of arguments for EXPIRE"
    };
  }

  const duration = Number(seconds);

  if (!Number.isInteger(duration) || duration < 0) {
    return {
      success: false,
      message: "ERR invalid expire time"
    };
  }

  const success = database.expire(key, duration);

  return {
    success: true,
    message: success ? "(integer) 1" : "(integer) 0"
  };
}

function handleTTL(args) {
  const [key] = args;

  if (!key) {
    return {
      success: false,
      message: "ERR wrong number of arguments for TTL"
    };
  }

  const ttl = database.ttl(key);

  return {
    success: true,
    message: `(integer) ${ttl}`
  };
}

function handlePersist(args) {
  const [key] = args;

  if (!key) {
    return {
      success: false,
      message: "ERR wrong number of arguments for PERSIST"
    };
  }

  const success = database.persist(key);

  return {
    success: true,
    message: success ? "(integer) 1" : "(integer) 0"
  };
}