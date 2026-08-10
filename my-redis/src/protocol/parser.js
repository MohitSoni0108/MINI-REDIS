export function parseCommand(input) {
  const parts = input.trim().split(/\s+/);

  const command = parts[0]?.toUpperCase();
  const args = parts.slice(1);

  return {
    command,
    args
  };
}