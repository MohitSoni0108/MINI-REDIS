export function createList() {
  return {
    type: "list",
    value: []
  };
}

export function isList(entry) {
  return entry?.type === "list";
}