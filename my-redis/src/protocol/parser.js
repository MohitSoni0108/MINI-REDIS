export function parseCommand(input) {
  const trimmedInput = input.trim();

  if (!trimmedInput) {
    return {
      command: "",
      args: []
    };
  }

  const tokens = [];
  let current = "";
  let inQuotes = false;
  let quoteCharacter = null;

  for (let i = 0; i < trimmedInput.length; i++) {
    const char = trimmedInput[i];

    // Start or end quoted value
    if (char === '"' || char === "'") {
      if (!inQuotes) {
        inQuotes = true;
        quoteCharacter = char;
        continue;
      }

      if (char === quoteCharacter) {
        inQuotes = false;
        quoteCharacter = null;
        continue;
      }
    }

    // Whitespace separates tokens only outside quotes
    if (/\s/.test(char) && !inQuotes) {
      if (current.length > 0) {
        tokens.push(current);
        current = "";
      }

      continue;
    }

    current += char;
  }

  // Unclosed quote
  if (inQuotes) {
    throw new Error("unterminated quote");
  }

  if (current.length > 0) {
    tokens.push(current);
  }

  const command = tokens[0]?.toUpperCase() ?? "";

  return {
    command,
    args: tokens.slice(1)
  };
}