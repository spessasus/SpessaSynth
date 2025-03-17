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
    this.cachedVoices = [];
    
    for (let i = 0; i < this.workletProcessorChannels.length; i++)
    {
        const channelObject = this.workletProcessorChannels[i];
        if (!clearOverride || (clearOverride && channelObject.presetUsesOverride))
        {
            channelObject.lockPreset = false;
        }
        channelObject.programChange(channelObject.preset.program);
    }
    if (sendPresets)
    {
        this.sendPresetList();
    }
}