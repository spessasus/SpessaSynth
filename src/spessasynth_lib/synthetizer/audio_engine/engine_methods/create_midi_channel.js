import { MidiAudioChannel } from "../engine_components/midi_audio_channel.js";

import { DEFAULT_PERCUSSION } from "../../synth_constants.js";

/**
 * @param sendEvent {boolean}
 * @this {SpessaSynthProcessor}
 */
export function createMidiChannel(sendEvent = false)
{
    /**
     * @type {MidiAudioChannel}
     */
    const channel = new MidiAudioChannel(this, this.defaultPreset, this.midiAudioChannels.length);
    this.midiAudioChannels.push(channel);
    channel.resetControllers();
    channel.sendChannelProperty();
    if (sendEvent)
    {
        this.callEvent("newchannel", undefined);
    }
    
    if (channel.channelNumber % 16 === DEFAULT_PERCUSSION)
    {
        this.midiAudioChannels[this.midiAudioChannels.length - 1].setDrums(true);
    }
}