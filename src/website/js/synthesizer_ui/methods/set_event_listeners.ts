import {
    type ControllerGroup,
    MONO_ON,
    POLY_ON,
    type SynthesizerUI
} from "../synthetizer_ui.ts";
import { CONTROLLER_TABLE_SIZE, MIDIControllers } from "spessasynth_core";
import { appendNewController } from "./append_new_controller.ts";
import { getDrumsSvg, getNoteSvg } from "../../utils/icons.ts";

/**
 * @this {SynthesizerUI}
 */
export function setEventListeners(this: SynthesizerUI) {
    // Add event listeners
    this.synth.eventHandler.addEvent(
        "programChange",
        "synthui-program-change",
        (e) => {
            const p = this.controllers[e.channel].preset;
            this.controllers[e.channel].drumsToggle.innerHTML = e.isDrum
                ? getDrumsSvg(32)
                : getNoteSvg(32);
            const list = this.synth.midiChannels[e.channel].patch.isDrum
                ? this.synth.midiParameters.system === "gs"
                    ? this.gsDrumPresets
                    : this.xgDrumPresets
                : this.melodicPresets;
            p.reload(list);
            p.set(e);
        }
    );

    this.synth.eventHandler.addEvent(
        "allControllerReset",
        "synthui-all-controller-reset",
        () => {
            for (const controller of this.controllers) {
                for (const [cc, meter] of controller.controllerMeters) {
                    // Do not reset transpose and gain (master parameters)
                    if (cc <= CONTROLLER_TABLE_SIZE) {
                        meter.reset();
                    }
                }
            }
        }
    );

    this.synth.eventHandler.addEvent(
        "controllerChange",
        "synthui-controller-change",
        (e) => {
            const { controller, channel, value } = e;
            const con = this.controllers[channel];
            if (con === undefined) {
                return;
            }
            if (controller === MIDIControllers.monoModeOn) {
                con.polyMonoButton.setAttribute("isPoly", "false");
                con.polyMonoButton.innerHTML = MONO_ON;
            } else if (controller === MIDIControllers.polyModeOn) {
                con.polyMonoButton.setAttribute("isPoly", "true");
                con.polyMonoButton.innerHTML = POLY_ON;
            }
            const meter = con.controllerMeters.get(controller);
            if (meter !== undefined) {
                meter.update(value);
            }
        }
    );

    this.synth.eventHandler.addEvent(
        "effectChange",
        "synthui-effect-change",
        this.handleEffectChange.bind(this)
    );

    this.synth.eventHandler.addEvent(
        "midiChannelChange",
        "synthui-midi-channel-change",
        (e) => {
            switch (e.parameter) {
                case "efxAssign": {
                    this.controllers[
                        e.channel
                    ].insertionEffectButton.classList.toggle("red", e.value);

                    break;
                }

                case "pitchWheel": {
                    this.controllers[e.channel].pitchWheel.update(
                        e.value - 8192
                    );
                    break;
                }
            }
        }
    );

    this.synth.eventHandler.addEvent(
        "newChannel",
        "synthui-new-channel",
        () => {
            appendNewController.call(this, this.controllers.length);
            this.showControllerGroup(
                this.groupSelector.value as ControllerGroup
            );
            if (!this.isShown) {
                this.hideControllers();
            }
        }
    );
}
