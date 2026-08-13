export function parseCommand(input) {
  const trimmedInput = input.trim();

  if (!trimmedInput) {
    return {
      command: "",
      args: []
    };
  }

  const parts = trimmedInput.split(/\s+/);

  const command = parts[0].toUpperCase();

  if (command === "SET") {
    if (parts.length < 3) {
      return {
        command,
        args: parts.slice(1)
      };
    }

    const key = parts[1];

    const value = parts
      .slice(2)
      .join(" ");

    return {
      command,
      args: [key, value]
    };
  }

  return {
    command,
    args: parts.slice(1)
  };
}