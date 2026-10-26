import { runCommandSync } from "./run_command.ts";

console.info(
    "⚠️  Release mode: switching SpessaSynth back to published package versions."
);

runCommandSync("npm uninstall spessasynth_lib spessasynth_core");
runCommandSync("npm install spessasynth_lib spessasynth_core");
runCommandSync("npm pkg set dependencies.spessasynth_lib=latest");
runCommandSync("npm pkg set dependencies.spessasynth_core=latest");
runCommandSync("npm install");
runCommandSync("npm run build");

console.info(
    "✅  SpessaSynth release build completed using registry package versions."
);
