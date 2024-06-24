import { isMobile } from '../../utils/is_mobile.js'
import { showNotification } from '../../notification.js'

/**
 * @param handler {MIDIDeviceHandler}
 * @param sequi {SequencerUI}
 * @param synthui {SynthetizerUI}
 * @this {SpessaSynthSettings}
 * @private
 */
export function _createMidiSettingsHandler(handler, sequi, synthui)
{
    if(!window.isLocalEdition && !isMobile())
    {
        if(!navigator.requestMIDIAccess)
        {
            showNotification(this.locale.getLocaleString("locale.warnings.warning"),
                this.locale.getLocaleString("locale.warnings.noMidiSupport"));
        }
    }
    handler.createMIDIDeviceHandler().then(success => {
        if(success)
        {
            this._createMidiInputHandler(handler, synthui.synth);
            this._createMidiOutputHandler(handler, sequi);
        }
        else
        {
            document.getElementById("midi_settings").style.display = "none";
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
    if(handler.inputs.length < 1)
    {
        return;
    }
    // no device
    const select = this.htmlControls.midi.inputSelector;
    for(const input of handler.inputs)
    {
        const option = document.createElement("option");
        option.value = input[0];
        option.innerText = input[1].name;
        select.appendChild(option);
    }
    select.onchange = () => {
        if(select.value === "-1")
        {
            handler.disconnectAllDevicesFromSynth();
        }
        else
        {
            handler.connectDeviceToSynth(handler.inputs.get(select.value), synth);
        }
        this._saveSettings();
    }
}

/**
 * note that using sequi allows us to obtain the sequencer after it has been created
 * @param handler {MIDIDeviceHandler}
 * @param sequi {SequencerUI}
 * @this {SpessaSynthSettings}
 * @private
 */
export function _createMidiOutputHandler(handler, sequi)
{
    if(!handler.outputs)
    {
        setTimeout(() => {
            this._createMidiOutputHandler(handler, sequi);
        }, 1000);
        return;
    }
    if(handler.outputs.length < 1)
    {
        return;
    }
    const select = this.htmlControls.midi.outputSelector;
    for(const output of handler.outputs)
    {
        const option = document.createElement("option");
        option.value = output[0];
        option.innerText = output[1].name;
        select.appendChild(option);
    }

    select.onchange = () => {
        if(!sequi.seq)
        {
            return;
        }
        if(select.value === "-1")
        {
            handler.disconnectSeqFromMIDI(sequi.seq);
        }
        else
        {
            handler.connectMIDIOutputToSeq(handler.outputs.get(select.value), sequi.seq);
        }
        this._saveSettings();
    }
}