import { SpessaSynthWarn } from "../../../../utils/loggin.js";

/**
 * Release a note
 * @param midiNote {number}
 * @this {MidiAudioChannel}
 */
export function noteOff(midiNote)
{
    if (midiNote > 127 || midiNote < 0)
    {
        SpessaSynthWarn(`Received a noteOn for note`, midiNote, "Ignoring.");
        return;
    }
    
    let realKey = midiNote + this.channelTransposeKeyShift;
    
    // if high performance mode, kill notes instead of stopping them
    if (this.synth.highPerformanceMode)
    {
        // if the channel is percussion channel, do not kill the notes
        if (!this.drumChannel)
        {
            this.killNote(realKey, -6950);
            this.synth.callEvent("noteoff", {
                midiNote: midiNote,
                channel: this.channelNumber
            });
            return;
        }
    }
    
    const channelVoices = this.voices;
    channelVoices.forEach(v =>
    {
        if (v.realKey !== realKey || v.isInRelease === true)
        {
            return;
        }
        // if hold pedal, move to sustain
        if (this.holdPedal)
        {
            this.sustainedVoices.push(v);
        }
        else
        {
            v.release(this.synth.currentSynthTime);
        }
    });
    this.synth.callEvent("noteoff", {
        midiNote: midiNote,
        channel: this.channelNumber
    });
}

