import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { database } from "./database.js";

const DATA_DIRECTORY = path.join(process.cwd(), "data");
const SNAPSHOT_FILE = path.join(DATA_DIRECTORY, "dump.json");

//DATA_DIRECTORY -> DATA FOLDER 
//SNAPSHOT_FILE -> DUMP.JSON FILE IN DATA FOLDER

export async function saveSnapshot() {
  await mkdir(DATA_DIRECTORY, {
    recursive: true
  });

  const snapshot = database.exportData();

  await writeFile(
    SNAPSHOT_FILE,
    JSON.stringify(snapshot, null, 2),
    "utf-8"
  );
}

export async function loadSnapshot() {
  try {
    const data = await readFile(
      SNAPSHOT_FILE,
      "utf-8"
    );

    const snapshot = JSON.parse(data);

    database.importData(snapshot);

    console.log("Snapshot loaded successfully.");
  } catch (error) {
    if (error.code === "ENOENT") {
      console.log("No snapshot found. Starting with empty database.");
      return;
    }

    console.error("Failed to load snapshot:", error.message);
  }
}