import { isMobile } from "../../utils/is_mobile.js";

/**
 * @param handler {MIDIDeviceHandler}
 * @param sequi {SequencerUI}
 * @param synthui {SynthetizerUI}
 * @this {SpessaSynthSettings}
 * @private
 */
export function _createMidiSettingsHandler(handler, sequi, synthui)
{
    handler.createMIDIDeviceHandler().then(success =>
    {
        if (success)
        {
            this._createMidiInputHandler(handler, synthui.synth);
            this._createMidiOutputHandler(handler, sequi);
        }
        else
        {
            if (!isMobile)
            {
                const parent = document.getElementById("midi_settings");
                // show midi as not available
                const input = this.htmlControls.midi.inputSelector;
                const output = this.htmlControls.midi.outputSelector;
                // hide everything
                input.classList.add("hidden");
                output.classList.add("hidden");
                parent.querySelector("label[for='midi_input_selector']").classList.add("hidden");
                parent.querySelector("label[for='midi_output_selector']").classList.add("hidden");
                
                // show error
                const errorMessage = document.createElement("h3");
                errorMessage.classList.add("error_message");
                parent.appendChild(errorMessage);
                this.locale.bindObjectProperty(errorMessage, "textContent", "locale.warnings.noMidiSupport");
            }
        }
    });
}

/**
 * @param handler {MIDIDeviceHandler}
 * @param synth {Synthetizer}
 * @this {SpessaSynthSettings}
 * @private
 */
export function _createMidiInputHandler(handler, synth)
{
    // input selector
    if (handler.inputs.length < 1)
    {
        return;
    }
    // no device
    const select = this.htmlControls.midi.inputSelector;
    for (const input of handler.inputs)
    {
        const option = document.createElement("option");
        option.value = input[0].toString();
        option.innerText = input[1].name;
        select.appendChild(option);
    }
    select.onchange = () =>
    {
        if (select.value === "-1")
        {
            handler.disconnectAllDevicesFromSynth();
        }
        else
        {
            handler.connectDeviceToSynth(handler.inputs.get(select.value), synth);
        }
        this._saveSettings();
    };
    // try to connect the first input (if it exists)
    if (handler.inputs.size > 0)
    {
        const firstInput = handler.inputs.entries().next().value;
        handler.connectDeviceToSynth(firstInput[1], synth);
        select.value = firstInput[0];
    }
}

/**
 * note that using sequi allows us to get the sequencer after it has been created
 * @param handler {MIDIDeviceHandler}
 * @param sequi {SequencerUI}
 * @this {SpessaSynthSettings}
 * @private
 */
export function _createMidiOutputHandler(handler, sequi)
{
    if (!handler.outputs)
    {
        setTimeout(() =>
        {
            this._createMidiOutputHandler(handler, sequi);
        }, 1000);
        return;
    }
    if (handler.outputs.length < 1)
    {
        return;
    }
    const select = this.htmlControls.midi.outputSelector;
    for (const output of handler.outputs)
    {
        const option = document.createElement("option");
        option.value = output[0].toString();
        option.innerText = output[1].name;
        select.appendChild(option);
    }
    
    select.onchange = () =>
    {
        if (!sequi.seq)
        {
            // set timeout to wait for sequencer to exist
            setTimeout(select.onchange, 1000);
            return;
        }
        if (select.value === "-1")
        {
            handler.disconnectSeqFromMIDI(sequi.seq);
        }
        else
        {
            handler.connectMIDIOutputToSeq(handler.outputs.get(select.value), sequi.seq);
        }
        this._saveSettings();
    };
}