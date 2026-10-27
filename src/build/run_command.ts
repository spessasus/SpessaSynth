import path from "node:path";
import url from "node:url";
import child_process from "node:child_process";

const dirname = path.resolve(
    path.dirname(url.fileURLToPath(import.meta.url)),
    "../.."
);

// Npm 12 things
const childEnv = { ...process.env };
for (const key of Object.keys(childEnv)) {
    if (key.toLowerCase() === "npm_config_allow_scripts") {
        delete childEnv[key];
    }
}

export function runCommandSync(command: string, cwd?: string) {
    console.info(command);
    const [cmd, ...args] = command.split(" ");
    const proc = child_process.spawnSync(cmd, args, {
        stdio: "inherit",
        cwd: cwd ?? dirname,
        shell: process.platform === "win32",
        env: childEnv
    });

    if (proc.status !== 0) {
        console.error(`${command} exited with code ${proc.status}`);
        // eslint-disable-next-line unicorn/no-process-exit
        process.exit(proc.status);
    }
}
