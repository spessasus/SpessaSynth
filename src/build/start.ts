import path from "node:path";
import fs from "node:fs/promises";
import { buildSpessaSynth } from "./build_script.js";

const REPO_ROOT = path.resolve(import.meta.dirname, "../..");
const SERVER_FILE = path.resolve(REPO_ROOT, "server/server.js");
console.info("‍🖥️  Dev mode enabled!");

async function fileExists(path: string) {
    try {
        await fs.access(path, fs.constants.F_OK);
        return true;
    } catch {
        return false;
    }
}

if (!(await fileExists(SERVER_FILE))) {
    console.info("Server doesn't exist. Rebuilding...");
    await buildSpessaSynth();
}

console.info("🖥️ Starting server...");
// Execute!
await import(SERVER_FILE);
