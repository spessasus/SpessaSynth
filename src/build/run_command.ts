import * as child_process from "node:child_process";
import url from "node:url";
import path from "node:path";

// Resolve to root
const dirname = path.join(
    path.dirname(url.fileURLToPath(import.meta.url)),
    ".."
);

export function runCommandSync(command: string) {
    const [cmd, ...args] = command.split(" ");
    const proc = child_process.spawnSync(cmd, args, {
        stdio: "inherit",
        cwd: dirname
    });

    if (proc.error) {
        console.error(`Error executing command: ${command}`, proc.error);
        process.exit(proc.status);
    }
}
