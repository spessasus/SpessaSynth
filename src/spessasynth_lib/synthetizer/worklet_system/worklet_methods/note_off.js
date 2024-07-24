import { generatorTypes } from '../../../soundfont/read/generators.js'
import { consoleColors } from '../../../utils/other.js'
import { SpessaSynthInfo, SpessaSynthWarn } from '../../../utils/loggin.js'

/**
 * Release a note
 * @param channel {number}
 * @param midiNote {number}
 * @this {SpessaSynthProcessor}
 */
export function noteOff(channel, midiNote)
{
    if(midiNote > 127 || midiNote < 0)
    {
        SpessaSynthWarn(`Received a noteOn for note`, midiNote, "Ignoring.");
        return;
    }
    midiNote += this.workletProcessorChannels[channel].channelTranspose;

    // if high performance mode, kill notes instead of stopping them
    if(this.highPerformanceMode)
    {
        // if the channel is percussion channel, do not kill the notes
        if(!this.workletProcessorChannels[channel].drumChannel)
        {
            this.killNote(channel, midiNote);
            return;
        }
    }

    const channelVoices = this.workletProcessorChannels[channel].voices;
    channelVoices.forEach(v => {
        if(v.midiNote !== midiNote || v.isInRelease === true)
        {
            return;
        }
        // if hold pedal, move to sustain
        if(this.workletProcessorChannels[channel].holdPedal) {
            this.workletProcessorChannels[channel].sustainedVoices.push(v);
        }
        else
        {
            this.releaseVoice(v);
        }
    });
    this.callEvent("noteoff", {
        midiNote: midiNote - this.workletProcessorChannels[channel].channelTranspose,
        channel: channel
    });
}

/**
 * Stops a note nearly instantly
 * @param channel {number}
 * @param midiNote {number}
 * @this {SpessaSynthProcessor}
 */
export function killNote(channel, midiNote)
{
    this.workletProcessorChannels[channel].voices.forEach(v => {
        if(v.midiNote !== midiNote)
        {
            return;
        }
        v.modulatedGenerators[generatorTypes.releaseVolEnv] = -12000; // set release to be very short
        this.releaseVoice(v);
    });
}

/**
 * stops all notes
 * @param channel {number}
 * @param force {boolean}
 * @this {SpessaSynthProcessor}
 */
export function stopAll(channel, force = false)
{
    const channelVoices = this.workletProcessorChannels[channel].voices;
    if(force)
    {
        // force stop all
        channelVoices.length = 0;
        this.workletProcessorChannels[channel].sustainedVoices.length = 0;
        this.sendChannelProperties();
    }
    else
    {
        channelVoices.forEach(v => {
            if(v.isInRelease) return;
            this.releaseVoice(v);
        });
        this.workletProcessorChannels[channel].sustainedVoices.forEach(v => {
            this.releaseVoice(v);
        })
    }
}

/**
 * @this {SpessaSynthProcessor}
 * @param force {boolean}
 */
export function stopAllChannels(force = false)
{
    SpessaSynthInfo("%cStop all received!", consoleColors.info);
    for (let i = 0; i < this.workletProcessorChannels.length; i++) {
        this.stopAll(i, force);
    }
    this.callEvent("stopall", undefined);
}