import { getDrumsSvg, getNoteSvg } from "../../utils/icons.js";
import type { ControllerGroupType, SynthetizerUI } from "../synthetizer_ui.ts";

/**
 * @this {SynthetizerUI}
 */
export function setEventListeners(this: SynthetizerUI) {
    // Add event listeners
    this.synth.eventHandler.addEvent(
        "programChange",
        "synthui-program-change",
        (e) => {
            const p = this.controllers[e.channel].preset;
            p.set(`${e.bank}:${e.program}`);
        }
    );

    this.synth.eventHandler.addEvent(
        "allControllerReset",
        "synthui-all-controller-reset",
        () => {
            for (const controller of this.controllers) {
                for (const meter of Object.values(
                    controller.controllerMeters
                )) {
                    meter.update(meter.defaultValue);
                }
            }
        }
    );

    this.synth.eventHandler.addEvent(
        "controllerChange",
        "synthui-controller-change",
        (e) => {
            const controller = e.controllerNumber;
            const channel = e.channel;
            const value = e.controllerValue;
            const con = this.controllers[channel];
            if (con === undefined) {
                return;
            }
            const meter = con.controllerMeters[controller];
            if (meter !== undefined) {
                meter.update(value);
            }
        }
    );

    this.synth.eventHandler.addEvent(
        "pitchWheel",
        "synthui-pitch-wheel",
        (e) => {
            // Pitch wheel
            this.controllers[e.channel].pitchWheel.update(e.pitch - 8192);
        }
    );

    this.synth.eventHandler.addEvent(
        "drumChange",
        "synthui-drum-change",
        (e) => {
            this.controllers[e.channel].drumsToggle.innerHTML = e.isDrumChannel
                ? getDrumsSvg(32)
                : getNoteSvg(32);
            const preset = this.controllers[e.channel].preset;
            preset.reload(
                e.isDrumChannel ? this.percussionList : this.instrumentList
            );
            preset.set(preset.value);
        }
    );

    this.synth.eventHandler.addEvent(
        "newChannel",
        "synthui-new-channel",
        () => {
            this.appendNewController(this.controllers.length);
            this.showControllerGroup(
                this.groupSelector.value as ControllerGroupType
            );
            this.hideControllers();
        }
    );
}
