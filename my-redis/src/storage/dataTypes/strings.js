export function createString(value) {
  return {
    type: "string",
    value
  };
}

export function isString(entry) {
  return entry?.type === "string";
}