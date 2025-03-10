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
        if (!clearOverride || (clearOverride && channelObject.presetUsesOverride))
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