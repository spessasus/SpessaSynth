import { MONO_ON, POLY_ON, type SynthesizerUI } from "../synthetizer_ui.ts";
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

    this.synth.eventHandler.addEvent("reset", "synthui-reset", () => {
        for (const controller of this.controllers) {
            for (const [cc, meter] of controller.controllerMeters) {
                // Do not reset transpose and gain (system parameters)
                if (typeof cc === "number") {
                    meter.reset();
                }
            }
        }
    });

    this.synth.eventHandler.addEvent(
        "controllerChange",
        "synthui-controller-change",
        (e) => {
            const { controller, channel, value } = e;
            const con = this.controllers[channel];
            if (con === undefined) {
                return;
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
        "channelParamChange",
        "synthui-midi-channel-change",
        (e) => {
            switch (e.parameter) {
                default: {
                    if (typeof e.value === "number") {
                        this.controllers[e.channel].controllerMeters
                            .get(e.parameter)
                            ?.update(e.value);
                    }
                    break;
                }

                case "efxAssign": {
                    this.controllers[
                        e.channel
                    ].insertionEffectButton.classList.toggle("red", e.value);

                    break;
                }

                case "polyMode": {
                    const { channel, value } = e;
                    const con = this.controllers[channel];
                    if (con === undefined) {
                        return;
                    }
                    if (value) {
                        con.polyMonoButton.setAttribute("isPoly", "true");
                        con.polyMonoButton.innerHTML = POLY_ON;
                    } else {
                        con.polyMonoButton.setAttribute("isPoly", "false");
                        con.polyMonoButton.innerHTML = MONO_ON;
                    }
                }
            }
        }
    );

    this.synth.eventHandler.addEvent(
        "channelAdded",
        "synthui-new-channel",
        () => {
            appendNewController.call(this, this.controllers.length);
            this.showControllerGroup(this.groupSelector.value);
            if (!this.isShown) {
                this.hideControllers();
            }
        }
    );
}
