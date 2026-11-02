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

interface RunOptions {
    cwd?: string;
    /**
     * Added on top of the current environment.
     */
    env?: Record<string, string>;
    /**
     * Return stdout instead of showing it.
     */
    capture?: boolean;
    /**
     * Defaults to true on Windows, where npm and npx are .cmd files.
     * Turn it off for real programs whose arguments contain spaces.
     */
    shell?: boolean;
}

export function runSync(cmd: string, args: string[], options: RunOptions = {}) {
    console.info([cmd, ...args].join(" "));
    const proc = child_process.spawnSync(cmd, args, {
        stdio: options.capture ? ["inherit", "pipe", "inherit"] : "inherit",
        cwd: options.cwd ?? dirname,
        shell: options.shell ?? process.platform === "win32",
        env: { ...childEnv, ...options.env },
        encoding: "utf8"
    });

    if (proc.status !== 0) {
        console.error(`${cmd} exited with code ${proc.status}`);
        // eslint-disable-next-line unicorn/no-process-exit
        process.exit(proc.status ?? 1);
    }
    return proc.stdout ?? "";
}

export function runCommandSync(command: string, cwd?: string) {
    const [cmd, ...args] = command.split(" ");
    runSync(cmd, args, { cwd });
}
