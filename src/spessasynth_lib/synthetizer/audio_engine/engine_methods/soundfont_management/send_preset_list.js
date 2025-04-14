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