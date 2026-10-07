import { isMobile } from "../../utils/is_mobile.js";
import type { SpessaSynthSettings } from "../settings.ts";
import { MIDIDeviceHandler } from "spessasynth_lib";
import { Ut } from "../../utils/other.js";

export function _createMidiSettingsHandler(this: SpessaSynthSettings) {
    MIDIDeviceHandler.createMIDIDeviceHandler()
        .then((handler) => {
            this.createMIDIInputHandler(handler);
            this.createMIDIOutputHandler(handler);
        })
        .catch((error) => {
            console.error(error);
            if (!isMobile) {
                const parent = document.querySelector("#midi_settings")!;
                // Show midi as not available
                const input = this.htmlControls.midi.inputSelector;
                const output = this.htmlControls.midi.outputSelector;
                // Hide everything
                Ut.hide(input);
                Ut.hide(output);
                Ut.hide(
                    parent.querySelector("label[for='midi_input_selector']")
                );
                Ut.hide(
                    parent.querySelector("label[for='midi_output_selector']")
                );

                // Show error
                const errorMessage = document.createElement("h3");
                errorMessage.classList.add("error_message");
                parent.append(errorMessage);
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
    if (!handler.inputs || handler.inputs.size === 0) {
        return;
    }
    // No device
    const select = this.htmlControls.midi.inputSelector;
    for (const input of handler.inputs.values()) {
        const option = document.createElement("option");
        option.value = input.id;
        option.textContent = input.name ?? "NO NAME";
        select.append(option);
    }
    select.addEventListener("change", () => {
        if (!handler.inputs) {
            return;
        }
        for (const i of handler.inputs) {
            i[1].disconnect(this.synth);
        }
        handler.inputs.get(select.value)?.connect(this.synth);
        this.saveSettings();
    });
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
 * Note that using seq ui allows us to get the sequencer after it has been created
 */
export function _createMidiOutputHandler(
    this: SpessaSynthSettings,
    handler: MIDIDeviceHandler
) {
    if (handler.outputs.size === 0) {
        return;
    }
    const select = this.htmlControls.midi.outputSelector;
    const ports = this.htmlControls.midi.portSelectors;
    const extraPorts = this.synthui.outputPorts.extra;
    const portWrapper = this.htmlControls.midi.portSelectorsWrapper;
    Ut.hide(portWrapper);

    // Add inputs to selects
    for (const output of handler.outputs.values()) {
        const option = document.createElement("option");
        option.value = output.id;
        option.textContent = output.name ?? output.manufacturer ?? "NO NAME";
        select.append(option);
    }
    for (const port of ports) {
        for (const output of handler.outputs.values()) {
            const option = document.createElement("option");
            option.value = output.id;
            option.textContent =
                output.name ?? output.manufacturer ?? "NO NAME";
            port.append(option);
        }
    }

    // Primary handle, switches between spessa and MIDI
    select.addEventListener("change", () => {
        if (!handler.outputs) {
            return;
        }
        this.synthui.outputPorts.primary?.disconnect(this.seq);
        this.synthui.outputPorts.primary = undefined;
        const target = handler.outputs.get(select.value);
        // QoL: Disable skipping to first note-on for external MIDI playback
        // A lot MIDIs space out the messages to not overflow the MIDI cables.
        // Spessasynth doesn't have this limitation.
        if (target) {
            this.synthui.outputPorts.primary = target;
            target.connect(this.seq, 0);
            this.seq.skipToFirstNoteOn = false;
            this.seq.externalMIDIPlayback = true;
            Ut.show(portWrapper);
        } else {
            this.seq.skipToFirstNoteOn = true;
            this.seq.externalMIDIPlayback = false;
            Ut.hide(portWrapper);
        }
        this.saveSettings();
    });

    // Extra ports handle

    for (let p = 0; p < ports.length; p++) {
        const port = ports[p];
        // Primary is 0
        const portNumber = p + 1;

        port.addEventListener("change", () => {
            if (!handler.outputs) {
                return;
            }
            extraPorts[p]?.disconnect(this.seq);
            extraPorts[p] = undefined;
            const target = handler.outputs.get(port.value);
            if (target) {
                extraPorts[p] = target;
                target.connect(this.seq, portNumber * 16);
            }
        });
    }
}
