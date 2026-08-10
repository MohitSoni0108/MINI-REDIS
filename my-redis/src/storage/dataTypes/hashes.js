export function createHash() {
  return {
    type: "hash",
    value: {}
  };
}

export function isHash(entry) {
  return entry?.type === "hash";
}