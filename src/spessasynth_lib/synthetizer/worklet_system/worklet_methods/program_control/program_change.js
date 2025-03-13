/**
 * executes a program change
 * @param programNumber {number}
 * @param userChange {boolean}
 * @this {WorkletProcessorChannel}
 */
export function programChange(programNumber, userChange = false)
{
    if (this.lockPreset)
    {
        return;
    }
    // always 128 for percussion
    const bank = this.getBankSelect();
    let sentBank;
    let preset;
    
    // check if override
    if (this.synth.overrideSoundfont)
    {
        const bankWithOffset = bank === 128 ? 128 : bank - this.synth.soundfontBankOffset;
        const p = this.synth.overrideSoundfont.getPresetNoFallback(bankWithOffset, programNumber);
        if (p)
        {
            sentBank = bank;
            preset = p;
            this.presetUsesOverride = true;
        }
        else
        {
            preset = this.synth.soundfontManager.getPreset(bank, programNumber);
            sentBank = preset.bank;
            this.presetUsesOverride = false;
        }
    }
    else
    {
        preset = this.synth.soundfontManager.getPreset(bank, programNumber);
        sentBank = preset.bank;
        this.presetUsesOverride = false;
    }
    this.setPreset(preset);
    this.synth.callEvent("programchange", {
        channel: this.channelNumber,
        program: preset.program,
        bank: sentBank,
        userCalled: userChange
    });
}