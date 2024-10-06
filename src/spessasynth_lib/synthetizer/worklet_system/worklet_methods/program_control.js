import { midiControllers } from "../../../midi_parser/midi_message.js";
import { returnMessageType } from "../message_protocol/worklet_message.js";
import { SpessaSynthInfo, SpessaSynthWarn } from "../../../utils/loggin.js";
import { consoleColors } from "../../../utils/other.js";
import { loadSoundFont } from "../../../soundfont/load_soundfont.js";

/**
 * executes a program change
 * @param channel {number}
 * @param programNumber {number}
 * @param userChange {boolean}
 * @this {SpessaSynthProcessor}
 */
export function programChange(channel, programNumber, userChange = false)
{
    /**
     * @type {WorkletProcessorChannel}
     */
    const channelObject = this.workletProcessorChannels[channel];
    if (channelObject === undefined)
    {
        SpessaSynthWarn(`Trying to access channel ${channel} which does not exist... ignoring!`);
        return;
    }
    if (channelObject.lockPreset)
    {
        return;
    }
    // always 128 for percussion
    const bank = channelObject.drumChannel ? 128 : channelObject.midiControllers[midiControllers.bankSelect];
    let sentBank;
    let preset;
    
    // check if override
    if (this.overrideSoundfont)
    {
        const bankWithOffset = bank === 128 ? 128 : bank - this.soundfontBankOffset;
        const p = this.overrideSoundfont.getPresetNoFallback(bankWithOffset, programNumber);
        if (p)
        {
            sentBank = bank;
            preset = p;
            channelObject.presetUsesOverride = true;
        }
        else
        {
            preset = this.soundfontManager.getPreset(bank, programNumber);
            sentBank = preset.bank;
            channelObject.presetUsesOverride = false;
        }
    }
    else
    {
        preset = this.soundfontManager.getPreset(bank, programNumber);
        sentBank = preset.bank;
        channelObject.presetUsesOverride = false;
    }
    this.setPreset(channel, preset);
    this.callEvent("programchange", {
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
 * @returns {BasicPreset}
 */
export function getPreset(bank, program)
{
    if (this.overrideSoundfont)
    {
        // if overriden soundfont
        const bankWithOffset = bank === 128 ? 128 : bank - this.soundfontBankOffset;
        const preset = this.overrideSoundfont.getPresetNoFallback(bankWithOffset, program);
        if (preset)
        {
            return preset;
        }
    }
    return this.soundfontManager.getPreset(bank, program);
}


/**
 * @param channel {number}
 * @param preset {BasicPreset}
 * @this {SpessaSynthProcessor}
 */
export function setPreset(channel, preset)
{
    if (this.workletProcessorChannels[channel].lockPreset)
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
    if (channelObject.lockPreset)
    {
        return;
    }
    if (channelObject.drumChannel === isDrum)
    {
        return;
    }
    if (isDrum)
    {
        // clear transpose
        channelObject.channelTransposeKeyShift = 0;
        channelObject.drumChannel = true;
        this.setPreset(channel, this.getPreset(128, channelObject.preset.program));
    }
    else
    {
        channelObject.drumChannel = false;
        this.setPreset(
            channel,
            this.getPreset(
                channelObject.midiControllers[midiControllers.bankSelect],
                channelObject.preset.program
            )
        );
    }
    channelObject.presetUsesOverride = false;
    this.callEvent("drumchange", {
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
    /**
     * @type {{bank: number, presetName: string, program: number}[]}
     */
    const mainFont = this.soundfontManager.getPresetList();
    if (this.overrideSoundfont !== undefined)
    {
        this.overrideSoundfont.presets.forEach(p =>
        {
            const bankCheck = p.bank === 128 ? 128 : p.bank + this.soundfontBankOffset;
            const exists = mainFont.find(pr => pr.bank === bankCheck && pr.program === p.program);
            if (exists !== undefined)
            {
                exists.presetName = p.presetName;
            }
            else
            {
                mainFont.push({
                    presetName: p.presetName,
                    bank: bankCheck,
                    program: p.program
                });
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
    if (clearOverride)
    {
        delete this.overrideSoundfont;
        this.overrideSoundfont = undefined;
    }
    this.defaultPreset = this.getPreset(0, 0);
    this.drumPreset = this.getPreset(128, 0);
    
    for (let i = 0; i < this.workletProcessorChannels.length; i++)
    {
        const channelObject = this.workletProcessorChannels[i];
        channelObject.cachedVoices = [];
        for (let j = 0; j < 128; j++)
        {
            channelObject.cachedVoices.push([]);
        }
        if (!clearOverride)
        {
            channelObject.lockPreset = false;
        }
        this.programChange(i, channelObject.preset.program);
    }
    if (sendPresets)
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
    try
    {
        if (isOverride)
        {
            this.overrideSoundfont = loadSoundFont(buffer);
            // assign sample offset
            this.overrideSoundfont.setSampleIDOffset(this.soundfontManager.totalSoundfontOffset);
        }
        else
        {
            this.soundfontManager.reloadManager(buffer);
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
    this.workletProcessorChannels.forEach((c, cNum) =>
    {
        this.programChange(cNum, c.preset.program);
    });
    this.post({ messageType: returnMessageType.ready, messageData: undefined });
    this.sendPresetList();
    SpessaSynthInfo("%cSpessaSynth is ready!", consoleColors.recognized);
}

/**
 * Sets the embedded (RMI soundfont)
 * @param font {ArrayBuffer}
 * @param offset {number}
 * @this {SpessaSynthProcessor}
 */
export function setEmbeddedSoundFont(font, offset)
{
    // set offet
    this.soundfontBankOffset = offset;
    this.reloadSoundFont(font, true);
    // preload all samples
    this.overrideSoundfont.samples.forEach(s => s.getAudioData());
    
    // apply snapshot again if applicable
    if (this._snapshot !== undefined)
    {
        this.applySynthesizerSnapshot(this._snapshot);
        this.resetAllControllers();
    }
}