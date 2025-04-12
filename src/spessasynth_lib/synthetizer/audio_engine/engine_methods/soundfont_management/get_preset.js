import { isSystemXG } from "../../../../utils/xg_hacks.js";

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
        const preset = this.overrideSoundfont.getPresetNoFallback(bankWithOffset, program, isSystemXG(this.system));
        if (preset)
        {
            return preset;
        }
    }
    return this.soundfontManager.getPreset(bank, program, isSystemXG(this.system));
}