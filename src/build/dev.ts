import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { runCommandSync } from "./run_command.ts";

const REPO_ROOT = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "../.."
);

const CORE_DIR = path.resolve(REPO_ROOT, "..", "spessasynth_core");
const LIB_DIR = path.resolve(REPO_ROOT, "..", "spessasynth_lib");

async function directoryExists(dir: string) {
    try {
        await fs.access(dir);
        return true;
    } catch {
        return false;
    }
}

console.info(
    "🪲  Enabling debug mode, installing dependencies from the local machine."
);

await fs.access(REPO_ROOT);

if (await directoryExists(CORE_DIR)) {
    runCommandSync("npm run build:fast", CORE_DIR);
} else {
    console.warn(
        "spessasynth_core not found next to SpessaSynth.\nPlease ensure the directory exists."
    );
}

if (await directoryExists(LIB_DIR)) {
    runCommandSync("npm  uninstall spessasynth_lib spessasynth_core");
    runCommandSync("npm install ../spessasynth_lib ../spessasynth_core");
    runCommandSync("npm uninstall spessasynth_core", LIB_DIR);
    runCommandSync("npm install ../spessasynth_core", LIB_DIR);
    runCommandSync("npm run build:fast", LIB_DIR);
} else {
    console.warn(
        "spessasynth_lib not found next to SpessaSynth.\nPlease ensure the directory exists."
    );
}

runCommandSync("npm run build:fast");
console.info(
    "✅  SpessaSynth dev build completed using the local library setup."
);
