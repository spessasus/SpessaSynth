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
        // if override soundfont
        const bankWithOffset = bank === 128 ? 128 : bank - this.soundfontBankOffset;
        const preset = this.overrideSoundfont.getPresetNoFallback(bankWithOffset, program, this.system === "xg");
        if (preset)
        {
            return preset;
        }
    }
    return this.soundfontManager.getPreset(bank, program, this.system === "xg");
}