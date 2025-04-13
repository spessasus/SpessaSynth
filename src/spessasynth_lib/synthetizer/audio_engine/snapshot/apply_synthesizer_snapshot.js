import { SpessaSynthInfo } from "../../../utils/loggin.js";
import { consoleColors } from "../../../utils/other.js";
import { SynthesizerSnapshot } from "./synthesizer_snapshot.js";

/**
 * Applies the snapshot to the synth
 * @param snapshot {SynthesizerSnapshot}
 * @this {SpessaSynthProcessor}
 */
export function applySynthesizerSnapshot(snapshot)
{
    SynthesizerSnapshot.applySnapshot(this, snapshot);
    SpessaSynthInfo("%cFinished applying snapshot!", consoleColors.info);
    this.resetAllControllers();
}