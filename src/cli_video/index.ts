import child_process from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";

try {
    const cliPath = path.resolve(import.meta.dirname, "cli.ts");
    if (existsSync(cliPath)) {
        const result = child_process.spawnSync(
            "npx",
            ["tsx", cliPath, ...process.argv.slice(2)],
            { stdio: "inherit" }
        );
        if (result.error) {
            console.error(result.error);
            process.exitCode = 1;
        } else {
            process.exitCode = result.status ?? 1;
        }
    } else {
        console.error(
            "CLI video renderer is git ignored. Please do not use it."
        );
        process.exitCode = 1;
    }
} catch {
    console.error("CLI video renderer is git ignored. Please do not use it.");
    process.exitCode = 1;
}
