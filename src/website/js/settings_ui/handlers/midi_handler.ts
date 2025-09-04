import { isMobile } from "../../utils/is_mobile.js";
import type { SpessaSynthSettings } from "../settings.ts";
import { MIDIDeviceHandler } from "spessasynth_lib";

export function _createMidiSettingsHandler(this: SpessaSynthSettings) {
    MIDIDeviceHandler.createMIDIDeviceHandler()
        .then((handler) => {
            this.createMIDIInputHandler(handler);
            this.createMIDIOutputHandler(handler);
        })
        .catch((e) => {
            console.error(e);
            if (!isMobile) {
                const parent = document.getElementById("midi_settings")!;
                // Show midi as not available
                const input = this.htmlControls.midi.inputSelector;
                const output = this.htmlControls.midi.outputSelector;
                // Hide everything
                input.classList.add("hidden");
                output.classList.add("hidden");
                parent
                    .querySelector("label[for='midi_input_selector']")!
                    .classList.add("hidden");
                parent
                    .querySelector("label[for='midi_output_selector']")!
                    .classList.add("hidden");

                // Show error
                const errorMessage = document.createElement("h3");
                errorMessage.classList.add("error_message");
                parent.appendChild(errorMessage);
                this.locale.bindObjectProperty(
                    errorMessage,
                    "textContent",
                    "locale.warnings.noMidiSupport"
                );
            }
        });
}

export function _createMidiInputHandler(
    this: SpessaSynthSettings,
    handler: MIDIDeviceHandler
) {
    // Input selector
    if (!handler.inputs || handler.inputs.size < 1) {
        return;
    }
    // No device
    const select = this.htmlControls.midi.inputSelector;
    for (const input of handler.inputs.values()) {
        const option = document.createElement("option");
        option.value = input.id;
        option.innerText = input.name ?? "NO NAME";
        select.appendChild(option);
    }
    select.onchange = () => {
        if (!handler.inputs) {
            return;
        }
        handler.inputs.forEach((i) => i.disconnect(this.synth));
        handler.inputs.get(select.value)?.connect(this.synth);
        this.saveSettings();
    };
    // Try to connect the first input (if it exists)
    if (handler.inputs.size > 0) {
        const firstInput = handler.inputs.entries().next().value;
        if (!firstInput) {
            return;
        }

        firstInput[1].connect(this.synth);
        select.value = firstInput[0];
    }
}

/**
 * Note that using sequi allows us to get the sequencer after it has been created
 */
export function _createMidiOutputHandler(
    this: SpessaSynthSettings,
    handler: MIDIDeviceHandler
) {
    if (handler.outputs.size < 1) {
        return;
    }
    const select = this.htmlControls.midi.outputSelector;
    for (const output of handler.outputs.values()) {
        const option = document.createElement("option");
        option.value = output.id;
        option.innerText = output.name ?? output.manufacturer ?? "NO NAME";
        select.appendChild(option);
    }

    select.onchange = () => {
        if (!handler.outputs) {
            return;
        }
        handler.outputs.forEach((o) => o.disconnect(this.seq));
        handler.outputs.get(select.value)?.connect(this.seq);
        this.saveSettings();
    };
}
