import { isMobile } from "../../utils/is_mobile.js";
import type { SpessaSynthSettings } from "../settings.ts";

export function _createMidiSettingsHandler(this: SpessaSynthSettings) {
    void this.midiDeviceHandler.createMIDIDeviceHandler().then((success) => {
        if (success) {
            this._createMidiInputHandler();
            this._createMidiOutputHandler();
        } else {
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
        }
    });
}

export function _createMidiInputHandler(this: SpessaSynthSettings) {
    const handler = this.midiDeviceHandler;
    // Input selector
    if (!handler.inputs || handler.inputs.size < 1) {
        return;
    }
    // No device
    const select = this.htmlControls.midi.inputSelector;
    for (const input of handler.inputs) {
        const option = document.createElement("option");
        option.value = input[0].toString();
        option.innerText = input[1].name ?? "NO NAME";
        select.appendChild(option);
    }
    select.onchange = () => {
        if (!handler.inputs) {
            return;
        }
        if (select.value === "-1") {
            handler.disconnectAllDevicesFromSynth();
        } else {
            // noinspection JSCheckFunctionSignatures
            handler.connectDeviceToSynth(
                handler.inputs.get(select.value)!,
                this.synth
            );
        }
        this._saveSettings();
    };
    // Try to connect the first input (if it exists)
    if (handler.inputs.size > 0) {
        const firstInput = handler.inputs.entries().next().value;
        if (!firstInput) {
            return;
        }
        // noinspection JSCheckFunctionSignatures
        handler.connectDeviceToSynth(firstInput[1], this.synth);
        select.value = firstInput[0];
    }
}

/**
 * Note that using sequi allows us to get the sequencer after it has been created
 */
export function _createMidiOutputHandler(this: SpessaSynthSettings) {
    const handler = this.midiDeviceHandler;
    if (!handler.outputs) {
        setTimeout(() => {
            this._createMidiOutputHandler();
        }, 1000);
        return;
    }
    if (handler.outputs.size < 1) {
        return;
    }
    const select = this.htmlControls.midi.outputSelector;
    for (const output of handler.outputs) {
        const option = document.createElement("option");
        option.value = output[0].toString();
        option.innerText = output[1].name ?? "NO NAME";
        select.appendChild(option);
    }

    select.onchange = () => {
        if (!handler.outputs) {
            return;
        }
        if (select.value === "-1") {
            handler.disconnectSeqFromMIDI(this.seq);
        } else {
            handler.connectMIDIOutputToSeq(
                handler.outputs.get(select.value)!,
                this.seq
            );
        }
        this._saveSettings();
    };
}
