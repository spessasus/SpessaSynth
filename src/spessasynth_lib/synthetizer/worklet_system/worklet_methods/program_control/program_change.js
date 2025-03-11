import { SpessaSynthWarn } from "../../../../utils/loggin.js";

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
    const bank = channelObject.getBankSelect();
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
    channelObject.setPreset(preset);
    this.callEvent("programchange", {
        channel: channel,
        program: preset.program,
        bank: sentBank,
        userCalled: userChange
    });
}