import { midiControllers } from '../../../midi_parser/midi_message.js'
import { SoundFont2 } from '../../../soundfont/soundfont.js'
import { clearSamplesList } from '../worklet_utilities/worklet_voice.js'
import { generatorTypes } from '../../../soundfont/read/generators.js'
import { returnMessageType } from '../message_protocol/worklet_message.js'
import { SpessaSynthInfo } from '../../../utils/loggin.js'
import { consoleColors } from '../../../utils/other.js'

/**
 * executes a program change
 * @param channel {number}
 * @param programNumber {number}
 * @param userChange {boolean}
 * @this {SpessaSynthProcessor}
 */
export function programChange(channel, programNumber, userChange=false)
{
    /**
     * @type {WorkletProcessorChannel}
     */
    const channelObject = this.workletProcessorChannels[channel];
    if(channelObject.lockPreset)
    {
        return;
    }
    // always 128 for percussion
    const bank = channelObject.drumChannel ? 128 : channelObject.midiControllers[midiControllers.bankSelect];
    let sentBank;
    let preset;

    // check if override
    if(this.overrideSoundfont)
    {
        const bankWithOffset = bank === 128 ? 128 : Math.max(0, bank - this.soundfontBankOffset);
        const p = this.overrideSoundfont.presets.find(p => p.program === programNumber && p.bank === bankWithOffset);
        if(p)
        {
            sentBank = bank;
            preset = p;
            channelObject.presetUsesOverride = true;
        }
        else
        {
            preset = this.soundfont.getPreset(bank, programNumber);
            sentBank = preset.bank;
            channelObject.presetUsesOverride = false;
        }
    }
    else
    {
        preset = this.soundfont.getPreset(bank, programNumber);
        sentBank = preset.bank;
        channelObject.presetUsesOverride = false;
    }

    this.setPreset(channel, preset);
    this.callEvent("programchange",{
        channel: channel,
        program: preset.program,
        bank: sentBank,
        userCalled: userChange
    });
}

/**
 * @this {SpessaSynthProcessor}
 * @param program {number}
 * @param bank {number}
 * @returns {Preset}
 */
export function getPreset(bank, program)
{
    if(this.overrideSoundfont)
    {
        // if overriden soundfont
        const bankWithOffset = bank === 128 ? 128 : Math.max(0, bank - this.soundfontBankOffset);
        const preset = this.overrideSoundfont.presets.find(p => p.program === program && p.bank === bankWithOffset);
        if(preset)
        {
            return preset;
        }
    }
    return this.soundfont.getPreset(bank, program);
}



/**
 * @param channel {number}
 * @param preset {Preset}
 * @this {SpessaSynthProcessor}
 */
export function setPreset(channel, preset)
{
    if(this.workletProcessorChannels[channel].lockPreset)
    {
        return;
    }
    delete this.workletProcessorChannels[channel].preset;
    this.workletProcessorChannels[channel].preset = preset;

    // reset cached voices
    this.workletProcessorChannels[channel].cachedVoices = [];
    for (let i = 0; i < 128; i++)
    {
        this.workletProcessorChannels[channel].cachedVoices.push([]);
    }
}

/**
 * Toggles drums on a given channel
 * @param channel {number}
 * @param isDrum {boolean}
 * @this {SpessaSynthProcessor}
 */
export function setDrums(channel, isDrum)
{
    const channelObject = this.workletProcessorChannels[channel];
    if(channelObject.lockPreset)
    {
        return;
    }
    if(channelObject.drumChannel === isDrum)
    {
        return;
    }
    if(isDrum)
    {
        // clear transpose
        channelObject.channelTransposeKeyShift = 0;
        channelObject.drumChannel = true;
        this.setPreset(channel, this.getPreset(128, channelObject.preset.program));
    }
    else
    {
        channelObject.drumChannel = false;
        this.setPreset(channel, this.getPreset(channelObject.midiControllers[midiControllers.bankSelect], channelObject.preset.program));
    }
    channelObject.presetUsesOverride = false;
    this.callEvent("drumchange",{
        channel: channel,
        isDrumChannel: channelObject.drumChannel
    });
    this.sendChannelProperties();
}

/**
 * @this {SpessaSynthProcessor}
 */
export function sendPresetList()
{
    const mainFont =  this.soundfont.presets.map(p => {
        return {presetName: p.presetName, bank: p.bank, program: p.program};
    });
    if(this.overrideSoundfont !== undefined)
    {
        this.overrideSoundfont.presets.forEach(p => {
            const bankCheck = p.bank === 128 ? 128 : p.bank + this.soundfontBankOffset;
            const exists = mainFont.find(pr => pr.bank === bankCheck && pr.program === p.program);
            if(exists !== undefined)
            {
                exists.presetName = p.presetName;
            }
            else
            {
                mainFont.push({presetName: p.presetName, bank: bankCheck, program: p.program});
            }
        });
    }
    this.callEvent("presetlistchange", mainFont);
}

/**
 * @this {SpessaSynthProcessor}
 * @param sendPresets {boolean}
 * @param clearOverride {boolean}
 */
export function clearSoundFont(sendPresets = true, clearOverride = true)
{
    this.stopAllChannels(true);
    clearSamplesList();
    if(clearOverride)
    {
        delete this.overrideSoundfont;
    }
    delete this.workletDumpedSamplesList;
    this.workletDumpedSamplesList = [];
    this.defaultPreset = this.getPreset(0, 0);
    this.drumPreset = this.getPreset(128, 0);

    for(let i = 0; i < this.workletProcessorChannels.length; i++)
    {
        const channelObject = this.workletProcessorChannels[i];
        channelObject.cachedVoices = [];
        for (let j = 0; j < 128; j++)
        {
            channelObject.cachedVoices.push([]);
        }
        channelObject.lockPreset = false;
        this.programChange(i, channelObject.preset.program);
    }
    if(sendPresets)
    {
        this.sendPresetList();
    }
}

/**
 * @param buffer {ArrayBuffer}
 * @param isOverride {Boolean}
 * @this {SpessaSynthProcessor}
 */
export function reloadSoundFont(buffer, isOverride = false)
{
    this.clearSoundFont(false, isOverride);
    if(!isOverride)
    {
        delete this.soundfont;
    }
    try
    {
        if(isOverride)
        {
            this.overrideSoundfont = new SoundFont2(buffer);
        }
        else
        {
            this.soundfont = new SoundFont2(buffer);
        }
    }
    catch (e)
    {
        this.post({
            messageType: returnMessageType.soundfontError,
            messageData: e
        });
        return;
    }
    this.defaultPreset = this.getPreset(0, 0);
    this.drumPreset = this.getPreset(128, 0);
    this.workletProcessorChannels.forEach((c, cNum) => {
        this.programChange(cNum, c.preset.program);
    });
    this.post({messageType: returnMessageType.ready, messageData: undefined});
    this.sendPresetList();
    SpessaSynthInfo("%cSpessaSynth is ready!", consoleColors.recognized);
}

/**
 * saves a sample
 * @param channel {number}
 * @param sampleID {number}
 * @param sampleData {Float32Array}
 * @this {SpessaSynthProcessor}
 */
export function sampleDump(channel, sampleID, sampleData)
{
    this.workletDumpedSamplesList[sampleID] = sampleData;
    // the sample maybe was loaded after the voice was sent... adjust the end position!

    // not for all channels because the system tells us for what channel this voice was dumped! yay!
    this.workletProcessorChannels[channel].voices.forEach(v => {
        if(v.sample.sampleID !== sampleID)
        {
            return;
        }
        v.sample.end = sampleData.length - 1 + v.generators[generatorTypes.endAddrOffset] + (v.generators[generatorTypes.endAddrsCoarseOffset] * 32768);
        // calculate for how long the sample has been playing and move the cursor there
        v.sample.cursor = (v.sample.playbackStep * sampleRate) * (currentTime - v.startTime);
        if(v.sample.loopingMode === 0) // no loop
        {
            if (v.sample.cursor >= v.sample.end)
            {
                v.finished = true;
                return;
            }
        }
        else
        {
            // go through modulo (adjust cursor if the sample has looped
            if(v.sample.cursor > v.sample.loopEnd)
            {
                v.sample.cursor = v.sample.cursor % (v.sample.loopEnd - v.sample.loopStart) + v.sample.loopStart - 1;
            }
        }
        // set start time to current!
        v.startTime = currentTime;
    })

}