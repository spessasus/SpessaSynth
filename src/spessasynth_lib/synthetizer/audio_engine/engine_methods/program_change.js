/**
 * executes a program change
 * @param programNumber {number}
 * @this {MidiAudioChannel}
 */
export function programChange(programNumber)
{
    if (this.lockPreset)
    {
        return;
    }
    // always 128 for percussion
    let bank = this.getBankSelect();
    let sentBank;
    /**
     * @type {BasicPreset}
     */
    let preset;
    
    const isXG = this.isXGChannel;
    // check if override
    if (this.synth.overrideSoundfont)
    {
        const bankWithOffset = bank === 128 ? 128 : bank - this.synth.soundfontBankOffset;
        const p = this.synth.overrideSoundfont.getPresetNoFallback(
            bankWithOffset,
            programNumber,
            isXG
        );
        if (p)
        {
            sentBank = p.bank === 128 ? 128 : p.bank + this.synth.soundfontBankOffset;
            preset = p;
            this.presetUsesOverride = true;
        }
        else
        {
            preset = this.synth.soundfontManager.getPreset(bank, programNumber, isXG);
            const offset = this.synth.soundfontManager.soundfontList
                .find(s => s.soundfont === preset.parentSoundBank).bankOffset;
            sentBank = preset.bank - offset;
            this.presetUsesOverride = false;
        }
    }
    else
    {
        preset = this.synth.soundfontManager.getPreset(bank, programNumber, isXG);
        const offset = this.synth.soundfontManager.soundfontList
            .find(s => s.soundfont === preset.parentSoundBank).bankOffset;
        sentBank = preset.bank - offset;
        this.presetUsesOverride = false;
    }
    this.setPreset(preset);
    this.sentBank = sentBank;
    this.synth.callEvent("programchange", {
        channel: this.channelNumber,
        program: preset.program,
        bank: sentBank
    });
    this.sendChannelProperty();
}