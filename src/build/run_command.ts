import path from "node:path";
import url from "node:url";
import child_process from "node:child_process";

const dirname = path.resolve(
    path.dirname(url.fileURLToPath(import.meta.url)),
    "../.."
);

export function runCommandSync(command: string, cwd?: string) {
    const [cmd, ...args] = command.split(" ");
    const proc = child_process.spawnSync(cmd, args, {
        stdio: "inherit",
        cwd: cwd ?? dirname,
        shell: process.platform === "win32"
    });

    if (proc.status !== 0) {
        console.error(`Process exited with code code ${proc.status}`);
        // eslint-disable-next-line unicorn/no-process-exit
        process.exit(proc.status);
    }
}
