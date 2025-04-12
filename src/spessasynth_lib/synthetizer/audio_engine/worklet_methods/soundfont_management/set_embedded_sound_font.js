/**
 * Sets the embedded (RMI soundfont)
 * @param font {ArrayBuffer}
 * @param offset {number}
 * @this {SpessaSynthProcessor}
 */
export function setEmbeddedSoundFont(font, offset)
{
    // set offset
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