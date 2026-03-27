import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Don't use import.meta.dirname: https://github.com/spessasus/SpessaSynth
const currentDir = path.dirname(fileURLToPath(import.meta.url));
// Allow running the .ts files in src/ directly
const isDev = currentDir.includes("/src");

export const rootDir = isDev
    ? path.join(currentDir, "../..")
    : path.join(currentDir, "../");
export const soundfontsPath = path.join(rootDir, "soundfonts");
export const packageJSON = path.join(rootDir, "package.json");
export const rootFile = path.join(
    rootDir,
    "local-dev/local_edition_index.html"
);

export function getCurrentVersion() {
    const text = fs.readFileSync(packageJSON, "utf-8");
    return (JSON.parse(text) as { version: string })?.version || "4.2.0";
}

export function isVersionNewer(newerThan: string, olderThan: string) {
    const pa = newerThan.split(".").map(Number);
    const pb = olderThan.split(".").map(Number);

    for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
        const na = pa[i] ?? 0;
        const nb = pb[i] ?? 0;

        if (na > nb) {
            return true;
        } else if (na < nb) {
            return false;
        }
    }
    return false;
}

export function isSoundBank(name: string): boolean {
    const fName = name.toLowerCase();
    return (
        fName.endsWith("sf2") ||
        fName.endsWith("sf3") ||
        fName.endsWith("sfogg") ||
        fName.endsWith("dls")
    );
}
