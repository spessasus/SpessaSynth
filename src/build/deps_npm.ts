import { runCommandSync } from "./run_command.ts";

console.info(
    "📦  Registry dependencies: switching spessasynth_core and spessasynth_lib to the npm versions, then building SpessaSynth."
);

runCommandSync("npm uninstall spessasynth_lib spessasynth_core");
runCommandSync("npm install spessasynth_lib spessasynth_core");
runCommandSync("npm pkg set dependencies.spessasynth_lib=latest");
runCommandSync("npm pkg set dependencies.spessasynth_core=latest");
runCommandSync("npm install");
runCommandSync("npm run build");

console.info(
    "✅  SpessaSynth built against the npm versions of spessasynth_core and spessasynth_lib."
);
